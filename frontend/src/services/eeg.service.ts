import { apiClient } from "./api";
import { EEGSample, BrainwaveFeature } from "@/types";

export interface EEGSessionData {
  sessionId: string;
  samples: EEGSample[];
  features: BrainwaveFeature[];
  latestFeature?: BrainwaveFeature;
}

export const eegService = {
  async getEEGData(sessionId: string): Promise<EEGSessionData> {
    try {
      const data = await apiClient<EEGSessionData>(`/eeg/${sessionId}`);
      return {
        sessionId: data.sessionId || sessionId,
        samples: data.samples || [],
        features: data.features || [],
        latestFeature: data.latestFeature,
      };
    } catch {
      return {
        sessionId,
        samples: [],
        features: [],
      };
    }
  },

  async postEEGData(payload: {
    sessionId: string;
    samples: EEGSample[];
    features?: BrainwaveFeature;
  }): Promise<void> {
    await apiClient("/eeg/data", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
