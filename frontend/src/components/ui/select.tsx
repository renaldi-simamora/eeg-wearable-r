import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
  hint?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, hint, id, children, ...props }, ref) => {
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
        <div className="relative">
          <select
            id={id}
            ref={ref}
            className={cn(
              "w-full appearance-none rounded-lg border bg-slate-950/80 px-3.5 py-2 pr-9 text-sm text-slate-100 transition-colors duration-150 focus:outline-none cursor-pointer",
              "border-slate-800 hover:border-slate-700 focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error && "border-red-500/60 focus:border-red-500/80 focus:ring-red-500/20",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
