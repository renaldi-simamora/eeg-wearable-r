import React from "react";
import Link from "next/link";
import { Activity, Cpu, Database, Network, ArrowUpRight, ShieldCheck, Heart } from "lucide-react";

interface FooterProps {
  theme?: "dark" | "light";
}

export function Footer({ theme }: FooterProps) {
  return (
    <footer className="border-t border-stone-200/80 bg-[#F7F8F5] text-[#1C1E1A] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Col 1: System Branding & Academic Scope (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" aria-label="NeuroPulse Homepage" className="inline-flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full bg-[#5B6D49] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold tracking-tight text-lg text-[#1C1E1A] block leading-none">
                  NeuroPulse
                </span>
                <span className="text-[10px] tracking-wider uppercase text-stone-500 font-medium">
                  EEG IoT Biosensing Platform
                </span>
              </div>
            </Link>

            <p className="text-xs leading-relaxed max-w-md text-[#5E6659]">
              Academic Engineering Research Project:
              <br />
              <strong className="font-semibold block mt-1 text-[#1C1E1A]">
                “Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning”
              </strong>
            </p>

            {/* Hardware Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#EDF1E7] border border-[#DEE5D6] text-[#3D4C32]">
                <Cpu className="w-3.5 h-3.5 text-[#5B6D49]" />
                <span>TGAM1 + ESP32</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#EDF1E7] border border-[#DEE5D6] text-[#3D4C32]">
                <Database className="w-3.5 h-3.5 text-[#5B6D49]" />
                <span>PostgreSQL 16</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#EDF1E7] border border-[#DEE5D6] text-[#3D4C32]">
                <Network className="w-3.5 h-3.5 text-[#5B6D49]" />
                <span>Go Gin REST/WS</span>
              </span>
            </div>
          </div>

          {/* Col 2: Platform Navigation (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Navigation
            </p>
            <ul className="space-y-2 text-xs text-[#5E6659]">
              <li>
                <Link href="/#overview" className="hover:text-[#1C1E1A] transition-colors">
                  Overview (Home)
                </Link>
              </li>
              <li>
                <Link href="/#workflow" className="hover:text-[#1C1E1A] transition-colors">
                  System Workflow
                </Link>
              </li>
              <li>
                <Link href="/#bands" className="hover:text-[#1C1E1A] transition-colors">
                  EEG Frequency Bands
                </Link>
              </li>
              <li>
                <Link href="/#platform" className="hover:text-[#1C1E1A] transition-colors">
                  Research Control Center
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#1C1E1A] transition-colors">
                  About Project & Methodology
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Research & Services (4 cols) */}
          <div className="md:col-span-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Research Services
            </p>
            <ul className="space-y-2 text-xs text-[#5E6659]">
              <li>
                <Link href="/dashboard" className="hover:text-[#1C1E1A] transition-colors flex items-center justify-between group">
                  <span>Researcher Dashboard</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#1C1E1A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </li>
              <li>
                <Link href="/sessions" className="hover:text-[#1C1E1A] transition-colors flex items-center justify-between group">
                  <span>Archived Recording Sessions</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#1C1E1A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </li>
              <li>
                <Link href="/analysis" className="hover:text-[#1C1E1A] transition-colors flex items-center justify-between group">
                  <span>Machine Learning Classifier Engine</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#1C1E1A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </li>
              <li>
                <Link href="/devices" className="hover:text-[#1C1E1A] transition-colors flex items-center justify-between group">
                  <span>IoT Wearable Device Registry</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#1C1E1A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-[#1C1E1A] transition-colors flex items-center justify-between group">
                  <span>Platform Preferences & Security</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#1C1E1A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} NeuroPulse Platform. Biomedical Engineering Thesis Project.</p>
          <div className="flex items-center gap-3 font-medium text-[11px]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EDF1E7] text-[#3D4C32] border border-[#DEE5D6]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5B6D49] animate-pulse" />
              <span>Gateway: Online 50 Hz</span>
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-stone-600">ESP32 + TGAM1 Hardware Verified</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
