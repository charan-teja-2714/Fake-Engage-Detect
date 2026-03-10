"""
feature_engineering.py
─────────────────────────────────────────────────────────────────────────────
Reads the merged dataset produced by merge_datasets.py, engineers features
that are meaningful for bot/fake-account detection, handles missing values
and division-by-zero, then saves the processed dataset.

Engineered features
───────────────────
Raw (cleaned):
  statuses_count, followers_count, friends_count, favourites_count,
  listed_count, verified, default_profile, default_profile_image,
  geo_enabled

Derived:
  account_age_days          – days since account creation (ref: 2015-09-01)
  follower_following_ratio  – followers / (friends + 1)
  activity_rate             – statuses / (account_age_days + 1)
  engagement_proxy          – listed / (followers + 1)
  tweet_to_followers        – statuses / (followers + 1)
  has_url                   – 1 if url field is non-empty, else 0
  has_description           – 1 if description is non-empty, else 0
  name_length               – character length of screen_name
  digits_in_name            – number of digit characters in screen_name

Usage (from project root, inside venv):
    python ml-module/data_preprocessing/feature_engineering.py
─────────────────────────────────────────────────────────────────────────────
"""

import pandas as pd
import numpy as np
from pathlib import Path

# ── Path resolution ───────────────────────────────────────────────────────────
ML_MODULE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT  = ML_MODULE_DIR.parent
PROCESSED_DIR = PROJECT_ROOT / "dataset" / "processed"

# Reference date used to compute account_age_days.
# Fixed so that features remain reproducible across different run times.
# Cresci-2017 dataset was crawled through 2015, so 2015-09-01 is appropriate.
REFERENCE_DATE = pd.Timestamp("2015-09-01", tz="UTC")

# ── Feature lists ─────────────────────────────────────────────────────────────
# Columns we keep from the raw CSV (before deriving new ones)
RAW_NUMERIC_COLS = [
    "statuses_count",
    "followers_count",
    "friends_count",
    "favourites_count",
    "listed_count",
]

BOOLEAN_COLS = [
    "verified",
    "default_profile",
    "default_profile_image",
    "geo_enabled",
]

# Final feature columns used for model training
FEATURE_COLS = [
    # Raw counts
    "statuses_count",
    "followers_count",
    "friends_count",
    "favourites_count",
    "listed_count",
    # Boolean profile signals
    "verified",
    "default_profile",
    "default_profile_image",
    "geo_enabled",
    # Derived temporal
    "account_age_days",
    # Derived ratios
    "follower_following_ratio",
    "activity_rate",
    "engagement_proxy",
    "tweet_to_followers",
    # Derived content signals
    "has_url",
    "has_description",
    "name_length",
    "digits_in_name",
]


# ─────────────────────────────────────────────────────────────────────────────
# Helper functions
# ─────────────────────────────────────────────────────────────────────────────

def parse_boolean(series: pd.Series) -> pd.Series:
    """
    Coerce a mixed-type boolean column to integer (0 / 1).
    Handles: True/False strings, 1/0 integers, empty strings, NaN.
    """
    # Map common truthy representations → 1, everything else → 0
    truthy = {"1", "true", "yes"}
    return (
        series
        .astype(str)
        .str.strip()
        .str.lower()
        .map(lambda x: 1 if x in truthy else (0 if x in {"0", "false", "no", "nan", ""} else np.nan))
        .fillna(0)
        .astype(int)
    )


def parse_created_at(series: pd.Series) -> pd.Series:
    """
    Parse Twitter's created_at string into timezone-aware UTC timestamps.
    Expected format: 'Tue Jun 11 11:20:35 +0000 2013'
    Falls back to pandas inference for any rows that do not match.
    """
    parsed = pd.to_datetime(
        series,
        format="%a %b %d %H:%M:%S %z %Y",
        errors="coerce",
        utc=True,
    )
    # For rows that failed strict parsing, try generic inference
    failed_mask = parsed.isna() & series.notna()
    if failed_mask.any():
        parsed[failed_mask] = pd.to_datetime(
            series[failed_mask], errors="coerce", utc=True
        )
    return parsed


def compute_account_age(created_at_parsed: pd.Series) -> pd.Series:
    """
    Return account age in whole days relative to REFERENCE_DATE.
    Negative values (accounts created after reference) are clipped to 0.
    NaN → median imputation applied after this function is called.
    """
    return (REFERENCE_DATE - created_at_parsed).dt.days.clip(lower=0)


# ─────────────────────────────────────────────────────────────────────────────
# Main pipeline
# ─────────────────────────────────────────────────────────────────────────────

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Full feature engineering pipeline.

    Parameters
    ----------
    df : pd.DataFrame   Merged raw dataset with 'label' column.

    Returns
    -------
    pd.DataFrame        Dataset with engineered features + label.
    """
    print("\n" + "=" * 60)
    print("  STEP 2 — Feature Engineering")
    print("=" * 60)
    print(f"  Input rows : {len(df):,}")

    # ── 1. Clean raw numeric columns ─────────────────────────────────────────
    for col in RAW_NUMERIC_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").clip(lower=0)
        else:
            print(f"  [WARN] Column '{col}' not found — filling with 0.")
            df[col] = 0.0

    # ── 2. Parse boolean columns ──────────────────────────────────────────────
    for col in BOOLEAN_COLS:
        if col in df.columns:
            df[col] = parse_boolean(df[col])
        else:
            print(f"  [WARN] Boolean column '{col}' not found — filling with 0.")
            df[col] = 0

    # ── 3. Temporal feature: account_age_days ─────────────────────────────────
    if "created_at" in df.columns:
        df["_created_at_parsed"] = parse_created_at(df["created_at"])
        df["account_age_days"]   = compute_account_age(df["_created_at_parsed"])
        df.drop(columns=["_created_at_parsed"], inplace=True)
    else:
        print("  [WARN] 'created_at' column not found — account_age_days set to 0.")
        df["account_age_days"] = 0

    # ── 4. Ratio features (safe division via denominator + 1) ─────────────────
    df["follower_following_ratio"] = (
        df["followers_count"] / (df["friends_count"] + 1)
    )
    df["activity_rate"] = (
        df["statuses_count"] / (df["account_age_days"] + 1)
    )
    df["engagement_proxy"] = (
        df["listed_count"] / (df["followers_count"] + 1)
    )
    df["tweet_to_followers"] = (
        df["statuses_count"] / (df["followers_count"] + 1)
    )

    # ── 5. Content signals ────────────────────────────────────────────────────
    if "url" in df.columns:
        df["has_url"] = df["url"].notna().astype(int)
    else:
        df["has_url"] = 0

    if "description" in df.columns:
        df["has_description"] = (
            df["description"].astype(str).str.strip().ne("").astype(int)
        )
    else:
        df["has_description"] = 0

    if "screen_name" in df.columns:
        name_str = df["screen_name"].astype(str).str.strip()
        df["name_length"]    = name_str.str.len()
        df["digits_in_name"] = name_str.str.count(r"\d")
    else:
        df["name_length"]    = 0
        df["digits_in_name"] = 0

    # ── 6. Handle remaining NaN / Inf in feature columns ─────────────────────
    for col in FEATURE_COLS:
        if col not in df.columns:
            df[col] = 0.0
        # Replace infinities with NaN first, then impute
        df[col] = df[col].replace([np.inf, -np.inf], np.nan)
        # Impute with column median (robust to outliers)
        median_val = df[col].median()
        if pd.isna(median_val):
            median_val = 0.0
        df[col] = df[col].fillna(median_val)

    # ── 7. Report & save ──────────────────────────────────────────────────────
    output_df = df[FEATURE_COLS + ["label", "source"]].copy()

    print(f"  Output rows  : {len(output_df):,}")
    print(f"  Feature count: {len(FEATURE_COLS)}")
    print(f"  Label dist   :\n{output_df['label'].value_counts().to_string()}")
    print(f"\n  Feature summary:")
    print(output_df[FEATURE_COLS].describe().to_string())

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out_path = PROCESSED_DIR / "features_dataset.csv"
    output_df.to_csv(out_path, index=False, encoding="utf-8")

    print(f"\n  Saved → {out_path}")
    print("=" * 60 + "\n")

    return output_df


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def run_pipeline():
    """Load merged dataset, engineer features, and save."""
    merged_path = PROCESSED_DIR / "final_dataset.csv"

    if not merged_path.exists():
        raise FileNotFoundError(
            f"Merged dataset not found at:\n  {merged_path}\n"
            "Run merge_datasets.py first."
        )

    print(f"  Loading merged dataset from:\n    {merged_path}")
    df = pd.read_csv(merged_path, low_memory=False, encoding="utf-8")
    return engineer_features(df)


if __name__ == "__main__":
    run_pipeline()
