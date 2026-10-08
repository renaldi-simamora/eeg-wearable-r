import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}

export function SectionHeader({
  title,
  description,
  badge,
  action,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80",
        className
      )}
      {...props}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {title}
          </h2>
          {badge}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}
