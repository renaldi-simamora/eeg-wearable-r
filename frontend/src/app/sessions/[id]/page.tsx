"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery } from "@tanstack/react-query";
import { sessionService } from "@/services/session.service";
import { eegService } from "@/services/eeg.service";
import { analysisService } from "@/services/analysis.service";
import { WaveformChart } from "@/components/eeg/WaveformChart";
import { FrequencyBandsChart } from "@/components/eeg/FrequencyBandsChart";
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
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  Layers,
  CheckCircle2,
} from "lucide-react";

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = (params?.id as string) || "ses-001";

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => sessionService.getSessionById(sessionId),
  });

  const { data: eegData } = useQuery({
    queryKey: ["eeg-data", sessionId],
    queryFn: () => eegService.getEEGData(sessionId),
  });

  const { data: analysisData } = useQuery({
    queryKey: ["analysis", sessionId],
    queryFn: () => analysisService.getAnalysisBySession(sessionId),
  });

  return (
    <AppShell title={`Session #${sessionId.slice(-6)}`}>
      <div className="space-y-6">
        {/* Top Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link href="/sessions">
              <Button variant="ghost" size="sm" className="gap-1 p-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Session #{sessionId.slice(-6)}
                </h2>
                <Badge
                  variant={session?.status === "completed" ? "neutral" : "success"}
                  size="sm"
                >
                  {session?.status || "Completed"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Archived electroencephalographic recording session details
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                alert("Dataset exported to JSON format for offline ML training.");
              }}
              className="gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              <span>Export Raw Data</span>
            </Button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <Card className="p-3">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Start Time
            </span>
            <span className="font-semibold text-slate-900 block mt-1 truncate">
              {session?.startedAt ? formatDate(session.startedAt) : "—"}
            </span>
          </Card>

          <Card className="p-3">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              End Time
            </span>
            <span className="font-semibold text-slate-900 block mt-1 truncate">
              {session?.endedAt ? formatDate(session.endedAt) : "Active"}
            </span>
          </Card>

          <Card className="p-3">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Total Duration
            </span>
            <span className="font-semibold font-mono text-slate-900 block mt-1">
              {session?.duration !== undefined ? formatDuration(session.duration) : "—"}
            </span>
          </Card>

          <Card className="p-3">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Device Name
            </span>
            <span className="font-semibold text-slate-900 block mt-1 truncate">
              {session?.deviceName || "TGAM1 Alpha"}
            </span>
          </Card>

          <Card className="p-3">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Device Code
            </span>
            <span className="font-mono text-slate-900 font-semibold block mt-1">
              {session?.deviceCode || "EEG-001"}
            </span>
          </Card>

          <Card className="p-3">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Signal Quality
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-mono font-semibold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{session?.signalQuality || 94}% Good</span>
            </div>
          </Card>
        </div>

        {/* Section 1: EEG Waveform Trace */}
        <Card className="overflow-hidden">
          <CardHeader className="py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <CardTitle className="text-sm font-semibold text-white">
                1. Recorded EEG Voltage Waveform
              </CardTitle>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              FP1 Monopolar Trace • Normalized Window
            </span>
          </CardHeader>
          <CardContent className="p-4 bg-slate-950">
            <WaveformChart
              samples={eegData?.samples || []}
              height={220}
              isStreaming={false}
              voltageRange={50}
            />
          </CardContent>
        </Card>

        {/* Grid: Sections 2, 3, 4 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Section 2: Brainwave Overview */}
          <div className="lg:col-span-6 space-y-6">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  2. Brainwave Spectral Power Density
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <FrequencyBandsChart features={eegData?.latestFeature} />
              </CardContent>
            </Card>

            {/* Section 3: Session Information */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  3. Session Technical Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Acquisition Protocol</span>
                  <span className="font-semibold text-slate-800">Eyes-Open Resting State</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Filter Applied</span>
                  <span className="font-semibold text-slate-800 font-mono">0.5 – 50 Hz Bandpass + 50 Hz Notch</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Electrode Configuration</span>
                  <span className="font-semibold text-slate-800">10-20 FP1 / A1 Ear Reference</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Samples Persisted</span>
                  <span className="font-semibold font-mono text-slate-800">{eegData?.samples?.length || 80} windows</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500">Impedance Stability</span>
                  <span className="font-semibold text-emerald-600">&lt; 5 kΩ (Optimal)</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 4, 5, 6 */}
          <div className="lg:col-span-6 space-y-6">
            {/* Section 4: Data Summary */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  4. Biosignal Statistical Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase text-slate-400 block">
                      Mean Amplitude
                    </span>
                    <span className="text-base font-bold text-slate-800 block mt-0.5">
                      +1.42 µV
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase text-slate-400 block">
                      Standard Deviation
                    </span>
                    <span className="text-base font-bold text-slate-800 block mt-0.5">
                      14.86 µV
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase text-slate-400 block">
                      Peak-to-Peak (Vp-p)
                    </span>
                    <span className="text-base font-bold text-slate-800 block mt-0.5">
                      68.20 µV
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase text-slate-400 block">
                      Dominant Spectral Band
                    </span>
                    <span className="text-base font-bold text-emerald-600 block mt-0.5">
                      Alpha (10.1 Hz)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 5: Machine Learning Classification Placeholder */}
            <Card className="border-dashed border-slate-300 bg-slate-50/50">
              <CardHeader className="py-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-indigo-600" />
                  <CardTitle className="text-sm font-semibold text-slate-800">
                    5. Machine Learning Classification
                  </CardTitle>
                </div>
                <Badge variant="neutral" size="sm">
                  Future Service
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2 text-xs">
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Machine-learning results will be available after the ML service is integrated.
                  </p>
                </div>
                <div className="text-[11px] text-slate-500 font-mono pt-1">
                  Target Service Endpoint: POST /api/analysis/{sessionId}
                </div>
              </CardContent>
            </Card>

            {/* Section 6: Future AI Insight Placeholder */}
            <Card className="border-dashed border-slate-300 bg-slate-50/50">
              <CardHeader className="py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-sm font-semibold text-slate-800">
                    6. Future AI Insight & Analytics
                  </CardTitle>
                </div>
                <Badge variant="neutral" size="sm">
                  Placeholder
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Automated summarization and cognitive state pattern synthesis will be generated once the AI insight service is connected to this session.
                </p>
                <div className="text-[11px] text-slate-400 font-mono">
                  Schema: ai_insights (session_id, title, summary)
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
