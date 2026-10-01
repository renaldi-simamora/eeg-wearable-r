"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/providers/AuthProvider";
import { AuthShell } from "@/components/layout/AuthShell";
import { AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

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

// Password strength indicator
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
    <div className="space-y-1 mt-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= strength ? colors[strength] : "bg-white/[0.08]"
            }`}
          />
        ))}
      </div>
      <p className={`text-[10px] font-mono ${strength <= 2 ? "text-red-400" : "text-emerald-400"}`}>
        Strength: {labels[strength]}
      </p>
    </div>
  );
}

function RegisterForm() {
  const { register: registerAuth, loginWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
      await registerAuth(
        {
          name: values.name,
          email: values.email,
          password: values.password,
          institution: values.institution,
        },
        redirectUrl
      );
      setAuthSuccess(true);
    } catch (err: any) {
      setAuthError(err.message || "Registration failed. Please try again.");
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full rounded-xl border bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-150 focus:outline-none ${
      hasError
        ? "border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20"
        : "border-white/[0.08] hover:border-white/[0.14] focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
    }`;

  return (
    <AuthShell
      title="Create Your Account"
      subtitle="Join the biosignal research platform to record, stream, and analyze EEG data."
    >
      <div className="space-y-4">
        {/* Error Notification */}
        {authError && (
          <div className="p-3.5 rounded-xl bg-red-500/[0.08] border border-red-500/[0.2] text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-red-300">Registration Error</span>
              <p className="text-red-400/90 mt-0.5">{authError}</p>
            </div>
          </div>
        )}

        {/* Success State */}
        {authSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/[0.2] text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Account created successfully. Navigating to dashboard...</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          {/* Row 1: Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Full Name
              </label>
              <input
                id="name"
                placeholder="Dr. Jane Doe"
                className={inputClass(!!errors.name)}
                {...register("name")}
              />
              {errors.name && <p className="text-xs text-red-400 font-medium">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Institutional Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="researcher@university.ac.id"
                className={inputClass(!!errors.email)}
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-red-400 font-medium">{errors.email.message}</p>}
            </div>
          </div>

          {/* Row 2: Institution */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="institution" className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Institution / Department
              </label>
              <span className="text-[11px] text-slate-500">Optional</span>
            </div>
            <input
              id="institution"
              placeholder="e.g. Dept. of Electrical & Biomedical Engineering"
              className={inputClass(!!errors.institution)}
              {...register("institution")}
            />
          </div>

          {/* Row 3: Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 chars + number"
                  className={`${inputClass(!!errors.password)} pr-10`}
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

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter password"
                  className={`${inputClass(!!errors.confirmPassword)} pr-10`}
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
              {errors.confirmPassword && (
                <p className="text-xs text-red-400 font-medium">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {/* Terms checkbox */}
          <div className="space-y-1 pt-1">
            <label className="flex items-start gap-2.5 text-xs text-slate-400 cursor-pointer select-none group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  {...register("agreeTerms")}
                />
                <div className="w-4 h-4 rounded border border-white/[0.14] bg-white/[0.03] peer-checked:bg-blue-600 peer-checked:border-blue-500 transition-all flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <span className="group-hover:text-slate-300 transition-colors leading-relaxed">
                I agree to the terms of use and ethical biosignal acquisition guidelines.
              </span>
            </label>
            {errors.agreeTerms && (
              <p className="text-xs text-red-400 font-medium pl-6">{errors.agreeTerms.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold text-sm py-2.5 px-4 mt-1 transition-all duration-200 shadow-lg shadow-blue-600/25 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer group"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Create Research Account</span>
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
            or register with
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
                  setAuthError(err.message || "Failed to register with Google.");
                }
              }
            }}
            onError={() => {
              setAuthError("Google Sign-In was cancelled or failed.");
            }}
            theme="filled_black"
            shape="pill"
            text="signup_with"
            size="large"
            width="340"
          />
        </div>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-500 pt-1">
          Already have an account?{" "}
          <Link
            href={`/login${redirectUrl !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`}
            className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
          >
            Sign in →
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-400 text-xs font-mono">
          Loading registration workspace...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
