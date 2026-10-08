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
      color: "bg-emerald-400",
      text: "text-emerald-400",
      border: "border-emerald-800/60",
      bg: "bg-emerald-950/40",
      defaultLabel: "Connected",
    },
    recording: {
      color: "bg-red-400",
      text: "text-red-400",
      border: "border-red-800/60",
      bg: "bg-red-950/40",
      defaultLabel: "Recording",
    },
    demo: {
      color: "bg-cyan-400",
      text: "text-cyan-400",
      border: "border-cyan-800/60",
      bg: "bg-cyan-950/40",
      defaultLabel: "Demo Simulation",
    },
    warning: {
      color: "bg-amber-400",
      text: "text-amber-400",
      border: "border-amber-800/60",
      bg: "bg-amber-950/40",
      defaultLabel: "Warning",
    },
    disconnected: {
      color: "bg-slate-400",
      text: "text-slate-400",
      border: "border-slate-800",
      bg: "bg-slate-900/40",
      defaultLabel: "Disconnected",
    },
    idle: {
      color: "bg-slate-500",
      text: "text-slate-400",
      border: "border-slate-800",
      bg: "bg-slate-900/40",
      defaultLabel: "Idle",
    },
  };

  const config = configs[status] || configs.idle;
  const displayLabel = label || config.defaultLabel;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono leading-none select-none",
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
