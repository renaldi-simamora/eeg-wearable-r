import { DashboardSummary } from "@/types";
import { mockDevices } from "./devices";
import { mockSessions } from "./sessions";
import { mockBrainwaveFeature } from "./eeg";

export const mockDashboardSummary: DashboardSummary = {
  deviceStatus: "Connected",
  signalQuality: "Good",
  signalQualityValue: 94,
  totalSessions: mockSessions.length,
  latestSessionDuration: "15m 00s",
  latestDurationSeconds: 900,
  averageDuration: "17m 10s",
  latestClassification: "Not available yet", // Strictly adheres to scientific specification
  activeDevice: mockDevices[0],
  recentSessions: mockSessions.slice(0, 4),
  brainwaveOverview: mockBrainwaveFeature,
  deviceHealth: {
    eegModuleStatus: "Operational (TGAM1 ASIC)",
    esp32Status: "Online (FreeRTOS Core 1)",
    wifiStatus: "Connected (RSSI -58 dBm, 2.4 GHz)",
    batteryLevel: 88,
    signalQuality: 94,
    lastSync: new Date().toISOString(),
  },
};
