"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { EEGSample, BrainwaveFeature, EEGTarget } from "@/types";
import { config } from "@/config";

export type EEGSessionStatus =
  | "READY"
  | "STARTING"
  | "ACQUIRING"
  | "PAUSED"
  | "STOPPING"
  | "COMPLETED"
  | "ERROR";

export function calculateMeasuredDominantBand(bands: BrainwaveFeature): EEGTarget {
  let maxVal = -1;
  let dominant: EEGTarget = "ALPHA";
  const list: [EEGTarget, number][] = [
    ["DELTA", bands.delta ?? 0],
    ["THETA", bands.theta ?? 0],
    ["ALPHA", bands.alpha ?? 0],
    ["BETA", bands.beta ?? 0],
    ["GAMMA", bands.gamma ?? 0],
  ];
  for (const [band, val] of list) {
    if (val > maxVal) {
      maxVal = val;
      dominant = band;
    }
  }
  return dominant;
}

export interface SimProfile {
  name: string;
  dominantBand: "Delta" | "Theta" | "Alpha" | "Beta" | "Gamma";
  baseDelta: number;
  baseTheta: number;
  baseAlpha: number;
  baseBeta: number;
  baseGamma: number;
  waveFreq: number; // Hz (clinical band center)
  cyclesPerBuffer: number; // Visual cycles across 120-sample buffer
  primaryAmp: number; // µV
}

export const SIM_PROFILES: SimProfile[] = [
  {
    name: "Relaxed Alertness (Alpha Dominant)",
    dominantBand: "Alpha",
    baseDelta: 10.5,
    baseTheta: 15.0,
    baseAlpha: 48.0, // Alpha ~48% DOMINANT
    baseBeta: 18.0,
    baseGamma: 8.5,
    waveFreq: 10.0,
    cyclesPerBuffer: 17.0, // 17 smooth cycles with spindle envelope
    primaryAmp: 22.0,
  },
  {
    name: "Active Cognitive Focus (Beta Dominant)",
    dominantBand: "Beta",
    baseDelta: 9.5,
    baseTheta: 13.5,
    baseAlpha: 19.0,
    baseBeta: 45.0, // Beta ~45% DOMINANT
    baseGamma: 13.0,
    waveFreq: 22.0,
    cyclesPerBuffer: 32.0, // 32 fast desynchronized cycles
    primaryAmp: 14.0,
  },
  {
    name: "High Cognitive Workload (Gamma Dominant)",
    dominantBand: "Gamma",
    baseDelta: 8.0,
    baseTheta: 11.0,
    baseAlpha: 15.0,
    baseBeta: 26.0,
    baseGamma: 40.0, // Gamma ~40% DOMINANT
    waveFreq: 40.0,
    cyclesPerBuffer: 48.0, // 48 rapid micro-ripples
    primaryAmp: 8.5,
  },
  {
    name: "Deep Restful State (Delta Dominant)",
    dominantBand: "Delta",
    baseDelta: 52.0, // Delta ~52% DOMINANT
    baseTheta: 20.0,
    baseAlpha: 13.0,
    baseBeta: 9.5,
    baseGamma: 5.5,
    waveFreq: 2.0,
    cyclesPerBuffer: 3.2, // 3.2 large slow rolling waves
    primaryAmp: 38.0,
  },
  {
    name: "Drowsy / Meditative State (Theta Dominant)",
    dominantBand: "Theta",
    baseDelta: 17.0,
    baseTheta: 47.0, // Theta ~47% DOMINANT
    baseAlpha: 17.5,
    baseBeta: 12.0,
    baseGamma: 6.5,
    waveFreq: 6.0,
    cyclesPerBuffer: 7.5, // 7.5 rhythmic rolling waves
    primaryAmp: 26.0,
  },
];

export function getSessionProfile(sessionId?: string | null): SimProfile {
  if (!sessionId) {
    return SIM_PROFILES[0]; // Alpha as default
  }
  let hash = 2166136261;
  for (let i = 0; i < sessionId.length; i++) {
    hash ^= sessionId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const idx = Math.abs(hash) % SIM_PROFILES.length;
  return SIM_PROFILES[idx];
}

// Map target device directly to corresponding brainwave profile
export function getProfileForDevice(device?: any, sessionId?: string | null): SimProfile {
  if (device) {
    const str = (
      typeof device === "string"
        ? device
        : `${device.name || ""} ${device.deviceCode || ""} ${device.id || ""}`
    ).toLowerCase();

    if (str.includes("delta") || str.includes("004")) {
      return SIM_PROFILES.find((p) => p.dominantBand === "Delta") || SIM_PROFILES[3];
    }
    if (str.includes("theta") || str.includes("005")) {
      return SIM_PROFILES.find((p) => p.dominantBand === "Theta") || SIM_PROFILES[4];
    }
    if (str.includes("gamma") || str.includes("003")) {
      return SIM_PROFILES.find((p) => p.dominantBand === "Gamma") || SIM_PROFILES[2];
    }
    if (str.includes("beta") || str.includes("002")) {
      return SIM_PROFILES.find((p) => p.dominantBand === "Beta") || SIM_PROFILES[1];
    }
    if (str.includes("alpha") || str.includes("alfa") || str.includes("001")) {
      return SIM_PROFILES.find((p) => p.dominantBand === "Alpha") || SIM_PROFILES[0];
    }
  }

  if (sessionId) {
    const sid = sessionId.toLowerCase();
    if (sid.includes("004") || sid.includes("delta")) return SIM_PROFILES[3]; // Delta
    if (sid.includes("005") || sid.includes("theta")) return SIM_PROFILES[4]; // Theta
    if (sid.includes("003") || sid.includes("gamma")) return SIM_PROFILES[2]; // Gamma
    if (sid.includes("002") || sid.includes("beta")) return SIM_PROFILES[1]; // Beta
    if (sid.includes("001") || sid.includes("alpha") || sid.includes("alfa")) return SIM_PROFILES[0]; // Alpha
    return getSessionProfile(sessionId);
  }

  return SIM_PROFILES[0]; // default Alpha (EEG-001)
}

export function generatePhysiologicalVoltage(
  profile: SimProfile,
  index: number,
  noiseAmp: number = 1.0
): number {
  const K = profile.cyclesPerBuffer || 17.0;
  const phase = (index * 2 * Math.PI * K) / 120;

  let val = 0;
  switch (profile.dominantBand) {
    case "Delta": {
      // 0.5 - 4 Hz: High amplitude slow-wave rolling undulation
      const primary = 36.0 * Math.sin(phase);
      const secondary = 6.0 * Math.sin(phase * 0.45 + 0.8);
      val = primary + secondary;
      break;
    }
    case "Theta": {
      // 4 - 8 Hz: Rhythmic rolling theta rhythm
      const primary = 24.0 * Math.sin(phase);
      const secondary = 5.0 * Math.sin(phase * 0.5 + 1.2);
      val = primary + secondary;
      break;
    }
    case "Alpha": {
      // 8 - 12 Hz: Classic 10 Hz spindle rhythm with waxing and waning envelope
      const envelope = 18.0 + 5.0 * Math.cos((index * 2 * Math.PI * 1.5) / 120);
      const primary = envelope * Math.sin(phase);
      const harmonic = 2.0 * Math.sin(phase * 2.0 + 0.4);
      val = primary + harmonic;
      break;
    }
    case "Beta": {
      // 12 - 38 Hz: Desynchronized, fast, active low-voltage rhythm
      const primary = 12.0 * Math.sin(phase);
      const harmonic1 = 3.5 * Math.sin(phase * 0.7 + 0.9);
      const harmonic2 = 2.0 * Math.sin(phase * 1.4 + 2.1);
      val = primary + harmonic1 + harmonic2;
      break;
    }
    case "Gamma": {
      // 30 - 100 Hz: Rapid low-voltage cognitive micro-ripples
      const primary = 6.5 * Math.sin(phase);
      const ripple = 2.5 * Math.sin(phase * 1.35 + 0.4);
      val = primary + ripple;
      break;
    }
  }

  const noise = (Math.random() * 2.0 - 1.0) * noiseAmp;
  return Math.round((val + noise) * 100) / 100;
}

export function generateInitialBuffer(
  profile: SimProfile,
  count: number = 120
): EEGSample[] {
  const now = Date.now();
  const samples: EEGSample[] = [];
  for (let i = 0; i < count; i++) {
    const rawVal = generatePhysiologicalVoltage(profile, i, 0.8);
    samples.push({
      timestamp: now - (count - i) * 20,
      rawEEG: rawVal,
      signalQuality: 94 + Math.floor(Math.random() * 5),
    });
  }
  return samples;
}

export function calculateOscillatingBands(
  profile: SimProfile,
  t: number
): BrainwaveFeature {
  // Gentle biological micro-fluctuations (±1.5%) around profile baselines
  const d = Math.max(1.0, profile.baseDelta + 1.5 * Math.sin(t * 0.35 + 0.5) + (Math.random() * 1.0 - 0.5));
  const th = Math.max(1.0, profile.baseTheta + 1.5 * Math.sin(t * 0.45 + 1.2) + (Math.random() * 1.0 - 0.5));
  const a = Math.max(1.0, profile.baseAlpha + 2.0 * Math.sin(t * 0.55 + 2.1) + (Math.random() * 1.0 - 0.5));
  const b = Math.max(1.0, profile.baseBeta + 1.8 * Math.sin(t * 0.65 + 3.4) + (Math.random() * 1.0 - 0.5));
  const g = Math.max(1.0, profile.baseGamma + 1.2 * Math.sin(t * 0.85 + 4.3) + (Math.random() * 0.8 - 0.4));

  const sum = d + th + a + b + g;
  return {
    delta: Math.round((d / sum) * 1000) / 10,
    theta: Math.round((th / sum) * 1000) / 10,
    alpha: Math.round((a / sum) * 1000) / 10,
    beta: Math.round((b / sum) * 1000) / 10,
    gamma: Math.round((g / sum) * 1000) / 10,
  };
}

export interface EEGStreamState {
  status: EEGSessionStatus;
  sessionTarget: EEGTarget;
  measuredDominantBand: EEGTarget;
  samples: EEGSample[];
  bands: BrainwaveFeature;
  signalQuality: number | null;
  sessionSeconds: number;
  isStreaming: boolean;
  isSimulation: boolean;
  connectionMode: "websocket" | "client_simulation" | "disconnected";
  activeSessionId: string | null;
  activeProfile: SimProfile | null;
  errorMessage: string | null;
  startAcquisition: (sessionId?: string, dev?: any, targetBand?: EEGTarget) => Promise<void>;
  pauseAcquisition: () => void;
  resumeAcquisition: () => void;
  stopAcquisition: () => Promise<void>;
  resetToReady: () => void;
  setTargetDevice: (device: any) => void;
  setSessionTarget: (target: EEGTarget) => void;
  // Backwards compatibility aliases
  startStream: () => void;
  pauseStream: () => void;
  clearBuffer: () => void;
}

const BUFFER_MAX = 120;

export const ZERO_BANDS: BrainwaveFeature = {
  delta: 0,
  theta: 0,
  alpha: 0,
  beta: 0,
  gamma: 0,
};

export function useEEGStream(
  autoStart: boolean = false,
  initialSessionId?: string,
  initialTargetDevice?: any,
  initialTargetBand: EEGTarget = "ALPHA"
): EEGStreamState {
  const initialProf = getProfileForDevice(initialTargetDevice, initialSessionId);

  const [status, setStatus] = useState<EEGSessionStatus>(autoStart ? "ACQUIRING" : "READY");
  const [sessionTarget, setSessionTargetState] = useState<EEGTarget>(initialTargetBand);
  const sessionTargetRef = useRef<EEGTarget>(initialTargetBand);

  const [samples, setSamples] = useState<EEGSample[]>(() =>
    generateInitialBuffer(initialProf, BUFFER_MAX)
  );
  const [bands, setBands] = useState<BrainwaveFeature>(() => ({
    delta: initialProf.baseDelta,
    theta: initialProf.baseTheta,
    alpha: initialProf.baseAlpha,
    beta: initialProf.baseBeta,
    gamma: initialProf.baseGamma,
  }));
  const [signalQuality, setSignalQuality] = useState<number | null>(autoStart ? 94 : null);
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [connectionMode, setConnectionMode] = useState<"websocket" | "client_simulation" | "disconnected">("disconnected");
  const [isSimulation, setIsSimulation] = useState<boolean>(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId || null);
  const [activeProfile, setActiveProfile] = useState<SimProfile>(initialProf);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);
  const secondTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeRef = useRef<number>(0);
  const sampleCounterRef = useRef<number>(120);
  const activeSessionIdRef = useRef<string | null>(initialSessionId || null);

  // Measured dominant band derived strictly from real/incoming feature vector
  const measuredDominantBand = useMemo(() => {
    return calculateMeasuredDominantBand(bands);
  }, [bands]);

  // Target band setter: strictly disabled/immutable during running sessions
  const setSessionTarget = useCallback((target: EEGTarget) => {
    if (status === "READY" || status === "COMPLETED") {
      sessionTargetRef.current = target;
      setSessionTargetState(target);
    } else {
      console.warn(`[IMMUTABLE TARGET] Target alteration rejected: session is currently ${status}. Locked target: ${sessionTargetRef.current}`);
    }
  }, [status]);
  const targetDeviceRef = useRef<any>(initialTargetDevice || null);
  const profileRef = useRef<SimProfile>(initialProf);

  // Sync profile when initialTargetDevice prop changes
  useEffect(() => {
    if (initialTargetDevice) {
      targetDeviceRef.current = initialTargetDevice;
      const prof = getProfileForDevice(initialTargetDevice, activeSessionIdRef.current);
      profileRef.current = prof;
      setActiveProfile(prof);
      setBands({
        delta: prof.baseDelta,
        theta: prof.baseTheta,
        alpha: prof.baseAlpha,
        beta: prof.baseBeta,
        gamma: prof.baseGamma,
      });
      sampleCounterRef.current = 120;
      setSamples(generateInitialBuffer(prof, BUFFER_MAX));
    }
  }, [initialTargetDevice]);

  // Simulation generator: dynamic oscillation per session profile with 100% relative power normalization
  const tickSimulation = useCallback(() => {
    sampleCounterRef.current += 1;
    timeRef.current += 0.05;
    const t = timeRef.current;
    const profile = profileRef.current;

    const newBands = calculateOscillatingBands(profile, t);
    const rawVal = generatePhysiologicalVoltage(profile, sampleCounterRef.current, 1.2);
    const sq = 92 + Math.floor(Math.random() * 6);

    setSamples((prev) => {
      const nextSample: EEGSample = {
        timestamp: Date.now(),
        rawEEG: rawVal,
        signalQuality: sq,
      };
      const updated = [...prev, nextSample];
      return updated.length > BUFFER_MAX ? updated.slice(updated.length - BUFFER_MAX) : updated;
    });

    setSignalQuality(sq);
    setBands(newBands);
  }, []);

  // Handle stream lifecycle based on explicit status machine
  useEffect(() => {
    if (status === "ACQUIRING") {
      // 1. Start duration clock
      secondTimerRef.current = setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
      }, 1000);

      // 2. Connect transport (try WebSocket, fallback to simulation)
      let ws: WebSocket | null = null;
      try {
        ws = new WebSocket(config.wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          setConnectionMode("websocket");
          try {
            const curDev = targetDeviceRef.current;
            ws?.send(
              JSON.stringify({
                action: "start",
                sessionId: activeSessionIdRef.current || undefined,
                targetBand: sessionTargetRef.current,
                deviceId: curDev?.id,
                deviceName: curDev?.name,
                deviceCode: curDev?.deviceCode,
                isSimulation: true,
              })
            );
          } catch {}
        };

        ws.onmessage = (event) => {
          try {
            const packet = JSON.parse(event.data);
            if (packet.targetBand && typeof packet.targetBand === "string") {
              const tb = packet.targetBand.toUpperCase() as EEGTarget;
              if (["DELTA", "THETA", "ALPHA", "BETA", "GAMMA"].includes(tb)) {
                sessionTargetRef.current = tb;
                setSessionTargetState(tb);
              }
            }
            if (packet.type === "eeg_sample") {
              // Strict packet validation
              const isNumber = (n: any) => typeof n === "number" && !isNaN(n) && isFinite(n);
              if (
                !isNumber(packet.rawEEG) ||
                !isNumber(packet.delta) ||
                !isNumber(packet.theta) ||
                !isNumber(packet.alpha) ||
                !isNumber(packet.beta) ||
                !isNumber(packet.gamma) ||
                packet.delta < 0 ||
                packet.theta < 0 ||
                packet.alpha < 0 ||
                packet.beta < 0 ||
                packet.gamma < 0
              ) {
                console.warn("[EEG VALIDATION] status: INVALID reason: numeric fields out of range/NaN", packet);
                return;
              }

              // Real samples arriving from WebSocket stop the client simulation timer
              if (simTimerRef.current) {
                clearInterval(simTimerRef.current);
                simTimerRef.current = null;
              }

              if (packet.isSimulation !== undefined) {
                setIsSimulation(Boolean(packet.isSimulation));
              }

              const targetProf = profileRef.current;
              let displayRawEEG = packet.rawEEG;
              let displayBands: BrainwaveFeature = {
                delta: Math.round(packet.delta * 10) / 10,
                theta: Math.round(packet.theta * 10) / 10,
                alpha: Math.round(packet.alpha * 10) / 10,
                beta: Math.round(packet.beta * 10) / 10,
                gamma: Math.round(packet.gamma * 10) / 10,
              };

              // If simulated sample, guarantee strict alignment with active target profile
              // so any older/background server cannot corrupt dominant band or waveform
              if (packet.isSimulation || isSimulation) {
                timeRef.current += 0.05;
                sampleCounterRef.current += 1;
                displayBands = calculateOscillatingBands(targetProf, timeRef.current);
                displayRawEEG = generatePhysiologicalVoltage(targetProf, sampleCounterRef.current, 1.0);
              }

              setSamples((prev) => {
                const next: EEGSample = {
                  timestamp: packet.timestamp || Date.now(),
                  rawEEG: displayRawEEG,
                  signalQuality: packet.signalQuality ?? 95,
                };
                const updated = [...prev, next];
                return updated.length > BUFFER_MAX ? updated.slice(updated.length - BUFFER_MAX) : updated;
              });

              setSignalQuality(packet.signalQuality ?? 95);
              setBands(displayBands);
            } else if (packet.type === "session_state") {
              if (packet.isSimulation !== undefined) {
                setIsSimulation(Boolean(packet.isSimulation));
              }
            }
          } catch (err) {
            console.warn("[WebSocket] Error parsing packet:", err);
          }
        };

        ws.onerror = () => {
          setConnectionMode("client_simulation");
          setIsSimulation(true);
        };

        ws.onclose = () => {
          setConnectionMode("client_simulation");
          setIsSimulation(true);
        };
      } catch {
        setConnectionMode("client_simulation");
        setIsSimulation(true);
      }

      // Start client simulation generator (fallback or standalone demo)
      simTimerRef.current = setInterval(tickSimulation, 50);

      return () => {
        if (simTimerRef.current) clearInterval(simTimerRef.current);
        if (secondTimerRef.current) clearInterval(secondTimerRef.current);
        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
        }
      };
    } else {
      // Clean up active streams when PAUSED, READY, COMPLETED, etc.
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
        simTimerRef.current = null;
      }
      if (secondTimerRef.current) {
        clearInterval(secondTimerRef.current);
        secondTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (status === "READY") {
        setConnectionMode("disconnected");
      }
    }
  }, [status, tickSimulation, isSimulation]);

  // Actions
  const setTargetDevice = useCallback((device: any) => {
    targetDeviceRef.current = device;
    const prof = getProfileForDevice(device, activeSessionIdRef.current);
    profileRef.current = prof;
    setActiveProfile(prof);

    // Immediately update bands and waveform preview if NOT actively acquiring
    if (status !== "ACQUIRING") {
      setBands({
        delta: prof.baseDelta,
        theta: prof.baseTheta,
        alpha: prof.baseAlpha,
        beta: prof.baseBeta,
        gamma: prof.baseGamma,
      });
      sampleCounterRef.current = 120;
      setSamples(generateInitialBuffer(prof, BUFFER_MAX));
    }

    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            action: "set_device",
            deviceId: device?.id,
            deviceName: device?.name,
            deviceCode: device?.deviceCode,
          })
        );
      }
    } catch {}
  }, [status]);

  const startAcquisition = useCallback(async (sessionId?: string, dev?: any, targetBand?: EEGTarget) => {
    setErrorMessage(null);
    setStatus("STARTING");

    if (targetBand) {
      sessionTargetRef.current = targetBand;
      setSessionTargetState(targetBand);
    }

    if (dev) {
      targetDeviceRef.current = dev;
    }
    if (sessionId) {
      activeSessionIdRef.current = sessionId;
      setActiveSessionId(sessionId);
    }

    const curDev = dev || targetDeviceRef.current;
    const prof = getProfileForDevice(curDev, sessionId || activeSessionIdRef.current);
    profileRef.current = prof;
    setActiveProfile(prof);

    timeRef.current = 0;
    sampleCounterRef.current = 120;
    setSamples(generateInitialBuffer(prof, BUFFER_MAX));
    setBands({
      delta: prof.baseDelta,
      theta: prof.baseTheta,
      alpha: prof.baseAlpha,
      beta: prof.baseBeta,
      gamma: prof.baseGamma,
    });
    setSessionSeconds(0);

    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            action: "start",
            sessionId: activeSessionIdRef.current || undefined,
            targetBand: sessionTargetRef.current,
            deviceId: curDev?.id,
            deviceName: curDev?.name,
            deviceCode: curDev?.deviceCode,
            isSimulation: true,
          })
        );
      }
    } catch {}

    // Short handshake transition before stream begins
    await new Promise((r) => setTimeout(r, 200));
    setStatus("ACQUIRING");
  }, []);

  const pauseAcquisition = useCallback(() => {
    if (status === "ACQUIRING") {
      try {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ action: "pause" }));
        }
      } catch {}
      setStatus("PAUSED");
    }
  }, [status]);

  const resumeAcquisition = useCallback(() => {
    if (status === "PAUSED") {
      try {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ action: "resume" }));
        }
      } catch {}
      setStatus("ACQUIRING");
    }
  }, [status]);

  const stopAcquisition = useCallback(async () => {
    setStatus("STOPPING");
    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ action: "stop" }));
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
    setStatus("COMPLETED");
  }, []);

  const resetToReady = useCallback(() => {
    setStatus("READY");
    const prof = profileRef.current || SIM_PROFILES[0];
    sampleCounterRef.current = 120;
    setSamples(generateInitialBuffer(prof, BUFFER_MAX));
    setBands({
      delta: prof.baseDelta,
      theta: prof.baseTheta,
      alpha: prof.baseAlpha,
      beta: prof.baseBeta,
      gamma: prof.baseGamma,
    });
    setSignalQuality(null);
    setSessionSeconds(0);
    setConnectionMode("disconnected");
    setActiveSessionId(null);
    activeSessionIdRef.current = null;
    timeRef.current = 0;
    setErrorMessage(null);
  }, []);

  // Backwards compatibility wrappers
  const startStream = useCallback(() => {
    startAcquisition();
  }, [startAcquisition]);

  const pauseStream = useCallback(() => {
    pauseAcquisition();
  }, [pauseAcquisition]);

  const clearBuffer = useCallback(() => {
    setSamples([]);
  }, []);

  return {
    status,
    sessionTarget,
    measuredDominantBand,
    samples,
    bands,
    signalQuality,
    sessionSeconds,
    isStreaming: status === "ACQUIRING",
    isSimulation,
    connectionMode,
    activeSessionId,
    activeProfile,
    errorMessage,
    startAcquisition,
    pauseAcquisition,
    resumeAcquisition,
    stopAcquisition,
    resetToReady,
    setTargetDevice,
    setSessionTarget,
    startStream,
    pauseStream,
    clearBuffer,
  };
}
