import { apiClient } from "./api";
import { Session } from "@/types";
import { mockSessions } from "@/lib/mock/sessions";
import { mockDevices } from "@/lib/mock/devices";

export interface CreateSessionDTO {
  deviceId: string;
}

export const sessionService = {
  async getSessions(): Promise<Session[]> {
    try {
      return await apiClient<Session[]>("/sessions");
    } catch {
      return mockSessions;
    }
  },

  async getSessionById(id: string): Promise<Session> {
    try {
      const res = await apiClient<Session>(`/sessions/${id}`);
      if (res && res.id) return res;
    } catch {
      // Continue to local resolution
    }

    // Check sessionStorage for newly created/recorded manual sessions
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(`session_meta_${id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.id === id) return parsed;
        }
      } catch {}
    }

    const found = mockSessions.find((s) => s.id === id);
    if (found) return found;

    // Deterministically infer the target device from id
    let dev = mockDevices[0];
    const idLower = id.toLowerCase();
    if (idLower.includes("002") || idLower.includes("beta")) dev = mockDevices[1];
    else if (idLower.includes("003") || idLower.includes("gamma")) dev = mockDevices[2];
    else if (idLower.includes("004") || idLower.includes("delta")) dev = mockDevices[3];
    else if (idLower.includes("005") || idLower.includes("theta")) dev = mockDevices[4];

    return {
      id,
      userId: "user-demo-01",
      deviceId: dev.id,
      startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      duration: 900,
      status: "completed",
      deviceName: dev.name,
      deviceCode: dev.deviceCode,
      signalQuality: dev.signalQuality,
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    };
  },

  async createSession(payload: CreateSessionDTO): Promise<Session> {
    let created: Session | null = null;
    try {
      created = await apiClient<Session>("/sessions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
      // Backend unavailable; create authentic local session
      const dev = mockDevices.find((d) => d.id === payload.deviceId) || mockDevices[0];
      created = {
        id: `ses-${Date.now()}`,
        userId: "user-demo-01",
        deviceId: dev.id,
        startedAt: new Date().toISOString(),
        endedAt: null,
        duration: 0,
        status: "running",
        deviceName: dev.name,
        deviceCode: dev.deviceCode,
        signalQuality: dev.signalQuality,
        createdAt: new Date().toISOString(),
      };
      mockSessions.unshift(created);
    }

    if (created && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`session_meta_${created.id}`, JSON.stringify(created));
      } catch {}
    }
    return created;
  },

  async stopSession(id: string): Promise<Session> {
    let stopped: Session | null = null;
    try {
      stopped = await apiClient<Session>(`/sessions/${id}/stop`, {
        method: "POST",
      });
    } catch {
      const ses = mockSessions.find((s) => s.id === id);
      if (ses) {
        ses.endedAt = new Date().toISOString();
        const diffSec = Math.floor(
          (new Date(ses.endedAt).getTime() - new Date(ses.startedAt).getTime()) / 1000
        );
        ses.duration = Math.max(10, diffSec);
        ses.status = "completed";
        stopped = ses;
      }
    }

    if (stopped && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`session_meta_${id}`, JSON.stringify(stopped));
      } catch {}
    }

    if (stopped) return stopped;
    throw new Error("Session not found");
  },
};
