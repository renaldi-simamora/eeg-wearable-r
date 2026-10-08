"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery } from "@tanstack/react-query";
import { analysisService } from "@/services/analysis.service";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, AlertCircle } from "lucide-react";

export default function AnalysisPage() {
  const { data: models, isLoading } = useQuery({
    queryKey: ["ml-models"],
    queryFn: () => analysisService.getModels(),
  });

  return (
    <AppShell title="Machine Learning Analysis">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Machine Learning Pipeline Architecture
              </h2>
              <Badge variant="simulation" size="sm">
                Future-Ready
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
              This module defines the planned machine learning models, feature extraction vectors, and evaluation metrics for supervised EEG brainwave pattern classification.
            </p>
          </div>
        </div>

        {/* Informative Architecture Alert */}
        <div className="p-4 rounded-xl bg-blue-950/25 border border-blue-900/40 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-white block text-sm">
              Inference & Data Contracts Prepared
            </span>
            <p className="text-slate-300 leading-relaxed">
              Evaluation datasets will be populated once the ML model service is integrated. The Go backend gateway provides endpoints <code className="font-mono text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">POST /api/eeg/data</code> and <code className="font-mono text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">GET /api/analysis/:sessionId</code> to receive model inference results from an external Python service.
            </p>
          </div>
        </div>

        {/* Feature Vector Formulation */}
        <Card>
          <CardHeader className="py-3.5 px-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-cyan-400">
                <Layers className="w-4 h-4" />
              </div>
              <CardTitle className="text-sm font-semibold text-white">
                Input Feature Vector Formulation
              </CardTitle>
            </div>
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-800/60">
              5-Band Relative Spectral Power (PSD)
            </span>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center font-mono text-xs">
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">BAND 1</span>
                <span className="text-blue-400 font-bold text-sm block mt-1">Delta (δ)</span>
                <span className="text-slate-400 text-[10px] block mt-0.5">0.5 – 4 Hz</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">BAND 2</span>
                <span className="text-cyan-400 font-bold text-sm block mt-1">Theta (θ)</span>
                <span className="text-slate-400 text-[10px] block mt-0.5">4 – 8 Hz</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">BAND 3</span>
                <span className="text-emerald-400 font-bold text-sm block mt-1">Alpha (α)</span>
                <span className="text-slate-400 text-[10px] block mt-0.5">8 – 13 Hz</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">BAND 4</span>
                <span className="text-amber-400 font-bold text-sm block mt-1">Beta (β)</span>
                <span className="text-slate-400 text-[10px] block mt-0.5">13 – 30 Hz</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 col-span-2 sm:col-span-1">
                <span className="text-slate-500 block text-[10px]">BAND 5</span>
                <span className="text-purple-400 font-bold text-sm block mt-1">Gamma (γ)</span>
                <span className="text-slate-400 text-[10px] block mt-0.5">30 – 50 Hz</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Candidate Classification Models Grid */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white tracking-tight">
            Candidate Classification Models
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(models || []).map((model) => (
              <Card key={model.id} className="flex flex-col justify-between">
                <CardHeader className="py-3.5 px-5 flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-white">
                      {model.name}
                    </CardTitle>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase mt-0.5 block">
                      Supervised Classifier
                    </span>
                  </div>
                  <Badge variant="neutral" size="sm">
                    {model.status}
                  </Badge>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4 text-xs">
                  <p className="text-slate-300 leading-relaxed font-normal">
                    {model.definition}
                  </p>

                  {/* Target Evaluation Metrics Matrix */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono block">
                      Target Evaluation Metrics
                    </span>

                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[9px] text-slate-500 block">Accuracy</span>
                        <span className="font-semibold text-emerald-400 block mt-0.5">
                          {model.metrics?.accuracy !== null && model.metrics?.accuracy !== undefined
                            ? `${(Number(model.metrics.accuracy) * 100).toFixed(1)}%`
                            : "— %"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[9px] text-slate-500 block">Precision</span>
                        <span className="font-semibold text-cyan-400 block mt-0.5">
                          {model.metrics?.precision !== null && model.metrics?.precision !== undefined
                            ? `${(Number(model.metrics.precision) * 100).toFixed(1)}%`
                            : "— %"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[9px] text-slate-500 block">Recall</span>
                        <span className="font-semibold text-slate-300 block mt-0.5">
                          {model.metrics?.recall !== null && model.metrics?.recall !== undefined
                            ? `${(Number(model.metrics.recall) * 100).toFixed(1)}%`
                            : "— %"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[9px] text-slate-500 block">Macro F1</span>
                        <span className="font-semibold text-indigo-400 block mt-0.5">
                          {model.metrics?.macroF1 !== null && model.metrics?.macroF1 !== undefined
                            ? `${(Number(model.metrics.macroF1) * 100).toFixed(1)}%`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Future Output Slot */}
                  <div className="p-3 rounded-lg border border-dashed border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 leading-relaxed">
                    <span className="font-semibold text-slate-200 block mb-0.5">
                      Future Inference Output:
                    </span>
                    {model.futureNote}
                  </div>
                </CardContent>

                <CardFooter className="py-3 px-5 bg-slate-950/40 rounded-b-xl border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[10px] text-slate-500">Database: ml_predictions</span>
                  <span className="text-cyan-400 font-medium font-mono text-[11px]">Pipeline Ready</span>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
