import React from "react";
import { DeviceHealthInfo } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Cpu, Wifi, BatteryCharging, Clock, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface DeviceHealthCardProps {
  health: DeviceHealthInfo;
  className?: string;
}

export function DeviceHealthCard({ health, className = "" }: DeviceHealthCardProps) {
  const items = [
    {
      label: "EEG Module (ASIC)",
      value: health.eegModuleStatus,
      icon: Cpu,
      status: "operational",
    },
    {
      label: "ESP32 Controller",
      value: health.esp32Status,
      icon: ShieldCheck,
      status: "operational",
    },
    {
      label: "Wi-Fi Telemetry",
      value: health.wifiStatus,
      icon: Wifi,
      status: "operational",
    },
    {
      label: "Battery Level",
      value: `${health.batteryLevel}% (LiPo 3.7V)`,
      icon: BatteryCharging,
      status: health.batteryLevel > 20 ? "operational" : "warning",
    },
    {
      label: "Last Hardware Sync",
      value: formatDate(health.lastSync),
      icon: Clock,
      status: "operational",
    },
  ];

  return (
    <Card className={className}>
      <CardHeader className="py-4">
        <div>
          <CardTitle className="text-sm font-semibold text-white">
            Hardware & IoT Telemetry
          </CardTitle>
          <p className="text-[11px] text-slate-500">
            ESP32 micro-controller and TGAM1 sensor operational diagnostics
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-1 space-y-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div
              key={it.label}
              className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block">
                    {it.label}
                  </span>
                  <span className="text-xs font-semibold text-slate-200 font-mono block">
                    {it.value}
                  </span>
                </div>
              </div>
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                it.status === "operational" ? "bg-emerald-500" : "bg-amber-500"
              }`} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
