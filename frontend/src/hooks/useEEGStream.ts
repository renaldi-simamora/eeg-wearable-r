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

export interface EEGStreamState {
  status: EEGSessionStatus;
  samples: EEGSample[];
  bands: BrainwaveFeature;
  signalQuality: number | null;
  sessionSeconds: number;
  isStreaming: boolean;
  isSimulation: boolean;
  connectionMode: "websocket" | "client_simulation" | "disconnected";
  errorMessage: string | null;
  startAcquisition: () => Promise<void>;
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

const DEFAULT_BANDS: BrainwaveFeature = {
  delta: 16.5,
  theta: 22.1,
  alpha: 38.4,
  beta: 16.8,
  gamma: 6.2,
};

const ZERO_BANDS: BrainwaveFeature = {
  delta: 0,
  theta: 0,
  alpha: 0,
  beta: 0,
  gamma: 0,
};

export function useEEGStream(autoStart: boolean = false): EEGStreamState {
  const [status, setStatus] = useState<EEGSessionStatus>(autoStart ? "ACQUIRING" : "READY");
  const [samples, setSamples] = useState<EEGSample[]>([]);
  const [bands, setBands] = useState<BrainwaveFeature>(autoStart ? DEFAULT_BANDS : ZERO_BANDS);
  const [signalQuality, setSignalQuality] = useState<number | null>(autoStart ? 94 : null);
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [connectionMode, setConnectionMode] = useState<"websocket" | "client_simulation" | "disconnected">("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);
  const secondTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeRef = useRef<number>(0);

  // Simulation tick logic (50 Hz rate = every ~60ms)
  const tickSimulation = useCallback(() => {
    timeRef.current += 0.05;
    const t = timeRef.current;

    // Superposition: Alpha (10 Hz) + Theta (6 Hz) + Delta (2 Hz) + micro-noise
    const alphaW = 20 * Math.sin(2 * Math.PI * 10 * t);
    const thetaW = 12 * Math.sin(2 * Math.PI * 6 * t);
    const deltaW = 7 * Math.sin(2 * Math.PI * 2 * t);
    const noise = (Math.random() - 0.5) * 5;
    const rawVal = Math.round((alphaW + thetaW + deltaW + noise) * 100) / 100;

    const sq = 92 + Math.floor(Math.random() * 6);

    setSamples((prev) => {
      const nextSample: EEGSample = {
        timestamp: Date.now(),
        rawEEG: rawVal,
        signalQuality: sq,
      };
      const updated = [...prev, nextSample];
      if (updated.length > BUFFER_MAX) {
        return updated.slice(updated.length - BUFFER_MAX);
      }
      return updated;
    });

    setSignalQuality(sq);

    // Dynamic band oscillation
    setBands({
      delta: Math.round((16.0 + Math.sin(t * 0.4) * 3) * 10) / 10,
      theta: Math.round((22.0 + Math.cos(t * 0.5) * 3) * 10) / 10,
      alpha: Math.round((38.0 + Math.sin(t * 0.7) * 4) * 10) / 10,
      beta: Math.round((17.0 + Math.cos(t * 0.8) * 2.5) * 10) / 10,
      gamma: Math.round((6.0 + Math.sin(t * 1.2) * 1.5) * 10) / 10,
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
          if (simTimerRef.current) clearInterval(simTimerRef.current);
        };

        ws.onmessage = (event) => {
          try {
            const packet = JSON.parse(event.data);
            if (packet.type === "eeg_sample") {
              setSamples((prev) => {
                const next: EEGSample = {
                  timestamp: packet.timestamp,
                  rawEEG: packet.rawEEG,
                  signalQuality: packet.signalQuality,
                };
                const updated = [...prev, next];
                return updated.length > BUFFER_MAX
                  ? updated.slice(updated.length - BUFFER_MAX)
                  : updated;
              });
              setSignalQuality(packet.signalQuality);
              setBands({
                delta: Math.round(packet.delta * 10) / 10,
                theta: Math.round(packet.theta * 10) / 10,
                alpha: Math.round(packet.alpha * 10) / 10,
                beta: Math.round(packet.beta * 10) / 10,
                gamma: Math.round(packet.gamma * 10) / 10,
              });
            }
          } catch {}
        };

        ws.onerror = () => {
          setConnectionMode("client_simulation");
        };

        ws.onclose = () => {
          setConnectionMode("client_simulation");
        };
      } catch {
        setConnectionMode("client_simulation");
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
  const startAcquisition = useCallback(async () => {
    setErrorMessage(null);
    setStatus("STARTING");
    // Short handshake transition before stream begins
    await new Promise((r) => setTimeout(r, 200));
    setStatus("ACQUIRING");
  }, []);

  const pauseAcquisition = useCallback(() => {
    if (status === "ACQUIRING") {
      setStatus("PAUSED");
    }
  }, [status]);

  const resumeAcquisition = useCallback(() => {
    if (status === "PAUSED") {
      setStatus("ACQUIRING");
    }
  }, [status]);

  const stopAcquisition = useCallback(async () => {
    setStatus("STOPPING");
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
    isSimulation: true, // Explicitly tagged as Demo / Simulation
    connectionMode,
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
