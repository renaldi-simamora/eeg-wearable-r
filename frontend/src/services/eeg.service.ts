import { apiClient } from "./api";
import { EEGSample, BrainwaveFeature } from "@/types";
import { generateMockEEGSeries, mockBrainwaveFeature } from "@/lib/mock/eeg";

export interface EEGSessionData {
  sessionId: string;
  samples: EEGSample[];
  features: BrainwaveFeature[];
  latestFeature: BrainwaveFeature;
}

export const eegService = {
  async getEEGData(sessionId: string): Promise<EEGSessionData> {
    try {
      return await apiClient<EEGSessionData>(`/eeg/${sessionId}`);
    } catch {
      return {
        sessionId,
        samples: generateMockEEGSeries(80),
        features: [mockBrainwaveFeature],
        latestFeature: mockBrainwaveFeature,
      };
    }
  },
};
