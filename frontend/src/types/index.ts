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
  signalQuality: number;
  firmwareVersion: string;
  lastSeen: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SessionStatus = "running" | "completed" | "cancelled";

export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  startedAt: string;
  endedAt: string | null;
  duration: number; // in seconds
  status: SessionStatus;
  createdAt?: string;
  deviceName?: string;
  deviceCode?: string;
  signalQuality?: number;
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
  alpha: number; // 8 - 13 Hz
  beta: number;  // 13 - 30 Hz
  gamma: number; // 30 - 50 Hz
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
}
