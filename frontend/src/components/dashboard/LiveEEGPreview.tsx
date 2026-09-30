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
  const { samples, signalQuality, isStreaming } = useEEGStream(true);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/[0.1] border border-blue-500/[0.15] flex items-center justify-center text-blue-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold text-white">
                Live EEG Stream Preview
              </CardTitle>
              <Badge variant="simulation" size="sm">
                Simulation Mode
              </Badge>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{deviceName}</span>
              <span>•</span>
              <span className="font-mono text-[11px]">{deviceCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/[0.08] text-emerald-400 border border-emerald-500/[0.12] text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Sig {signalQuality}%</span>
          </div>
          <Link href="/live">
            <Button variant="primary" size="sm" className="gap-1.5">
              <span>Open Live View</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Waveform Canvas */}
        <WaveformChart
          samples={samples}
          height={200}
          isStreaming={isStreaming}
          voltageRange={50}
        />

        {/* Telemetry metadata footer */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="text-[10px] uppercase font-mono text-slate-500">
              Sample Rate
            </div>
            <div className="font-semibold text-slate-200 font-mono mt-0.5">
              512 Hz (Hardware)
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="text-[10px] uppercase font-mono text-slate-500">
              Transmission
            </div>
            <div className="font-semibold text-slate-200 font-mono mt-0.5">
              50 Hz Packets
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="text-[10px] uppercase font-mono text-slate-500">
              Electrode
            </div>
            <div className="font-semibold text-slate-200 mt-0.5">
              FP1 (Dry Sensor)
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="text-[10px] uppercase font-mono text-slate-500">
              Channel Count
            </div>
            <div className="font-semibold text-slate-200 font-mono mt-0.5">
              1-Ch Monopolar
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
