import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  variant?: "blue" | "emerald" | "amber" | "slate";
  badgeText?: string;
}

export function SummaryCard({
  title,
  value,
  subtext,
  icon: Icon,
  variant = "blue",
  badgeText,
}: SummaryCardProps) {
  const iconVariants = {
    blue: "bg-slate-900 border-slate-800 text-blue-400",
    emerald: "bg-slate-900 border-slate-800 text-emerald-400",
    amber: "bg-slate-900 border-slate-800 text-amber-400",
    slate: "bg-slate-900 border-slate-800 text-slate-400",
  };

  return (
    <Card className="hover:border-slate-700/80 transition-colors">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase font-mono">
              {title}
            </p>
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {value}
            </div>
            {subtext && (
              <p className="text-xs text-slate-400 font-normal">{subtext}</p>
            )}
          </div>
          <div
            className={cn(
              "w-9 h-9 rounded-lg border flex items-center justify-center shrink-0",
              iconVariants[variant]
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>
        {badgeText && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Status</span>
            <span className="font-medium text-slate-300">{badgeText}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
