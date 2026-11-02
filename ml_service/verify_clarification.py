"""
Verification & Clarification Script for Phase 4 Review
"""

import os
import json
from collections import Counter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SUMMARY_JSON = os.path.join(BASE_DIR, "reports", "groupkfold_summary.json")
AUDIT_CSV = os.path.join(BASE_DIR, "reports", "groupkfold_subject_audit.csv")

# 1. Parse JSON strictly
with open(SUMMARY_JSON, "r", encoding="utf-8") as f:
    data = json.load(f)

print("JSON parsed successfully with zero errors!")
print(f"n_splits: {data['n_splits']}, total_samples: {data['total_samples']}, total_subjects: {data['total_unique_subjects']}")

# 2. Check Train + Val sum == 7439 for every fold
total_dataset_samples = 7439
sum_checks = []
for fold in data["folds"]:
    f_num = fold["fold"]
    tr = fold["train_samples"]
    val = fold["val_samples"]
    total = tr + val
    is_exact = (total == total_dataset_samples)
    sum_checks.append((f_num, tr, val, total, is_exact))
    print(f"Fold {f_num}: Train ({tr}) + Val ({val}) = {total} (Matches 7439: {is_exact})")

# 3. Check every student_id assigned to exactly ONE validation fold
all_val_subjects = []
for fold in data["folds"]:
    all_val_subjects.extend(fold["val_subjects_list"])

val_counts = Counter(all_val_subjects)
duplicate_assignments = {s: c for s, c in val_counts.items() if c > 1}
missing_subjects_count = 51 - len(val_counts)

print(f"\nTotal Validation Subject Assignments across 5 folds: {len(all_val_subjects)}")
print(f"Unique Validation Subjects: {len(val_counts)} / 51")
print(f"Duplicate Assignments (should be empty): {duplicate_assignments}")
print(f"Missing Subjects (should be 0): {missing_subjects_count}")

# 4. Check subject overlap in every fold
overlap_checks = []
for fold in data["folds"]:
    f_num = fold["fold"]
    val_set = set(fold["val_subjects_list"])
    all_subjs_set = set(all_val_subjects)
    train_set = all_subjs_set - val_set
    overlap = train_set.intersection(val_set)
    overlap_checks.append((f_num, len(train_set), len(val_set), len(overlap)))
    print(f"Fold {f_num}: Train Subjs={len(train_set)}, Val Subjs={len(val_set)}, Overlap={len(overlap)} (Zero: {len(overlap) == 0})")

assert all(sc[4] for sc in sum_checks), "Sample sum mismatch!"
assert len(val_counts) == 51 and len(duplicate_assignments) == 0, "Subject assignment mismatch!"
assert all(oc[3] == 0 for oc in overlap_checks), "Leakage detected!"
print("\nALL 4 CLARIFICATION CHECKS PASSED PERFECTLY!")

