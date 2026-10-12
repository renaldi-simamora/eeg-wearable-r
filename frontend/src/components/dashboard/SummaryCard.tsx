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
    blue: "bg-[#EDF1E7] border-[#DEE5D6] text-[#5B6D49]",
    emerald: "bg-[#EDF1E7] border-[#DEE5D6] text-[#2D7A58]",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    slate: "bg-stone-100 border-stone-200 text-stone-600",
  };

  return (
    <Card className="hover:border-stone-300 hover:shadow-md transition-all duration-200 bg-white border-stone-200/80 rounded-2xl">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-stone-500 tracking-wider uppercase font-mono">
              {title}
            </p>
            <div className="text-2xl sm:text-3xl font-serif text-[#1C1E1A] tracking-tight">
              {value}
            </div>
            {subtext && (
              <p className="text-xs text-[#5E6659] font-normal mt-0.5">{subtext}</p>
            )}
          </div>
          <div
            className={cn(
              "w-10 h-10 rounded-full border flex items-center justify-center shrink-0 shadow-xs",
              iconVariants[variant]
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {badgeText && (
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-mono">
            <span>Status</span>
            <span className="font-medium text-[#1C1E1A] bg-[#EDF1E7] px-2.5 py-0.5 rounded-full border border-[#DEE5D6] text-[10px]">
              {badgeText}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
