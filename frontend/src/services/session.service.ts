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
      return await apiClient<Session>(`/sessions/${id}`);
    } catch {
      const found = mockSessions.find((s) => s.id === id);
      if (found) return found;
      return mockSessions[0];
    }
  },

  async createSession(payload: CreateSessionDTO): Promise<Session> {
    try {
      return await apiClient<Session>("/sessions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
      const dev = mockDevices.find((d) => d.id === payload.deviceId) || mockDevices[0];
      const newSession: Session = {
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
      mockSessions.unshift(newSession);
      return newSession;
    }
  },

  async stopSession(id: string): Promise<Session> {
    try {
      return await apiClient<Session>(`/sessions/${id}/stop`, {
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
        return ses;
      }
      throw new Error("Session not found");
    }
  },
};
