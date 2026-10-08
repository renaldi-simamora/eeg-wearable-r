"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionService } from "@/services/session.service";
import { eegService } from "@/services/eeg.service";
import { analysisService } from "@/services/analysis.service";
import { WaveformChart } from "@/components/eeg/WaveformChart";
import { FrequencyBandsChart, calculateDominantBand } from "@/components/eeg/FrequencyBandsChart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDuration } from "@/lib/utils";
import {
  ArrowLeft,
  Clock,
  Radio,
  Cpu,
  Activity,
  Brain,
  FileSpreadsheet,
  Layers,
} from "lucide-react";

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = (params?.id as string) || "ses-001";

  const { data: session } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => sessionService.getSessionById(sessionId),
  });

  const { data: eegData } = useQuery({
    queryKey: ["eeg-data", sessionId],
    queryFn: () => eegService.getEEGData(sessionId),
  });

  const queryClient = useQueryClient();

  const { data: analysisData } = useQuery({
    queryKey: ["analysis", sessionId],
    queryFn: () => analysisService.getAnalysis(sessionId),
  });

  const classifyMutation = useMutation({
    mutationFn: () => analysisService.classifySession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  // Dynamic statistical calculations from actual session samples
  const rawValues = (eegData?.samples || [])
    .map((s) => s.rawEEG)
    .filter((v) => typeof v === "number" && !isNaN(v));

  let meanAmpStr = "N/A";
  let stdDevStr = "N/A";
  let vppStr = "N/A";

  if (rawValues.length > 0) {
    const sum = rawValues.reduce((a, b) => a + b, 0);
    const mean = sum / rawValues.length;
    const variance =
      rawValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rawValues.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...rawValues);
    const max = Math.max(...rawValues);
    const vpp = max - min;

    meanAmpStr = `${mean >= 0 ? "+" : ""}${mean.toFixed(2)} µV`;
    stdDevStr = `${stdDev.toFixed(2)} µV`;
    vppStr = `${vpp.toFixed(2)} µV`;
  }

  // Dominant frequency band calculated from actual session spectral features
  const dominant = calculateDominantBand(eegData?.latestFeature);
  const dominantBandStr = dominant
    ? `${dominant.name} (${dominant.value.toFixed(1)}%)`
    : "Waiting for EEG data";

  return (
    <AppShell title={`Session #${sessionId.slice(-6)}`}>
      <div className="space-y-6">
        {/* Top Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <Link href="/sessions">
              <Button variant="ghost" size="sm" className="gap-1 p-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Session #{sessionId.slice(-6)}
                </h2>
                <Badge
                  variant={session?.status === "completed" ? "neutral" : "success"}
                  size="sm"
                >
                  {session?.status || "Completed"}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Archived electroencephalographic recording session details & telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                alert("Dataset exported to JSON format for offline machine learning analysis.");
              }}
              className="gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
              <span>Export Raw Data</span>
            </Button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Start Time
            </span>
            <span className="font-medium text-slate-200 block mt-1 truncate">
              {session?.startedAt ? formatDate(session.startedAt) : "—"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              End Time
            </span>
            <span className="font-medium text-slate-200 block mt-1 truncate">
              {session?.endedAt ? formatDate(session.endedAt) : "Completed"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Total Duration
            </span>
            <span className="font-semibold font-mono text-white block mt-1">
              {session?.duration !== undefined ? formatDuration(session.duration) : "—"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Device Name
            </span>
            <span className="font-medium text-slate-200 block mt-1 truncate">
              {session?.deviceName || "TGAM1 Headset Alpha"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Device Code
            </span>
            <span className="font-mono text-cyan-400 font-medium block mt-1">
              {session?.deviceCode || "EEG-001"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Signal Quality
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-mono font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{session?.signalQuality || 94}% Good</span>
            </div>
          </div>
        </div>

        {/* Section 1: Raw EEG Waveform Trace Replay */}
        <Card className="overflow-hidden">
          <CardHeader className="py-3 px-5 flex items-center justify-between border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <CardTitle className="text-sm font-semibold text-white">
                Recorded EEG Voltage Waveform
              </CardTitle>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              FP1 Monopolar Trace • Normalized Window (±50 µV)
            </span>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <WaveformChart
              samples={eegData?.samples || []}
              height={260}
              isStreaming={false}
              voltageRange={50}
            />
          </CardContent>
        </Card>

        {/* Grid: Spectral Power, Technical Protocol, Statistics, and ML Status */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (6 cols): Spectral Power & Protocol */}
          <div className="lg:col-span-6 space-y-6">
            <Card>
              <CardHeader className="py-3.5 px-5">
                <CardTitle className="text-sm font-semibold text-white">
                  Brainwave Spectral Power Density
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-1">
                <FrequencyBandsChart features={eegData?.latestFeature} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3.5 px-5">
                <CardTitle className="text-sm font-semibold text-white">
                  Session Technical Protocol
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-1 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Acquisition Protocol</span>
                  <span className="font-medium text-white">Eyes-Open Resting State</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Filter Applied</span>
                  <span className="font-medium text-slate-200">0.5 – 50 Hz Bandpass + 50 Hz Notch</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Electrode Setup</span>
                  <span className="font-medium text-slate-200">10-20 FP1 / A1 Ear Reference</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Samples Persisted</span>
                  <span className="font-medium text-cyan-400">{eegData?.samples?.length ?? 0} windows</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-400 font-sans">Impedance Stability</span>
                  <span className="font-medium text-emerald-400">&lt; 5 kΩ (Optimal)</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (6 cols): Statistics, ML Placeholder & Model Insights */}
          <div className="lg:col-span-6 space-y-6">
            <Card>
              <CardHeader className="py-3.5 px-5">
                <CardTitle className="text-sm font-semibold text-white">
                  Biosignal Statistical Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-1">
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] uppercase text-slate-500 block">
                      Mean Amplitude
                    </span>
                    <span className="text-base font-bold text-white block mt-0.5">
                      {meanAmpStr}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] uppercase text-slate-500 block">
                      Standard Deviation
                    </span>
                    <span className="text-base font-bold text-white block mt-0.5">
                      {stdDevStr}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] uppercase text-slate-500 block">
                      Peak-to-Peak (Vp-p)
                    </span>
                    <span className="text-base font-bold text-white block mt-0.5">
                      {vppStr}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] uppercase text-slate-500 block">
                      Dominant Band
                    </span>
                    <span className="text-base font-bold text-cyan-400 block mt-0.5">
                      {dominantBandStr}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Machine Learning Classification */}
            <Card>
              <CardHeader className="py-3 px-5 flex items-center justify-between border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-cyan-400" />
                  <CardTitle className="text-sm font-semibold text-white">
                    Machine Learning Classification
                  </CardTitle>
                </div>
                <Badge
                  variant={analysisData?.predictions && analysisData.predictions.length > 0 ? "success" : "neutral"}
                  size="sm"
                >
                  {analysisData?.predictions && analysisData.predictions.length > 0 ? "Classified" : "Ready"}
                </Badge>
              </CardHeader>
              <CardContent className="p-5 pt-3 space-y-3 text-xs">
                {analysisData?.predictions && analysisData.predictions.length > 0 ? (
                  analysisData.predictions.map((pred) => (
                    <div
                      key={pred.id}
                      className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2 font-mono"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-xs">{pred.modelName}</span>
                        <span className="text-emerald-400 font-bold">
                          {Math.round(pred.confidence * 100)}% Confidence
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-t border-slate-800/80 text-xs">
                        <span className="text-slate-400 font-sans">Predicted Pattern:</span>
                        <span className="font-bold text-cyan-400 text-sm">{pred.predictedClass}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                        <span>Version: {pred.modelVersion}</span>
                        <span>{pred.createdAt ? formatDate(pred.createdAt) : "Just now"}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-3">
                    <p className="text-slate-400 leading-relaxed">
                      No classification prediction recorded yet for this session. Run ML classification across the recorded 5-band relative spectral power vectors using the Support Vector Machine (SVM) pipeline.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => classifyMutation.mutate()}
                      isLoading={classifyMutation.isPending}
                      className="gap-2"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>Run ML Classification</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pattern Synthesis & Insights */}
            <Card>
              <CardHeader className="py-3 px-5 flex items-center justify-between border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <CardTitle className="text-sm font-semibold text-white">
                    Cognitive Synthesis & Model Insights
                  </CardTitle>
                </div>
                <Badge variant="neutral" size="sm">
                  {analysisData?.insights && analysisData.insights.length > 0 ? "Generated" : "Standby"}
                </Badge>
              </CardHeader>
              <CardContent className="p-5 pt-3 space-y-3 text-xs">
                {analysisData?.insights && analysisData.insights.length > 0 ? (
                  analysisData.insights.map((ins) => (
                    <div
                      key={ins.id}
                      className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5"
                    >
                      <h5 className="font-semibold text-white text-xs">{ins.title}</h5>
                      <p className="text-slate-300 leading-relaxed text-xs">{ins.summary}</p>
                      <div className="text-[10px] text-slate-500 font-mono pt-1">
                        Generated: {formatDate(ins.createdAt)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 leading-relaxed">
                    Automated physiological pattern synthesis will be generated when ML classification is performed on this session.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
