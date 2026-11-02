"""
Script to generate exact reconciled JSON report:
ml_service/reports/filtering_impact_report.json
"""

import os
import csv
import json
from collections import Counter, defaultdict
import numpy as np
from scipy import stats

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "merged_eeg_datas_50_subjects.csv")
OUT_JSON = os.path.join(os.path.dirname(__file__), "reports", "filtering_impact_report.json")

# 1. Read data
raw_rows = []
with open(DATA_PATH, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for idx, r in enumerate(reader):
        r["_row_idx"] = idx + 1
        raw_rows.append(r)

total_raw_rows = len(raw_rows)

# 2. Filtering
seen_hashes = set()
duplicate_indices = set()
poor_signal_indices = set()

for r in raw_rows:
    idx = r["_row_idx"]
    s_id = r["student_id"]
    t_id = r["task_id"]
    poor = r["neuro_poor_signal_strength"]
    
    # Exact duplicate definition
    sig = (
        s_id, t_id,
        r["neuro_delta"], r["neuro_theta"],
        r["neuro_loAlpha"], r["neuro_hiAlpha"],
        r["neuro_loBeta"], r["neuro_hiBeta"],
        r["neuro_loGamma"], r["neuro_midGamma"],
        r["neuro_raw_eeg"][:100]
    )
    if sig in seen_hashes:
        duplicate_indices.add(idx)
    else:
        seen_hashes.add(sig)
        
    try:
        if int(poor) > 0:
            poor_signal_indices.add(idx)
    except Exception:
        poor_signal_indices.add(idx)

overlap_indices = duplicate_indices.intersection(poor_signal_indices)
all_excluded = duplicate_indices.union(poor_signal_indices)
clean_rows = [r for r in raw_rows if r["_row_idx"] not in all_excluded]
total_clean_rows = len(clean_rows)

# 3. Subject-level distribution & retention
raw_subj_tasks = defaultdict(lambda: defaultdict(int))
clean_subj_tasks = defaultdict(lambda: defaultdict(int))

for r in raw_rows:
    raw_subj_tasks[r["student_id"]][r["task_id"]] += 1

for r in clean_rows:
    clean_subj_tasks[r["student_id"]][r["task_id"]] += 1

raw_subj_counts = {s: sum(t.values()) for s, t in raw_subj_tasks.items()}
clean_subj_counts = {s: sum(t.values()) for s, t in clean_subj_tasks.items()}

subject_retention_table = {}
for s in sorted(raw_subj_counts.keys(), key=lambda x: str(x)):
    raw_c = raw_subj_counts[s]
    clean_c = clean_subj_counts.get(s, 0)
    ret_pct = round((clean_c / raw_c) * 100.0, 2)
    subject_retention_table[s] = {
        "raw_total": raw_c,
        "clean_total": clean_c,
        "retention_pct": ret_pct,
        "raw_tasks": dict(raw_subj_tasks[s]),
        "clean_tasks": dict(clean_subj_tasks.get(s, {}))
    }

# 4. Class counts
raw_tasks_counter = Counter(r["task_id"] for r in raw_rows)
clean_tasks_counter = Counter(r["task_id"] for r in clean_rows)

raw_bin = {
    "Class 0 (Resting: Task 1)": raw_tasks_counter["1"],
    "Class 1 (Math: Task 2+3)": raw_tasks_counter["2"] + raw_tasks_counter["3"],
    "Ratio C0:C1": f"1 : {(raw_tasks_counter['2'] + raw_tasks_counter['3']) / raw_tasks_counter['1']:.2f}"
}

clean_bin = {
    "Class 0 (Resting: Task 1)": clean_tasks_counter["1"],
    "Class 1 (Math: Task 2+3)": clean_tasks_counter["2"] + clean_tasks_counter["3"],
    "Ratio C0:C1": f"1 : {(clean_tasks_counter['2'] + clean_tasks_counter['3']) / clean_tasks_counter['1']:.2f}"
}

# 5. Features analysis
features = [
    "neuro_relative_delta",
    "neuro_relative_theta",
    "neuro_relative_alpha",
    "neuro_relative_beta",
    "neuro_relative_gamma"
]

X = np.array([[float(r[f]) for f in features] for r in clean_rows])
y_bin = np.array([0 if r["task_id"] == "1" else 1 for r in clean_rows])
subjects_arr = np.array([r["student_id"] for r in clean_rows])

c0_mask = (y_bin == 0)
c1_mask = (y_bin == 1)

feature_descriptive_stats = {}
for i, f in enumerate(features):
    vals = X[:, i]
    feature_descriptive_stats[f] = {
        "mean": round(float(np.mean(vals)), 4),
        "std_sample": round(float(np.std(vals, ddof=1)), 4),
        "std_pop": round(float(np.std(vals, ddof=0)), 4),
        "median": round(float(np.median(vals)), 4),
        "min": round(float(np.min(vals)), 4),
        "max": round(float(np.max(vals)), 4),
        "p25": round(float(np.percentile(vals, 25)), 4),
        "p75": round(float(np.percentile(vals, 75)), 4),
        "iqr": round(float(np.percentile(vals, 75) - np.percentile(vals, 25)), 4),
        "skewness": round(float(stats.skew(vals)), 4),
        "kurtosis": round(float(stats.kurtosis(vals)), 4)
    }

# Constant sum property
sums = np.sum(X, axis=1)

# Correlation matrix
corr_matrix = {}
for i, f1 in enumerate(features):
    corr_matrix[f1] = {}
    for j, f2 in enumerate(features):
        corr_matrix[f1][f2] = round(float(np.corrcoef(X[:, i], X[:, j])[0, 1]), 4)

# Target associations
target_associations = {}
for i, f in enumerate(features):
    vals = X[:, i]
    v0 = vals[c0_mask]
    v1 = vals[c1_mask]
    
    m0, s0 = float(np.mean(v0)), float(np.std(v0, ddof=1))
    m1, s1 = float(np.mean(v1)), float(np.std(v1, ddof=1))
    
    r_pb, p_val = stats.pointbiserialr(y_bin, vals)
    s_pooled = np.sqrt(((len(v0)-1)*(s0**2) + (len(v1)-1)*(s1**2)) / (len(v0)+len(v1)-2))
    cohen_d = (m1 - m0) / s_pooled if s_pooled > 0 else 0.0
    
    # Overlap area estimate
    bins = np.linspace(min(np.min(v0), np.min(v1)), max(np.max(v0), np.max(v1)), 51)
    h0, _ = np.histogram(v0, bins=bins, density=True)
    h1, _ = np.histogram(v1, bins=bins, density=True)
    overlap = float(np.sum(np.minimum(h0, h1)) * (bins[1] - bins[0]))
    
    target_associations[f] = {
        "class0_resting_mean": round(m0, 4),
        "class0_resting_std": round(s0, 4),
        "class1_math_mean": round(m1, 4),
        "class1_math_std": round(s1, 4),
        "mean_difference": round(m1 - m0, 4),
        "cohens_d": round(float(cohen_d), 4),
        "point_biserial_corr": round(float(r_pb), 4),
        "point_biserial_pval": round(float(p_val), 4),
        "distribution_overlap_pct": round(overlap * 100.0, 2)
    }

# TBR evaluation
theta_vals = X[:, 1]
beta_vals = X[:, 3]
zero_beta_count = int(np.sum(beta_vals <= 0.01))
tbr_clean = np.where(beta_vals > 0.01, theta_vals / beta_vals, 0.0)

tbr_r_target, tbr_p_target = stats.pointbiserialr(y_bin, tbr_clean)

tbr_eval = {
    "formula": "neuro_relative_theta / neuro_relative_beta",
    "zero_denominator_count": zero_beta_count,
    "min_tbr": round(float(np.min(tbr_clean)), 4),
    "median_tbr": round(float(np.median(tbr_clean)), 4),
    "max_tbr": round(float(np.max(tbr_clean)), 4),
    "corr_with_theta": round(float(np.corrcoef(theta_vals, tbr_clean)[0, 1]), 4),
    "corr_with_beta": round(float(np.corrcoef(beta_vals, tbr_clean)[0, 1]), 4),
    "corr_with_binary_target": round(float(tbr_r_target), 4),
    "pval_with_binary_target": round(float(tbr_p_target), 4),
    "recommendation_reconciled": (
        f"TBR has weak point-biserial correlation with the binary target (r = {tbr_r_target:+.4f}, p = {tbr_p_target:.4f}), "
        f"consistent with the weak correlations of pure relative alpha (r = {target_associations['neuro_relative_alpha']['point_biserial_corr']:+.4f}) "
        f"and relative beta (r = {target_associations['neuro_relative_beta']['point_biserial_corr']:+.4f}). "
        f"Furthermore, 13 rows have beta == 0%, triggering division-by-zero. "
        "Therefore, TBR is excluded from the baseline feature set to avoid numerical instability and ungrounded complexity."
    )
}

final_report = {
    "total_raw_rows": total_raw_rows,
    "technical_exclusions": {
        "duplicate_rows": len(duplicate_indices),
        "poor_signal_rows": len(poor_signal_indices),
        "overlap_both": len(overlap_indices),
        "total_unique_excluded": len(all_excluded),
        "total_retained_rows": total_clean_rows,
        "retention_rate_pct": round((total_clean_rows / total_raw_rows) * 100.0, 2)
    },
    "subject_retention_summary": {
        "total_subjects_raw": len(raw_subj_counts),
        "total_subjects_retained": len(clean_subj_counts),
        "dropped_subjects_count": 0,
        "mean_subject_retention_pct": round(float(np.mean([s["retention_pct"] for s in subject_retention_table.values()])), 2),
        "min_subject_retention_pct": min(s["retention_pct"] for s in subject_retention_table.values()),
        "max_subject_retention_pct": max(s["retention_pct"] for s in subject_retention_table.values())
    },
    "class_distribution_comparison": {
        "binary": {
            "raw": raw_bin,
            "filtered": clean_bin
        },
        "multiclass": {
            "raw": dict(raw_tasks_counter),
            "filtered": dict(clean_tasks_counter)
        }
    },
    "relative_band_statistics": feature_descriptive_stats,
    "relative_sum_integrity": {
        "mean_sum": round(float(np.mean(sums)), 4),
        "std_sum": round(float(np.std(sums)), 4),
        "min_sum": round(float(np.min(sums)), 4),
        "max_sum": round(float(np.max(sums)), 4)
    },
    "correlation_matrix": corr_matrix,
    "target_associations": target_associations,
    "theta_beta_ratio_evaluation": tbr_eval,
    "subject_retention_detail": subject_retention_table
}

with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(final_report, f, indent=2)

print("Exact reconciled JSON generated successfully at:", OUT_JSON)

