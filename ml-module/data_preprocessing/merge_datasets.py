"""
merge_datasets.py
─────────────────────────────────────────────────────────────────────────────
Loads all users.csv files from the Cresci-2017 dataset, assigns binary labels
(0 = genuine, 1 = fake/bot), merges them into a single DataFrame, and saves
the result to dataset/processed/final_dataset.csv.

Dataset folder layout (folders named with .csv extension):
  dataset/raw/
    genuine_accounts.csv/users.csv          → label 0
    social_spambots_1.csv/users.csv         → label 1
    social_spambots_2.csv/users.csv         → label 1
    social_spambots_3.csv/users.csv         → label 1
    traditional_spambots_1.csv/users.csv    → label 1
    traditional_spambots_2.csv/users.csv    → label 1
    traditional_spambots_3.csv/users.csv    → label 1
    traditional_spambots_4.csv/users.csv    → label 1
    fake_followers.csv/users.csv            → label 1

Usage (from project root, inside venv):
    python ml-module/data_preprocessing/merge_datasets.py
─────────────────────────────────────────────────────────────────────────────
"""

import pandas as pd
from pathlib import Path

# ── Path resolution ──────────────────────────────────────────────────────────
# This file lives at:  ml-module/data_preprocessing/merge_datasets.py
# ML_MODULE_DIR →      ml-module/
# PROJECT_ROOT   →     FakeEngagementApp/
ML_MODULE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT  = ML_MODULE_DIR.parent

RAW_DIR       = PROJECT_ROOT / "dataset" / "raw"
PROCESSED_DIR = PROJECT_ROOT / "dataset" / "processed"

# ── Dataset registry ─────────────────────────────────────────────────────────
# Maps each source folder name (relative to RAW_DIR) to its integer label.
# Note: the raw folders carry a ".csv" suffix in their actual directory name.
DATASET_REGISTRY = {
    "genuine_accounts.csv":      0,   # Genuine users
    "social_spambots_1.csv":     1,   # Social spambots — batch 1
    "social_spambots_2.csv":     1,   # Social spambots — batch 2
    "social_spambots_3.csv":     1,   # Social spambots — batch 3
    "traditional_spambots_1.csv":1,   # Traditional spambots — batch 1
    "traditional_spambots_2.csv":1,   # Traditional spambots — batch 2
    "traditional_spambots_3.csv":1,   # Traditional spambots — batch 3
    "traditional_spambots_4.csv":1,   # Traditional spambots — batch 4
    "fake_followers.csv":        1,   # Fake follower accounts
}


def load_users_csv(folder_path: Path, label: int, source_name: str) -> pd.DataFrame:
    """
    Load users.csv from a single dataset folder.

    Parameters
    ----------
    folder_path : Path   Absolute path to the dataset sub-folder.
    label       : int    0 = genuine, 1 = fake/bot.
    source_name : str    Human-readable name for logging.

    Returns
    -------
    pd.DataFrame  Loaded frame with 'label' and 'source' columns appended.
                  Returns an empty DataFrame if the file is missing.
    """
    users_file = folder_path / "users.csv"

    if not users_file.exists():
        print(f"  [WARN] users.csv not found in '{source_name}' — skipping.")
        return pd.DataFrame()

    df = pd.read_csv(
        users_file,
        low_memory=False,   # avoid DtypeWarning on mixed-type columns
        encoding="utf-8",
    )

    df["label"]  = label
    df["source"] = source_name

    print(f"  [OK]   {source_name:<35}  rows: {len(df):>6}  label: {label}")
    return df


def merge_datasets() -> pd.DataFrame:
    """
    Iterate over the registry, load each users.csv, and concatenate into one
    merged DataFrame. Saves the result and returns it.

    Returns
    -------
    pd.DataFrame  The merged dataset.
    """
    print("\n" + "=" * 60)
    print("  STEP 1 — Merging dataset sources")
    print("=" * 60)

    frames = []

    for folder_name, label in DATASET_REGISTRY.items():
        folder_path = RAW_DIR / folder_name
        df = load_users_csv(folder_path, label, source_name=folder_name)
        if not df.empty:
            frames.append(df)

    if not frames:
        raise RuntimeError(
            f"No data loaded. Check that RAW_DIR exists:\n  {RAW_DIR}"
        )

    merged = pd.concat(frames, ignore_index=True)

    # ── Basic report ─────────────────────────────────────────────────────────
    print(f"\n  Total rows  : {len(merged):,}")
    print(f"  Columns     : {len(merged.columns)}")
    print(f"  Label dist  :\n{merged['label'].value_counts().to_string()}")

    # ── Save ─────────────────────────────────────────────────────────────────
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out_path = PROCESSED_DIR / "final_dataset.csv"
    merged.to_csv(out_path, index=False, encoding="utf-8")

    print(f"\n  Saved → {out_path}")
    print("=" * 60 + "\n")

    return merged


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    merge_datasets()
