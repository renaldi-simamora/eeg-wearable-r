"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/providers/AuthProvider";
import { Activity, AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff, ShieldCheck, Cpu, Database } from "lucide-react";

const registerSchema = z
  .object({
    name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Please enter a valid institutional email"),
    institution: z.string().optional(),
    password: z
      .string()
      .min(6, "Password must contain at least 6 characters")
      .regex(/[0-9]/, "Password must include at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    agreeTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms of use",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// Password strength meter
function PasswordStrength({ password }: { password: string }) {
  const getStrength = () => {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getStrength();
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Excellent"];
  const colors = ["", "bg-red-500", "bg-orange-500", "bg-amber-400", "bg-emerald-400", "bg-cyan-400"];

  if (!password) return null;

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= strength ? colors[strength] : "bg-white/[0.06]"
            }`}
          />
        ))}
      </div>
      <p className={`text-[10px] font-mono ${strength <= 2 ? "text-red-400/70" : "text-emerald-400/70"}`}>
        {labels[strength]}
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const { register: registerAuth } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      institution: "Biomedical Engineering Laboratory",
      password: "",
      confirmPassword: "",
    },
  });

  const watchPassword = watch("password", "");

  const onSubmit = async (values: RegisterFormValues) => {
    setAuthError(null);
    try {
      await registerAuth({
        name: values.name,
        email: values.email,
        password: values.password,
        institution: values.institution,
      });
      setAuthSuccess(true);
    } catch (err: any) {
      setAuthError(err.message || "Registration failed. Please try again.");
    }
  };

  // Input field builder
  const inputClasses = (hasError: boolean) =>
    `w-full rounded-xl border bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 transition-all focus:outline-none ${
      hasError
        ? "border-red-500/40 focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20"
        : "border-white/[0.08] focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 hover:border-white/[0.12]"
    }`;

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-600/[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.03] blur-[100px] pointer-events-none" />

      {/* Main container */}
      <div
        className={`w-full max-w-[580px] rounded-2xl border border-white/[0.06] bg-[#0c1220]/80 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="p-6 sm:p-10 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                <Activity className="w-5 h-5" />
              </div>
              <span className="font-semibold text-white/90 tracking-tight text-sm">
                EEG Wearable Platform
              </span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Create Your Account
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                Join the biosignal research platform to record, stream, and analyze EEG data.
              </p>
            </div>
          </div>

          {/* Platform feature chips */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { icon: Cpu, label: "ESP32 + TGAM1" },
              { icon: Database, label: "PostgreSQL Archive" },
              { icon: ShieldCheck, label: "Encrypted Stream" },
            ].map((chip) => (
              <div
                key={chip.label}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] text-slate-400 font-mono"
              >
                <chip.icon className="w-3 h-3 text-slate-500" />
                {chip.label}
              </div>
            ))}
          </div>

          {/* Error Notification */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-red-500/[0.08] border border-red-500/[0.15] text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold block text-red-300">Registration Error</span>
                <p className="text-red-400/80">{authError}</p>
              </div>
            </div>
          )}

          {/* Success State */}
          {authSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/[0.15] text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Account created successfully. Navigating to dashboard...</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Full Name
              </label>
              <input
                id="name"
                placeholder="e.g. Dr. Jane Doe"
                className={inputClasses(!!errors.name)}
                {...register("name")}
              />
              {errors.name && <p className="text-xs text-red-400 font-medium">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Institutional Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="researcher@university.ac.id"
                className={inputClasses(!!errors.email)}
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-red-400 font-medium">{errors.email.message}</p>}
            </div>

            {/* Institution */}
            <div className="space-y-2">
              <label htmlFor="institution" className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Institution / Organization
                <span className="text-slate-600 normal-case tracking-normal ml-1">(Optional)</span>
              </label>
              <input
                id="institution"
                placeholder="e.g. Dept. of Electrical Engineering"
                className={inputClasses(!!errors.institution)}
                {...register("institution")}
              />
            </div>

            {/* Password Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="password" className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 chars + number"
                    className={`${inputClasses(!!errors.password)} pr-10`}
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
                <PasswordStrength password={watchPassword} />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter password"
                    className={`${inputClasses(!!errors.confirmPassword)} pr-10`}
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-400 font-medium">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="space-y-1.5 pt-1">
              <label className="flex items-start gap-3 text-xs text-slate-400 cursor-pointer select-none group">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    {...register("agreeTerms")}
                  />
                  <div className="w-4 h-4 rounded border border-white/[0.12] bg-white/[0.03] peer-checked:bg-blue-600 peer-checked:border-blue-500 transition-all flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="group-hover:text-slate-300 transition-colors leading-relaxed">
                  I agree to the terms of use and ethical biosignal data acquisition guidelines for this research platform.
                </span>
              </label>
              {errors.agreeTerms && (
                <p className="text-xs text-red-400 font-medium pl-7">{errors.agreeTerms.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold text-sm py-2.5 px-4 mt-2 transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer group"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </button>
          </form>

          {/* Bottom separator & login link */}
          <div className="relative flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            <span className="text-[11px] text-slate-500 shrink-0">or</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          </div>

          <div className="text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
            >
              Sign in →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
