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
    blue: "bg-blue-500/[0.1] text-blue-400 border-blue-500/[0.15]",
    emerald: "bg-emerald-500/[0.1] text-emerald-400 border-emerald-500/[0.15]",
    amber: "bg-amber-500/[0.1] text-amber-400 border-amber-500/[0.15]",
    slate: "bg-white/[0.04] text-slate-400 border-white/[0.08]",
  };

  const glowVariants = {
    blue: "group-hover:shadow-blue-500/[0.05]",
    emerald: "group-hover:shadow-emerald-500/[0.05]",
    amber: "group-hover:shadow-amber-500/[0.05]",
    slate: "group-hover:shadow-white/[0.02]",
  };

  return (
    <Card className={cn("group hover:border-white/[0.1] transition-all", glowVariants[variant])}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
              {title}
            </p>
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {value}
            </div>
            {subtext && (
              <p className="text-xs text-slate-400 font-medium">{subtext}</p>
            )}
          </div>
          <div
            className={cn(
              "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0",
              iconVariants[variant]
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {badgeText && (
          <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Status</span>
            <span className="font-semibold text-slate-300">{badgeText}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
