import json
import csv
from collections import defaultdict
import numpy as np

with open('ml_service/reports/filtering_impact_report.json') as f:
    rep = json.load(f)

print('=== FILTERING SUMMARY ===')
print('Raw rows:', rep['total_raw_rows'])
print('Exclusions:', rep['technical_exclusions'])
print('Subjects retained:', rep['subject_retention']['total_subjects_retained'], 'out of', rep['subject_retention']['total_subjects_raw'])
print('Binary distribution:', rep['class_distribution_comparison']['binary']['filtered'])

# Now let us inspect all features: ASIC bands, attention/meditation, and within-subject variations
with open('ml_service/data/merged_eeg_datas_50_subjects.csv', 'r', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

# Exclude poor signal and duplicates
seen = set()
clean_rows = []
for r in rows:
    poor = int(r['neuro_poor_signal_strength']) if r['neuro_poor_signal_strength'].isdigit() else 1
    if poor > 0:
        continue
    sig = (r['student_id'], r['task_id'], r['neuro_delta'], r['neuro_theta'], r['neuro_loAlpha'], r['neuro_hiAlpha'], r['neuro_raw_eeg'][:100])
    if sig in seen:
        continue
    seen.add(sig)
    clean_rows.append(r)

print('\nTotal Clean Rows:', len(clean_rows))

# Let's check mean of all numerical columns by task_id ('1', '2', '3')
tasks = ['1', '2', '3']
cols = [
    'neuro_delta', 'neuro_theta', 'neuro_loAlpha', 'neuro_hiAlpha',
    'neuro_loBeta', 'neuro_hiBeta', 'neuro_loGamma', 'neuro_midGamma',
    'neuro_attention', 'neuro_meditation',
    'neuro_relative_delta', 'neuro_relative_theta', 'neuro_relative_alpha',
    'neuro_relative_beta', 'neuro_relative_gamma'
]

print('\n=== TASK 1 vs TASK 2 vs TASK 3 MEAN COMPARISON ===')
for col in cols:
    vals_t1 = [float(r[col]) for r in clean_rows if r['task_id'] == '1']
    vals_t2 = [float(r[col]) for r in clean_rows if r['task_id'] == '2']
    vals_t3 = [float(r[col]) for r in clean_rows if r['task_id'] == '3']
    print(f'{col:24s} | T1: {np.mean(vals_t1):10.2f} | T2: {np.mean(vals_t2):10.2f} | T3: {np.mean(vals_t3):10.2f}')

# Let's check within-subject paired differences:
# For each subject, does alpha drop or beta rise from Task 1 to Task 2/3?
subj_t1_alpha = defaultdict(list)
subj_t2_alpha = defaultdict(list)
subj_t3_alpha = defaultdict(list)

subj_t1_beta = defaultdict(list)
subj_t2_beta = defaultdict(list)
subj_t3_beta = defaultdict(list)

subj_t1_att = defaultdict(list)
subj_t2_att = defaultdict(list)
subj_t3_att = defaultdict(list)

for r in clean_rows:
    s = r['student_id']
    t = r['task_id']
    if t == '1':
        subj_t1_alpha[s].append(float(r['neuro_relative_alpha']))
        subj_t1_beta[s].append(float(r['neuro_relative_beta']))
        subj_t1_att[s].append(float(r['neuro_attention']))
    elif t == '2':
        subj_t2_alpha[s].append(float(r['neuro_relative_alpha']))
        subj_t2_beta[s].append(float(r['neuro_relative_beta']))
        subj_t2_att[s].append(float(r['neuro_attention']))
    elif t == '3':
        subj_t3_alpha[s].append(float(r['neuro_relative_alpha']))
        subj_t3_beta[s].append(float(r['neuro_relative_beta']))
        subj_t3_att[s].append(float(r['neuro_attention']))

common_subjs = [s for s in subj_t1_alpha if s in subj_t2_alpha and s in subj_t3_alpha]
print(f'\nCommon subjects with all tasks in clean data: {len(common_subjs)}')

alpha_drops = 0
beta_rises = 0
att_rises = 0
for s in common_subjs:
    m_t1_a = np.mean(subj_t1_alpha[s])
    m_math_a = np.mean(subj_t2_alpha[s] + subj_t3_alpha[s])
    if m_math_a < m_t1_a:
        alpha_drops += 1
        
    m_t1_b = np.mean(subj_t1_beta[s])
    m_math_b = np.mean(subj_t2_beta[s] + subj_t3_beta[s])
    if m_math_b > m_t1_b:
        beta_rises += 1

    m_t1_att = np.mean(subj_t1_att[s])
    m_math_att = np.mean(subj_t2_att[s] + subj_t3_att[s])
    if m_math_att > m_t1_att:
        att_rises += 1

print(f'Subjects where Alpha dropped in Math vs Resting: {alpha_drops}/{len(common_subjs)} ({alpha_drops/len(common_subjs)*100:.1f}%)')
print(f'Subjects where Beta rose in Math vs Resting: {beta_rises}/{len(common_subjs)} ({beta_rises/len(common_subjs)*100:.1f}%)')
print(f'Subjects where Attention rose in Math vs Resting: {att_rises}/{len(common_subjs)} ({att_rises/len(common_subjs)*100:.1f}%)')

