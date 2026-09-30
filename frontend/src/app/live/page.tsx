"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useEEGStream } from "@/hooks/useEEGStream";
import { WaveformChart } from "@/components/eeg/WaveformChart";
import { FrequencyBandsChart } from "@/components/eeg/FrequencyBandsChart";
import { MLPredictionCard } from "@/components/eeg/MLPredictionCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deviceService } from "@/services/device.service";
import { sessionService } from "@/services/session.service";
import {
  Radio,
  Play,
  Pause,
  Square,
  Cpu,
  Wifi,
  Clock,
  Activity,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";

export default function LiveEEGPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedDeviceId, setSelectedDeviceId] = useState("dev-001");
  const [sessionSeconds, setSessionSeconds] = useState(145);
  const [activeSessionId, setActiveSessionId] = useState<string | null>("ses-001");

  const {
    samples,
    bands,
    signalQuality,
    isStreaming,
    isSimulation,
    connectionMode,
    startStream,
    pauseStream,
  } = useEEGStream(true);

  // Fetch available devices
  const { data: devices } = useQuery({
    queryKey: ["devices"],
    queryFn: () => deviceService.getDevices(),
  });

  const activeDevice = (devices || []).find((d) => d.id === selectedDeviceId) || devices?.[0];

  // Stop session mutation
  const stopSessionMutation = useMutation({
    mutationFn: (id: string) => sessionService.stopSession(id),
    onSuccess: (stoppedSession) => {
      pauseStream();
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      router.push(`/sessions/${stoppedSession.id}`);
    },
  });

  // Increment session timer when streaming
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const handleStopSession = () => {
    if (activeSessionId) {
      stopSessionMutation.mutate(activeSessionId);
    } else {
      pauseStream();
    }
  };

  return (
    <AppShell title="Live EEG Monitoring">
      <div className="space-y-6">
        {/* Header & Controls Bar */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Device Selector & Status */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                Target Device
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {(devices || []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.deviceCode})
                    </option>
                  ))}
                </select>

                <Badge
                  variant={activeDevice?.status === "connected" ? "success" : "warning"}
                  size="sm"
                >
                  {activeDevice?.status || "Connected"}
                </Badge>
              </div>
            </div>

            {/* Simulation Notice Pill */}
            <div className="hidden sm:flex flex-col justify-end pt-4">
              <Badge variant="simulation" size="sm">
                Demo / Simulation
              </Badge>
            </div>
          </div>

          {/* Right: Stream & Recording Controls */}
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <Button
                variant="outline"
                size="md"
                onClick={pauseStream}
                className="gap-2 text-slate-700"
              >
                <Pause className="w-4 h-4 text-amber-600" />
                <span>Pause</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={startStream}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                <span>Start Stream</span>
              </Button>
            )}

            <Button
              variant="danger"
              size="md"
              onClick={handleStopSession}
              isLoading={stopSessionMutation.isPending}
              className="gap-2"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Session</span>
            </Button>
          </div>
        </div>

        {/* Telemetry Status Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Card className="p-3">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Signal Quality
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-base font-bold text-slate-900 font-mono">
                {signalQuality}%
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">Good</span>
            </div>
          </Card>

          <Card className="p-3">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Session Duration
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-mono text-base font-bold text-slate-900">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{formatDuration(sessionSeconds)}</span>
            </div>
          </Card>

          <Card className="p-3">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Transport Bridge
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-slate-800 font-medium">
              <Wifi className="w-4 h-4 text-blue-600" />
              <span className="font-mono text-xs">
                {connectionMode === "websocket" ? "WS: Connected" : "Local Sim (50Hz)"}
              </span>
            </div>
          </Card>

          <Card className="p-3">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Recording State
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isStreaming ? "bg-red-500 animate-ping" : "bg-slate-300"
                }`}
              />
              <span className="font-semibold text-slate-800">
                {isStreaming ? "ACQUIRING..." : "PAUSED"}
              </span>
            </div>
          </Card>
        </div>

        {/* Main Grid: Waveform + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Area: Large EEG Waveform */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <CardTitle className="text-sm font-semibold text-white">
                    Raw Biosignal Voltage Trace (FP1 Channel)
                  </CardTitle>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Scale: ±50 µV • 512 SPS
                </span>
              </CardHeader>
              <CardContent className="p-4 bg-slate-950">
                <WaveformChart
                  samples={samples}
                  height={320}
                  isStreaming={isStreaming}
                  voltageRange={50}
                />
              </CardContent>
            </Card>

            {/* Future Machine Learning Classification Component */}
            <MLPredictionCard />
          </div>

          {/* Secondary Column: Brainwave Spectrum & Electrodes */}
          <div className="lg:col-span-4 space-y-6">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Real-Time Frequency Bands
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <FrequencyBandsChart features={bands} />
              </CardContent>
            </Card>

            {/* Electrode & Hardware Specs */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Sensor Montage
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">Channel Setup</span>
                  <span className="font-semibold text-slate-900 font-mono">10-20 Standard</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">Active Electrode</span>
                  <span className="font-semibold text-slate-900 font-mono">FP1 (Left Prefrontal)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">Ground / Reference</span>
                  <span className="font-semibold text-slate-900 font-mono">A1 (Left Earclip)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">Analog Filter</span>
                  <span className="font-semibold text-slate-900 font-mono">0.5 Hz HPF / 50 Hz LPF</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
