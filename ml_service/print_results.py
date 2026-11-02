import json

with open('ml_service/reports/baseline_models_evaluation.json') as f:
    d = json.load(f)

for m_id, m_data in d.items():
    print(f"=== {m_data['name']} ===")
    agg = m_data['aggregated_metrics']
    print(f"Accuracy:          {agg['accuracy']['mean']:.4f} +- {agg['accuracy']['std']:.4f} (range: {agg['accuracy']['min']:.4f} - {agg['accuracy']['max']:.4f})")
    print(f"Balanced Accuracy: {agg['balanced_accuracy']['mean']:.4f} +- {agg['balanced_accuracy']['std']:.4f} (range: {agg['balanced_accuracy']['min']:.4f} - {agg['balanced_accuracy']['max']:.4f})")
    print(f"Macro Precision:   {agg['macro_precision']['mean']:.4f} +- {agg['macro_precision']['std']:.4f}")
    print(f"Macro Recall:      {agg['macro_recall']['mean']:.4f} +- {agg['macro_recall']['std']:.4f}")
    print(f"Macro F1-Score:    {agg['macro_f1']['mean']:.4f} +- {agg['macro_f1']['std']:.4f}")
    if agg.get('roc_auc') and isinstance(agg['roc_auc'], dict):
        print(f"ROC-AUC:           {agg['roc_auc']['mean']:.4f} +- {agg['roc_auc']['std']:.4f}")
    else:
        print(f"ROC-AUC:           {agg.get('roc_auc')}")
    print(f"Class 0 (Resting): Precision={agg['class_0_precision']['mean']:.4f}, Recall={agg['class_0_recall']['mean']:.4f}, F1={agg['class_0_f1']['mean']:.4f}")
    print(f"Class 1 (Math):    Precision={agg['class_1_precision']['mean']:.4f}, Recall={agg['class_1_recall']['mean']:.4f}, F1={agg['class_1_f1']['mean']:.4f}")
    cm = agg['total_confusion_matrix']
    print(f"Total Confusion Matrix (N={cm['tn']+cm['fp']+cm['fn']+cm['tp']}):")
    print(f"  [TN={cm['tn']:4d}, FP={cm['fp']:4d}]")
    print(f"  [FN={cm['fn']:4d}, TP={cm['tp']:4d}]")
    print()

