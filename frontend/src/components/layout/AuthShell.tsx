"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, ShieldCheck, Radio, Brain } from "lucide-react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

// Mini SVG waveform component with deterministic rounded coordinates to avoid SSR float hydration mismatches
function generateWaveformPath(delay: number = 0): string {
  const points: string[] = [];
  for (let i = 0; i < 60; i++) {
    const x = ((i / 59) * 280).toFixed(2);
    const y = (30 + Math.sin(i * 0.16 + delay) * 14 + Math.sin(i * 0.08) * 6).toFixed(2);
    points.push(`${x},${y}`);
  }
  return `M ${points.join(" L ")}`;
}

const WAVEFORM_PATHS: Record<string, string> = {
  "0": generateWaveformPath(0),
  "1.5": generateWaveformPath(1.5),
  "3": generateWaveformPath(3),
};

function MiniWaveform({ color, delay = 0 }: { color: string; delay?: number }) {
  const pathD = WAVEFORM_PATHS[String(delay)] || generateWaveformPath(delay);

  return (
    <svg viewBox="0 0 280 60" className="w-full h-7 opacity-90" aria-hidden="true" focusable="false">
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        suppressHydrationWarning
      />
    </svg>
  );
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#F7F8F5] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative select-none"
    >
      {/* Main 2-column Auth Container */}
      <div
        className={`w-full max-w-4xl rounded-3xl border border-stone-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] transition-opacity duration-300 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* LEFT COLUMN: Biomedical Platform Identity (Desktop) */}
        <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-8 sm:p-10 bg-[#FAFBF8] border-r border-stone-200/70">
          {/* Top Brand & Title */}
          <div className="space-y-6">
            <Link href="/" aria-label="NeuroPulse Home" className="inline-flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full bg-[#5B6D49] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
                <Activity className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div>
                <span className="font-bold text-[#1C1E1A] tracking-tight text-base block leading-none">
                  NeuroPulse
                </span>
                <span className="text-[10px] tracking-wider uppercase text-stone-500 font-medium mt-0.5 block">
                  IoT Biosensing Platform
                </span>
              </div>
            </Link>

            <div className="space-y-2 pt-2">
              <p className="text-2xl font-serif text-[#1C1E1A] leading-snug tracking-tight">
                Wearable EEG <br />
                <span className="text-[#5B6D49] italic">
                  Monitoring & Analytics
                </span>
              </p>
              <p className="text-xs text-[#5E6659] leading-relaxed">
                Stream real-time brainwave frequencies via ESP32 & TGAM1 ASIC module with cloud-based archival and ML classification.
              </p>
            </div>
          </div>

          {/* Middle Waveform Visualizer */}
          <div className="py-4 space-y-2">
            <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider flex items-center justify-between font-medium">
              <span>Biosignal Rhythm Trace</span>
              <span className="text-[#5B6D49] font-medium bg-[#EDF1E7] px-2 py-0.5 rounded-full border border-[#DEE5D6]">FP1 • 512 Hz</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-1">
              <MiniWaveform color="#5B6D49" delay={0} />
              <MiniWaveform color="#2D7A58" delay={1.5} />
              <MiniWaveform color="#4E5E3E" delay={3} />
            </div>
          </div>

          {/* Bottom 3 Capability Features */}
          <div className="space-y-2.5 pt-4 border-t border-stone-200/70">
            <div className="flex items-center gap-2.5 text-xs text-[#1C1E1A]">
              <div className="w-7 h-7 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49] shrink-0">
                <Radio className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <span className="font-medium">Real-time EEG telemetry</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-[#1C1E1A]">
              <div className="w-7 h-7 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49] shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <span className="font-medium">Direct WebSocket biosignal pipeline</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-[#1C1E1A]">
              <div className="w-7 h-7 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49] shrink-0">
                <Brain className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <span className="font-medium">Neural band ML inference</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Authentication Form Area */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto space-y-6">
            {/* Mobile Brand Header */}
            <div className="lg:hidden flex items-center gap-2.5 mb-2">
              <Link href="/" aria-label="NeuroPulse Home" className="inline-flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#5B6D49] flex items-center justify-center text-white">
                  <Activity className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <span className="font-semibold text-[#1C1E1A] text-sm block">
                    NeuroPulse
                  </span>
                  <span className="text-[9px] font-mono text-[#5B6D49] uppercase tracking-wider block font-medium">
                    IoT Monitoring
                  </span>
                </div>
              </Link>
            </div>

            {/* Header Titles */}
            <header className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-serif text-[#1C1E1A] tracking-tight">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-[#5E6659] leading-relaxed">
                {subtitle}
              </p>
            </header>

            {/* Form Content / Children */}
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
