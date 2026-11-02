import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  const duration = isDemo ? job.duration_sec : nativeDuration || job.duration_sec;

  /* ---------------- simulated demo clock ---------------- */
  useEffect(() => {
    if (!isDemo || !playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime((t) => {
        const nt = t + dt;
        return nt >= duration ? 0 : nt; // loop the reel
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isDemo, playing, duration]);

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
      if (isDemo) {
        setTime(clamped);
      } else if (videoRef.current) {
        videoRef.current.currentTime = clamped;
        setTime(clamped);
      }
    },
    [isDemo, duration],
  );

  const togglePlay = () => {
    if (isDemo) {
      setPlaying((p) => !p);
      return;
    }
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
    <div className="hud-corners glass overflow-hidden rounded-2xl">
      {/* ---------------- screen ---------------- */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#05060a]">
        {isDemo ? (
          <>
            <AnimatePresence mode="sync">
              {activeItem && (
                <motion.img
                  key={activeItem.item_id}
                  src={resolveAssetUrl(activeItem.assets.studio_showcase_url)}
                  alt={activeItem.spoken_name}
                  initial={{ scale: 1.04 }}
                  animate={{ scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                  className="absolute inset-0 h-full w-full object-cover"
                  draggable={false}
                />
              )}
            </AnimatePresence>
            <div className="scanlines pointer-events-none absolute inset-0 opacity-70" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-[#FF7B7B] backdrop-blur-sm">
                <span className="anim-pulse-dot h-1.5 w-1.5 rounded-full bg-[#FF4D4D]" />
                REC · DEMO REEL
              </span>
            </div>
            <div className="absolute right-3 bottom-3 rounded-md bg-black/55 px-2 py-1 font-mono text-[11px] tracking-[0.15em] text-ink/90 backdrop-blur-sm tabular-nums">
              T+{formatTimecode(time)}
            </div>
            {/* center play overlay */}
            {!playing && (
              <button
                onClick={togglePlay}
                aria-label="Play demo reel"
                className="group absolute inset-0 grid place-items-center"
              >
                <span className="grid h-16 w-16 place-items-center rounded-full border border-neon/50 bg-obsidian/70 text-neon backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-neon">
                  <Play size={26} className="ml-1" />
                </span>
              </button>
            )}
          </>
        ) : failed ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="font-mono text-[11px] tracking-[0.2em] text-faint">
                SOURCE VIDEO UNAVAILABLE
              </p>
              <p className="mt-2 text-[12px] text-dim">
                Assets below were already rendered — everything is still live.
              </p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              src={resolveAssetUrl(job.video_url)}
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
                className="group absolute inset-0 grid place-items-center"
              >
                <span className="grid h-16 w-16 place-items-center rounded-full border border-neon/50 bg-obsidian/70 text-neon backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-neon">
                  <Play size={26} className="ml-1" />
                </span>
              </button>
            )}
          </>
        )}
      </div>

      {/* ---------------- transport ---------------- */}
      <div className="flex items-center gap-3 border-t border-line px-4 py-3">
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-neon/30 bg-neon/[0.08] text-neon transition hover:bg-neon/[0.16]"
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>

        <span className="shrink-0 font-mono text-[11px] text-dim tabular-nums">
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
          className="group relative mx-1 h-9 flex-1 cursor-pointer touch-none select-none"
        >
          <div className="absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${frac * 100}%`,
                background: "linear-gradient(90deg, #00F0FF, #0066FF)",
                boxShadow: "0 0 10px rgba(0,240,255,0.5)",
              }}
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
                  className={`block h-2.5 w-2.5 rotate-45 border transition-all duration-200 ${
                    isActive
                      ? "scale-125 border-neon bg-neon shadow-[0_0_10px_rgba(0,240,255,0.8)]"
                      : "border-neon/60 bg-obsidian group-hover/mk:bg-neon/60"
                  }`}
                />
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md border border-white/12 bg-obsidian/95 px-2.5 py-1.5 text-center opacity-0 backdrop-blur transition-opacity duration-150 group-hover/mk:opacity-100">
                  <span className="block max-w-[180px] truncate text-[11px] font-semibold text-ink">
                    {item.spoken_name}
                  </span>
                  <span className="block font-mono text-[9.5px] tracking-[0.15em] text-neon/80">
                    T+{formatTimecode(item.timestamp_sec)}
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
          className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-dim transition hover:text-ink sm:grid"
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>
    </div>
  );
}
