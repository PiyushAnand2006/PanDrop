/** Format seconds as a mono timecode: 63.42 -> "01:03.4" */
export function formatTimecode(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${String(m).padStart(2, "0")}:${rest.toFixed(1).padStart(4, "0")}`;
}

/** Format seconds as a short marker label: 63.42 -> "1:03" */
export function formatShortTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Pad a bbox [x1, y1, x2, y2] into a readable readout string. */
export function bboxReadout(bbox: [number, number, number, number]): string {
  const [x1, y1, x2, y2] = bbox;
  return `[${x1},${y1} → ${x2},${y2}] · ${Math.max(0, x2 - x1)}×${Math.max(0, y2 - y1)}px`;
}

/** Condition score → semantic tone. */
export function scoreTone(score: number): "high" | "mid" | "low" {
  if (score >= 9) return "high";
  if (score >= 7.5) return "mid";
  return "low";
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
