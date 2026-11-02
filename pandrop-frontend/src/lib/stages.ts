/** Canonical pipeline stages shown during processing (demo = accelerated). */
export interface Stage {
  key: string;
  label: string;
  detail: string;
  /** Relative weight for the progress bar. */
  ms: number;
}

export const STAGES: Stage[] = [
  { key: "ingest", label: "Ingest video", detail: "ffprobe · frame index", ms: 550 },
  { key: "audio", label: "Extract audio track", detail: "ffmpeg → wav 16 kHz mono", ms: 450 },
  { key: "asr", label: "Transcribe speech", detail: "Whisper STT · word timestamps", ms: 850 },
  { key: "intent", label: "Parse item intents", detail: "LLM · name / price / condition", ms: 750 },
  { key: "sam", label: "SAM 3.1 segmentation", detail: "point prompt → mask → cutout", ms: 1000 },
  { key: "composite", label: "Studio compositing", detail: "spotlight scene → price tag burn-in", ms: 900 },
];

export const STAGE_TOTAL_MS = STAGES.reduce((a, s) => a + s.ms, 0);
