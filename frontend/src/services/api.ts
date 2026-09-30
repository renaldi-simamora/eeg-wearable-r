import { config } from "@/config";
import { ApiResponse } from "@/types";

export class ApiError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("eeg_auth_token");
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${config.apiUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data: ApiResponse<T> = await res.json().catch(() => ({
      success: false,
      error: `Server responded with status ${res.status}`,
    }));

    if (!res.ok) {
      if (res.status === 401 && typeof window !== "undefined") {
        // Handle unauthorized token expiry
        // Do not redirect on public routes
        if (!window.location.pathname.startsWith("/login") && window.location.pathname !== "/") {
          localStorage.removeItem("eeg_auth_token");
          localStorage.removeItem("eeg_user");
        }
      }
      throw new ApiError(data.error || `HTTP error ${res.status}`, res.status);
    }

    if (!data.success && data.error) {
      throw new ApiError(data.error);
    }

    return (data.data !== undefined ? data.data : (data as unknown)) as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || "Network connection failed");
  }
}
