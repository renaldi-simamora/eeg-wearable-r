"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/types";
import { authService, LoginDTO, RegisterDTO } from "@/services/auth.service";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginDTO) => Promise<void>;
  register: (data: RegisterDTO) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check initial user in localStorage or initialize demo researcher
    const storedUser = authService.getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    } else {
      // Create initial local researcher profile for seamless out-of-the-box exploration
      const defaultUser: User = {
        id: "usr-researcher-01",
        name: "Dr. Renaldi Simamora",
        email: "researcher@biomedical.ac.id",
        role: "researcher",
        institution: "Dept. of Electrical & Biomedical Engineering",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUser(defaultUser);
      localStorage.setItem("eeg_user", JSON.stringify(defaultUser));
      localStorage.setItem("eeg_auth_token", "default-dev-token");
    }
    setIsLoading(false);
  }, []);

  const login = async (data: LoginDTO) => {
    setIsLoading(true);
    try {
      const res = await authService.login(data);
      setUser(res.user);
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterDTO) => {
    setIsLoading(true);
    try {
      const res = await authService.register(data);
      setUser(res.user);
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    router.push("/login");
  };

  const updateUser = (u: User) => {
    setUser(u);
    localStorage.setItem("eeg_user", JSON.stringify(u));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
