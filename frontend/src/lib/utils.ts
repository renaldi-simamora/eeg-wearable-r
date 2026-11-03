import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Formats TGAM1 ThinkGear byte 0x02 Poor Signal Quality metric.
 * 0 = Good Contact (optimal skin-electrode contact, minimal noise)
 * 1-199 = Poor Signal / Noise Level (higher value indicates higher noise artifact)
 * 200 = Lead-off (electrodes completely off skin)
 * null / undefined = Not Available (telemetry unreceived or device offline)
 */
export function formatSignalQuality(quality: number | null | undefined): string {
  if (quality === null || quality === undefined) {
    return "Not Available";
  }
  if (quality >= 200) {
    return "Lead-off";
  }
  if (quality === 0) {
    return "Good Contact";
  }
  return `Noise Level ${quality}/200`;
}
