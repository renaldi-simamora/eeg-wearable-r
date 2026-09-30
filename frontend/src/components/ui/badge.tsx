import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral"
    | "simulation";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-blue-500/[0.1] text-blue-400 border-blue-500/[0.15]",
    success: "bg-emerald-500/[0.1] text-emerald-400 border-emerald-500/[0.15]",
    warning: "bg-amber-500/[0.1] text-amber-400 border-amber-500/[0.15]",
    danger: "bg-red-500/[0.1] text-red-400 border-red-500/[0.15]",
    info: "bg-sky-500/[0.1] text-sky-400 border-sky-500/[0.15]",
    neutral: "bg-white/[0.04] text-slate-400 border-white/[0.08]",
    simulation:
      "bg-indigo-500/[0.1] text-indigo-400 border-indigo-500/[0.15] font-mono text-[10px] tracking-wide uppercase",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border leading-none shrink-0",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
