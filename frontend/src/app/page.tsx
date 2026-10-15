"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/providers/AuthProvider";
import { WaveformChart } from "@/components/eeg/WaveformChart";
import { generateMockEEGSeries } from "@/lib/mock/eeg";
import { Modal } from "@/components/ui/modal";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Cpu,
  Database,
  Radio,
  Wifi,
  Brain,
  Shield,
  ShieldCheck,
  Sparkles,
  Zap,
  BarChart3,
  Check,
  ChevronRight,
  Phone,
  Mail,
  BatteryCharging,
  Gauge,
  Menu,
  X,
  Play,
  Pause,
  RefreshCw,
  Leaf,
  Plus,
  Send,
  Sliders,
  Copy,
  Code,
  Layers,
  Settings2,
  Waves,
  Filter,
  Laptop,
  ExternalLink,
} from "lucide-react";

// Research specifications & experimental numbers
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

interface HardwareItem {
  id: string;
  badge: string;
  title: string;
  description: string;
  image: string;
  specs: {
    label: string;
    value: string;
  }[];
  details: string;
  pinouts: { pin: string; name: string; func: string }[];
  firmwareSnippet: string;
}

const HARDWARE_SHOWCASE: HardwareItem[] = [
  {
    id: "tgam1",
    badge: "TGAM1 ASIC · 512 Hz",
    title: "Analog Front-End ASIC TGAM1",
    description:
      "Pemrosesan biosinyal diferensial dengan filter bandpass analog bawaan dan integrasi UART 57,600 Baud.",
    image: "/images/chip_macro_real.jpg",
    specs: [
      { label: "Sampling Rate", value: "512 SPS Raw ADC" },
      { label: "Baud Rate", value: "57,600 Baud UART" },
      { label: "Filter Analog", value: "Notch 50 Hz / 60 Hz" },
      { label: "Lead Sensitivitas", value: "0.5 µV – 100 µV" },
    ],
    details:
      "Modul TGAM1 memisahkan dan memproses gelombang mikrovolt otak langsung dari kontak kulit dahi. Modul ini dilengkapi penyaring derau interferensi listrik AC serta penguat sinyal diferensial berkinerja tinggi.",
    pinouts: [
      { pin: "Pin 1 (VCC)", name: "3.3V DC", func: "Catu daya teregulasi ultra-low noise" },
      { pin: "Pin 2 (GND)", name: "Ground", func: "Common signal ground reference" },
      { pin: "Pin 3 (TXD)", name: "UART TX", func: "Serial data out @ 57,600 Baud" },
      { pin: "Pin 4 (RXD)", name: "UART RX", func: "Konfigurasi register ASIC" },
      { pin: "Lead 1", name: "EEG FP1", func: "Elektroda aktif dahi kiri" },
      { pin: "Lead 2", name: "REF A1", func: "Klip referensi cuping telinga" },
    ],
    firmwareSnippet: `// TGAM1 Serial Parser Header (ESP32)
#define TGAM_SYNC 0xAA
#define TGAM_BAUD 57600

void parseTGAMPacket(uint8_t *payload, size_t len) {
  for (size_t i = 0; i < len; i++) {
    if (payload[i] == 0x02) { // Signal Quality
      uint8_t sq = payload[++i];
      eegStatus.signalQuality = 200 - sq;
    } else if (payload[i] == 0x80) { // Raw Wave (512Hz)
      int16_t raw = (payload[i+2] << 8) | payload[i+3];
      broadcastEEGWebSocket(raw);
      i += 3;
    }
  }
}`,
  },
  {
    id: "esp32",
    badge: "ESP32 Wi-Fi Node",
    title: "Node Gateway Nirkabel ESP32",
    description:
      "Mikrokontroler dual-core berdaya rendah mempaketkan data biner EEG ke cloud WebSocket secara instan.",
    image: "/images/hardware_esp32_bench.jpg",
    specs: [
      { label: "Arsitektur", value: "Dual-Core Xtensa 240MHz" },
      { label: "Protokol", value: "802.11 b/g/n & WebSocket" },
      { label: "Frekuensi Paket", value: "50 Hz Streaming" },
      { label: "Enkripsi", value: "WPA3 / TLS 1.3" },
    ],
    details:
      "ESP32 bertindak sebagai jembatan telemetri real-time yang membaca frame serial dari TGAM1, memvalidasi checksum CRC, dan memancarkannya tanpa kabel ke backend server dengan latensi sub-20ms.",
    pinouts: [
      { pin: "GPIO 16", name: "RX2", func: "Input Serial dari TGAM1 TXD" },
      { pin: "GPIO 17", name: "TX2", func: "Output Serial ke TGAM1 RXD" },
      { pin: "GPIO 2", name: "LED Status", func: "Indikator konektivitas Wi-Fi" },
      { pin: "3V3 / GND", name: "Power Rails", func: "Regulator LDO 3.3V 500mA" },
    ],
    firmwareSnippet: `#include <WiFi.h>
#include <WebSocketsClient.h>

WebSocketsClient webSocket;
HardwareSerial TGAMSerial(2);

void setup() {
  TGAMSerial.begin(57600, SERIAL_8N1, 16, 17);
  WiFi.begin("LAB_EEG_WIFI", "research_secure");
  webSocket.begin("api.neuropulse.ac.id", 8080, "/ws/eeg");
}

void loop() {
  webSocket.loop();
  if (TGAMSerial.available()) {
    uint8_t b = TGAMSerial.read();
    webSocket.sendBIN(&b, 1);
  }
}`,
  },
  {
    id: "headband",
    badge: "Dry FP1 + A1 Ref",
    title: "Headband Ergonomis Elektroda Kering",
    description:
      "Desain lingkar kepala fleksibel dengan elektroda dahi perak biokompatibel dan klip referensi cuping telinga A1.",
    image: "/images/project_wearable_wood.jpg",
    specs: [
      { label: "Standar Posisi", value: "International 10-20 FP1" },
      { label: "Bahan Kontak", value: "Sintered Ag/AgCl Alloy" },
      { label: "Elektroda Referensi", value: "A1 Dual-Shield Clip" },
      { label: "Bobot Total", value: "Hanya 68 gram" },
    ],
    details:
      "Headband dirancang secara ergonomis untuk penelitian jangka panjang tanpa memerlukan pasta gel lengket. Tekanan elastis yang terkalibrasi menjaga kontak stabil bahkan saat subjek bergerak ringan.",
    pinouts: [
      { pin: "Frontal Lead", name: "Sensor FP1", func: "Kontak dahi anterior biokompatibel" },
      { pin: "Ear Clip", name: "Ground A1", func: "Klip pegas referensi netral" },
      { pin: "Chassis", name: "Shield Cable", func: "Kabel terpilin berpelindung derau RF" },
      { pin: "Strap Frame", name: "Silicone 3D", func: "Rangka lentur cetak 3D medical grade" },
    ],
    firmwareSnippet: `// Karakteristik Impedansi Elektroda Kering
struct ContactImpedance {
  float rawOhms = 4850.0;     // Khas elektroda kering Ag/AgCl
  float snrDb = 24.8;         // Signal to Noise Ratio
  bool isArtifactFree = true; // Bebas artefak gerakan mata
};`,
  },
];

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
  const [activeNav, setActiveNav] = useState("overview");

  // Hero Visual Mode
  const [heroViewMode, setHeroViewMode] = useState<"arch" | "oscilloscope" | "workbench">("arch");

  // Interactive Spectrum & Filter Simulator
  const [selectedRhythm, setSelectedRhythm] = useState<"alpha" | "beta" | "theta" | "delta">("alpha");
  const [notchFilterActive, setNotchFilterActive] = useState<boolean>(true);

  // Interactive Research Setup Estimator / Calculator States
  const [calcFocus, setCalcFocus] = useState<"bci" | "focus" | "sleep" | "emotion">("bci");
  const [calcChannels, setCalcChannels] = useState<1 | 2 | 4>(1);
  const [calcSamplingRate, setCalcSamplingRate] = useState<128 | 256 | 512>(512);
  const [calcDurationMin, setCalcDurationMin] = useState<number>(60);
  const [calcModel, setCalcModel] = useState<"svm" | "rf" | "cnn">("svm");
  const [copiedCalc, setCopiedCalc] = useState<boolean>(false);

  // Modals
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultSubmitted, setConsultSubmitted] = useState(false);
  const [selectedHardware, setSelectedHardware] = useState<HardwareItem | null>(null);
  const [hardwareActiveTab, setHardwareActiveTab] = useState<"overview" | "pinout" | "firmware">("overview");
  const [firmwareCopied, setFirmwareCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dynamic Scrollspy: Updates activeNav as user scrolls through sections
  useEffect(() => {
    const sectionIds = ["overview", "why", "hardware", "calculator", "pipeline", "bands"];
    
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const headerOffset = 120; // accounts for floating header height & buffer
      
      // If at the very top of the page, default to overview
      if (scrollY < 120) {
        setActiveNav("overview");
        return;
      }

      // Check sections based on boundingClientRect
      let current = "overview";
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= headerOffset + 80) {
            current = id;
          }
        }
      }
      
      // Special check: if scrolled close to the bottom of the page, highlight the last section ('bands')
      const windowHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;
      if (scrollY + windowHeight >= fullHeight - 160) {
        current = "bands";
      }

      setActiveNav(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, item: (typeof navItems)[0]) => {
    if (item.href.startsWith("#")) {
      e.preventDefault();
      const targetId = item.href.slice(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const headerOffset = 90;
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
        setActiveNav(targetId);
      }
    }
  };

  const navItems = [
    { id: "overview", label: "Beranda", href: "#overview" },
    { id: "why", label: "Keunggulan", href: "#why" },
    { id: "hardware", label: "Hardware", href: "#hardware" },
    { id: "calculator", label: "Kalkulator", href: "#calculator" },
    { id: "pipeline", label: "Alur Sinyal", href: "#pipeline" },
    { id: "bands", label: "Spektrum EEG", href: "#bands" },
    { id: "about", label: "Tentang Riset", href: "/about" },
  ];

  // Dynamic calculations for research estimator
  const calcMetrics = useMemo(() => {
    // 2 bytes per sample + 10% packet metadata overhead
    const bytesPerSecond = calcChannels * calcSamplingRate * 2 * 1.1;
    const throughputKBps = (bytesPerSecond / 1024).toFixed(2);
    const sessionMB = ((bytesPerSecond * (calcDurationMin * 60)) / (1024 * 1024)).toFixed(1);
    
    // Battery life: 500mAh / total mA draw
    const baseCurrentMA = 38; // ESP32 idle + regulator
    const wifiTxCurrentMA = 12 * (calcSamplingRate / 256);
    const tgamDrawMA = 7 * calcChannels;
    const totalDrawMA = baseCurrentMA + wifiTxCurrentMA + tgamDrawMA;
    const batteryHours = (500 / totalDrawMA).toFixed(1);

    // Latency
    const latencyMs = (11 + calcChannels * 1.6 + (calcSamplingRate === 512 ? 2.5 : 1.2)).toFixed(1);

    // Estimated Model Accuracy
    const accuracy =
      calcModel === "svm" ? "94.6%" : calcModel === "rf" ? "92.8%" : "96.4%";

    return {
      throughputKBps,
      sessionMB,
      batteryHours,
      latencyMs,
      accuracy,
      totalDrawMA: totalDrawMA.toFixed(0),
    };
  }, [calcChannels, calcSamplingRate, calcDurationMin, calcModel]);

  // Streaming waveform synthesis with rhythm & notch filter effects
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setDemoSamples((prev) => {
        const nextTime = (prev[prev.length - 1]?.timestamp || 0) + 20;

        // Base rhythm depending on user selection
        let rhythmComponent = 0;
        if (selectedRhythm === "alpha") {
          rhythmComponent = Math.sin(nextTime * 0.063) * 22; // ~10 Hz
        } else if (selectedRhythm === "beta") {
          rhythmComponent = Math.sin(nextTime * 0.126) * 14; // ~20 Hz
        } else if (selectedRhythm === "theta") {
          rhythmComponent = Math.sin(nextTime * 0.038) * 26; // ~6 Hz
        } else if (selectedRhythm === "delta") {
          rhythmComponent = Math.sin(nextTime * 0.013) * 34; // ~2 Hz
        }

        // Secondary subtle physiological fluctuation
        const subHarmonic = Math.sin(nextTime * 0.02) * 5;

        // 50 Hz power line noise artifact if filter is OFF
        const notchNoise = notchFilterActive ? 0 : Math.sin(nextTime * 0.314) * 8.5;

        // Thermal white noise floor
        const thermalNoise = (Math.random() - 0.5) * 2.8;

        const val = Number((rhythmComponent + subHarmonic + notchNoise + thermalNoise).toFixed(2));
        const newSample = {
          timestamp: nextTime,
          rawEEG: val,
          signalQuality: notchFilterActive ? 98 : 74,
        };
        return [...prev.slice(1), newSample];
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isStreaming, selectedRhythm, notchFilterActive]);

  // Calibration action
  const handleCalibrate = () => {
    setCalibrating(true);
    setCalibrateSuccess(false);
    setTimeout(() => {
      setCalibrating(false);
      setCalibrateSuccess(true);
      setTimeout(() => setCalibrateSuccess(false), 3000);
    }, 1200);
  };

  const handleConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConsultSubmitted(true);
    setTimeout(() => {
      setConsultSubmitted(false);
      setConsultModalOpen(false);
    }, 2000);
  };

  const handleCopyCalcConfig = () => {
    const configData = {
      platform: "NeuroPulse IoT EEG",
      experimentFocus: calcFocus,
      channels: calcChannels,
      samplingRateSPS: calcSamplingRate,
      sessionDurationMin: calcDurationMin,
      mlModel: calcModel,
      estimatedThroughputKBps: calcMetrics.throughputKBps,
      estimatedSessionStorageMB: calcMetrics.sessionMB,
      estimatedBatteryLifeHours: calcMetrics.batteryHours,
      estimatedLatencyMs: calcMetrics.latencyMs,
      predictedAccuracy: calcMetrics.accuracy,
    };
    navigator.clipboard.writeText(JSON.stringify(configData, null, 2));
    setCopiedCalc(true);
    setTimeout(() => setCopiedCalc(false), 2500);
  };

  const handleCopyFirmware = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setFirmwareCopied(true);
    setTimeout(() => setFirmwareCopied(false), 2500);
  };

  const spectrumBars = [
    { freq: "1.5 Hz", power: selectedRhythm === "delta" ? "48.2 µV²" : "14.2 µV²", height: selectedRhythm === "delta" ? 92 : 32, band: "Delta" },
    { freq: "3.0 Hz", power: selectedRhythm === "delta" ? "54.1 µV²" : "18.5 µV²", height: selectedRhythm === "delta" ? 98 : 44, band: "Delta" },
    { freq: "5.0 Hz", power: selectedRhythm === "theta" ? "62.4 µV²" : "24.1 µV²", height: selectedRhythm === "theta" ? 88 : 58, band: "Theta" },
    { freq: "7.0 Hz", power: selectedRhythm === "theta" ? "74.8 µV²" : "31.8 µV²", height: selectedRhythm === "theta" ? 96 : 68, band: "Theta" },
    { freq: "8.5 Hz", power: selectedRhythm === "alpha" ? "82.5 µV²" : "46.2 µV²", height: selectedRhythm === "alpha" ? 90 : 86, band: "Alpha" },
    { freq: "10.0 Hz", power: selectedRhythm === "alpha" ? "98.4 µV²" : "68.4 µV²", height: selectedRhythm === "alpha" ? 100 : 96, band: "Alpha" },
    { freq: "12.0 Hz", power: selectedRhythm === "alpha" ? "76.1 µV²" : "54.1 µV²", height: selectedRhythm === "alpha" ? 82 : 80, band: "Alpha" },
    { freq: "14.0 Hz", power: selectedRhythm === "beta" ? "65.7 µV²" : "29.7 µV²", height: selectedRhythm === "beta" ? 85 : 60, band: "Beta" },
    { freq: "18.0 Hz", power: selectedRhythm === "beta" ? "84.3 µV²" : "22.3 µV²", height: selectedRhythm === "beta" ? 94 : 48, band: "Beta" },
    { freq: "24.0 Hz", power: selectedRhythm === "beta" ? "72.8 µV²" : "16.8 µV²", height: selectedRhythm === "beta" ? 88 : 38, band: "Beta" },
    { freq: "32.0 Hz", power: "11.2 µV²", height: 26, band: "Gamma" },
    { freq: "42.0 Hz", power: "8.4 µV²", height: 18, band: "Gamma" },
  ];

  const frequencyCards = [
    {
      id: "delta" as const,
      name: "Delta Rhythm",
      range: "0.5 – 4 Hz",
      voltage: "20 – 100 µV",
      state: "Osilasi tidur lelap restoratif & pemulihan kortikal",
      sineWave: "M 0 16 Q 16 0 32 16 T 64 16 T 96 16 T 128 16",
    },
    {
      id: "theta" as const,
      name: "Theta Rhythm",
      range: "4 – 8 Hz",
      voltage: "10 – 50 µV",
      state: "Meditasi dalam, kantuk & konsolidasi memori",
      sineWave: "M 0 16 Q 10 2 20 16 T 40 16 T 60 16 T 80 16 T 100 16 T 120 16 T 128 16",
    },
    {
      id: "alpha" as const,
      name: "Alpha Rhythm",
      range: "8 – 13 Hz",
      voltage: "20 – 60 µV",
      state: "Kondisi rileks terjaga, fokus tenang posterior",
      sineWave: "M 0 16 Q 6 4 12 16 T 24 16 T 36 16 T 48 16 T 60 16 T 72 16 T 84 16 T 96 16 T 108 16 T 120 16 T 128 16",
    },
    {
      id: "beta" as const,
      name: "Beta Rhythm",
      range: "13 – 30 Hz",
      voltage: "5 – 30 µV",
      state: "Aktivitas kognitif intens, pemecahan masalah & siaga",
      sineWave: "M 0 16 Q 3 6 6 16 T 12 16 T 18 16 T 24 16 T 30 16 T 36 16 T 42 16 T 48 16 T 54 16 T 60 16 T 66 16 T 72 16 T 78 16 T 84 16 T 90 16 T 96 16 T 102 16 T 108 16 T 114 16 T 120 16 T 128 16",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F0EDE6] text-[#262622] flex flex-col font-sans selection:bg-[#5F6E52]/20 selection:text-[#262622] py-3 sm:py-4 px-3 sm:px-4 md:px-6">
      <div className="max-w-[1240px] w-full mx-auto space-y-4 sm:space-y-5">
        
        {/* 1. FLOATING GLASSMORPHISM PILL NAVBAR (Inspired by User Screenshot 1) */}
        <header className="sticky top-3 sm:top-4 z-50 w-full transition-all">
          <div className="bg-[#FAF9F6]/90 backdrop-blur-xl rounded-full border border-white/80 shadow-[0_14px_34px_-10px_rgba(50,48,38,0.12)] px-3.5 sm:px-5 py-2.5 flex items-center justify-between gap-4">
            
            {/* Left: Brand Identity */}
            <Link href="/" aria-label="NeuroPulse Home" className="inline-flex items-center gap-3 group shrink-0">
              <div className="w-9 h-9 rounded-full bg-[#E8ECDF] border border-[rgba(102,116,79,0.25)] flex items-center justify-center text-[#58684C] transition-transform group-hover:scale-105 shadow-2xs">
                <Activity className="w-4.5 h-4.5 stroke-[2.2]" />
              </div>
              <div>
                <span className="font-serif font-bold text-base tracking-tight text-[#1E201D] block leading-none">
                  NeuroPulse
                </span>
                <span className="text-[10px] font-mono tracking-wider uppercase text-[#77776E] block mt-0.5">
                  IoT Biosignal Platform
                </span>
              </div>
            </Link>

            {/* Center: Navigation Links with Active Pill & Indicator Dot (Exact match to SS 1) */}
            <div className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-stone-100/70 border border-[rgba(40,40,30,0.04)]">
              {navItems.map((item) => {
                const isActive = activeNav === item.id;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={(e) => scrollToSection(e, item)}
                    className={`relative px-3.5 py-1.5 rounded-full text-[13px] transition-all flex items-center gap-1 ${
                      isActive
                        ? "bg-white text-[#1E201D] shadow-xs font-semibold"
                        : "text-[#77776E] hover:text-[#1E201D] font-medium"
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#5F6E52]" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right: Login & Register (Sesuai Permintaan User: Fokus Login & Register dengan style SS 1) */}
            <div className="flex items-center gap-2 shrink-0">
              {mounted && user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-[#5F6E52] hover:bg-[#4E5C43] text-white text-xs font-semibold transition-all shadow-xs group"
                >
                  <span>Console</span>
                  <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold text-[#1E201D] hover:text-[#5F6E52] transition-colors"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-[#5F6E52] hover:bg-[#4E5C43] text-white text-xs font-semibold transition-all shadow-xs group cursor-pointer"
                  >
                    <span>Daftar</span>
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </>
              )}

              {/* Mobile Hamburger Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="w-9 h-9 rounded-full border border-[rgba(40,40,30,0.1)] bg-white/80 flex lg:hidden items-center justify-center text-[#1E201D] cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>

          </div>

          {/* Mobile Navigation Dropdown */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-2 p-5 rounded-3xl bg-[#FAF9F6] border border-white/80 shadow-xl space-y-3 text-sm font-medium text-[#262622] animate-in fade-in duration-150">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={(e) => {
                    scrollToSection(e, item);
                    setMobileMenuOpen(false);
                  }}
                  className={`block py-1.5 px-3 rounded-xl transition-colors ${
                    activeNav === item.id ? "bg-white font-semibold text-[#5F6E52]" : "hover:text-[#5F6E52]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-[rgba(40,40,30,0.06)] grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center py-2.5 rounded-full border border-[rgba(40,40,30,0.12)] bg-white text-[#262622] text-xs font-semibold"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center gap-1 py-2.5 rounded-full bg-[#5F6E52] text-white text-xs font-semibold"
                >
                  <span>Daftar</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </header>

        {/* PANEL 1: HERO SECTION */}
        <section
          id="overview"
          className="scroll-mt-24 sm:scroll-mt-28 relative bg-[#FAF9F6] rounded-[32px] sm:rounded-[36px] border border-[rgba(40,40,30,0.06)] px-6 sm:px-10 lg:px-12 pt-8 sm:pt-10 pb-24 shadow-[0_20px_50px_-20px_rgba(50,48,38,0.1)] overflow-visible"
        >
          {/* HERO CONTENT GRID */}
          <div className="pt-4 pb-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left 45%: Editorial Headline, Paragraph, Buttons, Social Proof */}
            <div className="lg:col-span-5 space-y-6 text-left">
              <div className="space-y-1">
                <h1 className="font-serif text-[42px] sm:text-[50px] lg:text-[54px] leading-[1.06] tracking-[-0.015em] text-[#1E201D] font-medium">
                  Sistem Telemetri EEG
                  <br />
                  Wearable Presisi
                  <span className="block font-serif italic font-normal text-[#58684C] text-[0.88em] mt-1">
                    untuk riset & eksplorasi pikiran
                  </span>
                </h1>
              </div>

              <p className="text-[14.5px] leading-relaxed text-[#6E7168] max-w-[430px]">
                Platform pemantauan biosinyal non-invasif dengan sampling 512 SPS kontinu, elektroda kering tanpa pasta gel, dan transmisi nirkabel instan untuk riset elektroensefalografi modern.
              </p>

              {/* Action Buttons: Matching Reference "Рассчитать проект (+)" Button */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="#calculator"
                  className="inline-flex items-center gap-3 pl-6 pr-2 py-2.5 rounded-full bg-[#5F6E52] hover:bg-[#4E5C43] text-white text-sm font-medium transition-all shadow-sm group"
                >
                  <span>Kalkulasi Kebutuhan</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:rotate-45">
                    <Plus className="w-4 h-4 text-white stroke-[2.5]" />
                  </div>
                </Link>

                <button
                  onClick={() => setConsultModalOpen(true)}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white hover:bg-stone-50 text-[#262622] text-sm font-medium border border-[rgba(40,40,30,0.12)] hover:border-[#5F6E52]/40 transition-all shadow-xs cursor-pointer"
                >
                  Konsultasi Riset
                </button>
              </div>

              {/* Social Proof Avatar Group (Exact match to reference: 3 avatars + text) */}
              <div className="pt-2 flex items-center gap-3.5">
                <div className="flex -space-x-2.5 overflow-hidden">
                  <div className="inline-block h-9 w-9 rounded-full ring-2 ring-[#FAF9F6] relative overflow-hidden bg-stone-200">
                    <Image
                      src="/images/avatar1.jpg"
                      alt="Researcher Dr. Maya"
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  </div>
                  <div className="inline-block h-9 w-9 rounded-full ring-2 ring-[#FAF9F6] relative overflow-hidden bg-stone-200">
                    <Image
                      src="/images/avatar2.jpg"
                      alt="Engineer David"
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  </div>
                  <div className="inline-block h-9 w-9 rounded-full ring-2 ring-[#FAF9F6] relative overflow-hidden bg-stone-200">
                    <Image
                      src="/images/avatar3.jpg"
                      alt="Neuroscientist Dr. Chen"
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  </div>
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-[#1E201D] block leading-tight">
                    Lebih dari 150+ Peneliti & Klinisi
                  </span>
                  <span className="text-[11px] text-[#77776E]">
                    menggunakan metodologi biosinyal terbuka kami
                  </span>
                </div>
              </div>
            </div>

            {/* Right 55%: Magnificent Architectural Visual Canvas (100% Real Non-AI Photography) */}
            <div className="lg:col-span-7 relative">
              <div className="relative rounded-[28px] overflow-hidden border border-[rgba(40,40,30,0.08)] bg-stone-100 shadow-[0_16px_36px_-12px_rgba(50,48,38,0.18)]">
                
                {/* Visual Canvas: Mode Switcher between Neural EEG Visual (eeg-wearable-rei.png), Live Waveform, and Electronics Lab */}
                {heroViewMode === "arch" ? (
                  <div className="relative aspect-[16/10] sm:aspect-[16/10] w-full bg-[#03070E] overflow-hidden group">
                    <Image
                      src="/images/eeg-wearable-hero-sharp.png"
                      alt="Visualisasi Resonansi Biosinyal Wearable EEG"
                      fill
                      priority
                      unoptimized
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                      sizes="(max-width: 1024px) 100vw, 800px"
                    />
                    
                    {/* Top overlay controls */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-[11px] font-mono text-white shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-[#82996E] animate-pulse" />
                        <span>Akuisisi Gelombang Otak · 512 SPS</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setHeroViewMode("oscilloscope")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white backdrop-blur-md border border-[rgba(40,40,30,0.1)] text-[11px] font-mono text-[#58684C] font-semibold transition-all shadow-xs cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Live Waveform</span>
                        </button>
                        <button
                          onClick={() => setHeroViewMode("workbench")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white backdrop-blur-md border border-[rgba(40,40,30,0.1)] text-[11px] font-mono text-[#262622] transition-all shadow-xs cursor-pointer"
                        >
                          <Cpu className="w-3.5 h-3.5" />
                          <span>Workbench</span>
                        </button>
                      </div>
                    </div>

                    {/* Bottom atmospheric dark gradient for text legibility */}
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

                    <div className="absolute bottom-4 left-5 right-5 text-white/95 flex items-end justify-between z-10">
                      <div>
                        <span className="text-[11px] font-mono tracking-widest uppercase text-white/70 block">
                          Pusat Riset Telemetri IoT
                        </span>
                        <span className="text-sm font-semibold tracking-tight text-white block">
                          Visualisasi Resonansi Pikiran & Gelombang Otak
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/20">
                        {RESEARCH_SPECS.mcu} · {RESEARCH_SPECS.asic}
                      </span>
                    </div>
                  </div>
                ) : heroViewMode === "workbench" ? (
                  <div className="relative aspect-[16/10] sm:aspect-[16/10] w-full">
                    <Image
                      src="/images/hardware_esp32_bench.jpg"
                      alt="Laboratorium Perancangan Sirkuit ESP32 EEG"
                      fill
                      className="object-cover transition-transform duration-700 hover:scale-[1.02]"
                      sizes="(max-width: 1024px) 100vw, 700px"
                    />
                    
                    {/* Top overlay controls */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-[rgba(40,40,30,0.08)] text-[11px] font-mono text-[#1E201D] shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-[#5F6E52] animate-pulse" />
                        <span>Meja Uji Hardware Presisi</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setHeroViewMode("arch")}
                          className="px-3 py-1.5 rounded-full bg-white/90 hover:bg-white backdrop-blur-md border border-[rgba(40,40,30,0.1)] text-[11px] font-mono text-[#262622] transition-all shadow-xs cursor-pointer"
                        >
                          Resonansi Neural
                        </button>
                        <button
                          onClick={() => setHeroViewMode("oscilloscope")}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#5F6E52] text-white text-[11px] font-mono hover:bg-[#4E5C43] transition-all shadow-xs cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Live Waveform</span>
                        </button>
                      </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />

                    <div className="absolute bottom-4 left-5 right-5 text-white/95 flex items-end justify-between z-10">
                      <div>
                        <span className="text-[11px] font-mono tracking-widest uppercase text-white/80 block">
                          Purwarupa Fisik v3.2
                        </span>
                        <span className="text-sm font-semibold tracking-tight text-white block">
                          Solderan SMD & Integrasi Node ESP32 Wi-Fi
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/20">
                        Zero AI Generated
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[16/10] sm:aspect-[16/10] w-full p-4 sm:p-6 flex flex-col justify-between bg-[#FDFBF7]">
                    <div className="flex items-center justify-between pb-3 border-b border-[rgba(40,40,30,0.08)] text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#5F6E52] animate-pulse" />
                        <span className="font-mono font-medium text-[#1E201D] text-[11px]">
                          Real-time Oscilloscope ({RESEARCH_SPECS.samplingRate})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsStreaming(!isStreaming)}
                          className="px-2.5 py-1 rounded-full bg-white border border-[rgba(40,40,30,0.1)] text-[10px] font-mono text-[#262622] hover:bg-stone-50 cursor-pointer flex items-center gap-1"
                        >
                          {isStreaming ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          <span>{isStreaming ? "Jeda" : "Lanjut"}</span>
                        </button>
                        <button
                          onClick={handleCalibrate}
                          disabled={calibrating}
                          className="px-2.5 py-1 rounded-full bg-white border border-[rgba(40,40,30,0.1)] text-[10px] font-mono text-[#262622] hover:bg-stone-50 cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${calibrating ? "animate-spin text-[#5F6E52]" : ""}`} />
                          <span>{calibrating ? "Kalibrasi..." : calibrateSuccess ? "Terverifikasi ✓" : "Kalibrasi"}</span>
                        </button>
                        <button
                          onClick={() => setHeroViewMode("arch")}
                          className="px-2.5 py-1 rounded-full bg-[#5F6E52] text-white text-[10px] font-mono hover:bg-[#4E5C43] cursor-pointer"
                        >
                          Resonansi Neural
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 w-full my-2 overflow-hidden flex items-center justify-center">
                      <WaveformChart
                        samples={demoSamples}
                        height={230}
                        isStreaming={isStreaming}
                        status="ACQUIRING"
                        voltageRange={50}
                        className="!border-0 !shadow-none !rounded-none !bg-transparent w-full"
                      />
                    </div>

                    <div className="pt-2 border-t border-[rgba(40,40,30,0.06)] flex items-center justify-between text-[11px] font-mono text-[#77776E]">
                      <span>SNR: {RESEARCH_SPECS.snr} · Noise: {RESEARCH_SPECS.noiseFloor}</span>
                      <span className="text-[#58684C] font-semibold">10-20 Standard Montage</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. THREE FLOATING PILL METRIC CARDS (Exact match to reference bottom cards) */}
          <div className="mt-8 lg:mt-0 lg:absolute lg:-bottom-7 lg:left-12 lg:right-12 z-20 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            
            {/* Pill 1 */}
            <div className="bg-white/95 backdrop-blur-md rounded-[22px] py-4 px-5 border border-[rgba(40,40,30,0.08)] shadow-[0_12px_28px_-10px_rgba(50,48,38,0.14)] flex items-center gap-4 transition-transform hover:-translate-y-0.5">
              <div className="w-11 h-11 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#58684C] shrink-0">
                <Gauge className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="text-[17px] font-bold font-mono text-[#1E201D] block leading-none">
                  {RESEARCH_SPECS.noiseFloor}
                </span>
                <span className="text-[12px] text-[#77776E] block mt-1">
                  Noise Floor (0.5 – 50 Hz)
                </span>
              </div>
            </div>

            {/* Pill 2 */}
            <div className="bg-white/95 backdrop-blur-md rounded-[22px] py-4 px-5 border border-[rgba(40,40,30,0.08)] shadow-[0_12px_28px_-10px_rgba(50,48,38,0.14)] flex items-center gap-4 transition-transform hover:-translate-y-0.5">
              <div className="w-11 h-11 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#58684C] shrink-0">
                <Radio className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="text-[17px] font-bold font-mono text-[#1E201D] block leading-none">
                  {RESEARCH_SPECS.samplingRate}
                </span>
                <span className="text-[12px] text-[#77776E] block mt-1">
                  Sampling Rate Telemetri
                </span>
              </div>
            </div>

            {/* Pill 3 */}
            <div className="bg-white/95 backdrop-blur-md rounded-[22px] py-4 px-5 border border-[rgba(40,40,30,0.08)] shadow-[0_12px_28px_-10px_rgba(50,48,38,0.14)] flex items-center gap-4 transition-transform hover:-translate-y-0.5">
              <div className="w-11 h-11 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#58684C] shrink-0">
                <Wifi className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="text-[17px] font-bold font-mono text-[#1E201D] block leading-none">
                  {RESEARCH_SPECS.packetDelivery}
                </span>
                <span className="text-[12px] text-[#77776E] block mt-1">
                  Packet Delivery Rate
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* PANEL 2: "MENGAPA KAMI" / BENTO GRID (Exact match to User Reference section 2 with 100% Real Photography) */}
        <section
          id="why"
          className="scroll-mt-24 sm:scroll-mt-28 bg-[#FAF9F6] rounded-[32px] sm:rounded-[36px] border border-[rgba(40,40,30,0.06)] p-6 sm:p-10 lg:p-12 shadow-[0_16px_40px_-20px_rgba(50,48,38,0.08)]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            
            {/* Left 40%: Overline, H2, Paragraph, Pill Button, Eco Badge */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.14em] uppercase text-[#77776E]">
                <span>KEUNGGULAN RISET</span>
                <span className="w-12 h-px bg-[#77776E]/30" />
              </div>

              <h2 className="font-serif font-medium text-3xl sm:text-4xl leading-[1.12] text-[#1E201D] tracking-[-0.01em]">
                Teknologi Pemantauan Otak yang Presisi & Nyaman
              </h2>

              <p className="text-[14.5px] text-[#6E7168] leading-relaxed">
                Kami menggabungkan analog front-end berpresisi tinggi, elektroda kering tanpa pasta gel, serta pipa telemetri nirkabel berkecepatan tinggi untuk menghasilkan data elektroensefalografi yang bersih dan siap diolah oleh model kecerdasan buatan.
              </p>

              <div>
                <Link
                  href="/about"
                  className="inline-flex items-center gap-3 pl-6 pr-2 py-2.5 rounded-full bg-[#5F6E52] hover:bg-[#4E5C43] text-white text-xs font-medium transition-all shadow-sm group"
                >
                  <span>Arsitektur Sistem</span>
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </div>
                </Link>
              </div>

              {/* Eco/Biocompatible Floating Badge (Matching Reference leaf badge!) */}
              <div className="bg-white/90 rounded-[22px] p-4 border border-[rgba(40,40,30,0.08)] shadow-xs flex items-center gap-3.5 max-w-sm">
                <div className="w-10 h-10 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#58684C] shrink-0">
                  <Leaf className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#1E201D] block">
                    Bahan Medis Biokompatibel
                  </span>
                  <span className="text-[11.5px] text-[#77776E] block mt-0.5">
                    Elektroda kering ramah kulit, bebas pasta, aman untuk pemakaian berkelanjutan.
                  </span>
                </div>
              </div>
            </div>

            {/* Right 60%: 2x2 Bento Cards with 100% REAL AUTHENTIC PHOTOGRAPHY AT THE BOTTOM OF EACH CARD */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Card 1: Non-Invasive Biosensing / Scandinavian In-Home Comfort */}
              <div className="bg-white rounded-[24px] p-5 border border-[rgba(40,40,30,0.08)] shadow-xs flex flex-col justify-between space-y-4 transition-transform hover:-translate-y-1 duration-300">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#58684C]">
                    <Activity className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#1E201D] leading-snug">
                    Akuisisi FP1 Non-Invasif
                  </h3>
                  <p className="text-xs text-[#77776E] leading-relaxed">
                    Kenyamanan pemantauan gelombang otak di lingkungan natural rumah tanpa persiapan pasta gel lengket.
                  </p>
                </div>
                {/* Photo at the bottom of the card: Real Scandinavian living room */}
                <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden border border-[rgba(40,40,30,0.06)] bg-stone-100">
                  <Image
                    src="/images/bento_green_arch.jpg"
                    alt="Ruang santai Scandinavian dengan pencahayaan alami"
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                </div>
              </div>

              {/* Card 2: ESP32 Telemetry & Blueprints */}
              <div className="bg-white rounded-[24px] p-5 border border-[rgba(40,40,30,0.08)] shadow-xs flex flex-col justify-between space-y-4 transition-transform hover:-translate-y-1 duration-300">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#58684C]">
                    <Cpu className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#1E201D] leading-snug">
                    Rancang Bangun Telemetri
                  </h3>
                  <p className="text-xs text-[#77776E] leading-relaxed">
                    Perancangan skematik presisi dengan transmisi Wi-Fi WebSocket 50 Hz berlatensi sub-20ms.
                  </p>
                </div>
                {/* Photo at bottom: Real engineer drafting schematic blueprint on wood */}
                <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden border border-[rgba(40,40,30,0.06)] bg-stone-100">
                  <Image
                    src="/images/bento_telemetry.jpg"
                    alt="Skematik teknis dan perancangan blueprint hardware"
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                </div>
              </div>

              {/* Card 3: Quality Control & Signal Verification */}
              <div className="bg-white rounded-[24px] p-5 border border-[rgba(40,40,30,0.08)] shadow-xs flex flex-col justify-between space-y-4 transition-transform hover:-translate-y-1 duration-300">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#58684C]">
                    <BarChart3 className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#1E201D] leading-snug">
                    Verifikasi Sinyal Real-Time
                  </h3>
                  <p className="text-xs text-[#77776E] leading-relaxed">
                    Pemeriksaan impedansi kontak dan rasio SNR 24.8 dB secara kontinyu selama sesi riset.
                  </p>
                </div>
                {/* Photo at bottom: Real engineer testing in facility */}
                <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden border border-[rgba(40,40,30,0.06)] bg-stone-100">
                  <Image
                    src="/images/bento_verification.jpg"
                    alt="Peneliti menginspeksi kalibrasi sinyal di fasilitas pengujian"
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                </div>
              </div>

              {/* Card 4: Energy Efficiency & Sustainable Architecture */}
              <div className="bg-white rounded-[24px] p-5 border border-[rgba(40,40,30,0.08)] shadow-xs flex flex-col justify-between space-y-4 transition-transform hover:-translate-y-1 duration-300">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#58684C]">
                    <BatteryCharging className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#1E201D] leading-snug">
                    Efisiensi Daya Berkelanjutan
                  </h3>
                  <p className="text-xs text-[#77776E] leading-relaxed">
                    Sirkuit regulator ultra-rendah konsumsi daya mendukung 8+ jam sesi monitoring tanpa henti.
                  </p>
                </div>
                {/* Photo at bottom: Real modern eco-villa with pool and sustainable architecture */}
                <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden border border-[rgba(40,40,30,0.06)] bg-stone-100">
                  <Image
                    src="/images/bento_eco_arch.jpg"
                    alt="Arsitektur modern efisiensi energi dengan pencahayaan alami"
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* PANEL 3: "PURWARUPA & HARDWARE" / 3 SHOWCASE CARDS (Exact match to User Reference section 3 with 100% Real Photography) */}
        <section
          id="hardware"
          className="scroll-mt-24 sm:scroll-mt-28 bg-[#FAF9F6] rounded-[32px] sm:rounded-[36px] border border-[rgba(40,40,30,0.06)] p-6 sm:p-10 lg:p-12 shadow-[0_16px_40px_-20px_rgba(50,48,38,0.08)]"
        >
          {/* Header Row: Left Title & Overline, Right Link */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.14em] uppercase text-[#77776E]">
                <span>PURWARUPA & MODUL</span>
                <span className="w-12 h-px bg-[#77776E]/30" />
              </div>
              <h2 className="font-serif font-medium text-3xl sm:text-4xl leading-tight text-[#1E201D] tracking-[-0.01em]">
                Purwarupa yang Diwujudkan
              </h2>
            </div>

            <Link
              href="/devices"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#58684C] hover:text-[#3D4C32] group"
            >
              <span>Semua Komponen & Skematik</span>
              <div className="w-7 h-7 rounded-full bg-[#E8ECDF] flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="w-3.5 h-3.5 text-[#58684C]" />
              </div>
            </Link>
          </div>

          {/* 3 Large Showcase Cards (Matching Reference layout) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HARDWARE_SHOWCASE.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedHardware(item);
                  setHardwareActiveTab("overview");
                }}
                className="bg-white rounded-[26px] p-4 sm:p-5 border border-[rgba(40,40,30,0.08)] shadow-xs flex flex-col justify-between space-y-4 transition-transform hover:-translate-y-1 duration-300 cursor-pointer group/card"
              >
                {/* Photo with rounded-2xl and frosted top-left badge */}
                <div className="relative aspect-[16/11] w-full rounded-2xl overflow-hidden border border-[rgba(40,40,30,0.06)] bg-stone-100">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                    sizes="(max-width: 768px) 100vw, 360px"
                  />
                  {/* Frosted spec badge pinned top-left */}
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/85 backdrop-blur-md border border-[rgba(40,40,30,0.08)] text-[11px] font-mono font-medium text-[#1E201D] shadow-xs">
                    {item.badge}
                  </div>
                </div>

                <div className="space-y-1.5 flex-1">
                  <h3 className="text-base font-semibold text-[#1E201D] group-hover/card:text-[#5F6E52] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#77776E] leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>

                {/* Bottom link with circular plus button */}
                <div className="pt-3 border-t border-[rgba(40,40,30,0.06)] flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#77776E]">
                    {item.specs[0].value}
                  </span>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#58684C] group-hover/card:text-[#3D4C32]">
                    <span>Detail Spesifikasi</span>
                    <div className="w-6 h-6 rounded-full bg-[#E8ECDF] flex items-center justify-center transition-transform group-hover/card:rotate-45">
                      <Plus className="w-3.5 h-3.5 text-[#58684C] stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Carousel Pagination Dots below (Matching Reference 3 dots) */}
          <div className="mt-8 flex items-center justify-center gap-2">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                onClick={() => setActivePaginationDot(idx)}
                aria-label={`Pilih slide ${idx + 1}`}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  activePaginationDot === idx ? "bg-[#5F6E52] w-6" : "bg-[#77776E]/25 w-2.5"
                }`}
              />
            ))}
          </div>
        </section>

        {/* NEW INTERACTIVE PANEL: RESEARCH EXPERIMENT CONFIGURATOR & ESTIMATOR ("Kalkulator Riset") */}
        <section
          id="calculator"
          className="scroll-mt-24 sm:scroll-mt-28 bg-[#FAF9F6] rounded-[32px] sm:rounded-[36px] border border-[rgba(40,40,30,0.06)] p-6 sm:p-10 lg:p-12 shadow-[0_16px_40px_-20px_rgba(50,48,38,0.08)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.14em] uppercase text-[#77776E]">
                <span>KALKULATOR & SIMULATOR RISET</span>
                <span className="w-12 h-px bg-[#77776E]/30" />
              </div>
              <h2 className="font-serif font-medium text-3xl sm:text-4xl leading-tight text-[#1E201D] tracking-[-0.01em]">
                Estimasi Kebutuhan Eksperimen EEG
              </h2>
              <p className="text-xs text-[#77776E] max-w-xl">
                Sesuaikan parameter eksperimen biosinyal Anda untuk menghitung bandwidth telemetri real-time, volume data sesi, konsumsi baterai, dan rekomendasi model kecerdasan buatan.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCalcConfig}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-[rgba(40,40,30,0.12)] text-xs font-mono font-medium text-[#1E201D] hover:bg-stone-50 transition-all shadow-2xs cursor-pointer"
              >
                {copiedCalc ? <Check className="w-3.5 h-3.5 text-[#5F6E52]" /> : <Copy className="w-3.5 h-3.5 text-[#77776E]" />}
                <span>{copiedCalc ? "Konfigurasi Tersalin!" : "Salin JSON"}</span>
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#5F6E52] hover:bg-[#4E5C43] text-white text-xs font-mono font-medium transition-all shadow-2xs"
              >
                <span>Buka di Console</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left 55%: Interactive Sliders and Options */}
            <div className="lg:col-span-7 bg-white rounded-[26px] p-6 border border-[rgba(40,40,30,0.08)] shadow-xs space-y-6">
              
              {/* Option 1: Fokus Eksperimen */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#1E201D] flex items-center justify-between">
                  <span>1. Bidang Riset / Fokus Eksperimen</span>
                  <span className="font-mono text-[11px] text-[#58684C] uppercase tracking-wider font-bold">
                    {calcFocus}
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "bci", label: "BCI Motor", desc: "Kontrol Perangkat" },
                    { id: "focus", label: "Fokus / Kognitif", desc: "Beban Kerja Otak" },
                    { id: "sleep", label: "Tidur & Relaksasi", desc: "Staging Gelombang" },
                    { id: "emotion", label: "Emosi & Stres", desc: "Alpha Asymmetry" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setCalcFocus(item.id as any)}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                        calcFocus === item.id
                          ? "bg-[#E8ECDF]/50 border-[#5F6E52] shadow-2xs"
                          : "bg-stone-50 border-stone-200/80 hover:bg-stone-100/70"
                      }`}
                    >
                      <span className="text-xs font-semibold text-[#1E201D] block">{item.label}</span>
                      <span className="text-[10px] text-[#77776E] block mt-0.5">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 2: Jumlah Kanal & Sampling Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Channels */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#1E201D] block">
                    2. Kanal Elektroda (Montage)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { ch: 1, label: "1-Ch FP1" },
                      { ch: 2, label: "2-Ch Bipolar" },
                      { ch: 4, label: "4-Ch Frontal" },
                    ].map((item) => (
                      <button
                        key={item.ch}
                        onClick={() => setCalcChannels(item.ch as any)}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-mono font-medium border transition-all cursor-pointer ${
                          calcChannels === item.ch
                            ? "bg-[#5F6E52] text-white border-[#5F6E52]"
                            : "bg-stone-50 border-stone-200 text-[#262622] hover:bg-stone-100"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sampling Rate */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#1E201D] block">
                    3. Sampling Rate (ADC)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[128, 256, 512].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => setCalcSamplingRate(rate as any)}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-mono font-medium border transition-all cursor-pointer ${
                          calcSamplingRate === rate
                            ? "bg-[#5F6E52] text-white border-[#5F6E52]"
                            : "bg-stone-50 border-stone-200 text-[#262622] hover:bg-stone-100"
                        }`}
                      >
                        {rate} SPS
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Option 3: Durasi Sesi Riset (Slider) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#1E201D]">
                  <span>4. Durasi Sesi Perekaman</span>
                  <span className="font-mono text-[#58684C] font-bold">
                    {calcDurationMin < 60 ? `${calcDurationMin} Menit` : `${(calcDurationMin / 60).toFixed(1)} Jam (${calcDurationMin} m)`}
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={480}
                  step={15}
                  value={calcDurationMin}
                  onChange={(e) => setCalcDurationMin(Number(e.target.value))}
                  className="w-full accent-[#5F6E52] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#77776E]">
                  <span>15 Menit</span>
                  <span>1 Jam</span>
                  <span>4 Jam</span>
                  <span>8 Jam</span>
                </div>
              </div>

              {/* Option 4: Algoritma Machine Learning */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#1E201D] block">
                  5. Model Inferensi Machine Learning
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "svm", label: "SVM (RBF Kernel)", desc: "Latensi Terendah" },
                    { id: "rf", label: "Random Forest", desc: "Explainable Trees" },
                    { id: "cnn", label: "1D-CNN Neural", desc: "Akurasi Tertinggi" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setCalcModel(m.id as any)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        calcModel === m.id
                          ? "bg-[#E8ECDF]/50 border-[#5F6E52]"
                          : "bg-stone-50 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      <span className="text-xs font-semibold text-[#1E201D] block">{m.label}</span>
                      <span className="text-[10px] text-[#77776E] block mt-0.5">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Right 45%: Dynamic Telemetry & Engineering Projections */}
            <div className="lg:col-span-5 bg-stone-900 text-stone-100 rounded-[26px] p-6 shadow-sm space-y-6">
              
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#82996E] animate-pulse" />
                  <span className="font-mono text-xs uppercase tracking-wider text-stone-300 font-semibold">
                    Proyeksi Telemetri Real-Time
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 border border-stone-700">
                  ESP32 + Go Gin
                </span>
              </div>

              {/* Output Metric Cards */}
              <div className="grid grid-cols-2 gap-3">
                
                {/* Metric 1 */}
                <div className="bg-stone-800/80 rounded-2xl p-3.5 border border-stone-700/60">
                  <span className="text-[10px] font-mono uppercase text-stone-400 block">Throughput Sinyal</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-white">{calcMetrics.throughputKBps}</span>
                    <span className="text-xs font-mono text-stone-400">KB/s</span>
                  </div>
                  <span className="text-[10px] text-stone-400 block mt-1">Via WebSocket 50 Hz</span>
                </div>

                {/* Metric 2 */}
                <div className="bg-stone-800/80 rounded-2xl p-3.5 border border-stone-700/60">
                  <span className="text-[10px] font-mono uppercase text-stone-400 block">Total Volume Sesi</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-white">{calcMetrics.sessionMB}</span>
                    <span className="text-xs font-mono text-stone-400">MB</span>
                  </div>
                  <span className="text-[10px] text-stone-400 block mt-1">PostgreSQL persistensi</span>
                </div>

                {/* Metric 3 */}
                <div className="bg-stone-800/80 rounded-2xl p-3.5 border border-stone-700/60">
                  <span className="text-[10px] font-mono uppercase text-stone-400 block">Estimasi Baterai</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-white">{calcMetrics.batteryHours}</span>
                    <span className="text-xs font-mono text-stone-400">Jam</span>
                  </div>
                  <span className="text-[10px] text-stone-400 block mt-1">LiPo 500mAh ({calcMetrics.totalDrawMA} mA)</span>
                </div>

                {/* Metric 4 */}
                <div className="bg-stone-800/80 rounded-2xl p-3.5 border border-stone-700/60">
                  <span className="text-[10px] font-mono uppercase text-stone-400 block">Prediksi Akurasi</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-[#82996E]">{calcMetrics.accuracy}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 block mt-1">Latensi: {calcMetrics.latencyMs} ms</span>
                </div>

              </div>

              {/* Hardware Recommendation Pill */}
              <div className="p-3.5 rounded-2xl bg-stone-800/50 border border-stone-700/50 space-y-1.5 text-xs">
                <span className="text-[11px] font-mono font-semibold text-[#82996E] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Rekomendasi Hardware Laboratorium</span>
                </span>
                <p className="text-[11.5px] text-stone-300 leading-relaxed">
                  Konfigurasi {calcChannels} kanal @ {calcSamplingRate} SPS sangat optimal dengan modul {RESEARCH_SPECS.asic} dan ESP32-WROOM-32.
                </p>
              </div>

              {/* Bottom Apply Action */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={handleCopyCalcConfig}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-medium transition-all text-center cursor-pointer border border-white/15"
                >
                  {copiedCalc ? "Tersalin ke Clipboard ✓" : "Salin Konfigurasi"}
                </button>
                <Link
                  href="/dashboard"
                  className="flex-1 py-2.5 rounded-xl bg-[#5F6E52] hover:bg-[#4E5C43] text-white text-xs font-mono font-medium transition-all text-center"
                >
                  Terapkan ke Console
                </Link>
              </div>

            </div>

          </div>
        </section>

        {/* PANEL 4: "ALUR KERJA" / 4 STEP FLOW (Exact match to User Reference section 4) */}
        <section
          id="pipeline"
          className="scroll-mt-24 sm:scroll-mt-28 bg-[#FAF9F6] rounded-[32px] sm:rounded-[36px] border border-[rgba(40,40,30,0.06)] p-6 sm:p-10 lg:p-12 shadow-[0_16px_40px_-20px_rgba(50,48,38,0.08)]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* Left 35%: Overline, H2, Subtitle */}
            <div className="lg:col-span-4 space-y-3 text-left">
              <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.14em] uppercase text-[#77776E]">
                <span>ALUR KERJA SISTEM</span>
                <span className="w-12 h-px bg-[#77776E]/30" />
              </div>

              <h2 className="font-serif font-medium text-3xl sm:text-4xl leading-[1.12] text-[#1E201D] tracking-[-0.01em]">
                Proses Transparan dari Sinyal hingga Machine Learning
              </h2>

              <p className="text-xs text-[#77776E] leading-relaxed max-w-sm">
                Empat fase terstruktur untuk menangkap mikrovolt biologis, streaming nirkabel, estimasi spektral, dan inferensi model cerdas.
              </p>
            </div>

            {/* Right 65%: 4 Step Cards Connected with Arrows (Matching Reference!) */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row lg:items-stretch gap-2.5">
              
              {/* Step 01 */}
              <div className="flex-1 bg-white rounded-[22px] p-4 border border-[rgba(40,40,30,0.08)] shadow-xs flex flex-col justify-between space-y-3 min-h-[160px] transition-transform hover:-translate-y-1 duration-200">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#58684C]">
                    <Activity className="w-4 h-4 stroke-[2]" />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#77776E]">01</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1E201D]">Deteksi Biosinyal</h3>
                  <p className="text-[11px] text-[#77776E] mt-1 leading-relaxed">
                    Elektroda kering FP1 menangkap mikrovolt aksi potensial korteks dahi.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#58684C] font-medium pt-1.5 border-t border-[rgba(40,40,30,0.06)]">
                  TGAM1 · 512 Hz
                </span>
              </div>

              {/* Connecting Arrow (Desktop) */}
              <div className="hidden lg:flex items-center justify-center text-[#77776E]/40 shrink-0">
                <ArrowRight className="w-4 h-4 stroke-[1.5]" />
              </div>

              {/* Step 02 */}
              <div className="flex-1 bg-white rounded-[22px] p-4 border border-[rgba(40,40,30,0.08)] shadow-xs flex flex-col justify-between space-y-3 min-h-[160px] transition-transform hover:-translate-y-1 duration-200">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#58684C]">
                    <Wifi className="w-4 h-4 stroke-[2]" />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#77776E]">02</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1E201D]">Streaming Nirkabel</h3>
                  <p className="text-[11px] text-[#77776E] mt-1 leading-relaxed">
                    ESP32 mengemas serial UART ke dalam payload WebSocket 50 Hz aman.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#58684C] font-medium pt-1.5 border-t border-[rgba(40,40,30,0.06)]">
                  50 Hz Wi-Fi
                </span>
              </div>

              {/* Connecting Arrow (Desktop) */}
              <div className="hidden lg:flex items-center justify-center text-[#77776E]/40 shrink-0">
                <ArrowRight className="w-4 h-4 stroke-[1.5]" />
              </div>

              {/* Step 03 */}
              <div className="flex-1 bg-white rounded-[22px] p-4 border border-[rgba(40,40,30,0.08)] shadow-xs flex flex-col justify-between space-y-3 min-h-[160px] transition-transform hover:-translate-y-1 duration-200">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#58684C]">
                    <Database className="w-4 h-4 stroke-[2]" />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#77776E]">03</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1E201D]">DSP & Database</h3>
                  <p className="text-[11px] text-[#77776E] mt-1 leading-relaxed">
                    Backend Go Gin melakukan notch filter 50 Hz & persistensi PostgreSQL.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#58684C] font-medium pt-1.5 border-t border-[rgba(40,40,30,0.06)]">
                  Go Gin + SQL
                </span>
              </div>

              {/* Connecting Arrow (Desktop) */}
              <div className="hidden lg:flex items-center justify-center text-[#77776E]/40 shrink-0">
                <ArrowRight className="w-4 h-4 stroke-[1.5]" />
              </div>

              {/* Step 04 */}
              <div className="flex-1 bg-white rounded-[22px] p-4 border border-[rgba(40,40,30,0.08)] shadow-xs flex flex-col justify-between space-y-3 min-h-[160px] transition-transform hover:-translate-y-1 duration-200">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#58684C]">
                    <Brain className="w-4 h-4 stroke-[2]" />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#77776E]">04</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1E201D]">Inferensi AI</h3>
                  <p className="text-[11px] text-[#77776E] mt-1 leading-relaxed">
                    Mikroservis Python mengklasifikasikan pola kognitif melalui SVM & RF.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#58684C] font-medium pt-1.5 border-t border-[rgba(40,40,30,0.06)]">
                  Scikit-Learn ML
                </span>
              </div>

            </div>
          </div>
        </section>

        {/* PANEL 5: "SPEKTRUM FREKUENSI & WORKBENCH INTERAKTIF" */}
        <section
          id="bands"
          className="scroll-mt-24 sm:scroll-mt-28 bg-[#FAF9F6] rounded-[32px] sm:rounded-[36px] border border-[rgba(40,40,30,0.06)] p-6 sm:p-10 lg:p-12 shadow-[0_16px_40px_-20px_rgba(50,48,38,0.08)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.14em] uppercase text-[#77776E]">
                <span>DINAMIKA GELOMBANG OTAK</span>
                <span className="w-12 h-px bg-[#77776E]/30" />
              </div>
              <h2 className="font-serif font-medium text-3xl sm:text-4xl leading-tight text-[#1E201D] tracking-[-0.01em]">
                Spektrum Frekuensi & Estimasi Daya FFT
              </h2>
              <p className="text-xs text-[#77776E]">
                Pilih ritme gelombang otak di bawah untuk mengamati respon osiloskop real-time serta simulasi filter derau AC 50 Hz.
              </p>
            </div>

            {/* Filter 50Hz Notch Toggle Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNotchFilterActive(!notchFilterActive)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-mono font-medium transition-all cursor-pointer ${
                  notchFilterActive
                    ? "bg-[#E8ECDF] border-[#5F6E52]/40 text-[#3D4C32]"
                    : "bg-red-50 border-red-300 text-red-700"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{notchFilterActive ? "Notch 50 Hz Aktif (Bersih ✓)" : "Derau 50 Hz Terbuka (Unfiltered)"}</span>
              </button>
            </div>
          </div>

          {/* 4 Interactive Rhythm Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {frequencyCards.map((b) => {
              const isSelected = selectedRhythm === b.id;
              return (
                <div
                  key={b.name}
                  onClick={() => setSelectedRhythm(b.id)}
                  className={`rounded-[24px] p-5 space-y-3.5 border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white border-[#5F6E52] shadow-md ring-2 ring-[#5F6E52]/20 -translate-y-1"
                      : "bg-white/80 border-[rgba(40,40,30,0.08)] shadow-xs hover:-translate-y-1 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#1E201D]">{b.name}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                      isSelected ? "bg-[#5F6E52] text-white" : "bg-[#E8ECDF] text-[#3D4C32]"
                    }`}>
                      {b.range}
                    </span>
                  </div>

                  {/* Animated Sinusoidal Wave SVG */}
                  <div className="h-8 w-full flex items-center justify-center opacity-85">
                    <svg viewBox="0 0 128 32" className={`w-full h-8 ${isSelected ? "text-[#5F6E52]" : "text-[#77776E]"}`} fill="none">
                      <path d={b.sineWave} stroke="currentColor" strokeWidth={isSelected ? "2.2" : "1.75"} strokeLinecap="round" />
                    </svg>
                  </div>

                  <p className="text-xs text-[#77776E] leading-relaxed min-h-[36px]">{b.state}</p>

                  <div className="pt-2 border-t border-[rgba(40,40,30,0.06)] flex items-center justify-between text-[11px] font-mono text-[#77776E]">
                    <span>Amplitudo Khas:</span>
                    <span className="font-semibold text-[#1E201D]">{b.voltage}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FFT Power Spectral Density Interactive Chart */}
          <div className="mt-6 bg-white rounded-[24px] p-6 border border-[rgba(40,40,30,0.08)] shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <span className="text-xs font-semibold text-[#1E201D] font-mono uppercase tracking-wider block">
                  Power Spectral Density (Fast Fourier Transform)
                </span>
                <p className="text-xs text-[#77776E] mt-0.5">
                  Distribusi daya gelombang relatif dihitung per sub-band klinis (Delta, Theta, Alpha, Beta, Gamma). Ritme aktif: <strong className="text-[#5F6E52] uppercase">{selectedRhythm}</strong>.
                </p>
              </div>

              {hoveredBar ? (
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#E8ECDF] text-[#3D4C32] font-semibold">
                  {hoveredBar.band}: {hoveredBar.freq} · {hoveredBar.power}
                </span>
              ) : (
                <span className="text-[11px] font-mono text-[#77776E] italic">
                  Arahkan kursor pada batang untuk melihat nilai daya spesifik
                </span>
              )}
            </div>

            {/* Interactive Bars */}
            <div className="h-32 flex items-end gap-2 sm:gap-3 px-2">
              {spectrumBars.map((bar, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredBar(bar)}
                  onMouseLeave={() => setHoveredBar(null)}
                  className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className="w-full bg-[#E8ECDF]/40 rounded-t-md overflow-hidden h-24 flex items-end">
                    <div
                      className={`w-full transition-all duration-500 rounded-t-md ${
                        bar.band.toLowerCase() === selectedRhythm
                          ? "bg-[#5F6E52] shadow-xs"
                          : "bg-[#77776E]/40 group-hover:bg-[#5F6E52]"
                      }`}
                      style={{ height: `${bar.height}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-mono ${
                    bar.band.toLowerCase() === selectedRhythm
                      ? "text-[#1E201D] font-bold"
                      : "text-[#77776E] group-hover:text-[#1E201D]"
                  }`}>
                    {bar.freq}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PANEL 6: CTA / REGISTRATION BANNER (Matching SS 3 with refined glassmorphism & Auth focus) */}
        <section
          className="relative rounded-[32px] sm:rounded-[36px] overflow-hidden min-h-[440px] flex items-center border border-[rgba(40,40,30,0.08)] shadow-[0_20px_50px_-20px_rgba(50,48,38,0.14)]"
        >
          {/* Panoramic Ambient Background Image: 100% Real Authentic Photography */}
          <Image
            src="/images/cta_banner_bg.jpg"
            alt="Konsultasi Riset EEG Wearable di Lounge Alami"
            fill
            className="object-cover"
            sizes="(max-width: 1240px) 100vw, 1240px"
          />

          {/* Warm Dark-to-Translucent Frosted Overlay for pristine typography readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAF9F6] via-[#FAF9F6]/92 to-transparent sm:via-[#FAF9F6]/88" />

          {/* Banner Content Grid */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10 p-6 sm:p-10 lg:p-14">
            
            {/* Left Column: Heading, Paragraph, Auth Buttons */}
            <div className="lg:col-span-7 space-y-6 text-left max-w-xl">
              <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.14em] uppercase text-[#58684C] font-semibold">
                <span>SIAP MEMULAI RISET?</span>
                <span className="w-12 h-px bg-[#58684C]/40" />
              </div>

              <h2 className="font-serif font-medium text-3xl sm:text-4xl lg:text-5xl leading-[1.08] text-[#1E201D] tracking-[-0.015em]">
                Mulai Sesi Akuisisi Gelombang Otak Anda Sekarang
              </h2>

              <p className="text-[14px] text-[#6E7168] leading-relaxed">
                Tingkatkan penelitian biosinyal Anda dengan purwarupa siap pakai atau integrasikan gateway API kami ke alur eksperimen laboratorium Anda.
              </p>

              {/* Buttons: Focused on Register & Login (Adjusted to match Screenshot 3 styling) */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-3 pl-6 pr-2.5 py-2.5 rounded-full bg-[#5F6E52] hover:bg-[#4E5C43] text-white text-sm font-semibold transition-all shadow-sm group cursor-pointer"
                  >
                    <span>Daftar Sekarang</span>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:scale-110">
                      <Plus className="w-4 h-4 text-white stroke-[2.5]" />
                    </div>
                  </Link>

                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white hover:bg-stone-50 text-[#1E201D] text-sm font-semibold border border-[rgba(40,40,30,0.12)] hover:border-[#5F6E52]/40 transition-all shadow-xs cursor-pointer"
                  >
                    Masuk ke Akun
                  </Link>
                </div>

                {/* Subtle Consultation Option */}
                <div className="pt-1">
                  <button
                    onClick={() => setConsultModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-[#58684C] hover:text-[#3D4C32] font-semibold underline underline-offset-4 cursor-pointer"
                  >
                    <span>Butuh diskusi teknis atau integrasi lab? Jadwalkan konsultasi</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: 2 Floating Glass Contact Cards (Matching Screenshot 3 pill cards) */}
            <div className="lg:col-span-5 flex flex-col justify-center gap-3.5 sm:max-w-md lg:ml-auto w-full">
              
              {/* Floating Phone Card */}
              <a
                href={`tel:${RESEARCH_SPECS.contactPhone.replace(/[^0-9+]/g, "")}`}
                className="bg-white/95 backdrop-blur-md rounded-full px-5 py-3.5 border border-white/80 shadow-[0_12px_28px_-8px_rgba(50,48,38,0.12)] flex items-center justify-between gap-4 transition-all hover:bg-white hover:-translate-y-0.5 group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#58684C] shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <Phone className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <span className="text-[14px] font-bold font-mono text-[#1E201D] block">
                      {RESEARCH_SPECS.contactPhone}
                    </span>
                    <span className="text-[11.5px] text-[#77776E] block mt-0.5">
                      Hotline Laboratorium · Setiap Hari 09:00 – 20:00
                    </span>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-[#58684C] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </a>

              {/* Floating Email Card */}
              <a
                href={`mailto:${RESEARCH_SPECS.contactEmail}`}
                className="bg-white/95 backdrop-blur-md rounded-full px-5 py-3.5 border border-white/80 shadow-[0_12px_28px_-8px_rgba(50,48,38,0.12)] flex items-center justify-between gap-4 transition-all hover:bg-white hover:-translate-y-0.5 group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#E8ECDF] flex items-center justify-center text-[#58684C] shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <Mail className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <span className="text-[14px] font-bold font-mono text-[#1E201D] block">
                      {RESEARCH_SPECS.contactEmail}
                    </span>
                    <span className="text-[11.5px] text-[#77776E] block mt-0.5">
                      Inkuiri riset dibalas dalam 1 jam kerja
                    </span>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-[#58684C] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </a>

            </div>

          </div>
        </section>

        {/* PANEL 7: FOOTER (Exact match to User Reference footer layout) */}
        <footer
          className="bg-[#FAF9F6] rounded-[32px] sm:rounded-[36px] border border-[rgba(40,40,30,0.06)] p-6 sm:p-10 lg:p-12 text-xs text-[#77776E] shadow-[0_16px_40px_-20px_rgba(50,48,38,0.06)]"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10 pb-10 border-b border-[rgba(40,40,30,0.06)]">
            
            {/* Col 1 (5 cols): Brand & Academic Thesis Title */}
            <div className="md:col-span-5 space-y-4">
              <Link href="/" className="inline-flex items-center gap-3.5 group">
                <div className="w-10 h-10 rounded-full bg-[#E8ECDF] border border-[rgba(102,116,79,0.2)] flex items-center justify-center text-[#58684C] transition-transform group-hover:scale-105">
                  <Activity className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="font-serif font-semibold text-lg text-[#1E201D] block leading-none">
                    NeuroPulse
                  </span>
                  <span className="text-[10px] tracking-widest uppercase text-[#77776E] font-medium block mt-0.5">
                    EEG Biosignal IoT Platform
                  </span>
                </div>
              </Link>

              <p className="text-xs leading-relaxed max-w-md text-[#77776E]">
                Proyek Penelitian Akademik Teknik Biomedis & IoT:
                <br />
                <strong className="font-semibold block mt-1.5 text-[#1E201D]">
                  “Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning”
                </strong>
              </p>
            </div>

            {/* Col 2 (2 cols): Navigasi */}
            <div className="md:col-span-2 space-y-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#1E201D] font-semibold">
                Navigasi
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="#overview" className="hover:text-[#1E201D] transition-colors">
                    Beranda
                  </Link>
                </li>
                <li>
                  <Link href="#why" className="hover:text-[#1E201D] transition-colors">
                    Keunggulan
                  </Link>
                </li>
                <li>
                  <Link href="#hardware" className="hover:text-[#1E201D] transition-colors">
                    Purwarupa Hardware
                  </Link>
                </li>
                <li>
                  <Link href="#calculator" className="hover:text-[#1E201D] transition-colors">
                    Kalkulator Riset
                  </Link>
                </li>
                <li>
                  <Link href="#pipeline" className="hover:text-[#1E201D] transition-colors">
                    Alur Sinyal
                  </Link>
                </li>
                <li>
                  <Link href="#bands" className="hover:text-[#1E201D] transition-colors">
                    Spektrum Gelombang
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-[#1E201D] transition-colors">
                    Tentang Riset
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3 (2 cols): Layanan Riset */}
            <div className="md:col-span-2 space-y-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#1E201D] font-semibold">
                Layanan Riset
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/dashboard" className="hover:text-[#1E201D] transition-colors flex items-center justify-between group">
                    <span>Dashboard</span>
                    <ChevronRight className="w-3 h-3 text-[#77776E] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
                <li>
                  <Link href="/sessions" className="hover:text-[#1E201D] transition-colors flex items-center justify-between group">
                    <span>Arsip Sesi</span>
                    <ChevronRight className="w-3 h-3 text-[#77776E] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
                <li>
                  <Link href="/analysis" className="hover:text-[#1E201D] transition-colors flex items-center justify-between group">
                    <span>Model Machine Learning</span>
                    <ChevronRight className="w-3 h-3 text-[#77776E] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
                <li>
                  <Link href="/devices" className="hover:text-[#1E201D] transition-colors flex items-center justify-between group">
                    <span>IoT Device Hub</span>
                    <ChevronRight className="w-3 h-3 text-[#77776E] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
                <li>
                  <Link href="/settings" className="hover:text-[#1E201D] transition-colors flex items-center justify-between group">
                    <span>Preferensi Sinyal</span>
                    <ChevronRight className="w-3 h-3 text-[#77776E] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4 (3 cols): Hardware & Stack Chips */}
            <div className="md:col-span-3 space-y-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#1E201D] font-semibold">
                Spesifikasi Stack
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
                  Python Scikit-Learn
                </span>
              </div>
            </div>

          </div>

          {/* Bottom Row */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <p>© {new Date().getFullYear()} NeuroPulse Platform. Hak cipta dilindungi undang-undang.</p>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-mono text-[#3D4C32]">
                <span className="w-2 h-2 rounded-full bg-[#5F6E52] animate-pulse" />
                <span>Gateway 50 Hz Aktif</span>
              </span>
              <span>·</span>
              <Link href="/about" className="hover:text-[#1E201D] transition-colors underline">
                Kebijakan Privasi & Lisensi
              </Link>
            </div>
          </div>
        </footer>

      </div>

      {/* MODAL 1: CONSULTATION / INQUIRY MODAL */}
      <Modal
        isOpen={consultModalOpen}
        onClose={() => setConsultModalOpen(false)}
        title="Jadwalkan Konsultasi Riset"
        description="Diskusikan kebutuhan eksperimen EEG atau integrasi hardware dengan tim riset kami."
      >
        {consultSubmitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#E8ECDF] text-[#58684C] flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h4 className="text-base font-semibold text-[#1E201D]">Permintaan Terkirim!</h4>
            <p className="text-xs text-[#77776E] max-w-sm mx-auto">
              Terima kasih. Tim laboratorium kami akan menghubungi Anda melalui email dalam waktu 1 jam kerja.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConsultSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1E201D] block">Nama Lengkap</label>
              <input
                type="text"
                required
                placeholder="cth. Dr. Budi Santoso"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-[#1E201D] focus:outline-none focus:ring-2 focus:ring-[#5F6E52]/40 bg-stone-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1E201D] block">Email Institusi / Pribadi</label>
              <input
                type="email"
                required
                placeholder="budi@universitas.ac.id"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-[#1E201D] focus:outline-none focus:ring-2 focus:ring-[#5F6E52]/40 bg-stone-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1E201D] block">Bidang Riset / Topik Minat</label>
              <select className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-[#1E201D] focus:outline-none focus:ring-2 focus:ring-[#5F6E52]/40 bg-stone-50">
                <option value="bci">Brain-Computer Interface (BCI)</option>
                <option value="cognitive">Klasifikasi Pola Kognitif & Fokus</option>
                <option value="sleep">Analisis Gelombang Tidur & Relaksasi</option>
                <option value="hardware">Purwarupa Hardware & Integrasi ESP32</option>
                <option value="other">Kolaborasi Penelitian Lainnya</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1E201D] block">Pesan atau Pertanyaan</label>
              <textarea
                rows={3}
                required
                placeholder="Jelaskan kebutuhan eksperimen atau pertanyaan teknis Anda..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-[#1E201D] focus:outline-none focus:ring-2 focus:ring-[#5F6E52]/40 bg-stone-50"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConsultModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#5F6E52] hover:bg-[#4E5C43] text-white text-xs font-medium transition-colors shadow-xs"
              >
                <span>Kirim Permintaan</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 2: INTERACTIVE HARDWARE COMPONENT DETAILS WITH TABS */}
      <Modal
        isOpen={!!selectedHardware}
        onClose={() => setSelectedHardware(null)}
        title={selectedHardware?.title || "Spesifikasi Hardware"}
        description={selectedHardware?.badge}
      >
        {selectedHardware && (
          <div className="space-y-4">
            
            {/* Modal Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200/80 text-xs font-medium">
              <button
                onClick={() => setHardwareActiveTab("overview")}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                  hardwareActiveTab === "overview"
                    ? "bg-white text-[#1E201D] shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Ikhtisar & Foto
              </button>
              <button
                onClick={() => setHardwareActiveTab("pinout")}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                  hardwareActiveTab === "pinout"
                    ? "bg-white text-[#1E201D] shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Pinout Skematik
              </button>
              <button
                onClick={() => setHardwareActiveTab("firmware")}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                  hardwareActiveTab === "firmware"
                    ? "bg-white text-[#1E201D] shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Firmware C++
              </button>
            </div>

            {/* Tab 1: Overview */}
            {hardwareActiveTab === "overview" && (
              <div className="space-y-4">
                <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-stone-200">
                  <Image
                    src={selectedHardware.image}
                    alt={selectedHardware.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 600px) 100vw, 500px"
                  />
                </div>

                <p className="text-xs text-[#6E7168] leading-relaxed">
                  {selectedHardware.details}
                </p>

                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <span className="text-xs font-semibold text-[#1E201D] font-mono uppercase tracking-wider block">
                    Parameter Operasional
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedHardware.specs.map((s, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                        <span className="text-[10px] text-[#77776E] block font-mono">{s.label}</span>
                        <span className="text-xs font-semibold text-[#1E201D] block mt-0.5 font-mono">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Pinout Diagram */}
            {hardwareActiveTab === "pinout" && (
              <div className="space-y-3">
                <span className="text-xs font-semibold text-[#1E201D] font-mono uppercase tracking-wider block">
                  Konfigurasi Pin & Sinyal Elektrik
                </span>
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-white text-xs">
                  {selectedHardware.pinouts.map((p, idx) => (
                    <div key={idx} className="p-3 flex items-start justify-between gap-3 bg-stone-50/50 hover:bg-stone-50 transition-colors">
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-[#5F6E52] text-xs block">{p.pin}</span>
                        <span className="font-medium text-[#1E201D] block">{p.name}</span>
                      </div>
                      <span className="text-[11px] text-[#77776E] text-right max-w-[200px]">{p.func}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Firmware Snippet */}
            {hardwareActiveTab === "firmware" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1E201D] font-mono uppercase tracking-wider">
                    Cuplikan Firmware Driver
                  </span>
                  <button
                    onClick={() => handleCopyFirmware(selectedHardware.firmwareSnippet)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-[11px] font-mono text-[#1E201D] transition-colors cursor-pointer"
                  >
                    {firmwareCopied ? <Check className="w-3 h-3 text-[#5F6E52]" /> : <Copy className="w-3 h-3 text-[#77776E]" />}
                    <span>{firmwareCopied ? "Tersalin!" : "Salin Kode"}</span>
                  </button>
                </div>
                <div className="p-3.5 rounded-xl bg-stone-900 text-stone-200 font-mono text-[11px] overflow-x-auto max-h-[220px] border border-stone-800">
                  <pre>{selectedHardware.firmwareSnippet}</pre>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedHardware(null)}
                className="px-5 py-2 rounded-full bg-[#5F6E52] hover:bg-[#4E5C43] text-white text-xs font-medium transition-colors"
              >
                Tutup Spesifikasi
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
