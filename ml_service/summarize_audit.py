import json

with open('ml_service/docs/dataset_audit_metrics.json', 'r', encoding='utf-8') as f:
    m = json.load(f)

print('=== 1. MISSING VALUES PER COLUMN ===')
has_missing = False
for k, v in m['missing_values_per_column'].items():
    if v > 0:
        print(f'{k}: {v}')
        has_missing = True
if not has_missing:
    print('Zero missing values across all 23 columns (100% complete).')

print('\n=== 2. POOR SIGNAL STRENGTH DISTRIBUTION ===')
poor_dist = m['poor_signal_strength_distribution']
for k in sorted(poor_dist.keys(), key=lambda x: int(x) if x.isdigit() else 999):
    cnt = poor_dist[k]
    print(f'poor_signal_strength = {k:3s}: {cnt:4d} rows ({cnt/8249*100:5.2f}%)')

print('\n=== 3. DOMINANT RHYTHM DISTRIBUTION ===')
for k, v in m['dominant_rhythm_distribution'].items():
    print(f'{k:10s}: {v:4d} rows ({v/8249*100:5.2f}%)')

print('\n=== 4. SUMMARY OF RELATIVE BANDS ===')
for b in ['neuro_relative_delta', 'neuro_relative_theta', 'neuro_relative_alpha', 'neuro_relative_beta', 'neuro_relative_gamma']:
    s = m['feature_statistics'][b]
    print(f"{b:22s} | mean: {s['mean']:5.2f}% | std: {s['std']:5.2f}% | min: {s['min']:5.2f}% | median: {s['median']:5.2f}% | max: {s['max']:5.2f}%")

print('\n=== 5. SUMMARY OF ASIC RAW POWERS (ThinkGear 24-bit ASIC) ===')
for b in ['neuro_delta', 'neuro_theta', 'neuro_loAlpha', 'neuro_hiAlpha', 'neuro_loBeta', 'neuro_hiBeta', 'neuro_loGamma', 'neuro_midGamma']:
    s = m['feature_statistics'][b]
    print(f"{b:16s} | mean: {s['mean']:11.1f} | min: {s['min']:8.1f} | max: {s['max']:11.1f}")

print('\n=== 6. STUDENT TASK COVERAGE & RECORDING LENGTH ===')
incomplete = []
total_seconds_list = []
for s_id, s_data in m['subjects_detail'].items():
    total_seconds_list.append(s_data['total_seconds'])
    if len(s_data['tasks_present']) < 3:
        incomplete.append((s_id, s_data['tasks_present'], s_data['total_seconds'], s_data['task_breakdown']))

print(f"Total Subjects: {len(m['subjects_detail'])}")
print(f"Subjects with complete 3 tasks: {len(m['subjects_detail']) - len(incomplete)}")
print(f"Subjects with incomplete tasks: {len(incomplete)}")
for inc in incomplete:
    print(f"  Subject {inc[0]}: Tasks {inc[1]} (Total: {inc[2]}s) -> {inc[3]}")

print(f"\nDuration per subject: Min = {min(total_seconds_list)}s, Median = {sorted(total_seconds_list)[len(total_seconds_list)//2]}s, Max = {max(total_seconds_list)}s")

