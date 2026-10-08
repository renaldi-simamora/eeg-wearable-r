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
      "inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 focus:ring-offset-[#070b14] disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer";

    const variantStyles = {
      primary:
        "bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/60 shadow-sm",
      secondary:
        "bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700/80",
      outline:
        "bg-transparent hover:bg-slate-800/60 text-slate-300 border border-slate-700 hover:text-white hover:border-slate-600",
      ghost:
        "bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white",
      danger:
        "bg-red-600 hover:bg-red-500 text-white border border-red-500/60 shadow-sm",
      dark:
        "bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:text-white",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2 gap-2",
      lg: "text-base px-5 py-2.5 gap-2.5",
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
