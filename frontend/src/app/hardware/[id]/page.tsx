"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HARDWARE_DETAILS, HardwareDetailData } from "@/data/hardware-details";
import { CodeViewer } from "@/components/ui/code-viewer";
import {
  ArrowLeft,
  ChevronRight,
  Cpu,
  Layers,
  Code2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Activity,
  Maximize2,
  ShieldCheck,
  Info,
  X,
  ExternalLink,
} from "lucide-react";

type HardwareKey = "tgam1" | "esp32" | "electrodes";

export default function HardwareDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params?.id as string) || "tgam1";
  const hardwareId: HardwareKey = (rawId in HARDWARE_DETAILS ? rawId : "tgam1") as HardwareKey;

  const data: HardwareDetailData = HARDWARE_DETAILS[hardwareId];
  const [activeTab, setActiveTab] = useState<"overview" | "pinout" | "firmware">("overview");
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  const switchHardware = (key: HardwareKey) => {
    router.push(`/hardware/${key}`);
  };

  return (
    <div className="min-h-screen bg-[#F0EDE6] text-[#262622] flex flex-col font-sans selection:bg-[#5F6E52]/20 selection:text-[#262622] py-3 sm:py-4">
      {/* Floating Glassmorphism Navbar */}
      <Navbar activeId="hardware" />

      <main className="flex-1 max-w-[1240px] w-full mx-auto px-3 sm:px-4 md:px-6 my-6 sm:my-8 space-y-6">
        
        {/* Navigation & Breadcrumbs Bar */}
        <section className="bg-white rounded-[24px] border border-stone-200/90 px-5 sm:px-8 py-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/#hardware"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-[#58684C] text-xs font-semibold transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Kembali ke Purwarupa</span>
            </Link>

            <div className="h-4 w-px bg-stone-200 hidden sm:block" />

            <div className="flex items-center gap-1.5 text-xs">
              <Link href="/" className="text-[#77776E] hover:text-stone-900 transition-colors">
                Beranda
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
              <Link href="/#hardware" className="text-[#77776E] hover:text-stone-900 transition-colors">
                Purwarupa yang Diwujudkan
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
              <span className="font-semibold text-[#1E201D] font-mono">{data.title}</span>
            </div>
          </div>

          {/* Quick Switcher for the 3 Components */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200 text-xs self-start sm:self-auto">
            <button
              onClick={() => switchHardware("tgam1")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                hardwareId === "tgam1"
                  ? "bg-[#5F6E52] text-white shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              TGAM1
            </button>
            <button
              onClick={() => switchHardware("esp32")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                hardwareId === "esp32"
                  ? "bg-[#5F6E52] text-white shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              ESP32
            </button>
            <button
              onClick={() => switchHardware("electrodes")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                hardwareId === "electrodes"
                  ? "bg-[#5F6E52] text-white shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              3 Elektroda Snap
            </button>
          </div>
        </section>

        {/* Hero Header Section */}
        <section className="bg-[#FAF9F6] rounded-[32px] sm:rounded-[36px] border border-[rgba(40,40,30,0.06)] p-6 sm:p-10 shadow-[0_16px_40px_-20px_rgba(50,48,38,0.08)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8ECDF] border border-[rgba(102,116,79,0.25)] text-[#58684C] text-[11px] font-mono uppercase tracking-wider font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5F6E52] animate-pulse" />
                <span>Dokumentasi Komponen Hardware • {data.badge}</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#1E201D] leading-[1.15] tracking-[-0.015em]">
                {data.title}
              </h1>

              <p className="text-sm sm:text-base text-[#6E7168] leading-relaxed">
                {data.subtitle}
              </p>
            </div>

            <div className="shrink-0">
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden bg-white border border-stone-200 shadow-sm p-3 group">
                <Image
                  src={data.cardImage}
                  alt={data.title}
                  fill
                  className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                  sizes="180px"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Tab Navigation Pill Bar */}
        <section className="bg-white rounded-2xl border border-stone-200 p-2 shadow-2xs flex items-center justify-center">
          <div className="flex items-center gap-2 w-full max-w-xl bg-stone-100 p-1.5 rounded-xl border border-stone-200 text-xs sm:text-sm">
            {/* Tab 1 */}
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all cursor-pointer font-medium ${
                activeTab === "overview"
                  ? "bg-white text-[#1E201D] shadow-xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <FileText className="w-4 h-4 text-[#5F6E52]" />
              <span>Ikhtisar &amp; Foto</span>
            </button>

            {/* Tab 2 */}
            <button
              onClick={() => setActiveTab("pinout")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all cursor-pointer font-medium ${
                activeTab === "pinout"
                  ? "bg-white text-[#1E201D] shadow-xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Cpu className="w-4 h-4 text-[#5F6E52]" />
              <span>PinOut &amp; Skematik</span>
            </button>

            {/* Tab 3 */}
            <button
              onClick={() => setActiveTab("firmware")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all cursor-pointer font-medium ${
                activeTab === "firmware"
                  ? "bg-white text-[#1E201D] shadow-xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Code2 className="w-4 h-4 text-[#5F6E52]" />
              <span>Firmware C++</span>
            </button>
          </div>
        </section>

        {/* TAB 1: IKHTISAR & FOTO */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Main Showcase Image & Role Summary */}
            <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col lg:flex-row gap-8 items-center">
                <div className="relative w-full lg:w-5/12 aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 group">
                  <Image
                    src={data.overview.heroImage}
                    alt={data.title}
                    fill
                    className="object-contain p-3 transition-transform duration-300 group-hover:scale-102"
                    sizes="(max-width: 1024px) 100vw, 480px"
                    priority
                  />
                  <button
                    onClick={() => setImageModalUrl(data.overview.heroImage)}
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/75 hover:bg-black/90 text-white text-xs font-mono flex items-center gap-1.5 backdrop-blur-xs transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Perbesar Foto</span>
                  </button>
                </div>

                <div className="w-full lg:w-7/12 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#E8ECDF] text-[#58684C] text-[11px] font-mono font-semibold uppercase">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Peran Komponen dalam Arsitektur EEG</span>
                  </div>

                  <p className="text-base sm:text-lg font-medium text-[#1E201D] leading-relaxed">
                    {data.overview.roleSummary}
                  </p>

                  <p className="text-xs text-stone-500 italic border-l-2 border-[#5F6E52] pl-3 py-1">
                    {data.overview.imageCaption}
                  </p>

                  {/* Explicit Role Boundary Notice */}
                  {hardwareId === "tgam1" && (
                    <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <span className="font-semibold block font-mono">Batas Arsitektur Teknis:</span>
                      <p>
                        Modul TGAM1 adalah chip pemroses sinyal Analog Front-End (AFE) dan <strong>bukan merupakan elektroda EEG</strong>. Modul ini menerima biopotensial dari elektroda snap tempel eksternal melalui header P1.
                      </p>
                    </div>
                  )}

                  {hardwareId === "electrodes" && (
                    <div className="p-3 rounded-xl bg-[#E8ECDF]/60 border border-[#5F6E52]/30 text-xs text-[#3D4C32] space-y-1">
                      <span className="font-semibold block font-mono">Transduser Pasif Tanpa Headband:</span>
                      <p>
                        Elektroda snap adalah transduser biopotensial pasif tanpa prosesor on-board. Sistem murni menggunakan 3 kabel snap yang ditempel langsung ke kulit dahi/mastoid dengan adhesive pad, <strong>bebas headband kaku dan tanpa penjepit telinga (earclip)</strong>.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Detailed Description */}
            <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-[#1E201D] font-mono uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-[#5F6E52]" />
                <span>Prinsip Kerja &amp; Penjelasan Rinci</span>
              </h3>

              <div className="space-y-3 text-xs sm:text-sm text-[#4F524A] leading-relaxed">
                {data.overview.detailedDescription.map((par, idx) => (
                  <p key={idx}>{par}</p>
                ))}
              </div>
            </section>

            {/* Operational Specs Grid */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-[#1E201D] font-mono uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#5F6E52]" />
                <span>Karakteristik &amp; Parameter Operasional</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {data.overview.specs.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-1"
                  >
                    <span className="text-[10px] font-mono text-[#77776E] uppercase tracking-wider block">
                      {s.label}
                    </span>
                    <span className="text-sm sm:text-base font-bold text-[#1E201D] font-mono block">
                      {s.value}
                    </span>
                    {s.desc && (
                      <span className="text-[10.5px] text-stone-500 block leading-tight">
                        {s.desc}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Voltage Conversion Formula (if applicable) */}
            {data.overview.voltageFormula && (
              <section className="p-5 rounded-3xl bg-[#E8ECDF]/50 border border-[#5F6E52]/30 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#5F6E52]" />
                  <span className="text-xs sm:text-sm font-semibold text-[#1E201D] font-mono">
                    Formula Konversi ADC Mentah ke Tegangan Mikrovolt (µV)
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#5F6E52]/20 font-mono text-xs sm:text-sm font-bold text-[#1E201D] text-center">
                  {data.overview.voltageFormula.formula}
                </div>
                <p className="text-xs text-[#4F524A] leading-relaxed">
                  {data.overview.voltageFormula.explanation}
                </p>
              </section>
            )}

            {/* Key Features */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-[#1E201D] font-mono uppercase tracking-wider">
                Keunggulan Implementasi Hardware
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.overview.keyFeatures.map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#5F6E52] shrink-0" />
                      <h4 className="text-xs sm:text-sm font-semibold text-[#1E201D]">{feat.title}</h4>
                    </div>
                    <p className="text-xs text-[#6E7168] leading-relaxed pl-6">
                      {feat.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: PINOUT & SKEMATIK */}
        {activeTab === "pinout" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Schematic Diagram Showcase */}
            <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold text-[#1E201D] font-mono uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#5F6E52]" />
                    <span>Diagram Skematik &amp; Tata Letak Rangkaian Aktual</span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    {data.pinout.schematicCaption}
                  </p>
                </div>

                <button
                  onClick={() => setImageModalUrl(data.pinout.schematicImage)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-mono text-stone-700 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Perbesar Skema</span>
                </button>
              </div>

              <div
                className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-stone-50 border border-stone-200 flex items-center justify-center group cursor-pointer"
                onClick={() => setImageModalUrl(data.pinout.schematicImage)}
              >
                <Image
                  src={data.pinout.schematicImage}
                  alt={data.title + " Schematic"}
                  fill
                  className="object-contain p-4 sm:p-6 transition-transform duration-300 group-hover:scale-[1.01]"
                  sizes="(max-width: 1200px) 100vw, 1100px"
                  priority
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="px-4 py-2 rounded-full bg-white/95 text-stone-800 text-xs font-semibold shadow-md">
                    Klik untuk memperbesar gambar skematik
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#4F524A] leading-relaxed pt-1">
                {data.pinout.circuitSummary}
              </p>
            </section>

            {/* Interface Points Breakdown */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.pinout.interfacePoints.map((pt, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#5F6E52] shrink-0" />
                    <h4 className="text-xs sm:text-sm font-semibold text-[#1E201D]">{pt.title}</h4>
                  </div>
                  <p className="text-xs text-[#6E7168] leading-relaxed pl-6">
                    {pt.desc}
                  </p>
                </div>
              ))}
            </section>

            {/* Pinout Table */}
            <section className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[#1E201D] font-mono uppercase tracking-wider">
                  Tabel Pemetaan Pin &amp; Koneksi Elektrik
                </h4>
                <span className="text-[11px] font-mono text-stone-500">
                  {data.pinout.pinoutTable.length} Titik Koneksi
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-stone-100/70 border-b border-stone-200 font-mono text-xs text-stone-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Pin / Lead</th>
                      <th className="py-3 px-4 font-semibold">Terhubung ke</th>
                      <th className="py-3 px-4 font-semibold hidden sm:table-cell">Nama Sinyal</th>
                      <th className="py-3 px-4 font-semibold hidden md:table-cell">Tipe Sinyal</th>
                      <th className="py-3 px-4 font-semibold">Fungsi &amp; Karakteristik</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-sans">
                    {data.pinout.pinoutTable.map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#5F6E52]">
                          {row.pin}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#1E201D]">
                          {row.connectedTo}
                        </td>
                        <td className="py-3 px-4 font-medium text-stone-700 hidden sm:table-cell">
                          {row.name}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-stone-500 hidden md:table-cell">
                          {row.signalType || "-"}
                        </td>
                        <td className="py-3 px-4 text-xs text-stone-600">
                          {row.func}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Power Notice & Laboratory Verification */}
            {data.pinout.groundPowerNotice && (
              <section className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs sm:text-sm font-mono">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Catatan Catu Daya &amp; Ground Bersama (Common Ground)</span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed pl-6">
                  {data.pinout.groundPowerNotice}
                </p>
              </section>
            )}

            {data.pinout.verificationNotes && data.pinout.verificationNotes.length > 0 && (
              <section className="p-5 rounded-2xl bg-stone-100 border border-stone-300 space-y-2">
                <div className="flex items-center gap-2 text-[#1E201D] font-semibold text-xs sm:text-sm font-mono">
                  <ShieldCheck className="w-4 h-4 text-[#5F6E52]" />
                  <span>Catatan Status Verifikasi Laboratorium Hardware</span>
                </div>
                <ul className="space-y-1.5 pl-6 text-xs text-stone-600 list-disc">
                  {data.pinout.verificationNotes.map((note, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {note}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {/* TAB 3: FIRMWARE C++ */}
        {activeTab === "firmware" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Firmware Header Summary */}
            <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Code2 className="w-5 h-5 text-[#5F6E52]" />
                  <h3 className="text-base sm:text-lg font-semibold text-[#1E201D] font-mono">
                    {data.firmware.title}
                  </h3>
                </div>

                {data.firmware.isFullFirmware && (
                  <span className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-mono font-bold uppercase">
                    Full Arduino Source Code (.INO)
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-[#4F524A] leading-relaxed">
                {data.firmware.summary}
              </p>
            </section>

            {/* UNABRIDGED FULL CODE VIEWER */}
            <CodeViewer
              code={data.firmware.code}
              filename={data.firmware.codeFilename}
              language="C++ / Arduino"
              title={
                data.firmware.isFullFirmware
                  ? "Full Source Code Arduino (.ino) Lengkap Seluruh 11 Subsistem Tanpa Pemotongan (...)"
                  : `Implementasi Driver C++ Biosinyal (${data.firmware.codeFilename})`
              }
              maxHeight="520px"
            />

            {/* Band Processing Explanation */}
            {data.firmware.bandProcessingExplanation && (
              <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-4">
                <h4 className="text-xs font-semibold text-[#1E201D] font-mono uppercase tracking-wider">
                  Pengolahan Sub-Band ASIC Menjadi 5 Gelombang Otak Kanonikal
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.firmware.bandProcessingExplanation.map((band, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#5F6E52] font-mono">{band.band}</span>
                        <span className="text-[10px] font-mono text-stone-500">{band.freq}</span>
                      </div>
                      <p className="text-xs text-stone-600 leading-tight">
                        {band.formula}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Architecture Decomposition */}
            <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-4">
              <h4 className="text-xs font-semibold text-[#1E201D] font-mono uppercase tracking-wider">
                Dekomposisi Logika &amp; Arsitektur Firmware
              </h4>
              <div className="space-y-2.5">
                {data.firmware.architectureExplanation.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-stone-50 border border-stone-100 flex items-start gap-3"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#5F6E52] text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-0.5">
                      <span className="text-xs sm:text-sm font-semibold text-[#1E201D] block">
                        {step.step}
                      </span>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Switch to ESP32 Firmware if on other pages */}
            {!data.firmware.isFullFirmware && (
              <section className="p-5 rounded-2xl bg-[#E8ECDF]/50 border border-[#5F6E52]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs sm:text-sm font-semibold text-[#1E201D]">
                    Ingin memeriksa Full Source Code Arduino Gateway (.INO)?
                  </span>
                  <p className="text-xs text-stone-600">
                    Seluruh 410+ baris program C++ terintegrasi tersedia di halaman firmware ESP32.
                  </p>
                </div>
                <button
                  onClick={() => switchHardware("esp32")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5F6E52] hover:bg-[#4E5C43] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  <span>Buka Firmware Lengkap ESP32</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </section>
            )}
          </div>
        )}

      </main>

      {/* Expanded Image Viewer Modal */}
      {imageModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 sm:p-6 flex flex-col items-center justify-center animate-in fade-in duration-150"
          onClick={() => setImageModalUrl(null)}
        >
          <div
            className="relative w-full max-w-5xl max-h-[85vh] aspect-[16/10] bg-[#0A0C10] rounded-3xl overflow-hidden border border-stone-700 shadow-2xl p-4 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={imageModalUrl}
              alt="Expanded Preview"
              fill
              className="object-contain p-4"
              sizes="100vw"
              priority
            />
            <button
              onClick={() => setImageModalUrl(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer backdrop-blur-xs"
              aria-label="Tutup Pratinjau Gambar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Standard Footer */}
      <Footer />
    </div>
  );
}

