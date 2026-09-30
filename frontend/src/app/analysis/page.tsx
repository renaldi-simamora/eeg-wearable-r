"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery } from "@tanstack/react-query";
import { analysisService } from "@/services/analysis.service";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Cpu,
  Layers,
  Sparkles,
  AlertCircle,
  Network,
  Activity,
  ArrowRight,
  Database,
  BarChart2,
} from "lucide-react";

export default function AnalysisPage() {
  const { data: models, isLoading } = useQuery({
    queryKey: ["ml-models"],
    queryFn: () => analysisService.getModels(),
  });

  return (
    <AppShell title="Machine Learning Analysis">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Machine Learning Pipeline Architecture
            </h2>
            <Badge variant="simulation" size="sm">
              Future-Ready
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-3xl">
            This module defines the planned machine learning models, feature extraction vectors, and evaluation metrics for supervised EEG brainwave pattern classification.
          </p>
        </div>

        {/* Informative Architecture Alert */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-900 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-blue-950 block text-sm">
              Evaluation & Classification Contracts Prepared
            </span>
            <p className="text-blue-800 leading-relaxed">
              Evaluation data will be populated after the ML pipeline is connected. The backend architecture exposes <code className="font-mono text-blue-900 bg-blue-100/80 px-1.5 py-0.5 rounded">POST /api/eeg/data</code> and <code className="font-mono text-blue-900 bg-blue-100/80 px-1.5 py-0.5 rounded">GET /api/analysis/:sessionId</code> to receive model inference results from the external Python FastAPI service.
            </p>
          </div>
        </div>

        {/* Feature Vector Pipeline Diagram */}
        <Card className="bg-slate-900 text-white border-slate-800">
          <CardHeader className="py-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <CardTitle className="text-sm font-semibold text-white">
                Input Feature Vector Formulation
              </CardTitle>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              5-Band Relative Spectral Power (PSD)
            </span>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center font-mono text-xs">
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400 block text-[10px]">BAND 1</span>
                <span className="text-blue-400 font-bold text-sm block mt-1">Delta (δ)</span>
                <span className="text-slate-500 text-[10px] block">0.5 – 4 Hz</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400 block text-[10px]">BAND 2</span>
                <span className="text-cyan-400 font-bold text-sm block mt-1">Theta (θ)</span>
                <span className="text-slate-500 text-[10px] block">4 – 8 Hz</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400 block text-[10px]">BAND 3</span>
                <span className="text-emerald-400 font-bold text-sm block mt-1">Alpha (α)</span>
                <span className="text-slate-500 text-[10px] block">8 – 13 Hz</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400 block text-[10px]">BAND 4</span>
                <span className="text-amber-400 font-bold text-sm block mt-1">Beta (β)</span>
                <span className="text-slate-500 text-[10px] block">13 – 30 Hz</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 col-span-2 sm:col-span-1">
                <span className="text-slate-400 block text-[10px]">BAND 5</span>
                <span className="text-purple-400 font-bold text-sm block mt-1">Gamma (γ)</span>
                <span className="text-slate-500 text-[10px] block">30 – 50 Hz</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Cards Grid: SVM, Random Forest, XGBoost */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Candidate Classification Models
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(models || []).map((model) => (
              <Card
                key={model.id}
                className="flex flex-col justify-between border-slate-200 hover:border-slate-300 transition-all shadow-xs"
              >
                <CardHeader className="py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        {model.name}
                      </CardTitle>
                      <span className="text-[10px] font-mono text-slate-400 uppercase mt-0.5 block">
                        Supervised Classifier
                      </span>
                    </div>
                    <Badge variant="neutral" size="sm">
                      {model.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6 pt-0 space-y-5">
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {model.definition}
                  </p>

                  {/* Future Output Area & Metric Placeholders */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide block">
                      Target Evaluation Metrics
                    </span>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Accuracy</span>
                        <span className="font-semibold text-slate-400 block mt-0.5">
                          — %
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Precision</span>
                        <span className="font-semibold text-slate-400 block mt-0.5">
                          — %
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Recall</span>
                        <span className="font-semibold text-slate-400 block mt-0.5">
                          — %
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Macro F1</span>
                        <span className="font-semibold text-slate-400 block mt-0.5">
                          —
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Future Output Slot */}
                  <div className="p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[11px] text-slate-500 leading-relaxed">
                    <span className="font-semibold text-slate-700 block mb-0.5">
                      Future Inference Output Area:
                    </span>
                    {model.futureNote}
                  </div>
                </CardContent>

                <CardFooter className="py-3 px-6 bg-slate-50/60 rounded-b-xl border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono text-[11px]">Database: ml_predictions</span>
                  <span className="text-blue-600 font-medium">Pipeline Ready</span>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
