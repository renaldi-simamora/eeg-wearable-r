"use client";

import React, { useRef, useEffect } from "react";
import { EEGSample } from "@/types";

interface WaveformChartProps {
  samples: EEGSample[];
  height?: number;
  isStreaming?: boolean;
  className?: string;
  voltageRange?: number; // e.g. 50 uV (+- 50uV)
}

export function WaveformChart({
  samples,
  height = 240,
  isStreaming = false,
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

    // Background
    ctx.fillStyle = "#0f172a"; // Technical slate-900 background
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

    // Draw glow layer
    ctx.beginPath();
    ctx.strokeStyle = "rgba(59, 130, 246, 0.35)"; // Blue glow
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    samples.forEach((sample, i) => {
      const x = plotStartX + i * step;
      // Clamp within voltage range
      const clampedVal = Math.max(-voltageRange, Math.min(voltageRange, sample.rawEEG));
      const y = centerY - clampedVal * scaleY;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw sharp core line
    ctx.beginPath();
    ctx.strokeStyle = "#38bdf8"; // Bright cyan-blue
    ctx.lineWidth = 1.8;

    samples.forEach((sample, i) => {
      const x = plotStartX + i * step;
      const clampedVal = Math.max(-voltageRange, Math.min(voltageRange, sample.rawEEG));
      const y = centerY - clampedVal * scaleY;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw lead point
    if (samples.length > 0) {
      const lastIndex = samples.length - 1;
      const lastX = plotStartX + lastIndex * step;
      const lastClamped = Math.max(-voltageRange, Math.min(voltageRange, samples[lastIndex].rawEEG));
      const lastY = centerY - lastClamped * scaleY;

      ctx.beginPath();
      ctx.fillStyle = "#38bdf8";
      ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Outer ripple
      ctx.beginPath();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.arc(lastX, lastY, 6.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [samples, height, voltageRange]);

  return (
    <div className={`relative rounded-xl overflow-hidden border border-slate-800 shadow-inner ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px` }}
        className="block"
      />
      {/* Real-time scanning indicator */}
      {isStreaming && (
        <div className="absolute top-2.5 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-[10px] font-mono text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>LIVE • 50 Hz</span>
        </div>
      )}
    </div>
  );
}
