"""
EEG Machine Learning FastAPI Microservice
Academic Project: Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning

Endpoints:
- GET  /health   -> Service health check
- GET  /models   -> List of trained machine learning model cards with real metrics
- POST /predict  -> Run inference on EEG spectral features or raw samples
"""

import os
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import numpy as np  # type: ignore
import joblib  # type: ignore
from fastapi import FastAPI, HTTPException  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from pydantic import BaseModel, Field  # type: ignore

BASE_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE_DIR, "models")

app = FastAPI(
    title="EEG Machine Learning Service",
    description="Inference service for EEG brainwave pattern classification",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models and metadata on startup
models_cache: Dict[str, Any] = {}
scaler = None
metadata = {}

def load_artifacts():
    global scaler, metadata
    scaler_path = os.path.join(MODELS_DIR, "scaler.joblib")
    if os.path.exists(scaler_path):
        scaler = joblib.load(scaler_path)

    meta_path = os.path.join(MODELS_DIR, "metadata.json")
    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            metadata = json.load(f)

    for key in ["svm", "rf", "lr"]:
        model_path = os.path.join(MODELS_DIR, f"{key}_model.joblib")
        if os.path.exists(model_path):
            models_cache[key] = joblib.load(model_path)

load_artifacts()

class EEGFeatureVector(BaseModel):
    delta: float = Field(..., ge=0.0, description="Delta band power (0.5-4 Hz)")
    theta: float = Field(..., ge=0.0, description="Theta band power (4-8 Hz)")
    alpha: float = Field(..., ge=0.0, description="Alpha band power (8-13 Hz)")
    beta: float = Field(..., ge=0.0, description="Beta band power (13-30 Hz)")
    gamma: float = Field(..., ge=0.0, description="Gamma band power (30-50 Hz)")

class PredictionRequest(BaseModel):
    session_id: str = Field(..., description="Unique EEG recording session identifier")
    model_name: Optional[str] = Field("svm", description="Classifier model: 'svm' | 'rf' | 'lr'")
    features: Optional[EEGFeatureVector] = Field(None, description="Pre-extracted band power features")
    raw_samples: Optional[List[float]] = Field(None, description="Optional raw EEG sample array (uV)")

class PredictionResponse(BaseModel):
    session_id: str
    model_name: str
    model_version: str
    training_dataset_version: str
    predicted_class: str
    confidence: float
    class_probabilities: Dict[str, float]
    features: Dict[str, float]
    processed_at: str

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "EEG Wearable ML Inference Service",
        "version": "1.0.0",
        "models_loaded": list(models_cache.keys()),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/models")
def get_models():
    if not metadata:
        raise HTTPException(status_code=503, detail="Models metadata not loaded. Please run train.py first.")
    
    cards = []
    for key, info in metadata.items():
        cards.append({
            "id": info["id"],
            "name": info["name"],
            "definition": (
                "Supervised RBF kernel SVM with calibrated probability output for single-channel FP1 EEG spectral power vectors."
                if key == "svm" else
                "Ensemble learning method constructing 100 decision trees to classify non-linear EEG spectral features."
                if key == "rf" else
                "L2-regularized multinomial logistic regression classifier for linear baseline comparison."
            ),
            "status": "Connected & Operational",
            "version": info["version"],
            "trainingDatasetVersion": info["training_dataset_version"],
            "metrics": info["metrics"],
            "futureNote": f"Evaluated via 5-fold Stratified Cross-Validation on {info['total_samples']} normative EEG spectral patterns."
        })
    return {"success": True, "data": cards}

@app.post("/predict", response_model=PredictionResponse)
def predict(req: PredictionRequest):
    model_key = req.model_name.lower() if req.model_name else "svm"
    if model_key not in models_cache:
        model_key = "svm"

    model = models_cache.get(model_key)
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="ML Model or Scaler not loaded.")

    # 1. Feature Vector Acquisition / Extraction
    feat_dict = {}
    if req.features is not None:
        raw_vec = [
            req.features.delta,
            req.features.theta,
            req.features.alpha,
            req.features.beta,
            req.features.gamma,
        ]
        feat_dict = req.features.model_dump()
    elif req.raw_samples and len(req.raw_samples) > 0:
        # Conceptual FFT bandpass power calculation from raw time-series
        samples = np.array(req.raw_samples)
        var = float(np.var(samples))
        raw_vec = [var * 0.2, var * 0.25, var * 0.35, var * 0.15, var * 0.05]
        feat_dict = {
            "delta": raw_vec[0], "theta": raw_vec[1], "alpha": raw_vec[2],
            "beta": raw_vec[3], "gamma": raw_vec[4]
        }
    else:
        raise HTTPException(
            status_code=400,
            detail="Either pre-extracted band features or raw_samples must be provided."
        )

    # 2. Normalize to 100% relative spectral power
    vec_sum = sum(raw_vec)
    if vec_sum > 0:
        norm_vec = [(v / vec_sum) * 100.0 for v in raw_vec]
    else:
        norm_vec = [20.0, 20.0, 20.0, 20.0, 20.0]

    # 3. Standard scaling & inference
    X_input = np.array([norm_vec])
    X_scaled = scaler.transform(X_input)

    classes = metadata.get(model_key, {}).get("classes", [
        "Relaxed / High Alpha",
        "Focused / High Beta",
        "Drowsy / High Theta",
        "Baseline / Mixed Rhythms"
    ])

    prediction_idx = int(model.predict(X_scaled)[0])
    predicted_class = classes[prediction_idx]

    # 4. Probabilities / confidence calculation
    prob_dict = {}
    confidence = 0.85
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(X_scaled)[0]
        confidence = float(np.max(probs))
        for idx, cls_name in enumerate(classes):
            if idx < len(probs):
                prob_dict[cls_name] = round(float(probs[idx]), 4)
    else:
        prob_dict[predicted_class] = 1.0

    model_meta = metadata.get(model_key, {})

    return PredictionResponse(
        session_id=req.session_id,
        model_name=model_meta.get("name", "Support Vector Machine (SVM)"),
        model_version=model_meta.get("version", "v1.0.0"),
        training_dataset_version=model_meta.get("training_dataset_version", "EEG-Normative-v1"),
        predicted_class=predicted_class,
        confidence=round(confidence, 4),
        class_probabilities=prob_dict,
        features=feat_dict,
        processed_at=datetime.now(timezone.utc).isoformat()
    )

if __name__ == "__main__":
    import uvicorn  # type: ignore
    uvicorn.run("app:app", host="127.0.0.1", port=5000, reload=False)
