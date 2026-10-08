"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { EEGSample, BrainwaveFeature } from "@/types";
import { config } from "@/config";

export type EEGSessionStatus =
  | "READY"
  | "STARTING"
  | "ACQUIRING"
  | "PAUSED"
  | "STOPPING"
  | "COMPLETED"
  | "ERROR";

export interface SimProfile {
  name: string;
  dominantBand: "Delta" | "Theta" | "Alpha" | "Beta" | "Gamma";
  baseDelta: number;
  baseTheta: number;
  baseAlpha: number;
  baseBeta: number;
  baseGamma: number;
  waveFreq: number; // Hz
}

export const SIM_PROFILES: SimProfile[] = [
  {
    name: "Active Cognitive Focus (Beta Dominant)",
    dominantBand: "Beta",
    baseDelta: 11.0,
    baseTheta: 15.0,
    baseAlpha: 21.0,
    baseBeta: 39.0, // Beta ~39%
    baseGamma: 14.0,
    waveFreq: 20.0,
  },
  {
    name: "Relaxed Alertness (Alpha Dominant)",
    dominantBand: "Alpha",
    baseDelta: 13.0,
    baseTheta: 17.0,
    baseAlpha: 43.0, // Alpha ~43%
    baseBeta: 19.0,
    baseGamma: 8.0,
    waveFreq: 10.0,
  },
  {
    name: "Drowsy / Meditative State (Theta Dominant)",
    dominantBand: "Theta",
    baseDelta: 22.0,
    baseTheta: 42.0, // Theta ~42%
    baseAlpha: 19.0,
    baseBeta: 12.0,
    baseGamma: 5.0,
    waveFreq: 6.0,
  },
  {
    name: "Deep Restful State (Delta Dominant)",
    dominantBand: "Delta",
    baseDelta: 44.0, // Delta ~44%
    baseTheta: 24.0,
    baseAlpha: 15.0,
    baseBeta: 11.0,
    baseGamma: 6.0,
    waveFreq: 2.5,
  },
  {
    name: "High Cognitive Workload (Gamma/Beta Elevated)",
    dominantBand: "Gamma",
    baseDelta: 9.0,
    baseTheta: 13.0,
    baseAlpha: 18.0,
    baseBeta: 29.0,
    baseGamma: 31.0, // Gamma ~31%
    waveFreq: 36.0,
  },
];

export function getSessionProfile(sessionId?: string | null): SimProfile {
  if (!sessionId) {
    return SIM_PROFILES[0];
  }
  let hash = 2166136261;
  for (let i = 0; i < sessionId.length; i++) {
    hash ^= sessionId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const idx = Math.abs(hash) % SIM_PROFILES.length;
  return SIM_PROFILES[idx];
}

export interface EEGStreamState {
  status: EEGSessionStatus;
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
  startAcquisition: (sessionId?: string) => Promise<void>;
  pauseAcquisition: () => void;
  resumeAcquisition: () => void;
  stopAcquisition: () => Promise<void>;
  resetToReady: () => void;
  // Backwards compatibility aliases
  startStream: () => void;
  pauseStream: () => void;
  clearBuffer: () => void;
}

const BUFFER_MAX = 70;

export const ZERO_BANDS: BrainwaveFeature = {
  delta: 0,
  theta: 0,
  alpha: 0,
  beta: 0,
  gamma: 0,
};

export function useEEGStream(autoStart: boolean = false, initialSessionId?: string): EEGStreamState {
  const [status, setStatus] = useState<EEGSessionStatus>(autoStart ? "ACQUIRING" : "READY");
  const [samples, setSamples] = useState<EEGSample[]>([]);
  const [bands, setBands] = useState<BrainwaveFeature>(ZERO_BANDS);
  const [signalQuality, setSignalQuality] = useState<number | null>(autoStart ? 94 : null);
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [connectionMode, setConnectionMode] = useState<"websocket" | "client_simulation" | "disconnected">("disconnected");
  const [isSimulation, setIsSimulation] = useState<boolean>(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId || null);
  const [activeProfile, setActiveProfile] = useState<SimProfile | null>(
    initialSessionId ? getSessionProfile(initialSessionId) : null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);
  const secondTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeRef = useRef<number>(0);
  const activeSessionIdRef = useRef<string | null>(initialSessionId || null);
  const profileRef = useRef<SimProfile>(getSessionProfile(initialSessionId));

  // Simulation generator: dynamic oscillation per session profile with 100% relative power normalization
  const tickSimulation = useCallback(() => {
    timeRef.current += 0.05;
    const t = timeRef.current;
    const profile = profileRef.current;

    // Independent biological oscillations for each sub-band around profile baselines
    const d = Math.max(1.0, profile.baseDelta + 4.0 * Math.sin(t * 0.35 + 0.5) + (Math.random() * 2.0 - 1.0));
    const th = Math.max(1.0, profile.baseTheta + 4.0 * Math.sin(t * 0.45 + 1.2) + (Math.random() * 2.0 - 1.0));
    const a = Math.max(1.0, profile.baseAlpha + 5.0 * Math.sin(t * 0.55 + 2.1) + (Math.random() * 2.5 - 1.25));
    const b = Math.max(1.0, profile.baseBeta + 4.5 * Math.sin(t * 0.65 + 3.4) + (Math.random() * 2.0 - 1.0));
    const g = Math.max(1.0, profile.baseGamma + 3.0 * Math.sin(t * 0.85 + 4.3) + (Math.random() * 1.5 - 0.75));

    // Relative percentage normalization (sum to 100%)
    const sum = d + th + a + b + g;
    const relDelta = Math.round((d / sum) * 1000) / 10;
    const relTheta = Math.round((th / sum) * 1000) / 10;
    const relAlpha = Math.round((a / sum) * 1000) / 10;
    const relBeta = Math.round((b / sum) * 1000) / 10;
    const relGamma = Math.round((g / sum) * 1000) / 10;

    // Realistic raw EEG voltage waveform trace reflecting the profile's principal oscillation
    const signal =
      22.0 * Math.sin(2 * Math.PI * profile.waveFreq * t) +
      10.0 * Math.sin(2 * Math.PI * (profile.waveFreq * 0.5) * t) +
      5.0 * Math.sin(2 * Math.PI * 2.0 * t) +
      (Math.random() * 3.0 - 1.5);
    const rawVal = Math.round(signal * 100) / 100;
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
    setBands({
      delta: relDelta,
      theta: relTheta,
      alpha: relAlpha,
      beta: relBeta,
      gamma: relGamma,
    });
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
            ws?.send(
              JSON.stringify({
                action: "start",
                sessionId: activeSessionIdRef.current || undefined,
                isSimulation: true,
              })
            );
          } catch {}
        };

        ws.onmessage = (event) => {
          try {
            const packet = JSON.parse(event.data);
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

              setSamples((prev) => {
                const next: EEGSample = {
                  timestamp: packet.timestamp || Date.now(),
                  rawEEG: packet.rawEEG,
                  signalQuality: packet.signalQuality ?? 95,
                };
                const updated = [...prev, next];
                return updated.length > BUFFER_MAX ? updated.slice(updated.length - BUFFER_MAX) : updated;
              });

              setSignalQuality(packet.signalQuality ?? 95);
              setBands({
                delta: Math.round(packet.delta * 10) / 10,
                theta: Math.round(packet.theta * 10) / 10,
                alpha: Math.round(packet.alpha * 10) / 10,
                beta: Math.round(packet.beta * 10) / 10,
                gamma: Math.round(packet.gamma * 10) / 10,
              });
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
      simTimerRef.current = setInterval(tickSimulation, 60);

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
  }, [status, tickSimulation]);

  // Actions
  const startAcquisition = useCallback(async (sessionId?: string) => {
    setErrorMessage(null);
    setStatus("STARTING");

    if (sessionId) {
      activeSessionIdRef.current = sessionId;
      setActiveSessionId(sessionId);
      const prof = getSessionProfile(sessionId);
      profileRef.current = prof;
      setActiveProfile(prof);
    }

    timeRef.current = 0;
    setSamples([]);
    setBands(ZERO_BANDS);
    setSessionSeconds(0);

    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            action: "start",
            sessionId: activeSessionIdRef.current || undefined,
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
    setSamples([]);
    setBands(ZERO_BANDS);
    setSignalQuality(null);
    setSessionSeconds(0);
    setConnectionMode("disconnected");
    setActiveSessionId(null);
    setActiveProfile(null);
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
    startStream,
    pauseStream,
    clearBuffer,
  };
}
