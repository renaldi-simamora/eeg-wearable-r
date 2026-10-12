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
        <div className="relative">
          <select
            id={id}
            ref={ref}
            className={cn(
              "w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 pr-9 text-sm text-[#1C1E1A] transition-colors duration-150 focus:outline-none cursor-pointer",
              "border-stone-200/90 hover:border-stone-300 focus:border-[#5B6D49] focus:ring-2 focus:ring-[#5B6D49]/20 shadow-2xs",
              "disabled:opacity-50 disabled:bg-stone-50 disabled:cursor-not-allowed",
              error && "border-rose-400 focus:border-rose-500 focus:ring-rose-200",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
        </div>
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
