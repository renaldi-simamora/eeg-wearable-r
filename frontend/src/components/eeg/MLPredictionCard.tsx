"use client";

import React from "react";
import { Brain, ArrowUpRight, Cpu } from "lucide-react";
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
      <CardHeader className="py-3.5 px-5 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-white">
              Machine Learning Analysis
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              Pattern classification pipeline architecture
            </p>
          </div>
        </div>
        <Badge variant="neutral" size="sm">
          Not Connected
        </Badge>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-3.5 text-xs">
        {/* Academic status note */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 leading-relaxed text-[11px]">
          <span className="text-white font-medium block mb-0.5">Pipeline Status:</span>
          Machine-learning classification will process extracted 5-band spectral features from the live stream once the external Python model service is integrated.
        </div>

        {/* Compact candidate models */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {models.map((m) => (
            <div
              key={m.name}
              className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-xs">{m.name}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              </div>
              <p className="text-[10px] text-slate-400 font-mono">{m.config}</p>
              <span className="inline-block mt-1 text-[9px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                {m.status}
              </span>
            </div>
          ))}
        </div>

        {/* Footer Link to /analysis */}
        <div className="pt-2 flex items-center justify-between text-slate-400 text-[11px] border-t border-slate-800/80">
          <span className="font-mono text-slate-500">API Contract: POST /api/analysis/:id</span>
          <Link
            href="/analysis"
            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium"
          >
            <span>Inspect ML Pipeline</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
