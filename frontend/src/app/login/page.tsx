"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/providers/AuthProvider";
import { AuthShell } from "@/components/layout/AuthShell";
import { AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff, Fingerprint } from "lucide-react";

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
      email: "",
      password: "",
      rememberMe: false,
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

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle("demo-google-oauth-credential", redirectUrl);
      setAuthSuccess(true);
    } catch (err: any) {
      setAuthError(err.message || "Google Sign-In is unavailable in local testing without verified OAuth origin.");
    }
  };

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Sign in to your EEG research dashboard to monitor sessions and data."
    >
      <div className="space-y-4">

        {/* Error Notification */}
        {authError && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-start gap-2.5" role="alert">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-semibold block text-red-100">Authentication Error</span>
              <p className="text-red-300 mt-0.5">{authError}</p>
            </div>
          </div>
        )}

        {/* Success State */}
        {authSuccess && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs flex items-center gap-2.5" role="status">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>Credentials confirmed. Redirecting to research dashboard...</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Institutional Email
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder=""
                className={`w-full rounded-lg border bg-slate-950/80 px-3.5 py-2 pr-10 text-sm text-slate-100 placeholder:text-slate-500 transition-colors duration-150 focus:outline-none ${
                  errors.email
                    ? "border-red-500/60 focus:border-red-500/80 focus:ring-2 focus:ring-red-500/20"
                    : "border-slate-800 hover:border-slate-700 focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/20"
                }`}
                {...register("email")}
              />
              <Fingerprint className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" aria-hidden="true" />
            </div>
            {errors.email && <p className="text-xs text-red-400 font-medium">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder=""
                className={`w-full rounded-lg border bg-slate-950/80 px-3.5 py-2 pr-10 text-sm text-slate-100 placeholder:text-slate-500 transition-colors duration-150 focus:outline-none ${
                  errors.password
                    ? "border-red-500/60 focus:border-red-500/80 focus:ring-2 focus:ring-red-500/20"
                    : "border-slate-800 hover:border-slate-700 focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/20"
                }`}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400 font-medium">{errors.password.message}</p>}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <label htmlFor="rememberMe" className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
              <input
                id="rememberMe"
                type="checkbox"
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-[#070b14]"
                aria-label="Remember me"
                {...register("rememberMe")}
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => {
                alert("Please contact your laboratory administrator to reset your research credentials.");
              }}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors bg-transparent border-0 p-0 cursor-pointer text-xs"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2 px-4 transition-colors duration-150 border border-blue-500/60 shadow-sm disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-label="Loading..." />
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center gap-4 pt-1" aria-hidden="true">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-medium">
            or continue with
          </span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Google Sign In */}
        <div className="flex justify-center w-full">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            aria-label="Sign in with Google"
            className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800/80 text-slate-200 py-2 px-4 text-xs font-medium transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-400 pt-1">
          Don't have an account?{" "}
          <Link
            href={`/register${redirectUrl !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`}
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
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
