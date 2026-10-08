"use client";

import React from "react";
import { BrainwaveFeature } from "@/types";
import { Badge } from "@/components/ui/badge";

export interface DominantBandResult {
  name: "Delta" | "Theta" | "Alpha" | "Beta" | "Gamma";
  value: number;
  percentage: number;
}

export function calculateDominantBand(features?: BrainwaveFeature | null): DominantBandResult | null {
  if (!features) return null;

  const bands: { name: "Delta" | "Theta" | "Alpha" | "Beta" | "Gamma"; value: number }[] = [
    { name: "Delta", value: features.delta },
    { name: "Theta", value: features.theta },
    { name: "Alpha", value: features.alpha },
    { name: "Beta", value: features.beta },
    { name: "Gamma", value: features.gamma },
  ];

  let maxBand = bands[0];
  let total = 0;
  let hasPositive = false;

  for (const b of bands) {
    if (typeof b.value === "number" && !isNaN(b.value) && b.value > 0) {
      hasPositive = true;
      total += b.value;
      if (b.value > maxBand.value) {
        maxBand = b;
      }
    }
  }

  if (!hasPositive || maxBand.value <= 0 || total <= 0) {
    return null;
  }

  const percentage = Math.round((maxBand.value / total) * 100);
  return {
    name: maxBand.name,
    value: maxBand.value,
    percentage,
  };
}

interface FrequencyBandsChartProps {
  features?: BrainwaveFeature;
  className?: string;
  isSimulation?: boolean;
}

export function FrequencyBandsChart({
  features,
  className = "",
  isSimulation = true,
}: FrequencyBandsChartProps) {
  const currentFeatures: BrainwaveFeature = features || {
    delta: 0,
    theta: 0,
    alpha: 0,
    beta: 0,
    gamma: 0,
  };

  const bands = [
    {
      name: "Delta" as const,
      range: "0.5 – 4 Hz",
      value: currentFeatures.delta,
      color: "bg-blue-500",
      textColor: "text-blue-400",
      description: "Deep restorative sleep / slow wave oscillations",
    },
    {
      name: "Theta" as const,
      range: "4 – 8 Hz",
      value: currentFeatures.theta,
      color: "bg-cyan-400",
      textColor: "text-cyan-400",
      description: "Drowsiness, meditation, memory consolidation",
    },
    {
      name: "Alpha" as const,
      range: "8 – 13 Hz",
      value: currentFeatures.alpha,
      color: "bg-emerald-400",
      textColor: "text-emerald-400",
      description: "Calm wakefulness, resting posterior rhythm",
    },
    {
      name: "Beta" as const,
      range: "13 – 30 Hz",
      value: currentFeatures.beta,
      color: "bg-amber-400",
      textColor: "text-amber-400",
      description: "Active thinking, sensory analysis, alertness",
    },
    {
      name: "Gamma" as const,
      range: "30 – 50 Hz",
      value: currentFeatures.gamma,
      color: "bg-purple-400",
      textColor: "text-purple-400",
      description: "Cross-cortical network feature binding",
    },
  ];

  // Calculate sum for relative proportion
  const hasValues = bands.some((b) => typeof b.value === "number" && !isNaN(b.value) && b.value > 0);
  const total = bands.reduce((acc, b) => acc + (typeof b.value === "number" && !isNaN(b.value) ? b.value : 0), 0) || 100;
  const dominant = hasValues ? calculateDominantBand(currentFeatures) : null;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase font-mono">
            Spectral Band Power Distribution
          </span>
          <p className="text-[11px] text-slate-400">
            Relative spectral power density across standard neurological sub-bands
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dominant ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-400">Dominant:</span>
              <strong className="text-white">{dominant.name}</strong>
              <span className="text-cyan-400">({dominant.value.toFixed(1)}%)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
              Dominant: N/A
            </span>
          )}

          <Badge variant={hasValues ? (isSimulation ? "simulation" : "success") : "neutral"} size="sm">
            {hasValues ? (isSimulation ? "Demo Data" : "Live Hardware") : "Standby"}
          </Badge>
        </div>
      </div>

      {!hasValues && (
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          <span>Standby • Spectral powers will calculate once EEG acquisition starts.</span>
        </div>
      )}

      {/* Progress Bars */}
      <div className="space-y-3">
        {bands.map((b) => {
          const val = typeof b.value === "number" && !isNaN(b.value) ? b.value : 0;
          const percentage = hasValues ? Math.round((val / total) * 100) : 0;
          const isDominantBand = dominant?.name === b.name;

          return (
            <div
              key={b.name}
              className={`space-y-1 p-1.5 rounded-lg transition-colors ${
                isDominantBand ? "bg-slate-900/60 border border-slate-800/90" : ""
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${isDominantBand ? "text-white" : "text-slate-300"} w-14`}>
                    {b.name}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    ({b.range})
                  </span>
                  {isDominantBand && (
                    <span className="text-[9px] font-mono uppercase bg-slate-800 text-cyan-300 px-1 py-0.2 rounded border border-slate-700">
                      Dominant
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-xs font-medium text-slate-200">
                    {hasValues ? `${val.toFixed(1)}%` : "— %"}
                  </span>
                  <span className="text-[10px] text-slate-400 w-8 text-right">
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
