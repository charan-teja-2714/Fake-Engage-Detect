"""
evaluate_model.py
─────────────────────────────────────────────────────────────────────────────
Generates and saves all evaluation plots for both the Random Forest classifier
and the Isolation Forest anomaly detector.

All plots are saved to:
    ml-module/evaluation_results/

Plots generated
───────────────
  1.  confusion_matrix.png
  2.  roc_curve.png
  3.  feature_importance.png
  4.  precision_recall_curve.png
  5.  class_distribution.png
  6.  anomaly_score_distribution.png
  7.  accuracy_bar.png
  8.  f1_bar.png

No plots are displayed interactively (matplotlib uses the 'Agg' backend).

Usage (from project root, inside venv — AFTER training both models):
    python ml-module/models/evaluate_model.py
─────────────────────────────────────────────────────────────────────────────
"""

import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")          # non-interactive backend — no display window
import matplotlib.pyplot as plt
import seaborn as sns

from pathlib import Path
from sklearn.metrics import (
    confusion_matrix,
    ConfusionMatrixDisplay,
    roc_curve,
    auc,
    precision_recall_curve,
    average_precision_score,
)

# ── Path resolution ───────────────────────────────────────────────────────────
ML_MODULE_DIR    = Path(__file__).resolve().parent.parent
SAVED_MODELS     = ML_MODULE_DIR / "saved_models"
EVAL_RESULTS_DIR = ML_MODULE_DIR / "evaluation_results"

# ── Plot styling ──────────────────────────────────────────────────────────────
sns.set_theme(style="whitegrid", palette="muted", font_scale=1.1)
FIGSIZE  = (8, 6)
DPI      = 150
CMAP_ROC = "royalblue"


def _save(fig: plt.Figure, filename: str):
    """Save figure and close it to free memory."""
    EVAL_RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    path = EVAL_RESULTS_DIR / filename
    fig.savefig(path, dpi=DPI, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved → {path.name}")


# ─────────────────────────────────────────────────────────────────────────────
# Plot 1 — Confusion Matrix
# ─────────────────────────────────────────────────────────────────────────────

def plot_confusion_matrix(y_test: np.ndarray, y_pred: np.ndarray):
    cm  = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=FIGSIZE)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=["Genuine", "Fake/Bot"])
    disp.plot(ax=ax, colorbar=True, cmap="Blues")
    ax.set_title("Confusion Matrix — Random Forest Classifier", fontsize=13, fontweight="bold")
    _save(fig, "confusion_matrix.png")


# ─────────────────────────────────────────────────────────────────────────────
# Plot 2 — ROC Curve
# ─────────────────────────────────────────────────────────────────────────────

def plot_roc_curve(y_test: np.ndarray, y_prob: np.ndarray):
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    roc_auc     = auc(fpr, tpr)

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.plot(fpr, tpr, color=CMAP_ROC, lw=2, label=f"ROC AUC = {roc_auc:.4f}")
    ax.plot([0, 1], [0, 1], color="grey", lw=1, linestyle="--", label="Random classifier")
    ax.fill_between(fpr, tpr, alpha=0.08, color=CMAP_ROC)
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.02])
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curve — Random Forest Classifier", fontsize=13, fontweight="bold")
    ax.legend(loc="lower right")
    _save(fig, "roc_curve.png")


# ─────────────────────────────────────────────────────────────────────────────
# Plot 3 — Feature Importance
# ─────────────────────────────────────────────────────────────────────────────

def plot_feature_importance():
    imp_path = SAVED_MODELS / "feature_importances.csv"
    if not imp_path.exists():
        print("  [SKIP] feature_importances.csv not found.")
        return

    imp_df = pd.read_csv(imp_path).sort_values("importance", ascending=True)

    fig, ax = plt.subplots(figsize=(9, 7))
    bars = ax.barh(
        imp_df["feature"], imp_df["importance"],
        color=sns.color_palette("Blues_r", len(imp_df))
    )
    ax.bar_label(bars, fmt="%.4f", padding=3, fontsize=9)
    ax.set_xlabel("Feature Importance (Mean Decrease in Impurity)")
    ax.set_title("Feature Importances — Random Forest", fontsize=13, fontweight="bold")
    ax.set_xlim(0, imp_df["importance"].max() * 1.18)
    plt.tight_layout()
    _save(fig, "feature_importance.png")


# ─────────────────────────────────────────────────────────────────────────────
# Plot 4 — Precision-Recall Curve
# ─────────────────────────────────────────────────────────────────────────────

def plot_precision_recall(y_test: np.ndarray, y_prob: np.ndarray):
    precision, recall, _ = precision_recall_curve(y_test, y_prob)
    ap = average_precision_score(y_test, y_prob)

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.plot(recall, precision, color="darkorange", lw=2, label=f"AP = {ap:.4f}")
    ax.fill_between(recall, precision, alpha=0.08, color="darkorange")
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.05])
    ax.set_title("Precision-Recall Curve — Random Forest", fontsize=13, fontweight="bold")
    ax.legend(loc="upper right")
    _save(fig, "precision_recall_curve.png")


# ─────────────────────────────────────────────────────────────────────────────
# Plot 5 — Class Distribution
# ─────────────────────────────────────────────────────────────────────────────

def plot_class_distribution(y_test: np.ndarray):
    labels, counts = np.unique(y_test, return_counts=True)
    label_names    = ["Genuine (0)", "Fake/Bot (1)"]

    fig, ax = plt.subplots(figsize=(6, 5))
    bars = ax.bar(
        label_names, counts,
        color=["#4CAF50", "#F44336"],
        edgecolor="white",
        width=0.45,
    )
    ax.bar_label(bars, labels=[f"{c:,}\n({c/counts.sum()*100:.1f}%)" for c in counts], padding=5)
    ax.set_ylabel("Count")
    ax.set_title("Class Distribution — Test Set", fontsize=13, fontweight="bold")
    ax.set_ylim(0, counts.max() * 1.25)
    _save(fig, "class_distribution.png")


# ─────────────────────────────────────────────────────────────────────────────
# Plot 6 — Anomaly Score Distribution
# ─────────────────────────────────────────────────────────────────────────────

def plot_anomaly_score_distribution():
    scores_path = SAVED_MODELS / "anomaly_scores.npz"
    if not scores_path.exists():
        print("  [SKIP] anomaly_scores.npz not found — run train_anomaly.py first.")
        return

    data           = np.load(scores_path)
    y_true         = data["y_true"]
    anomaly_scores = data["anomaly_scores"]

    genuine_scores = anomaly_scores[y_true == 0]
    fake_scores    = anomaly_scores[y_true == 1]

    fig, ax = plt.subplots(figsize=FIGSIZE)
    ax.hist(genuine_scores, bins=50, alpha=0.6, color="#4CAF50", label="Genuine", density=True)
    ax.hist(fake_scores,    bins=50, alpha=0.6, color="#F44336", label="Fake/Bot", density=True)
    ax.set_xlabel("Normalised Anomaly Score  (0 = normal, 1 = anomalous)")
    ax.set_ylabel("Density")
    ax.set_title("Isolation Forest — Anomaly Score Distribution", fontsize=13, fontweight="bold")
    ax.legend()
    _save(fig, "anomaly_score_distribution.png")


# ─────────────────────────────────────────────────────────────────────────────
# Plot 7 — Accuracy Bar Chart (train / val / test)
# ─────────────────────────────────────────────────────────────────────────────

def plot_accuracy_bar():
    metrics_path = SAVED_MODELS / "classifier_metrics.json"
    if not metrics_path.exists():
        print("  [SKIP] classifier_metrics.json not found — run train_classifier.py first.")
        return

    with open(metrics_path) as fh:
        metrics = json.load(fh)

    splits  = ["Validation", "Test"]
    acc_vals = [
        metrics["validation"]["accuracy"],
        metrics["test"]["accuracy"],
    ]
    colours = ["#42A5F5", "#1565C0"]

    fig, ax = plt.subplots(figsize=(6, 5))
    bars = ax.bar(splits, acc_vals, color=colours, edgecolor="white", width=0.4)
    ax.bar_label(bars, fmt="%.4f", padding=4, fontweight="bold")
    ax.set_ylim(0, 1.12)
    ax.set_ylabel("Accuracy")
    ax.set_title("Accuracy — Validation vs Test", fontsize=13, fontweight="bold")
    ax.axhline(y=1.0, color="grey", linestyle="--", linewidth=0.8)
    _save(fig, "accuracy_bar.png")


# ─────────────────────────────────────────────────────────────────────────────
# Plot 8 — F1-Score Bar Chart
# ─────────────────────────────────────────────────────────────────────────────

def plot_f1_bar():
    metrics_path = SAVED_MODELS / "classifier_metrics.json"
    if not metrics_path.exists():
        print("  [SKIP] classifier_metrics.json not found.")
        return

    with open(metrics_path) as fh:
        metrics = json.load(fh)

    categories = ["Validation F1", "Test F1", "5-Fold CV F1 (mean)"]
    f1_vals    = [
        metrics["validation"]["f1"],
        metrics["test"]["f1"],
        metrics["cv_f1_mean"],
    ]
    colours = ["#66BB6A", "#2E7D32", "#A5D6A7"]

    fig, ax = plt.subplots(figsize=(7, 5))
    bars = ax.bar(categories, f1_vals, color=colours, edgecolor="white", width=0.45)
    ax.bar_label(bars, fmt="%.4f", padding=4, fontweight="bold")
    ax.set_ylim(0, 1.12)
    ax.set_ylabel("F1-Score")
    ax.set_title("F1-Score Comparison", fontsize=13, fontweight="bold")
    ax.axhline(y=1.0, color="grey", linestyle="--", linewidth=0.8)
    _save(fig, "f1_bar.png")


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def run_all():
    print("\n" + "=" * 60)
    print("  STEP 8 — Generating Evaluation Plots")
    print("=" * 60)

    # Load test predictions (saved by train_classifier.py)
    preds_path = SAVED_MODELS / "test_predictions.npz"
    if not preds_path.exists():
        raise FileNotFoundError(
            f"test_predictions.npz not found:\n  {preds_path}\n"
            "Run train_classifier.py first."
        )

    data   = np.load(preds_path)
    y_test = data["y_test"]
    y_pred = data["y_pred"]
    y_prob = data["y_prob"]

    print(f"\n  Test samples: {len(y_test):,}\n")

    plot_confusion_matrix(y_test, y_pred)
    plot_roc_curve(y_test, y_prob)
    plot_feature_importance()
    plot_precision_recall(y_test, y_prob)
    plot_class_distribution(y_test)
    plot_anomaly_score_distribution()
    plot_accuracy_bar()
    plot_f1_bar()

    print(f"\n  All plots saved to: {EVAL_RESULTS_DIR}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    run_all()
