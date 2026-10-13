"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/providers/AuthProvider";
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
  Shield,
  Layers,
  Sparkles,
  Zap,
  BarChart3,
  Check,
  ChevronRight,
  Phone,
  Mail,
  BatteryCharging,
  Gauge,
  Sliders,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";

// Single editable configuration object for all telemetry & experimental numbers
export const RESEARCH_SPECS = {
  noiseFloor: "1.2 µVrms",
  samplingRate: "512 Hz",
  packetDelivery: "99.2%",
  baudRate: "57,600 Baud",
  leadChannel: "FP1 Monopolar",
  referenceElectrode: "A1 Ear Clip",
  snr: "24.8 dB",
  telemetryRate: "50 Hz Packets",
  notchFilter: "50 Hz",
  bandpass: "0.5 – 50 Hz",
  mcu: "ESP32-WROOM-32",
  asic: "NeuroSky TGAM1",
  battery: "3.7V LiPo 500mAh",
  contactPhone: "+62 (021) 786-3501",
  contactEmail: "contact@neuropulse.ac.id",
} as const;

export default function LandingPage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [demoSamples, setDemoSamples] = useState(() => generateMockEEGSeries(75));
  const [isStreaming, setIsStreaming] = useState(true);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrateSuccess, setCalibrateSuccess] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<{ freq: string; power: string; band: string } | null>(null);
  const [activePaginationDot, setActivePaginationDot] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Streaming waveform synthesis
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setDemoSamples((prev) => {
        const nextTime = (prev[prev.length - 1]?.timestamp || 0) + 20;
        const alpha = Math.sin(nextTime * 0.065) * 18;
        const beta = Math.sin(nextTime * 0.13) * 7;
        const theta = Math.sin(nextTime * 0.035) * 9;
        const noise = (Math.random() - 0.5) * 3.5;
        const val = Number((alpha + beta + theta + noise).toFixed(2));
        const newSample = {
          timestamp: nextTime,
          rawEEG: val,
          signalQuality: 95 + Math.floor(Math.random() * 4),
        };
        return [...prev.slice(1), newSample];
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Motion: One IntersectionObserver for 500ms ease-out fade-up
  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-4");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    const elements = document.querySelectorAll(".reveal-fade");
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleCalibrate = () => {
    setCalibrating(true);
    setCalibrateSuccess(false);
    setTimeout(() => {
      setCalibrating(false);
      setCalibrateSuccess(true);
      setTimeout(() => setCalibrateSuccess(false), 3000);
    }, 1200);
  };

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

  const frequencyCards = [
    {
      name: "Delta Rhythm",
      range: "0.5 – 4 Hz",
      voltage: "20 – 100 µV",
      state: "Deep restorative slow-wave oscillations",
      icon: WavesIcon,
      sineWave: "M 0 16 Q 16 0 32 16 T 64 16 T 96 16 T 128 16",
    },
    {
      name: "Theta Rhythm",
      range: "4 – 8 Hz",
      voltage: "10 – 50 µV",
      state: "Drowsiness, meditation & memory consolidation",
      icon: Activity,
      sineWave: "M 0 16 Q 10 2 20 16 T 40 16 T 60 16 T 80 16 T 100 16 T 120 16 T 128 16",
    },
    {
      name: "Alpha Rhythm",
      range: "8 – 13 Hz",
      voltage: "20 – 60 µV",
      state: "Calm wakefulness & resting posterior rhythm",
      icon: Sparkles,
      sineWave: "M 0 16 Q 6 4 12 16 T 24 16 T 36 16 T 48 16 T 60 16 T 72 16 T 84 16 T 96 16 T 108 16 T 120 16 T 128 16",
    },
    {
      name: "Beta Rhythm",
      range: "13 – 30 Hz",
      voltage: "5 – 30 µV",
      state: "Active thinking, sensory analysis & alertness",
      icon: Zap,
      sineWave: "M 0 16 Q 3 6 6 16 T 12 16 T 18 16 T 24 16 T 30 16 T 36 16 T 42 16 T 48 16 T 54 16 T 60 16 T 66 16 T 72 16 T 78 16 T 84 16 T 90 16 T 96 16 T 102 16 T 108 16 T 114 16 T 120 16 T 128 16",
    },
  ];

  return (
    <div className="min-h-screen bg-[#EFEDE8] text-[#262622] flex flex-col font-sans selection:bg-[#66744F]/20 selection:text-[#262622] py-4 px-3 sm:px-4 md:px-6">
      <div className="max-w-[1240px] w-full mx-auto space-y-4">
        {/* PANEL 1: NAV + HERO CONTAINER */}
        <section
          id="overview"
          className="relative bg-[#FAF9F6] rounded-[32px] border border-[rgba(40,40,30,0.06)] px-6 sm:px-10 lg:px-14 pb-20 mb-16"
        >
          {/* 1. NAV (Sticky Frosted Inside Panel 1) */}
          <nav
            aria-label="Primary Navigation"
            className="sticky top-0 z-40 -mx-6 sm:-mx-10 lg:-mx-14 px-6 sm:px-10 lg:px-14 py-4 backdrop-blur-md bg-[#FAF9F6]/85 border-b border-[rgba(40,40,30,0.06)] rounded-t-[32px] flex items-center justify-between"
          >
            {/* Logo */}
            <Link href="/" aria-label="NeuroPulse Home" className="inline-flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F] transition-transform group-hover:scale-105">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-base tracking-tight text-[#262622] block leading-none">
                  NeuroPulse
                </span>
                <span className="text-[9px] font-mono tracking-wider uppercase text-[#77776E] block mt-0.5">
                  Biomedical EEG IoT
                </span>
              </div>
            </Link>

            {/* 5 Centered Links at 14px / 500 (Desktop) */}
            <div className="hidden lg:flex items-center gap-8 text-[14px] font-medium text-[#77776E]">
              <Link href="#overview" className="hover:text-[#262622] transition-colors">
                Overview
              </Link>
              <Link href="#why" className="hover:text-[#262622] transition-colors">
                Why NeuroPulse
              </Link>
              <Link href="#hardware" className="hover:text-[#262622] transition-colors">
                Hardware
              </Link>
              <Link href="#pipeline" className="hover:text-[#262622] transition-colors">
                Pipeline
              </Link>
              <Link href="#bands" className="hover:text-[#262622] transition-colors">
                Frequency Bands
              </Link>
            </div>

            {/* Right: Auth buttons (Login & Get Started) / Console CTA + Hamburger */}
            <div className="flex items-center gap-2 sm:gap-3">
              {mounted && user ? (
                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex items-center gap-2.5 pl-4 pr-1.5 py-1.5 rounded-full bg-[#66744F] hover:bg-[#55623F] text-white text-xs font-medium transition-all shadow-xs group"
                >
                  <span>Open Console</span>
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </div>
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden sm:inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold text-[#262622] hover:text-[#66744F] transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="hidden sm:inline-flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-full bg-[#66744F] hover:bg-[#55623F] text-white text-xs font-medium transition-all shadow-xs group"
                  >
                    <span>Get Started</span>
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </div>
                  </Link>
                </>
              )}

              {/* Hamburger Button (<1024px) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="w-10 h-10 rounded-full border border-[rgba(40,40,30,0.08)] bg-white/80 flex lg:hidden items-center justify-center text-[#262622] cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </nav>

          {/* Mobile Navigation Dropdown */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-3 p-4 rounded-2xl bg-white border border-[rgba(40,40,30,0.08)] shadow-sm space-y-3 text-sm font-medium text-[#262622]">
              <Link href="#overview" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-[#66744F]">
                Overview
              </Link>
              <Link href="#why" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-[#66744F]">
                Why NeuroPulse
              </Link>
              <Link href="#hardware" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-[#66744F]">
                Hardware
              </Link>
              <Link href="#pipeline" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-[#66744F]">
                Pipeline
              </Link>
              <Link href="#bands" onClick={() => setMobileMenuOpen(false)} className="block py-1 hover:text-[#66744F]">
                Frequency Bands
              </Link>
              <div className="pt-2 border-t border-[rgba(40,40,30,0.06)]">
                {mounted && user ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#66744F] text-white text-xs font-medium hover:bg-[#55623F] transition-colors"
                  >
                    <span>Open Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full inline-flex items-center justify-center py-2.5 rounded-full border border-[rgba(40,40,30,0.12)] bg-white text-[#262622] text-xs font-semibold hover:bg-stone-50 transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-[#66744F] text-white text-xs font-medium hover:bg-[#55623F] transition-colors"
                    >
                      <span>Get Started</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. HERO CONTENT GRID: Vertically centered, gap-10, grid-cols-[0.9fr_1.1fr] */}
          <div className="pt-10 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center relative">
            {/* Left Column: Heading -> p (20px) -> button (28px) -> caption (24px) */}
            <div className="h-full flex flex-col justify-center text-left relative z-10 max-w-[480px]">
              <h1
                className="font-serif font-medium tracking-[-0.01em] text-[#262622] leading-[1.05]"
                style={{ fontSize: "clamp(40px, 4vw, 56px)" }}
              >
                <span className="block whitespace-normal sm:whitespace-nowrap">
                  Wearable Neural
                </span>
                <span className="block">
                  Biosensing
                </span>
                <span
                  className="font-script font-medium text-[#66744F] block whitespace-nowrap mt-1 origin-left -rotate-1 select-none"
                  style={{
                    fontFamily: "var(--font-script)",
                    fontSize: "0.7em",
                    lineHeight: 1.1,
                  }}
                >
                  for research & discovery
                </span>
              </h1>

              {/* Heading -> paragraph gap 20px (mt-5) */}
              <p className="mt-5 text-[16px] leading-[1.6] text-[#77776E] max-w-[440px] line-clamp-3">
                Non-invasive frontal-lobe electroencephalography telemetry with continuous 512 SPS acquisition, onboard digital filtering, and real-time spectral power decomposition.
              </p>

              {/* Paragraph -> button gap 28px (mt-7) */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                {mounted && user ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-3 pl-6 pr-2.5 py-2.5 rounded-full bg-[#66744F] hover:bg-[#55623F] text-white text-sm font-medium transition-all shadow-xs group"
                  >
                    <span>Launch Research Console</span>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-3 pl-6 pr-2.5 py-2.5 rounded-full bg-[#66744F] hover:bg-[#55623F] text-white text-sm font-medium transition-all shadow-xs group"
                    >
                      <span>Get Started</span>
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                        <ArrowRight className="w-4 h-4 text-white" />
                      </div>
                    </Link>

                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white/80 hover:bg-white text-[#262622] text-sm font-medium border border-[rgba(40,40,30,0.12)] hover:border-[rgba(102,116,79,0.35)] transition-all shadow-2xs"
                    >
                      <span>Login</span>
                    </Link>
                  </>
                )}
              </div>

              {/* Button -> caption row gap 24px (mt-6) */}
              <div className="mt-6 flex items-center gap-3 text-xs text-[#77776E]">
                <div className="w-8 h-8 rounded-full bg-[#E8ECDF] border border-[rgba(102,116,79,0.2)] flex items-center justify-center text-[#66744F] shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-[#262622] font-semibold block leading-tight">
                    {RESEARCH_SPECS.asic} + {RESEARCH_SPECS.mcu}
                  </strong>
                  <span className="text-[11px] font-mono text-[#77776E]">
                    {RESEARCH_SPECS.leadChannel} · open methodology
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Single Frosted Waveform Card matching text column height (440px) */}
            <div className="relative h-full flex flex-col justify-center">
              {/* Soft olive radial glow */}
              <div
                className="absolute inset-0 pointer-events-none rounded-3xl"
                style={{
                  background: "radial-gradient(circle at 65% 50%, rgba(102,116,79,0.15) 0%, transparent 70%)",
                }}
              />

              {/* Single container: rounded-[28px], frosted, extending to panel right edge (-56px) */}
              <div
                className="relative w-full lg:w-[calc(100%+56px)] lg:-mr-14 h-[440px] flex flex-col justify-between rounded-[28px] lg:rounded-r-none px-6 py-0 bg-white/70 backdrop-blur-md border border-[rgba(40,40,30,0.07)] shadow-[0_12px_32px_-12px_rgba(60,60,40,0.18)] overflow-hidden"
                style={{
                  maskImage:
                    "linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 100%)",
                }}
              >
                {/* Visual Top Bar: py-3 only */}
                <div className="py-3 flex items-center justify-between border-b border-[rgba(40,40,30,0.06)] text-xs shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F]">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-[#262622] text-xs block">
                        Frontal Lobe FP1 Biosignal
                      </span>
                      <span className="text-[10px] font-mono text-[#77776E]">
                        Active Monopolar · {RESEARCH_SPECS.baudRate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCalibrate}
                      disabled={calibrating}
                      className="px-3 py-1 rounded-full bg-white/80 border border-[rgba(40,40,30,0.08)] text-[10px] font-mono text-[#262622] hover:bg-white transition-colors cursor-pointer"
                    >
                      {calibrating ? "Checking..." : calibrateSuccess ? "Verified ✓" : "Calibrate"}
                    </button>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E8ECDF] text-[#3D4C32] text-[10px] font-mono font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#66744F] animate-pulse" />
                      <span>{RESEARCH_SPECS.telemetryRate}</span>
                    </span>
                  </div>
                </div>

                {/* Oscilloscope Canvas: fills available space (flex-1) without extra box border */}
                <div className="flex-1 w-full overflow-hidden flex items-center justify-center">
                  <WaveformChart
                    samples={demoSamples}
                    height={320}
                    isStreaming={isStreaming}
                    status="ACQUIRING"
                    voltageRange={50}
                    className="!border-0 !shadow-none !rounded-none !bg-transparent w-full"
                  />
                </div>

                {/* Telemetry Micro Status: py-3 only */}
                <div className="py-3 border-t border-[rgba(40,40,30,0.06)] flex items-center justify-between text-[11px] font-mono text-[#77776E] shrink-0">
                  <span className="text-[#262622] font-medium">{RESEARCH_SPECS.asic} Hardware</span>
                  <span>Noise Floor: {RESEARCH_SPECS.noiseFloor} · SNR: {RESEARCH_SPECS.snr}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Frosted Stat Cards: exactly 3 in one row, bottom: -32px, right: 56px, overlapping bottom edge by 32px */}
          <div className="mt-8 lg:mt-0 lg:absolute lg:-bottom-8 lg:right-14 z-20 flex flex-row overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 items-stretch gap-4 no-scrollbar">
            {/* Stat 1 */}
            <div className="w-[240px] shrink-0 frosted-card rounded-[24px] py-4 px-4 flex items-center gap-3.5 shadow-card reveal-fade transition-all duration-500">
              <div className="w-10 h-10 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F] shrink-0">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base font-bold font-mono text-[#262622] block leading-none">
                  {RESEARCH_SPECS.noiseFloor}
                </span>
                <span className="text-[11px] text-[#77776E] block mt-1">Noise Floor (0.5–50 Hz)</span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="w-[240px] shrink-0 frosted-card rounded-[24px] py-4 px-4 flex items-center gap-3.5 shadow-card reveal-fade transition-all duration-500">
              <div className="w-10 h-10 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F] shrink-0">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base font-bold font-mono text-[#262622] block leading-none">
                  {RESEARCH_SPECS.samplingRate}
                </span>
                <span className="text-[11px] text-[#77776E] block mt-1">Telemetry Sampling Rate</span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="w-[240px] shrink-0 frosted-card rounded-[24px] py-4 px-4 flex items-center gap-3.5 shadow-card reveal-fade transition-all duration-500">
              <div className="w-10 h-10 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F] shrink-0">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base font-bold font-mono text-[#262622] block leading-none">
                  {RESEARCH_SPECS.packetDelivery}
                </span>
                <span className="text-[11px] text-[#77776E] block mt-1">Packet Delivery Rate</span>
              </div>
            </div>
          </div>
        </section>

        {/* PANEL 2: WHY NEUROPULSE */}
        <section
          id="why"
          className="bg-[#FAF9F6] rounded-[32px] border border-[rgba(40,40,30,0.06)] p-6 sm:p-10 lg:p-14"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Left 40%: Eyebrow, H2 (3 lines), Paragraph, Olive pill button, Frosted badge card */}
            <div className="lg:col-span-5 space-y-6">
              {/* Eyebrow Label with 48px horizontal line */}
              <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.12em] uppercase text-[#77776E]">
                <span>WHY NEUROPULSE</span>
                <span className="w-12 h-px bg-[#77776E]/30" />
              </div>

              <h2 className="font-serif font-medium text-3xl sm:text-4xl leading-[1.1] text-[#262622] tracking-[-0.01em]">
                Engineered for precision & continuous wearable acquisition
              </h2>

              <p className="text-sm text-[#77776E] leading-relaxed">
                We combine ultra-low noise biosignal acquisition, verified dry-sensor hardware, and real-time spectral power decomposition for non-invasive electrophysiological research.
              </p>

              <div>
                <Link
                  href="/about"
                  className="inline-flex items-center gap-3 pl-6 pr-2.5 py-2.5 rounded-full bg-[#66744F] hover:bg-[#55623F] text-white text-xs font-medium transition-all shadow-xs group"
                >
                  <span>System Architecture</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </div>
                </Link>
              </div>

              {/* Small frosted badge card with icon + 2-line note */}
              <div className="frosted-card rounded-[24px] p-4 flex items-center gap-3.5 max-w-sm">
                <div className="w-9 h-9 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F] shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#262622] block">
                    Non-Invasive Biocompatible Contact
                  </span>
                  <span className="text-[11px] text-[#77776E] block mt-0.5">
                    Single dry electrode FP1 requiring zero conductive paste.
                  </span>
                </div>
              </div>
            </div>

            {/* Right 60%: 2x2 Split Cards (Text top-left + Mini SVG visual fading on the right) */}
            <div className="lg:col-span-7 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Card 1: Waveform */}
              <div className="frosted-card rounded-[24px] p-5 flex items-stretch justify-between relative overflow-hidden min-h-[160px] reveal-fade transition-all duration-500">
                <div className="max-w-[62%] space-y-2 z-10">
                  <div className="w-8 h-8 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F]">
                    <Activity className="w-4 h-4" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#262622] leading-snug">
                    Single-Channel FP1 Telemetry
                  </h3>
                  <p className="text-xs text-[#77776E] leading-relaxed">
                    Accurate frontal biosensing positioned per international 10-20 standard.
                  </p>
                </div>

                {/* Mini SVG Waveform visual fading right-to-left */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-[45%] pointer-events-none flex items-center justify-end pr-2 opacity-80"
                  style={{
                    maskImage: "linear-gradient(to left, #000 35%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to left, #000 35%, transparent 100%)",
                  }}
                >
                  <svg viewBox="0 0 140 80" className="w-full h-20 text-[#66744F]" fill="none">
                    <path
                      d="M 0 40 Q 15 10 30 40 T 60 40 T 90 20 T 105 60 T 120 40 T 140 40"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 0 40 Q 15 10 30 40 T 60 40 T 90 20 T 105 60 T 120 40 T 140 40"
                      fill="url(#waveGrad)"
                      opacity="0.15"
                    />
                    <defs>
                      <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#66744F" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Card 2: Packet Timeline */}
              <div className="frosted-card rounded-[24px] p-5 flex items-stretch justify-between relative overflow-hidden min-h-[160px] reveal-fade transition-all duration-500">
                <div className="max-w-[62%] space-y-2 z-10">
                  <div className="w-8 h-8 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F]">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#262622] leading-snug">
                    Sub-20ms Telemetry Pipeline
                  </h3>
                  <p className="text-xs text-[#77776E] leading-relaxed">
                    Direct ESP32 WebSocket transmission to high-throughput Go Gin gateway.
                  </p>
                </div>

                {/* Mini SVG Packet timeline visual */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-[45%] pointer-events-none flex items-center justify-end pr-2 opacity-80"
                  style={{
                    maskImage: "linear-gradient(to left, #000 35%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to left, #000 35%, transparent 100%)",
                  }}
                >
                  <svg viewBox="0 0 140 80" className="w-full h-20 text-[#66744F]" fill="none">
                    <line x1="10" y1="40" x2="130" y2="40" stroke="#77776E" strokeWidth="1" strokeDasharray="3 3" />
                    <rect x="30" y="28" width="18" height="24" rx="4" fill="#E8ECDF" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="65" y="28" width="18" height="24" rx="4" fill="#66744F" />
                    <rect x="100" y="28" width="18" height="24" rx="4" fill="#E8ECDF" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>

              {/* Card 3: Signal Quality Bars */}
              <div className="frosted-card rounded-[24px] p-5 flex items-stretch justify-between relative overflow-hidden min-h-[160px] reveal-fade transition-all duration-500">
                <div className="max-w-[62%] space-y-2 z-10">
                  <div className="w-8 h-8 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F]">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#262622] leading-snug">
                    Continuous Signal Verification
                  </h3>
                  <p className="text-xs text-[#77776E] leading-relaxed">
                    Real-time noise floor and contact impedance diagnostics for signal stability.
                  </p>
                </div>

                {/* Mini SVG Signal Quality Bars visual */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-[45%] pointer-events-none flex items-center justify-end pr-3 opacity-80"
                  style={{
                    maskImage: "linear-gradient(to left, #000 35%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to left, #000 35%, transparent 100%)",
                  }}
                >
                  <div className="flex items-end gap-1.5 h-16 w-24 justify-end">
                    <div className="w-3 bg-[#E8ECDF] rounded-t-sm h-[40%]" />
                    <div className="w-3 bg-[#66744F] rounded-t-sm h-[70%]" />
                    <div className="w-3 bg-[#66744F] rounded-t-sm h-[92%]" />
                    <div className="w-3 bg-[#E8ECDF] rounded-t-sm h-[60%]" />
                  </div>
                </div>
              </div>

              {/* Card 4: Battery Gauge */}
              <div className="frosted-card rounded-[24px] p-5 flex items-stretch justify-between relative overflow-hidden min-h-[160px] reveal-fade transition-all duration-500">
                <div className="max-w-[62%] space-y-2 z-10">
                  <div className="w-8 h-8 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F]">
                    <BatteryCharging className="w-4 h-4" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#262622] leading-snug">
                    Energy-Efficient Hardware
                  </h3>
                  <p className="text-xs text-[#77776E] leading-relaxed">
                    Low-dropout linear regulation powering 8+ continuous recording hours.
                  </p>
                </div>

                {/* Mini SVG Battery Gauge visual */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-[45%] pointer-events-none flex items-center justify-end pr-3 opacity-80"
                  style={{
                    maskImage: "linear-gradient(to left, #000 35%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to left, #000 35%, transparent 100%)",
                  }}
                >
                  <svg viewBox="0 0 100 80" className="w-20 h-16 text-[#66744F]" fill="none">
                    <rect x="10" y="24" width="70" height="34" rx="6" stroke="currentColor" strokeWidth="2" />
                    <path d="M82 34 h4 v14 h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <rect x="16" y="30" width="45" height="22" rx="3" fill="#66744F" opacity="0.8" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PANEL 3: HARDWARE SECTION (Replaces "Projects") */}
        <section
          id="hardware"
          className="bg-[#FAF9F6] rounded-[32px] border border-[rgba(40,40,30,0.06)] p-6 sm:p-10 lg:p-14"
        >
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.12em] uppercase text-[#77776E]">
                <span>HARDWARE PLATFORM</span>
                <span className="w-12 h-px bg-[#77776E]/30" />
              </div>
              <h2 className="font-serif font-medium text-3xl sm:text-4xl leading-tight text-[#262622] tracking-[-0.01em]">
                Experimental Wearable Architecture
              </h2>
            </div>

            <Link
              href="/devices"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#66744F] hover:text-[#55623F] group"
            >
              <span>View all components</span>
              <div className="w-7 h-7 rounded-full bg-[#E8ECDF] flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="w-3.5 h-3.5 text-[#66744F]" />
              </div>
            </Link>
          </div>

          {/* 3 Equal Photo Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Hardware Card 1 */}
            <div className="frosted-card rounded-[24px] p-4 flex flex-col justify-between space-y-4 reveal-fade transition-all duration-500">
              {/* Visual Area (aspect 16/10) with functional SVG & spec chip pinned top-left */}
              <div className="aspect-[16/10] w-full rounded-2xl bg-[#E8ECDF]/40 border border-[rgba(40,40,30,0.08)] relative overflow-hidden flex items-center justify-center">
                {/* Frosted spec chip pinned top-left */}
                <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-[rgba(40,40,30,0.08)] text-[10px] font-mono font-medium text-[#262622]">
                  {RESEARCH_SPECS.samplingRate} SPS
                </div>

                {/* Functional SVG schematic data visual */}
                <svg viewBox="0 0 200 120" className="w-3/4 h-3/4 text-[#66744F]" fill="none">
                  <rect x="40" y="25" width="120" height="70" rx="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
                  <circle cx="100" cy="60" r="22" stroke="currentColor" strokeWidth="1.5" fill="#E8ECDF" />
                  <path d="M 85 60 Q 92 48 100 60 T 115 60" stroke="#66744F" strokeWidth="2" strokeLinecap="round" />
                  <text x="100" y="88" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#77776E">
                    TGAM1 ASIC
                  </text>
                </svg>
              </div>

              <div>
                <h3 className="text-base font-semibold text-[#262622]">TGAM1 Biosensing Front-End</h3>
                <p className="text-xs text-[#77776E] mt-1 leading-relaxed">
                  Single-channel differential analog front-end ASIC with built-in hardware bandpass filtering.
                </p>
              </div>

              <div className="pt-2 border-t border-[rgba(40,40,30,0.06)] flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] text-[#77776E]">UART @ {RESEARCH_SPECS.baudRate}</span>
                <Link
                  href="/devices"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#66744F] hover:text-[#55623F] group"
                >
                  <span>Details</span>
                  <div className="w-6 h-6 rounded-full bg-[#E8ECDF] flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="w-3 h-3 text-[#66744F]" />
                  </div>
                </Link>
              </div>
            </div>

            {/* Hardware Card 2 */}
            <div className="frosted-card rounded-[24px] p-4 flex flex-col justify-between space-y-4 reveal-fade transition-all duration-500">
              <div className="aspect-[16/10] w-full rounded-2xl bg-[#E8ECDF]/40 border border-[rgba(40,40,30,0.08)] relative overflow-hidden flex items-center justify-center">
                <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-[rgba(40,40,30,0.08)] text-[10px] font-mono font-medium text-[#262622]">
                  {RESEARCH_SPECS.telemetryRate}
                </div>

                <svg viewBox="0 0 200 120" className="w-3/4 h-3/4 text-[#66744F]" fill="none">
                  <rect x="35" y="20" width="130" height="80" rx="8" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="65" cy="50" r="10" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M 60 50 L 70 50 M 65 45 L 65 55" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M 100 40 A 15 15 0 0 1 130 40 M 105 48 A 8 8 0 0 1 125 48" stroke="#66744F" strokeWidth="1.5" strokeLinecap="round" />
                  <text x="100" y="85" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#77776E">
                    ESP32 Wi-Fi Node
                  </text>
                </svg>
              </div>

              <div>
                <h3 className="text-base font-semibold text-[#262622]">ESP32 Wi-Fi Telemetry Node</h3>
                <p className="text-xs text-[#77776E] mt-1 leading-relaxed">
                  Dual-core Xtensa micro-controller streaming framed EEG packets directly over WebSockets.
                </p>
              </div>

              <div className="pt-2 border-t border-[rgba(40,40,30,0.06)] flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] text-[#77776E]">2.4 GHz 802.11 b/g/n</span>
                <Link
                  href="/devices"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#66744F] hover:text-[#55623F] group"
                >
                  <span>Details</span>
                  <div className="w-6 h-6 rounded-full bg-[#E8ECDF] flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="w-3 h-3 text-[#66744F]" />
                  </div>
                </Link>
              </div>
            </div>

            {/* Hardware Card 3 */}
            <div className="frosted-card rounded-[24px] p-4 flex flex-col justify-between space-y-4 reveal-fade transition-all duration-500">
              <div className="aspect-[16/10] w-full rounded-2xl bg-[#E8ECDF]/40 border border-[rgba(40,40,30,0.08)] relative overflow-hidden flex items-center justify-center">
                <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-[rgba(40,40,30,0.08)] text-[10px] font-mono font-medium text-[#262622]">
                  {RESEARCH_SPECS.leadChannel}
                </div>

                <svg viewBox="0 0 200 120" className="w-3/4 h-3/4 text-[#66744F]" fill="none">
                  <circle cx="100" cy="55" r="32" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                  <circle cx="100" cy="30" r="6" fill="#66744F" />
                  <circle cx="68" cy="65" r="4" fill="#77776E" />
                  <text x="100" y="22" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#66744F">
                    FP1 Lead
                  </text>
                  <text x="50" y="68" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="#77776E">
                    A1 Ref
                  </text>
                </svg>
              </div>

              <div>
                <h3 className="text-base font-semibold text-[#262622]">Dry Forehead Sensor Montage</h3>
                <p className="text-xs text-[#77776E] mt-1 leading-relaxed">
                  Single dry-contact forehead electrode with earlobe clip reference requiring zero prep.
                </p>
              </div>

              <div className="pt-2 border-t border-[rgba(40,40,30,0.06)] flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] text-[#77776E]">10-20 Standard Montage</span>
                <Link
                  href="/devices"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#66744F] hover:text-[#55623F] group"
                >
                  <span>Details</span>
                  <div className="w-6 h-6 rounded-full bg-[#E8ECDF] flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="w-3 h-3 text-[#66744F]" />
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Pagination dots (3) centered below */}
          <div className="mt-8 flex items-center justify-center gap-2">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                onClick={() => setActivePaginationDot(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  activePaginationDot === idx ? "bg-[#66744F] w-6" : "bg-[#77776E]/30"
                }`}
              />
            ))}
          </div>
        </section>

        {/* PANEL 4: PIPELINE (Two-Column Row, 30% Left / 70% Right with 4 Cards in 1 Row) */}
        <section
          id="pipeline"
          className="bg-[#FAF9F6] rounded-[32px] border border-[rgba(40,40,30,0.06)] p-6 sm:p-10 lg:p-14"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left 30%: Eyebrow + H2 (2 lines) */}
            <div className="lg:col-span-4 space-y-3 text-left">
              <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.12em] uppercase text-[#77776E]">
                <span>HOW WE OPERATE</span>
                <span className="w-12 h-px bg-[#77776E]/30" />
              </div>
              <h2 className="font-serif font-medium text-3xl sm:text-4xl leading-[1.1] text-[#262622] tracking-[-0.01em]">
                Transparent Pipeline from Biosensing to ML
              </h2>
              <p className="text-xs text-[#77776E] leading-relaxed max-w-sm">
                From raw microvolt action potentials to spectral power density decomposition and cloud storage.
              </p>
            </div>

            {/* Right 70%: 4 small frosted cards in one row on desktop with thin arrows between cards */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row lg:items-stretch gap-2.5 relative">
              {/* Step 01 */}
              <div className="flex-1 frosted-card rounded-[24px] p-4 flex flex-col justify-between space-y-3 relative reveal-fade transition-all duration-500 min-h-[160px]">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F]">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#77776E]">01</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#262622]">Biosensing</h3>
                  <p className="text-[11px] text-[#77776E] mt-1 leading-relaxed">
                    Dry frontal electrode detects continuous microvolt potentials at scalp location FP1.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#66744F] pt-1 border-t border-[rgba(40,40,30,0.06)]">
                  TGAM1 · 512 Hz
                </span>
              </div>

              {/* Arrow 1 (Desktop only) */}
              <div className="hidden lg:flex items-center justify-center text-[#77776E]/50 shrink-0">
                <ArrowRight className="w-3.5 h-3.5 stroke-[1.25]" />
              </div>

              {/* Step 02 */}
              <div className="flex-1 frosted-card rounded-[24px] p-4 flex flex-col justify-between space-y-3 relative reveal-fade transition-all duration-500 min-h-[160px]">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F]">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#77776E]">02</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#262622]">Telemetry</h3>
                  <p className="text-[11px] text-[#77776E] mt-1 leading-relaxed">
                    ESP32 micro-controller packages UART frames into 50 Hz Wi-Fi packets with CRC.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#66744F] pt-1 border-t border-[rgba(40,40,30,0.06)]">
                  50 Hz WebSocket
                </span>
              </div>

              {/* Arrow 2 (Desktop only) */}
              <div className="hidden lg:flex items-center justify-center text-[#77776E]/50 shrink-0">
                <ArrowRight className="w-3.5 h-3.5 stroke-[1.25]" />
              </div>

              {/* Step 03 */}
              <div className="flex-1 frosted-card rounded-[24px] p-4 flex flex-col justify-between space-y-3 relative reveal-fade transition-all duration-500 min-h-[160px]">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F]">
                    <Database className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#77776E]">03</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#262622]">DSP & FFT</h3>
                  <p className="text-[11px] text-[#77776E] mt-1 leading-relaxed">
                    Go Gin backend performs digital filtering, windowing, and Fast Fourier Transform.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#66744F] pt-1 border-t border-[rgba(40,40,30,0.06)]">
                  PostgreSQL 16
                </span>
              </div>

              {/* Arrow 3 (Desktop only) */}
              <div className="hidden lg:flex items-center justify-center text-[#77776E]/50 shrink-0">
                <ArrowRight className="w-3.5 h-3.5 stroke-[1.25]" />
              </div>

              {/* Step 04 */}
              <div className="flex-1 frosted-card rounded-[24px] p-4 flex flex-col justify-between space-y-3 relative reveal-fade transition-all duration-500 min-h-[160px]">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F]">
                    <Brain className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#77776E]">04</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#262622]">ML Inference</h3>
                  <p className="text-[11px] text-[#77776E] mt-1 leading-relaxed">
                    Python micro-service processes 5 spectral bands via SVM and Random Forest models.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#66744F] pt-1 border-t border-[rgba(40,40,30,0.06)]">
                  REST ML Engine
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* PANEL 5: EEG FREQUENCY BANDS SECTION */}
        <section
          id="bands"
          className="bg-[#FAF9F6] rounded-[32px] border border-[rgba(40,40,30,0.06)] p-6 sm:p-10 lg:p-14"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.12em] uppercase text-[#77776E]">
                <span>FREQUENCY SPECTRUM</span>
                <span className="w-12 h-px bg-[#77776E]/30" />
              </div>
              <h2 className="font-serif font-medium text-3xl sm:text-4xl leading-tight text-[#262622] tracking-[-0.01em]">
                Signal Oscilloscope & Frequency Band Dynamics
              </h2>
            </div>

            <Link
              href="/sessions"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#66744F] hover:text-[#55623F] group"
            >
              <span>View all sessions</span>
              <div className="w-7 h-7 rounded-full bg-[#E8ECDF] flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="w-3.5 h-3.5 text-[#66744F]" />
              </div>
            </Link>
          </div>

          {/* 4 Band Cards with inline mini SVG sine wave */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {frequencyCards.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.name}
                  className="frosted-card rounded-[24px] p-5 space-y-3.5 reveal-fade transition-all duration-500"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#E8ECDF] text-[#3D4C32]">
                      {b.range}
                    </span>
                  </div>

                  {/* Mini inline SVG sine wave */}
                  <div className="h-8 w-full flex items-center justify-center opacity-85">
                    <svg viewBox="0 0 128 32" className="w-full h-8 text-[#66744F]" fill="none">
                      <path d={b.sineWave} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-[#262622]">{b.name}</h3>
                    <p className="text-xs text-[#77776E] mt-0.5 leading-relaxed">{b.state}</p>
                  </div>

                  <div className="pt-2 border-t border-[rgba(40,40,30,0.06)] flex items-center justify-between text-[11px] font-mono text-[#77776E]">
                    <span>Amplitude:</span>
                    <span className="font-semibold text-[#262622]">{b.voltage}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FFT Bar Chart in Frosted Card */}
          <div className="mt-6 frosted-card rounded-[24px] p-6 reveal-fade transition-all duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <span className="text-xs font-semibold text-[#262622] font-mono uppercase tracking-wider block">
                  Fast Fourier Transform (FFT) Power Spectral Density
                </span>
                <p className="text-xs text-[#77776E] mt-0.5">
                  Relative spectral density distribution estimated across standard clinical EEG sub-bands
                </p>
              </div>

              {hoveredBar && (
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#E8ECDF] text-[#3D4C32]">
                  {hoveredBar.band}: {hoveredBar.freq} · {hoveredBar.power}
                </span>
              )}
            </div>

            {/* Bars with Axis Labels */}
            <div className="h-32 flex items-end gap-2 sm:gap-3 px-2">
              {spectrumBars.map((bar, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredBar(bar)}
                  onMouseLeave={() => setHoveredBar(null)}
                  className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className="w-full bg-[#E8ECDF]/50 rounded-t-md overflow-hidden h-24 flex items-end">
                    <div
                      className="w-full bg-[#66744F] group-hover:bg-[#55623F] transition-all rounded-t-md"
                      style={{ height: `${bar.height}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[#77776E] group-hover:text-[#262622]">
                    {bar.freq}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PANEL 6: CTA SECTION (Min-H 420px, Left = H2 + Olive Pill, Right = SVG Grid + 2 Floating Contact Cards) */}
        <section
          className="bg-[#FAF9F6] rounded-[32px] border border-[rgba(40,40,30,0.06)] min-h-[420px] p-6 sm:p-10 lg:p-14 relative overflow-hidden flex items-center"
        >
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
            {/* Left Column: Eyebrow + H2 (2 lines) + Paragraph + Olive Pill */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.12em] uppercase text-[#77776E]">
                <span>READY TO COMMENCE RESEARCH?</span>
                <span className="w-12 h-px bg-[#77776E]/30" />
              </div>

              <h2 className="font-serif font-medium text-3xl sm:text-4xl lg:text-5xl leading-[1.08] text-[#262622] tracking-[-0.01em]">
                Begin your brainwave acquisition session today
              </h2>

              <p className="text-sm text-[#77776E] leading-relaxed max-w-xl">
                Connect your TGAM1 wearable headset or run an instant telemetry simulation to inspect live spectral powers and band ratios.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {mounted && user ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-3 pl-6 pr-2.5 py-2.5 rounded-full bg-[#66744F] hover:bg-[#55623F] text-white text-sm font-medium transition-all shadow-xs group"
                  >
                    <span>Launch Research Console</span>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-3 pl-6 pr-2.5 py-2.5 rounded-full bg-[#66744F] hover:bg-[#55623F] text-white text-sm font-medium transition-all shadow-xs group"
                    >
                      <span>Get Started</span>
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                        <ArrowRight className="w-4 h-4 text-white" />
                      </div>
                    </Link>

                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white/80 hover:bg-white text-[#262622] text-sm font-medium border border-[rgba(40,40,30,0.12)] hover:border-[rgba(102,116,79,0.35)] transition-all shadow-2xs"
                    >
                      <span>Login</span>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: SVG Grid Background + Faint Waveform + 2 Frosted Floating Contact Cards Offset */}
            <div className="lg:col-span-5 relative flex flex-col justify-center gap-4">
              {/* Faint SVG Grid + Waveform background fading left */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40 -mr-6"
                style={{
                  maskImage: "linear-gradient(to right, transparent, #000 45%)",
                  WebkitMaskImage: "linear-gradient(to right, transparent, #000 45%)",
                }}
              >
                <svg className="w-full h-full text-[#66744F]/30" viewBox="0 0 300 200" fill="none">
                  <path d="M 0 50 H 300 M 0 100 H 300 M 0 150 H 300" stroke="currentColor" strokeWidth="0.75" />
                  <path d="M 50 0 V 200 M 100 0 V 200 M 150 0 V 200 M 200 0 V 200 M 250 0 V 200" stroke="currentColor" strokeWidth="0.75" />
                  <path
                    d="M 10 100 Q 40 40 80 100 T 150 100 T 220 70 T 290 100"
                    stroke="#66744F"
                    strokeWidth="1.5"
                    fill="none"
                  />
                </svg>
              </div>

              {/* Floating Contact Card 1 (Offset Right by 8px) */}
              <div className="frosted-card rounded-[24px] p-4 flex items-center gap-3.5 shadow-sm transform lg:translate-x-2 reveal-fade transition-all duration-500">
                <div className="w-10 h-10 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F] shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#262622] block font-mono">
                    {RESEARCH_SPECS.contactPhone}
                  </span>
                  <span className="text-[11px] text-[#77776E] block mt-0.5">
                    Laboratory Hotline · Mon–Fri 09:00–18:00
                  </span>
                </div>
              </div>

              {/* Floating Contact Card 2 (Offset Left by 8px) */}
              <div className="frosted-card rounded-[24px] p-4 flex items-center gap-3.5 shadow-sm transform lg:-translate-x-2 reveal-fade transition-all duration-500">
                <div className="w-10 h-10 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F] shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#262622] block font-mono">
                    {RESEARCH_SPECS.contactEmail}
                  </span>
                  <span className="text-[11px] text-[#77776E] block mt-0.5">
                    Inquiries answered within 12 laboratory hours
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PANEL 7: FOOTER (4 Columns + Bottom Row) */}
        <footer
          className="bg-[#FAF9F6] rounded-[32px] border border-[rgba(40,40,30,0.06)] p-6 sm:p-10 lg:p-14 text-xs text-[#77776E]"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10 pb-10 border-b border-[rgba(40,40,30,0.06)]">
            {/* Col 1 (5 cols): Brand & Academic Project Title */}
            <div className="md:col-span-5 space-y-4">
              <Link href="/" className="inline-flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#66744F] transition-transform group-hover:scale-105">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-base text-[#262622] block leading-none">
                    NeuroPulse
                  </span>
                  <span className="text-[10px] tracking-wider uppercase text-[#77776E] font-medium block mt-0.5">
                    EEG IoT Biosensing Platform
                  </span>
                </div>
              </Link>

              <p className="text-xs leading-relaxed max-w-md text-[#77776E]">
                Academic Engineering Research Project:
                <br />
                <strong className="font-semibold block mt-1 text-[#262622]">
                  “Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning”
                </strong>
              </p>
            </div>

            {/* Col 2 (2 cols): Navigation */}
            <div className="md:col-span-2 space-y-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#262622] font-semibold">
                Navigation
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="#overview" className="hover:text-[#262622] transition-colors">
                    Overview
                  </Link>
                </li>
                <li>
                  <Link href="#why" className="hover:text-[#262622] transition-colors">
                    Why NeuroPulse
                  </Link>
                </li>
                <li>
                  <Link href="#hardware" className="hover:text-[#262622] transition-colors">
                    Hardware
                  </Link>
                </li>
                <li>
                  <Link href="#pipeline" className="hover:text-[#262622] transition-colors">
                    Workflow Pipeline
                  </Link>
                </li>
                <li>
                  <Link href="#bands" className="hover:text-[#262622] transition-colors">
                    EEG Frequency Bands
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-[#262622] transition-colors">
                    About Project
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3 (2 cols): Research Services */}
            <div className="md:col-span-2 space-y-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#262622] font-semibold">
                Research Services
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/dashboard" className="hover:text-[#262622] transition-colors flex items-center justify-between group">
                    <span>Dashboard</span>
                    <ChevronRight className="w-3 h-3 text-[#77776E] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
                <li>
                  <Link href="/sessions" className="hover:text-[#262622] transition-colors flex items-center justify-between group">
                    <span>Archived Sessions</span>
                    <ChevronRight className="w-3 h-3 text-[#77776E] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
                <li>
                  <Link href="/analysis" className="hover:text-[#262622] transition-colors flex items-center justify-between group">
                    <span>ML Classifier Engine</span>
                    <ChevronRight className="w-3 h-3 text-[#77776E] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
                <li>
                  <Link href="/devices" className="hover:text-[#262622] transition-colors flex items-center justify-between group">
                    <span>IoT Device Registry</span>
                    <ChevronRight className="w-3 h-3 text-[#77776E] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
                <li>
                  <Link href="/settings" className="hover:text-[#262622] transition-colors flex items-center justify-between group">
                    <span>Preferences</span>
                    <ChevronRight className="w-3 h-3 text-[#77776E] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4 (3 cols): Hardware & Stack Chips */}
            <div className="md:col-span-3 space-y-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#262622] font-semibold">
                Hardware & Stack
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                <span className="px-3 py-1 rounded-full bg-[#E8ECDF] border border-[rgba(102,116,79,0.2)] text-[#3D4C32]">
                  {RESEARCH_SPECS.asic}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#E8ECDF] border border-[rgba(102,116,79,0.2)] text-[#3D4C32]">
                  {RESEARCH_SPECS.mcu}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#E8ECDF] border border-[rgba(102,116,79,0.2)] text-[#3D4C32]">
                  PostgreSQL 16
                </span>
                <span className="px-3 py-1 rounded-full bg-[#E8ECDF] border border-[rgba(102,116,79,0.2)] text-[#3D4C32]">
                  Go Gin REST/WS
                </span>
                <span className="px-3 py-1 rounded-full bg-[#E8ECDF] border border-[rgba(102,116,79,0.2)] text-[#3D4C32]">
                  Python ML Microservice
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <p>© {new Date().getFullYear()} NeuroPulse Platform. Biomedical Engineering Thesis Project.</p>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-mono text-[#3D4C32]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#66744F]" />
                <span>Gateway 50 Hz Active</span>
              </span>
              <span>·</span>
              <Link href="/about" className="hover:text-[#262622] transition-colors underline">
                Privacy Policy & License
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
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
