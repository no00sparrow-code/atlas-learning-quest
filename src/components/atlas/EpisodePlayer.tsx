import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Pause, Play, VideoOff, Sparkles } from "lucide-react";
import type { Episode } from "@/data/series";
import { episodeXp, formatDuration } from "@/data/series";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  episode: Episode;
  image: string;
  focus: string;
  /** Real media only. When absent the player says so instead of simulating playback. */
  videoUrl?: string | undefined;
  initialPosition: number;
  completed: boolean;
  onProgress: (position: number) => void;
  onComplete: () => void;
}

function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function EpisodePlayer({
  episode,
  image,
  focus,
  videoUrl,
  initialPosition,
  completed,
  onProgress,
  onComplete,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedAt = useRef(0);
  const completedRef = useRef(completed);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  const [position, setPosition] = useState(completed ? 0 : initialPosition);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(!videoUrl);

  const xp = episodeXp(episode.seconds);

  useEffect(() => {
    setUnavailable(!videoUrl);
  }, [videoUrl]);

  // Save the last known position when leaving the episode.
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
      onProgressRef.current(Math.min(1, video.currentTime / video.duration));
    };
  }, [episode.id]);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onProgressRef.current(1);
    onCompleteRef.current();
  }, []);

  const handleMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    if (!completed && initialPosition > 0.01) {
      video.currentTime = Math.min(video.duration - 0.5, initialPosition * video.duration);
    }
  };

  const handleTime = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const ratio = Math.min(1, video.currentTime / video.duration);
    setPosition(ratio);
    setCurrentTime(video.currentTime);

    if (video.currentTime - lastSavedAt.current >= 2) {
      lastSavedAt.current = video.currentTime;
      onProgressRef.current(ratio);
    }

    // A couple of seconds of tolerance handles trailing credits and encoder gaps.
    if (video.duration - video.currentTime <= 1.5) complete();
  };

  const seekTo = (ratio: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, ratio * video.duration));
  };

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  };

  const activeChapterIndex = episode.chapters.reduce(
    (active, chapter, index) => (position * episode.seconds >= chapter.at ? index : active),
    0,
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      <div className="relative aspect-video overflow-hidden bg-black">
        {videoUrl && !unavailable ? (
          <video
            ref={videoRef}
            src={videoUrl}
            poster={image}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full bg-black object-contain"
            onLoadedMetadata={handleMetadata}
            onTimeUpdate={handleTime}
            onPlay={() => setPlaying(true)}
            onPause={() => {
              setPlaying(false);
              const video = videoRef.current;
              if (video && video.duration > 0) {
                onProgressRef.current(Math.min(1, video.currentTime / video.duration));
              }
            }}
            onEnded={() => {
              setPlaying(false);
              complete();
            }}
            onError={() => setUnavailable(true)}
          />
        ) : (
          <>
            <img
              src={image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-35 blur-[1px]"
              style={{ objectPosition: focus }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-background/60 to-background/30" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary/80 text-muted-foreground">
                <VideoOff className="size-5" />
              </span>
              <p className="mt-3 font-display text-sm font-bold">
                {unavailable && videoUrl
                  ? "This video could not load"
                  : "Episode video not produced yet"}
              </p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                {unavailable && videoUrl
                  ? "The media file failed to load. The written lesson below is still available."
                  : "Atlas is not simulating playback. The written lesson, chapter outline and sources below are real; narrated video is still in production."}
              </p>
              <Button
                variant="glass"
                size="sm"
                className="mt-3"
                onClick={() =>
                  document.getElementById("episode-notes")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Read the lesson
              </Button>
            </div>
          </>
        )}

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between text-[11px] font-bold">
          <span className="rounded-full glass-dark px-2.5 py-1 uppercase tracking-wider text-foreground/90">
            Ep {episode.number} · {videoUrl && !unavailable ? "Lesson video" : "Written lesson"}
          </span>
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1",
              completed ? "bg-success/20 text-success" : "glass-dark text-primary",
            )}
          >
            {completed ? <Check className="size-3.5" /> : <Sparkles className="size-3.5" />}
            {completed ? "Completed" : videoUrl && !unavailable ? `+${xp} XP` : "Media pending"}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {videoUrl && !unavailable ? "Chapters" : "Planned chapters"}
          </p>
          <span className="text-[10px] text-muted-foreground">
            {videoUrl && !unavailable
              ? `${clock(currentTime)} / ${clock(duration)}`
              : `${formatDuration(episode.seconds)} read`}
          </span>
        </div>

        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {episode.chapters.map((chapter, index) => {
            const active = videoUrl && !unavailable && index === activeChapterIndex;
            return (
              <button
                key={chapter.label}
                disabled={!videoUrl || unavailable}
                onClick={() => seekTo(chapter.at / episode.seconds)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  active
                    ? "bg-cat text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                  (!videoUrl || unavailable) && "cursor-not-allowed opacity-60",
                )}
              >
                {chapter.label}
              </button>
            );
          })}
        </div>

        {videoUrl && !unavailable ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => seekTo(position - 10 / Math.max(1, duration))}
              className="rounded-xl bg-secondary px-3 py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground"
            >
              −10s
            </button>
            <button
              onClick={toggle}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cat px-3 py-2 text-xs font-bold text-background glow-cat active:scale-[0.99]"
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              {playing ? "Pause" : currentTime > 0 ? "Resume" : "Play"}
            </button>
            <button
              onClick={() => seekTo(position + 10 / Math.max(1, duration))}
              className="rounded-xl bg-secondary px-3 py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground"
            >
              +10s
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
            Video is deliberately absent rather than faked. Read the episode notes below and use the
            sources to go deeper until narration is produced.
          </div>
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
