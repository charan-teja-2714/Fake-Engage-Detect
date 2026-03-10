"""
scoring/authenticity_score.py
─────────────────────────────────────────────────────────────────────────────
Aggregates three independent signals into a single Authenticity Score (0-100)
and assigns a risk level label.

Formula
───────
  authenticity_score =
      (0.55 × (1 - bot_probability))
    + (0.15 × (1 - anomaly_score))
    + (0.30 × (1 - network_score))

  Multiplied by 100 and rounded to the nearest integer.

Weight rationale (calibrated against actual component ROC-AUC):
  Random Forest    ROC-AUC 0.9986  →  weight 0.55  (dominant, strongest signal)
  Isolation Forest ROC-AUC 0.6084  →  weight 0.15  (supplementary; IF has known
    limitations with dense bot clusters — see train_anomaly.py for details)
  Network analysis weight           →  0.30  (unchanged)

Input ranges (all expected in [0, 1])
  bot_probability  – P(fake | features) from Random Forest
  anomaly_score    – normalised Isolation Forest anomaly score
  network_score    – normalised network risk score

Engagement authenticity tiers
  80 – 100 →  Authentic    (genuine creator, low fake-engagement risk)
  60 –  79 →  Suspicious   (moderate signals of fake/bought engagement)
   0 –  59 →  Inauthentic  (strong signals of fake engagement — do not partner)

Public API
──────────
  calculate(bot_probability, anomaly_score, network_score) -> dict
      Returns a dict with score, risk_level, and per-component breakdown.

  batch_calculate(df) -> pd.DataFrame
      Batch version for a DataFrame that has the three score columns.
─────────────────────────────────────────────────────────────────────────────
"""

import numpy as np
import pandas as pd
from pathlib import Path

# ── Weights (calibrated to per-component ROC-AUC on Cresci-2017) ─────────────
WEIGHT_BOT     = 0.55   # Random Forest    — ROC-AUC 0.9986
WEIGHT_ANOMALY = 0.15   # Isolation Forest — ROC-AUC 0.6084
WEIGHT_NETWORK = 0.30   # Network analysis

# ── Risk thresholds ───────────────────────────────────────────────────────────
THRESHOLD_AUTHENTIC  = 80
THRESHOLD_SUSPICIOUS = 60


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    """Clamp a float to [lo, hi]."""
    return max(lo, min(hi, float(value)))


def _risk_level(score: int) -> str:
    """Map an integer score (0-100) to an engagement authenticity tier."""
    if score >= THRESHOLD_AUTHENTIC:
        return "Authentic"
    if score >= THRESHOLD_SUSPICIOUS:
        return "Suspicious"
    return "Inauthentic"


def calculate(
    bot_probability: float,
    anomaly_score: float,
    network_score: float,
) -> dict:
    """
    Compute the authenticity score for a single account.

    Parameters
    ----------
    bot_probability : float   P(fake) from RF, in [0, 1].
    anomaly_score   : float   Normalised IF anomaly score, in [0, 1].
    network_score   : float   Normalised network risk score, in [0, 1].

    Returns
    -------
    dict with keys:
        authenticity_score : int     (0 – 100)
        risk_level         : str     "Authentic" | "Suspicious" | "Inauthentic"
        bot_probability    : float   (clamped input)
        anomaly_score      : float   (clamped input)
        network_score      : float   (clamped input)
        component_bot      : float   0.4 × (1 - bot_probability)
        component_anomaly  : float   0.3 × (1 - anomaly_score)
        component_network  : float   0.3 × (1 - network_score)
    """
    # Clamp all inputs to valid range
    bp = _clamp(bot_probability)
    as_ = _clamp(anomaly_score)
    ns = _clamp(network_score)

    # Component contributions
    comp_bot     = WEIGHT_BOT     * (1.0 - bp)
    comp_anomaly = WEIGHT_ANOMALY * (1.0 - as_)
    comp_network = WEIGHT_NETWORK * (1.0 - ns)

    # Aggregate and scale to 0-100
    raw_score          = comp_bot + comp_anomaly + comp_network
    authenticity_score = int(round(_clamp(raw_score) * 100))
    risk_level         = _risk_level(authenticity_score)

    return {
        "authenticity_score": authenticity_score,
        "risk_level"        : risk_level,
        "bot_probability"   : round(bp, 4),
        "anomaly_score"     : round(as_, 4),
        "network_score"     : round(ns, 4),
        "component_bot"     : round(comp_bot, 4),
        "component_anomaly" : round(comp_anomaly, 4),
        "component_network" : round(comp_network, 4),
    }


def batch_calculate(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute authenticity scores for an entire DataFrame.

    Expected columns in df:
      - bot_probability
      - anomaly_score
      - network_score

    Returns the input DataFrame with appended columns:
      - authenticity_score  (int)
      - risk_level          (str)
      - component_bot       (float)
      - component_anomaly   (float)
      - component_network   (float)
    """
    required = {"bot_probability", "anomaly_score", "network_score"}
    missing  = required - set(df.columns)
    if missing:
        raise ValueError(f"batch_calculate: missing columns {missing}")

    results = df.apply(
        lambda row: calculate(
            row["bot_probability"],
            row["anomaly_score"],
            row["network_score"],
        ),
        axis=1,
        result_type="expand",
    )

    return pd.concat([df, results], axis=1)


# ─────────────────────────────────────────────────────────────────────────────
# CLI demo
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  STEP 6 — Authenticity Score Calculator (demo)")
    print("=" * 60)

    # Realistic values based on Cresci-2017 trained models:
    #   Genuine accounts  → RF bot_prob ≈ 0.02–0.10, IF anomaly ≈ 0.37–0.98 (mean 0.677)
    #   Fake/bot accounts → RF bot_prob ≈ 0.90–0.99, IF anomaly ≈ 0.51–1.04 (mean 0.775)
    examples = [
        {"label": "Authentic creator",   "bot_probability": 0.05, "anomaly_score": 0.55, "network_score": 0.15},
        {"label": "Borderline creator",  "bot_probability": 0.12, "anomaly_score": 0.70, "network_score": 0.35},
        {"label": "Suspicious account",  "bot_probability": 0.75, "anomaly_score": 0.78, "network_score": 0.60},
        {"label": "Inauthentic account", "bot_probability": 0.99, "anomaly_score": 0.88, "network_score": 0.85},
    ]

    for ex in examples:
        result = calculate(ex["bot_probability"], ex["anomaly_score"], ex["network_score"])
        print(f"\n  [{ex['label']}]")
        print(f"    Inputs  → bot_prob={ex['bot_probability']}  anomaly={ex['anomaly_score']}  network={ex['network_score']}")
        print(f"    Score   → {result['authenticity_score']} / 100")
        print(f"    Risk    → {result['risk_level']}")
        print(f"    Breakdown → bot={result['component_bot']:.3f}  anomaly={result['component_anomaly']:.3f}  network={result['component_network']:.3f}")

    print("\n" + "=" * 60 + "\n")
