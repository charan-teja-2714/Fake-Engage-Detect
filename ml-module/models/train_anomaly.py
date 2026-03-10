"""
train_anomaly.py
─────────────────────────────────────────────────────────────────────────────
Trains an Isolation Forest anomaly detector on GENUINE accounts only.

Logic
─────
Isolation Forest learns the "normal" distribution of genuine account features.
At prediction time, accounts that deviate significantly from this distribution
receive a high anomaly score — an unsupervised second opinion that complements
the supervised Random Forest classifier.

Output
──────
  ml-module/saved_models/anomaly_model.pkl   – trained IsolationForest
  ml-module/saved_models/anomaly_scaler.pkl  – StandardScaler fitted on genuine
  ml-module/saved_models/anomaly_metrics.json

Anomaly score convention (used in authenticity_score.py):
  Raw IF score  →  decision_function output, positive = inlier, negative = outlier
  We normalise to [0, 1] where 1 = most anomalous (worst)

  NOTE — dataset-specific behaviour:
  In Cresci-2017, fake accounts form a dense homogeneous cluster.
  Isolation Forest finds dense clusters HARD to isolate → scores them as HIGH
  decision_function (inlier-like).  Genuine accounts are diverse and spread
  out → some are easy to isolate → scored as LOWER decision_function.
  Result: genuine accounts have LOWER raw decision_function than fake accounts.
  Therefore we normalise raw_scores DIRECTLY (not inverted) so that:
    lower raw  (genuine-like, diverse)  →  lower anomaly score  ✓
    higher raw (fake-like, clustered)   →  higher anomaly score ✓

Usage (from project root, inside venv):
    python ml-module/models/train_anomaly.py
─────────────────────────────────────────────────────────────────────────────
"""

import json
import numpy as np
import pandas as pd
import joblib
from pathlib import Path

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score

# ── Path resolution ───────────────────────────────────────────────────────────
ML_MODULE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT  = ML_MODULE_DIR.parent
PROCESSED_DIR = PROJECT_ROOT / "dataset" / "processed"
SAVED_MODELS  = ML_MODULE_DIR / "saved_models"

# ── Feature list (must stay in sync with feature_engineering.py) ─────────────
FEATURE_COLS = [
    "statuses_count",
    "followers_count",
    "friends_count",
    "favourites_count",
    "listed_count",
    "verified",
    "default_profile",
    "default_profile_image",
    "geo_enabled",
    "account_age_days",
    "follower_following_ratio",
    "activity_rate",
    "engagement_proxy",
    "tweet_to_followers",
    "has_url",
    "has_description",
    "name_length",
    "digits_in_name",
]

# ── Isolation Forest hyperparameters ──────────────────────────────────────────
IF_PARAMS = {
    "n_estimators"  : 200,
    "max_samples"   : "auto",      # default: min(256, n_samples)
    "contamination" : 0.05,        # expect ~5 % outliers in genuine set
                                   # (genuine data may contain some noisy rows)
    "max_features"  : 1.0,
    "bootstrap"     : False,
    "random_state"  : 42,
    "n_jobs"        : -1,
}

RANDOM_STATE = 42


# ─────────────────────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────────────────────

def normalise_if_score(
    raw_scores: np.ndarray,
    p5: float | None = None,
    p95: float | None = None,
) -> np.ndarray:
    """
    Convert IsolationForest decision_function output to a [0, 1] anomaly score
    where 0 = least anomalous and 1 = most anomalous (bot-like).

    Uses PERCENTILE-based normalisation (5th → 0, 95th → 1) instead of
    pure min-max.  This spreads scores across the full [0, 1] range so that
    genuine accounts are not unfairly pushed toward 1.0 by a few extreme
    outliers at the boundaries.

    Why raw scores (not inverted):
      In Cresci-2017 fake accounts form dense clusters → IF gives them HIGH
      decision_function (hard to isolate = "normal").  Genuine accounts are
      diverse → lower decision_function.  Normalising raw scores directly
      therefore assigns higher anomaly scores to fake accounts (correct ✓).

    Parameters
    ----------
    raw_scores : scores from decision_function
    p5, p95    : pre-computed percentiles (supplied at inference time).
                 If None, computed from raw_scores directly.
    """
    if p5 is None:
        p5  = float(np.percentile(raw_scores, 5))
    if p95 is None:
        p95 = float(np.percentile(raw_scores, 95))

    spread = p95 - p5
    if spread < 1e-8:
        return np.zeros_like(raw_scores, dtype=float)

    norm = (raw_scores - p5) / spread
    return np.clip(norm, 0.0, 1.0)


# ─────────────────────────────────────────────────────────────────────────────
# Main training function
# ─────────────────────────────────────────────────────────────────────────────

def train():
    print("\n" + "=" * 60)
    print("  STEP 4 — Isolation Forest Anomaly Detector Training")
    print("=" * 60)

    # ── Load feature dataset ──────────────────────────────────────────────────
    data_path = PROCESSED_DIR / "features_dataset.csv"
    if not data_path.exists():
        raise FileNotFoundError(
            f"Feature dataset not found:\n  {data_path}\n"
            "Run feature_engineering.py first."
        )

    df = pd.read_csv(data_path, low_memory=False)
    print(f"  Total rows loaded : {len(df):,}")

    # ── Separate genuine from fake ────────────────────────────────────────────
    genuine_df = df[df["label"] == 0].copy()
    fake_df    = df[df["label"] == 1].copy()

    print(f"  Genuine accounts  : {len(genuine_df):,}")
    print(f"  Fake/bot accounts : {len(fake_df):,}")

    X_genuine = genuine_df[FEATURE_COLS].values
    X_fake    = fake_df[FEATURE_COLS].values
    X_all     = df[FEATURE_COLS].values
    y_all     = df["label"].values

    # ── Scale features ────────────────────────────────────────────────────────
    # Fit scaler ONLY on genuine accounts to avoid contamination
    scaler = StandardScaler()
    X_genuine_scaled = scaler.fit_transform(X_genuine)
    X_all_scaled     = scaler.transform(X_all)

    # ── Train Isolation Forest on genuine accounts only ───────────────────────
    print("\n  Training Isolation Forest on genuine accounts …")
    iso_forest = IsolationForest(**IF_PARAMS)
    iso_forest.fit(X_genuine_scaled)
    print("  Training complete.")

    # ── Evaluate on all accounts ──────────────────────────────────────────────
    # predict(): +1 = inlier (genuine), -1 = outlier (anomalous)
    raw_preds  = iso_forest.predict(X_all_scaled)           # +1 / -1
    raw_scores = iso_forest.decision_function(X_all_scaled) # continuous

    # Compute percentile anchors from the full combined distribution.
    # These are saved and reused in predict.py so training and inference
    # are normalised identically.
    p5_val  = float(np.percentile(raw_scores, 5))
    p95_val = float(np.percentile(raw_scores, 95))

    # Normalised anomaly scores [0, 1]
    anomaly_scores = normalise_if_score(raw_scores, p5=p5_val, p95=p95_val)

    # Binary classification: treat outlier (-1) as positive (fake) prediction
    binary_preds = (raw_preds == -1).astype(int)

    # Metrics
    auc = roc_auc_score(y_all, anomaly_scores)
    tp  = int(((binary_preds == 1) & (y_all == 1)).sum())
    fp  = int(((binary_preds == 1) & (y_all == 0)).sum())
    tn  = int(((binary_preds == 0) & (y_all == 0)).sum())
    fn  = int(((binary_preds == 0) & (y_all == 1)).sum())

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall    = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1        = (2 * precision * recall / (precision + recall)
                 if (precision + recall) > 0 else 0.0)

    print(f"\n  ── Anomaly Detection Evaluation (all accounts) ──")
    print(f"  ROC-AUC           : {auc:.4f}")
    print(f"  Precision         : {precision:.4f}")
    print(f"  Recall            : {recall:.4f}")
    print(f"  F1-score          : {f1:.4f}")
    print(f"  Confusion matrix  : TP={tp} FP={fp} TN={tn} FN={fn}")

    # ── Anomaly score statistics on genuine vs fake ───────────────────────────
    genuine_scores = anomaly_scores[y_all == 0]
    fake_scores    = anomaly_scores[y_all == 1]
    print(f"\n  Anomaly score on genuine accounts : mean={genuine_scores.mean():.3f}  std={genuine_scores.std():.3f}")
    print(f"  Anomaly score on fake accounts    : mean={fake_scores.mean():.3f}  std={fake_scores.std():.3f}")

    # ── Save model, scaler, and normalisation params ──────────────────────────
    SAVED_MODELS.mkdir(parents=True, exist_ok=True)

    model_path  = SAVED_MODELS / "anomaly_model.pkl"
    scaler_path = SAVED_MODELS / "anomaly_scaler.pkl"
    joblib.dump(iso_forest, model_path)
    joblib.dump(scaler, scaler_path)
    print(f"\n  Anomaly model saved → {model_path}")
    print(f"  Anomaly scaler saved → {scaler_path}")

    # Save the p5/p95 percentile anchors so predict.py uses the same scale
    norm_params = {"p5": p5_val, "p95": p95_val}
    norm_path   = SAVED_MODELS / "anomaly_norm_params.json"
    with open(norm_path, "w") as fh:
        json.dump(norm_params, fh, indent=2)
    print(f"  Norm params saved  → {norm_path}  (p5={p5_val:.4f}, p95={p95_val:.4f})")

    # ── Save metrics ──────────────────────────────────────────────────────────
    metrics = {
        "roc_auc"           : float(auc),
        "precision"         : float(precision),
        "recall"            : float(recall),
        "f1"                : float(f1),
        "confusion_matrix"  : {"TP": tp, "FP": fp, "TN": tn, "FN": fn},
        "genuine_score_mean": float(genuine_scores.mean()),
        "genuine_score_std" : float(genuine_scores.std()),
        "fake_score_mean"   : float(fake_scores.mean()),
        "fake_score_std"    : float(fake_scores.std()),
        "norm_p5"           : p5_val,
        "norm_p95"          : p95_val,
        "if_params"         : IF_PARAMS,
        "feature_cols"      : FEATURE_COLS,
    }
    metrics_path = SAVED_MODELS / "anomaly_metrics.json"
    with open(metrics_path, "w") as fh:
        json.dump(metrics, fh, indent=2)
    print(f"  Metrics saved → {metrics_path}")

    # ── Save all anomaly scores for evaluate_model.py ─────────────────────────
    scores_path = SAVED_MODELS / "anomaly_scores.npz"
    np.savez(scores_path, y_true=y_all, anomaly_scores=anomaly_scores, binary_preds=binary_preds)
    print(f"  Score array saved → {scores_path}")

    print("\n" + "=" * 60)
    print("  Anomaly model training complete.")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    train()
