"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, ShieldCheck, Radio, Brain, Sparkles } from "lucide-react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

// Mini SVG waveform component with zero JS overhead (instant paint, 0ms TBT)
function MiniWaveform({ color, delay = 0 }: { color: string; delay?: number }) {
  const points = [];
  for (let i = 0; i < 60; i++) {
    points.push(Math.sin(i * 0.16 + delay) * 14 + Math.sin(i * 0.08) * 6);
  }
  const pathD = points
    .map((y, i) => `${(i / (points.length - 1)) * 280},${30 + y}`)
    .join(" L ");

  return (
    <svg viewBox="0 0 280 60" className="w-full h-7 opacity-80" aria-hidden="true" focusable="false">
      <path
        d={`M ${pathD}`}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
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
      className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-[-20%] left-[-10%] w-[650px] h-[650px] rounded-full bg-blue-600/[0.04] blur-[140px] pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[550px] h-[550px] rounded-full bg-cyan-500/[0.03] blur-[120px] pointer-events-none" aria-hidden="true" />

      {/* Main 2-column Auth Container */}
      <div
        className={`w-full max-w-4xl rounded-2xl border border-white/[0.06] bg-[#0c1220]/90 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {/* LEFT COLUMN: Biomedical Platform Identity (Desktop) */}
        <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-8 bg-gradient-to-b from-white/[0.02] to-transparent border-r border-white/[0.04] overflow-hidden">
          {/* Subtle gradient spot */}
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-blue-500/[0.08] blur-3xl pointer-events-none" aria-hidden="true" />

          {/* Top Brand & Title */}
          <div className="relative z-10 space-y-6">
            <Link href="/" aria-label="EEG Wearable Platform Home" className="inline-flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
                <Activity className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <span className="font-semibold text-white tracking-tight text-sm block">
                  EEG Wearable Platform
                </span>
                <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest block font-medium">
                  IoT Biosensing
                </span>
              </div>
            </Link>

            <div className="space-y-2 pt-2">
              <p className="text-xl font-bold text-white leading-snug tracking-tight">
                IoT Wearable EEG <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  Monitoring System
                </span>
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Stream real-time brainwave frequencies via ESP32 & TGAM1 ASIC module with cloud-based data archival.
              </p>
            </div>
          </div>

          {/* Middle Waveform Visualizer */}
          <div className="relative z-10 py-4 space-y-1">
            <div className="text-[10px] font-mono text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between font-medium">
              <span>Biosignal Rhythm Trace</span>
              <span className="text-cyan-300 font-semibold">FP1 • 512 Hz</span>
            </div>
            <div className="p-3 rounded-xl bg-black/30 border border-white/[0.04] space-y-1">
              <MiniWaveform color="#3b82f6" delay={0} />
              <MiniWaveform color="#22d3ee" delay={1.5} />
              <MiniWaveform color="#818cf8" delay={3} />
            </div>
          </div>

          {/* Bottom 3 Capability Features */}
          <div className="relative z-10 space-y-2.5 pt-2 border-t border-white/[0.04]">
            <div className="flex items-center gap-2.5 text-xs text-slate-200">
              <div className="w-6 h-6 rounded-lg bg-blue-500/[0.1] border border-blue-500/[0.2] flex items-center justify-center text-blue-400 shrink-0">
                <Radio className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <span className="font-medium">Real-time EEG monitoring</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-slate-200">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/[0.1] border border-cyan-500/[0.2] flex items-center justify-center text-cyan-400 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <span className="font-medium">Biosignal data acquisition</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-slate-200">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/[0.1] border border-indigo-500/[0.2] flex items-center justify-center text-indigo-400 shrink-0">
                <Brain className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <span className="font-medium">Research data analysis</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Authentication Form Area */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            {/* Mobile Brand Header */}
            <div className="lg:hidden flex items-center gap-2.5 mb-2">
              <Link href="/" aria-label="EEG Wearable Platform Home" className="inline-flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white">
                  <Activity className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <span className="font-semibold text-white text-sm block">
                    EEG Wearable Platform
                  </span>
                  <span className="text-[9px] font-mono text-cyan-300 uppercase tracking-wider block font-medium">
                    IoT Monitoring
                  </span>
                </div>
              </Link>
            </div>

            {/* Header Titles */}
            <header className="space-y-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
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
