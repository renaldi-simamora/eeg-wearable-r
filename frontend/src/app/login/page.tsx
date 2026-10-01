"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/providers/AuthProvider";
import { AuthShell } from "@/components/layout/AuthShell";
import { AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff, Fingerprint, Lock } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid academic/institutional email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const { login, loginWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      await login(
        {
          email: values.email,
          password: values.password,
        },
        redirectUrl
      );
      setAuthSuccess(true);
    } catch (err: any) {
      setAuthError(err.message || "Failed to sign in. Please verify your credentials.");
    }
  };

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Sign in to your EEG research dashboard to monitor sessions and data."
    >
      <div className="space-y-5">
        {/* Demo credentials banner */}
        <div className="p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/[0.16] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px] font-semibold text-emerald-400 uppercase tracking-wide">
              Demo Credentials Loaded
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">researcher / pass</span>
        </div>

        {/* Error Notification */}
        {authError && (
          <div className="p-3.5 rounded-xl bg-red-500/[0.08] border border-red-500/[0.2] text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-red-300">Authentication Error</span>
              <p className="text-red-400/90 mt-0.5">{authError}</p>
            </div>
          </div>
        )}

        {/* Success State */}
        {authSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/[0.2] text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Credentials confirmed. Redirecting to research dashboard...</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Institutional Email
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                placeholder="name@institution.ac.id"
                className={`w-full rounded-xl border bg-white/[0.03] px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-150 focus:outline-none ${
                  errors.email
                    ? "border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20"
                    : "border-white/[0.08] hover:border-white/[0.14] focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                }`}
                {...register("email")}
              />
              <Fingerprint className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
            {errors.email && <p className="text-xs text-red-400 font-medium">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={`w-full rounded-xl border bg-white/[0.03] px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-150 focus:outline-none ${
                  errors.password
                    ? "border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20"
                    : "border-white/[0.08] hover:border-white/[0.14] focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                }`}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400 font-medium">{errors.password.message}</p>}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <label className="flex items-center gap-2.5 text-slate-400 cursor-pointer select-none group">
              <div className="relative">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  {...register("rememberMe")}
                />
                <div className="w-4 h-4 rounded border border-white/[0.14] bg-white/[0.03] peer-checked:bg-blue-600 peer-checked:border-blue-500 transition-all flex items-center justify-center">
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
                alert("Demo phase: please sign in using the provided demo credentials.");
              }}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Forgot password?
            </a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold text-sm py-2.5 px-4 transition-all duration-200 shadow-lg shadow-blue-600/25 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer group"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center gap-4 pt-1">
          <div className="flex-1 h-px bg-white/[0.08]" />
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            or continue with
          </span>
          <div className="flex-1 h-px bg-white/[0.08]" />
        </div>

        {/* Google Sign In */}
        <div className="flex justify-center w-full">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              if (credentialResponse.credential) {
                setAuthError(null);
                try {
                  await loginWithGoogle(credentialResponse.credential, redirectUrl);
                  setAuthSuccess(true);
                } catch (err: any) {
                  setAuthError(err.message || "Failed to sign in with Google.");
                }
              }
            }}
            onError={() => {
              setAuthError("Google Sign-In was cancelled or failed.");
            }}
            theme="filled_black"
            shape="pill"
            text="signin_with"
            size="large"
            width="340"
          />
        </div>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-500 pt-1">
          Don't have an account?{" "}
          <Link
            href={`/register${redirectUrl !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`}
            className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
          >
            Create one →
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-400 text-xs font-mono">
          Loading authentication workspace...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
