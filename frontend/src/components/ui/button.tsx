import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "dark";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#070b14] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none cursor-pointer";

    const variantStyles = {
      primary:
        "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 focus:ring-blue-500 border border-blue-500/50",
      secondary:
        "bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border border-white/[0.08] focus:ring-slate-400",
      outline:
        "bg-transparent hover:bg-white/[0.04] text-slate-300 border border-white/[0.1] focus:ring-blue-500 hover:border-white/[0.15]",
      ghost:
        "bg-transparent hover:bg-white/[0.06] text-slate-300 focus:ring-slate-400",
      danger:
        "bg-red-600/90 hover:bg-red-600 text-white shadow-lg shadow-red-600/20 focus:ring-red-500 border border-red-500/50",
      dark:
        "bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] focus:ring-slate-600",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2 gap-2",
      lg: "text-base px-6 py-2.5 gap-2.5",
      icon: "h-9 w-9 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
