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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* Skip to Main Content Link for WCAG & Screen Reader Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2.5 focus:bg-cyan-500 focus:text-slate-950 focus:rounded-lg focus:font-semibold focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Dark Navbar with Clean Engineering Styling */}
      <Navbar theme="dark" />

      <main id="main-content" role="main" aria-label="Main Content" className="flex-1">

      {/* Hero Section */}
      <section id="overview" className="relative pt-24 pb-16 md:pt-32 md:pb-24 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Simplify your research workflow</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
            Enhance your <br />
            <span className="text-white">neural research with NeuroPulse</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Streamline your wearable EEG monitoring and neural signal classification with our intuitive, scalable IoT platform. Designed for biomedical research and machine learning.
          </p>

          {/* Centered Action Button */}
          <div className="mt-8 flex items-center justify-center">
            <Link
              href="/dashboard"
              className="px-6 py-2.5 rounded-lg bg-white text-slate-950 hover:bg-slate-100 font-medium text-sm transition-colors cursor-pointer inline-flex items-center justify-center shadow-sm"
            >
              Get started
            </Link>
          </div>

          {/* Technical Hardware/Dashboard Deck Showcase */}
          <div className="mt-12 sm:mt-16 relative max-w-5xl mx-auto">
            {/* Workstation Console Container */}
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 sm:p-6 text-left">
              {/* Internal Left Dock + Main Canvas Grid */}
              <div className="flex gap-4 sm:gap-6">
                {/* Vertical Sidebar Dock */}
                <div className="hidden sm:flex flex-col items-center justify-between py-2.5 px-1 rounded-lg bg-slate-900 border border-slate-800/80 w-12 shrink-0" role="toolbar" aria-label="Workstation Tools">
                  <div className="space-y-1.5">
                    <button
                      onClick={() => setActiveDockTab("overview")}
                      aria-label="Overview dock tab"
                      title="Overview"
                      className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                        activeDockTab === "overview"
                          ? "bg-slate-800 text-cyan-400 border border-slate-700"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <Home className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setActiveDockTab("oscilloscope")}
                      aria-label="Live Oscilloscope dock tab"
                      title="Live Oscilloscope"
                      className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                        activeDockTab === "oscilloscope"
                          ? "bg-slate-800 text-cyan-400 border border-slate-700"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <Activity className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setActiveDockTab("bands")}
                      aria-label="Frequency Bands FFT dock tab"
                      title="Frequency Bands FFT"
                      className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                        activeDockTab === "bands"
                          ? "bg-slate-800 text-cyan-400 border border-slate-700"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setActiveDockTab("hardware")}
                      aria-label="Hardware Telemetry dock tab"
                      title="Hardware Telemetry"
                      className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                        activeDockTab === "hardware"
                          ? "bg-slate-800 text-cyan-400 border border-slate-700"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <Cpu className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                  <Link
                    href="/settings"
                    title="System Settings"
                    aria-label="System Settings"
                    className="w-10 h-10 rounded-md hover:bg-slate-800/60 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4" aria-hidden="true" />
                    <span className="sr-only">System Settings</span>
                  </Link>
                </div>

                {/* Main Content Area: Dynamic based on activeDockTab */}
                <div className="flex-1 space-y-4">
                  {activeDockTab === "overview" && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 relative z-10">
                        {/* Primary Telemetry Card */}
                        <div className="md:col-span-6 rounded-lg bg-slate-900/50 border border-slate-800 p-5 text-left space-y-4">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-cyan-400">
                                <Info className="w-3.5 h-3.5" aria-hidden="true" />
                              </div>
                              <span className="text-slate-300 font-medium text-xs">
                                Active Signal Telemetry
                              </span>
                            </div>
                            <Link
                              href="/live"
                              title="Inspect Live Telemetry"
                              aria-label="Inspect Live Telemetry"
                              className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer hover:bg-slate-700 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" aria-hidden="true" />
                              <span className="sr-only">Inspect Live Telemetry</span>
                            </Link>
                          </div>

                          <div>
                            <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight flex items-baseline gap-2">
                              <span>98.4% Quality</span>
                              <span className="text-xs font-mono text-cyan-400 font-normal">512 Hz</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                                +12% vs last session
                              </span>
                              <span className="text-xs text-slate-400">
                                Low Noise Floor (-58 dBm)
                              </span>
                            </div>
                          </div>

                          {/* Sub-items (TGAM1 Forehead ASIC + ESP32 Wi-Fi Node) */}
                          <div className="space-y-2 pt-2 border-t border-slate-800/80">
                            {/* Device Row 1: TGAM1 */}
                            <div className="flex items-center justify-between p-2.5 rounded-md bg-slate-950/80 border border-slate-800/80">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center text-cyan-400">
                                  <Brain className="w-4 h-4" aria-hidden="true" />
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-white flex items-center gap-1.5">
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
                                className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-mono text-cyan-300 cursor-pointer transition-colors flex items-center justify-center"
                              >
                                {calibrating ? "Checking..." : calibrateSuccess ? "Verified ✓" : "Calibrate"}
                              </button>
                            </div>

                            {/* Device Row 2: ESP32 */}
                            <div className="flex items-center justify-between p-2.5 rounded-md bg-slate-950/80 border border-slate-800/80">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center text-blue-400">
                                  <Wifi className="w-4 h-4" aria-hidden="true" />
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-white flex items-center gap-1.5">
                                    <span>ESP32 Wi-Fi Node</span>
                                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-800/50">
                                      ONLINE
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    2.4 GHz • WebSocket 50 Hz
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono text-xs text-slate-300">
                                28ms Latency
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Spectral Band Power & Equalizer Bar Chart Card */}
                        <div className="md:col-span-6 rounded-lg bg-slate-900/50 border border-slate-800 p-5 text-left space-y-4 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-blue-400">
                                  <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                                </div>
                                <span className="text-slate-300 font-medium text-xs">
                                  Spectral Band Power
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {["All", "Alpha", "Beta"].map((b) => (
                                  <button
                                    key={b}
                                    onClick={() => setSelectedBand(b)}
                                    aria-label={`Filter by ${b} frequency band`}
                                    className={`text-xs font-mono px-2.5 py-1 rounded cursor-pointer transition-colors ${
                                      selectedBand === b
                                        ? "bg-slate-800 text-cyan-300 border border-slate-700 font-medium"
                                        : "text-slate-400 hover:text-slate-200 border border-transparent"
                                    }`}
                                  >
                                    {b}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
                                38.4 µV² Alpha Peak
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                  +15% Dominant
                                </span>
                                <span className="text-xs text-slate-400">
                                  8 – 13 Hz Resting State Rhythms
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                              <span>FFT Spectrum (1 - 50 Hz)</span>
                              <span className="text-cyan-300">
                                {hoveredBar ? `${hoveredBar.band}: ${hoveredBar.freq} (${hoveredBar.power})` : "Hover bar to inspect"}
                              </span>
                            </div>

                            {/* Clean Equalizer Bar Chart */}
                            <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-28 pt-2 px-3 bg-slate-950 rounded-md border border-slate-800/80 relative">
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
                                      className={`w-full rounded-t-xs transition-colors duration-150 ${
                                        isMatch
                                          ? "bg-cyan-500 hover:bg-cyan-400"
                                          : "bg-slate-800/80"
                                      }`}
                                      style={{ height: `${item.height}%` }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span>Sampling: 512 SPS (FreeRTOS)</span>
                            <span className="text-cyan-400 font-medium">
                              Alpha Rhythm Dominant
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Lower Row Inside Dashboard Frame */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
                        {/* Lower Left Card: Real-time Trace with Play/Pause Control */}
                        <div className="md:col-span-7 rounded-lg bg-slate-900/50 border border-slate-800 p-4 text-left flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setIsStreaming(!isStreaming)}
                              aria-label={isStreaming ? "Pause Live Trace" : "Resume Live Trace"}
                              className="w-9 h-9 rounded-md bg-slate-800 border border-slate-700/80 flex items-center justify-center text-cyan-300 hover:bg-slate-700 transition-colors cursor-pointer"
                              title={isStreaming ? "Pause Live Trace" : "Resume Live Trace"}
                            >
                              {isStreaming ? <Pause className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4 fill-cyan-400" aria-hidden="true" />}
                            </button>
                            <div>
                              <div className="text-xs font-medium text-white flex items-center gap-2">
                                <span>Raw Oscilloscope (FP1)</span>
                                <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                ±50 µV Scale • {isStreaming ? "Live 50 Hz Stream" : "Stream Paused"}
                              </div>
                            </div>
                          </div>
                          <div className="w-36 h-9 hidden sm:block">
                            <WaveformChart samples={demoSamples.slice(-25)} height={36} voltageRange={45} isStreaming={isStreaming} />
                          </div>
                        </div>

                        {/* Lower Right Card: ML Classification Status */}
                        <div className="md:col-span-5 rounded-lg bg-slate-900/50 border border-slate-800 p-4 text-left flex items-center justify-between">
                          <div>
                            <div className="text-xs font-medium text-white flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                              <span>ML Classification Pipeline</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Ready for SVM, RF & XGBoost
                            </div>
                          </div>
                          <Link
                            href="/analysis"
                            aria-label="View Machine Learning Analysis"
                            title="View Machine Learning Analysis"
                            className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer hover:bg-slate-700 transition-colors"
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
                    <div className="rounded-lg bg-slate-900/50 border border-slate-800 p-5 text-left space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-cyan-400" />
                          <span className="font-semibold text-sm text-white">Full Raw EEG Oscilloscope</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                            50 Hz Live
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsStreaming(!isStreaming)}
                            aria-label={isStreaming ? "Pause raw EEG trace" : "Resume raw EEG trace"}
                            className="px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            {isStreaming ? <Pause className="w-3.5 h-3.5" aria-hidden="true" /> : <Play className="w-3.5 h-3.5" aria-hidden="true" />}
                            <span>{isStreaming ? "Pause" : "Resume"}</span>
                          </button>
                          <Link
                            href="/live"
                            className="px-3 py-1.5 rounded-md bg-cyan-600 text-xs text-white hover:bg-cyan-500 inline-flex items-center text-center cursor-pointer font-medium transition-colors"
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
                    <div className="rounded-lg bg-slate-900/50 border border-slate-800 p-5 text-left space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-white">5-Band FFT Decomposition</span>
                        <span className="text-xs font-mono text-cyan-400">Total Power: 100%</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {eegBandInfo.map((b) => (
                          <div key={b.name} className="p-3 rounded-md bg-slate-950 border border-slate-800/80 space-y-1">
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
                    <div className="rounded-lg bg-slate-900/50 border border-slate-800 p-5 text-left space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-white">Wearable IoT Hardware Topology</span>
                        <Link href="/devices" className="text-xs text-cyan-400 hover:underline py-1 inline-flex items-center">
                          Device Registry →
                        </Link>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                        <div className="p-3.5 rounded-md bg-slate-950 border border-slate-800/80 space-y-2">
                          <div className="flex items-center gap-2 text-white font-medium">
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
                        <div className="p-3.5 rounded-md bg-slate-950 border border-slate-800/80 space-y-2">
                          <div className="flex items-center gap-2 text-white font-medium">
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

      {/* Tech / Specifications Row */}
      <section id="tech" className="py-8 bg-[#070b14] border-b border-slate-800/80 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-5">
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
                className="px-4 py-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-2.5 transition-colors cursor-default group"
              >
                <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center">
                  {item.svg}
                </div>
                <span>{item.name}</span>
                <span className="text-[10px] text-slate-400 font-mono border-l border-slate-800 pl-2">
                  {item.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-20 md:py-24 bg-[#070b14] border-b border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Eyebrow & Headline */}
          <div className="text-left mb-12 space-y-3">
            <div className="inline-flex items-center">
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-400">
                Our workflow
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              How our platform makes your <br />
              workflow easier
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              An integrated end-to-end architecture bridging wearable neuro-sensors with real-time web telemetry and future machine learning models.
            </p>
          </div>

          {/* Cards Grid: 3 Structured Workflow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Link Your Wearables */}
            <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-6 flex flex-col justify-between space-y-6 hover:border-slate-700 transition-colors">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">Link Your Wearables</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Connect your single-channel dry forehead electrode (FP1) with the TGAM1 front-end ASIC in minutes to acquire microvolt neural signals.
                </p>
              </div>

              {/* Technical Mini Card Preview */}
              <div className="rounded-lg bg-slate-950 border border-slate-800/80 p-4 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Active Electrode FP1</span>
                  </span>
                  <div className="w-4 h-4 rounded bg-slate-800 flex items-center justify-center text-slate-400">
                    <ChevronRight className="w-2.5 h-2.5" />
                  </div>
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  98.4% Quality
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">+12% Stability</span>
                  <span className="text-cyan-400">TGAM1 ASIC</span>
                </div>
              </div>
            </div>

            {/* Card 2: Integrate Your Signals (Differentiated Primary Architecture Card) */}
            <div className="rounded-xl bg-slate-900/50 border border-slate-700/80 p-6 flex flex-col justify-between space-y-6 hover:border-slate-600 transition-colors relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <h3 className="text-base font-semibold text-white">Integrate Your Signals</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  ESP32 digitizes biosignals and securely transmits encrypted telemetry over 2.4 GHz Wi-Fi to the Go WebSocket gateway.
                </p>
              </div>

              {/* Concentric Circular Sensor Radar Graphic */}
              <div className="relative py-4 flex items-center justify-center">
                <svg viewBox="0 0 240 160" className="w-full max-w-[220px] h-auto" aria-hidden="true" focusable="false">
                  {/* Concentric rings */}
                  <circle cx="120" cy="80" r="72" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" fill="none" />
                  <circle cx="120" cy="80" r="52" stroke="#334155" strokeWidth="1.2" fill="none" />
                  <circle cx="120" cy="80" r="32" stroke="#0284c7" strokeWidth="1.5" fill="rgba(2, 132, 199, 0.05)" />

                  {/* Horizontal Axis Line with end markers */}
                  <line x1="15" y1="80" x2="225" y2="80" stroke="#1e293b" strokeWidth="1" />

                  {/* Center sensor node */}
                  <circle cx="120" cy="80" r="12" fill="#0b1120" stroke="#38bdf8" strokeWidth="2" />
                  <circle cx="120" cy="80" r="5" fill="#38bdf8" />

                  {/* Satellite node at bottom */}
                  <circle cx="120" cy="132" r="10" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
                  <circle cx="120" cy="132" r="4" fill="#38bdf8" />

                  {/* Horizontal axis side nodes */}
                  <circle cx="68" cy="80" r="3" fill="#38bdf8" />
                  <circle cx="172" cy="80" r="3" fill="#38bdf8" />
                </svg>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Latency &lt; 28ms</span>
                <span className="text-emerald-400 font-medium">Stream Connected</span>
              </div>
            </div>

            {/* Card 3: Analyze & Classify */}
            <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-6 flex flex-col justify-between space-y-6 hover:border-slate-700 transition-colors">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">Analyze & Classify</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time frequency decomposition with automated FFT feature extraction ready for machine learning pattern inference.
                </p>
              </div>

              {/* Mini Card with Numeric Indicator and Cyan Bar Equalizer */}
              <div className="rounded-lg bg-slate-950 border border-slate-800/80 p-4 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Dominant Peak</span>
                  <span className="text-cyan-400 font-semibold">Alpha 38.4 µV²</span>
                </div>
                {/* Clean Equalizer bars */}
                <div className="flex items-end justify-between gap-1.5 h-14 pt-1">
                  {[30, 55, 90, 65, 45, 80, 50, 95].map((h, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-cyan-500/80 rounded-t-xs"
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
      <section id="bands" className="py-20 md:py-24 bg-[#070b14] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-400 inline-block">
              Electrophysiology Reference
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              Standard EEG Frequency Sub-Bands
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Continuous neural field oscillations mathematically decomposed via Fast Fourier Transform (FFT) into five recognized frequency bands.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {eegBandInfo.map((b) => {
              const isDominant = b.name === "Alpha";
              return (
                <div
                  key={b.name}
                  className={`rounded-xl p-5 flex flex-col justify-between space-y-4 transition-colors ${
                    isDominant
                      ? "bg-slate-900/60 border border-cyan-500/40"
                      : "bg-slate-900/40 border border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {b.range}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-white">{b.name}</h3>
                        {isDominant && (
                          <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/80 px-1 rounded border border-cyan-800/60">
                            DOMINANT
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mt-0.5">
                        Sub-Band Spectrum
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 p-4 rounded-lg bg-slate-900/50 border border-slate-800 text-center max-w-2xl mx-auto text-xs text-slate-400">
            <strong className="text-slate-300 font-medium">Scientific Notice:</strong> Wave patterns reflect neutral engineering biosignal band powers. No clinical diagnostic conclusions are drawn without dedicated medical evaluation.
          </div>
        </div>
      </section>

      {/* Interactive Control Center Preview (Platform Section) */}
      <section id="platform" className="py-20 md:py-24 bg-[#070b14] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                Platform Architecture
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
                Live Research Control Center
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
                Real-time responsive dashboard providing live waveform oscilloscopes, session tracking, and preparation for multi-model ML inference.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 min-h-[40px] rounded-lg bg-white text-slate-950 font-medium text-xs hover:bg-slate-100 transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Large Dashboard Preview Shell */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-5 sm:p-7 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-white">Active Device: TGAM1 Headset Alpha</span>
                <span className="font-mono text-slate-400">[EEG-001]</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                <span>Signal: 94% Good</span>
                <span>Sampling: 512 Hz</span>
                <span className="px-2 py-0.5 rounded bg-blue-950/80 text-cyan-400 border border-blue-800/60">
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
              <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">DOMINANT PEAK</span>
                <div className="text-xl font-bold text-white mt-1">Alpha (10.2 Hz)</div>
                <p className="text-xs text-slate-400 mt-1">38.4 µV² Relative Power</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">EXPERIMENT SESSION</span>
                <div className="text-xl font-bold text-emerald-400 mt-1">Recording Active</div>
                <p className="text-xs text-slate-400 mt-1">Duration: 15m 00s archived</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">ML CLASSIFICATION</span>
                <div className="text-xl font-bold text-amber-400 mt-1">Ready for Inference</div>
                <p className="text-xs text-slate-400 mt-1">SVM, RF & XGBoost features prepared</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pre-Footer Call to Action Panel */}
      <section className="py-20 md:py-24 bg-[#070b14] relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-8 sm:p-12 text-center space-y-6">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Open Biomedical Research Architecture</span>
            </div>

            {/* Heading */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight max-w-2xl mx-auto">
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
                className="px-6 py-2.5 rounded-lg bg-white text-slate-950 hover:bg-slate-100 font-medium text-sm transition-colors inline-block text-center cursor-pointer shadow-sm"
              >
                Launch Platform Dashboard
              </Link>
              <Link
                href="/about"
                className="px-6 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-medium text-sm border border-slate-800 transition-colors inline-block text-center cursor-pointer"
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
