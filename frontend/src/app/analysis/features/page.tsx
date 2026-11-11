"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { analysisService } from "@/services/analysis.service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Activity,
  CheckCircle2,
  AlertCircle,
  Database,
  Brain,
  Clock,
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Sliders,
  Check,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { FeatureExperiment } from "@/types";

export default function FeatureAnalysisPage() {
  const [selectedExpId, setSelectedExpId] = useState<string>("E1");

  const {
    data: report,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["feature-experiments"],
    queryFn: () => analysisService.getFeatureExperiments(),
    staleTime: 5 * 60 * 1000,
  });

  const experiments = report?.experiments || [];
  const metadata = report?.metadata;
  const conclusion = report?.conclusion;
  const selectedExp: FeatureExperiment | undefined =
    experiments.find((e) => e.id === selectedExpId) || experiments[0];

  // Data for Recharts comparative visualization
  const chartData = experiments.map((exp) => ({
    name: exp.id,
    fullName: exp.name,
    features: exp.features.join(", "),
    Accuracy: Number((exp.metrics.accuracy * 100).toFixed(2)),
    BalancedAcc: Number((exp.metrics.balanced_accuracy * 100).toFixed(2)),
    Precision: Number((exp.metrics.macro_precision * 100).toFixed(2)),
    Recall: Number((exp.metrics.macro_recall * 100).toFixed(2)),
    MacroF1: Number((exp.metrics.macro_f1 * 100).toFixed(2)),
  }));

  return (
    <AppShell
      title="Analisis Kombinasi Fitur Gelombang Otak"
      subtitle="Evaluasi empiris pengaruh kombinasi frekuensi EEG terhadap performa klasifikasi SVM"
    >
      <div className="space-y-8 pb-12">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-[#5E6659] mb-1">
              <Link
                href="/analysis"
                className="hover:text-[#1C1E1A] inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Ringkasan Analysis</span>
              </Link>
              <span>/</span>
              <span className="font-semibold text-[#1C1E1A]">Kombinasi Fitur & SVM</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#1C1E1A] tracking-tight">
              Analisis Kombinasi Fitur Gelombang Otak Menggunakan SVM
            </h2>
            <p className="text-xs sm:text-sm text-[#5E6659] max-w-4xl leading-relaxed mt-1">
              Pengujian empiris komparatif terhadap 4 kombinasi spektrum frekuensi EEG (E1, E2, E3, E4)
              menggunakan algoritma Support Vector Machine (Kernel RBF, C=1.0) dengan metode validasi
              ketat 5-Fold Subject-Independent GroupKFold (Zero Subject Overlap).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium bg-[#EDF1E7] text-[#3D4C32] border border-[#DEE5D6]">
              <span className="w-2 h-2 rounded-full bg-[#5B6D49]" />
              Data Empiris Tervalidasi
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center rounded-2xl bg-white border border-stone-200/80 space-y-3">
            <div className="w-10 h-10 border-3 border-[#5B6D49] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-[#1C1E1A]">Memuat data eksperimen fitur EEG...</p>
            <p className="text-xs text-[#5E6659]">Mengambil hasil evaluasi 5-Fold GroupKFold aktual.</p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="p-6 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <AlertCircle className="w-5 h-5 text-amber-700" />
              <span>Gagal Memuat Hasil Eksperimen</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              {(error as Error)?.message ||
                "Hasil eksperimen belum tersedia. Pastikan backend Go dan laporan eksperimen ML telah terinisialisasi."}
            </p>
          </div>
        )}

        {report && (
          <>
            {/* BAGIAN A: EXPERIMENT OVERVIEW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <Card className="bg-white border-stone-200/80 rounded-2xl p-4.5 shadow-2xs">
                <span className="text-[11px] font-mono text-[#77776E] uppercase block">
                  Jumlah Eksperimen
                </span>
                <span className="text-2xl font-serif font-bold text-[#1C1E1A] block mt-1">
                  {experiments.length} Kombinasi
                </span>
                <span className="text-[11px] text-[#5E6659] block mt-0.5">
                  E1, E2, E3, dan E4
                </span>
              </Card>

              <Card className="bg-white border-stone-200/80 rounded-2xl p-4.5 shadow-2xs">
                <span className="text-[11px] font-mono text-[#77776E] uppercase block">
                  Algoritma Model
                </span>
                <span className="text-xl font-serif font-bold text-[#1C1E1A] block mt-1">
                  SVM (RBF Kernel)
                </span>
                <span className="text-[11px] text-[#5E6659] block mt-0.5">
                  C=1.0, Balanced Weights
                </span>
              </Card>

              <Card className="bg-white border-stone-200/80 rounded-2xl p-4.5 shadow-2xs">
                <span className="text-[11px] font-mono text-[#77776E] uppercase block">
                  Dataset Acuan
                </span>
                <span className="text-xl font-serif font-bold text-[#1C1E1A] block mt-1">
                  Mendeley FP1
                </span>
                <span className="text-[11px] text-[#5E6659] block mt-0.5">
                  51 Subjek ({metadata?.dataset.clean_samples_used?.toLocaleString()} sampel bersih)
                </span>
              </Card>

              <Card className="bg-white border-stone-200/80 rounded-2xl p-4.5 shadow-2xs">
                <span className="text-[11px] font-mono text-[#77776E] uppercase block">
                  Metode Validasi
                </span>
                <span className="text-xl font-serif font-bold text-[#1C1E1A] block mt-1">
                  5-Fold GroupKFold
                </span>
                <span className="text-[11px] text-[#2D7A58] font-medium block mt-0.5">
                  Zero Subject Overlap
                </span>
              </Card>

              <Card className="bg-white border-stone-200/80 rounded-2xl p-4.5 shadow-2xs">
                <span className="text-[11px] font-mono text-[#77776E] uppercase block">
                  Waktu Eksekusi
                </span>
                <span className="text-sm font-semibold text-[#1C1E1A] block mt-1 truncate">
                  {metadata?.executed_at
                    ? new Date(metadata.executed_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Tervalidasi"}
                </span>
                <span className="text-[11px] text-[#5B6D49] block mt-0.5">
                  Status: {metadata?.status === "completed" ? "Selesai" : metadata?.status}
                </span>
              </Card>
            </div>

            {/* BAGIAN B: INFORMASI FITUR EEG */}
            <Card className="bg-white border-stone-200/80 rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-stone-100 bg-[#FAFBF8] flex flex-row items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49]">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold text-[#1C1E1A]">
                      Informasi Karakteristik 5 Fitur Spektral Gelombang Otak
                    </CardTitle>
                    <span className="text-[11px] text-[#77776E]">
                      Fitur masukan (*input features*) terverifikasi dari ASIC TGAM1 elektroda dahi FP1
                    </span>
                  </div>
                </div>
                <Badge variant="neutral" size="sm">
                  Kanal FP1 Monopolar
                </Badge>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {(metadata?.eeg_feature_spectrum_info || []).map((feat) => (
                    <div
                      key={feat.band}
                      className="p-3.5 rounded-xl bg-[#FAFBF8] border border-stone-200/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#1C1E1A]">
                          {feat.band} ({feat.symbol})
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-600">
                          {feat.unit}
                        </span>
                      </div>
                      <div className="text-xs space-y-0.5">
                        <span className="text-[#5B6D49] font-medium block">
                          Rentang: {feat.frequency_range}
                        </span>
                        <span className="text-[10px] text-stone-500 block">
                          Filter ASIC: {feat.asic_range}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500 leading-tight pt-1 border-t border-stone-200/60">
                        {feat.source}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-stone-500 italic leading-relaxed">
                  * Catatan Integritas Ilmiah: Satuan fitur adalah persentase (%) daya relatif spektral normalisasi terhadap total daya sub-band ASIC, bukan tegangan biopotensial absolut (µV).
                </p>
              </CardContent>
            </Card>

            {/* BAGIAN C: FEATURE COMBINATIONS CONFIGURATION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#1C1E1A]">
                    Konfigurasi 4 Eksperimen Kombinasi Fitur
                  </h3>
                  <p className="text-xs text-[#5E6659]">
                    Kombinasi spektrum frekuensi yang diuji pada arsitektur SVM RBF yang identik
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {experiments.map((exp) => {
                  const isSelected = selectedExpId === exp.id;
                  return (
                    <div
                      key={exp.id}
                      onClick={() => setSelectedExpId(exp.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? "bg-[#FAFBF8] border-[#5B6D49] shadow-md ring-1 ring-[#5B6D49]"
                          : "bg-white border-stone-200/80 hover:border-stone-300 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-sm text-[#1C1E1A]">
                          {exp.id}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            isSelected
                              ? "bg-[#5B6D49] text-white"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {exp.feature_count} Fitur
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-[#1C1E1A] mb-1.5 leading-snug">
                        {exp.name}
                      </h4>
                      <p className="text-[11px] text-[#5E6659] leading-relaxed mb-3 line-clamp-2">
                        {exp.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-100">
                        {exp.features.map((f) => (
                          <span
                            key={f}
                            className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#EDF1E7] text-[#3D4C32] border border-[#DEE5D6]"
                          >
                            <Check className="w-2.5 h-2.5 text-[#5B6D49]" />
                            {f}
                          </span>
                        ))}
                      </div>

                      {/* Mini metric pill */}
                      <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-stone-500">Macro F1:</span>
                        <span className="font-bold text-[#5B6D49]">
                          {(exp.metrics.macro_f1 * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BAGIAN D: HASIL EKSPERIMEN (TABEL UTAMA) */}
            <Card className="bg-white border-stone-200/80 rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-stone-100 bg-[#FAFBF8] flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-[#1C1E1A]">
                    Tabel Perbandingan Kinerja Kombinasi Fitur (5-Fold GroupKFold)
                  </CardTitle>
                  <span className="text-xs text-[#5E6659]">
                    Metrik rata-rata ± standar deviasi antar-fold out-of-subject
                  </span>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#EDF1E7] text-[#3D4C32] border border-[#DEE5D6]">
                  Evaluasi SVM RBF
                </span>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAFBF8] border-b border-stone-200 text-stone-600 font-mono text-[11px] uppercase">
                      <th className="py-3 px-4">Eksperimen</th>
                      <th className="py-3 px-4">Daftar Fitur</th>
                      <th className="py-3 px-4 text-center">Jml</th>
                      <th className="py-3 px-4 text-right">Akurasi</th>
                      <th className="py-3 px-4 text-right">Balanced Acc</th>
                      <th className="py-3 px-4 text-right">Presisi</th>
                      <th className="py-3 px-4 text-right">Recall</th>
                      <th className="py-3 px-4 text-right font-bold text-[#1C1E1A]">
                        Macro F1-Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono">
                    {experiments.map((exp) => {
                      const isSelected = selectedExpId === exp.id;
                      const isBestF1 = conclusion?.best_combination_f1?.id === exp.id;
                      return (
                        <tr
                          key={exp.id}
                          onClick={() => setSelectedExpId(exp.id)}
                          className={`hover:bg-stone-50/80 cursor-pointer transition-colors ${
                            isSelected ? "bg-[#FAFBF8] font-medium" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-[#1C1E1A]">
                            <div className="flex items-center gap-2">
                              <span>{exp.id}</span>
                              {isBestF1 && (
                                <span className="text-[9px] font-sans px-1.5 py-0.2 rounded-full bg-[#5B6D49] text-white">
                                  Terbaik F1
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-sans text-stone-700">
                            {exp.features.join(", ")}
                          </td>
                          <td className="py-3.5 px-4 text-center text-stone-500">
                            {exp.feature_count}
                          </td>
                          <td className="py-3.5 px-4 text-right text-stone-800">
                            {(exp.metrics.accuracy * 100).toFixed(2)}%
                            <span className="text-[10px] text-stone-400 block">
                              ±{(exp.metrics.accuracy_std! * 100).toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-stone-800">
                            {(exp.metrics.balanced_accuracy * 100).toFixed(2)}%
                            <span className="text-[10px] text-stone-400 block">
                              ±{(exp.metrics.balanced_accuracy_std! * 100).toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-stone-800">
                            {(exp.metrics.macro_precision * 100).toFixed(2)}%
                            <span className="text-[10px] text-stone-400 block">
                              ±{(exp.metrics.macro_precision_std! * 100).toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-stone-800">
                            {(exp.metrics.macro_recall * 100).toFixed(2)}%
                            <span className="text-[10px] text-stone-400 block">
                              ±{(exp.metrics.macro_recall_std! * 100).toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#2D7A58] text-sm">
                            {(exp.metrics.macro_f1 * 100).toFixed(2)}%
                            <span className="text-[10px] text-stone-400 font-normal block">
                              ±{(exp.metrics.macro_f1_std! * 100).toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* BAGIAN E: GRAFIK PERBANDINGAN PERFORMA */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Grafik 1: Akurasi & Balanced Accuracy */}
              <Card className="bg-white border-stone-200/80 rounded-2xl shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#5B6D49]" />
                    <h4 className="text-sm font-semibold text-[#1C1E1A]">
                      Perbandingan Akurasi & Balanced Accuracy
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500">Satuan: Persen (%)</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEB" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[40, 55]} tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FAF9F6",
                          borderColor: "#DEE5D6",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="Accuracy" fill="#8B9D77" radius={[4, 4, 0, 0]} name="Akurasi" />
                      <Bar
                        dataKey="BalancedAcc"
                        fill="#5B6D49"
                        radius={[4, 4, 0, 0]}
                        name="Balanced Accuracy"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Grafik 2: Presisi, Recall, F1 */}
              <Card className="bg-white border-stone-200/80 rounded-2xl shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#5B6D49]" />
                    <h4 className="text-sm font-semibold text-[#1C1E1A]">
                      Perbandingan Presisi, Recall, dan Macro F1
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500">Satuan: Persen (%)</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEB" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[40, 55]} tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FAF9F6",
                          borderColor: "#DEE5D6",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="Precision" fill="#A8BBA2" radius={[4, 4, 0, 0]} name="Presisi" />
                      <Bar dataKey="Recall" fill="#758A63" radius={[4, 4, 0, 0]} name="Recall" />
                      <Bar dataKey="MacroF1" fill="#3D4C32" radius={[4, 4, 0, 0]} name="Macro F1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* BAGIAN F: CONFUSION MATRIX */}
            {selectedExp && (
              <Card className="bg-white border-stone-200/80 rounded-2xl shadow-sm overflow-hidden">
                <CardHeader className="py-4 px-6 border-b border-stone-100 bg-[#FAFBF8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#5B6D49]">
                        {selectedExp.id}
                      </span>
                      <CardTitle className="text-sm font-semibold text-[#1C1E1A]">
                        Confusion Matrix Agregat: {selectedExp.name}
                      </CardTitle>
                    </div>
                    <span className="text-xs text-[#5E6659]">
                      Matriks kontinjensi prediksi Out-of-Fold (N = 7.439 rekaman bersih)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
                    {experiments.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setSelectedExpId(e.id)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-mono transition-all ${
                          selectedExpId === e.id
                            ? "bg-white font-bold text-[#1C1E1A] shadow-xs"
                            : "text-stone-500 hover:text-stone-900"
                        }`}
                      >
                        {e.id}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    {/* Visual 2x2 Matrix */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                        <div />
                        <div className="p-2 font-semibold text-stone-600 bg-stone-50 rounded-lg">
                          Pred: Resting (0)
                        </div>
                        <div className="p-2 font-semibold text-stone-600 bg-stone-50 rounded-lg">
                          Pred: Math Task (1)
                        </div>

                        <div className="p-2 font-semibold text-stone-600 bg-stone-50 rounded-lg flex items-center justify-center">
                          Aktual: Resting (0)
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                          <span className="text-[10px] text-emerald-800 uppercase block font-semibold">
                            True Negative (TN)
                          </span>
                          <span className="text-xl font-bold text-emerald-900 block mt-1">
                            {selectedExp.total_confusion_matrix.tn.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                          <span className="text-[10px] text-amber-800 uppercase block font-semibold">
                            False Positive (FP)
                          </span>
                          <span className="text-xl font-bold text-amber-900 block mt-1">
                            {selectedExp.total_confusion_matrix.fp.toLocaleString()}
                          </span>
                        </div>

                        <div className="p-2 font-semibold text-stone-600 bg-stone-50 rounded-lg flex items-center justify-center">
                          Aktual: Math Task (1)
                        </div>
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                          <span className="text-[10px] text-rose-800 uppercase block font-semibold">
                            False Negative (FN)
                          </span>
                          <span className="text-xl font-bold text-rose-900 block mt-1">
                            {selectedExp.total_confusion_matrix.fn.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                          <span className="text-[10px] text-blue-800 uppercase block font-semibold">
                            True Positive (TP)
                          </span>
                          <span className="text-xl font-bold text-blue-900 block mt-1">
                            {selectedExp.total_confusion_matrix.tp.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown metrics per class */}
                    <div className="space-y-3 font-mono text-xs">
                      <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-stone-200/80 space-y-2">
                        <span className="text-[11px] font-sans font-semibold text-[#1C1E1A] block">
                          Metrik Kelas 0: Closed-Eye Resting Baseline
                        </span>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <span className="text-[10px] text-stone-400 block">Presisi C0</span>
                            <span className="font-bold text-stone-800">
                              {(selectedExp.metrics.class_0_precision! * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block">Recall C0</span>
                            <span className="font-bold text-stone-800">
                              {(selectedExp.metrics.class_0_recall! * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block">F1-Score C0</span>
                            <span className="font-bold text-stone-800">
                              {(selectedExp.metrics.class_0_f1! * 100).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-stone-200/80 space-y-2">
                        <span className="text-[11px] font-sans font-semibold text-[#1C1E1A] block">
                          Metrik Kelas 1: Active Mathematical Tasks
                        </span>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <span className="text-[10px] text-stone-400 block">Presisi C1</span>
                            <span className="font-bold text-stone-800">
                              {(selectedExp.metrics.class_1_precision! * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block">Recall C1</span>
                            <span className="font-bold text-stone-800">
                              {(selectedExp.metrics.class_1_recall! * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block">F1-Score C1</span>
                            <span className="font-bold text-stone-800">
                              {(selectedExp.metrics.class_1_f1! * 100).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] font-sans text-stone-500 leading-relaxed">
                        Evaluasi out-of-fold membuktikan bahwa model dievaluasi murni pada subjek yang belum pernah dilihat saat pelatihan fold terkait.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* BAGIAN G: EXPERIMENT DETAILS */}
            <Card className="bg-white border-stone-200/80 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                <Sliders className="w-4.5 h-4.5 text-[#5B6D49]" />
                <h4 className="text-sm font-semibold text-[#1C1E1A]">
                  Rincian Parameter Metodologis & Konfigurasi Eksperimen
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-mono text-stone-400 uppercase block">Dataset</span>
                  <span className="font-semibold text-[#1C1E1A] block">
                    {metadata?.dataset.name}
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    DOI: {metadata?.dataset.doi} ({metadata?.dataset.license})
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-mono text-stone-400 uppercase block">
                    Responden & Sampel
                  </span>
                  <span className="font-semibold text-[#1C1E1A] block">
                    {metadata?.dataset.total_subjects} Subjek Unik
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    {metadata?.dataset.clean_samples_used?.toLocaleString()} detik bersih (dari {metadata?.dataset.raw_total_samples?.toLocaleString()} mentah)
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-mono text-stone-400 uppercase block">
                    Target Klasifikasi
                  </span>
                  <span className="font-semibold text-[#1C1E1A] block">
                    Biner: Resting vs Math
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    Class 0 (34,7%) vs Class 1 (65,3%)
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAFBF8] border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-mono text-stone-400 uppercase block">
                    Parameter SVM
                  </span>
                  <span className="font-semibold text-[#1C1E1A] block">
                    Kernel RBF, C=1.0, Balanced
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    StandardScaler inside Pipeline
                  </span>
                </div>
              </div>
            </Card>

            {/* BAGIAN H: KESIMPULAN EKSPERIMEN */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FAFBF8] to-[#EDF1E7] border border-[#DEE5D6] shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#5B6D49]" />
                <h4 className="text-base font-serif font-bold text-[#1C1E1A]">
                  Kesimpulan Hasil Eksperimen Kombinasi Fitur
                </h4>
              </div>

              <div className="space-y-2 text-xs text-[#3D4C32] leading-relaxed">
                <p>{conclusion?.scientific_summary}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-white/80 border border-[#DEE5D6]">
                    <span className="text-[10px] font-mono text-stone-500 block">
                      Macro F1-Score Tertinggi:
                    </span>
                    <span className="text-sm font-bold text-[#1C1E1A] block mt-0.5">
                      {conclusion?.best_combination_f1?.name}
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#5B6D49]">
                      {(conclusion?.best_combination_f1?.macro_f1! * 100).toFixed(2)}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/80 border border-[#DEE5D6]">
                    <span className="text-[10px] font-mono text-stone-500 block">
                      Balanced Accuracy Tertinggi:
                    </span>
                    <span className="text-sm font-bold text-[#1C1E1A] block mt-0.5">
                      {conclusion?.best_combination_balanced_accuracy?.name}
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#5B6D49]">
                      {(conclusion?.best_combination_balanced_accuracy?.balanced_accuracy! * 100).toFixed(2)}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/80 border border-[#DEE5D6]">
                    <span className="text-[10px] font-mono text-stone-500 block">
                      Raw Accuracy Tertinggi:
                    </span>
                    <span className="text-sm font-bold text-[#1C1E1A] block mt-0.5">
                      {conclusion?.best_combination_raw_accuracy?.name}
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#5B6D49]">
                      {(conclusion?.best_combination_raw_accuracy?.accuracy! * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

