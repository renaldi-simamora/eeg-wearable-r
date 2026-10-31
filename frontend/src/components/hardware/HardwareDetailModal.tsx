"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  X,
  ArrowLeft,
  Cpu,
  Layers,
  Code2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Zap,
  Activity,
  Maximize2,
  ShieldCheck,
  ChevronRight,
  Info
} from "lucide-react";
import { HARDWARE_DETAILS, HardwareDetailData } from "@/data/hardware-details";
import { CodeViewer } from "@/components/ui/code-viewer";

interface HardwareDetailModalProps {
  hardwareId: "tgam1" | "esp32" | "electrodes" | null;
  onClose: () => void;
  onSelectHardware?: (id: "tgam1" | "esp32" | "electrodes") => void;
  initialTab?: "overview" | "pinout" | "firmware";
}

export function HardwareDetailModal({
  hardwareId,
  onClose,
  onSelectHardware,
  initialTab = "overview",
}: HardwareDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "pinout" | "firmware">(initialTab);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [hardwareId, initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (imageModalUrl) {
          setImageModalUrl(null);
        } else {
          onClose();
        }
      }
    };
    if (hardwareId) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hardwareId, imageModalUrl, onClose]);

  if (!hardwareId) return null;

  const data: HardwareDetailData = HARDWARE_DETAILS[hardwareId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
      {/* Dark Blur Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Main Modal Card */}
      <div className="relative z-10 w-full max-w-5xl bg-[#FAF9F6] rounded-3xl border border-stone-300/80 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200">
        
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-8 py-4 bg-white border-b border-stone-200/90 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-[#58684C] text-xs font-semibold transition-colors cursor-pointer group"
              title="Kembali ke Purwarupa yang Diwujudkan"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Kembali</span>
            </button>

            <div className="h-4 w-px bg-stone-200 hidden sm:block" />

            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#77776E] hidden md:inline">Purwarupa yang Diwujudkan</span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400 hidden md:inline" />
              <span className="font-semibold text-[#1E201D] font-mono">{data.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-[#E8ECDF] border border-[rgba(102,116,79,0.3)] text-[11px] font-mono font-medium text-[#58684C] hidden sm:block">
              {data.badge}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Tutup Halaman Detail"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Component Title & Quick Switcher Bar */}
        <div className="px-5 sm:px-8 pt-5 pb-3 bg-white border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#5F6E52] animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#77776E]">
                Spesifikasi Teknis & Dokumentasi Rancang Bangun
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1E201D] mt-0.5">
              {data.title}
            </h2>
            <p className="text-xs text-[#6E7168] mt-0.5 max-w-2xl">
              {data.subtitle}
            </p>
          </div>

          {/* Quick Component Switcher */}
          {onSelectHardware && (
            <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200 text-xs self-start sm:self-center">
              <button
                onClick={() => onSelectHardware("tgam1")}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                  hardwareId === "tgam1"
                    ? "bg-[#5F6E52] text-white shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                TGAM1
              </button>
              <button
                onClick={() => onSelectHardware("esp32")}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                  hardwareId === "esp32"
                    ? "bg-[#5F6E52] text-white shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                ESP32
              </button>
              <button
                onClick={() => onSelectHardware("electrodes")}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                  hardwareId === "electrodes"
                    ? "bg-[#5F6E52] text-white shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                3 Elektroda
              </button>
            </div>
          )}
        </div>

        {/* 3 Main Tabs Navigation */}
        <div className="px-5 sm:px-8 py-3 bg-[#F4F1EA] border-b border-stone-200/80 flex items-center gap-2">
          <div className="flex items-center gap-2 w-full max-w-md bg-stone-200/70 p-1 rounded-2xl border border-stone-300/60 text-xs">
            {/* Tab 1: Ikhtisar & Foto */}
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-white text-[#1E201D] shadow-xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#5F6E52]" />
              <span>Ikhtisar & Foto</span>
            </button>

            {/* Tab 2: PinOut & Skematik */}
            <button
              onClick={() => setActiveTab("pinout")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl transition-all cursor-pointer ${
                activeTab === "pinout"
                  ? "bg-white text-[#1E201D] shadow-xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-[#5F6E52]" />
              <span>PinOut & Skematik</span>
            </button>

            {/* Tab 3: Firmware C++ */}
            <button
              onClick={() => setActiveTab("firmware")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl transition-all cursor-pointer ${
                activeTab === "firmware"
                  ? "bg-white text-[#1E201D] shadow-xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-[#5F6E52]" />
              <span>Firmware C++</span>
            </button>
          </div>
        </div>

        {/* Scrollable Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">

          {/* TAB 1: IKHTISAR & FOTO */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Hero Image Showcase */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
                <div className="flex flex-col md:flex-row gap-5 items-center">
                  <div className="relative w-full md:w-5/12 aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 border border-stone-200 group">
                    <Image
                      src={data.overview.heroImage}
                      alt={data.title}
                      fill
                      className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                    <button
                      onClick={() => setImageModalUrl(data.overview.heroImage)}
                      className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/85 text-white text-[10px] font-mono flex items-center gap-1 backdrop-blur-xs transition-colors cursor-pointer"
                      title="Perbesar Foto"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Perbesar</span>
                    </button>
                  </div>

                  <div className="w-full md:w-7/12 space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E8ECDF] text-[#58684C] text-[10px] font-mono font-semibold uppercase">
                      <Zap className="w-3 h-3" />
                      <span>Peran Subsistem dalam Arsitektur</span>
                    </div>

                    <p className="text-sm font-medium text-[#1E201D] leading-relaxed">
                      {data.overview.roleSummary}
                    </p>

                    <p className="text-xs text-stone-500 italic border-l-2 border-[#5F6E52] pl-3 py-0.5">
                      {data.overview.imageCaption}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Technical Description */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-semibold text-[#1E201D] font-mono uppercase tracking-wider flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#5F6E52]" />
                  <span>Prinsip Kerja & Penjelasan Rinci</span>
                </h3>

                <div className="space-y-2.5 text-xs text-[#4F524A] leading-relaxed">
                  {data.overview.detailedDescription.map((par, idx) => (
                    <p key={idx}>{par}</p>
                  ))}
                </div>
              </div>

              {/* Operational Parameters Grid */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#1E201D] font-mono uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#5F6E52]" />
                  <span>Karakteristik & Parameter Operasional</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {data.overview.specs.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-1"
                    >
                      <span className="text-[10px] font-mono text-[#77776E] uppercase tracking-wider block">
                        {s.label}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[#1E201D] font-mono block">
                        {s.value}
                      </span>
                      {s.desc && (
                        <span className="text-[10px] text-stone-500 block leading-tight">
                          {s.desc}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Architectural Features */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#1E201D] font-mono uppercase tracking-wider">
                  Keunggulan Implementasi Hardware
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.overview.keyFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#5F6E52] shrink-0" />
                        <h4 className="text-xs font-semibold text-[#1E201D]">{feat.title}</h4>
                      </div>
                      <p className="text-[11px] text-[#6E7168] leading-relaxed pl-6">
                        {feat.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical Signal Chain Steps (if applicable) */}
              {data.overview.signalChainSteps && (
                <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
                  <h3 className="text-xs font-semibold text-[#1E201D] font-mono uppercase tracking-wider">
                    Tahapan Rantai Sinyal Fisik Biosensing
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {data.overview.signalChainSteps.map((st, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                        <span className="text-[11px] font-bold text-[#5F6E52] block font-mono">
                          {st.stage}
                        </span>
                        <p className="text-[10.5px] text-stone-600 leading-relaxed">
                          {st.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Voltage Conversion Formula Notice (TGAM1 / Electrodes) */}
              {data.overview.voltageFormula && (
                <div className="p-4 rounded-2xl bg-[#E8ECDF]/50 border border-[#5F6E52]/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#5F6E52]" />
                    <span className="text-xs font-semibold text-[#1E201D] font-mono">
                      Formula Konversi ADC Mentah ke Tegangan Mikrovolt (µV)
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-[#5F6E52]/20 font-mono text-xs font-semibold text-[#1E201D] text-center">
                    {data.overview.voltageFormula.formula}
                  </div>
                  <p className="text-[11px] text-[#4F524A] leading-relaxed">
                    {data.overview.voltageFormula.explanation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PINOUT & SKEMATIK */}
          {activeTab === "pinout" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Schematic Diagram Showcase */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold text-[#1E201D] font-mono uppercase tracking-wider flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-[#5F6E52]" />
                      <span>Diagram Skematik & Tata Letak Rangkaian Aktual</span>
                    </h3>
                    <p className="text-xs text-stone-500">
                      {data.pinout.schematicCaption}
                    </p>
                  </div>

                  <button
                    onClick={() => setImageModalUrl(data.pinout.schematicImage)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-mono text-stone-700 transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Perbesar Skema</span>
                  </button>
                </div>

                <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-stone-50 border border-stone-200 flex items-center justify-center group cursor-pointer"
                  onClick={() => setImageModalUrl(data.pinout.schematicImage)}
                >
                  <Image
                    src={data.pinout.schematicImage}
                    alt={data.title + " Schematic"}
                    fill
                    className="object-contain p-4 transition-transform duration-300 group-hover:scale-102"
                    sizes="(max-width: 1024px) 100vw, 900px"
                  />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-full bg-white/90 text-stone-800 text-xs font-semibold shadow-md">
                      Klik untuk memperbesar gambar skematik
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#4F524A] leading-relaxed pt-1">
                  {data.pinout.circuitSummary}
                </p>
              </div>

              {/* Interface Points Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.pinout.interfacePoints.map((pt, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#5F6E52] shrink-0" />
                      <h4 className="text-xs font-semibold text-[#1E201D]">{pt.title}</h4>
                    </div>
                    <p className="text-[11px] text-[#6E7168] leading-relaxed pl-6">
                      {pt.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Pinout Table */}
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs space-y-0">
                <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[#1E201D] font-mono uppercase tracking-wider">
                    Tabel Pemetaan Pin & Koneksi Elektrik
                  </h4>
                  <span className="text-[11px] font-mono text-stone-500">
                    {data.pinout.pinoutTable.length} Titik Koneksi
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100/70 border-b border-stone-200 font-mono text-[11px] text-stone-600">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Pin / Lead</th>
                        <th className="py-2.5 px-4 font-semibold">Terhubung ke</th>
                        <th className="py-2.5 px-4 font-semibold hidden sm:table-cell">Nama Sinyal</th>
                        <th className="py-2.5 px-4 font-semibold hidden md:table-cell">Tipe</th>
                        <th className="py-2.5 px-4 font-semibold">Fungsi & Perilaku</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-sans">
                      {data.pinout.pinoutTable.map((row, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-[#5F6E52]">
                            {row.pin}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[#1E201D]">
                            {row.connectedTo}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-stone-700 hidden sm:table-cell">
                            {row.name}
                          </td>
                          <td className="py-2.5 px-4 text-[10.5px] font-mono text-stone-500 hidden md:table-cell">
                            {row.signalType || "-"}
                          </td>
                          <td className="py-2.5 px-4 text-[11px] text-stone-600">
                            {row.func}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Power & Ground Connection Notice */}
              {data.pinout.groundPowerNotice && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs font-mono">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Catatan Catu Daya & Ground Bersama (Common Ground)</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed pl-6">
                    {data.pinout.groundPowerNotice}
                  </p>
                </div>
              )}

              {/* Laboratory Verification Notes Banner */}
              {data.pinout.verificationNotes && data.pinout.verificationNotes.length > 0 && (
                <div className="p-4 rounded-2xl bg-stone-100 border border-stone-300 space-y-2">
                  <div className="flex items-center gap-2 text-[#1E201D] font-semibold text-xs font-mono">
                    <ShieldCheck className="w-4 h-4 text-[#5F6E52]" />
                    <span>Catatan Status Verifikasi Laboratorium Hardware</span>
                  </div>
                  <ul className="space-y-1.5 pl-6 text-[11px] text-stone-600 list-disc">
                    {data.pinout.verificationNotes.map((note, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FIRMWARE C++ */}
          {activeTab === "firmware" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Firmware Header Summary Card */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#5F6E52]" />
                    <h3 className="text-sm font-semibold text-[#1E201D] font-mono">
                      {data.firmware.title}
                    </h3>
                  </div>

                  {data.firmware.isFullFirmware && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-mono font-bold uppercase">
                      Full Source Code (.INO)
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#4F524A] leading-relaxed">
                  {data.firmware.summary}
                </p>
              </div>

              {/* CODE VIEWER COMPONENT (C++ / ARDUINO .INO) */}
              <CodeViewer
                code={data.firmware.code}
                filename={data.firmware.codeFilename}
                language="C++ / Arduino"
                title={
                  data.firmware.isFullFirmware
                    ? "Full Source Code Arduino (.ino) Lengkap Seluruh 11 Subsistem Tanpa Pemotongan"
                    : `Implementasi Driver C++ Biosinyal (${data.firmware.codeFilename})`
                }
              />

              {/* Sub-band Aggregation Details (TGAM1 / Electrodes) */}
              {data.firmware.bandProcessingExplanation && (
                <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
                  <h4 className="text-xs font-semibold text-[#1E201D] font-mono uppercase tracking-wider">
                    Pengolahan Sub-Band ASIC Menjadi 5 Gelombang Otak Kanonikal
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {data.firmware.bandProcessingExplanation.map((band, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#5F6E52] font-mono">{band.band}</span>
                          <span className="text-[10px] font-mono text-stone-500">{band.freq}</span>
                        </div>
                        <p className="text-[10.5px] text-stone-600 leading-tight">
                          {band.formula}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Architecture & Flow Explanation */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-semibold text-[#1E201D] font-mono uppercase tracking-wider">
                  Dekomposisi Logika & Arsitektur Firmware
                </h4>
                <div className="space-y-2">
                  {data.firmware.architectureExplanation.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-stone-50 border border-stone-100 flex items-start gap-3"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#5F6E52] text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-[#1E201D] block">
                          {step.step}
                        </span>
                        <p className="text-[11px] text-stone-600 leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verification & Hardware Test Items */}
              {data.firmware.verificationItems && (
                <div className="p-4 rounded-2xl bg-stone-100 border border-stone-300 space-y-2">
                  <div className="flex items-center gap-2 text-stone-800 font-semibold text-xs font-mono">
                    <ShieldCheck className="w-4 h-4 text-[#5F6E52]" />
                    <span>Hal-Hal yang Perlu Diverifikasi pada Pengujian Hardware</span>
                  </div>
                  <ul className="space-y-1.5 pl-6 text-[11px] text-stone-600 list-disc">
                    {data.firmware.verificationItems.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Switcher to View Full ESP32 Firmware if browsing TGAM1 or Electrodes */}
              {!data.firmware.isFullFirmware && onSelectHardware && (
                <div className="p-4 rounded-2xl bg-[#E8ECDF]/50 border border-[#5F6E52]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-[#1E201D]">
                      Ingin melihat Full Source Code Arduino Gateway (.INO)?
                    </span>
                    <p className="text-[11px] text-stone-600">
                      Seluruh 410+ baris program C++ terintegrasi tersedia di halaman firmware ESP32.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onSelectHardware("esp32");
                      setActiveTab("firmware");
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5F6E52] hover:bg-[#4E5C43] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    <span>Buka Firmware Lengkap ESP32</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-5 sm:px-8 py-3.5 bg-white border-t border-stone-200/90 flex items-center justify-between">
          <div className="text-[11px] font-mono text-[#77776E] hidden sm:block">
            Proyek Riset EEG Wearable IoT • Akademik 2026
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-[#5F6E52] hover:bg-[#4E5C43] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer ml-auto"
          >
            Tutup Dokumentasi
          </button>
        </div>

      </div>

      {/* Expanded Image Viewer Modal */}
      {imageModalUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md p-4 flex flex-col items-center justify-center animate-in fade-in duration-150"
          onClick={() => setImageModalUrl(null)}
        >
          <div className="relative w-full max-w-4xl max-h-[85vh] aspect-[16/10] bg-stone-900 rounded-3xl overflow-hidden border border-stone-700 shadow-2xl p-4 flex items-center justify-center">
            <Image
              src={imageModalUrl}
              alt="Expanded Preview"
              fill
              className="object-contain p-4"
              sizes="100vw"
            />
          </div>
          <button
            onClick={() => setImageModalUrl(null)}
            className="mt-4 px-5 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-medium backdrop-blur-sm cursor-pointer"
          >
            Tutup Pratinjau Gambar (Esc)
          </button>
        </div>
      )}
    </div>
  );
}

