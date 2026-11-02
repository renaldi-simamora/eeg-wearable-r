"""
Phase 5 Model Comparison Execution Script
Models:
1. Dummy Classifier (Baseline)
2. Logistic Regression (Linear Comparison)
3. Support Vector Machine - Linear Kernel (SVM Linear)
4. Support Vector Machine - RBF Kernel (SVM RBF)

Cross-Validation: 5-Fold Subject-Independent GroupKFold (from Phase 4)
Dataset: 7,439 clean samples, 5 relative band power features
Preprocessing: Embedded inside Pipeline (SimpleImputer + StandardScaler) - Zero Leakage
"""

import os
import sys
import json
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler

from src.preprocessing import load_and_filter_data, BASELINE_FEATURES
from src.validation import create_groupkfold_splits, verify_no_group_leakage
from src.evaluate import compute_fold_metrics, aggregate_cv_metrics

DATA_PATH = os.path.join(BASE_DIR, "data", "merged_eeg_datas_50_subjects.csv")
OUT_JSON = os.path.join(BASE_DIR, "reports", "baseline_models_evaluation.json")

print("=== 1. LOADING PREPROCESSED CLEAN DATASET ===")
X, y, groups, feature_names, audit_meta = load_and_filter_data(
    data_path=DATA_PATH,
    exclude_duplicates=True,
    exclude_poor_signal=True,
    signal_threshold=0
)

print(f"Total clean samples: {len(y)}")
print(f"Features ({len(feature_names)}): {feature_names}")
print(f"Class 0 (Resting): {np.sum(y == 0)} ({np.mean(y == 0)*100:.2f}%)")
print(f"Class 1 (Math):    {np.sum(y == 1)} ({np.mean(y == 1)*100:.2f}%)")
print(f"Total unique subjects: {len(np.unique(groups))}")

print("\n=== 2. INITIALIZING 5-FOLD SUBJECT-INDEPENDENT GROUPKFOLD SPLITS ===")
splits = create_groupkfold_splits(X, y, groups, n_splits=5)
leakage_check = verify_no_group_leakage(splits, groups)
print(f"Subject-independent split leakage check: {leakage_check['status']}")

# Define model candidate specifications
models_spec = [
    {
        "id": "dummy_most_frequent",
        "name": "Dummy Classifier (Most Frequent)",
        "type": "Baseline",
        "clf": DummyClassifier(strategy="most_frequent")
    },
    {
        "id": "logistic_regression",
        "name": "Logistic Regression (L2 Balanced)",
        "type": "Linear Classifier",
        "clf": LogisticRegression(class_weight="balanced", random_state=42, max_iter=1000)
    },
    {
        "id": "svm_linear",
        "name": "Support Vector Machine (Linear Kernel)",
        "type": "SVM Linear",
        "clf": SVC(kernel="linear", C=1.0, class_weight="balanced", probability=True, random_state=42)
    },
    {
        "id": "svm_rbf",
        "name": "Support Vector Machine (RBF Kernel)",
        "type": "SVM RBF",
        "clf": SVC(kernel="rbf", C=1.0, gamma="scale", class_weight="balanced", probability=True, random_state=42)
    }
]

print("\n=== 3. EXECUTING 5-FOLD SUBJECT-INDEPENDENT BENCHMARK ===")
all_results = {}

for m in models_spec:
    m_id = m["id"]
    m_name = m["name"]
    print(f"\n---> Evaluating: {m_name} across 5 subject-independent folds...")
    
    fold_metrics_list = []
    
    for fold_idx, (train_idx, val_idx) in enumerate(splits, start=1):
        X_train, y_train = X[train_idx], y[train_idx]
        X_val, y_val = X[val_idx], y[val_idx]
        
        # Build scikit-learn pipeline to strictly prevent preprocessing leakage
        pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("clf", m["clf"])
        ])
        
        # Fit strictly on training fold
        pipe.fit(X_train, y_train)
        
        # Predict on out-of-subject validation fold
        y_pred = pipe.predict(X_val)
        
        # Predict probability for ROC-AUC
        y_score = None
        if hasattr(pipe, "predict_proba"):
            try:
                y_score = pipe.predict_proba(X_val)[:, 1]
            except Exception:
                pass
        elif hasattr(pipe, "decision_function"):
            try:
                y_score = pipe.decision_function(X_val)
            except Exception:
                pass
                
        # Compute metrics
        m_fold = compute_fold_metrics(y_val, y_pred, y_score)
        m_fold["fold"] = fold_idx
        m_fold["train_samples"] = len(train_idx)
        m_fold["val_samples"] = len(val_idx)
        m_fold["val_subjects_count"] = len(set(groups[val_idx]))
        
        fold_metrics_list.append(m_fold)
        print(f"  Fold {fold_idx}: Acc={m_fold['accuracy']:.4f} | BAcc={m_fold['balanced_accuracy']:.4f} | Macro F1={m_fold['macro_f1']:.4f} | AUC={m_fold['roc_auc'] if m_fold['roc_auc'] is not None else 'N/A'}")
        
    # Aggregate across 5 folds
    agg = aggregate_cv_metrics(fold_metrics_list)
    print(f"  => Mean: Acc={agg['accuracy']['mean']:.4f} +- {agg['accuracy']['std']:.4f} | BAcc={agg['balanced_accuracy']['mean']:.4f} +- {agg['balanced_accuracy']['std']:.4f} | Macro F1={agg['macro_f1']['mean']:.4f} +- {agg['macro_f1']['std']:.4f} | AUC={agg['roc_auc']['mean'] if agg['roc_auc'] is not None else 'N/A'}")
    
    all_results[m_id] = {
        "id": m_id,
        "name": m_name,
        "type": m["type"],
        "fold_metrics": fold_metrics_list,
        "aggregated_metrics": agg
    }

# Save results JSON
os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(all_results, f, indent=2)

print(f"\nAll benchmark results successfully exported to: {OUT_JSON}")

