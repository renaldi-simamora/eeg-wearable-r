"use client";

import React from "react";
import { Brain, Cpu, Sparkles, AlertCircle, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface MLPredictionCardProps {
  className?: string;
  isCompact?: boolean;
}

export function MLPredictionCard({ className = "", isCompact = false }: MLPredictionCardProps) {
  return (
    <Card className={`border-dashed border-slate-300 bg-gradient-to-b from-slate-50/70 to-white ${className}`}>
      <CardHeader className="py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-800">
              Machine Learning Pipeline
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Future Real-Time Inference Module
            </p>
          </div>
        </div>
        <Badge variant="neutral" size="sm">
          Not Connected
        </Badge>
      </CardHeader>

      <CardContent className="pt-2 pb-5 space-y-4">
        {/* Academic Notice Banner */}
        <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Architecture Ready:</span>
            <span className="text-amber-800 leading-relaxed">
              Machine-learning classification will appear here. The classification model service will be linked in the subsequent phase.
            </span>
          </div>
        </div>

        {/* Planned Model Pipeline Slots */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-2.5 rounded-lg border border-slate-200/80 bg-white">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Model 1</div>
            <div className="text-xs font-semibold text-slate-800 mt-0.5">SVM Classifier</div>
            <div className="text-[11px] text-slate-500 mt-1">RBF Kernel</div>
            <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
              Pending API
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200/80 bg-white">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Model 2</div>
            <div className="text-xs font-semibold text-slate-800 mt-0.5">Random Forest</div>
            <div className="text-[11px] text-slate-500 mt-1">Ensemble Trees</div>
            <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
              Pending API
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200/80 bg-white">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Model 3</div>
            <div className="text-xs font-semibold text-slate-800 mt-0.5">XGBoost</div>
            <div className="text-[11px] text-slate-500 mt-1">Gradient Boosted</div>
            <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
              Pending API
            </span>
          </div>
        </div>

        {/* Future Contract Link */}
        <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
          <span className="font-mono text-[11px]">Contract: POST /api/analysis/:id</span>
          <Link
            href="/analysis"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
          >
            <span>View ML Pipeline</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
