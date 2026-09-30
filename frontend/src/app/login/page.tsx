"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/providers/AuthProvider";
import { Activity, AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff, Fingerprint, ShieldCheck, Zap, Radio } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid academic/institutional email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Mini animated waveform component for the side panel
function MiniWaveform({ color, delay = 0 }: { color: string; delay?: number }) {
  const [points, setPoints] = useState<number[]>([]);

  useEffect(() => {
    const generate = () => {
      const pts = [];
      for (let i = 0; i < 60; i++) {
        pts.push(Math.sin(i * 0.15 + Date.now() * 0.002 + delay) * 18 + Math.sin(i * 0.08 + Date.now() * 0.001) * 8);
      }
      setPoints(pts);
    };
    generate();
    const interval = setInterval(generate, 80);
    return () => clearInterval(interval);
  }, [delay]);

  if (points.length === 0) return null;

  const pathD = points
    .map((y, i) => `${(i / (points.length - 1)) * 280},${30 + y}`)
    .join(" L ");

  return (
    <svg viewBox="0 0 280 60" className="w-full h-8 opacity-60">
      <path d={`M ${pathD}`} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "researcher@biomedical.ac.id",
      password: "password123",
      rememberMe: true,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setAuthError(null);
    try {
      await login({
        email: values.email,
        password: values.password,
      });
      setAuthSuccess(true);
    } catch (err: any) {
      setAuthError(err.message || "Failed to sign in. Please verify your credentials.");
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Background ambient glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.03] blur-[100px] pointer-events-none" />

      {/* Main container */}
      <div
        className={`w-full max-w-[960px] rounded-2xl border border-white/[0.06] bg-[#0c1220]/80 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[560px] transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      >
        {/* Left Column: Visual Panel (Desktop Only) */}
        <div className="hidden md:flex md:col-span-5 relative flex-col justify-between p-8 overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/[0.08] via-transparent to-cyan-500/[0.05] pointer-events-none" />
          <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-blue-500/[0.06] blur-[80px] pointer-events-none" />

          {/* Top: Brand */}
          <div className="relative z-10 space-y-8">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                <Activity className="w-5 h-5" />
              </div>
              <span className="font-semibold text-white/90 tracking-tight text-sm">
                EEG Wearable Platform
              </span>
            </Link>

            <div className="space-y-3">
              <span className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-[0.2em] block">
                Biosignal Research Access
              </span>
              <h2 className="text-xl font-bold text-white leading-snug">
                IoT Wearable EEG<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  Monitoring System
                </span>
              </h2>
              <p className="text-[13px] text-slate-400 leading-relaxed max-w-[280px]">
                Stream real-time brainwave frequencies via ESP32 & TGAM1 ASIC module with cloud-based data archival.
              </p>
            </div>
          </div>

          {/* Middle: Live waveform animation */}
          <div className="relative z-10 space-y-1 my-6">
            <MiniWaveform color="#3b82f6" delay={0} />
            <MiniWaveform color="#22d3ee" delay={1.5} />
            <MiniWaveform color="#818cf8" delay={3} />
          </div>

          {/* Bottom: Feature badges */}
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span>Encrypted biosignal transmission</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span>512 Hz sampling rate acquisition</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <Radio className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <span>Real-time 5-band frequency analysis</span>
            </div>

            {/* Demo credentials hint */}
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/[0.12]">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold font-mono text-[10px] uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Demo Mode Active
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Preset credentials loaded. Click Sign In to access the research dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center border-l border-white/[0.04]">
          <div className="max-w-md w-full mx-auto space-y-6">
            {/* Mobile brand */}
            <div className="md:hidden flex items-center gap-2.5 mb-2">
              <Link href="/" className="inline-flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="font-semibold text-white/90 text-sm">EEG Wearable Platform</span>
              </Link>
            </div>

            {/* Header */}
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Welcome Back
              </h1>
              <p className="text-sm text-slate-400">
                Sign in to your EEG research dashboard.
              </p>
            </div>

            {/* Error Notification */}
            {authError && (
              <div className="p-3.5 rounded-xl bg-red-500/[0.08] border border-red-500/[0.15] text-red-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block text-red-300">Authentication Error</span>
                  <p className="text-red-400/80">{authError}</p>
                </div>
              </div>
            )}

            {/* Success State */}
            {authSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/[0.15] text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Authentication confirmed. Redirecting to dashboard...</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Institutional Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    placeholder="name@institution.ac.id"
                    className={`w-full rounded-xl border bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 transition-all focus:outline-none ${
                      errors.email
                        ? "border-red-500/40 focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20"
                        : "border-white/[0.08] focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 hover:border-white/[0.12]"
                    }`}
                    {...register("email")}
                  />
                  <Fingerprint className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                </div>
                {errors.email && <p className="text-xs text-red-400 font-medium">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`w-full rounded-xl border bg-white/[0.03] px-4 py-2.5 pr-10 text-sm text-white placeholder:text-slate-500 transition-all focus:outline-none ${
                      errors.password
                        ? "border-red-500/40 focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20"
                        : "border-white/[0.08] focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 hover:border-white/[0.12]"
                    }`}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400 font-medium">{errors.password.message}</p>}
              </div>

              {/* Remember me & Forgot */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2.5 text-slate-400 cursor-pointer select-none group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      {...register("rememberMe")}
                    />
                    <div className="w-4 h-4 rounded border border-white/[0.12] bg-white/[0.03] peer-checked:bg-blue-600 peer-checked:border-blue-500 transition-all flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <span className="group-hover:text-slate-300 transition-colors">Remember me</span>
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("In this academic evaluation phase, please sign in using the provided demo credentials.");
                  }}
                  className="text-blue-400/80 hover:text-blue-300 font-medium transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold text-sm py-2.5 px-4 transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer group"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>
            </form>

            {/* Bottom separator & register link */}
            <div className="relative flex items-center gap-4 pt-2">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <span className="text-[11px] text-slate-500 shrink-0">or</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>

            <div className="text-center text-xs text-slate-500">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                Create one →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
