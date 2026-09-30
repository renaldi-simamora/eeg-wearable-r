"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import { sessionService } from "@/services/session.service";
import { deviceService } from "@/services/device.service";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { LiveEEGPreview } from "@/components/dashboard/LiveEEGPreview";
import { DeviceHealthCard } from "@/components/dashboard/DeviceHealthCard";
import { RecentSessionsTable } from "@/components/dashboard/RecentSessionsTable";
import { FrequencyBandsChart } from "@/components/eeg/FrequencyBandsChart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Radio,
  Clock,
  Brain,
  Plus,
  Play,
  ArrowRight,
  Cpu,
  RefreshCw,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("dev-001");

  // Fetch dashboard summary
  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => dashboardService.getSummary(),
  });

  // Fetch devices for the modal selector
  const { data: devices } = useQuery({
    queryKey: ["devices"],
    queryFn: () => deviceService.getDevices(),
  });

  // Mutation to start new session
  const startSessionMutation = useMutation({
    mutationFn: (deviceId: string) => sessionService.createSession({ deviceId }),
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setIsStartModalOpen(false);
      router.push("/live");
    },
  });

  const handleStartSession = () => {
    startSessionMutation.mutate(selectedDeviceId);
  };

  const activeDevice = summary?.activeDevice;

  return (
    <AppShell title="Research Dashboard">
      <div className="space-y-6">
        {/* 1. Header with greeting and Start New Session Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.04]">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Good afternoon, {user?.name || "Researcher"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Your EEG platform is ready. Monitor real-time telemetry and manage acquisition sessions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Refresh</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsStartModalOpen(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Start New Session</span>
            </Button>
          </div>
        </div>

        {/* 2. Top Summary KPI Cards (Cards 1-4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Device Status"
            value={summary?.deviceStatus || "Connected"}
            subtext={activeDevice ? `${activeDevice.name} (${activeDevice.deviceCode})` : "TGAM1 Headset Alpha"}
            icon={Cpu}
            variant="blue"
            badgeText="Online • 2.4 GHz"
          />

          <SummaryCard
            title="Signal Quality"
            value={summary?.signalQuality || "Good"}
            subtext={`${summary?.signalQualityValue || 94}% Impedance contact stability`}
            icon={Radio}
            variant="emerald"
            badgeText="FP1 Dry Electrode"
          />

          <SummaryCard
            title="Latest Session"
            value={summary?.latestSessionDuration || "15m 00s"}
            subtext={`Total archived: ${summary?.totalSessions || 4} experimental runs`}
            icon={Clock}
            variant="amber"
            badgeText="Recorded"
          />

          <SummaryCard
            title="Latest Classification"
            value="Not available yet"
            subtext="Awaiting ML inference pipeline"
            icon={Brain}
            variant="slate"
            badgeText="Future Phase"
          />
        </div>

        {/* 3. Middle Section: Live EEG Preview & Brainwave Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Large Panel: Live EEG Preview */}
          <div className="lg:col-span-8 space-y-6">
            <LiveEEGPreview
              deviceName={activeDevice?.name}
              deviceCode={activeDevice?.deviceCode}
            />

            {/* Recent Sessions Table */}
            <RecentSessionsTable
              sessions={summary?.recentSessions || []}
            />
          </div>

          {/* Right Column: Brainwave Spectrum, Device Health & Quick Actions */}
          <div className="lg:col-span-4 space-y-6">
            {/* Brainwave Overview Card */}
            <Card>
              <CardHeader className="py-4">
                <div>
                  <CardTitle className="text-sm font-semibold text-white">
                    Brainwave Spectrum Overview
                  </CardTitle>
                  <p className="text-[11px] text-slate-500">
                    Estimated EEG power spectrum distribution
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <FrequencyBandsChart features={summary?.brainwaveOverview} />
              </CardContent>
            </Card>

            {/* Session Summary Card */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-semibold text-white">
                  Acquisition Run Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                  <span className="text-slate-400">Total Recorded Sessions</span>
                  <span className="font-semibold font-mono text-white">
                    {summary?.totalSessions || 4}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                  <span className="text-slate-400">Latest Session Duration</span>
                  <span className="font-semibold font-mono text-white">
                    {summary?.latestSessionDuration || "15m 00s"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                  <span className="text-slate-400">Average Duration</span>
                  <span className="font-semibold font-mono text-white">
                    {summary?.averageDuration || "17m 10s"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-400">Latest Signal Quality</span>
                  <Badge variant="success" size="sm">
                    {summary?.signalQualityValue || 94}% Good
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Device Health Diagnostics */}
            {summary?.deviceHealth && (
              <DeviceHealthCard health={summary.deviceHealth} />
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Quick Navigation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-1.5">
                <Link href="/live" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
                    <Radio className="w-3.5 h-3.5 text-blue-400" />
                    <span>Open Live EEG Monitor</span>
                  </Button>
                </Link>
                <Link href="/sessions" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Browse All Sessions</span>
                  </Button>
                </Link>
                <Link href="/devices" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
                    <Cpu className="w-3.5 h-3.5 text-slate-400" />
                    <span>Manage Wearable Devices</span>
                  </Button>
                </Link>
                <Link href="/analysis" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
                    <Brain className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Inspect ML Pipeline</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Start New Session Modal */}
      <Modal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        title="Start New EEG Recording Session"
        description="Select an active IoT wearable device to begin streaming and archiving samples."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Target Wearable Device
            </label>
            <div className="space-y-2">
              {(devices || []).map((dev) => (
                <div
                  key={dev.id}
                  onClick={() => setSelectedDeviceId(dev.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    selectedDeviceId === dev.id
                      ? "border-blue-500/40 bg-blue-500/[0.06]"
                      : "border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{dev.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {dev.deviceCode} • FW: {dev.firmwareVersion}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={dev.status === "connected" ? "success" : "warning"}
                      size="sm"
                    >
                      {dev.status}
                    </Badge>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      Batt: {dev.batteryLevel}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 space-y-1">
            <span className="font-semibold text-slate-200 block">Session Configuration:</span>
            <p>Sampling Rate: 512 Hz • Bandpass Filter: 0.5 – 50 Hz • 50 Hz Notch</p>
            <p className="text-[11px] text-slate-500 font-mono">Archive Target: PostgreSQL sessions & eeg_samples</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsStartModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleStartSession}
              isLoading={startSessionMutation.isPending}
              className="gap-2"
            >
              <Play className="w-4 h-4" />
              <span>Begin Session & Stream</span>
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
