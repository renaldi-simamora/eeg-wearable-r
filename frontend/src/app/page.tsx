"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WaveformChart } from "@/components/eeg/WaveformChart";
import { generateMockEEGSeries, eegBandInfo } from "@/lib/mock/eeg";
import {
  Activity,
  ArrowRight,
  Cpu,
  Database,
  Radio,
  Wifi,
  Brain,
  ShieldCheck,
  Server,
  Layers,
  ChevronRight,
  Sparkles,
  Zap,
  CheckCircle2,
  BarChart3,
  Sliders,
  ArrowUpRight,
  CircleDot,
  Fingerprint,
  RefreshCw,
  Play,
  Pause,
  Home,
  Grid,
  Wallet,
  Bell,
  Settings,
  Info,
  ExternalLink,
} from "lucide-react";

export default function LandingPage() {
  const [demoSamples, setDemoSamples] = useState(() => generateMockEEGSeries(75));
  const [isStreaming, setIsStreaming] = useState(true);
  const [activeDockTab, setActiveDockTab] = useState<"overview" | "oscilloscope" | "bands" | "hardware" | "ml">("overview");
  const [selectedBand, setSelectedBand] = useState<string>("All");
  const [calibrating, setCalibrating] = useState(false);
  const [calibrateSuccess, setCalibrateSuccess] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<{ freq: string; power: string; band: string } | null>(null);

  // Stagger live streaming: activate on user interaction or after 12s idle
  // Keeps main-thread Total Blocking Time (TBT) strictly at 0ms during initial page load
  useEffect(() => {
    if (!isStreaming) return;
    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    const startStreaming = () => {
      if (interval) return;
      interval = setInterval(() => {
        setDemoSamples((prev) => {
          const nextTime = (prev[prev.length - 1]?.timestamp || 0) + 20;
          const alpha = Math.sin(nextTime * 0.065) * 18;
          const beta = Math.sin(nextTime * 0.13) * 7;
          const theta = Math.sin(nextTime * 0.035) * 9;
          const noise = (Math.random() - 0.5) * 4;
          const val = Number((alpha + beta + theta + noise).toFixed(2));
          const newSample = {
            timestamp: nextTime,
            rawEEG: val,
            signalQuality: 94 + Math.floor(Math.random() * 5),
          };
          return [...prev.slice(1), newSample];
        });
      }, 600);
    };

    timeout = setTimeout(startStreaming, 12000);
    const triggerEvents = ["scroll", "pointerdown", "keydown"];
    const handleTrigger = () => {
      startStreaming();
      cleanupListeners();
    };
    const cleanupListeners = () => {
      triggerEvents.forEach((ev) => window.removeEventListener(ev, handleTrigger));
    };
    triggerEvents.forEach((ev) => window.addEventListener(ev, handleTrigger, { passive: true, once: true }));

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
      cleanupListeners();
    };
  }, [isStreaming]);

  // Spectrum Equalizer bar data mapping frequency distribution
  const spectrumBars = [
    { freq: "1.5 Hz", power: "14.2 µV²", height: 32, band: "Delta" },
    { freq: "3.0 Hz", power: "18.5 µV²", height: 44, band: "Delta" },
    { freq: "5.0 Hz", power: "24.1 µV²", height: 58, band: "Theta" },
    { freq: "7.0 Hz", power: "31.8 µV²", height: 68, band: "Theta" },
    { freq: "9.0 Hz", power: "46.2 µV²", height: 92, band: "Alpha" },
    { freq: "10.5 Hz", power: "54.8 µV²", height: 100, band: "Alpha" },
    { freq: "12.0 Hz", power: "42.0 µV²", height: 82, band: "Alpha" },
    { freq: "16.0 Hz", power: "26.4 µV²", height: 52, band: "Beta" },
    { freq: "22.0 Hz", power: "32.1 µV²", height: 64, band: "Beta" },
    { freq: "28.0 Hz", power: "19.5 µV²", height: 42, band: "Beta" },
    { freq: "35.0 Hz", power: "15.0 µV²", height: 34, band: "Gamma" },
    { freq: "42.0 Hz", power: "11.2 µV²", height: 26, band: "Gamma" },
  ];

  const handleCalibrate = () => {
    setCalibrating(true);
    setTimeout(() => {
      setCalibrating(false);
      setCalibrateSuccess(true);
      setTimeout(() => setCalibrateSuccess(false), 3000);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* Skip to Main Content Link for WCAG & Screen Reader Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2.5 focus:bg-cyan-500 focus:text-slate-950 focus:rounded-lg focus:font-bold focus:shadow-2xl focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Dark Navbar with Aurion Styling */}
      <Navbar theme="dark" />

      <main id="main-content" role="main" aria-label="Main Content" className="flex-1">

      {/* Hero Section with Dual Volumetric Spotlights */}
      <section id="overview" className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        {/* Left Volumetric Spotlight Cone */}
        <div
          className="absolute -top-36 left-[5%] md:left-[12%] w-[420px] sm:w-[580px] h-[820px] pointer-events-none opacity-50 md:opacity-75 z-0"
          style={{
            background:
              "linear-gradient(145deg, rgba(125, 211, 252, 0.45) 0%, rgba(56, 189, 248, 0.2) 25%, rgba(14, 165, 233, 0.04) 55%, transparent 75%)",
            clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
            transform: "rotate(-14deg)",
            filter: "blur(50px)",
          }}
        />

        {/* Right Volumetric Spotlight Cone */}
        <div
          className="absolute -top-36 right-[5%] md:right-[12%] w-[420px] sm:w-[580px] h-[820px] pointer-events-none opacity-50 md:opacity-75 z-0"
          style={{
            background:
              "linear-gradient(215deg, rgba(125, 211, 252, 0.45) 0%, rgba(56, 189, 248, 0.2) 25%, rgba(14, 165, 233, 0.04) 55%, transparent 75%)",
            clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
            transform: "rotate(14deg)",
            filter: "blur(50px)",
          }}
        />

        {/* Center Ambient Glow */}
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 w-[750px] h-[550px] pointer-events-none opacity-25 z-0"
          style={{
            background: "radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, rgba(30, 58, 138, 0.12) 55%, transparent 75%)",
            filter: "blur(80px)",
          }}
        />

        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b22_1px,transparent_1px),linear-gradient(to_bottom,#1e293b22_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Eyebrow Pill with Horizontal Connecting Lines (Matching Reference Image) */}
          <div className="inline-flex items-center justify-center gap-3 mb-6">
            <div className="h-[1px] w-8 sm:w-16 bg-gradient-to-r from-transparent to-slate-600" />
            <div className="px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] sm:text-xs font-medium text-slate-300 tracking-wide flex items-center gap-2 shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Simplify your research workflow</span>
            </div>
            <div className="h-[1px] w-8 sm:w-16 bg-gradient-to-l from-transparent to-slate-600" />
          </div>

          {/* Main Headline (2-Line layout directly matching reference image) */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.14] max-w-4xl mx-auto">
            Enhance your <br />
            <span className="text-white">neural research with NeuroPulse</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Streamline your wearable EEG monitoring and neural signal classification with our intuitive, scalable IoT platform. Designed for biomedical research and machine learning.
          </p>

          {/* Centered White Pill Action Button (Single centered button matching reference image) */}
          <div className="mt-8 flex items-center justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-3.5 rounded-full bg-white text-slate-950 hover:bg-slate-100 font-semibold text-sm transition-all shadow-xl hover:shadow-cyan-500/20 active:scale-95 inline-block text-center cursor-pointer"
            >
              Get started
            </Link>
          </div>

          {/* Layered Floating Cards Showcase (Central Visual from Reference Image) */}
          <div className="mt-14 sm:mt-18 relative max-w-5xl mx-auto">
            {/* Ambient lighting glow underneath the deck */}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-600/15 via-cyan-500/15 to-transparent blur-3xl pointer-events-none -bottom-10" />

            {/* Base Hardware/Dashboard Deck Container */}
            <div className="relative rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-[0_0_90px_rgba(14,165,233,0.14)] p-4 sm:p-7 backdrop-blur-xl">
              {/* Internal Left Dock + Main Canvas Grid */}
              <div className="flex gap-4 sm:gap-6">
                {/* Vertical Sidebar Dock (Interactive, matching the Left Sidebar in Reference Image) */}
                <div className="hidden sm:flex flex-col items-center justify-between py-3 px-1.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 w-14 shrink-0" role="toolbar" aria-label="Workstation Tools">
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveDockTab("overview")}
                      aria-label="Overview dock tab"
                      title="Overview"
                      className={`w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        activeDockTab === "overview"
                          ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <Home className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setActiveDockTab("oscilloscope")}
                      aria-label="Live Oscilloscope dock tab"
                      title="Live Oscilloscope"
                      className={`w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        activeDockTab === "oscilloscope"
                          ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <Activity className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setActiveDockTab("bands")}
                      aria-label="Frequency Bands FFT dock tab"
                      title="Frequency Bands FFT"
                      className={`w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        activeDockTab === "bands"
                          ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setActiveDockTab("hardware")}
                      aria-label="Hardware Telemetry dock tab"
                      title="Hardware Telemetry"
                      className={`w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        activeDockTab === "hardware"
                          ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <Cpu className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                  <Link
                    href="/settings"
                    title="System Settings"
                    aria-label="System Settings"
                    className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4" aria-hidden="true" />
                    <span className="sr-only">System Settings</span>
                  </Link>
                </div>

                {/* Main Content Area: Dynamic based on activeDockTab */}
                <div className="flex-1 space-y-5">
                  {activeDockTab === "overview" && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 relative z-10">
                        {/* Floating Left Card: Biosignal Telemetry & Sensor Contact */}
                        <div className="md:col-span-6 rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-700/60 p-5 text-left shadow-2xl space-y-4 transform md:-rotate-1 hover:rotate-0 transition-transform duration-300">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400">
                                <Info className="w-3.5 h-3.5" aria-hidden="true" />
                              </div>
                              <span className="text-slate-400 font-medium text-xs">
                                Active Signal Telemetry
                              </span>
                            </div>
                            <Link
                              href="/live"
                              title="Inspect Live Telemetry"
                              aria-label="Inspect Live Telemetry"
                              className="w-8 h-8 min-h-[36px] min-w-[36px] rounded-full bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer hover:bg-slate-700 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" aria-hidden="true" />
                              <span className="sr-only">Inspect Live Telemetry</span>
                            </Link>
                          </div>

                          <div>
                            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight flex items-baseline gap-2">
                              <span>98.4% Quality</span>
                              <span className="text-xs font-mono text-cyan-300 font-normal">512 Hz</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" aria-hidden="true" />
                                +12% vs last session
                              </span>
                              <span className="text-xs text-slate-300">
                                Low Noise Floor (-58 dBm)
                              </span>
                            </div>
                          </div>

                          {/* Interactive Sub-items (TGAM1 Forehead ASIC + ESP32 Wi-Fi Node) */}
                          <div className="space-y-2 pt-2 border-t border-slate-800/80">
                            {/* Device Row 1: TGAM1 */}
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                                  <Brain className="w-4 h-4" aria-hidden="true" />
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                                    <span>TGAM1 ASIC Forehead</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    Electrode FP1 • 57,600 Baud
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={handleCalibrate}
                                disabled={calibrating}
                                aria-label="Calibrate TGAM1 ASIC electrode"
                                className="px-3.5 py-2 min-h-[38px] rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-xs font-mono text-cyan-300 cursor-pointer transition-all flex items-center justify-center"
                              >
                                {calibrating ? "Checking..." : calibrateSuccess ? "Verified ✓" : "Calibrate"}
                              </button>
                            </div>

                            {/* Device Row 2: ESP32 */}
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300">
                                  <Wifi className="w-4 h-4" aria-hidden="true" />
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                                    <span>ESP32 Wi-Fi Node</span>
                                    <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/80 px-1 rounded border border-emerald-800/60 font-semibold">
                                      ONLINE
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    2.4 GHz • WebSocket 50 Hz
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono text-xs font-bold text-slate-200">
                                28ms Latency
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Floating Right Card: Monthly Spectral Band Power & Equalizer Bar Chart */}
                        <div className="md:col-span-6 rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-700/60 p-5 text-left shadow-2xl space-y-4 transform md:rotate-1 hover:rotate-0 transition-transform duration-300 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-blue-400">
                                  <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                                </div>
                                <span className="text-slate-300 font-medium text-xs">
                                  Spectral Band Power
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {["All", "Alpha", "Beta"].map((b) => (
                                  <button
                                    key={b}
                                    onClick={() => setSelectedBand(b)}
                                    aria-label={`Filter by ${b} frequency band`}
                                    className={`text-xs font-mono px-3 py-1.5 min-h-[36px] rounded-lg cursor-pointer transition-colors ${
                                      selectedBand === b
                                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold"
                                        : "text-slate-400 hover:text-slate-200 border border-transparent"
                                    }`}
                                  >
                                    {b}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                                38.4 µV² Alpha Peak
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                                  +15% Dominant
                                </span>
                                <span className="text-xs text-slate-300">
                                  8 – 13 Hz Resting State Rhythms
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                              <span>FFT Spectrum (1 - 50 Hz)</span>
                              <span className="text-cyan-300 font-semibold">
                                {hoveredBar ? `${hoveredBar.band}: ${hoveredBar.freq} (${hoveredBar.power})` : "Hover bar to inspect"}
                              </span>
                            </div>

                            {/* Vibrant Equalizer Bar Chart (Matching the exact look in the reference image) */}
                            <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-28 pt-2 px-3 bg-slate-950/60 rounded-xl border border-slate-800/80 relative">
                              {spectrumBars.map((item, idx) => {
                                const isMatch = selectedBand === "All" || selectedBand === item.band;
                                return (
                                  <div
                                    key={idx}
                                    onMouseEnter={() => setHoveredBar({ freq: item.freq, power: item.power, band: item.band })}
                                    onMouseLeave={() => setHoveredBar(null)}
                                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                                  >
                                    <div
                                      className={`w-full rounded-t transition-all duration-300 ${
                                        isMatch
                                          ? "bg-gradient-to-t from-blue-700 via-blue-500 to-cyan-400 group-hover:brightness-125 shadow-md shadow-cyan-500/20"
                                          : "bg-slate-800 opacity-40"
                                      }`}
                                      style={{ height: `${item.height}%` }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-300">
                            <span>Sampling: 512 SPS (FreeRTOS)</span>
                            <span className="text-cyan-300 font-semibold">
                              Alpha Rhythm Dominant
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Lower Row Inside Dashboard Frame */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
                        {/* Lower Left Card: Cashflow / Real-time Trace with Play/Pause Control */}
                        <div className="md:col-span-7 rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-left flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setIsStreaming(!isStreaming)}
                              aria-label={isStreaming ? "Pause Live Trace" : "Resume Live Trace"}
                              className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 hover:bg-cyan-500/30 transition-colors cursor-pointer"
                              title={isStreaming ? "Pause Live Trace" : "Resume Live Trace"}
                            >
                              {isStreaming ? <Pause className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4 fill-cyan-400" aria-hidden="true" />}
                            </button>
                            <div>
                              <div className="text-xs font-semibold text-white flex items-center gap-2">
                                <span>Raw Oscilloscope (FP1)</span>
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                              </div>
                              <div className="text-[11px] text-slate-300 font-mono">
                                ±50 µV Scale • {isStreaming ? "Live 50 Hz Stream" : "Stream Paused"}
                              </div>
                            </div>
                          </div>
                          <div className="w-36 h-9 hidden sm:block">
                            <WaveformChart samples={demoSamples.slice(-25)} height={36} voltageRange={45} isStreaming={isStreaming} />
                          </div>
                        </div>

                        {/* Lower Right Card: ML Classification Status */}
                        <div className="md:col-span-5 rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-left flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                              <span>ML Classification Pipeline</span>
                            </div>
                            <div className="text-[11px] text-slate-300 font-mono">
                              Ready for SVM, RF & XGBoost
                            </div>
                          </div>
                          <Link
                            href="/analysis"
                            aria-label="View Machine Learning Analysis"
                            title="View Machine Learning Analysis"
                            className="w-8 h-8 min-h-[36px] min-w-[36px] rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" aria-hidden="true" />
                            <span className="sr-only">View Machine Learning Analysis</span>
                          </Link>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Dock View 2: Full Oscilloscope View */}
                  {activeDockTab === "oscilloscope" && (
                    <div className="rounded-2xl bg-slate-900/90 border border-slate-700/80 p-5 text-left space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-cyan-400" />
                          <span className="font-semibold text-sm text-white">Full Raw EEG Oscilloscope</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                            50 Hz Live
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsStreaming(!isStreaming)}
                            aria-label={isStreaming ? "Pause raw EEG trace" : "Resume raw EEG trace"}
                            className="px-3.5 py-2 min-h-[40px] rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                          >
                            {isStreaming ? <Pause className="w-3.5 h-3.5" aria-hidden="true" /> : <Play className="w-3.5 h-3.5" aria-hidden="true" />}
                            <span>{isStreaming ? "Pause" : "Resume"}</span>
                          </button>
                          <Link
                            href="/live"
                            className="px-3.5 py-2 min-h-[40px] rounded-lg bg-cyan-600 text-xs text-white hover:bg-cyan-500 inline-flex items-center text-center cursor-pointer font-medium"
                          >
                            Full Monitor →
                          </Link>
                        </div>
                      </div>
                      <WaveformChart samples={demoSamples} height={180} voltageRange={50} isStreaming={isStreaming} />
                    </div>
                  )}

                  {/* Dock View 3: Frequency Bands View */}
                  {activeDockTab === "bands" && (
                    <div className="rounded-2xl bg-slate-900/90 border border-slate-700/80 p-5 text-left space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-white">5-Band FFT Decomposition</span>
                        <span className="text-xs font-mono text-cyan-400">Total Power: 100%</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {eegBandInfo.map((b) => (
                          <div key={b.name} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                            <span className="text-[10px] font-mono text-slate-400 block">{b.range}</span>
                            <div className="text-base font-bold text-white">{b.name}</div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-2">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  backgroundColor: b.color,
                                  width: b.name === "Alpha" ? "42%" : b.name === "Beta" ? "24%" : "12%",
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dock View 4: Hardware Topology View */}
                  {activeDockTab === "hardware" && (
                    <div className="rounded-2xl bg-slate-900/90 border border-slate-700/80 p-5 text-left space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-white">Wearable IoT Hardware Topology</span>
                        <Link href="/devices" className="text-xs text-cyan-400 hover:underline py-1.5 min-h-[36px] inline-flex items-center">
                          Device Registry →
                        </Link>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                          <div className="flex items-center gap-2 text-white font-semibold">
                            <Brain className="w-4 h-4 text-cyan-400" />
                            <span>NeuroSky TGAM1 ASIC</span>
                          </div>
                          <div className="text-slate-400 space-y-1 text-[11px]">
                            <div>Electrode: FP1 Single-Channel Dry</div>
                            <div>Reference: Ear Clip (A1/A2)</div>
                            <div>Baud Rate: 57,600 bps UART</div>
                            <div>Raw Output: 512 Samples/Sec</div>
                          </div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                          <div className="flex items-center gap-2 text-white font-semibold">
                            <Cpu className="w-4 h-4 text-blue-400" />
                            <span>Espressif ESP32-WROOM</span>
                          </div>
                          <div className="text-slate-400 space-y-1 text-[11px]">
                            <div>MCU: Dual-Core Xtensa LX6 @ 240MHz</div>
                            <div>Wireless: 2.4 GHz Wi-Fi 802.11 b/g/n</div>
                            <div>Gateway: WebSocket 50 Hz Packetizer</div>
                            <div>Latency: &lt; 28 ms roundtrip</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech / Logoipsum Row (Directly Matching the 5 Pill Capsules in Reference Image) */}
      <section id="tech" className="py-10 bg-[#070b14] border-y border-slate-800/80 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 md:gap-6">
            {[
              {
                name: "NeuroSky TGAM1",
                role: "Biosignal ASIC",
                svg: (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                    <line x1="12" y1="2" x2="12" y2="4" />
                    <line x1="12" y1="20" x2="12" y2="22" />
                  </svg>
                ),
              },
              {
                name: "Espressif ESP32",
                role: "Dual-Core MCU",
                svg: (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-400" fill="currentColor" aria-hidden="true" focusable="false">
                    <path d="M12 2L3 9l9 7 9-7-9-7zm0 18l-9-7 1.5-1.2L12 17.5l7.5-5.7L21 13l-9 7z" />
                  </svg>
                ),
              },
              {
                name: "Go Gin Gateway",
                role: "REST & WebSocket",
                svg: (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="4" fill="currentColor" />
                    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m14.14-14.14l-1.41 1.41" />
                  </svg>
                ),
              },
              {
                name: "PostgreSQL 16",
                role: "Time-Series Store",
                svg: (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-sky-400" fill="currentColor" aria-hidden="true" focusable="false">
                    <circle cx="8" cy="12" r="5" />
                    <circle cx="16" cy="12" r="5" fillOpacity="0.6" />
                  </svg>
                ),
              },
              {
                name: "Machine Learning",
                role: "SVM / RF Classifier",
                svg: (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                ),
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="px-5 py-2.5 rounded-full bg-slate-900/90 border border-slate-700/80 hover:border-cyan-500/60 text-xs font-semibold text-white flex items-center gap-2.5 transition-all hover:scale-105 shadow-md shadow-black/40 cursor-default group"
              >
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                  {item.svg}
                </div>
                <span>{item.name}</span>
                <span className="text-[10px] text-slate-400 font-mono border-l border-slate-700 pl-2">
                  {item.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section (Directly Matching "How our platform makes your workflow easier" in Reference Image) */}
      <section id="workflow" className="py-24 bg-[#070b14] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Eyebrow & Headline matching the exact layout in the reference image */}
          <div className="text-left mb-14 space-y-3">
            <div className="inline-flex items-center gap-2">
              <span className="px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-400">
                Our workflow
              </span>
              <div className="h-[1px] w-12 bg-slate-800" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              How our platform makes your <br />
              workflow easier
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              An integrated end-to-end architecture bridging wearable neuro-sensors with real-time web telemetry and future machine learning models.
            </p>
          </div>

          {/* Cards Grid (3 Cards matching the reference layout) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Link Your Wearables */}
            <div className="rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/90 p-6 flex flex-col justify-between space-y-6 hover:border-slate-700 transition-all shadow-xl group">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Link Your Wearables</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Connect your single-channel dry forehead electrode (FP1) with the TGAM1 front-end ASIC in minutes to acquire microvolt neural signals.
                </p>
              </div>

              {/* Floating Mini Card Preview (Matching Left Card in Reference Image) */}
              <div className="rounded-xl bg-slate-950/90 p-4 border border-slate-800/80 space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Active Electrode FP1</span>
                  </span>
                  <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                    <ChevronRight className="w-2.5 h-2.5" />
                  </div>
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  98.4% Quality
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">+12% Stability</span>
                  <span className="text-cyan-400">TGAM1 ASIC</span>
                </div>
              </div>
            </div>

            {/* Card 2: Integrate Your Signals (Signature Concentric Circular Radar Graphic!) */}
            <div className="rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/90 p-6 flex flex-col justify-between space-y-6 hover:border-slate-700 transition-all shadow-xl group relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <h3 className="text-lg font-bold text-white">Integrate Your Signals</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  ESP32 digitizes biosignals and securely transmits encrypted telemetry over 2.4 GHz Wi-Fi to the Go WebSocket gateway.
                </p>
              </div>

              {/* Concentric Circular Sensor Radar Graphic (Directly Inspired by Reference Visual) */}
              <div className="relative py-4 flex items-center justify-center">
                <svg viewBox="0 0 240 160" className="w-full max-w-[220px] h-auto" aria-hidden="true" focusable="false">
                  {/* Concentric rings */}
                  <circle cx="120" cy="80" r="72" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" fill="none" />
                  <circle cx="120" cy="80" r="52" stroke="#334155" strokeWidth="1.2" fill="none" />
                  <circle cx="120" cy="80" r="32" stroke="#0284c7" strokeWidth="1.5" fill="rgba(2, 132, 199, 0.08)" />

                  {/* Horizontal Axis Line with end markers */}
                  <line x1="15" y1="80" x2="225" y2="80" stroke="#1e293b" strokeWidth="1" />

                  {/* Pulsing center sensor node */}
                  <circle cx="120" cy="80" r="14" fill="#0b1120" stroke="#38bdf8" strokeWidth="2.5" />
                  <circle cx="120" cy="80" r="6" fill="#38bdf8" className="animate-ping opacity-75" />
                  <circle cx="120" cy="80" r="5" fill="#ffffff" />

                  {/* Satellite node at bottom (matching the icon circle in reference image!) */}
                  <circle cx="120" cy="132" r="11" fill="#0f172a" stroke="#0284c7" strokeWidth="2" />
                  <circle cx="120" cy="132" r="4" fill="#38bdf8" />

                  {/* Horizontal axis side nodes */}
                  <circle cx="68" cy="80" r="3" fill="#38bdf8" />
                  <circle cx="172" cy="80" r="3" fill="#38bdf8" />
                </svg>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Latency &lt; 28ms</span>
                <span className="text-emerald-400">Stream Connected</span>
              </div>
            </div>

            {/* Card 3: Analyze & Classify */}
            <div className="rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/90 p-6 flex flex-col justify-between space-y-6 hover:border-slate-700 transition-all shadow-xl group">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Analyze & Classify</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time frequency decomposition with automated FFT feature extraction ready for machine learning pattern inference.
                </p>
              </div>

              {/* Mini Card with Numeric Indicator and Cyan Bar Equalizer */}
              <div className="rounded-xl bg-slate-950/90 p-4 border border-slate-800/80 space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Dominant Peak</span>
                  <span className="text-cyan-400 font-bold">Alpha 38.4 µV²</span>
                </div>
                {/* Cyan Equalizer bars */}
                <div className="flex items-end justify-between gap-1.5 h-14 pt-1">
                  {[30, 55, 90, 65, 45, 80, 50, 95].map((h, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-gradient-to-t from-blue-700 to-cyan-400 rounded-t-xs"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Standard EEG Frequency Bands Section */}
      <section id="bands" className="py-20 bg-[#090e1c] border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-400">
              Electrophysiology Reference
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Standard EEG Frequency Sub-Bands
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Continuous neural field oscillations mathematically decomposed via Fast Fourier Transform (FFT) into five recognized frequency bands.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {eegBandInfo.map((b) => (
              <div
                key={b.name}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all hover:scale-[1.02] shadow-lg shadow-black/40"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {b.range}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">{b.name}</h3>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mt-0.5">
                      Sub-Band Spectrum
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {b.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center max-w-2xl mx-auto text-xs text-slate-400">
            <strong className="text-slate-300 font-semibold">Scientific Notice:</strong> Wave patterns reflect neutral engineering biosignal band powers. No clinical diagnostic conclusions are drawn without dedicated medical evaluation.
          </div>
        </div>
      </section>

      {/* Interactive Control Center Preview (Platform Section) */}
      <section id="platform" className="py-20 bg-[#070b14] border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
                Platform Architecture
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Live Research Control Center
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                Real-time responsive dashboard providing live waveform oscilloscopes, session tracking, and preparation for multi-model ML inference.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-6 py-3 min-h-[44px] rounded-full bg-white text-slate-950 font-semibold text-xs hover:bg-slate-100 transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Large Dashboard Preview Shell */}
          <div className="rounded-3xl bg-slate-950 border border-slate-800 p-5 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-white">Active Device: TGAM1 Headset Alpha</span>
                <span className="font-mono text-slate-400">[EEG-001]</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                <span>Signal: 94% Good</span>
                <span>Sampling: 512 Hz</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-950 text-cyan-400 border border-blue-800">
                  Simulation Ready
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
                <span>RAW EEG OSCILLOSCOPE (±50 µV SCALE)</span>
                <span className="text-cyan-400">50 Hz REAL-TIME TRACE</span>
              </div>
              <WaveformChart samples={demoSamples} height={200} isStreaming={true} voltageRange={50} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">DOMINANT PEAK</span>
                <div className="text-xl font-bold text-white mt-1">Alpha (10.2 Hz)</div>
                <p className="text-xs text-slate-400 mt-1">38.4 µV² Relative Power</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">EXPERIMENT SESSION</span>
                <div className="text-xl font-bold text-emerald-400 mt-1">Recording Active</div>
                <p className="text-xs text-slate-400 mt-1">Duration: 15m 00s archived</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">ML CLASSIFICATION</span>
                <div className="text-xl font-bold text-amber-400 mt-1">Ready for Inference</div>
                <p className="text-xs text-slate-400 mt-1">SVM, RF & XGBoost features prepared</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Luxury Bespoke Pre-Footer Call to Action Panel */}
      <section className="py-20 bg-[#070b14] border-t border-slate-800/80 relative overflow-hidden">
        {/* Ambient bottom glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-t from-cyan-500/10 via-blue-600/5 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-[#070b14] border border-slate-800/90 p-8 sm:p-14 text-center space-y-6 shadow-2xl relative overflow-hidden">
            {/* Subtle top spotlight highlight line */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] font-mono text-cyan-400 shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Open Biomedical Research Architecture</span>
            </div>

            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight max-w-2xl mx-auto">
              Ready to explore the EEG research platform?
            </h2>

            {/* Subtitle */}
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
              Access the research control center, test live simulated waveforms, manage wearable devices, and inspect archived sessions.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href="/dashboard"
                className="px-8 py-3.5 rounded-full bg-white text-slate-950 hover:bg-slate-100 font-semibold text-sm transition-all shadow-xl hover:shadow-cyan-500/20 active:scale-95 inline-block text-center cursor-pointer"
              >
                Launch Platform Dashboard
              </Link>
              <Link
                href="/about"
                className="px-7 py-3.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-medium text-sm border border-slate-700/80 transition-all inline-block text-center cursor-pointer"
              >
                Explore Methodology
              </Link>
            </div>

            {/* System Status Strip */}
            <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Single-Channel FP1</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>ESP32 512 Hz Telemetry</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>PostgreSQL 16 Store</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Go Gin Gateway</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      </main>

      {/* Dark Footer */}
      <Footer theme="dark" />
    </div>
  );
}
