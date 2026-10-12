"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ArrowUpRight, Activity } from "lucide-react";

interface NavbarProps {
  theme?: "dark" | "light";
}

export default function Navbar({ theme = "light" }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Overview", href: "/#overview" },
    { label: "Hardware IoT", href: "/#hardware" },
    { label: "EEG Bands", href: "/#bands" },
    { label: "Workflow Riset", href: "/#workflow" },
    { label: "Dokumentasi", href: "/about" },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 w-full transition-all duration-200 ${
        isScrolled
          ? "bg-[#F8F9F5]/95 backdrop-blur-md border-b border-stone-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)]"
          : "bg-[#F8F9F5]/80 backdrop-blur-sm border-b border-stone-200/50"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" aria-label="NeuroPulse Homepage" className="flex items-center gap-3 group min-h-[44px]">
          <div className="w-9 h-9 rounded-full bg-[#EDF1E7] border border-[#DEE5D6] flex items-center justify-center text-[#5B6D49] group-hover:scale-105 transition-transform shadow-2xs">
            <Activity className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold tracking-tight text-base text-[#1C1E1A] group-hover:text-[#5B6D49] transition-colors leading-tight">
              NeuroPulse
            </span>
            <span className="text-[10px] text-stone-500 font-mono tracking-wider uppercase">
              EEG Biosensing IoT
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7 lg:gap-9" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[13px] font-medium tracking-wide text-stone-600 hover:text-[#1C1E1A] transition-colors relative py-2 px-1 min-h-[40px] inline-flex items-center"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Buttons: Login and Register */}
        <div className="hidden md:flex items-center gap-2.5">
          <Link
            href="/login"
            className="text-xs font-semibold text-stone-700 hover:text-[#1C1E1A] transition-colors px-4 py-2 min-h-[38px] inline-flex items-center justify-center rounded-full hover:bg-stone-200/60"
          >
            Masuk
          </Link>
          <Link
            href="/dashboard"
            className="px-5 py-2 min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-full bg-[#5B6D49] hover:bg-[#4E5E3E] text-white font-medium text-xs tracking-tight transition-all shadow-sm hover:shadow active:scale-[0.98] text-center cursor-pointer"
          >
            <span>Buka Platform</span>
            <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowUpRight className="w-2.5 h-2.5 text-white" />
            </div>
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-full text-stone-600 hover:text-[#1C1E1A] hover:bg-stone-200/60 transition-colors cursor-pointer min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-stone-200/80 bg-[#F8F9F5] px-5 pt-3 pb-6 space-y-3 shadow-lg">
          <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 min-h-[40px] flex items-center rounded-xl text-xs font-medium text-stone-700 hover:text-[#1C1E1A] hover:bg-stone-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="pt-3 border-t border-stone-200 flex items-center gap-3">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 py-2.5 min-h-[40px] flex items-center justify-center text-center rounded-full bg-white border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs"
            >
              Masuk
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 py-2.5 min-h-[40px] flex items-center justify-center text-center rounded-full bg-[#5B6D49] text-xs font-medium text-white hover:bg-[#4E5E3E] transition-colors shadow-sm"
            >
              Buka Platform
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
export { Navbar };
