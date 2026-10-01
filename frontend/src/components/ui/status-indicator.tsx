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
  pulse = true,
  size = "md",
  className,
  ...props
}: StatusIndicatorProps) {
  const configs = {
    connected: {
      color: "bg-emerald-400",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      bg: "bg-emerald-500/[0.08]",
      defaultLabel: "Connected",
    },
    recording: {
      color: "bg-red-400",
      text: "text-red-400",
      border: "border-red-500/20",
      bg: "bg-red-500/[0.08]",
      defaultLabel: "Recording",
    },
    demo: {
      color: "bg-cyan-400",
      text: "text-cyan-400",
      border: "border-cyan-500/20",
      bg: "bg-cyan-500/[0.08]",
      defaultLabel: "Demo Simulation",
    },
    warning: {
      color: "bg-amber-400",
      text: "text-amber-400",
      border: "border-amber-500/20",
      bg: "bg-amber-500/[0.08]",
      defaultLabel: "Warning",
    },
    disconnected: {
      color: "bg-slate-400",
      text: "text-slate-400",
      border: "border-white/[0.08]",
      bg: "bg-white/[0.03]",
      defaultLabel: "Disconnected",
    },
    idle: {
      color: "bg-slate-500",
      text: "text-slate-400",
      border: "border-white/[0.06]",
      bg: "bg-white/[0.02]",
      defaultLabel: "Idle",
    },
  };

  const config = configs[status] || configs.idle;
  const displayLabel = label || config.defaultLabel;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono leading-none select-none",
        config.bg,
        config.border,
        size === "sm" ? "text-[10px]" : "text-[11px]",
        className
      )}
      {...props}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
              config.color
            )}
          />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            config.color
          )}
        />
      </span>
      <span className={cn("font-medium tracking-wide", config.text)}>
        {displayLabel}
      </span>
    </div>
  );
}
