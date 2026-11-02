import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { JobResponse, ShowcaseItem } from "../types/pandrop";
import { resolveAssetUrl } from "../lib/api";
import { formatShortTime, formatTimecode } from "../lib/format";

export interface SeekRequest {
  t: number;
  nonce: number;
}

export default function VideoPanel({
  job,
  isDemo,
  activeItem,
  seekReq,
  onTime,
}: {
  job: JobResponse;
  isDemo: boolean;
  activeItem: ShowcaseItem | null;
  seekReq: SeekRequest;
  onTime: (t: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [nativeDuration, setNativeDuration] = useState(0);
  const duration = nativeDuration || job.duration_sec;

  /* report time upward (throttled to 1/10s) */
  useEffect(() => {
    onTime(Math.round(time * 10) / 10);
  }, [time, onTime]);

  /* external seeks (marker / card clicks) */
  useEffect(() => {
    if (!seekReq.nonce) return;
    seek(seekReq.t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekReq.nonce]);

  const seek = useCallback(
    (t: number) => {
      const clamped = Math.min(Math.max(0, t), duration || 0);
      if (videoRef.current) {
        videoRef.current.currentTime = clamped;
      }
      setTime(clamped);
    },
    [duration],
  );

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => setFailed(true));
    else v.pause();
  };

  const onTrackPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || duration <= 0) return;
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    seek(frac * duration);
  };

  const frac = duration > 0 ? time / duration : 0;

  return (
    <div className="ring-glow glass overflow-hidden rounded-3xl">
      {/* ---------------- screen ---------------- */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {failed ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <p className="font-display text-[14px] font-semibold text-dim">
                Source video can't play in this browser
              </p>
              <p className="mt-1.5 text-[13px] text-mute">
                Everything below was already rendered — it's all still live.
              </p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              src={resolveAssetUrl(job.video_url)}
              poster={job.items[0] ? resolveAssetUrl(job.items[0].assets.raw_frame_url) : undefined}
              className="absolute inset-0 h-full w-full object-contain"
              playsInline
              preload="metadata"
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onLoadedMetadata={(e) => setNativeDuration(e.currentTarget.duration || 0)}
              onError={() => setFailed(true)}
              onClick={togglePlay}
            />
            {!playing && (
              <button
                onClick={togglePlay}
                aria-label="Play video"
                className="group absolute inset-0 grid place-items-center bg-black/25"
              >
                <span className="brand-gradient grid h-16 w-16 place-items-center rounded-full text-white shadow-glow-pink transition-transform duration-200 group-hover:scale-110">
                  <Play size={26} className="ml-1" />
                </span>
              </button>
            )}
          </>
        )}

        {/* demo / live badge */}
        <span className="pointer-events-none absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] font-bold text-white/90 backdrop-blur-sm">
          <span
            className={`h-1.5 w-1.5 rounded-full ${isDemo ? "bg-gold" : "bg-mint"} ${
              playing ? "anim-pulse-dot" : ""
            }`}
          />
          {isDemo ? "Sample clip" : "Your video"}
        </span>
        <span className="pointer-events-none absolute right-3 bottom-3 rounded-lg bg-black/60 px-2 py-1 font-mono text-[11px] font-semibold text-white/90 backdrop-blur-sm tabular-nums">
          T+{formatTimecode(time)}
        </span>
      </div>

      {/* ---------------- transport ---------------- */}
      <div className="flex items-center gap-3 border-t border-line px-4 py-3">
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="brand-gradient grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl text-white shadow-glow-pink transition-transform duration-150 active:scale-95"
        >
          {playing ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
        </button>

        <span className="shrink-0 font-mono text-[12px] font-semibold text-dim tabular-nums">
          {formatTimecode(time)}{" "}
          <span className="text-faint">/ {formatShortTime(duration)}</span>
        </span>

        {/* scrub track + item markers */}
        <div
          ref={trackRef}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration * 10) / 10}
          aria-valuenow={Math.round(time * 10) / 10}
          tabIndex={0}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            onTrackPointer(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons & 1) onTrackPointer(e);
          }}
          className="group/mk relative mx-1 h-10 flex-1 cursor-pointer touch-none select-none"
        >
          <div className="absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/[0.1]">
            <div
              className="brand-gradient h-full rounded-full"
              style={{ width: `${frac * 100}%` }}
            />
          </div>
          {/* markers */}
          {job.items.map((item) => {
            const left = duration > 0 ? (item.timestamp_sec / duration) * 100 : 0;
            const isActive = activeItem?.item_id === item.item_id;
            return (
              <button
                key={item.item_id}
                aria-label={`Jump to ${item.spoken_name} at ${formatShortTime(item.timestamp_sec)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  seek(item.timestamp_sec);
                }}
                style={{ left: `${Math.min(98, Math.max(0, left))}%` }}
                className="group/mk absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              >
                <span
                  className={`block h-3 w-3 rotate-45 rounded-[3px] border-2 transition-all duration-200 ${
                    isActive
                      ? "scale-125 border-pink bg-pink shadow-glow-pink"
                      : "border-pink/70 bg-base group-hover/mk:bg-pink/60"
                  }`}
                />
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-xl border border-white/12 bg-surface/95 px-3 py-2 text-center opacity-0 shadow-card backdrop-blur transition-opacity duration-150 group-hover/mk:opacity-100">
                  <span className="block max-w-[190px] truncate font-display text-[12.5px] font-semibold text-ink">
                    {item.spoken_name}
                  </span>
                  <span className="block font-mono text-[10.5px] font-semibold text-[#F9A8D4]">
                    T+{formatTimecode(item.timestamp_sec)} · {item.price.formatted}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            setMuted((m) => !m);
            if (videoRef.current) videoRef.current.muted = !muted;
          }}
          aria-label={muted ? "Unmute" : "Mute"}
          className="hidden h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-mute transition hover:text-ink sm:grid"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
    </div>
  );
}
