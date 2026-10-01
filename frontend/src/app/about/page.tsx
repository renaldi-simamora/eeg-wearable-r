import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Cpu,
  Database,
  Brain,
  ShieldCheck,
  Server,
  Layers,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-blue-600/30 selection:text-white">
      <Navbar />

      <main className="flex-1 py-12 md:py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="space-y-3">
          <Badge variant="default" size="sm">
            Academic Project Overview
          </Badge>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-3xl">
            This platform represents the full-stack web and IoT gateway architecture for an integrated academic biomedical engineering project. It bridges wearable EEG hardware with real-time signal monitoring, persistent storage, and preparation for multi-model machine learning inference.
          </p>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/[0.1] border border-blue-500/[0.2] flex items-center justify-center text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">
              1. Wearable Biosensing
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Designed around the NeuroSky TGAM1 ASIC and single dry forehead electrode (FP1) with earlobe reference, paired with an ESP32 wireless module for low-noise 512 Hz telemetry.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/[0.1] border border-emerald-500/[0.2] flex items-center justify-center text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">
              2. Go & Postgres Core
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The Go Gin gateway serves both high-frequency WebSocket streams and REST APIs with JWT protection, recording experimental sessions and features into indexed PostgreSQL tables.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/[0.1] border border-indigo-500/[0.2] flex items-center justify-center text-indigo-400">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">
              3. ML-Ready Pipeline
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Spectral features (Delta, Theta, Alpha, Beta, Gamma) are engineered via Fast Fourier Transform (FFT) ready for supervised classification algorithms (SVM, Random Forest, XGBoost).
            </p>
          </Card>
        </div>

        {/* Scientific Rigor & Ethics */}
        <Card>
          <CardContent className="p-6 sm:p-8 space-y-4">
            <h3 className="text-lg font-bold text-white">
              Scientific Principles & Scope Boundaries
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              In accordance with academic standards in biomedical engineering, this platform focuses strictly on electrophysiological signal acquisition, signal conditioning, and empirical machine learning pattern classification.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>FFT spectral power density estimation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Microvolt (µV) signal voltage calibration</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Non-invasive single-channel dry electrode</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Strict separation of gateway logic and ML services</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Link back */}
        <div className="pt-2 flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="primary" size="md" className="gap-2">
              <span>Go to Platform Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="md">
              Back to Home
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
