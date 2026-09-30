import { ModelCardInfo } from "@/types";

export const mockModelCards: ModelCardInfo[] = [
  {
    id: "svm",
    name: "Support Vector Machine (SVM)",
    definition:
      "Supervised pattern classifier using Radial Basis Function (RBF) kernel mapping band-power spectral features (Delta, Theta, Alpha, Beta, Gamma) into high-dimensional hyperplane separations.",
    status: "Not connected",
    metrics: {
      accuracy: null,
      precision: null,
      recall: null,
      macroF1: null,
    },
    futureNote: "Evaluation data will be populated after the ML pipeline is connected.",
  },
  {
    id: "rf",
    name: "Random Forest Classifier",
    definition:
      "Ensemble learning architecture operating by constructing hundreds of decorrelated decision trees, aggregating votes to classify complex non-linear brainwave signatures with high resistance to overfitting.",
    status: "Not connected",
    metrics: {
      accuracy: null,
      precision: null,
      recall: null,
      macroF1: null,
    },
    futureNote: "Evaluation data will be populated after the ML pipeline is connected.",
  },
  {
    id: "xgboost",
    name: "XGBoost (Extreme Gradient Boosting)",
    definition:
      "High-performance gradient boosting framework optimizing sequential residual shrinkage, designed for high classification accuracy on multidimensional tabular biosignal metrics.",
    status: "Not connected",
    metrics: {
      accuracy: null,
      precision: null,
      recall: null,
      macroF1: null,
    },
    futureNote: "Evaluation data will be populated after the ML pipeline is connected.",
  },
];
