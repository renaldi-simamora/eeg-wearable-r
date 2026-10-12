"use client";

import React from "react";
import { Brain, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface MLPredictionCardProps {
  className?: string;
}

export function MLPredictionCard({ className = "" }: MLPredictionCardProps) {
  const models = [
    {
      name: "SVM Classifier",
      config: "RBF Kernel (C=1.0, γ=scale)",
      status: "Pipeline Ready",
    },
    {
      name: "Random Forest",
      config: "100 Estimator Trees",
      status: "Pipeline Ready",
    },
    {
      name: "XGBoost",
      config: "Gradient Boosted Trees",
      status: "Pipeline Ready",
    },
  ];

  return (
    <Card className={className}>
      <CardHeader className="py-4 px-6 flex items-center justify-between border-b border-stone-200/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-[#1C1E1A]">
              Machine Learning Analysis
            </CardTitle>
            <p className="text-[11px] text-[#5E6659]">
              Pattern classification pipeline architecture
            </p>
          </div>
        </div>
        <Badge variant="neutral" size="sm">
          Standby
        </Badge>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-4 text-xs">
        {/* Academic status note */}
        <div className="p-3.5 rounded-2xl bg-[#FAFBF8] border border-stone-200/80 text-[#5E6659] leading-relaxed text-[11px]">
          <span className="text-[#1C1E1A] font-semibold block mb-0.5">Pipeline Status:</span>
          Machine-learning classification processes extracted 5-band spectral features from the live stream via the Python ML microservice (Port 5000).
        </div>

        {/* Compact candidate models */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {models.map((m) => (
            <div
              key={m.name}
              className="p-3.5 rounded-2xl bg-white border border-stone-200/80 space-y-1.5 shadow-sm hover:border-stone-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1C1E1A] text-xs">{m.name}</span>
                <span className="w-2 h-2 rounded-full bg-[#5B6D49]" />
              </div>
              <p className="text-[10px] text-stone-500 font-mono">{m.config}</p>
              <span className="inline-block mt-1 text-[9px] font-mono text-[#3D4C32] bg-[#EDF1E7] px-2 py-0.5 rounded-full border border-[#DEE5D6] font-medium">
                {m.status}
              </span>
            </div>
          ))}
        </div>

        {/* Footer Link to /analysis */}
        <div className="pt-2 flex items-center justify-between text-stone-500 text-[11px] border-t border-stone-200/80">
          <span className="font-mono text-stone-400">API Contract: POST /api/analysis/:id</span>
          <Link
            href="/analysis"
            className="inline-flex items-center gap-1 text-[#5B6D49] hover:text-[#4E5E3E] font-medium transition-colors"
          >
            <span>Inspect ML Pipeline</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
