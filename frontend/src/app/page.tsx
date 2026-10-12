"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WaveformChart } from "@/components/eeg/WaveformChart";
import { generateMockEEGSeries } from "@/lib/mock/eeg";
import {
  Activity,
  ArrowRight,
  Cpu,
  Database,
  Radio,
  Wifi,
  Brain,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Zap,
  CheckCircle2,
  BarChart3,
  ArrowUpRight,
  RefreshCw,
  Home,
  Settings,
  Info,
  Phone,
  Mail,
  Sliders,
  Layers,
  Clock,
  BatteryCharging,
} from "lucide-react";

export default function LandingPage() {
  const [demoSamples, setDemoSamples] = useState(() => generateMockEEGSeries(75));
  const [isStreaming, setIsStreaming] = useState(true);
  const [activeDockTab, setActiveDockTab] = useState<"overview" | "oscilloscope" | "bands" | "hardware">("overview");
  const [selectedBand, setSelectedBand] = useState<string>("All");
  const [calibrating, setCalibrating] = useState(false);
  const [calibrateSuccess, setCalibrateSuccess] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<{ freq: string; power: string; band: string } | null>(null);

  // Streaming updates
  useEffect(() => {
    if (!isStreaming) return;
    let interval: NodeJS.Timeout;

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
            signalQuality: 95 + Math.floor(Math.random() * 4),
          };
          return [...prev.slice(1), newSample];
        });
      }, 500);
    };

    startStreaming();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming]);

  const spectrumBars = [
    { freq: "1.5 Hz", power: "14.2 µV²", height: 32, band: "Delta" },
    { freq: "3.0 Hz", power: "18.5 µV²", height: 44, band: "Delta" },
    { freq: "5.0 Hz", power: "24.1 µV²", height: 58, band: "Theta" },
    { freq: "7.0 Hz", power: "31.8 µV²", height: 68, band: "Theta" },
    { freq: "8.5 Hz", power: "46.2 µV²", height: 86, band: "Alpha" },
    { freq: "10.0 Hz", power: "68.4 µV²", height: 96, band: "Alpha" },
    { freq: "12.0 Hz", power: "54.1 µV²", height: 80, band: "Alpha" },
    { freq: "14.0 Hz", power: "29.7 µV²", height: 60, band: "Beta" },
    { freq: "18.0 Hz", power: "22.3 µV²", height: 48, band: "Beta" },
    { freq: "24.0 Hz", power: "16.8 µV²", height: 38, band: "Beta" },
    { freq: "32.0 Hz", power: "11.2 µV²", height: 26, band: "Gamma" },
    { freq: "42.0 Hz", power: "8.4 µV²", height: 18, band: "Gamma" },
  ];

  const handleCalibrate = () => {
    setCalibrating(true);
    setCalibrateSuccess(false);
    setTimeout(() => {
      setCalibrating(false);
      setCalibrateSuccess(true);
      setTimeout(() => setCalibrateSuccess(false), 3000);
    }, 1200);
  };

  const frequencyCards = [
    {
      name: "Delta Rhythm",
      range: "0.5 – 4 Hz",
      voltage: "20 – 100 µV",
      state: "Deep restorative slow-wave oscillations",
      icon: MoonIcon,
      color: "bg-sky-50 text-sky-800 border-sky-200",
      accent: "#0284c7",
    },
    {
      name: "Theta Rhythm",
      range: "4 – 8 Hz",
      voltage: "10 – 50 µV",
      state: "Drowsiness, meditation & memory consolidation",
      icon: WavesIcon,
      color: "bg-teal-50 text-teal-800 border-teal-200",
      accent: "#0d9488",
    },
    {
      name: "Alpha Rhythm",
      range: "8 – 13 Hz",
      voltage: "20 – 60 µV",
      state: "Calm wakefulness & resting posterior rhythm",
      icon: Sparkles,
      color: "bg-[#EDF1E7] text-[#3D4C32] border-[#DEE5D6]",
      accent: "#5B6D49",
    },
    {
      name: "Beta Rhythm",
      range: "13 – 30 Hz",
      voltage: "5 – 30 µV",
      state: "Active thinking, sensory analysis & alertness",
      icon: Zap,
      color: "bg-amber-50 text-amber-800 border-amber-200",
      accent: "#d97706",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#1C1E1A] flex flex-col font-sans selection:bg-[#5B6D49]/20 selection:text-[#1C1E1A]">
      <Navbar theme="light" />

      <main id="main-content" role="main" aria-label="Main Content" className="flex-1">
        {/* HERO SECTION */}
        <section id="overview" className="relative pt-12 pb-20 md:pt-16 md:pb-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Editorial Headline & Actions */}
              <div className="lg:col-span-5 space-y-6 text-left">
                {/* Eyebrow Pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] text-xs font-medium text-[#3D4C32]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5B6D49] animate-pulse" />
                  <span>NeuroPulse Biosensing Platform</span>
                </div>

                {/* Main Headline with Serif Italic Accent */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-[#1C1E1A] tracking-tight leading-[1.12]">
                  Wearable Neural Biosensing{" "}
                  <span className="italic font-normal text-[#5B6D49] block mt-1">
                    for research & discovery
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="text-sm sm:text-base text-[#5E6659] leading-relaxed max-w-lg">
                  Streamline your wearable EEG monitoring, continuous brainwave telemetry, and neural pattern classification with high-SNR hardware and real-time machine learning.
                </p>

                {/* Primary Pill Button CTA */}
                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#5B6D49] hover:bg-[#4E5E3E] text-white text-sm font-medium transition-all shadow-sm hover:shadow group"
                  >
                    <span>Launch Research Console</span>
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </div>
                  </Link>

                  <Link
                    href="/live"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white hover:bg-stone-50 border border-stone-200/90 text-sm font-medium text-[#1C1E1A] transition-colors"
                  >
                    <Activity className="w-4 h-4 text-[#5B6D49]" />
                    <span>Live Waveform</span>
                  </Link>
                </div>

                {/* Social Proof / Research Credibility Pill */}
                <div className="pt-4 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-stone-300 flex items-center justify-center text-[10px] font-bold text-stone-700">
                      RS
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-[#EDF1E7] flex items-center justify-center text-[10px] font-bold text-[#3D4C32]">
                      DL
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-600">
                      ML
                    </div>
                  </div>
                  <div className="text-xs text-[#5E6659]">
                    <strong className="text-[#1C1E1A] font-semibold block">120+ Research Sessions</strong>
                    <span>Verified high-SNR laboratory recordings</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Hardware Telemetry Hero Card */}
              <div className="lg:col-span-7 relative">
                {/* Visual Frame */}
                <div className="rounded-3xl bg-white border border-stone-200/80 p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] relative">
                  {/* Top Bar of Card */}
                  <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-[#1C1E1A] block">
                          Frontal Lobe FP1 Biosignal
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">
                          Active Monopolar • 57,600 Baud
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCalibrate}
                        disabled={calibrating}
                        className="px-3 py-1 rounded-full bg-[#FAFBF8] border border-stone-200 hover:border-stone-300 text-[11px] font-mono text-stone-600 transition-colors cursor-pointer"
                      >
                        {calibrating ? "Checking..." : calibrateSuccess ? "Verified ✓" : "Calibrate Lead"}
                      </button>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] text-[11px] font-mono text-[#3D4C32]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5B6D49] animate-pulse" />
                        <span>50 Hz Live</span>
                      </div>
                    </div>
                  </div>

                  {/* Canvas Waveform Display */}
                  <div className="pt-4">
                    <WaveformChart
                      samples={demoSamples}
                      height={260}
                      isStreaming={isStreaming}
                      status="ACQUIRING"
                      voltageRange={50}
                    />
                  </div>

                  {/* Telemetry Micro Status */}
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-[#5E6659]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#5B6D49]" />
                      <span className="font-medium text-[#1C1E1A]">TGAM1 + ESP32 Hardware</span>
                    </div>
                    <span className="font-mono text-[11px] text-stone-500">Noise Floor: -58 dBm • SNR: 24.8 dB</span>
                  </div>
                </div>

                {/* 4 Floating Architectural Spec Pills (Matching Reference Image) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="p-3.5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49] shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#1C1E1A] block font-mono">10 µV</span>
                      <span className="text-[10px] text-stone-500 block leading-tight">Low Noise Floor</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49] shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#1C1E1A] block font-mono">512 Hz</span>
                      <span className="text-[10px] text-stone-500 block leading-tight">Sampling Rate</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49] shrink-0">
                      <Wifi className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#1C1E1A] block font-mono">99.2%</span>
                      <span className="text-[10px] text-stone-500 block leading-tight">Telemetry Delivery</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49] shrink-0">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#1C1E1A] block font-mono">TGAM1</span>
                      <span className="text-[10px] text-stone-500 block leading-tight">ASIC Dry Sensor</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: WHY NEUROPULSE (Bento Grid matching Reference Image) */}
        <section id="workflow" className="py-20 md:py-28 border-t border-stone-200/80 bg-[#FAFBF8]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              {/* Left Column: Heading, Context & Pillar CTA */}
              <div className="lg:col-span-5 space-y-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-stone-400 font-semibold">
                    WHY NEUROPULSE
                  </span>
                  <div className="h-px w-10 bg-stone-300" />
                </div>

                <h2 className="text-3xl sm:text-4xl font-serif text-[#1C1E1A] tracking-tight leading-snug">
                  Engineered for clinical-grade precision & continuous wearable acquisition
                </h2>

                <p className="text-sm text-[#5E6659] leading-relaxed">
                  We combine ultra-low noise biosignal acquisition, verified dry-sensor hardware, and real-time machine learning inference for reliable, non-invasive brainwave research.
                </p>

                <div className="pt-2">
                  <Link
                    href="/about"
                    className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-[#5B6D49] hover:bg-[#4E5E3E] text-white text-xs font-medium transition-all shadow-sm group"
                  >
                    <span>System Architecture</span>
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                      <ArrowRight className="w-3 h-3 text-white" />
                    </div>
                  </Link>
                </div>

                {/* Eco / Biomedical Safety Badge (Similar to reference image) */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex items-center gap-3.5 max-w-md">
                  <div className="w-9 h-9 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49] shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#1C1E1A] block">
                      Biomedical Safety Certified
                    </span>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                      Non-invasive biocompatible dry-electrode sensor requiring zero conductive paste.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: 2x2 Bento Grid (Clean architectural cards) */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Bento Card 1 */}
                <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:border-stone-300 transition-all space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
                    <Brain className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1C1E1A]">
                    Single-Channel FP1 Telemetry
                  </h3>
                  <p className="text-xs text-[#5E6659] leading-relaxed">
                    Accurate frontal-lobe biosensing positioned according to the international 10-20 EEG electrode placement standard.
                  </p>
                  <div className="pt-2 flex items-center gap-1.5 text-[11px] font-mono text-[#5B6D49]">
                    <span>Reference: Ear Clip (A1)</span>
                  </div>
                </div>

                {/* Bento Card 2 */}
                <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:border-stone-300 transition-all space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1C1E1A]">
                    Sub-20ms Telemetry Pipeline
                  </h3>
                  <p className="text-xs text-[#5E6659] leading-relaxed">
                    Direct ESP32 WebSocket transmission to high-throughput Go Gin backend with minimal latency.
                  </p>
                  <div className="pt-2 flex items-center gap-1.5 text-[11px] font-mono text-[#5B6D49]">
                    <span>TCP/IP • 50 Hz Packet Frames</span>
                  </div>
                </div>

                {/* Bento Card 3 */}
                <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:border-stone-300 transition-all space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1C1E1A]">
                    Continuous Quality Diagnostics
                  </h3>
                  <p className="text-xs text-[#5E6659] leading-relaxed">
                    Automated electrode detachment alerts, impedance checking, and signal-to-noise ratio verification.
                  </p>
                  <div className="pt-2 flex items-center gap-1.5 text-[11px] font-mono text-[#5B6D49]">
                    <span>Real-time Lead Check</span>
                  </div>
                </div>

                {/* Bento Card 4 */}
                <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:border-stone-300 transition-all space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
                    <BatteryCharging className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1C1E1A]">
                    Energy-Efficient Hardware
                  </h3>
                  <p className="text-xs text-[#5E6659] leading-relaxed">
                    Low-dropout linear regulation and intelligent power modes powering 8+ continuous recording hours on a single 3.7V LiPo.
                  </p>
                  <div className="pt-2 flex items-center gap-1.5 text-[11px] font-mono text-[#5B6D49]">
                    <span>LiPo 3.7V • TP4056 Micro-B</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: FREQUENCY SPECTRUM (Interactive Cards matching Reference Image) */}
        <section id="bands" className="py-20 md:py-28 border-t border-stone-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-stone-400 font-semibold">
                    FREQUENCY SPECTRUM
                  </span>
                  <div className="h-px w-10 bg-stone-300" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-serif text-[#1C1E1A] tracking-tight">
                  Signal Oscilloscope & Frequency Band Dynamics
                </h2>
              </div>
              <Link
                href="/sessions"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#5B6D49] hover:text-[#4E5E3E] group"
              >
                <span>View all sessions</span>
                <div className="w-6 h-6 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="w-3 h-3 text-[#5B6D49]" />
                </div>
              </Link>
            </div>

            {/* Frequency Rhythm Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {frequencyCards.map((b) => {
                const Icon = b.icon;
                return (
                  <div
                    key={b.name}
                    className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:border-stone-300 transition-all space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-[#EDF1E7] border border-[#DEE5D6] text-[#3D4C32]">
                        {b.range}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-[#1C1E1A]">{b.name}</h3>
                      <p className="text-xs text-[#5E6659] mt-1 leading-relaxed">{b.state}</p>
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] font-mono text-stone-500">
                      <span>Amplitude:</span>
                      <span className="font-semibold text-[#1C1E1A]">{b.voltage}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Spectrum Equalizer Live Analyzer */}
            <div className="mt-8 p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-semibold text-[#1C1E1A] font-mono uppercase tracking-wider block">
                    Fast Fourier Transform (FFT) Power Spectral Density
                  </span>
                  <p className="text-xs text-[#5E6659] mt-0.5">
                    Real-time discrete Fourier spectral decomposition across sub-band frequencies
                  </p>
                </div>
                {hoveredBar && (
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] text-[#3D4C32]">
                    {hoveredBar.band}: {hoveredBar.freq} • {hoveredBar.power}
                  </span>
                )}
              </div>

              <div className="h-32 flex items-end gap-2 sm:gap-3 px-2">
                {spectrumBars.map((bar, idx) => (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredBar(bar)}
                    onMouseLeave={() => setHoveredBar(null)}
                    className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                  >
                    <div className="w-full bg-stone-100 rounded-t-lg overflow-hidden h-24 flex items-end">
                      <div
                        className="w-full bg-[#5B6D49] group-hover:bg-[#4E5E3E] transition-all rounded-t-lg"
                        style={{ height: `${bar.height}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-stone-400 group-hover:text-[#1C1E1A]">
                      {bar.freq}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: HOW IT WORKS (01, 02, 03, 04 Pipeline Cards matching Reference Image) */}
        <section id="platform" className="py-20 md:py-28 border-t border-stone-200/80 bg-[#FAFBF8]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-2 mb-12">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-widest text-stone-400 font-semibold">
                  HOW WE OPERATE
                </span>
                <div className="h-px w-10 bg-stone-300" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif text-[#1C1E1A] tracking-tight">
                Transparent Pipeline from Biosensing to ML Inference
              </h2>
            </div>

            {/* 4 Process Cards with Step Numbers 01, 02, 03, 04 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Step 01 */}
              <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-4 hover:border-stone-300 transition-all relative">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-mono font-bold text-stone-400">01</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1C1E1A]">Biosensing</h3>
                  <p className="text-xs text-[#5E6659] mt-1.5 leading-relaxed">
                    Dry frontal electrode detects continuous microvolt potentials at scalp location FP1.
                  </p>
                </div>
                <div className="pt-2 text-[11px] font-mono text-stone-500">
                  TGAM1 ASIC • 512 Hz
                </div>
              </div>

              {/* Step 02 */}
              <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-4 hover:border-stone-300 transition-all relative">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-mono font-bold text-stone-400">02</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1C1E1A]">Telemetry</h3>
                  <p className="text-xs text-[#5E6659] mt-1.5 leading-relaxed">
                    ESP32 micro-controller packages UART frames into 50 Hz Wi-Fi packets with CRC checks.
                  </p>
                </div>
                <div className="pt-2 text-[11px] font-mono text-stone-500">
                  WebSocket 50 Hz Stream
                </div>
              </div>

              {/* Step 03 */}
              <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-4 hover:border-stone-300 transition-all relative">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
                    <Database className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-mono font-bold text-stone-400">03</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1C1E1A]">DSP & FFT</h3>
                  <p className="text-xs text-[#5E6659] mt-1.5 leading-relaxed">
                    Go Gin backend performs bandpass filtering, Fast Fourier Transform, and PostgreSQL storage.
                  </p>
                </div>
                <div className="pt-2 text-[11px] font-mono text-stone-500">
                  PostgreSQL 16 Archival
                </div>
              </div>

              {/* Step 04 */}
              <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-4 hover:border-stone-300 transition-all relative">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
                    <Brain className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-mono font-bold text-stone-400">04</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1C1E1A]">ML Inference</h3>
                  <p className="text-xs text-[#5E6659] mt-1.5 leading-relaxed">
                    Python microservice processes band ratios with SVM and Random Forest for state classification.
                  </p>
                </div>
                <div className="pt-2 text-[11px] font-mono text-stone-500">
                  REST ML Engine • Port 5000
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: READY TO COMMENCE RESEARCH (Bottom Banner Card matching Reference Image) */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-white border border-stone-200/80 p-8 sm:p-12 lg:p-16 shadow-[0_4px_30px_rgba(0,0,0,0.03)] grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Side: Call to Action */}
              <div className="lg:col-span-7 space-y-6">
                <span className="text-xs font-mono uppercase tracking-widest text-stone-400 font-semibold block">
                  READY TO COMMENCE RESEARCH?
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-[#1C1E1A] tracking-tight leading-tight">
                  Begin your brainwave acquisition session today
                </h2>
                <p className="text-sm text-[#5E6659] leading-relaxed max-w-xl">
                  Connect your TGAM1 wearable headset or run an instant simulation to inspect live spectral powers, band ratios, and machine-learning predictions.
                </p>
                <div className="pt-2">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full bg-[#5B6D49] hover:bg-[#4E5E3E] text-white text-sm font-medium transition-all shadow-sm group"
                  >
                    <span>Launch Research Console</span>
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </div>
                  </Link>
                </div>
              </div>

              {/* Right Side: Contact / Institutional Cards (Exact match of reference image right cards) */}
              <div className="lg:col-span-5 space-y-3.5">
                {/* Phone / Lab Card */}
                <div className="p-4 rounded-2xl bg-[#FAFBF8] border border-stone-200/80 flex items-center gap-3.5 shadow-xs">
                  <div className="w-10 h-10 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49] shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#1C1E1A] block font-mono">
                      +62 (021) 786-3501
                    </span>
                    <span className="text-[10px] text-stone-500 block">
                      Laboratory Hotline • Mon-Fri 09:00 - 18:00
                    </span>
                  </div>
                </div>

                {/* Email / Inquiry Card */}
                <div className="p-4 rounded-2xl bg-[#FAFBF8] border border-stone-200/80 flex items-center gap-3.5 shadow-xs">
                  <div className="w-10 h-10 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49] shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#1C1E1A] block font-mono">
                      contact@neuropulse.ac.id
                    </span>
                    <span className="text-[10px] text-stone-500 block">
                      Responses within 12 laboratory hours
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer theme="light" />
    </div>
  );
}

function MoonIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function WavesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </svg>
  );
}
