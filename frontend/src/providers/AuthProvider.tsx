"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/types";
import { authService, LoginDTO, RegisterDTO } from "@/services/auth.service";
import { useRouter } from "next/navigation";
import { GoogleOAuthProvider } from "@react-oauth/google";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginDTO, redirectUrl?: string) => Promise<void>;
  register: (data: RegisterDTO, redirectUrl?: string) => Promise<void>;
  loginWithGoogle: (credential: string, redirectUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check initial user in localStorage without auto-seeding mock credentials
    const storedUser = authService.getStoredUser();
    const storedToken = typeof window !== "undefined" ? localStorage.getItem("eeg_auth_token") : null;

    if (storedUser && storedToken) {
      setUser(storedUser);
      // Synchronize cookie for server-side Next.js route protection
      document.cookie = `eeg_auth_token=${encodeURIComponent(storedToken)}; path=/; max-age=604800; SameSite=Lax`;
    } else {
      setUser(null);
      if (typeof document !== "undefined") {
        document.cookie = "eeg_auth_token=; path=/; max-age=0; SameSite=Lax";
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (data: LoginDTO, redirectUrl?: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login(data);
      setUser(res.user);
      if (typeof document !== "undefined" && res.token) {
        document.cookie = `eeg_auth_token=${encodeURIComponent(res.token)}; path=/; max-age=604800; SameSite=Lax`;
      }
      const target = redirectUrl && redirectUrl.startsWith("/") && !redirectUrl.startsWith("/login")
        ? redirectUrl
        : "/dashboard";
      router.push(target);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterDTO, redirectUrl?: string) => {
    setIsLoading(true);
    try {
      const res = await authService.register(data);
      setUser(res.user);
      if (typeof document !== "undefined" && res.token) {
        document.cookie = `eeg_auth_token=${encodeURIComponent(res.token)}; path=/; max-age=604800; SameSite=Lax`;
      }
      const target = redirectUrl && redirectUrl.startsWith("/") && !redirectUrl.startsWith("/login")
        ? redirectUrl
        : "/dashboard";
      router.push(target);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (credential: string, redirectUrl?: string) => {
    setIsLoading(true);
    try {
      const res = await authService.loginWithGoogle(credential);
      setUser(res.user);
      if (typeof document !== "undefined" && res.token) {
        document.cookie = `eeg_auth_token=${encodeURIComponent(res.token)}; path=/; max-age=604800; SameSite=Lax`;
      }
      const target = redirectUrl && redirectUrl.startsWith("/") && !redirectUrl.startsWith("/login")
        ? redirectUrl
        : "/dashboard";
      router.push(target);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      if (typeof document !== "undefined") {
        document.cookie = "eeg_auth_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem("eeg_auth_token");
        localStorage.removeItem("eeg_user");
        localStorage.clear();
        sessionStorage.clear();
        // Redirect directly to public landing page ("/") with hard navigation so all cache/state is cleanly wiped
        window.location.href = "/";
      }
    }
  };

  const updateUser = (u: User) => {
    setUser(u);
    localStorage.setItem("eeg_user", JSON.stringify(u));
  };

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "524835681476-cnvohi484a5tk54koattq2sd4rbl3u9f.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthContext.Provider
        value={{
          user,
          isAuthenticated: !!user,
          isLoading,
          login,
          register,
          loginWithGoogle,
          logout,
          updateUser,
        }}
      >
        {children}
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
