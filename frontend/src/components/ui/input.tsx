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
              className="block text-xs font-semibold text-slate-300 tracking-wide uppercase"
            >
              {label}
            </label>
            {hint && (
              <span className="text-[11px] text-slate-500 font-normal">
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
            "w-full rounded-lg border bg-slate-950/80 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition-colors duration-150 focus:outline-none",
            "border-slate-800 hover:border-slate-700 focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/20",
            "disabled:opacity-50 disabled:bg-slate-900/50 disabled:cursor-not-allowed",
            error && "border-red-500/60 focus:border-red-500/80 focus:ring-red-500/20",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
