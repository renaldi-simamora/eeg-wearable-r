// Centralized TypeScript Type Definitions for EEG Wearable Platform

export type UserRole = "researcher" | "admin" | "engineer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institution?: string;
  createdAt: string;
  updatedAt: string;
}

export type DeviceStatus = "connected" | "disconnected" | "warning";

export interface Device {
  id: string;
  deviceCode: string;
  name: string;
  status: DeviceStatus;
  batteryLevel: number;
  signalQuality?: number | null;
  signalQualityUpdatedAt?: string | null;
  firmwareVersion: string;
  lastSeen: string;
  lastEEGStreamAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type SessionStatus = "running" | "completed" | "cancelled";

export type EEGTarget = "DELTA" | "THETA" | "ALPHA" | "BETA" | "GAMMA";

export interface EEGSession {
  sessionId: string;
  targetBand: EEGTarget;
  startedAt: string;
  endedAt?: string;
  status: "READY" | "RUNNING" | "COMPLETED" | "CANCELLED";
}

export interface EEGSessionResult {
  sessionTarget: EEGTarget;
  measuredDominantBand: EEGTarget | null;
  predictedClass: string | null;
  confidence: number | null;
}

export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  startedAt: string;
  endedAt: string | null;
  duration: number; // in seconds
  status: SessionStatus;
  targetBand?: EEGTarget;
  createdAt?: string;
  deviceName?: string;
  deviceCode?: string;
  signalQuality?: number | null;
}

export interface EEGSample {
  id?: string;
  sessionId?: string;
  timestamp: number;
  rawEEG: number;
  signalQuality: number;
}

export interface BrainwaveFeature {
  id?: string;
  sessionId?: string;
  timestamp?: number;
  delta: number; // 0.5 - 4 Hz
  theta: number; // 4 - 8 Hz
  alpha: number; // 8 - 12 Hz (Alfa)
  beta: number;  // 12 - 38 Hz (Beta)
  gamma: number; // 30 - 100 Hz (Gamma)
  createdAt?: string;
}

export interface MLPrediction {
  id?: string;
  sessionId?: string;
  timestamp: number;
  modelName: string;
  modelVersion: string;
  predictedClass: string;
  confidence: number;
  createdAt?: string;
}

export interface AIInsight {
  id: string;
  sessionId: string;
  title: string;
  summary: string;
  createdAt: string;
}

export interface DeviceHealthInfo {
  eegModuleStatus: string;
  esp32Status: string;
  wifiStatus: string;
  batteryLevel: number;
  signalQuality: number;
  lastSync: string;
}

export interface DashboardSummary {
  deviceStatus: string;
  signalQuality: string;
  signalQualityValue: number;
  totalSessions: number;
  latestSessionDuration: string;
  latestDurationSeconds: number;
  averageDuration: string;
  latestClassification: string;
  activeDevice: Device | null;
  recentSessions: Session[];
  brainwaveOverview: BrainwaveFeature;
  deviceHealth: DeviceHealthInfo;
}

export interface ModelCardInfo {
  id: string;
  name: string;
  definition: string;
  status: "Not connected" | "Connected" | "Training";
  metrics: {
    accuracy: number | null;
    precision: number | null;
    recall: number | null;
    macroF1: number | null;
  };
  futureNote: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface StreamPacket {
  type: string;
  sessionId?: string;
  targetBand?: EEGTarget;
  timestamp: number;
  rawEEG: number;
  signalQuality: number;
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
  deviceStatus: string;
  isSimulation: boolean;
  state?: string;
}

export interface EEGFeatureSpectrumInfo {
  band: string;
  symbol: string;
  frequency_range: string;
  asic_range: string;
  unit: string;
  source: string;
}

export interface ExperimentMetrics {
  accuracy: number;
  accuracy_std?: number;
  balanced_accuracy: number;
  balanced_accuracy_std?: number;
  macro_precision: number;
  macro_precision_std?: number;
  macro_recall: number;
  macro_recall_std?: number;
  macro_f1: number;
  macro_f1_std?: number;
  roc_auc?: number | null;
  roc_auc_std?: number | null;
  class_0_recall?: number;
  class_0_precision?: number;
  class_0_f1?: number;
  class_1_recall?: number;
  class_1_precision?: number;
  class_1_f1?: number;
}

export interface ConfusionMatrixData {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
  matrix: number[][];
}

export interface FoldMetricItem {
  fold: number;
  accuracy: number;
  balanced_accuracy: number;
  macro_precision: number;
  macro_recall: number;
  macro_f1: number;
  class_0_precision: number;
  class_0_recall: number;
  class_0_f1: number;
  class_1_precision: number;
  class_1_recall: number;
  class_1_f1: number;
  roc_auc?: number | null;
  train_samples: number;
  val_samples: number;
  val_subjects_count: number;
  confusion_matrix: ConfusionMatrixData;
}

export interface FeatureExperiment {
  id: string; // "E1" | "E2" | "E3" | "E4"
  name: string;
  features: string[];
  feature_columns: string[];
  feature_count: number;
  description: string;
  metrics: ExperimentMetrics;
  total_confusion_matrix: ConfusionMatrixData;
  fold_metrics?: FoldMetricItem[];
}

export interface FeatureExperimentReport {
  metadata: {
    title: string;
    dataset: {
      name: string;
      doi: string;
      license: string;
      channel: string;
      raw_total_samples: number;
      excluded_duplicates: number;
      excluded_poor_signal: number;
      clean_samples_used: number;
      total_subjects: number;
      class_0_count: number;
      class_1_count: number;
      classes: Array<{ label: number; name: string; task_id: any }>;
    };
    validation_method: {
      name: string;
      group_by: string;
      n_splits: number;
      zero_leakage_verified: boolean;
    };
    model_architecture: {
      algorithm: string;
      kernel: string;
      C: number;
      gamma: string;
      class_weight: string;
      pipeline: string;
    };
    eeg_feature_spectrum_info: EEGFeatureSpectrumInfo[];
    executed_at: string;
    status: string;
  };
  experiments: FeatureExperiment[];
  conclusion: {
    best_combination_f1: {
      id: string;
      name: string;
      macro_f1: number;
      balanced_accuracy: number;
      accuracy: number;
    };
    best_combination_balanced_accuracy: {
      id: string;
      name: string;
      balanced_accuracy: number;
      macro_f1: number;
    };
    best_combination_raw_accuracy: {
      id: string;
      name: string;
      accuracy: number;
    };
    scientific_summary: string;
  };
}
