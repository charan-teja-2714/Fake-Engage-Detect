"""
network_analysis/network_score.py
─────────────────────────────────────────────────────────────────────────────
Builds a k-nearest-neighbour similarity graph from profile features using
NetworkX, then computes a network_risk_score in [0, 1] per account.

Why k-NN similarity graph?
───────────────────────────
The Cresci-2017 dataset contains only profile metadata — no actual follower
or friendship edge lists.  A k-NN graph connects accounts that are "close" to
each other in feature space.  Genuine accounts form sparse, heterogeneous
clusters; bot armies tend to share very similar feature vectors and produce
dense, tightly-connected sub-graphs.  High clustering coefficient + high
degree centrality therefore signals coordinated, non-organic behaviour.

Algorithm
─────────
1. Scale selected profile features.
2. Build a k-NN graph (k = 10) with sklearn NearestNeighbors.
3. Create an undirected NetworkX graph from the k-NN edges.
4. Per node:
     - clustering_coefficient  (local clustering)
     - degree_centrality       (normalised degree)
5. Combine:
     raw_network_score = 0.6 * clustering_coefficient
                       + 0.4 * degree_centrality
6. Min-max normalise across the dataset → network_risk_score ∈ [0, 1]

High score  →  account behaves like a coordinated bot cluster.
Low score   →  account is isolated / heterogeneous (genuine-like).

Public API
──────────
  compute_network_scores(df: pd.DataFrame) -> np.ndarray
      Accepts feature DataFrame, returns normalised scores per row.

  compute_single_network_score(feature_vector: dict, reference_df: pd.DataFrame) -> float
      For the prediction endpoint: score one account against the reference set.
─────────────────────────────────────────────────────────────────────────────
"""

import sys
import numpy as np
import pandas as pd
import networkx as nx
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from pathlib import Path

# ── Configuration ─────────────────────────────────────────────────────────────

# Features that capture clustering tendency in bot networks
NETWORK_FEATURES = [
    "follower_following_ratio",
    "statuses_count",
    "followers_count",
    "friends_count",
    "activity_rate",
    "account_age_days",
    "default_profile",
    "default_profile_image",
]

K_NEIGHBOURS = 10        # number of nearest neighbours per node
MAX_SAMPLE   = 5_000     # cap for graph building (performance)
RANDOM_STATE = 42


# ─────────────────────────────────────────────────────────────────────────────
# Core functions
# ─────────────────────────────────────────────────────────────────────────────

def _prepare_feature_matrix(df: pd.DataFrame) -> np.ndarray:
    """
    Extract and scale NETWORK_FEATURES from df.
    Missing columns are silently filled with 0.
    """
    available = [c for c in NETWORK_FEATURES if c in df.columns]
    missing   = [c for c in NETWORK_FEATURES if c not in df.columns]
    if missing:
        print(f"  [WARN] network_score: missing columns filled with 0: {missing}", file=sys.stderr)

    X = df[available].copy() if available else pd.DataFrame(index=df.index)
    for col in missing:
        X[col] = 0.0

    X = X[NETWORK_FEATURES].values.astype(float)

    # Replace NaN / Inf before scaling
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

    scaler = StandardScaler()
    return scaler.fit_transform(X)


def _build_knn_graph(X: np.ndarray, k: int) -> nx.Graph:
    """
    Build an undirected k-NN graph.
    Each node is connected to its k nearest neighbours (excluding itself).
    """
    nbrs   = NearestNeighbors(n_neighbors=k + 1, metric="euclidean", n_jobs=-1)
    nbrs.fit(X)
    distances, indices = nbrs.kneighbors(X)

    G = nx.Graph()
    G.add_nodes_from(range(len(X)))

    for node_idx, neighbour_indices in enumerate(indices):
        for nbr_idx in neighbour_indices[1:]:     # skip self (index 0)
            if not G.has_edge(node_idx, nbr_idx):
                dist = distances[node_idx][list(neighbour_indices).index(nbr_idx)]
                G.add_edge(node_idx, nbr_idx, weight=float(1.0 / (dist + 1e-6)))

    return G


def _graph_metrics(G: nx.Graph) -> tuple[np.ndarray, np.ndarray]:
    """
    Compute per-node clustering coefficient and degree centrality.
    Returns two numpy arrays of length len(G).
    """
    n = len(G)

    # Clustering coefficient
    clustering_dict   = nx.clustering(G)
    clustering_arr    = np.array([clustering_dict.get(i, 0.0) for i in range(n)])

    # Degree centrality (normalised by n-1)
    degree_dict       = nx.degree_centrality(G)
    degree_arr        = np.array([degree_dict.get(i, 0.0) for i in range(n)])

    return clustering_arr, degree_arr


def _normalise(scores: np.ndarray) -> np.ndarray:
    """Min-max normalise to [0, 1]."""
    min_v, max_v = scores.min(), scores.max()
    if max_v == min_v:
        return np.zeros_like(scores)
    return (scores - min_v) / (max_v - min_v)


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def compute_network_scores(df: pd.DataFrame) -> np.ndarray:
    """
    Compute network_risk_score for every row in df.

    Parameters
    ----------
    df : pd.DataFrame
        Must contain the columns in NETWORK_FEATURES (or a subset).

    Returns
    -------
    np.ndarray, shape (len(df),)
        Normalised network risk score in [0, 1].
        Higher = more bot-like network structure.
    """
    n_total = len(df)

    # Sample if dataset is too large for efficient graph operations
    if n_total > MAX_SAMPLE:
        print(f"  [INFO] network_score: sampling {MAX_SAMPLE:,} of {n_total:,} accounts for graph.", file=sys.stderr)
        sample_idx = np.random.default_rng(RANDOM_STATE).choice(n_total, MAX_SAMPLE, replace=False)
        df_sample  = df.iloc[sample_idx].reset_index(drop=True)
    else:
        sample_idx = None
        df_sample  = df.reset_index(drop=True)

    X = _prepare_feature_matrix(df_sample)
    k = min(K_NEIGHBOURS, len(df_sample) - 1)     # guard against tiny datasets

    print(f"  Building k-NN graph (n={len(df_sample):,}, k={k}) …", file=sys.stderr)
    G = _build_knn_graph(X, k)

    print(f"  Computing graph metrics (nodes={G.number_of_nodes()}, edges={G.number_of_edges()}) …", file=sys.stderr)
    clustering_arr, degree_arr = _graph_metrics(G)

    # Weighted combination
    raw_scores = 0.6 * clustering_arr + 0.4 * degree_arr
    norm_scores = _normalise(raw_scores)

    # If we sampled, assign scores to full dataset by nearest-neighbour lookup
    if sample_idx is not None:
        from sklearn.neighbors import NearestNeighbors as _NNB
        X_full   = _prepare_feature_matrix(df.reset_index(drop=True))
        nn       = _NNB(n_neighbors=1, metric="euclidean", n_jobs=-1)
        nn.fit(X)
        _, nn_idx    = nn.kneighbors(X_full)
        full_scores  = norm_scores[nn_idx.flatten()]
    else:
        full_scores  = norm_scores

    print(f"  Network scores — mean={full_scores.mean():.3f}  std={full_scores.std():.3f}", file=sys.stderr)
    return full_scores


def compute_single_network_score(
    feature_vector: dict,
    reference_df: pd.DataFrame,
) -> float:
    """
    Compute a network risk score for a SINGLE new account by inserting it into
    a small reference set of genuine accounts and measuring how central it is.

    Parameters
    ----------
    feature_vector : dict
        Feature values for the account being scored (keys = NETWORK_FEATURES).
    reference_df : pd.DataFrame
        A reference sample of accounts (genuine preferred) to build the graph.

    Returns
    -------
    float : network_risk_score in [0, 1]
    """
    # Append the target account as the last row
    target_row = pd.DataFrame([feature_vector])
    combined   = pd.concat([reference_df, target_row], ignore_index=True)
    scores     = compute_network_scores(combined)
    # Return the score of the last (target) node
    return float(scores[-1])


# ─────────────────────────────────────────────────────────────────────────────
# Entry point — computes scores for the full feature dataset
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    ML_MODULE_DIR = Path(__file__).resolve().parent.parent
    PROJECT_ROOT  = ML_MODULE_DIR.parent
    PROCESSED_DIR = PROJECT_ROOT / "dataset" / "processed"
    SAVED_MODELS  = ML_MODULE_DIR / "saved_models"

    data_path = PROCESSED_DIR / "features_dataset.csv"
    if not data_path.exists():
        raise FileNotFoundError(
            f"Feature dataset not found:\n  {data_path}\n"
            "Run feature_engineering.py first."
        )

    print("\n" + "=" * 60)
    print("  STEP 5 — Network Analysis")
    print("=" * 60)

    df = pd.read_csv(data_path, low_memory=False)
    network_scores = compute_network_scores(df)

    # Save for inspection / use by authenticity_score.py
    SAVED_MODELS.mkdir(parents=True, exist_ok=True)
    out_path = SAVED_MODELS / "network_scores.npy"
    np.save(out_path, network_scores)
    print(f"\n  Network scores saved → {out_path}")

    # Report score stats by label
    labels = df["label"].values
    genuine_ns = network_scores[labels == 0]
    fake_ns    = network_scores[labels == 1]
    print(f"  Genuine network score : mean={genuine_ns.mean():.3f}  std={genuine_ns.std():.3f}")
    print(f"  Fake    network score : mean={fake_ns.mean():.3f}  std={fake_ns.std():.3f}")
    print("=" * 60 + "\n")
