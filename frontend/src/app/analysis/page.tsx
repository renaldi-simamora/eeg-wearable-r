"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery } from "@tanstack/react-query";
import { analysisService } from "@/services/analysis.service";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, AlertCircle } from "lucide-react";

export default function AnalysisPage() {
  const { data: models } = useQuery({
    queryKey: ["ml-models"],
    queryFn: () => analysisService.getModels(),
  });

  return (
    <AppShell title="Machine Learning Analysis">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl sm:text-3xl font-serif text-[#1C1E1A] tracking-tight">
                Machine Learning Pipeline Architecture
              </h2>
              <Badge variant="simulation" size="sm">
                Future-Ready
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#5E6659] max-w-3xl leading-relaxed mt-1">
              This module defines the planned machine learning models, feature extraction vectors, and evaluation metrics for supervised EEG brainwave pattern classification.
            </p>
          </div>
        </div>

        {/* Informative Architecture Alert */}
        <div className="p-4 rounded-2xl bg-[#EDF1E7] border border-[#DEE5D6] text-xs flex items-start gap-3.5 shadow-xs">
          <AlertCircle className="w-5 h-5 text-[#5B6D49] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-[#1C1E1A] block text-sm">
              Inference & Data Contracts Prepared
            </span>
            <p className="text-[#5E6659] leading-relaxed">
              Evaluation datasets will be populated once the ML model service is integrated. The Go backend gateway provides endpoints <code className="font-mono text-[#3D4C32] bg-white px-2 py-0.5 rounded-full border border-[#DEE5D6]">POST /api/eeg/data</code> and <code className="font-mono text-[#3D4C32] bg-white px-2 py-0.5 rounded-full border border-[#DEE5D6]">GET /api/analysis/:sessionId</code> to receive model inference results from an external Python service.
            </p>
          </div>
        </div>

        {/* Feature Vector Formulation */}
        <Card className="bg-white border-stone-200/80 rounded-2xl shadow-sm">
          <CardHeader className="py-4 px-6 flex items-center justify-between border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
                <Layers className="w-4 h-4" />
              </div>
              <CardTitle className="text-sm font-semibold text-[#1C1E1A]">
                Input Feature Vector Formulation
              </CardTitle>
            </div>
            <span className="text-[11px] font-mono text-[#3D4C32] bg-[#EDF1E7] px-3 py-1 rounded-full border border-[#DEE5D6] font-medium">
              5-Band Relative Spectral Power (PSD)
            </span>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center font-mono text-xs">
              <div className="p-3.5 rounded-2xl bg-[#FAFBF8] border border-stone-200/80">
                <span className="text-stone-400 block text-[10px]">BAND 1</span>
                <span className="text-sky-700 font-bold text-sm block mt-1">Delta (δ)</span>
                <span className="text-stone-500 text-[10px] block mt-0.5">0.5 – 4 Hz</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#FAFBF8] border border-stone-200/80">
                <span className="text-stone-400 block text-[10px]">BAND 2</span>
                <span className="text-teal-700 font-bold text-sm block mt-1">Theta (θ)</span>
                <span className="text-stone-500 text-[10px] block mt-0.5">4 – 8 Hz</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#FAFBF8] border border-stone-200/80">
                <span className="text-stone-400 block text-[10px]">BAND 3</span>
                <span className="text-[#5B6D49] font-bold text-sm block mt-1">Alpha (α)</span>
                <span className="text-stone-500 text-[10px] block mt-0.5">8 – 13 Hz</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#FAFBF8] border border-stone-200/80">
                <span className="text-stone-400 block text-[10px]">BAND 4</span>
                <span className="text-amber-700 font-bold text-sm block mt-1">Beta (β)</span>
                <span className="text-stone-500 text-[10px] block mt-0.5">13 – 30 Hz</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#FAFBF8] border border-stone-200/80 col-span-2 sm:col-span-1">
                <span className="text-stone-400 block text-[10px]">BAND 5</span>
                <span className="text-purple-700 font-bold text-sm block mt-1">Gamma (γ)</span>
                <span className="text-stone-500 text-[10px] block mt-0.5">30 – 50 Hz</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Candidate Classification Models Grid */}
        <div className="space-y-4">
          <h3 className="text-lg font-serif font-bold text-[#1C1E1A] tracking-tight">
            Candidate Classification Models
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(models || []).map((model) => (
              <Card key={model.id} className="flex flex-col justify-between bg-white border-stone-200/80 rounded-2xl shadow-sm">
                <CardHeader className="py-4 px-6 flex items-start justify-between border-b border-stone-100">
                  <div>
                    <CardTitle className="text-base font-semibold text-[#1C1E1A]">
                      {model.name}
                    </CardTitle>
                    <span className="text-[10px] font-mono text-[#5B6D49] uppercase mt-0.5 block font-medium">
                      Supervised Classifier
                    </span>
                  </div>
                  <Badge variant="neutral" size="sm">
                    {model.status}
                  </Badge>
                </CardHeader>

                <CardContent className="p-6 space-y-4 text-xs">
                  <p className="text-[#5E6659] leading-relaxed font-normal">
                    {model.definition}
                  </p>

                  {/* Target Evaluation Metrics Matrix */}
                  <div className="space-y-2 pt-2 border-t border-stone-100">
                    <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider font-mono block">
                      Target Evaluation Metrics
                    </span>

                    <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                      <div className="p-2.5 rounded-xl bg-[#FAFBF8] border border-stone-200/80">
                        <span className="text-[9px] text-stone-500 block">Accuracy</span>
                        <span className="font-bold text-[#2D7A58] block mt-0.5">
                          {model.metrics?.accuracy !== null && model.metrics?.accuracy !== undefined
                            ? `${(Number(model.metrics.accuracy) * 100).toFixed(1)}%`
                            : "— %"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FAFBF8] border border-stone-200/80">
                        <span className="text-[9px] text-stone-500 block">Precision</span>
                        <span className="font-bold text-[#5B6D49] block mt-0.5">
                          {model.metrics?.precision !== null && model.metrics?.precision !== undefined
                            ? `${(Number(model.metrics.precision) * 100).toFixed(1)}%`
                            : "— %"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FAFBF8] border border-stone-200/80">
                        <span className="text-[9px] text-stone-500 block">Recall</span>
                        <span className="font-bold text-[#1C1E1A] block mt-0.5">
                          {model.metrics?.recall !== null && model.metrics?.recall !== undefined
                            ? `${(Number(model.metrics.recall) * 100).toFixed(1)}%`
                            : "— %"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FAFBF8] border border-stone-200/80">
                        <span className="text-[9px] text-stone-500 block">Macro F1</span>
                        <span className="font-bold text-[#5B6D49] block mt-0.5">
                          {model.metrics?.macroF1 !== null && model.metrics?.macroF1 !== undefined
                            ? `${(Number(model.metrics.macroF1) * 100).toFixed(1)}%`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Future Output Slot */}
                  <div className="p-3.5 rounded-xl border border-dashed border-stone-300 bg-[#FAFBF8] text-[11px] text-[#5E6659] leading-relaxed">
                    <span className="font-semibold text-[#1C1E1A] block mb-0.5">
                      Future Inference Output:
                    </span>
                    {model.futureNote}
                  </div>
                </CardContent>

                <CardFooter className="py-3 px-6 bg-[#FAFBF8] rounded-b-2xl border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                  <span className="font-mono text-[10px] text-stone-400">Database: ml_predictions</span>
                  <span className="text-[#5B6D49] font-medium font-mono text-[11px]">Pipeline Ready</span>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
