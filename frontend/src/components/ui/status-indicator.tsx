import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatusIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  status: "connected" | "disconnected" | "recording" | "demo" | "warning" | "idle";
  label?: string;
  pulse?: boolean;
  size?: "sm" | "md";
}

export function StatusIndicator({
  status,
  label,
  pulse = false,
  size = "md",
  className,
  ...props
}: StatusIndicatorProps) {
  const configs = {
    connected: {
      color: "bg-emerald-500",
      text: "text-emerald-800",
      border: "border-emerald-200/90",
      bg: "bg-emerald-50",
      defaultLabel: "Connected",
    },
    recording: {
      color: "bg-rose-500",
      text: "text-rose-800",
      border: "border-rose-200/90",
      bg: "bg-rose-50",
      defaultLabel: "Recording",
    },
    demo: {
      color: "bg-[#5B6D49]",
      text: "text-[#3D4C32]",
      border: "border-[#DEE5D6]",
      bg: "bg-[#EDF1E7]",
      defaultLabel: "Demo Simulation",
    },
    warning: {
      color: "bg-amber-500",
      text: "text-amber-800",
      border: "border-amber-200/90",
      bg: "bg-amber-50",
      defaultLabel: "Warning",
    },
    disconnected: {
      color: "bg-stone-400",
      text: "text-stone-700",
      border: "border-stone-200",
      bg: "bg-stone-100",
      defaultLabel: "Disconnected",
    },
    idle: {
      color: "bg-stone-400",
      text: "text-stone-700",
      border: "border-stone-200",
      bg: "bg-stone-100",
      defaultLabel: "Idle",
    },
  };

  const config = configs[status] || configs.idle;
  const displayLabel = label || config.defaultLabel;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono leading-none select-none",
        config.bg,
        config.border,
        size === "sm" ? "text-[10px]" : "text-[11px]",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          config.color,
          pulse && "animate-pulse"
        )}
      />
      <span className={cn("font-medium tracking-wide", config.text)}>
        {displayLabel}
      </span>
    </div>
  );
}
