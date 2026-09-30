"use client";

import React from "react";
import { BrainwaveFeature } from "@/types";
import { Badge } from "@/components/ui/badge";

interface FrequencyBandsChartProps {
  features?: BrainwaveFeature;
  className?: string;
}

export function FrequencyBandsChart({
  features = {
    delta: 16.5,
    theta: 22.1,
    alpha: 38.4,
    beta: 16.8,
    gamma: 6.2,
  },
  className = "",
}: FrequencyBandsChartProps) {
  const bands = [
    {
      name: "Delta",
      range: "0.5 – 4 Hz",
      value: features.delta,
      color: "bg-blue-500",
      glowColor: "shadow-blue-500/20",
      description: "Deep restorative sleep / slow wave oscillations",
    },
    {
      name: "Theta",
      range: "4 – 8 Hz",
      value: features.theta,
      color: "bg-cyan-400",
      glowColor: "shadow-cyan-400/20",
      description: "Drowsiness, meditation, memory consolidation",
    },
    {
      name: "Alpha",
      range: "8 – 13 Hz",
      value: features.alpha,
      color: "bg-emerald-400",
      glowColor: "shadow-emerald-400/20",
      description: "Calm wakefulness, resting posterior rhythm",
    },
    {
      name: "Beta",
      range: "13 – 30 Hz",
      value: features.beta,
      color: "bg-amber-400",
      glowColor: "shadow-amber-400/20",
      description: "Active thinking, sensory analysis, alertness",
    },
    {
      name: "Gamma",
      range: "30 – 50 Hz",
      value: features.gamma,
      color: "bg-purple-400",
      glowColor: "shadow-purple-400/20",
      description: "Cross-cortical network feature binding",
    },
  ];

  // Calculate sum for relative proportion
  const total = bands.reduce((acc, b) => acc + b.value, 0) || 100;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-200 tracking-wide uppercase">
            Spectral Band Power Distribution
          </span>
          <p className="text-[11px] text-slate-500">
            FFT-derived power density across standard neurological sub-bands
          </p>
        </div>
        <Badge variant="simulation" size="sm">
          Demo data
        </Badge>
      </div>

      {/* Progress Bars */}
      <div className="space-y-3">
        {bands.map((b) => {
          const percentage = Math.round((b.value / total) * 100);
          return (
            <div key={b.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white w-14">{b.name}</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    ({b.range})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-300">
                    {b.value.toFixed(1)} µV²
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 w-8 text-right">
                    {percentage}%
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${b.color}`}
                  style={{ width: `${Math.min(100, Math.max(3, percentage))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
