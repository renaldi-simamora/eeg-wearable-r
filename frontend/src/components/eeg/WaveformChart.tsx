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

    // Background: Clean ivory-white clinical canvas
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, h);

    // Draw grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillStyle = "rgba(120, 113, 108, 0.75)"; // stone-500
    ctx.font = "10px monospace";

    // Horizontal grid lines
    const gridLines = [-40, -20, 0, 20, 40];
    const centerY = h / 2;
    const scaleY = (h / 2 - 16) / voltageRange;

    gridLines.forEach((volt) => {
      const y = centerY - volt * scaleY;
      ctx.beginPath();
      ctx.setLineDash(volt === 0 ? [] : [4, 4]);
      ctx.strokeStyle = volt === 0 ? "rgba(0, 0, 0, 0.12)" : "rgba(0, 0, 0, 0.05)";
      ctx.moveTo(42, y);
      ctx.lineTo(width - 8, y);
      ctx.stroke();

      // Label
      ctx.fillText(`${volt > 0 ? "+" : ""}${volt} µV`, 6, y + 3);
    });

    ctx.setLineDash([]); // Reset line dash

    // Vertical time lines
    const stepX = width / 8;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.04)";
    for (let x = 42 + stepX; x < width; x += stepX) {
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
    const plotWidth = width - plotStartX - 12;
    const step = plotWidth / (samples.length - 1);

    // Draw core signal line
    ctx.beginPath();
    ctx.strokeStyle = "#2D7A58"; // Clinical surgical sage-emerald
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
      ctx.fillStyle = "#5B6D49";
      ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = "#EDF1E7";
      ctx.lineWidth = 1.5;
      ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [samples, height, voltageRange]);

  const isReady = status === "READY" || (samples.length < 2 && !isStreaming);
  const isPaused = status === "PAUSED";
  const isCompleted = status === "COMPLETED";

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-stone-200/80 bg-white shadow-sm ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px` }}
        className="block"
      />

      {/* Standby / Ready Overlay */}
      {isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F7F8F5]/85 backdrop-blur-[2px] p-6 text-center select-none pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49] mb-2.5">
            <svg
              className="w-5 h-5"
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
          <span className="text-sm font-semibold text-[#1C1E1A] tracking-tight">
            {emptyStateMessage}
          </span>
          <p className="text-xs text-[#5E6659] mt-1 max-w-sm">
            {emptyStateSubtext}
          </p>
        </div>
      )}

      {/* Paused Overlay Banner */}
      {isPaused && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-mono font-medium text-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>PAUSED • STREAM FROZEN</span>
        </div>
      )}

      {/* Completed Overlay Banner */}
      {isCompleted && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] text-[10px] font-mono font-medium text-[#3D4C32]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5B6D49]" />
          <span>SESSION COMPLETED</span>
        </div>
      )}

      {/* Real-time scanning indicator */}
      {isStreaming && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] text-[10px] font-mono font-medium text-[#3D4C32]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5B6D49] animate-pulse" />
          <span>LIVE • 50 Hz</span>
        </div>
      )}
    </div>
  );
}
