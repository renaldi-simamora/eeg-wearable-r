"""
EEG Machine Learning Model Training & Evaluation Pipeline
Academic Project: Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning

Features:
- Relative spectral band powers: Delta (0.5-4 Hz), Theta (4-8 Hz), Alpha (8-13 Hz), Beta (13-30 Hz), Gamma (30-50 Hz)
- Primary Classifier: Support Vector Machine (SVM) with RBF kernel and calibrated probability estimates
- Comparison Classifiers: Random Forest Classifier, Logistic Regression
"""

import os
import json
import numpy as np  # type: ignore
import joblib  # type: ignore
from sklearn.svm import SVC  # type: ignore
from sklearn.ensemble import RandomForestClassifier  # type: ignore
from sklearn.linear_model import LogisticRegression  # type: ignore
from sklearn.preprocessing import StandardScaler  # type: ignore
from sklearn.model_selection import cross_validate, StratifiedKFold  # type: ignore

# Fixed random seed for reproducible scientific evaluation
RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

# Physiological EEG brainwave classes based on normative spectral dominance
CLASSES = [
    "Relaxed / High Alpha",      # Class 0: Prominent alpha band (posterior resting)
    "Focused / High Beta",       # Class 1: Prominent beta band (active cognitive task)
    "Drowsy / High Theta",       # Class 2: Prominent theta band (reduced vigilance)
    "Baseline / Mixed Rhythms"   # Class 3: Equilibrated baseline rhythm
]

def generate_eeg_dataset(n_samples_per_class=250):
    """
    Generate synthetic normative feature vectors representing typical relative spectral power
    distributions observed in single-channel frontal (Fp1) EEG recordings.
    Features: [Delta, Theta, Alpha, Beta, Gamma] in percentage (%) summing to ~100%.
    """
    X = []
    y = []

    for class_idx in range(len(CLASSES)):
        for _ in range(n_samples_per_class):
            if class_idx == 0:  # Relaxed / High Alpha
                delta = np.random.normal(14.0, 3.0)
                theta = np.random.normal(18.0, 3.0)
                alpha = np.random.normal(44.0, 5.0)  # Alpha dominance
                beta  = np.random.normal(18.0, 3.0)
                gamma = np.random.normal(6.0, 1.5)
            elif class_idx == 1:  # Focused / High Beta
                delta = np.random.normal(12.0, 2.5)
                theta = np.random.normal(15.0, 2.5)
                alpha = np.random.normal(20.0, 3.5)
                beta  = np.random.normal(45.0, 5.0)  # Beta dominance
                gamma = np.random.normal(8.0, 2.0)
            elif class_idx == 2:  # Drowsy / High Theta
                delta = np.random.normal(28.0, 4.0)
                theta = np.random.normal(42.0, 5.0)  # Theta dominance
                alpha = np.random.normal(16.0, 3.0)
                beta  = np.random.normal(10.0, 2.0)
                gamma = np.random.normal(4.0, 1.0)
            else:  # Baseline / Mixed
                delta = np.random.normal(22.0, 3.5)
                theta = np.random.normal(22.0, 3.5)
                alpha = np.random.normal(24.0, 3.5)
                beta  = np.random.normal(24.0, 3.5)
                gamma = np.random.normal(8.0, 2.0)

            # Ensure non-negative and normalize to 100% relative power
            raw_vec = np.clip([delta, theta, alpha, beta, gamma], 0.1, 100.0)
            norm_vec = (raw_vec / np.sum(raw_vec)) * 100.0

            X.append(norm_vec)
            y.append(class_idx)

    return np.array(X), np.array(y)

def train_and_evaluate():
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(models_dir, exist_ok=True)

    print("Generating normative EEG spectral power dataset...")
    X, y = generate_eeg_dataset(n_samples_per_class=300)
    print(f"Total samples: {len(X)} (5 features per sample: Delta, Theta, Alpha, Beta, Gamma)")

    # Standard feature scaling
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # 1. Primary Model: Support Vector Machine (RBF kernel with calibrated probability)
    svm_model = SVC(kernel="rbf", C=1.0, gamma="scale", probability=True, random_state=RANDOM_STATE)
    
    # 2. Random Forest Classifier
    rf_model = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=RANDOM_STATE)

    # 3. Logistic Regression
    lr_model = LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)

    models = {
        "svm": ("Support Vector Machine (SVM)", svm_model),
        "rf": ("Random Forest", rf_model),
        "lr": ("Logistic Regression", lr_model),
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    scoring = ["accuracy", "precision_macro", "recall_macro", "f1_macro"]

    evaluation_results = {}

    for key, (name, model) in models.items():
        print(f"\nEvaluating {name} with 5-fold Stratified Cross-Validation...")
        cv_results = cross_validate(model, X_scaled, y, cv=cv, scoring=scoring)
        
        acc = float(np.mean(cv_results["test_accuracy"]))
        prec = float(np.mean(cv_results["test_precision_macro"]))
        rec = float(np.mean(cv_results["test_recall_macro"]))
        f1 = float(np.mean(cv_results["test_f1_macro"]))

        print(f"  Accuracy:  {acc:.4f} (+/- {np.std(cv_results['test_accuracy']):.4f})")
        print(f"  Precision: {prec:.4f}")
        print(f"  Recall:    {rec:.4f}")
        print(f"  Macro F1:  {f1:.4f}")

        # Train on entire dataset for production inference
        model.fit(X_scaled, y)
        joblib.dump(model, os.path.join(models_dir, f"{key}_model.joblib"))

        evaluation_results[key] = {
            "id": f"{key}-classifier",
            "name": name,
            "version": "v1.0.0",
            "training_dataset_version": "EEG-Normative-v1",
            "total_samples": len(X),
            "features": ["Delta", "Theta", "Alpha", "Beta", "Gamma"],
            "classes": CLASSES,
            "metrics": {
                "accuracy": round(acc, 4),
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "macroF1": round(f1, 4),
            }
        }

    # Save scaler and metadata
    joblib.dump(scaler, os.path.join(models_dir, "scaler.joblib"))
    
    with open(os.path.join(models_dir, "metadata.json"), "w") as f:
        json.dump(evaluation_results, f, indent=2)

    print("\nModels and metadata successfully saved to:", models_dir)

if __name__ == "__main__":
    train_and_evaluate()
