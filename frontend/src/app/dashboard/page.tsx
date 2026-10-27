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
  Plus,
  Play,
  Cpu,
  RefreshCw,
  BatteryCharging,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("dev-001");

  // Fetch dashboard summary
  const { data: summary, refetch } = useQuery({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setIsStartModalOpen(false);
      router.push("/live");
    },
  });

  const activeDevice = summary?.activeDevice;

  return (
    <AppShell title="Platform Dashboard">
      <div className="space-y-6">
        {/* 1. Header with greeting and Start New Session Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#1C1E1A] tracking-tight">
              Welcome back, {user?.name || "Super Admin NeuroPulse"}
            </h2>
            <p className="text-xs sm:text-sm text-[#5E6659] mt-1">
              Current operational status and telemetry summary of the NeuroPulse research platform.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 rounded-full border-stone-200/90 text-stone-700 hover:bg-stone-100"
            >
              <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
              <span>Refresh</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsStartModalOpen(true)}
              className="gap-2 rounded-full"
            >
              <Plus className="w-4 h-4" />
              <span>Start New Session</span>
            </Button>
          </div>
        </div>

        {/* 2. Top Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="DEVICE STATUS"
            value="Ready"
            subtext={activeDevice ? `${activeDevice.name} (Demo)` : "TGAM1 Headset Alpha"}
            icon={Cpu}
            variant="blue"
            badgeText="Demo • Standby"
          />

          <SummaryCard
            title="RECORDING STATUS"
            value="Standby"
            subtext="Waiting for acquisition"
            icon={Radio}
            variant="blue"
            badgeText="FP1 Monopolar"
          />

          <SummaryCard
            title="TOTAL SESSIONS"
            value={`${summary?.totalSessions || 0}`}
            subtext={summary?.recentSessions?.[0] ? `Latest: ${summary.recentSessions[0].deviceCode}` : "Not started yet"}
            icon={Clock}
            variant="amber"
            badgeText="Archived"
          />

          <SummaryCard
            title="SIGNAL STATUS"
            value="Standby"
            subtext="Waiting for acquisition session"
            icon={Activity}
            variant="blue"
            badgeText="Waiting"
          />
        </div>

        {/* 3. Main Split Section: Live Preview & Sessions (Left) vs Diagnostics (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols): Real-time Preview & Sessions Table */}
          <div className="lg:col-span-8 space-y-6">
            <LiveEEGPreview
              deviceName={activeDevice?.name}
              deviceCode={activeDevice?.deviceCode}
            />

            <RecentSessionsTable
              sessions={summary?.recentSessions || []}
            />
          </div>

          {/* Right Column (4 cols): Hardware Node, Brainwave Spectrum & Diagnostics */}
          <div className="lg:col-span-4 space-y-6">
            {/* Connected Hardware Node Card */}
            <Card className="bg-white border-stone-200/80 rounded-2xl shadow-sm">
              <CardHeader className="py-4 px-6 border-b border-stone-100">
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="text-xs font-semibold text-[#1C1E1A] uppercase tracking-wider font-mono">
                    Connected Wearable Node
                  </CardTitle>
                  <Link href="/devices" className="text-xs text-[#5B6D49] hover:underline font-medium">
                    Manage
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-3 space-y-3">
                <div className="p-4 rounded-2xl bg-[#FAFBF8] border border-stone-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#1C1E1A] text-xs block">
                        {activeDevice?.name || "TGAM1 Headset Alpha"}
                      </span>
                      <span className="text-[10px] font-mono text-[#5B6D49] block mt-0.5 font-medium">
                        {activeDevice?.deviceCode || "EEG-001"} • FW {activeDevice?.firmwareVersion || "v2.1.0"}
                      </span>
                    </div>
                    <Badge variant="success" size="sm">
                      Connected
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#5E6659] pt-2 border-t border-stone-200/70">
                    <span className="flex items-center gap-1 font-mono font-medium text-[#1C1E1A]">
                      <BatteryCharging className="w-3.5 h-3.5 text-[#5B6D49]" />
                      <span>{activeDevice?.batteryLevel || 94}% Battery</span>
                    </span>
                    <span className="font-mono text-stone-500">LiPo 3.7V</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Brainwave Spectrum Overview */}
            <Card className="bg-white border-stone-200/80 rounded-2xl shadow-sm">
              <CardHeader className="py-4 px-6 border-b border-stone-100">
                <CardTitle className="text-xs font-semibold text-[#1C1E1A] uppercase tracking-wider font-mono">
                  Brainwave Spectrum Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-3">
                <FrequencyBandsChart features={summary?.brainwaveOverview} />
              </CardContent>
            </Card>

            {/* Device Health Diagnostics */}
            {summary?.deviceHealth && (
              <DeviceHealthCard health={summary.deviceHealth} />
            )}
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
            <label className="text-xs font-semibold text-[#1C1E1A] uppercase tracking-wider font-mono">
              Target Wearable Device
            </label>
            <div className="space-y-2">
              {(devices || []).map((dev) => (
                <div
                  key={dev.id}
                  onClick={() => setSelectedDeviceId(dev.id)}
                  className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                    selectedDeviceId === dev.id
                      ? "border-[#5B6D49] bg-[#EDF1E7]/70"
                      : "border-stone-200 hover:border-stone-300 bg-[#FAFBF8]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center text-[#5B6D49]">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-[#1C1E1A]">{dev.name}</div>
                      <div className="text-[11px] font-mono text-stone-500">
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
                    <div className="text-[10px] text-stone-500 mt-1 font-mono">
                      Batt: {dev.batteryLevel}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAFBF8] border border-stone-200/80 text-xs text-[#5E6659] space-y-1">
            <span className="font-semibold text-[#1C1E1A] block">Session Configuration:</span>
            <p>Sampling Rate: 512 Hz • Bandpass Filter: 0.5 – 50 Hz • 50 Hz Notch</p>
            <p className="text-[11px] text-stone-500 font-mono">Archive Target: PostgreSQL sessions & eeg_samples</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsStartModalOpen(false)}
              className="rounded-full border-stone-200 text-stone-700"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setIsStartModalOpen(false);
                router.push("/live");
              }}
              className="gap-2 rounded-full"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Open Live Session</span>
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
