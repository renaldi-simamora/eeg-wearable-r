import { EEGSample, BrainwaveFeature } from "@/types";

export function generateMockEEGSeries(count: number = 80): EEGSample[] {
  const samples: EEGSample[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const t = i * 0.05;
    // Synthesis of rhythmic Alpha (10Hz), Theta (6Hz), and micro-noise
    const alphaWave = 22 * Math.sin(2 * Math.PI * 10 * t);
    const thetaWave = 12 * Math.sin(2 * Math.PI * 6 * t);
    const deltaWave = 8 * Math.sin(2 * Math.PI * 2 * t);
    const noise = (Math.random() - 0.5) * 6;
    const rawEEG = Math.round((alphaWave + thetaWave + deltaWave + noise) * 100) / 100;

    samples.push({
      timestamp: now - (count - i) * 50,
      rawEEG,
      signalQuality: 90 + Math.floor(Math.random() * 8),
    });
  }
  return samples;
}

export const mockBrainwaveFeature: BrainwaveFeature = {
  delta: 16.5, // 0.5 - 4 Hz
  theta: 22.1, // 4 - 8 Hz
  alpha: 38.4, // 8 - 13 Hz (relaxed alertness / resting state)
  beta: 16.8,  // 13 - 30 Hz (active thinking)
  gamma: 6.2,  // 30 - 50 Hz (cognitive integration)
};

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
