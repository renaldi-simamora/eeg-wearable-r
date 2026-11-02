import json

with open('ml_service/reports/filtering_impact_report.json') as f:
    d = json.load(f)

print('=== CORRELATION MATRIX (PEARSON) ===')
corr = d['correlation_matrix']
features = ['neuro_relative_delta', 'neuro_relative_theta', 'neuro_relative_alpha', 'neuro_relative_beta', 'neuro_relative_gamma']
short_names = [f.replace('neuro_relative_', '') for f in features]

print(f"{'Feature':10s} " + " ".join([f"{s:>8s}" for s in short_names]))
for f1, s1 in zip(features, short_names):
    vals = [f"{corr[f1][f2]:8.3f}" for f2 in features]
    print(f"{s1:10s} " + " ".join(vals))

print('\n=== SUM INTEGRITY OF 5 RELATIVE POWERS ===')
print(d['relative_sum_integrity'])

print('\n=== THETA/BETA RATIO (TBR) EVALUATION ===')
print(json.dumps(d['theta_beta_ratio_evaluation'], indent=2))

