"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { EEGSample, BrainwaveFeature } from "@/types";
import { config } from "@/config";

export interface EEGStreamState {
  samples: EEGSample[];
  bands: BrainwaveFeature;
  signalQuality: number;
  isStreaming: boolean;
  isSimulation: boolean;
  connectionMode: "websocket" | "client_simulation" | "offline";
  startStream: () => void;
  pauseStream: () => void;
  clearBuffer: () => void;
}

const BUFFER_MAX = 70;

export function useEEGStream(autoStart: boolean = true): EEGStreamState {
  const [samples, setSamples] = useState<EEGSample[]>(() => {
    // Initial seeded baseline
    const now = Date.now();
    const arr: EEGSample[] = [];
    for (let i = 0; i < 40; i++) {
      const t = i * 0.05;
      const v = 18 * Math.sin(2 * Math.PI * 10 * t) + 10 * Math.sin(2 * Math.PI * 6 * t);
      arr.push({
        timestamp: now - (40 - i) * 50,
        rawEEG: Math.round(v * 100) / 100,
        signalQuality: 94,
      });
    }
    return arr;
  });

  const [bands, setBands] = useState<BrainwaveFeature>({
    delta: 16.5,
    theta: 22.1,
    alpha: 38.4,
    beta: 16.8,
    gamma: 6.2,
  });

  const [signalQuality, setSignalQuality] = useState<number>(94);
  const [isStreaming, setIsStreaming] = useState<boolean>(autoStart);
  const [connectionMode, setConnectionMode] = useState<"websocket" | "client_simulation" | "offline">("client_simulation");

  const socketRef = useRef<WebSocket | null>(null);
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeRef = useRef<number>(0);

  // Client-side simulation step
  const tickSimulation = useCallback(() => {
    timeRef.current += 0.05;
    const t = timeRef.current;

    // Superposition: Alpha rhythm (10 Hz) + Theta (6 Hz) + Slow Delta (2 Hz) + noise
    const alphaW = 20 * Math.sin(2 * Math.PI * 10 * t);
    const thetaW = 12 * Math.sin(2 * Math.PI * 6 * t);
    const deltaW = 7 * Math.sin(2 * Math.PI * 2 * t);
    const noise = (Math.random() - 0.5) * 5;
    const rawVal = Math.round((alphaW + thetaW + deltaW + noise) * 100) / 100;

    const sq = 90 + Math.floor(Math.random() * 8);

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

    // Subtle natural shifts in spectral bands
    setBands({
      delta: Math.round((16.0 + Math.sin(t * 0.4) * 3) * 10) / 10,
      theta: Math.round((22.0 + Math.cos(t * 0.5) * 3) * 10) / 10,
      alpha: Math.round((38.0 + Math.sin(t * 0.7) * 4) * 10) / 10,
      beta: Math.round((17.0 + Math.cos(t * 0.8) * 2.5) * 10) / 10,
      gamma: Math.round((6.0 + Math.sin(t * 1.2) * 1.5) * 10) / 10,
    });
  }, []);

  // WebSocket attempt
  useEffect(() => {
    if (!isStreaming) {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

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

    // Start simulation interval (fallback or standalone)
    simTimerRef.current = setInterval(tickSimulation, 60);

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [isStreaming, tickSimulation]);

  const startStream = useCallback(() => setIsStreaming(true), []);
  const pauseStream = useCallback(() => setIsStreaming(false), []);
  const clearBuffer = useCallback(() => setSamples([]), []);

  return {
    samples,
    bands,
    signalQuality,
    isStreaming,
    isSimulation: true, // Always marked as Simulation/Demo in this development phase
    connectionMode,
    startStream,
    pauseStream,
    clearBuffer,
  };
}
