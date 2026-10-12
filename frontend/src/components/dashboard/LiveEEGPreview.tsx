"use client";

import React from "react";
import Link from "next/link";
import { WaveformChart } from "@/components/eeg/WaveformChart";
import { useEEGStream } from "@/hooks/useEEGStream";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Radio } from "lucide-react";

interface LiveEEGPreviewProps {
  deviceName?: string;
  deviceCode?: string;
}

export function LiveEEGPreview({
  deviceName = "TGAM1 Wearable Headset Alpha",
  deviceCode = "EEG-001",
}: LiveEEGPreviewProps) {
  // Standby stream by default - acquisition only begins on explicit user action in Live EEG
  const { samples, status, isStreaming } = useEEGStream(false);

  return (
    <Card className="overflow-hidden bg-white border-stone-200/80 rounded-2xl shadow-sm">
      <CardHeader className="py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold text-[#1C1E1A]">
                Live EEG Stream Preview
              </CardTitle>
              <Badge variant="simulation" size="sm">
                Demo Mode
              </Badge>
            </div>
            <p className="text-xs text-[#5E6659] flex items-center gap-1.5 mt-0.5">
              <span>{deviceName}</span>
              <span className="text-stone-300">•</span>
              <span className="font-mono text-[11px] text-[#5B6D49] font-medium bg-[#EDF1E7] px-2 py-0.2 rounded-full border border-[#DEE5D6]">
                {deviceCode}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAFBF8] text-[#5E6659] border border-stone-200 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
            <span>Standby • Ready</span>
          </div>
          <Link href="/live">
            <Button variant="primary" size="sm" className="gap-1.5 rounded-full">
              <span>Open Live Session</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Waveform Canvas - in Standby / Ready mode */}
        <WaveformChart
          samples={samples}
          height={200}
          status={status}
          isStreaming={isStreaming}
          voltageRange={50}
          emptyStateMessage="EEG Acquisition Standby"
          emptyStateSubtext="Device is ready. Click Open Live Session to begin recording."
        />

        {/* Telemetry metadata footer */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-2xl bg-[#FAFBF8] border border-stone-200/80">
            <div className="text-[10px] uppercase font-mono text-stone-500">
              Sample Rate
            </div>
            <div className="font-semibold text-[#1C1E1A] font-mono mt-0.5">
              512 Hz (Hardware Spec)
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-[#FAFBF8] border border-stone-200/80">
            <div className="text-[10px] uppercase font-mono text-stone-500">
              Transmission
            </div>
            <div className="font-semibold text-[#1C1E1A] font-mono mt-0.5">
              50 Hz Packets
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-[#FAFBF8] border border-stone-200/80">
            <div className="text-[10px] uppercase font-mono text-stone-500">
              Electrode
            </div>
            <div className="font-semibold text-[#1C1E1A] mt-0.5">
              FP1 (Dry Sensor)
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-[#FAFBF8] border border-stone-200/80">
            <div className="text-[10px] uppercase font-mono text-stone-500">
              Channel Count
            </div>
            <div className="font-semibold text-[#1C1E1A] font-mono mt-0.5">
              1-Ch Monopolar
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
