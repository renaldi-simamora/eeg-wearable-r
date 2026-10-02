"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { eegService } from "@/services/eeg.service";
import {
  Play,
  Pause,
  Square,
  Wifi,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";

export default function LiveEEGPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedDeviceId, setSelectedDeviceId] = useState("dev-001");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [voltageRange, setVoltageRange] = useState<number>(50);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    status,
    samples,
    bands,
    signalQuality,
    sessionSeconds,
    isStreaming,
    connectionMode,
    startAcquisition,
    pauseAcquisition,
    resumeAcquisition,
    stopAcquisition,
    resetToReady,
  } = useEEGStream(false);

  // Fetch available devices
  const { data: devices } = useQuery({
    queryKey: ["devices"],
    queryFn: () => deviceService.getDevices(),
  });

  const activeDevice = (devices || []).find((d) => d.id === selectedDeviceId) || devices?.[0];

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: (deviceId: string) => sessionService.createSession({ deviceId }),
  });

  // Stop session mutation
  const stopSessionMutation = useMutation({
    mutationFn: (id: string) => sessionService.stopSession(id),
  });

  // Handle explicit Start Session
  const handleStartSession = async () => {
    setActionError(null);
    try {
      // 1. Create a database recording session
      const targetDevice = activeDevice?.id || selectedDeviceId;
      const created = await createSessionMutation.mutateAsync(targetDevice);
      setActiveSessionId(created.id);

      // 2. Start transport and stream acquisition
      await startAcquisition();

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    } catch (err: any) {
      setActionError(err.message || "Failed to start EEG acquisition session.");
    }
  };

  // Handle explicit Pause / Resume
  const handleTogglePause = () => {
    if (status === "ACQUIRING") {
      pauseAcquisition();
    } else if (status === "PAUSED") {
      resumeAcquisition();
    }
  };

  // Handle explicit Stop Session
  const handleStopSession = async () => {
    setActionError(null);
    try {
      // 1. Stop data acquisition and timers
      await stopAcquisition();

      // 2. Persist recorded EEG samples and spectral features buffer to database
      if (activeSessionId && samples.length > 0) {
        try {
          await eegService.postEEGData({
            sessionId: activeSessionId,
            samples,
            features: bands,
          });
        } catch (e) {
          console.warn("Failed to persist EEG samples buffer:", e);
        }
      }

      // 3. Finalize session in database if active (triggers backend ML classification)
      if (activeSessionId) {
        await stopSessionMutation.mutateAsync(activeSessionId);
      }

      // Refresh query caches
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["eeg-data", activeSessionId] });
      queryClient.invalidateQueries({ queryKey: ["analysis", activeSessionId] });
    } catch (err: any) {
      setActionError(err.message || "Failed to finalize recording session.");
    }
  };

  // Handle Start New Session
  const handleStartNewSession = () => {
    resetToReady();
    setActiveSessionId(null);
    setActionError(null);
  };

  // Simulation mode badge text based on state machine
  const getDemoBadgeText = () => {
    switch (status) {
      case "READY":
        return "Demo / Simulation — Ready";
      case "STARTING":
        return "Demo / Simulation — Starting";
      case "ACQUIRING":
        return "Demo / Simulation — Running";
      case "PAUSED":
        return "Demo / Simulation — Paused";
      case "STOPPING":
        return "Demo / Simulation — Stopping";
      case "COMPLETED":
        return "Demo / Simulation — Completed";
      default:
        return "Demo / Simulation";
    }
  };

  // Recording status badge
  const renderRecordingStateBadge = () => {
    switch (status) {
      case "READY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            READY
          </span>
        );
      case "STARTING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            STARTING...
          </span>
        );
      case "ACQUIRING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/15 text-red-300 border border-red-500/30 font-mono text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            ACQUIRING...
          </span>
        );
      case "PAUSED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            PAUSED
          </span>
        );
      case "STOPPING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
            STOPPING...
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-xs font-semibold uppercase tracking-wider">
            READY
          </span>
        );
    }
  };

  return (
    <AppShell title="Live EEG Monitoring">
      <div className="space-y-5">
        {/* 1. Header with Page Description & Explicit Status Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.05]">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Live EEG Monitoring
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Acquisition and monitoring workspace for wearable EEG telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Device Hardware Label - explicitly labeled as Demo Device */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${status === "ACQUIRING" ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`} />
              <span>
                {activeDevice ? `${activeDevice.name} (Demo Device)` : "TGAM1 Headset (Demo Device)"}
              </span>
            </div>

            {/* Explicit Demo / Simulation State Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/[0.08] border border-cyan-500/[0.18] text-cyan-400 text-xs font-mono">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{getDemoBadgeText()}</span>
            </div>
          </div>
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div className="p-3.5 rounded-xl bg-red-500/[0.08] border border-red-500/[0.2] text-red-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* 2. Dedicated Session Control Bar */}
        <div className="p-4 rounded-xl bg-[#0c1220]/90 border border-white/[0.06] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Device Selection & Hardware Spec */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                Target Device
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  disabled={status === "ACQUIRING" || status === "PAUSED" || status === "STARTING"}
                  className="rounded-lg border border-white/[0.1] bg-[#0d1526] px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 cursor-pointer"
                >
                  {(devices || []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.deviceCode})
                    </option>
                  ))}
                </select>

                <Badge
                  variant={status === "ACQUIRING" ? "success" : "neutral"}
                  size="sm"
                >
                  {status === "ACQUIRING" ? "Acquiring" : "Ready"}
                </Badge>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-white/[0.06] mx-1 self-center mt-3" />

            <div className="space-y-1 pt-0 sm:pt-0">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                Acquisition Protocol
              </span>
              <div className="text-xs text-slate-300 font-mono">
                512 SPS • FP1 Monopolar • 0.5–50 Hz
              </div>
            </div>
          </div>

          {/* Right: Primary Stream & Recording Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Primary Action Buttons based on State Machine */}
            {status === "READY" && (
              <Button
                variant="primary"
                size="md"
                onClick={handleStartSession}
                isLoading={createSessionMutation.isPending}
                className="gap-2 px-5 shadow-lg shadow-blue-500/20"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Session</span>
              </Button>
            )}

            {status === "STARTING" && (
              <Button variant="primary" size="md" disabled isLoading className="gap-2">
                <span>Starting Session...</span>
              </Button>
            )}

            {status === "ACQUIRING" && (
              <>
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleTogglePause}
                  className="gap-2 text-amber-300 hover:text-amber-200 border-amber-500/30 hover:bg-amber-500/10"
                >
                  <Pause className="w-4 h-4 text-amber-400" />
                  <span>Pause</span>
                </Button>

                <Button
                  variant="danger"
                  size="md"
                  onClick={handleStopSession}
                  isLoading={stopSessionMutation.isPending}
                  className="gap-2"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Session</span>
                </Button>
              </>
            )}

            {status === "PAUSED" && (
              <>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleTogglePause}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume</span>
                </Button>

                <Button
                  variant="danger"
                  size="md"
                  onClick={handleStopSession}
                  isLoading={stopSessionMutation.isPending}
                  className="gap-2"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Session</span>
                </Button>
              </>
            )}

            {status === "STOPPING" && (
              <Button variant="danger" size="md" disabled isLoading className="gap-2">
                <span>Finalizing Session...</span>
              </Button>
            )}

            {status === "COMPLETED" && (
              <div className="flex items-center gap-2">
                {activeSessionId && (
                  <Link href={`/sessions/${activeSessionId}`}>
                    <Button variant="outline" size="md" className="gap-2">
                      <span>View Session</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                )}
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStartNewSession}
                  className="gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start New Session</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Horizontal Session Status Strip (Clean & Compact) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Signal Quality */}
          <div className="p-3 rounded-xl bg-[#0c1220]/70 border border-white/[0.05]">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Signal Quality
            </span>
            <div className="flex items-center gap-2 mt-1">
              {signalQuality !== null ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-base font-bold text-white font-mono">
                    {signalQuality}%
                  </span>
                  <span className="text-xs text-emerald-400 font-medium">Good</span>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                  <span>Waiting for session</span>
                </div>
              )}
            </div>
          </div>

          {/* Session Duration */}
          <div className="p-3 rounded-xl bg-[#0c1220]/70 border border-white/[0.05]">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Session Duration
            </span>
            <div className="flex items-center gap-2 mt-1 font-mono text-base font-bold text-white">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{formatDuration(sessionSeconds)}</span>
            </div>
          </div>

          {/* Transport Bridge */}
          <div className="p-3 rounded-xl bg-[#0c1220]/70 border border-white/[0.05]">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Transport Bridge
            </span>
            <div className="flex items-center gap-2 mt-1 text-slate-200 font-mono text-xs">
              <Wifi className="w-4 h-4 text-blue-400" />
              <span>
                {status === "READY"
                  ? "Disconnected / Ready"
                  : connectionMode === "websocket"
                  ? "WS: Connected"
                  : "Local Sim (50Hz)"}
              </span>
            </div>
          </div>

          {/* Recording State */}
          <div className="p-3 rounded-xl bg-[#0c1220]/70 border border-white/[0.05]">
            <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1">
              Recording State
            </span>
            {renderRecordingStateBadge()}
          </div>
        </div>

        {/* 4. Session Summary Banner (Shown when COMPLETED) */}
        {status === "COMPLETED" && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/[0.08] to-blue-500/[0.08] border border-emerald-500/[0.2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/[0.15] border border-emerald-500/[0.3] flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Recording Session Completed Successfully
                </h4>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono mt-0.5">
                  <span>Duration: <strong className="text-white">{formatDuration(sessionSeconds)}</strong></span>
                  <span>•</span>
                  <span>Signal Quality: <strong className="text-emerald-400">{signalQuality || 94}%</strong></span>
                  <span>•</span>
                  <span>Protocol: FP1 512 SPS</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeSessionId && (
                <Link href={`/sessions/${activeSessionId}`}>
                  <Button variant="primary" size="sm" className="gap-1.5">
                    <span>View Session Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartNewSession}
                className="gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Start New Session</span>
              </Button>
            </div>
          </div>
        )}

        {/* 5. Primary Visual Element: Large Raw EEG Waveform Canvas */}
        <Card className="overflow-hidden">
          <CardHeader className="py-3 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.05]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/[0.1] border border-blue-500/[0.2] flex items-center justify-center text-blue-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-white">
                  Raw EEG Signal
                </CardTitle>
                <p className="text-[11px] text-slate-400">
                  FP1 Channel • Real-time biosignal voltage trace
                </p>
              </div>
            </div>

            {/* Chart Calibration Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                <span>Scale:</span>
                <select
                  value={voltageRange}
                  onChange={(e) => setVoltageRange(Number(e.target.value))}
                  className="rounded bg-[#0d1526] border border-white/[0.1] px-2 py-1 text-slate-200 focus:outline-none text-[11px] cursor-pointer"
                >
                  <option value={25}>±25 µV</option>
                  <option value={50}>±50 µV</option>
                  <option value={100}>±100 µV</option>
                </select>
              </div>

              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/[0.1] px-2 py-1 rounded border border-cyan-500/[0.2]">
                512 SPS
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5">
            <WaveformChart
              samples={samples}
              height={340}
              status={status}
              isStreaming={isStreaming}
              voltageRange={voltageRange}
              emptyStateMessage="Ready to start EEG acquisition"
              emptyStateSubtext="Select your target device and click Start Session to begin recording."
            />
          </CardContent>
        </Card>

        {/* 6. Secondary Analysis Grid: Frequency Bands, Device Specs, and ML Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Frequency Band Analysis (6 cols) */}
          <div className="lg:col-span-6">
            <Card className="h-full">
              <CardHeader className="py-3.5 px-5">
                <CardTitle className="text-sm font-semibold text-white">
                  Frequency Band Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-1">
                <FrequencyBandsChart features={bands} />
              </CardContent>
            </Card>
          </div>

          {/* Device Configuration & Montage (6 cols) */}
          <div className="lg:col-span-6 space-y-5">
            <Card>
              <CardHeader className="py-3.5 px-5">
                <CardTitle className="text-sm font-semibold text-white">
                  Device Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-1 space-y-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                  <span className="text-slate-400">Device Hardware</span>
                  <span className="font-semibold text-slate-200">
                    {activeDevice?.name || "TGAM1 Wearable Headset Alpha"} (Demo Device)
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                  <span className="text-slate-400">Electrode Channel</span>
                  <span className="font-semibold text-slate-200">FP1 (Left Prefrontal)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                  <span className="text-slate-400">Reference / Ground</span>
                  <span className="font-semibold text-slate-200">A1 (Left Earclip)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                  <span className="text-slate-400">Bandpass Filter</span>
                  <span className="font-semibold text-slate-200">0.5 Hz HPF / 50 Hz LPF</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                  <span className="text-slate-400">Telemetry Rate</span>
                  <span className="font-semibold text-emerald-400">50 Hz Packets (512 Hz Sampling)</span>
                </div>
              </CardContent>
            </Card>

            {/* Machine Learning Analysis Pipeline Component */}
            <MLPredictionCard />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
