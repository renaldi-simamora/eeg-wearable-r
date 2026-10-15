"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Activity, ArrowUpRight, Menu, X } from "lucide-react";

interface NavbarProps {
  theme?: "dark" | "light";
  activeId?: string;
}

export default function Navbar({ activeId }: NavbarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentActive = activeId || (pathname === "/about" ? "about" : "overview");

  const navItems = [
    { id: "overview", label: "Beranda", href: "/#overview" },
    { id: "why", label: "Keunggulan", href: "/#why" },
    { id: "hardware", label: "Hardware", href: "/#hardware" },
    { id: "calculator", label: "Kalkulator", href: "/#calculator" },
    { id: "pipeline", label: "Alur Sinyal", href: "/#pipeline" },
    { id: "bands", label: "Spektrum EEG", href: "/#bands" },
    { id: "about", label: "Tentang Riset", href: "/about" },
  ];

  return (
    <header className="sticky top-3 sm:top-4 z-50 w-full transition-all px-3 sm:px-4 md:px-6">
      <div className="max-w-[1240px] w-full mx-auto">
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

          {/* Center: Navigation Links with Active Pill & Indicator Dot */}
          <div className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-stone-100/70 border border-[rgba(40,40,30,0.04)]">
            {navItems.map((item) => {
              const isActive = currentActive === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
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

          {/* Right: Login & Register (Harmonized Auth Actions) */}
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
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-1.5 px-3 rounded-xl transition-colors ${
                  currentActive === item.id ? "bg-white font-semibold text-[#5F6E52]" : "hover:text-[#5F6E52]"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-[rgba(40,40,30,0.08)] flex items-center gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2 text-center rounded-full bg-white border border-stone-200 text-xs font-semibold text-[#1E201D]"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2 text-center rounded-full bg-[#5F6E52] text-white text-xs font-semibold"
              >
                Daftar ↗
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export { Navbar };
