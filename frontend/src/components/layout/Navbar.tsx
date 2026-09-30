"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

interface NavbarProps {
  theme?: "dark" | "light";
}

export default function Navbar({ theme = "dark" }: NavbarProps) {
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
    { label: "Home", href: "/#overview" },
    { label: "Workflow", href: "/#workflow" },
    { label: "EEG Bands", href: "/#bands" },
    { label: "Platform", href: "/#platform" },
    { label: "About", href: "/about" },
  ];

  const isDark = theme === "dark";

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? "bg-[#070b14]/85 backdrop-blur-xl border-b border-slate-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
          : "bg-[#070b14]/50 backdrop-blur-md border-b border-slate-800/40"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand - Clean Aurion / NeuroPulse Logo without tacky badges */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full border border-slate-700/80 bg-slate-900/90 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10 group-hover:border-cyan-500/60 transition-all">
            {/* Iconic circular logo matching reference image */}
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="4" fill="currentColor" />
            </svg>
          </div>
          <span className="font-bold tracking-tight text-lg text-white group-hover:text-cyan-400 transition-colors">
            Aurion
          </span>
        </Link>

        {/* Desktop Navigation - Exact Sequence Matching Landing Page Sections */}
        <nav className="hidden md:flex items-center gap-8 lg:gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[13px] font-medium tracking-wide text-slate-300 hover:text-white transition-colors relative py-1 hover:text-cyan-400"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Buttons: STRICTLY Login and Register */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-slate-800/60"
          >
            Login
          </Link>
          <Link href="/register">
            <button className="px-5 py-2 rounded-full bg-white text-slate-950 hover:bg-slate-100 font-semibold text-xs tracking-tight transition-all shadow-md hover:shadow-cyan-500/20 active:scale-95 cursor-pointer">
              Register
            </button>
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#070b14]/95 backdrop-blur-2xl px-5 pt-3 pb-6 space-y-3 shadow-2xl animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="pt-3 border-t border-slate-800 flex items-center gap-3">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 py-2 text-center rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Login
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 py-2 text-center rounded-full bg-white text-xs font-semibold text-slate-950 hover:bg-slate-100"
            >
              Register
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
export { Navbar };
