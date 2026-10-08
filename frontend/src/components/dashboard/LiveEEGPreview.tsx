"use client";

import React from "react";
import Link from "next/link";
import { WaveformChart } from "@/components/eeg/WaveformChart";
import { useEEGStream } from "@/hooks/useEEGStream";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Radio, Activity } from "lucide-react";

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
    <Card className="overflow-hidden">
      <CardHeader className="py-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold text-white">
                Live EEG Stream Preview
              </CardTitle>
              <Badge variant="simulation" size="sm">
                Demo Mode
              </Badge>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>{deviceName}</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-[11px] text-cyan-400">{deviceCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-slate-300 border border-slate-800 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Standby • Ready</span>
          </div>
          <Link href="/live">
            <Button variant="primary" size="sm" className="gap-1.5">
              <span>Open Live Session</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <div className="text-[10px] uppercase font-mono text-slate-500">
              Sample Rate
            </div>
            <div className="font-medium text-slate-200 font-mono mt-0.5">
              512 Hz (Hardware Spec)
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <div className="text-[10px] uppercase font-mono text-slate-500">
              Transmission
            </div>
            <div className="font-medium text-slate-200 font-mono mt-0.5">
              50 Hz Packets
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <div className="text-[10px] uppercase font-mono text-slate-500">
              Electrode
            </div>
            <div className="font-medium text-slate-200 mt-0.5">
              FP1 (Dry Sensor)
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <div className="text-[10px] uppercase font-mono text-slate-500">
              Channel Count
            </div>
            <div className="font-medium text-slate-200 font-mono mt-0.5">
              1-Ch Monopolar
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
