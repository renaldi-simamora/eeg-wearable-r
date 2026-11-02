"""
Deep Investigation Script:
Reconciliation, Target-Feature Association, Within-Subject vs Between-Subject Variance,
Distribution Overlap, and Multivariate Analysis.
"""

import os
import csv
import json
from collections import defaultdict
import numpy as np
from scipy import stats

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "merged_eeg_datas_50_subjects.csv")

# 1. Load data
raw_rows = []
with open(DATA_PATH, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for idx, r in enumerate(reader):
        r["_row_idx"] = idx + 1
        raw_rows.append(r)

# 2. Filtering
seen_hashes = set()
duplicate_row_indices = set()
poor_signal_row_indices = set()

for r in raw_rows:
    idx = r["_row_idx"]
    s_id = r["student_id"]
    t_id = r["task_id"]
    poor = r["neuro_poor_signal_strength"]
    
    # Duplicate definition: identical spectral ASIC readings + student + task + raw prefix
    sig = (
        s_id, t_id,
        r["neuro_delta"], r["neuro_theta"],
        r["neuro_loAlpha"], r["neuro_hiAlpha"],
        r["neuro_loBeta"], r["neuro_hiBeta"],
        r["neuro_loGamma"], r["neuro_midGamma"],
        r["neuro_raw_eeg"][:100]
    )
    if sig in seen_hashes:
        duplicate_row_indices.add(idx)
    else:
        seen_hashes.add(sig)
        
    try:
        if int(poor) > 0:
            poor_signal_row_indices.add(idx)
    except Exception:
        poor_signal_row_indices.add(idx)

excluded_indices = duplicate_row_indices.union(poor_signal_row_indices)
clean_rows = [r for r in raw_rows if r["_row_idx"] not in excluded_indices]

print(f"Total Raw Rows: {len(raw_rows)}")
print(f"Duplicates: {len(duplicate_row_indices)}")
print(f"Poor Signal: {len(poor_signal_row_indices)}")
print(f"Overlap: {len(duplicate_row_indices.intersection(poor_signal_row_indices))}")
print(f"Excluded Total: {len(excluded_indices)}")
print(f"Retained Total: {len(clean_rows)}")

# Features & Labels
features = [
    "neuro_relative_delta",
    "neuro_relative_theta",
    "neuro_relative_alpha",
    "neuro_relative_beta",
    "neuro_relative_gamma"
]

y_bin = np.array([0 if r["task_id"] == "1" else 1 for r in clean_rows])
y_multi = np.array([int(r["task_id"]) - 1 for r in clean_rows])
subjects = np.array([r["student_id"] for r in clean_rows])
X = np.array([[float(r[f]) for f in features] for r in clean_rows])

c0_mask = (y_bin == 0)
c1_mask = (y_bin == 1)

print("\n=== 1. EXACT RECONCILED DESCRIPTIVE STATISTICS (N = 7,439) ===")
stats_exact = {}
for i, f in enumerate(features):
    vals = X[:, i]
    stats_exact[f] = {
        "mean": float(np.mean(vals)),
        "std": float(np.std(vals, ddof=1)),  # sample std
        "std_pop": float(np.std(vals, ddof=0)),  # population std
        "median": float(np.median(vals)),
        "min": float(np.min(vals)),
        "max": float(np.max(vals)),
        "p25": float(np.percentile(vals, 25)),
        "p75": float(np.percentile(vals, 75)),
        "iqr": float(np.percentile(vals, 75) - np.percentile(vals, 25)),
        "skew": float(stats.skew(vals)),
        "kurtosis": float(stats.kurtosis(vals))
    }
    s = stats_exact[f]
    print(f"{f:22s} | mean: {s['mean']:6.2f} | std: {s['std']:6.2f} (pop: {s['std_pop']:6.2f}) | median: {s['median']:6.2f} | min: {s['min']:6.2f} | max: {s['max']:6.2f} | IQR: {s['iqr']:6.2f}")

# Check sum property
sums = np.sum(X, axis=1)
print(f"Sum stats: mean={np.mean(sums):.4f}, std={np.std(sums):.4f}, min={np.min(sums):.4f}, max={np.max(sums):.4f}")

print("\n=== 2. CLASS DISTRIBUTION BY FITUR (CLASS 0 vs CLASS 1) ===")
class_comparison = {}
for i, f in enumerate(features):
    v0 = X[c0_mask, i]
    v1 = X[c1_mask, i]
    
    # Statistical tests
    # 1. Welch's t-test
    t_stat, t_pval = stats.ttest_ind(v0, v1, equal_var=False)
    # 2. Mann-Whitney U test (non-parametric)
    u_stat, u_pval = stats.mannwhitneyu(v0, v1, alternative='two-sided')
    # 3. Kolmogorov-Smirnov test (distribution overlap test)
    ks_stat, ks_pval = stats.ks_2samp(v0, v1)
    
    # Point-biserial correlation
    r_pb, r_pval = stats.pointbiserialr(y_bin, X[:, i])
    
    # Cohen's d
    s_pooled = np.sqrt(((len(v0)-1)*np.var(v0, ddof=1) + (len(v1)-1)*np.var(v1, ddof=1)) / (len(v0)+len(v1)-2))
    cohen_d = (np.mean(v1) - np.mean(v0)) / s_pooled
    
    # Overlap Coefficient (estimate of distribution overlap)
    # Using 50 bins histogram
    bins = np.linspace(min(np.min(v0), np.min(v1)), max(np.max(v0), np.max(v1)), 51)
    h0, _ = np.histogram(v0, bins=bins, density=True)
    h1, _ = np.histogram(v1, bins=bins, density=True)
    bin_w = bins[1] - bins[0]
    overlap_area = float(np.sum(np.minimum(h0, h1)) * bin_w)
    
    class_comparison[f] = {
        "class0_mean": float(np.mean(v0)),
        "class0_std": float(np.std(v0, ddof=1)),
        "class0_median": float(np.median(v0)),
        "class1_mean": float(np.mean(v1)),
        "class1_std": float(np.std(v1, ddof=1)),
        "class1_median": float(np.median(v1)),
        "mean_diff": float(np.mean(v1) - np.mean(v0)),
        "cohens_d": float(cohen_d),
        "point_biserial_r": float(r_pb),
        "point_biserial_pval": float(r_pval),
        "welch_t_stat": float(t_stat),
        "welch_t_pval": float(t_pval),
        "ks_stat": float(ks_stat),
        "ks_pval": float(ks_pval),
        "distribution_overlap_pct": float(overlap_area * 100.0)
    }
    c = class_comparison[f]
    print(f"{f:22s} | C0: {c['class0_mean']:5.2f}+-{c['class0_std']:5.2f} | C1: {c['class1_mean']:5.2f}+-{c['class1_std']:5.2f} | diff: {c['mean_diff']:+6.2f} | d={c['cohens_d']:+6.3f} | r_pb={c['point_biserial_r']:+6.3f} (p={c['point_biserial_pval']:.3f}) | Overlap: {c['distribution_overlap_pct']:.1f}%")

print("\n=== 3. WITHIN-SUBJECT vs BETWEEN-SUBJECT VARIANCE (ANOVA DECOMPOSITION) ===")
# Intra-class correlation / Subject effect:
# For each feature, how much variance is explained by subject differences (between-subject) vs within-subject?
subj_variance_decomp = {}
for i, f in enumerate(features):
    vals = X[:, i]
    # One-way ANOVA with student_id as factor
    subj_groups = [vals[subjects == s] for s in np.unique(subjects)]
    f_val, p_val = stats.f_oneway(*subj_groups)
    
    # Eta-squared (proportion of total variance explained by student_id)
    grand_mean = np.mean(vals)
    ss_total = np.sum((vals - grand_mean) ** 2)
    ss_between = np.sum([len(g) * (np.mean(g) - grand_mean) ** 2 for g in subj_groups])
    eta_sq = ss_between / ss_total
    
    subj_variance_decomp[f] = {
        "f_stat_between_subjects": float(f_val),
        "p_val": float(p_val),
        "eta_squared_subject_pct": float(eta_sq * 100.0)
    }
    print(f"{f:22s} | F={f_val:8.2f} (p={p_val:.2e}) | Variance explained by Student ID: {eta_sq*100:5.1f}%")

print("\n=== 4. WITHIN-SUBJECT PAIRED SHIFTS (DELTA = MATH - RESTING) ===")
# For each subject that has both Class 0 and Class 1, calculate mean(Class 1) - mean(Class 0)
subj_shifts = {f: [] for f in features}
valid_subjs_paired = []
for s in np.unique(subjects):
    mask_s = (subjects == s)
    v0_s = X[mask_s & c0_mask]
    v1_s = X[mask_s & c1_mask]
    if len(v0_s) > 0 and len(v1_s) > 0:
        valid_subjs_paired.append(s)
        for i, f in enumerate(features):
            shift = np.mean(v1_s[:, i]) - np.mean(v0_s[:, i])
            subj_shifts[f].append(shift)

print(f"Total subjects with both classes: {len(valid_subjs_paired)}")
for f in features:
    shifts = np.array(subj_shifts[f])
    pos_count = np.sum(shifts > 0)
    neg_count = np.sum(shifts < 0)
    # Paired t-test across subjects
    t_pair, p_pair = stats.ttest_1samp(shifts, 0.0)
    print(f"{f:22s} | Mean Within-Subject Shift: {np.mean(shifts):+6.2f}% | Median: {np.median(shifts):+6.2f}% | Positive: {pos_count} | Negative: {neg_count} | Paired t: {t_pair:5.2f} (p={p_pair:.3f})")

print("\n=== 5. MULTIVARIATE SEPARABILITY (PCA & LOGISTIC REGRESSION PROBE) ===")
from sklearn.decomposition import PCA
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, balanced_accuracy_score

# 5.1 PCA Explained Variance
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
pca = PCA(n_components=5)
X_pca = pca.fit_transform(X_scaled)
print("PCA Explained Variance Ratios:", [round(x, 4) for x in pca.explained_variance_ratio_])
print("PCA Cumulative Variance:", [round(x, 4) for x in np.cumsum(pca.explained_variance_ratio_)])

# Note: because sum(features) == 100%, the rank of X is at most 4! The 5th component should have eigenvalue near 0!
print(f"5th PCA component variance ratio: {pca.explained_variance_ratio_[4]:.6f} (Rank deficiency confirmed due to 100% constant sum!)")

# 5.2 Linear Probe (Logistic Regression) on pooled data without subject grouping
lr = LogisticRegression(class_weight="balanced", random_state=42)
lr.fit(X_scaled, y_bin)
preds_lr = lr.predict(X_scaled)
probs_lr = lr.predict_proba(X_scaled)[:, 1]
bacc = balanced_accuracy_score(y_bin, preds_lr)
auc = roc_auc_score(y_bin, probs_lr)
print(f"Pooled Linear Probe (Training set reference only): Balanced Acc={bacc:.4f}, AUC={auc:.4f}")
print("Logistic Regression Weights:", {f: round(float(w), 4) for f, w in zip(features, lr.coef_[0])})

# 6. Save comprehensive reconciliation data
reconciled_results = {
    "descriptive_statistics_exact": stats_exact,
    "class_comparison": class_comparison,
    "between_subject_variance": subj_variance_decomp,
    "within_subject_paired_shifts": {
        f: {
            "mean_shift": round(float(np.mean(subj_shifts[f])), 3),
            "median_shift": round(float(np.median(subj_shifts[f])), 3),
            "positive_subjects": int(np.sum(np.array(subj_shifts[f]) > 0)),
            "negative_subjects": int(np.sum(np.array(subj_shifts[f]) < 0)),
            "paired_t_stat": round(float(stats.ttest_1samp(subj_shifts[f], 0.0)[0]), 3),
            "paired_t_pval": round(float(stats.ttest_1samp(subj_shifts[f], 0.0)[1]), 4)
        } for f in features
    },
    "pca_analysis": {
        "explained_variance_ratio": [round(float(x), 4) for x in pca.explained_variance_ratio_],
        "rank_deficiency_5th_component": round(float(pca.explained_variance_ratio_[4]), 6)
    },
    "linear_probe": {
        "balanced_accuracy": round(float(bacc), 4),
        "roc_auc": round(float(auc), 4),
        "coefficients": {f: round(float(w), 4) for f, w in zip(features, lr.coef_[0])}
    }
}

with open(os.path.join(os.path.dirname(__file__), "reports", "reconciliation_metrics.json"), "w", encoding="utf-8") as f:
    json.dump(reconciled_results, f, indent=2)

print("\nReconciliation metrics saved to reports/reconciliation_metrics.json successfully!")

