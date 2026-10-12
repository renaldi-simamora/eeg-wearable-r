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
    <Card className={`bg-white border-stone-200/80 rounded-2xl shadow-sm ${className}`}>
      <CardHeader className="py-4 px-6 border-b border-stone-200/80">
        <div>
          <CardTitle className="text-xs font-semibold text-[#1C1E1A] uppercase tracking-wider font-mono">
            Hardware & IoT Telemetry
          </CardTitle>
          <p className="text-[11px] text-[#5E6659] mt-0.5">
            ESP32 micro-controller and TGAM1 sensor operational diagnostics
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-4 space-y-2.5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div
              key={it.label}
              className="p-3 rounded-2xl bg-[#FAFBF8] border border-stone-200/80 flex items-center justify-between hover:border-stone-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-stone-500 block font-normal">
                    {it.label}
                  </span>
                  <span className="text-xs font-semibold text-[#1C1E1A] font-mono block">
                    {it.value}
                  </span>
                </div>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                it.status === "operational" ? "bg-[#5B6D49]" : "bg-amber-500"
              }`} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
