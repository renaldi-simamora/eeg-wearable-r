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
      color: "bg-sky-600",
      textColor: "text-sky-700",
      description: "Deep restorative sleep / slow wave oscillations",
    },
    {
      name: "Theta" as const,
      range: "4 – 8 Hz",
      value: currentFeatures.theta,
      color: "bg-teal-600",
      textColor: "text-teal-700",
      description: "Drowsiness, meditation, memory consolidation",
    },
    {
      name: "Alpha" as const,
      range: "8 – 12 Hz",
      value: currentFeatures.alpha,
      color: "bg-[#5B6D49]",
      textColor: "text-[#3D4C32]",
      description: "Calm wakefulness, resting posterior rhythm (Alfa)",
    },
    {
      name: "Beta" as const,
      range: "12 – 38 Hz",
      value: currentFeatures.beta,
      color: "bg-amber-600",
      textColor: "text-amber-700",
      description: "Active thinking, sensory analysis, alertness",
    },
    {
      name: "Gamma" as const,
      range: "30 – 100 Hz",
      value: currentFeatures.gamma,
      color: "bg-purple-600",
      textColor: "text-purple-700",
      description: "Cross-cortical network feature binding & high cognition",
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
          <span className="text-xs font-semibold text-[#1C1E1A] tracking-wide uppercase font-mono">
            Spectral Band Power Distribution
          </span>
          <p className="text-[11px] text-[#5E6659]">
            Relative spectral power density across standard neurological sub-bands
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dominant ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] text-[11px] font-mono text-[#3D4C32]">
              <span className="text-[#5E6659]">Dominant:</span>
              <strong className="text-[#1C1E1A] font-semibold">{dominant.name}</strong>
              <span className="text-[#5B6D49]">({dominant.value.toFixed(1)}%)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-[11px] font-mono text-stone-500">
              Dominant: N/A
            </span>
          )}

          <Badge variant={hasValues ? (isSimulation ? "simulation" : "success") : "neutral"} size="sm">
            {hasValues ? (isSimulation ? "Demo Data" : "Live Hardware") : "Standby"}
          </Badge>
        </div>
      </div>

      {!hasValues && (
        <div className="p-3 rounded-2xl bg-[#FAFBF8] border border-stone-200/80 text-[11px] text-stone-500 font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-stone-400" />
          <span>Standby • Spectral powers will calculate once EEG acquisition starts.</span>
        </div>
      )}

      {/* Progress Bars */}
      <div className="space-y-2.5">
        {bands.map((b) => {
          const val = typeof b.value === "number" && !isNaN(b.value) ? b.value : 0;
          const percentage = hasValues ? Math.round((val / total) * 100) : 0;
          const isDominantBand = dominant?.name === b.name;

          return (
            <div
              key={b.name}
              className={`space-y-1.5 p-2 rounded-xl transition-colors ${
                isDominantBand ? "bg-[#EDF1E7]/60 border border-[#DEE5D6]" : "hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${isDominantBand ? "text-[#1C1E1A]" : "text-[#1C1E1A]"} w-14`}>
                    {b.name}
                  </span>
                  <span className="text-[11px] font-mono text-stone-400">
                    ({b.range})
                  </span>
                  {isDominantBand && (
                    <span className="text-[9px] font-mono uppercase bg-[#EDF1E7] text-[#3D4C32] px-2 py-0.5 rounded-full border border-[#DEE5D6] font-semibold">
                      Dominant
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-xs font-semibold text-[#1C1E1A]">
                    {hasValues ? `${val.toFixed(1)}%` : "— %"}
                  </span>
                  <span className="text-[10px] text-stone-500 w-8 text-right">
                    {hasValues ? `${percentage}%` : "0%"}
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
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
