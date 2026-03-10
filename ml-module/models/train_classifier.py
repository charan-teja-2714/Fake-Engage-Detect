"""
train_classifier.py
─────────────────────────────────────────────────────────────────────────────
Trains a Random Forest classifier to distinguish genuine accounts (label=0)
from fake/bot accounts (label=1) using the engineered feature set.

Split strategy : 70 % train  |  15 % validation  |  15 % test  (stratified)
Class imbalance: class_weight='balanced' inside RandomForestClassifier
Model output   : ml-module/saved_models/classifier.pkl
                 ml-module/saved_models/feature_importances.csv

Metrics printed: Accuracy, Precision, Recall, F1-score, ROC-AUC
                 (reported on the held-out 15 % test split)

Usage (from project root, inside venv):
    python ml-module/models/train_classifier.py
─────────────────────────────────────────────────────────────────────────────
"""

import json
import pandas as pd
import numpy as np
import joblib
from pathlib import Path

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    classification_report,
)
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

# ── Path resolution ───────────────────────────────────────────────────────────
ML_MODULE_DIR  = Path(__file__).resolve().parent.parent
PROJECT_ROOT   = ML_MODULE_DIR.parent
PROCESSED_DIR  = PROJECT_ROOT / "dataset" / "processed"
SAVED_MODELS   = ML_MODULE_DIR / "saved_models"

# ── Feature list (must match feature_engineering.py) ─────────────────────────
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

# ── Hyperparameters ───────────────────────────────────────────────────────────
RF_PARAMS = {
    "n_estimators"     : 300,          # enough trees for stable estimates
    "max_depth"        : None,         # grow full trees (pruned by min_samples)
    "min_samples_split": 5,
    "min_samples_leaf" : 2,
    "max_features"     : "sqrt",       # standard for classification
    "class_weight"     : "balanced",   # handles class imbalance automatically
    "random_state"     : 42,
    "n_jobs"           : -1,           # use all CPU cores
    "oob_score"        : True,         # out-of-bag score for extra validation
}

RANDOM_STATE = 42


def load_data() -> tuple[pd.DataFrame, pd.Series]:
    """Load the engineered feature dataset."""
    data_path = PROCESSED_DIR / "features_dataset.csv"
    if not data_path.exists():
        raise FileNotFoundError(
            f"Feature dataset not found:\n  {data_path}\n"
            "Run feature_engineering.py first."
        )
    df = pd.read_csv(data_path, low_memory=False)
    X = df[FEATURE_COLS]
    y = df["label"]
    print(f"  Loaded {len(df):,} rows, {len(FEATURE_COLS)} features.")
    print(f"  Label distribution:\n{y.value_counts().to_string()}\n")
    return X, y


def split_data(X: pd.DataFrame, y: pd.Series):
    """
    70 / 15 / 15 stratified split.
    Returns (X_train, X_val, X_test, y_train, y_val, y_test).
    """
    # First split: 70% train, 30% temp
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y,
        test_size=0.30,
        stratify=y,
        random_state=RANDOM_STATE,
    )
    # Second split: 50% of temp → 15% val, 15% test
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp,
        test_size=0.50,
        stratify=y_temp,
        random_state=RANDOM_STATE,
    )
    print(f"  Split sizes → train: {len(X_train):,} | val: {len(X_val):,} | test: {len(X_test):,}")
    return X_train, X_val, X_test, y_train, y_val, y_test


def build_pipeline() -> Pipeline:
    """
    Build a scikit-learn Pipeline:
      1. StandardScaler  – centres / scales features (helps tree split quality
                           and makes feature importances more comparable)
      2. RandomForestClassifier
    """
    return Pipeline([
        ("scaler", StandardScaler()),
        ("clf",    RandomForestClassifier(**RF_PARAMS)),
    ])


def print_metrics(y_true, y_pred, y_prob, split_name: str):
    """Print classification metrics for a given data split."""
    acc    = accuracy_score(y_true, y_pred)
    prec   = precision_score(y_true, y_pred, zero_division=0)
    rec    = recall_score(y_true, y_pred, zero_division=0)
    f1     = f1_score(y_true, y_pred, zero_division=0)
    roc    = roc_auc_score(y_true, y_prob)

    print(f"\n  ── {split_name} metrics ──")
    print(f"  Accuracy  : {acc:.4f}")
    print(f"  Precision : {prec:.4f}")
    print(f"  Recall    : {rec:.4f}")
    print(f"  F1-score  : {f1:.4f}")
    print(f"  ROC-AUC   : {roc:.4f}")
    print(f"\n  Classification report:\n{classification_report(y_true, y_pred, target_names=['Genuine','Fake/Bot'])}")

    return {"accuracy": acc, "precision": prec, "recall": rec, "f1": f1, "roc_auc": roc}


def save_feature_importances(pipeline: Pipeline):
    """Extract and save feature importances from the trained RF."""
    rf_model = pipeline.named_steps["clf"]
    importances = rf_model.feature_importances_

    imp_df = pd.DataFrame({
        "feature"   : FEATURE_COLS,
        "importance": importances,
    }).sort_values("importance", ascending=False)

    out_path = SAVED_MODELS / "feature_importances.csv"
    imp_df.to_csv(out_path, index=False)
    print(f"\n  Feature importances saved → {out_path}")
    print(f"\n  Top 10 features:")
    print(imp_df.head(10).to_string(index=False))


def train():
    """Full training pipeline."""
    print("\n" + "=" * 60)
    print("  STEP 3 — Random Forest Classifier Training")
    print("=" * 60)

    # ── Load & split ──────────────────────────────────────────────────────────
    X, y = load_data()
    X_train, X_val, X_test, y_train, y_val, y_test = split_data(X, y)

    # ── Build & train ─────────────────────────────────────────────────────────
    print("\n  Training Random Forest …  (this may take a minute)")
    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    rf_model = pipeline.named_steps["clf"]
    print(f"  OOB score (train set) : {rf_model.oob_score_:.4f}")

    # ── Cross-validation on training set ─────────────────────────────────────
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_f1 = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="f1", n_jobs=-1)
    print(f"  5-fold CV F1 (train)  : {cv_f1.mean():.4f} ± {cv_f1.std():.4f}")

    # ── Validation metrics ────────────────────────────────────────────────────
    val_pred = pipeline.predict(X_val)
    val_prob = pipeline.predict_proba(X_val)[:, 1]
    val_metrics = print_metrics(y_val, val_pred, val_prob, "Validation")

    # ── Test metrics (final evaluation) ──────────────────────────────────────
    test_pred = pipeline.predict(X_test)
    test_prob = pipeline.predict_proba(X_test)[:, 1]
    test_metrics = print_metrics(y_test, test_pred, test_prob, "Test (final)")

    # ── Save model ────────────────────────────────────────────────────────────
    SAVED_MODELS.mkdir(parents=True, exist_ok=True)
    model_path = SAVED_MODELS / "classifier.pkl"
    joblib.dump(pipeline, model_path)
    print(f"\n  Model saved → {model_path}")

    # ── Save metrics JSON (used by evaluate_model.py) ─────────────────────────
    metrics_path = SAVED_MODELS / "classifier_metrics.json"
    all_metrics = {
        "validation": val_metrics,
        "test"       : test_metrics,
        "cv_f1_mean" : float(cv_f1.mean()),
        "cv_f1_std"  : float(cv_f1.std()),
        "oob_score"  : float(rf_model.oob_score_),
        "feature_cols": FEATURE_COLS,
    }
    with open(metrics_path, "w") as fh:
        json.dump(all_metrics, fh, indent=2)
    print(f"  Metrics saved → {metrics_path}")

    # ── Feature importances ───────────────────────────────────────────────────
    save_feature_importances(pipeline)

    # ── Persist test predictions for evaluate_model.py ────────────────────────
    preds_path = SAVED_MODELS / "test_predictions.npz"
    np.savez(preds_path, y_test=y_test.values, y_pred=test_pred, y_prob=test_prob)
    print(f"  Test predictions saved → {preds_path}")

    print("\n" + "=" * 60)
    print("  Training complete.")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    train()
