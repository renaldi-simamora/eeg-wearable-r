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
      "inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#5B6D49]/30 focus:ring-offset-2 focus:ring-offset-[#F7F8F5] disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer active:scale-[0.98]";

    const variantStyles = {
      primary:
        "bg-[#5B6D49] hover:bg-[#4D5D3D] text-white shadow-sm border border-[#50603F]",
      secondary:
        "bg-[#EDF1E7] hover:bg-[#E2E8DA] text-[#3D4C32] border border-[#DEE5D6]",
      outline:
        "bg-white hover:bg-stone-50 text-[#1C1E1A] border border-stone-200/90 shadow-2xs",
      ghost:
        "bg-transparent hover:bg-stone-100/70 text-stone-600 hover:text-stone-900",
      danger:
        "bg-rose-600 hover:bg-rose-500 text-white shadow-sm",
      dark:
        "bg-[#1C1E1A] hover:bg-[#2B2F28] text-white shadow-sm",
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
