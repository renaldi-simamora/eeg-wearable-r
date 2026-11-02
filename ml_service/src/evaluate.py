"""
Evaluation Metrics Module
Project: Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak

Computes:
- Accuracy
- Balanced Accuracy
- Macro Precision, Recall, F1-Score
- Class 0 and Class 1 specific Precision, Recall, F1-Score
- ROC-AUC
- Confusion Matrix (TN, FP, FN, TP)
"""

from typing import Dict, Any, Union
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix
)


def compute_fold_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_score: Union[np.ndarray, None] = None
) -> Dict[str, Any]:
    """
    Compute comprehensive classification metrics for a single fold.

    Args:
        y_true: Ground truth binary labels (0 or 1)
        y_pred: Predicted binary labels (0 or 1)
        y_score: Probabilities or decision function values for Class 1 (optional)

    Returns:
        Dictionary of computed metric values.
    """
    acc = float(accuracy_score(y_true, y_pred))
    bacc = float(balanced_accuracy_score(y_true, y_pred))
    macro_prec = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
    macro_rec = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
    macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))

    # Per-class metrics
    prec_c0 = float(precision_score(y_true, y_pred, pos_label=0, zero_division=0))
    rec_c0 = float(recall_score(y_true, y_pred, pos_label=0, zero_division=0))
    f1_c0 = float(f1_score(y_true, y_pred, pos_label=0, zero_division=0))

    prec_c1 = float(precision_score(y_true, y_pred, pos_label=1, zero_division=0))
    rec_c1 = float(recall_score(y_true, y_pred, pos_label=1, zero_division=0))
    f1_c1 = float(f1_score(y_true, y_pred, pos_label=1, zero_division=0))

    # Confusion Matrix: [[TN, FP], [FN, TP]]
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

    roc_auc = None
    if y_score is not None:
        try:
            roc_auc = float(roc_auc_score(y_true, y_score))
        except Exception:
            roc_auc = None

    return {
        "accuracy": round(acc, 4),
        "balanced_accuracy": round(bacc, 4),
        "macro_precision": round(macro_prec, 4),
        "macro_recall": round(macro_rec, 4),
        "macro_f1": round(macro_f1, 4),
        "class_0_precision": round(prec_c0, 4),
        "class_0_recall": round(rec_c0, 4),
        "class_0_f1": round(f1_c0, 4),
        "class_1_precision": round(prec_c1, 4),
        "class_1_recall": round(rec_c1, 4),
        "class_1_f1": round(f1_c1, 4),
        "roc_auc": round(roc_auc, 4) if roc_auc is not None else None,
        "confusion_matrix": {
            "tn": tn,
            "fp": fp,
            "fn": fn,
            "tp": tp,
            "matrix": cm.tolist()
        }
    }


def aggregate_cv_metrics(fold_results: list) -> Dict[str, Any]:
    """
    Aggregate cross-validation results across folds into mean and standard deviation.

    Args:
        fold_results: List of metric dictionaries from each fold.

    Returns:
        Aggregated summary dictionary.
    """
    metric_keys = [
        "accuracy", "balanced_accuracy", "macro_precision", "macro_recall", "macro_f1",
        "class_0_precision", "class_0_recall", "class_0_f1",
        "class_1_precision", "class_1_recall", "class_1_f1"
    ]

    agg = {}
    for key in metric_keys:
        vals = [r[key] for r in fold_results if r.get(key) is not None]
        if vals:
            agg[key] = {
                "mean": round(float(np.mean(vals)), 4),
                "std": round(float(np.std(vals, ddof=1)), 4),
                "min": round(float(np.min(vals)), 4),
                "max": round(float(np.max(vals)), 4)
            }

    # Aggregate ROC-AUC
    auc_vals = [r["roc_auc"] for r in fold_results if r.get("roc_auc") is not None]
    if auc_vals:
        agg["roc_auc"] = {
            "mean": round(float(np.mean(auc_vals)), 4),
            "std": round(float(np.std(auc_vals, ddof=1)), 4),
            "min": round(float(np.min(auc_vals)), 4),
            "max": round(float(np.max(auc_vals)), 4)
        }
    else:
        agg["roc_auc"] = None

    # Total aggregated confusion matrix
    total_cm = np.zeros((2, 2), dtype=int)
    for r in fold_results:
        total_cm += np.array(r["confusion_matrix"]["matrix"])

    agg["total_confusion_matrix"] = {
        "tn": int(total_cm[0, 0]),
        "fp": int(total_cm[0, 1]),
        "fn": int(total_cm[1, 0]),
        "tp": int(total_cm[1, 1]),
        "matrix": total_cm.tolist()
    }

    return agg

