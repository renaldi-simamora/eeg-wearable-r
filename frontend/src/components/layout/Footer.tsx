import React from "react";
import Link from "next/link";
import { Activity, Cpu, Database, Network, ArrowUpRight, ShieldCheck, GitFork } from "lucide-react";

interface FooterProps {
  theme?: "dark" | "light";
}

export function Footer({ theme = "dark" }: FooterProps) {
  const isDark = theme === "dark";

  return (
    <footer
      className={`border-t transition-colors ${
        isDark
          ? "bg-[#070b14] border-slate-800/80 text-white"
          : "bg-white border-slate-200 text-slate-900"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Col 1: System Branding & Academic Scope (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10 group-hover:border-cyan-500/60 transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="12" cy="12" r="4" fill="currentColor" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-bold tracking-tight text-base ${isDark ? "text-white" : "text-slate-900"}`}>
                  NeuroPulse
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                  EEG IoT Platform
                </span>
              </div>
            </Link>

            <p className={`text-xs leading-relaxed max-w-md ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Academic Engineering Research Project:
              <br />
              <strong className={`font-semibold block mt-1 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                “Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning”
              </strong>
            </p>

            {/* Hardware Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border ${
                  isDark
                    ? "bg-slate-900/90 border-slate-800 text-slate-300"
                    : "bg-slate-100 border-slate-200 text-slate-700"
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>TGAM1 + ESP32</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border ${
                  isDark
                    ? "bg-slate-900/90 border-slate-800 text-slate-300"
                    : "bg-slate-100 border-slate-200 text-slate-700"
                }`}
              >
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span>PostgreSQL 16</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border ${
                  isDark
                    ? "bg-slate-900/90 border-slate-800 text-slate-300"
                    : "bg-slate-100 border-slate-200 text-slate-700"
                }`}
              >
                <Network className="w-3.5 h-3.5 text-emerald-400" />
                <span>Go Gin REST/WS</span>
              </span>
            </div>
          </div>

          {/* Col 2: Platform Navigation (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <h4
              className={`text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-slate-300" : "text-slate-900"
              }`}
            >
              Navigation
            </h4>
            <ul className={`space-y-2 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              <li>
                <Link href="/#overview" className="hover:text-cyan-400 transition-colors">
                  Overview (Home)
                </Link>
              </li>
              <li>
                <Link href="/#workflow" className="hover:text-cyan-400 transition-colors">
                  System Workflow
                </Link>
              </li>
              <li>
                <Link href="/#bands" className="hover:text-cyan-400 transition-colors">
                  EEG Frequency Bands
                </Link>
              </li>
              <li>
                <Link href="/#platform" className="hover:text-cyan-400 transition-colors">
                  Research Control Center
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-cyan-400 transition-colors">
                  About Project & Methodology
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Research & Services (4 cols) */}
          <div className="md:col-span-4 space-y-3">
            <h4
              className={`text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-slate-300" : "text-slate-900"
              }`}
            >
              Research Services
            </h4>
            <ul className={`space-y-2 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              <li>
                <Link href="/dashboard" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
                  <span>Researcher Dashboard</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </Link>
              </li>
              <li>
                <Link href="/sessions" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
                  <span>Archived Recording Sessions</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </Link>
              </li>
              <li>
                <Link href="/analysis" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
                  <span>Machine Learning Classifier Engine</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </Link>
              </li>
              <li>
                <Link href="/devices" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
                  <span>IoT Wearable Device Registry</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
                  <span>Platform Preferences & Security</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          className={`mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
            isDark ? "border-slate-800/80 text-slate-500" : "border-slate-200 text-slate-500"
          }`}
        >
          <p>© {new Date().getFullYear()} NeuroPulse Platform. Biomedical Engineering Thesis Project.</p>
          <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Gateway: Online 50 Hz</span>
            </span>
            <span>•</span>
            <span>ESP32 + TGAM1 Hardware Ready</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
