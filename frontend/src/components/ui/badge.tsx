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
    default: "bg-[#EDF1E7] text-[#3D4C32] border-[#DEE5D6]",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200/90",
    warning: "bg-amber-50 text-amber-800 border-amber-200/90",
    danger: "bg-rose-50 text-rose-800 border-rose-200/90",
    info: "bg-sky-50 text-sky-800 border-sky-200/90",
    neutral: "bg-stone-100 text-stone-700 border-stone-200",
    simulation:
      "bg-purple-50 text-purple-800 border-purple-200/90 font-mono text-[10px] tracking-wide uppercase",
  };

  const sizeStyles = {
    sm: "px-2.5 py-1 text-[11px]",
    md: "px-3 py-1.5 text-xs",
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
