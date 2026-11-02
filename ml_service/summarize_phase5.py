import json

with open('ml_service/reports/baseline_models_evaluation.json', 'r', encoding='utf-8') as f:
    eval_data = json.load(f)

with open('ml_service/reports/confusion_matrix_baseline.json', 'r', encoding='utf-8') as f:
    cm_data = json.load(f)

print("=== SUMMARY METRICS TABLE ===")
for m_id, m_val in eval_data.items():
    name = m_val['name']
    agg = m_val['aggregated_metrics']
    acc = f"{agg['accuracy']['mean']*100:.2f}% +- {agg['accuracy']['std']*100:.2f}%"
    bacc = f"{agg['balanced_accuracy']['mean']*100:.2f}% +- {agg['balanced_accuracy']['std']*100:.2f}%"
    m_prec = f"{agg['macro_precision']['mean']:.4f} +- {agg['macro_precision']['std']:.4f}"
    m_rec = f"{agg['macro_recall']['mean']:.4f} +- {agg['macro_recall']['std']:.4f}"
    m_f1 = f"{agg['macro_f1']['mean']:.4f} +- {agg['macro_f1']['std']:.4f}"
    auc = f"{agg['roc_auc']['mean']:.4f} +- {agg['roc_auc']['std']:.4f}" if agg['roc_auc']['mean'] is not None else 'N/A'
    print(f"[{name}]")
    print(f"  Accuracy:         {acc}")
    print(f"  Balanced Acc:     {bacc}")
    print(f"  Macro Precision:  {m_prec}")
    print(f"  Macro Recall:     {m_rec}")
    print(f"  Macro F1:         {m_f1}")
    print(f"  ROC-AUC:          {auc}")

print("\n=== CONFUSION MATRIX & PER-CLASS BREAKDOWN ===")
for m_id, m_val in cm_data['models'].items():
    print(f"[{m_val['name']}]")
    cm = m_val['total_confusion_matrix']
    print(f"  Total CM: TN={cm['tn']}, FP={cm['fp']}, FN={cm['fn']}, TP={cm['tp']}")
    print(f"  Class 0 (Resting) - Total: 2,582 | Predicted C0 (TN): {cm['tn']} | Misclassified as C1 (FP): {cm['fp']} | Recall: {cm['tn']/2582*100:.2f}%")
    print(f"  Class 1 (Math)    - Total: 4,857 | Predicted C1 (TP): {cm['tp']} | Misclassified as C0 (FN): {cm['fn']} | Recall: {cm['tp']/4857*100:.2f}%")
    print(f"  Note: {m_val['interpretation']}")

print("\n=== PER-FOLD METRICS BREAKDOWN ===")
for m_id, m_val in eval_data.items():
    print(f"*** {m_val['name']} ***")
    for fm in m_val['fold_metrics']:
        auc_str = f"{fm['roc_auc']:.4f}" if fm.get('roc_auc') is not None else "N/A"
        cm = fm['confusion_matrix']
        print(f"  Fold {fm['fold']} (N_val={fm['val_samples']}, Subj={fm['val_subjects_count']}): Acc={fm['accuracy']*100:.2f}%, BAcc={fm['balanced_accuracy']*100:.2f}%, F1={fm['macro_f1']:.4f}, AUC={auc_str}, CM=[[{cm['tn']}, {cm['fp']}], [{cm['fn']}, {cm['tp']}]]")
