import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import type { Episode } from "@/data/series";
import { episodeXp, formatDuration } from "@/data/series";
import { cn } from "@/lib/utils";

/** Simulated long-form playback: real duration labels, compressed demo timeline. */
const DEMO_MS = 45_000;
const SAVE_EVERY_MS = 1_200;

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  episode: Episode;
  image: string;
  focus: string;
  initialPosition: number;
  completed: boolean;
  onProgress: (position: number) => void;
  onComplete: () => void;
}

export function EpisodePlayer({
  episode,
  image,
  focus,
  initialPosition,
  completed,
  onProgress,
  onComplete,
}: Props) {
  const startAt = completed ? 0 : Math.min(0.99, Math.max(0, initialPosition));
  const [position, setPosition] = useState(startAt);
  const [playing, setPlaying] = useState(false);
  const positionRef = useRef(startAt);
  const lastSave = useRef(0);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = Math.min(1, positionRef.current + (now - last) / DEMO_MS);
      last = now;
      positionRef.current = next;
      setPosition(next);
      if (now - lastSave.current > SAVE_EVERY_MS) {
        lastSave.current = now;
        onProgressRef.current(next);
      }
      if (next >= 1) {
        setPlaying(false);
        onProgressRef.current(1);
        onCompleteRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const seek = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    positionRef.current = clamped;
    setPosition(clamped);
    onProgressRef.current(clamped);
  }, []);

  const toggle = () => {
    if (position >= 1) {
      seek(0);
      setPlaying(true);
      return;
    }
    if (playing) {
      onProgressRef.current(positionRef.current);
      setPlaying(false);
    } else {
      setPlaying(true);
    }
  };

  const xp = episodeXp(episode.seconds);
  const currentSeconds = position * episode.seconds;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      <div className="relative aspect-video overflow-hidden">
        <img
          src={image}
          alt=""
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            playing ? "animate-kenburns" : "scale-105",
          )}
          style={{ objectPosition: focus }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-card/10" />
        <div className="absolute inset-x-3 top-3 flex items-center justify-between text-[11px] font-bold">
          <span className="rounded-full glass-dark px-2.5 py-1 uppercase tracking-wider text-foreground/90">
            Ep {episode.number} · {formatDuration(episode.seconds)}
          </span>
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1",
              completed ? "bg-success/20 text-success" : "glass-dark text-primary",
            )}
          >
            {completed ? <Check className="size-3.5" /> : <Sparkles className="size-3.5" />}
            {completed ? "Completed" : `+${xp} XP`}
          </span>
        </div>

        <button
          onClick={toggle}
          aria-label={playing ? "Pause episode" : "Play episode"}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span
            className={cn(
              "flex size-16 items-center justify-center rounded-full border border-foreground/20 bg-background/60 backdrop-blur-md transition-all active:scale-90",
              playing && "opacity-0 hover:opacity-100 focus-visible:opacity-100",
            )}
          >
            {playing ? (
              <Pause className="size-7 fill-foreground text-foreground" />
            ) : position >= 1 ? (
              <RotateCcw className="size-6 text-foreground" />
            ) : (
              <Play className="ml-1 size-7 fill-foreground text-foreground" />
            )}
          </span>
        </button>

        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2">
          <span className="text-[10px] font-bold tabular-nums text-foreground/80">
            {clock(currentSeconds)}
          </span>
          <div className="relative flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-foreground/20">
              <div className="h-full rounded-full bg-cat" style={{ width: `${position * 100}%` }} />
            </div>
            {episode.chapters.slice(1).map((chapter) => (
              <span
                key={chapter.at}
                className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-background"
                style={{ left: `${(chapter.at / episode.seconds) * 100}%` }}
              />
            ))}
          </div>
          <span className="text-[10px] font-bold tabular-nums text-foreground/60">
            {clock(episode.seconds)}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {episode.chapters.map((chapter) => {
            const active =
              currentSeconds >= chapter.at &&
              currentSeconds <
                (episode.chapters[episode.chapters.indexOf(chapter) + 1]?.at ?? episode.seconds);
            return (
              <button
                key={chapter.label}
                onClick={() => seek(chapter.at / episode.seconds)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  active
                    ? "bg-cat text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {chapter.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => seek(Math.max(0, position - 0.1))}
            className="rounded-xl bg-secondary px-3 py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground"
          >
            −10%
          </button>
          <button
            onClick={toggle}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cat px-3 py-2 text-xs font-bold text-background glow-cat active:scale-[0.99]"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            {playing ? "Pause" : position >= 1 ? "Rewatch" : position > 0 ? "Resume" : "Play"}
          </button>
          <button
            onClick={() => seek(Math.min(1, position + 0.1))}
            className="rounded-xl bg-secondary px-3 py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground"
          >
            +10%
          </button>
        </div>

        {!completed && position >= 0.7 && (
          <button
            onClick={() => {
              seek(1);
              setPlaying(false);
              onCompleteRef.current();
            }}
            className="w-full animate-rise rounded-xl border border-cat bg-cat-soft py-2.5 text-xs font-bold text-cat"
          >
            Finish now · claim +{xp} XP
          </button>
        )}
        {completed && (
          <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-success">
            <Check className="size-3.5" /> Episode complete · replay anytime
          </p>
        )}
      </div>
    </div>
  );
}
