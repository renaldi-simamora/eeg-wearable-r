"""
Comprehensive Dataset Audit Script
Dataset: merged_eeg_datas_50_subjects.csv
Location: ml_service/data/merged_eeg_datas_50_subjects.csv
"""

import os
import csv
import json
from collections import Counter, defaultdict
import numpy as np

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "merged_eeg_datas_50_subjects.csv")
OUT_METRICS_PATH = os.path.join(os.path.dirname(__file__), "docs", "dataset_audit_metrics.json")
OUT_FLAGS_PATH = os.path.join(os.path.dirname(__file__), "reports", "row_flags.csv")

os.makedirs(os.path.join(os.path.dirname(__file__), "docs"), exist_ok=True)
os.makedirs(os.path.join(os.path.dirname(__file__), "reports"), exist_ok=True)

print("Starting deep dataset audit on:", DATA_PATH)

total_rows = 0
missing_counts = defaultdict(int)
task_id_counts = Counter()
student_id_counts = Counter()
student_tasks = defaultdict(set)
student_task_counts = defaultdict(lambda: defaultdict(int))
poor_signal_counts = Counter()
dominant_rhythm_counts = Counter()
raw_lengths_counts = Counter()
is_correct_counts = Counter()
workload_score_counts = Counter()

# Feature statistics
features_to_track = [
    "neuro_delta", "neuro_theta", "neuro_loAlpha", "neuro_hiAlpha",
    "neuro_loBeta", "neuro_hiBeta", "neuro_loGamma", "neuro_midGamma",
    "neuro_attention", "neuro_meditation", "neuro_poor_signal_strength",
    "neuro_relative_delta", "neuro_relative_theta", "neuro_relative_alpha",
    "neuro_relative_beta", "neuro_relative_gamma", "workload_score", "is_correct"
]
feat_values = {f: [] for f in features_to_track}

# Check duplicates and circularity
row_hashes = set()
duplicate_rows_count = 0
circular_match_count = 0
total_valid_relative = 0

# Flagged rows
flagged_rows = []

with open(DATA_PATH, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    fieldnames = list(reader.fieldnames or [])
    print("Columns found ({}):".format(len(fieldnames)), fieldnames)
    
    for row_idx, row in enumerate(reader):
        total_rows += 1
        
        # Check missing values (empty string or None)
        for col in fieldnames:
            val = row.get(col)
            if val is None or val.strip() == "":
                missing_counts[col] += 1
                
        task_id = row.get("task_id", "").strip()
        student_id = row.get("student_id", "").strip()
        poor_sig = row.get("neuro_poor_signal_strength", "").strip()
        dom_rhythm = row.get("neuro_dominan_rhythm", "").strip().lower()
        
        task_id_counts[task_id] += 1
        student_id_counts[student_id] += 1
        student_tasks[student_id].add(task_id)
        student_task_counts[student_id][task_id] += 1
        poor_signal_counts[poor_sig] += 1
        dominant_rhythm_counts[dom_rhythm] += 1
        
        is_corr = row.get("is_correct", "").strip()
        is_correct_counts[is_corr] += 1
        
        wl_score = row.get("workload_score", "").strip()
        workload_score_counts[wl_score] += 1
        
        # Parse numerical features for stats
        for f in features_to_track:
            try:
                v = float(row[f])
                feat_values[f].append(v)
            except (ValueError, TypeError):
                pass
                
        # Parse raw EEG array length and min/max
        raw_str = row.get("neuro_raw_eeg", "").strip()
        raw_len = 0
        raw_min = 0
        raw_max = 0
        raw_has_neg2048 = False
        if raw_str.startswith("[") and raw_str.endswith("]"):
            try:
                # fast parse without heavy json
                nums = [int(x) for x in raw_str[1:-1].split(",") if x.strip()]
                raw_len = len(nums)
                raw_lengths_counts[raw_len] += 1
                if nums:
                    raw_min = min(nums)
                    raw_max = max(nums)
                    if -2048 in nums:
                        raw_has_neg2048 = True
            except Exception as e:
                raw_lengths_counts["error"] += 1
        else:
            raw_lengths_counts["malformed"] += 1

        # Check circular labeling (argmax of relative powers vs neuro_dominan_rhythm)
        try:
            rel_d = float(row.get("neuro_relative_delta", 0))
            rel_t = float(row.get("neuro_relative_theta", 0))
            rel_a = float(row.get("neuro_relative_alpha", 0))
            rel_b = float(row.get("neuro_relative_beta", 0))
            rel_g = float(row.get("neuro_relative_gamma", 0))
            rel_dict = {
                "delta": rel_d,
                "theta": rel_t,
                "alpha": rel_a,
                "beta": rel_b,
                "gamma": rel_g
            }
            computed_dominant = max(rel_dict, key=lambda k: rel_dict[k])
            total_valid_relative += 1
            if computed_dominant == dom_rhythm:
                circular_match_count += 1
        except Exception:
            pass

        # Check exact duplicate rows (based on features + raw)
        row_signature = (
            student_id, task_id,
            row.get("neuro_delta"), row.get("neuro_theta"),
            row.get("neuro_loAlpha"), row.get("neuro_hiAlpha"),
            row.get("neuro_loBeta"), row.get("neuro_hiBeta"),
            row.get("neuro_loGamma"), row.get("neuro_midGamma"),
            raw_str[:100]  # sample of raw
        )
        is_duplicate = False
        if row_signature in row_hashes:
            duplicate_rows_count += 1
            is_duplicate = True
        else:
            row_hashes.add(row_signature)
            
        # Flagging logic
        flags = []
        if is_duplicate:
            flags.append("DUPLICATE_RECORD")
        try:
            if int(poor_sig) > 0:
                flags.append(f"POOR_SIGNAL_{poor_sig}")
        except Exception:
            flags.append("INVALID_POOR_SIGNAL")
            
        if raw_len != 512:
            flags.append(f"NON_STANDARD_RAW_LEN_{raw_len}")
            
        if raw_has_neg2048:
            flags.append("ADC_SATURATION_NEG2048")
            
        if flags:
            flagged_rows.append({
                "row_index": row_idx + 1,
                "student_id": student_id,
                "task_id": task_id,
                "poor_signal": poor_sig,
                "raw_len": raw_len,
                "flags": ";".join(flags)
            })

print(f"Total Rows: {total_rows}")
print(f"Unique Subjects (student_id): {len(student_id_counts)}")
print("Task ID distribution:", dict(task_id_counts))
print("Raw Length distribution (sample counts per second):", dict(raw_lengths_counts))
print(f"Duplicate rows identified: {duplicate_rows_count}")
print(f"Circular labeling match (argmax(relative) == neuro_dominan_rhythm): {circular_match_count}/{total_valid_relative} ({circular_match_count/total_valid_relative*100:.2f}%)")
print(f"Total Flagged Rows (poor signal, length anomaly, duplicate, saturation): {len(flagged_rows)}")

# Compute statistics per feature
feature_stats = {}
for f, vals in feat_values.items():
    if vals:
        arr = np.array(vals)
        feature_stats[f] = {
            "count": len(vals),
            "mean": float(np.mean(arr)),
            "std": float(np.std(arr)),
            "min": float(np.min(arr)),
            "p25": float(np.percentile(arr, 25)),
            "median": float(np.median(arr)),
            "p75": float(np.percentile(arr, 75)),
            "max": float(np.max(arr))
        }

# Student completion audit: check whether every subject completed all tasks
subjects_audit = {}
for s_id, t_counts in sorted(student_task_counts.items(), key=lambda x: str(x[0])):
    subjects_audit[s_id] = {
        "tasks_present": sorted(list(t_counts.keys())),
        "total_seconds": sum(t_counts.values()),
        "task_breakdown": dict(t_counts)
    }

# Save metrics JSON
audit_metrics = {
    "dataset_file": "merged_eeg_datas_50_subjects.csv",
    "total_rows": total_rows,
    "total_columns": len(fieldnames),
    "column_names": fieldnames,
    "missing_values_per_column": dict(missing_counts),
    "unique_subjects_count": len(student_id_counts),
    "task_id_distribution": dict(task_id_counts),
    "dominant_rhythm_distribution": dict(dominant_rhythm_counts),
    "poor_signal_strength_distribution": dict(poor_signal_counts),
    "raw_sample_lengths_per_second": dict(raw_lengths_counts),
    "duplicate_rows_count": duplicate_rows_count,
    "circular_labeling_tautology_rate": round(circular_match_count / max(1, total_valid_relative) * 100, 2),
    "total_flagged_rows": len(flagged_rows),
    "feature_statistics": feature_stats,
    "subjects_summary": {
        "min_seconds_per_subject": min(s["total_seconds"] for s in subjects_audit.values()),
        "max_seconds_per_subject": max(s["total_seconds"] for s in subjects_audit.values()),
        "mean_seconds_per_subject": round(float(np.mean([s["total_seconds"] for s in subjects_audit.values()])), 1)
    },
    "subjects_detail": subjects_audit
}

with open(OUT_METRICS_PATH, "w", encoding="utf-8") as f:
    json.dump(audit_metrics, f, indent=2)

print(f"Metrics saved to {OUT_METRICS_PATH}")

# Save row flags CSV
with open(OUT_FLAGS_PATH, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["row_index", "student_id", "task_id", "poor_signal", "raw_len", "flags"])
    writer.writeheader()
    writer.writerows(flagged_rows)

print(f"Row flags ({len(flagged_rows)} rows) saved to {OUT_FLAGS_PATH}")

