import { apiClient } from "./api";
import { User } from "@/types";

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  institution?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: User;
}

function setAuthTokenCookie(token: string) {
  if (typeof document !== "undefined") {
    document.cookie = `eeg_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
  }
}

function clearAuthTokenCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "eeg_auth_token=; path=/; max-age=0; SameSite=Lax";
  }
}

export const authService = {
  async register(payload: RegisterDTO): Promise<AuthResult> {
    try {
      const res = await apiClient<AuthResult>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res && res.token) {
        localStorage.setItem("eeg_auth_token", res.token);
        localStorage.setItem("eeg_user", JSON.stringify(res.user));
        setAuthTokenCookie(res.token);
      }
      return res;
    } catch (err: any) {
      // Offline fallback demonstration if backend API is not running
      if (err.message.includes("Network connection failed") || err.message.includes("Failed to fetch")) {
        const mockUser: User = {
          id: "user-demo-01",
          name: payload.name,
          email: payload.email,
          role: "researcher",
          institution: payload.institution || "Biomedical Engineering Laboratory",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const mockResult: AuthResult = {
          token: "mock-jwt-token-demo",
          user: mockUser,
        };
        localStorage.setItem("eeg_auth_token", mockResult.token);
        localStorage.setItem("eeg_user", JSON.stringify(mockResult.user));
        setAuthTokenCookie(mockResult.token);
        return mockResult;
      }
      throw err;
    }
  },

  async login(payload: LoginDTO): Promise<AuthResult> {
    try {
      const res = await apiClient<AuthResult>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res && res.token) {
        localStorage.setItem("eeg_auth_token", res.token);
        localStorage.setItem("eeg_user", JSON.stringify(res.user));
        setAuthTokenCookie(res.token);
      }
      return res;
    } catch (err: any) {
      if (err.message.includes("Network connection failed") || err.message.includes("Failed to fetch")) {
        const mockUser: User = {
          id: "user-demo-01",
          name: "Dr. Researcher",
          email: payload.email,
          role: "researcher",
          institution: "Biomedical Engineering Laboratory",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const mockResult: AuthResult = {
          token: "mock-jwt-token-demo",
          user: mockUser,
        };
        localStorage.setItem("eeg_auth_token", mockResult.token);
        localStorage.setItem("eeg_user", JSON.stringify(mockResult.user));
        setAuthTokenCookie(mockResult.token);
        return mockResult;
      }
      throw err;
    }
  },

  async loginWithGoogle(credential: string): Promise<AuthResult> {
    const res = await apiClient<AuthResult>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
    if (res && res.token) {
      localStorage.setItem("eeg_auth_token", res.token);
      localStorage.setItem("eeg_user", JSON.stringify(res.user));
      setAuthTokenCookie(res.token);
    }
    return res;
  },

  async logout(): Promise<void> {
    try {
      await apiClient("/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("eeg_auth_token");
        localStorage.removeItem("eeg_user");
      }
      clearAuthTokenCookie();
    }
  },

  async getMe(): Promise<User> {
    return apiClient<User>("/auth/me");
  },

  getStoredUser(): User | null {
    if (typeof window === "undefined") return null;
    const str = localStorage.getItem("eeg_user");
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("eeg_auth_token");
  },
};
