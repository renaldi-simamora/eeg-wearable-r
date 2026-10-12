import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, label, hint, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={id}
              className="block text-xs font-semibold text-stone-700 tracking-wide uppercase"
            >
              {label}
            </label>
            {hint && (
              <span className="text-[11px] text-stone-400 font-normal">
                {hint}
              </span>
            )}
          </div>
        )}
        <input
          id={id}
          type={type}
          ref={ref}
          className={cn(
            "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#1C1E1A] placeholder:text-stone-400 transition-colors duration-150 focus:outline-none",
            "border-stone-200/90 hover:border-stone-300 focus:border-[#5B6D49] focus:ring-2 focus:ring-[#5B6D49]/20 shadow-2xs",
            "disabled:opacity-50 disabled:bg-stone-50 disabled:cursor-not-allowed",
            error && "border-rose-400 focus:border-rose-500 focus:ring-rose-200",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
