import { EEGSample, BrainwaveFeature } from "@/types";

export function generateMockEEGSeries(count: number = 80, freq: number = 10): EEGSample[] {
  const samples: EEGSample[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const t = i * 0.05;
    // Synthesis based on target principal frequency
    const primaryWave = 22 * Math.sin(2 * Math.PI * freq * t);
    const subWave = 10 * Math.sin(2 * Math.PI * (freq * 0.5) * t);
    const slowWave = 6 * Math.sin(2 * Math.PI * 2 * t);
    const noise = (Math.random() - 0.5) * 5;
    const rawEEG = Math.round((primaryWave + subWave + slowWave + noise) * 100) / 100;

    samples.push({
      timestamp: now - (count - i) * 50,
      rawEEG,
      signalQuality: 90 + Math.floor(Math.random() * 8),
    });
  }
  return samples;
}

export const mockAlphaFeature: BrainwaveFeature = {
  delta: 13.5,
  theta: 17.2,
  alpha: 42.6, // Alpha dominant (relaxed wakefulness)
  beta: 18.9,
  gamma: 7.8,
};

export const mockBetaFeature: BrainwaveFeature = {
  delta: 11.2,
  theta: 15.1,
  alpha: 20.8,
  beta: 39.5, // Beta dominant (active cognitive focus)
  gamma: 13.4,
};

export const mockThetaFeature: BrainwaveFeature = {
  delta: 22.4,
  theta: 41.8, // Theta dominant (drowsiness/meditation)
  alpha: 19.2,
  beta: 11.6,
  gamma: 5.0,
};

export const mockDeltaFeature: BrainwaveFeature = {
  delta: 44.5, // Delta dominant (deep rest)
  theta: 23.8,
  alpha: 15.2,
  beta: 10.7,
  gamma: 5.8,
};

export function getMockFeatureForSession(sessionId: string): BrainwaveFeature {
  if (sessionId.includes("002") || sessionId.includes("focus")) {
    return mockBetaFeature;
  }
  if (sessionId.includes("003") || sessionId.includes("theta") || sessionId.includes("drowsy")) {
    return mockThetaFeature;
  }
  if (sessionId.includes("004") || sessionId.includes("delta") || sessionId.includes("rest")) {
    return mockDeltaFeature;
  }
  return mockAlphaFeature;
}

// Backwards compatibility
export const mockBrainwaveFeature: BrainwaveFeature = mockAlphaFeature;

export const eegBandInfo = [
  {
    name: "Delta",
    range: "0.5 – 4 Hz",
    color: "#3b82f6", // Blue
    description: "Dominates in deep non-REM restorative sleep states and high-amplitude slow oscillations.",
  },
  {
    name: "Theta",
    range: "4 – 8 Hz",
    color: "#06b6d4", // Cyan
    description: "Associated with drowsiness, inward meditative focus, memory encoding, and light sleep.",
  },
  {
    name: "Alpha",
    range: "8 – 13 Hz",
    color: "#10b981", // Emerald
    description: "Occurs during calm, relaxed wakefulness with eyes closed; primary posterior dominant rhythm.",
  },
  {
    name: "Beta",
    range: "13 – 30 Hz",
    color: "#f59e0b", // Amber
    description: "Prevalent during active, alert cognitive engagement, problem solving, and analytical focus.",
  },
  {
    name: "Gamma",
    range: "30 – 50 Hz",
    color: "#8b5cf6", // Purple
    description: "Involved in simultaneous processing of information across disparate cortical brain networks.",
  },
];
