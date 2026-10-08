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
      description: "Deep restorative sleep / slow wave oscillations",
    },
    {
      name: "Theta",
      range: "4 – 8 Hz",
      value: features.theta,
      color: "bg-cyan-400",
      description: "Drowsiness, meditation, memory consolidation",
    },
    {
      name: "Alpha",
      range: "8 – 13 Hz",
      value: features.alpha,
      color: "bg-emerald-400",
      description: "Calm wakefulness, resting posterior rhythm",
    },
    {
      name: "Beta",
      range: "13 – 30 Hz",
      value: features.beta,
      color: "bg-amber-400",
      description: "Active thinking, sensory analysis, alertness",
    },
    {
      name: "Gamma",
      range: "30 – 50 Hz",
      value: features.gamma,
      color: "bg-purple-400",
      description: "Cross-cortical network feature binding",
    },
  ];

  // Calculate sum for relative proportion
  const hasValues = bands.some((b) => b.value > 0);
  const total = bands.reduce((acc, b) => acc + b.value, 0) || 100;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase font-mono">
            Spectral Band Power Distribution
          </span>
          <p className="text-[11px] text-slate-400">
            FFT-derived power density across standard neurological sub-bands
          </p>
        </div>
        <Badge variant={hasValues ? "simulation" : "neutral"} size="sm">
          {hasValues ? "Demo data" : "Standby"}
        </Badge>
      </div>

      {!hasValues && (
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          <span>Standby • Spectral powers will calculate once acquisition begins.</span>
        </div>
      )}

      {/* Progress Bars */}
      <div className="space-y-3">
        {bands.map((b) => {
          const percentage = hasValues ? Math.round((b.value / total) * 100) : 0;
          return (
            <div key={b.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white w-14">{b.name}</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    ({b.range})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium text-slate-200">
                    {hasValues ? `${b.value.toFixed(1)} µV²` : "— µV²"}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
                    {hasValues ? `${percentage}%` : "0%"}
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${b.color}`}
                  style={{ width: `${hasValues ? Math.min(100, Math.max(3, percentage)) : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
