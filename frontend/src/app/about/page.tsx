"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Cpu,
  Brain,
  Server,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Code,
  Radio,
  Copy,
  Check,
} from "lucide-react";

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState<"biosensing" | "gateway" | "ml" | "specs">("biosensing");
  const [copiedCite, setCopiedCite] = useState(false);

  const citationText = `@thesis{renaldi2026eeg,
  title={Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning},
  author={Simamora, Renaldi},
  year={2026},
  institution={IPB University - Riset Biosinyal & IoT}
}`;

  const handleCopyCitation = () => {
    navigator.clipboard.writeText(citationText);
    setCopiedCite(true);
    setTimeout(() => setCopiedCite(false), 2500);
  };

  const researchMetrics = [
    { label: "Sampling Rate", value: "512 SPS", desc: "Raw ADC acquisition kontinu" },
    { label: "Noise Floor", value: "1.2 µVrms", desc: "Ultra-low thermal noise" },
    { label: "Throughput Gateway", value: "50 Hz", desc: "Streaming packet WebSocket" },
    { label: "Latensi Jaringan", value: "< 20 ms", desc: "End-to-end telemetry link" },
  ];

  return (
    <div className="min-h-screen bg-[#F0EDE6] text-[#262622] flex flex-col font-sans selection:bg-[#5F6E52]/20 selection:text-[#262622] py-3 sm:py-4">
      {/* Floating Glassmorphism Pill Navbar */}
      <Navbar activeId="about" />

      <main className="flex-1 max-w-[1240px] w-full mx-auto px-3 sm:px-4 md:px-6 my-6 sm:my-8 space-y-6">
        
        {/* Academic Hero Banner */}
        <section className="bg-[#FAF9F6] rounded-[32px] sm:rounded-[36px] border border-[rgba(40,40,30,0.06)] p-6 sm:p-10 lg:p-12 shadow-[0_16px_40px_-20px_rgba(50,48,38,0.08)]">
          <div className="max-w-3xl space-y-4 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8ECDF] border border-[rgba(102,116,79,0.25)] text-[#58684C] text-[11px] font-mono uppercase tracking-wider font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5F6E52] animate-pulse" />
              <span>Dokumentasi Riset Akademik</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#1E201D] leading-[1.12] tracking-[-0.015em]">
              Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning
            </h1>

            <p className="text-sm sm:text-base text-[#6E7168] leading-relaxed">
              Platform telemetri biosinyal terintegrasi yang menjembatani 3 elektroda snap biopotensial presisi tinggi, modul ASIC TGAM1, mikrokontroler nirkabel ESP32, gateway Go Gin berkecepatan tinggi, dan inferensi model machine learning dalam satu ekosistem terbuka.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#5F6E52] hover:bg-[#4E5C43] text-white text-xs font-semibold transition-all shadow-xs group"
              >
                <span>Buka Platform Console</span>
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <button
                onClick={handleCopyCitation}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-stone-50 border border-[rgba(40,40,30,0.12)] text-xs font-mono font-medium text-[#1E201D] transition-all shadow-2xs cursor-pointer"
              >
                {copiedCite ? <Check className="w-3.5 h-3.5 text-[#5F6E52]" /> : <Copy className="w-3.5 h-3.5 text-[#77776E]" />}
                <span>{copiedCite ? "Sitasi Disalin!" : "Salin Sitasi BibTeX"}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Key Quantitative Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {researchMetrics.map((m, idx) => (
            <div
              key={idx}
              className="bg-[#FAF9F6] rounded-[24px] p-5 border border-[rgba(40,40,30,0.06)] shadow-xs space-y-1"
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#77776E] block">
                {m.label}
              </span>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#1E201D]">
                {m.value}
              </div>
              <span className="text-[11.5px] text-[#77776E] block">
                {m.desc}
              </span>
            </div>
          ))}
        </div>

        {/* Interactive Architecture Pillars: Tabbed Exploration */}
        <section className="bg-[#FAF9F6] rounded-[32px] sm:rounded-[36px] border border-[rgba(40,40,30,0.06)] p-6 sm:p-10 lg:p-12 shadow-[0_16px_40px_-20px_rgba(50,48,38,0.08)] space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.14em] uppercase text-[#77776E]">
                <span>PILAR REKAYASA SISTEM</span>
                <span className="w-12 h-px bg-[#77776E]/30" />
              </div>
              <h2 className="font-serif font-medium text-2xl sm:text-3xl text-[#1E201D]">
                Arsitektur Tiga Lapis Biosinyal
              </h2>
            </div>

            {/* Interactive Tab Selector */}
            <div className="inline-flex p-1 rounded-full bg-stone-100/80 border border-[rgba(40,40,30,0.06)]">
              {[
                { id: "biosensing", label: "1. Hardware Wearable", icon: Cpu },
                { id: "gateway", label: "2. Cloud Gateway", icon: Server },
                { id: "ml", label: "3. Inferensi ML", icon: Brain },
                { id: "specs", label: "4. Validasi Klinis", icon: ShieldCheck },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-white text-[#1E201D] shadow-xs"
                        : "text-[#77776E] hover:text-[#1E201D]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Pillar Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
            
            {/* Left 55%: Detailed Description & Code/Pinout */}
            <div className="lg:col-span-7 space-y-5 text-left">
              {activeTab === "biosensing" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h3 className="font-serif text-2xl text-[#1E201D] font-medium">
                    Akuisisi Biosinyal Mikrovolt TGAM1 & Telemetri ESP32
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6E7168] leading-relaxed">
                    Sensor utama menggunakan modul analog front-end NeuroSky TGAM1 yang dipadukan dengan 3 kabel elektroda snap biopotensial yang ditempel langsung (FP1 aktif pada dahi anterior, referensi REF, dan ground GND tanpa klip pegas atau headband). Mikrokontroler ESP32 membaca frame biner melalui UART 57,600 Baud dan menyiarkannya via Wi-Fi.
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3.5 rounded-2xl bg-white border border-[rgba(40,40,30,0.06)] shadow-2xs">
                      <span className="font-mono text-[11px] text-[#58684C] font-semibold block">Impedansi Kontak</span>
                      <p className="mt-1 font-bold text-[#1E201D] font-mono">4.85 kΩ (Snap Lead)</p>
                      <span className="text-[10px] text-[#77776E]">Kontak tempel stabil tanpa jepit</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white border border-[rgba(40,40,30,0.06)] shadow-2xs">
                      <span className="font-mono text-[11px] text-[#58684C] font-semibold block">Filter Analog Bawaan</span>
                      <p className="mt-1 font-bold text-[#1E201D] font-mono">Notch 50 Hz / 60 Hz</p>
                      <span className="text-[10px] text-[#77776E]">Peredam interferensi listrik PLN</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "gateway" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h3 className="font-serif text-2xl text-[#1E201D] font-medium">
                    Gateway Golang Gin Berlatensi Rendah & PostgreSQL
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6E7168] leading-relaxed">
                    Sisi server dibangun di atas Go Gin dengan WebSocket Hub konkurensi tinggi. Setiap paket serial divalidasi checksum-nya, disiarkan ke dashboard dengan latensi di bawah 20 ms, dan diarsipkan secara terindeks ke basis data PostgreSQL untuk analisis statistik eksperimen.
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3.5 rounded-2xl bg-white border border-[rgba(40,40,30,0.06)] shadow-2xs">
                      <span className="font-mono text-[11px] text-[#58684C] font-semibold block">Protokol Jaringan</span>
                      <p className="mt-1 font-bold text-[#1E201D] font-mono">RFC 6455 WebSocket</p>
                      <span className="text-[10px] text-[#77776E]">Full-duplex real-time pipe</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white border border-[rgba(40,40,30,0.06)] shadow-2xs">
                      <span className="font-mono text-[11px] text-[#58684C] font-semibold block">Penyimpanan Terindeks</span>
                      <p className="mt-1 font-bold text-[#1E201D] font-mono">PostgreSQL 16 Engine</p>
                      <span className="text-[10px] text-[#77776E]">Partisi data sesi per detik</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "ml" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h3 className="font-serif text-2xl text-[#1E201D] font-medium">
                    Ekstraksi Fitur Spektral FFT & Model Klasifikasi
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6E7168] leading-relaxed">
                    Sinyal mentah 512 Hz diproses menggunakan jendela Fast Fourier Transform (FFT) untuk menghitung kerapatan daya spektral pada sub-band klinis (Delta 0.5–4Hz, Theta 4–8Hz, Alpha 8–13Hz, Beta 13–30Hz). Fitur ini kemudian diumpankan ke model Support Vector Machine (SVM), Random Forest, atau 1D-CNN.
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3.5 rounded-2xl bg-white border border-[rgba(40,40,30,0.06)] shadow-2xs">
                      <span className="font-mono text-[11px] text-[#58684C] font-semibold block">Akurasi Terbaik</span>
                      <p className="mt-1 font-bold text-[#1E201D] font-mono">92.4% (1D-CNN)</p>
                      <span className="text-[10px] text-[#77776E]">Klasifikasi pola fokus vs relaksasi</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white border border-[rgba(40,40,30,0.06)] shadow-2xs">
                      <span className="font-mono text-[11px] text-[#58684C] font-semibold block">Inferensi Cepat</span>
                      <p className="mt-1 font-bold text-[#1E201D] font-mono">&lt; 14 ms (SVM RBF)</p>
                      <span className="text-[10px] text-[#77776E]">Cocok untuk kontrol BCI real-time</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "specs" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h3 className="font-serif text-2xl text-[#1E201D] font-medium">
                    Prinsip Rigor Ilmiah & Batasan Etika Riset
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6E7168] leading-relaxed">
                    Sesuai kaidah akademik teknik biomedis, sistem ini berfokus secara ketat pada akuisisi sinyal elektrofisiologi permukaan dahi non-invasif, pengondisian sinyal, dan klasifikasi pola gelombang secara empiris.
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3.5 rounded-2xl bg-white border border-[rgba(40,40,30,0.06)] shadow-2xs">
                      <span className="font-mono text-[11px] text-[#58684C] font-semibold block">Keamanan Subjek</span>
                      <p className="mt-1 font-bold text-[#1E201D] font-mono">Catu Daya Baterai 3.7V</p>
                      <span className="text-[10px] text-[#77776E]">Terisolasi galvanis dari jala-jala listrik</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white border border-[rgba(40,40,30,0.06)] shadow-2xs">
                      <span className="font-mono text-[11px] text-[#58684C] font-semibold block">Privasi Data Subjek</span>
                      <p className="mt-1 font-bold text-[#1E201D] font-mono">Anonimitas ID Sesi</p>
                      <span className="text-[10px] text-[#77776E]">Enkripsi JWT & otorisasi berbasis peran</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right 45%: Authentic Real Photography (100% Non-AI) */}
            <div className="lg:col-span-5">
              <div className="relative rounded-[28px] overflow-hidden border border-[rgba(40,40,30,0.08)] bg-stone-100 shadow-md aspect-[4/3]">
                <Image
                  src={
                    activeTab === "biosensing"
                      ? "/images/eeg_snap_leads.jpg"
                      : activeTab === "gateway"
                      ? "/images/bento_telemetry.jpg"
                      : activeTab === "ml"
                      ? "/images/chip_macro_real.jpg"
                      : "/images/bento_verification.jpg"
                  }
                  alt="Laboratorium Riset Telemetri Biosinyal"
                  fill
                  className="object-cover transition-transform duration-700 hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 500px"
                />
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-2xl bg-black/60 backdrop-blur-md text-white text-xs flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider">
                    {activeTab === "biosensing"
                      ? "Prototyping Bench · ESP32 Node"
                      : activeTab === "gateway"
                      ? "Cloud Gateway Telemetry Flow"
                      : activeTab === "ml"
                      ? "TGAM1 ASIC Biosignal Processor"
                      : "Electrophysiology Calibration Rig"}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#82996E] animate-pulse" />
                </div>
              </div>
            </div>

          </div>

        </section>

        {/* 11. Akun Peneliti Bawaan (Demo Credentials) */}
        <section className="bg-[#FAF9F6] rounded-[32px] sm:rounded-[36px] border border-[rgba(40,40,30,0.06)] p-6 sm:p-10 lg:p-12 shadow-[0_16px_40px_-20px_rgba(50,48,38,0.08)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(40,40,30,0.06)] pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[11px] font-mono tracking-[0.14em] uppercase text-[#77776E]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#58684C]" />
                <span>AKSES PENGUJIAN PENELITI</span>
              </div>
              <h2 className="font-serif font-medium text-2xl sm:text-3xl text-[#1E201D]">
                Akun Peneliti Bawaan (Demo Credentials)
              </h2>
            </div>
            <Link
              href="/login?demo=true"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#5F6E52] hover:bg-[#4E5C43] text-white text-xs font-semibold transition-all shadow-xs shrink-0 self-start sm:self-auto"
            >
              <span>Uji Coba Langsung di Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <p className="text-xs sm:text-sm text-[#6E7168] leading-relaxed">
            Untuk memfasilitasi pengujian cepat tanpa Google OAuth atau registrasi mandiri:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse rounded-2xl overflow-hidden bg-white border border-[rgba(40,40,30,0.08)] shadow-2xs">
              <thead>
                <tr className="bg-stone-50/80 border-b border-[rgba(40,40,30,0.08)] text-[11px] font-mono uppercase tracking-wider text-[#77776E]">
                  <th className="py-3 px-4 sm:px-6 w-1/3">Parameter</th>
                  <th className="py-3 px-4 sm:px-6">Kredensial Pengujian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(40,40,30,0.06)] font-sans">
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#1E201D]">Email Peneliti</td>
                  <td className="py-3.5 px-4 sm:px-6 font-mono text-[#58684C] font-medium">admin@gmail.com</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#1E201D]">Kata Sandi</td>
                  <td className="py-3.5 px-4 sm:px-6 font-mono text-stone-700">admin123</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#1E201D]">Nama Peneliti</td>
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-[#1E201D]">Super Admin NeuroPulse</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#1E201D]">Institusi</td>
                  <td className="py-3.5 px-4 sm:px-6 text-[#1E201D]">IPB University</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#1E201D]">Peran (Role)</td>
                  <td className="py-3.5 px-4 sm:px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#E8ECDF] text-[#445338] border border-[rgba(102,116,79,0.25)]">
                      researcher (Full Access)
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* Footer */}
      <Footer theme="light" />
    </div>
  );
}
