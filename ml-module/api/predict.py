"""
api/predict.py
─────────────────────────────────────────────────────────────────────────────
Prediction endpoint — loads saved models and computes a full authenticity
report for a single account given its profile features.

This script is called by the Node.js backend via child_process (Phase 2).
It reads input from stdin as JSON and writes the result to stdout as JSON.

Input  (JSON on stdin or as Python dict via predict()):
  {
    "statuses_count"      : int,
    "followers_count"     : int,
    "friends_count"       : int,
    "favourites_count"    : int,
    "listed_count"        : int,
    "verified"            : 0 | 1,
    "default_profile"     : 0 | 1,
    "default_profile_image": 0 | 1,
    "geo_enabled"         : 0 | 1,
    "created_at"          : "Tue Jun 11 11:20:35 +0000 2013",  // OR
    "account_age_days"    : int,   // supply one of the two above
    "url"                 : str | null,
    "description"         : str | null,
    "screen_name"         : str | null
  }

Output (JSON):
  {
    "bot_probability"   : float,
    "anomaly_score"     : float,
    "network_score"     : float,
    "authenticity_score": int,
    "risk_level"        : "Safe" | "Monitor" | "High Risk",
    "component_bot"     : float,
    "component_anomaly" : float,
    "component_network" : float
  }

Usage examples
──────────────
  # Python API:
    from ml-module.api.predict import predict
    result = predict({"followers_count": 1200, ...})

  # CLI / Node.js child_process:
    echo '{"followers_count": 1200, ...}' | python ml-module/api/predict.py
─────────────────────────────────────────────────────────────────────────────
"""

import sys
import json
import numpy as np
import pandas as pd
import joblib
from pathlib import Path

# ── Path setup ────────────────────────────────────────────────────────────────
# This file: ml-module/api/predict.py
API_DIR       = Path(__file__).resolve().parent
ML_MODULE_DIR = API_DIR.parent
PROJECT_ROOT  = ML_MODULE_DIR.parent

# Make internal modules importable when called as a script
if str(ML_MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_MODULE_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scoring.authenticity_score import calculate as compute_authenticity
from network_analysis.network_score import (
    compute_single_network_score,
    NETWORK_FEATURES,
)

SAVED_MODELS  = ML_MODULE_DIR / "saved_models"
PROCESSED_DIR = PROJECT_ROOT / "dataset" / "processed"

# ── Feature list (sync with feature_engineering.py) ──────────────────────────
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

REFERENCE_DATE = pd.Timestamp("2015-09-01", tz="UTC")

# ── Lazy-loaded model cache ───────────────────────────────────────────────────
_classifier     = None
_anomaly_model  = None
_anomaly_scaler = None
_anomaly_norm_p5  = None   # percentile anchors saved during training
_anomaly_norm_p95 = None
_reference_df   = None     # small genuine sample for network scoring


def _load_models():
    """Load all saved models once and cache them in module-level variables."""
    global _classifier, _anomaly_model, _anomaly_scaler, \
           _anomaly_norm_p5, _anomaly_norm_p95, _reference_df

    if _classifier is None:
        clf_path = SAVED_MODELS / "classifier.pkl"
        if not clf_path.exists():
            raise FileNotFoundError(
                f"Classifier not found: {clf_path}\n"
                "Run train_classifier.py first."
            )
        _classifier = joblib.load(clf_path)

    if _anomaly_model is None:
        iso_path    = SAVED_MODELS / "anomaly_model.pkl"
        scaler_path = SAVED_MODELS / "anomaly_scaler.pkl"
        norm_path   = SAVED_MODELS / "anomaly_norm_params.json"
        if not iso_path.exists() or not scaler_path.exists():
            raise FileNotFoundError(
                "Anomaly model / scaler not found. Run train_anomaly.py first."
            )
        _anomaly_model  = joblib.load(iso_path)
        _anomaly_scaler = joblib.load(scaler_path)
        # Load percentile anchors for consistent normalisation with training
        if norm_path.exists():
            with open(norm_path) as fh:
                norm_params = json.load(fh)
            _anomaly_norm_p5  = norm_params["p5"]
            _anomaly_norm_p95 = norm_params["p95"]
        else:
            # Fallback if file missing: use rough defaults
            _anomaly_norm_p5  = -0.15
            _anomaly_norm_p95 =  0.15

    if _reference_df is None:
        feat_path = PROCESSED_DIR / "features_dataset.csv"
        if feat_path.exists():
            df = pd.read_csv(feat_path, low_memory=False)
            # Use a small genuine sample as reference for network scoring
            genuine = df[df["label"] == 0]
            _reference_df = genuine.sample(
                n=min(200, len(genuine)), random_state=42
            ).reset_index(drop=True)
        else:
            # If dataset not available, return empty reference
            _reference_df = pd.DataFrame(columns=NETWORK_FEATURES)


# ─────────────────────────────────────────────────────────────────────────────
# Feature extraction helpers
# ─────────────────────────────────────────────────────────────────────────────

def _safe_int(value, default: int = 0) -> int:
    try:
        return max(0, int(float(value)))
    except (TypeError, ValueError):
        return default


def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _parse_bool(value) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return int(bool(value))
    truthy = {"1", "true", "yes"}
    return 1 if str(value).strip().lower() in truthy else 0


def _parse_created_at(raw: str) -> pd.Timestamp | None:
    """Parse Twitter created_at string to UTC Timestamp."""
    try:
        return pd.to_datetime(raw, format="%a %b %d %H:%M:%S %z %Y", utc=True)
    except Exception:
        try:
            return pd.to_datetime(raw, utc=True)
        except Exception:
            return None


def _extract_features(raw_input: dict) -> pd.DataFrame:
    """
    Convert a raw input dictionary to a single-row feature DataFrame
    matching the format expected by the classifier pipeline.
    """
    # ── Raw counts ────────────────────────────────────────────────────────────
    statuses_count    = _safe_int(raw_input.get("statuses_count",    0))
    followers_count   = _safe_int(raw_input.get("followers_count",   0))
    friends_count     = _safe_int(raw_input.get("friends_count",     0))
    favourites_count  = _safe_int(raw_input.get("favourites_count",  0))
    listed_count      = _safe_int(raw_input.get("listed_count",      0))

    # ── Boolean flags ─────────────────────────────────────────────────────────
    verified               = _parse_bool(raw_input.get("verified",               0))
    default_profile        = _parse_bool(raw_input.get("default_profile",        0))
    default_profile_image  = _parse_bool(raw_input.get("default_profile_image",  0))
    geo_enabled            = _parse_bool(raw_input.get("geo_enabled",            0))

    # ── Account age ───────────────────────────────────────────────────────────
    if "account_age_days" in raw_input and raw_input["account_age_days"] is not None:
        account_age_days = _safe_int(raw_input["account_age_days"], 0)
    elif "created_at" in raw_input and raw_input["created_at"]:
        parsed_ts = _parse_created_at(str(raw_input["created_at"]))
        if parsed_ts is not None:
            account_age_days = int(max(0, (REFERENCE_DATE - parsed_ts).days))
        else:
            account_age_days = 0
    else:
        account_age_days = 0

    # ── Derived ratios ────────────────────────────────────────────────────────
    follower_following_ratio = followers_count / (friends_count + 1)
    activity_rate            = statuses_count  / (account_age_days + 1)
    engagement_proxy         = listed_count    / (followers_count + 1)
    tweet_to_followers       = statuses_count  / (followers_count + 1)

    # ── Content signals ───────────────────────────────────────────────────────
    url_val         = raw_input.get("url", None)
    desc_val        = raw_input.get("description", None)
    screen_name_val = raw_input.get("screen_name", "")

    has_url         = 1 if url_val not in (None, "", "nan", "None") else 0
    has_description = 1 if (desc_val not in (None, "", "nan", "None")
                            and str(desc_val).strip()) else 0
    name_str        = str(screen_name_val).strip() if screen_name_val else ""
    name_length     = len(name_str)
    digits_in_name  = sum(c.isdigit() for c in name_str)

    row = {
        "statuses_count"          : statuses_count,
        "followers_count"         : followers_count,
        "friends_count"           : friends_count,
        "favourites_count"        : favourites_count,
        "listed_count"            : listed_count,
        "verified"                : verified,
        "default_profile"         : default_profile,
        "default_profile_image"   : default_profile_image,
        "geo_enabled"             : geo_enabled,
        "account_age_days"        : account_age_days,
        "follower_following_ratio": follower_following_ratio,
        "activity_rate"           : activity_rate,
        "engagement_proxy"        : engagement_proxy,
        "tweet_to_followers"      : tweet_to_followers,
        "has_url"                 : has_url,
        "has_description"         : has_description,
        "name_length"             : name_length,
        "digits_in_name"          : digits_in_name,
    }

    return pd.DataFrame([row])[FEATURE_COLS]


# ─────────────────────────────────────────────────────────────────────────────
# Anomaly score helper
# ─────────────────────────────────────────────────────────────────────────────

def _compute_anomaly_score(feature_df: pd.DataFrame) -> float:
    """
    Run IsolationForest on one feature row and return a normalised [0,1] score.
    Score of 1 = highly anomalous (bot-like).

    Uses the same percentile anchors (p5/p95) saved during training so that
    inference scores are on an identical scale to training scores.
        higher raw_score (fake-like, clustered)  → higher anomaly score  ✓
        lower  raw_score (genuine-like, diverse) → lower  anomaly score  ✓
    """
    X_scaled  = _anomaly_scaler.transform(feature_df.values)
    raw_score = float(_anomaly_model.decision_function(X_scaled)[0])

    # Percentile-based normalisation — consistent with train_anomaly.py
    spread = _anomaly_norm_p95 - _anomaly_norm_p5
    if spread < 1e-8:
        return 0.5
    normalised = (raw_score - _anomaly_norm_p5) / spread
    return float(max(0.0, min(1.0, normalised)))


# ─────────────────────────────────────────────────────────────────────────────
# Heuristic override layer
# ─────────────────────────────────────────────────────────────────────────────

def _apply_heuristic_overrides(
    feature_df: pd.DataFrame,
    bot_probability: float,
    network_score: float,
) -> tuple:
    """
    Post-ML rule-based corrections for two known patterns that the
    Cresci-2017 (2015 Twitter) training data cannot represent:

    Rule 1 — Celebrity / brand accounts
        Pattern : follower/following ratio > 1000 AND followers > 50,000
        Problem : The k-NN network component clusters all extreme-ratio
                  accounts together (celebrities, news channels, brands)
                  and assigns network_score ≈ 1.0 — flagging them as
                  bot-like dense clusters.
        Fix     : Cap network_score at 0.25 — these accounts are not bots,
                  the graph metric is simply unreliable at extreme ratios.

    Rule 2 — Modern "bought followers" pattern
        Pattern : followers > 50,000 AND tweet_to_followers < 0.002
                  AND likes < max(1,000, followers * 0.08)
        Problem : In 2015, bots mass-followed people; they didn't buy
                  followers. High-follower + low-activity + low-engagement
                  is a modern tactic absent from Cresci-2017, so the RF
                  misses it entirely. The likes threshold is proportional
                  so it catches accounts like 98K followers / 6K likes
                  (6.7% engagement) which an absolute threshold of 1K would
                  miss entirely.
        Fix     : Raise bot_probability floor to 0.60 so these accounts
                  are at minimum flagged as Suspicious.

    Rule 3 — Extreme follower/following disproportion with minimal activity
        Pattern : ratio > 2,000 AND tweet_to_followers < 0.003
                  AND followers > 20,000 AND NOT verified
        Problem : Accounts with extreme follower-to-following ratios and
                  very few posts per follower almost never occur organically
                  at scale. This catches mid-tier bought-follower accounts
                  that slip past Rules 1 and 2.
        Fix     : Raise bot_probability floor to 0.50 (Suspicious minimum).
    """
    followers   = float(feature_df["followers_count"].iloc[0])
    following   = float(feature_df["friends_count"].iloc[0])
    posts       = float(feature_df["statuses_count"].iloc[0])
    likes       = float(feature_df["favourites_count"].iloc[0])
    verified    = float(feature_df["verified"].iloc[0])
    ratio       = followers / (following + 1)
    tweet_to_f  = posts    / (followers + 1)

    # Rule 1 — celebrity / brand: unreliable network score (lowered threshold to 50K)
    if ratio > 1000 and followers > 50_000:
        network_score = min(network_score, 0.25)

    # Rule 2 — bought followers: proportional likes threshold catches mid-tier accounts
    likes_threshold = max(1_000, followers * 0.08)
    if followers > 50_000 and tweet_to_f < 0.002 and likes < likes_threshold:
        bot_probability = max(bot_probability, 0.60)

    # Rule 3 — extreme ratio + minimal activity: catches accounts Rule 2 misses
    if (ratio > 2_000 and tweet_to_f < 0.003
            and followers > 20_000 and not verified):
        bot_probability = max(bot_probability, 0.50)

    # Rule 4 — mass follower bot pattern (classic Cresci-2017 archetype)
    #   Pattern : following ≥ 70% of followers AND tweet_to_f < 0.001
    #             AND likes < 2,000 AND followers > 50,000
    #   Meaning : Account follows almost everyone it has; this is the
    #             signature of a follow-back / mass-follow bot.
    #   Fix     : Raise bot_probability to 0.85 → clearly Inauthentic.
    if (following >= followers * 0.70
            and tweet_to_f < 0.001
            and likes < 2_000
            and followers > 50_000):
        bot_probability = max(bot_probability, 0.85)

    return bot_probability, network_score


# ─────────────────────────────────────────────────────────────────────────────
# Main prediction function
# ─────────────────────────────────────────────────────────────────────────────

def predict(raw_input: dict) -> dict:
    """
    Full prediction pipeline for a single account.

    Parameters
    ----------
    raw_input : dict
        Raw profile features (see module docstring for expected keys).

    Returns
    -------
    dict
        {
          "bot_probability"   : float,
          "anomaly_score"     : float,
          "network_score"     : float,
          "authenticity_score": int,
          "risk_level"        : str,
          "component_bot"     : float,
          "component_anomaly" : float,
          "component_network" : float
        }
    """
    _load_models()

    # ── 1. Build feature row ──────────────────────────────────────────────────
    feature_df = _extract_features(raw_input)

    # ── 2. Bot probability (Random Forest) ───────────────────────────────────
    bot_probability = float(_classifier.predict_proba(feature_df)[0][1])

    # ── 3. Anomaly score (Isolation Forest) ──────────────────────────────────
    # The anomaly model expects only the raw FEATURE_COLS (no pipeline scaler)
    anomaly_score = _compute_anomaly_score(feature_df)

    # ── 4. Network score ──────────────────────────────────────────────────────
    feature_dict = {col: feature_df[col].iloc[0] for col in NETWORK_FEATURES
                    if col in feature_df.columns}
    # Fill missing network features with 0
    for col in NETWORK_FEATURES:
        if col not in feature_dict:
            feature_dict[col] = 0.0

    if len(_reference_df) > 0:
        network_score = compute_single_network_score(feature_dict, _reference_df)
    else:
        # Fallback: derive network score heuristically from profile features
        # High default_profile + default_profile_image → bot-like → high score
        network_score = float(
            0.5 * feature_dict.get("default_profile", 0)
            + 0.5 * feature_dict.get("default_profile_image", 0)
        )

    # ── 5. Heuristic overrides (hybrid ML + rule layer) ───────────────────────
    bot_probability, network_score = _apply_heuristic_overrides(
        feature_df, bot_probability, network_score
    )

    # ── 6. Authenticity score ─────────────────────────────────────────────────
    result = compute_authenticity(bot_probability, anomaly_score, network_score)

    return result


# ─────────────────────────────────────────────────────────────────────────────
# CLI entry point (stdin → stdout JSON for Node.js child_process)
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    try:
        raw_json   = sys.stdin.read().strip()
        raw_input  = json.loads(raw_json)
        result     = predict(raw_input)
        print(json.dumps(result, indent=2))
        sys.exit(0)
    except Exception as exc:
        error_response = {
            "error": str(exc),
            "authenticity_score": None,
            "risk_level": "Unknown",
        }
        print(json.dumps(error_response, indent=2), file=sys.stderr)
        sys.exit(1)
