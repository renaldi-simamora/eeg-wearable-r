import { apiClient } from "./api";
import { Device } from "@/types";
import { mockDevices } from "@/lib/mock/devices";

export interface CreateDeviceDTO {
  deviceCode: string;
  name: string;
  firmwareVersion?: string;
}

export interface UpdateDeviceDTO {
  name?: string;
  status?: string;
  batteryLevel?: number;
  signalQuality?: number;
}

export const deviceService = {
  async getDevices(): Promise<Device[]> {
    try {
      return await apiClient<Device[]>("/devices");
    } catch {
      return mockDevices;
    }
  },

  async getDeviceById(id: string): Promise<Device> {
    try {
      return await apiClient<Device>(`/devices/${id}`);
    } catch {
      const found = mockDevices.find((d) => d.id === id);
      if (found) return found;
      return mockDevices[0];
    }
  },

  async createDevice(payload: CreateDeviceDTO): Promise<Device> {
    try {
      return await apiClient<Device>("/devices", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
      const newDev: Device = {
        id: `dev-${Date.now()}`,
        deviceCode: payload.deviceCode,
        name: payload.name,
        status: "connected",
        batteryLevel: 100,
        signalQuality: 96,
        firmwareVersion: payload.firmwareVersion || "v1.2.0-esp32",
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      mockDevices.push(newDev);
      return newDev;
    }
  },

  async updateDevice(id: string, payload: UpdateDeviceDTO): Promise<Device> {
    try {
      return await apiClient<Device>(`/devices/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } catch {
      const idx = mockDevices.findIndex((d) => d.id === id);
      if (idx !== -1) {
        mockDevices[idx] = {
          ...mockDevices[idx],
          ...payload,
          status: (payload.status as any) || mockDevices[idx].status,
          lastSeen: new Date().toISOString(),
        };
        return mockDevices[idx];
      }
      throw new Error("Device not found");
    }
  },

  async deleteDevice(id: string): Promise<void> {
    try {
      await apiClient(`/devices/${id}`, { method: "DELETE" });
    } catch {
      const idx = mockDevices.findIndex((d) => d.id === id);
      if (idx !== -1) {
        mockDevices.splice(idx, 1);
      }
    }
  },
};
