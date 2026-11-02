"""
Validation Module: Subject-Independent GroupKFold Partitioning & Zero-Leakage Audit
Project: Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak

Responsibilities:
1. Generate deterministic 5-fold Subject-Independent splits using GroupKFold(n_splits=5).
2. Rigorous automated verification asserting ZERO subject overlap between train and validation.
3. Compute per-fold sample counts, subject counts, and class balance metrics.
4. Export detailed audit artifacts (JSON summary & CSV subject partition table).
"""

import os
import csv
import json
from typing import List, Tuple, Dict, Any
import numpy as np
from sklearn.model_selection import GroupKFold


def create_groupkfold_splits(
    X: np.ndarray,
    y: np.ndarray,
    groups: np.ndarray,
    n_splits: int = 5
) -> List[Tuple[np.ndarray, np.ndarray]]:
    """
    Generate deterministic subject-independent splits where all samples belonging to any
    given student_id appear exclusively in the training set OR the validation set, never both.

    Args:
        X: Feature array of shape (N, n_features)
        y: Label array of shape (N,)
        groups: Subject identifier array (student_id) of shape (N,)
        n_splits: Number of cross-validation folds (default 5)

    Returns:
        List of tuples: [(train_indices, val_indices), ...] for each fold.
    """
    gkf = GroupKFold(n_splits=n_splits)
    splits = list(gkf.split(X, y, groups=groups))
    return splits


def verify_no_group_leakage(
    splits: List[Tuple[np.ndarray, np.ndarray]],
    groups: np.ndarray
) -> Dict[str, Any]:
    """
    Perform an automated mathematical verification to assert zero subject leakage.
    For every fold, ensures that:
        set(groups[train_idx]) INTERSECT set(groups[val_idx]) == EMPTY_SET

    Raises:
        AssertionError if any subject appears simultaneously in train and validation sets.

    Returns:
        Verification metadata dictionary.
    """
    leakage_detected = False
    audit_results = []

    for fold_idx, (train_idx, val_idx) in enumerate(splits, start=1):
        train_subjs = set(groups[train_idx])
        val_subjs = set(groups[val_idx])
        overlap = train_subjs.intersection(val_subjs)

        if len(overlap) > 0:
            leakage_detected = True
            raise AssertionError(
                f"CRITICAL DATA LEAKAGE in Fold {fold_idx}: "
                f"{len(overlap)} subjects appear in both Train and Validation sets! Leaked: {overlap}"
            )

        audit_results.append({
            "fold": fold_idx,
            "train_subject_count": len(train_subjs),
            "val_subject_count": len(val_subjs),
            "overlap_count": len(overlap),
            "leakage_free": True
        })

    return {
        "status": "PASSED_ZERO_LEAKAGE",
        "total_folds_verified": len(splits),
        "total_unique_subjects": len(set(groups)),
        "is_leakage_free": not leakage_detected,
        "fold_audits": audit_results
    }


def audit_and_export_splits(
    splits: List[Tuple[np.ndarray, np.ndarray]],
    X: np.ndarray,
    y: np.ndarray,
    groups: np.ndarray,
    out_json_path: str,
    out_csv_path: str
) -> Dict[str, Any]:
    """
    Compile comprehensive fold-level audit metrics and export summary JSON and subject-level CSV.

    Args:
        splits: List of (train_idx, val_idx)
        X: Feature matrix
        y: Binary labels (0 or 1)
        groups: Student ID array
        out_json_path: Path to write groupkfold_summary.json
        out_csv_path: Path to write groupkfold_subject_audit.csv

    Returns:
        Audit report dictionary.
    """
    # 1. Verify zero leakage first
    leakage_meta = verify_no_group_leakage(splits, groups)

    total_samples = len(y)
    unique_subjects = sorted(list(set(groups)), key=lambda x: str(x))
    total_subjects = len(unique_subjects)

    fold_summaries = []
    subject_fold_assignments = {}

    for fold_idx, (train_idx, val_idx) in enumerate(splits, start=1):
        train_y = y[train_idx]
        val_y = y[val_idx]
        train_groups = set(groups[train_idx])
        val_groups = set(groups[val_idx])

        # Record validation fold assignment for each subject
        for s in val_groups:
            subject_fold_assignments[s] = fold_idx

        # Class counts
        train_c0 = int(np.sum(train_y == 0))
        train_c1 = int(np.sum(train_y == 1))
        val_c0 = int(np.sum(val_y == 0))
        val_c1 = int(np.sum(val_y == 1))

        # Check both classes present
        assert train_c0 > 0 and train_c1 > 0, f"Fold {fold_idx} Train missing a class!"
        assert val_c0 > 0 and val_c1 > 0, f"Fold {fold_idx} Validation missing a class!"

        fold_meta = {
            "fold": fold_idx,
            "train_samples": len(train_idx),
            "val_samples": len(val_idx),
            "train_sample_pct": round((len(train_idx) / total_samples) * 100.0, 2),
            "val_sample_pct": round((len(val_idx) / total_samples) * 100.0, 2),
            "train_subjects_count": len(train_groups),
            "val_subjects_count": len(val_groups),
            "train_class_0_count": train_c0,
            "train_class_1_count": train_c1,
            "train_class_0_ratio": round(train_c0 / len(train_y), 4),
            "val_class_0_count": val_c0,
            "val_class_1_count": val_c1,
            "val_class_0_ratio": round(val_c0 / len(val_y), 4),
            "val_subjects_list": sorted(list(val_groups), key=lambda x: str(x))
        }
        fold_summaries.append(fold_meta)

    # Compile overall report
    summary_report = {
        "n_splits": len(splits),
        "total_samples": total_samples,
        "total_unique_subjects": total_subjects,
        "validation_strategy": "Subject-Independent GroupKFold (grouped by student_id)",
        "leakage_verification": leakage_meta,
        "folds": fold_summaries
    }

    # Write JSON report
    os.makedirs(os.path.dirname(out_json_path), exist_ok=True)
    with open(out_json_path, "w", encoding="utf-8") as f:
        json.dump(summary_report, f, indent=2)

    # Write Subject Audit CSV
    os.makedirs(os.path.dirname(out_csv_path), exist_ok=True)
    csv_rows = []
    for s in unique_subjects:
        mask = (groups == s)
        s_y = y[mask]
        s_c0 = int(np.sum(s_y == 0))
        s_c1 = int(np.sum(s_y == 1))
        val_fold = subject_fold_assignments.get(s, -1)

        csv_rows.append({
            "student_id": s,
            "validation_fold": val_fold,
            "total_clean_samples": len(s_y),
            "class_0_resting_samples": s_c0,
            "class_1_math_samples": s_c1,
            "class_0_proportion": round(s_c0 / max(1, len(s_y)), 3)
        })

    with open(out_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "student_id",
                "validation_fold",
                "total_clean_samples",
                "class_0_resting_samples",
                "class_1_math_samples",
                "class_0_proportion"
            ]
        )
        writer.writeheader()
        writer.writerows(csv_rows)

    return summary_report

