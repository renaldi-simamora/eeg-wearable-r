"""
Preprocessing Pipeline Module for Single-Channel Frontal EEG
Project: Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak

Responsibilities:
1. Read-only loading of dataset without modifying original CSV.
2. Evidence-based filtering of identical duplicate records and poor signal quality (>0).
3. Extraction and validation of 5 relative band power features.
4. Binary target encoding (0 = Closed-Eye Resting Baseline, 1 = Active Mathematical Tasks).
5. Scikit-learn Pipeline construction (SimpleImputer + StandardScaler) to prevent data leakage.
"""

import os
import csv
import logging
from typing import Tuple, List, Dict, Any, Optional
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger("eeg_preprocessing")

# 5 Normative relative spectral band power features (summing to ~100%)
BASELINE_FEATURES: List[str] = [
    "neuro_relative_delta",
    "neuro_relative_theta",
    "neuro_relative_alpha",
    "neuro_relative_beta",
    "neuro_relative_gamma",
]

# Primary Binary Classification Mapping
BINARY_LABEL_MAPPING: Dict[str, int] = {
    "1": 0,  # Class 0: Closed-Eye Resting Baseline (Task 1)
    "2": 1,  # Class 1: Active Mathematical Task (Task 2)
    "3": 1,  # Class 1: Active Mathematical Task (Task 3)
}

CLASS_NAMES: Dict[int, str] = {
    0: "Closed-Eye Resting Baseline",
    1: "Active Mathematical Task"
}


def load_and_filter_data(
    data_path: str,
    exclude_duplicates: bool = True,
    exclude_poor_signal: bool = True,
    signal_threshold: int = 0
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, List[str], Dict[str, Any]]:
    """
    Load dataset in read-only mode, apply filtering criteria, and extract (X, y, groups).

    Args:
        data_path: Absolute or relative path to merged_eeg_datas_50_subjects.csv
        exclude_duplicates: If True, exclude identical records based on ASIC powers + ID + task
        exclude_poor_signal: If True, exclude records where poor_signal_strength > signal_threshold
        signal_threshold: Maximum acceptable poor_signal value (default 0: clean contact only)

    Returns:
        X: Feature matrix of shape (N, 5), dtype float64
        y: Binary label array of shape (N,), dtype int64 (0 or 1)
        groups: Array of subject identifiers (student_id), shape (N,)
        feature_names: List of feature names
        audit_meta: Metadata summarizing filtering counts and retention
    """
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"EEG dataset file not found at: {data_path}")

    raw_rows_count = 0
    clean_rows = []
    seen_signatures = set()
    duplicate_count = 0
    poor_signal_count = 0
    overlap_count = 0

    with open(data_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []

        # Validate required columns exist
        required_cols = BASELINE_FEATURES + ["student_id", "task_id", "neuro_poor_signal_strength"]
        missing_cols = [c for c in required_cols if c not in fieldnames]
        if missing_cols:
            raise ValueError(f"Dataset missing required columns: {missing_cols}")

        for row in reader:
            raw_rows_count += 1
            s_id = row["student_id"].strip()
            t_id = row["task_id"].strip()
            poor_sig_raw = row["neuro_poor_signal_strength"].strip()

            # Technical definition of duplicate:
            # Identical readings across all 8 ASIC raw powers + student + task + raw prefix
            row_sig = (
                s_id, t_id,
                row.get("neuro_delta", ""), row.get("neuro_theta", ""),
                row.get("neuro_loAlpha", ""), row.get("neuro_hiAlpha", ""),
                row.get("neuro_loBeta", ""), row.get("neuro_hiBeta", ""),
                row.get("neuro_loGamma", ""), row.get("neuro_midGamma", ""),
                row.get("neuro_raw_eeg", "")[:100]
            )

            is_dup = False
            if row_sig in seen_signatures:
                is_dup = True
                duplicate_count += 1
            else:
                seen_signatures.add(row_sig)

            # Technical definition of poor signal:
            is_poor = False
            try:
                poor_val = int(poor_sig_raw)
                if poor_val > signal_threshold:
                    is_poor = True
                    poor_signal_count += 1
            except (ValueError, TypeError):
                is_poor = True
                poor_signal_count += 1

            if is_dup and is_poor:
                overlap_count += 1

            # Filter decision
            if exclude_duplicates and is_dup:
                continue
            if exclude_poor_signal and is_poor:
                continue

            # Validate target mapping
            if t_id not in BINARY_LABEL_MAPPING:
                continue

            clean_rows.append(row)

    total_clean_rows = len(clean_rows)
    total_excluded = raw_rows_count - total_clean_rows

    # Parse and validate numerical feature matrix X
    X_list = []
    y_list = []
    groups_list = []

    for r in clean_rows:
        feat_vec = []
        for f_name in BASELINE_FEATURES:
            val_str = r[f_name]
            try:
                v = float(val_str)
                if not np.isfinite(v):
                    raise ValueError(f"Non-finite value {v} in feature {f_name}")
                feat_vec.append(v)
            except (ValueError, TypeError) as e:
                raise ValueError(f"Invalid numerical value '{val_str}' in column '{f_name}': {e}")

        t_id = r["task_id"].strip()
        label = BINARY_LABEL_MAPPING[t_id]
        s_id = r["student_id"].strip()

        X_list.append(feat_vec)
        y_list.append(label)
        groups_list.append(s_id)

    X = np.array(X_list, dtype=np.float64)
    y = np.array(y_list, dtype=np.int64)
    groups = np.array(groups_list, dtype=object)

    unique_subjects = np.unique(groups)

    audit_meta = {
        "raw_rows_count": raw_rows_count,
        "total_clean_rows": total_clean_rows,
        "total_excluded": total_excluded,
        "duplicate_count": duplicate_count,
        "poor_signal_count": poor_signal_count,
        "overlap_count": overlap_count,
        "retention_rate_pct": round((total_clean_rows / raw_rows_count) * 100.0, 2),
        "unique_subjects_count": len(unique_subjects),
        "class_0_resting_count": int(np.sum(y == 0)),
        "class_1_math_count": int(np.sum(y == 1)),
        "class_0_ratio_pct": round(float(np.mean(y == 0) * 100.0), 2),
        "class_1_ratio_pct": round(float(np.mean(y == 1) * 100.0), 2),
    }

    return X, y, groups, BASELINE_FEATURES.copy(), audit_meta


def build_preprocessing_pipeline() -> Pipeline:
    """
    Construct a clean Scikit-learn Pipeline encapsulating missing value imputation
    and standard feature scaling.

    When embedded into Cross-Validation, the parameters (median and mean/variance)
    are fitted EXCLUSIVELY on the training fold, guaranteeing zero data leakage.

    Returns:
        sklearn.pipeline.Pipeline containing:
        - 'imputer': SimpleImputer(strategy='median')
        - 'scaler': StandardScaler()
    """
    steps = [
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ]
    return Pipeline(steps)

