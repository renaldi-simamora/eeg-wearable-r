"use client";

import React, { useRef, useEffect } from "react";
import { EEGSample } from "@/types";

interface WaveformChartProps {
  samples: EEGSample[];
  height?: number;
  isStreaming?: boolean;
  status?: string;
  emptyStateMessage?: string;
  emptyStateSubtext?: string;
  className?: string;
  voltageRange?: number; // e.g. 50 uV (+- 50uV)
}

export function WaveformChart({
  samples,
  height = 240,
  isStreaming = false,
  status = "ACQUIRING",
  emptyStateMessage = "Ready to start EEG acquisition",
  emptyStateSubtext = "Press Start Session to begin recording.",
  className = "",
  voltageRange = 50,
}: WaveformChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const h = rect.height;

    // Background: Technical dark slate background
    ctx.fillStyle = "#090e1c";
    ctx.fillRect(0, 0, width, h);

    // Draw grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(51, 65, 85, 0.4)"; // slate-700
    ctx.fillStyle = "rgba(148, 163, 184, 0.5)"; // slate-400
    ctx.font = "10px monospace";

    // Horizontal grid lines
    const gridLines = [-40, -20, 0, 20, 40];
    const centerY = h / 2;
    const scaleY = (h / 2 - 16) / voltageRange;

    gridLines.forEach((volt) => {
      const y = centerY - volt * scaleY;
      ctx.beginPath();
      ctx.setLineDash(volt === 0 ? [] : [4, 4]);
      ctx.moveTo(40, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Label
      ctx.fillText(`${volt > 0 ? "+" : ""}${volt} µV`, 6, y + 3);
    });

    ctx.setLineDash([]); // Reset line dash

    // Vertical time lines
    const stepX = width / 8;
    for (let x = 40 + stepX; x < width; x += stepX) {
      ctx.beginPath();
      ctx.setLineDash([2, 4]);
      ctx.moveTo(x, 10);
      ctx.lineTo(x, h - 10);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    if (samples.length < 2) return;

    // Plot waveform
    const plotStartX = 45;
    const plotWidth = width - plotStartX - 10;
    const step = plotWidth / (samples.length - 1);

    // Draw core signal line
    ctx.beginPath();
    ctx.strokeStyle = "#38bdf8"; // Technical cyan
    ctx.lineWidth = 1.75;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    samples.forEach((sample, i) => {
      const x = plotStartX + i * step;
      const clampedVal = Math.max(-voltageRange, Math.min(voltageRange, sample.rawEEG));
      const y = centerY - clampedVal * scaleY;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw active lead point
    if (samples.length > 0) {
      const lastIndex = samples.length - 1;
      const lastX = plotStartX + lastIndex * step;
      const lastClamped = Math.max(-voltageRange, Math.min(voltageRange, samples[lastIndex].rawEEG));
      const lastY = centerY - lastClamped * scaleY;

      ctx.beginPath();
      ctx.fillStyle = "#38bdf8";
      ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [samples, height, voltageRange]);

  const isReady = status === "READY" || (samples.length < 2 && !isStreaming);
  const isPaused = status === "PAUSED";
  const isCompleted = status === "COMPLETED";

  return (
    <div className={`relative rounded-xl overflow-hidden border border-slate-800 bg-[#090e1c] ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px` }}
        className="block"
      />

      {/* Standby / Ready Overlay */}
      {isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 p-6 text-center select-none pointer-events-none">
          <div className="w-9 h-9 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 mb-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">
            {emptyStateMessage}
          </span>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {emptyStateSubtext}
          </p>
        </div>
      )}

      {/* Paused Overlay Banner */}
      {isPaused && (
        <div className="absolute top-2.5 right-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-950/60 border border-amber-800/60 text-[10px] font-mono text-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>PAUSED • STREAM FROZEN</span>
        </div>
      )}

      {/* Completed Overlay Banner */}
      {isCompleted && (
        <div className="absolute top-2.5 right-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-[10px] font-mono text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>SESSION COMPLETED</span>
        </div>
      )}

      {/* Real-time scanning indicator */}
      {isStreaming && (
        <div className="absolute top-2.5 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>LIVE • 50 Hz</span>
        </div>
      )}
    </div>
  );
}
