import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  CheckCircle2,
  Heart,
  Pause,
  Play,
  Share2,
  Swords,
  BookOpen,
  ChevronsDown,
} from "lucide-react";
import { toast } from "sonner";
import type { FeedCard } from "@/data/cards";
import { getCategory } from "@/data/categories";
import { useAtlas } from "@/lib/atlas-store";
import { XP_PER_CARD } from "@/lib/progression";
import { cn } from "@/lib/utils";

/** Demo playback length: every card "plays" in this many ms, displayed against its real runtime. */
const DEMO_MS = 10000;

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

interface Props {
  card: FeedCard;
  active: boolean;
  onOpenInsight: (card: FeedCard) => void;
}

export function FeedCardView({ card, active, onOpenInsight }: Props) {
  const { state, watchCard, toggleLike, toggleSave, saveProgress } = useAtlas();
  const category = getCategory(card.category);
  const watched = state.shorts[card.id]?.completed ?? state.watched.includes(card.id);
  const liked = state.liked.includes(card.id);
  const saved = state.saved.includes(card.id);

  const stored = state.shorts[card.id];
  const startAt = stored && !stored.completed ? Math.min(0.98, stored.position) : 0;
  const [progress, setProgress] = useState(startAt);
  const [paused, setPaused] = useState(false);
  const [heartBurst, setHeartBurst] = useState(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef(startAt);
  const lastSaved = useRef(0);

  useEffect(() => {
    if (!active) {
      setPaused(false);
      return;
    }
    if (paused || progressRef.current >= 1) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = Math.min(1, progressRef.current + (now - last) / DEMO_MS);
      last = now;
      progressRef.current = next;
      setProgress(next);
      if (now - lastSaved.current > 1200) {
        lastSaved.current = now;
        saveProgress("short", card.id, next);
      }
      if (next >= 1) {
        watchCard(card.id);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, paused, card.id, watchCard, saveProgress]);

  const done = progress >= 1;

  const handleTap = () => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      if (!liked) toggleLike(card.id);
      setHeartBurst((n) => n + 1);
      return;
    }
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      if (done) {
        progressRef.current = 0;
        setProgress(0);
        setPaused(false);
        saveProgress("short", card.id, 0);
      } else setPaused((p) => !p);
    }, 240);
  };

  const share = async () => {
    const url = `${window.location.origin}/watch/${card.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied", { description: card.title });
    } catch {
      toast("Share link", { description: url });
    }
  };

  return (
    <section
      data-cat={card.category}
      className="relative mx-auto h-dvh w-full snap-start snap-always overflow-hidden md:max-w-md md:border-x md:border-border/60"
    >
      <img
        src={category.image}
        alt=""
        className={cn(
          "absolute inset-0 h-full w-full object-cover animate-kenburns",
          (!active || paused) && "[animation-play-state:paused]",
        )}
        style={{ objectPosition: card.focus }}
        loading="lazy"
      />
      <div className="absolute inset-0 bg-scrim" />

      {/* tap layer */}
      <button
        aria-label={paused ? "Play" : "Pause"}
        className="absolute inset-0 z-10"
        onClick={handleTap}
      />

      {paused && !done && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex size-20 animate-pop-in items-center justify-center rounded-full glass-dark">
            <Play className="ml-1 size-9 fill-foreground" />
          </div>
        </div>
      )}
      {heartBurst > 0 && (
        <div
          key={heartBurst}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <Heart className="size-28 animate-float-up fill-accent text-accent drop-shadow-2xl" />
        </div>
      )}

      {/* action rail */}
      <div className="absolute bottom-[8.5rem] right-3 z-20 flex flex-col items-center gap-4">
        <RailButton
          label={formatCount(card.likes + (liked ? 1 : 0))}
          onClick={() => toggleLike(card.id)}
          active={liked}
        >
          <Heart className={cn("size-7", liked && "animate-heart fill-accent text-accent")} />
        </RailButton>
        <RailButton
          label={saved ? "Saved" : "Save"}
          onClick={() => toggleSave(card.id)}
          active={saved}
        >
          <Bookmark className={cn("size-7", saved && "fill-gold text-gold")} />
        </RailButton>
        <RailButton label="Insight" onClick={() => onOpenInsight(card)}>
          <BookOpen className="size-7" />
        </RailButton>
        <RailButton label="Share" onClick={share}>
          <Share2 className="size-7" />
        </RailButton>
        {card.relatedQuest && (
          <Link
            to="/quests/$questId"
            params={{ questId: card.relatedQuest }}
            className="flex flex-col items-center gap-1 text-[11px] font-bold"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-cat text-background glow-cat">
              <Swords className="size-6" />
            </span>
            Quest
          </Link>
        )}
      </div>

      {/* info */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-[6.5rem] pr-20">
        <div className="pointer-events-auto mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cat bg-cat-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-cat backdrop-blur-md">
            <category.icon className="size-3.5" />
            {category.name}
          </span>
          {watched ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/20 px-2.5 py-1 text-[11px] font-bold text-success backdrop-blur-md">
              <CheckCircle2 className="size-3.5" /> Learned
            </span>
          ) : (
            <span className="rounded-full glass-dark px-2.5 py-1 text-[11px] font-bold text-primary">
              +{XP_PER_CARD} XP
            </span>
          )}
        </div>
        <h2 className="text-[1.6rem] font-extrabold leading-[1.1] drop-shadow-lg">{card.title}</h2>
        <p className="mt-2 text-[15px] leading-snug text-foreground/85">{card.hook}</p>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="flex size-7 items-center justify-center rounded-full bg-cat font-display text-[11px] font-bold text-background">
            {card.creatorName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)}
          </span>
          <span className="font-bold">{card.creator}</span>
          <span className="text-muted-foreground">· {formatTime(card.seconds)}</span>
        </div>

        {done && (
          <div className="pointer-events-auto mt-4 flex animate-rise gap-2">
            <button
              onClick={() => onOpenInsight(card)}
              className="flex-1 rounded-xl glass px-3 py-2.5 text-sm font-bold"
            >
              Key insight
            </button>
            {card.relatedQuest && (
              <Link
                to="/quests/$questId"
                params={{ questId: card.relatedQuest }}
                className="flex-1 rounded-xl bg-cat px-3 py-2.5 text-center text-sm font-bold text-background glow-cat"
              >
                Test yourself
              </Link>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/20">
            <div
              className="h-full rounded-full bg-cat glow-cat"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="w-24 text-right text-[11px] font-semibold tabular-nums text-foreground/70">
            {done ? "Visual complete" : "10s visual"} · {formatTime(card.seconds)} read
          </span>
          {paused && <Pause className="size-3 text-foreground/70" />}
        </div>
        {done && (
          <div className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <ChevronsDown className="size-3.5 animate-bounce" /> Swipe for next
          </div>
        )}
      </div>
    </section>
  );
}

function RailButton({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 text-[11px] font-bold drop-shadow-lg"
      aria-pressed={active}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl glass-dark transition-transform active:scale-90">
        {children}
      </span>
      {label}
    </button>
  );
}
