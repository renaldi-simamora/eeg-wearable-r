import json

with open('ml_service/reports/filtering_impact_report.json') as f:
    j = json.load(f)

print("=== VERIFIED METRICS FROM filtering_impact_report.json ===")
for feat in ['neuro_relative_delta', 'neuro_relative_theta', 'neuro_relative_alpha', 'neuro_relative_beta', 'neuro_relative_gamma']:
    s = j['relative_band_statistics'][feat]
    print(f"{feat:22s} | mean={s['mean']:.2f} | std={s['std_sample']:.2f} | median={s['median']:.2f} | min={s['min']:.2f} | max={s['max']:.2f} | IQR={s['iqr']:.2f}")

print("\n=== CLASS COUNTS ===")
print("Binary Filtered:", j['class_distribution_comparison']['binary']['filtered'])
print("Multiclass Filtered:", j['class_distribution_comparison']['multiclass']['filtered'])
print("Total Filtered:", j['technical_exclusions']['total_retained_rows'])
print("Total Excluded:", j['technical_exclusions']['total_unique_excluded'])

