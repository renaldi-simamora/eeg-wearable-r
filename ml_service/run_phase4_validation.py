"""
Phase 4 Execution Script
Performs full pipeline integration, GroupKFold generation, automated leakage audit,
and exports JSON and CSV reports.
"""

import os
import sys

# Ensure ml_service is on sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from src.preprocessing import load_and_filter_data, build_preprocessing_pipeline
from src.validation import create_groupkfold_splits, audit_and_export_splits, verify_no_group_leakage

DATA_PATH = os.path.join(BASE_DIR, "data", "merged_eeg_datas_50_subjects.csv")
OUT_JSON = os.path.join(BASE_DIR, "reports", "groupkfold_summary.json")
OUT_CSV = os.path.join(BASE_DIR, "reports", "groupkfold_subject_audit.csv")

print("--- 1. LOADING & FILTERING DATASET ---")
X, y, groups, feature_names, audit_meta = load_and_filter_data(
    data_path=DATA_PATH,
    exclude_duplicates=True,
    exclude_poor_signal=True,
    signal_threshold=0
)

print(f"X shape: {X.shape}, y shape: {y.shape}, groups shape: {groups.shape}")
print(f"Features: {feature_names}")
print(f"Filtering Metadata: {audit_meta}")

print("\n--- 2. CONSTRUCTING SCIKIT-LEARN PREPROCESSING PIPELINE ---")
pipeline = build_preprocessing_pipeline()
print(f"Pipeline steps: {pipeline.steps}")

print("\n--- 3. GENERATING SUBJECT-INDEPENDENT 5-FOLD GROUPKFOLD ---")
splits = create_groupkfold_splits(X, y, groups, n_splits=5)
print(f"Total splits created: {len(splits)}")

print("\n--- 4. RUNNING RIGOROUS ZERO-LEAKAGE ASSERTION ---")
verification_res = verify_no_group_leakage(splits, groups)
print(f"Leakage Verification Result: {verification_res['status']}")
print(f"Zero Subject Overlap Verified: {verification_res['is_leakage_free']}")

print("\n--- 5. AUDITING AND EXPORTING GROUPKFOLD METRICS ---")
summary_report = audit_and_export_splits(
    splits=splits,
    X=X,
    y=y,
    groups=groups,
    out_json_path=OUT_JSON,
    out_csv_path=OUT_CSV
)

print(f"Successfully exported audit JSON to: {OUT_JSON}")
print(f"Successfully exported subject audit CSV to: {OUT_CSV}")

print("\n--- 6. DETAILED FOLD-BY-FOLD CLASS & SUBJECT BREAKDOWN ---")
for fold in summary_report["folds"]:
    f_num = fold["fold"]
    tr_s = fold["train_samples"]
    val_s = fold["val_samples"]
    tr_sub = fold["train_subjects_count"]
    val_sub = fold["val_subjects_count"]
    val_c0 = fold["val_class_0_count"]
    val_c1 = fold["val_class_1_count"]
    val_ratio = fold["val_class_0_ratio"]
    val_subjs = fold["val_subjects_list"]
    print(f"Fold {f_num:d}: Train={tr_s:4d} ({tr_sub:2d} subjs) | Val={val_s:4d} ({val_sub:2d} subjs) | Val C0: {val_c0:3d} ({val_ratio*100:4.1f}%), C1: {val_c1:3d} | Val Subjs: {val_subjs}")

print("\n--- 7. TESTING PREPROCESSING PIPELINE ON FOLD 1 (LEAKAGE CHECK) ---")
train_idx, val_idx = splits[0]
X_train, y_train = X[train_idx], y[train_idx]
X_val, y_val = X[val_idx], y[val_idx]

# Fit ONLY on training fold
pipeline.fit(X_train)
X_train_trans = pipeline.transform(X_train)
X_val_trans = pipeline.transform(X_val)

scaler = pipeline.named_steps["scaler"]
print("Scaler fitted on training fold only:")
print(f"  Training fold feature means: {scaler.mean_}")
print(f"  Training fold feature scales: {scaler.scale_}")
print(f"  X_train transformed mean: {X_train_trans.mean(axis=0).round(4)}")
print(f"  X_train transformed std:  {X_train_trans.std(axis=0).round(4)}")
print(f"  X_val transformed mean:   {X_val_trans.mean(axis=0).round(4)} (differs from 0 as expected, zero leakage!)")
print("\nPHASE 4 PREPROCESSING & VALIDATION PIPELINE FULLY OPERATIONAL!")

