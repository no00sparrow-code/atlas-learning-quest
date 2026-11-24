import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Check,
  Clock,
  Heart,
  Lock,
  Play,
  Sparkles,
  Swords,
} from "lucide-react";
import { getCategory } from "@/data/categories";
import { episodeXp, formatDuration, getSeries } from "@/data/series";
import { getQuest } from "@/data/quests";
import { useAtlas } from "@/lib/atlas-store";
import { seriesStats } from "@/lib/metrics";
import { EpisodePlayer } from "@/components/atlas/EpisodePlayer";
import { XpBar } from "@/components/atlas/XpBar";
import { SourceList } from "@/components/atlas/SourceList";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/series/$seriesId")({
  validateSearch: (search: Record<string, unknown>): { episode?: string } => {
    const episode = search["episode"];
    return typeof episode === "string" ? { episode } : {};
  },
  loader: ({ params }) => {
    const series = getSeries(params.seriesId);
    if (!series) throw notFound();
    return { series };
  },
  head: ({ loaderData }) => {
    const series = loaderData?.series;
    return {
      meta: series
        ? [
            { title: `${series.title} — Atlas deep dive` },
            { name: "description", content: series.subtitle },
            { property: "og:title", content: `${series.title} — Atlas deep dive` },
            { property: "og:description", content: series.subtitle },
            { property: "og:type", content: "video.other" },
            { name: "twitter:card", content: "summary_large_image" },
          ]
        : [{ title: "Series unavailable — Atlas" }, { name: "robots", content: "noindex" }],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-black">Series not found</h1>
      <Link
        to="/"
        className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
      >
        Back to Discover
      </Link>
    </div>
  ),
  component: SeriesPage,
});

function SeriesPage() {
  const { series } = Route.useLoaderData();
  const { episode: requestedEpisode } = Route.useSearch();
  const { state, level, watchEpisode, saveProgress, trackOpen, toggleSave, toggleLike } =
    useAtlas();
  const category = getCategory(series.category);
  const stats = useMemo(() => seriesStats(state, series.id), [state, series.id]);
  const locked = level.level < series.unlockLevel;
  const playerRef = useRef<HTMLDivElement>(null);

  const [activeId, setActiveId] = useState<string>(() => {
    if (requestedEpisode && series.episodes.some((e) => e.id === requestedEpisode)) {
      return requestedEpisode;
    }
    return stats.nextEpisodeId ?? series.episodes[0]?.id ?? "";
  });

  const active = series.episodes.find((e) => e.id === activeId) ?? series.episodes[0];
  const progress = active ? state.episodes[active.id] : undefined;
  const completed = progress?.completed ?? false;
  const saved = active ? state.saved.includes(active.id) : false;
  const liked = active ? state.liked.includes(active.id) : false;

  useEffect(() => {
    if (active) trackOpen("episode", active.id);
  }, [active, trackOpen]);

  const handleProgress = useCallback(
    (position: number) => {
      if (active) saveProgress("episode", active.id, position);
    },
    [active, saveProgress],
  );

  const handleComplete = useCallback(() => {
    if (active) watchEpisode(active.id);
  }, [active, watchEpisode]);

  if (!active) return null;

  const select = (id: string) => {
    setActiveId(id);
    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const quest = series.relatedQuest ? getQuest(series.relatedQuest) : undefined;

  return (
    <div data-cat={series.category} className="min-h-dvh pb-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <img
          src={category.image}
          alt=""
          className="h-full w-full object-cover opacity-40"
          style={{ objectPosition: series.focus }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/80 to-background" />
      </div>

      <header className="sticky top-0 z-20 flex items-center gap-3 bg-background/60 px-4 py-3 backdrop-blur-xl">
        <Link to="/" aria-label="Back to Discover" className="rounded-full bg-secondary p-2">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-cat">
            {category.realm}
          </p>
          <p className="truncate font-display text-sm font-bold">{series.title}</p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-cat">
          {stats.completed}/{stats.total} done
        </span>
      </header>

      <div className="relative px-4 pt-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-cat">
          <category.icon className="size-3.5" /> {category.name} · {series.level}
        </p>
        <h1 className="mt-1 text-3xl font-black leading-tight">{series.title}</h1>
        <p className="mt-1 text-foreground/75">{series.subtitle}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground/80">{series.creatorName}</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {formatDuration(series.episodes.reduce((total, e) => total + e.seconds, 0))}
          </span>
          <span>{series.episodes.length} episodes</span>
        </div>

        <div className="mt-4 rounded-2xl glass p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold">
            <span className="uppercase tracking-wider text-muted-foreground">Series progress</span>
            <span className="text-cat">
              {stats.completed}/{stats.total} · {Math.round(stats.progress * 100)}%
            </span>
          </div>
          <XpBar progress={stats.progress} tone="cat" size="sm" />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {stats.secondsLeft > 0
                ? `${formatDuration(stats.secondsLeft)} left`
                : "Series complete — replay anytime"}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toggleLike(active.id)}
                aria-pressed={liked}
                aria-label={liked ? "Remove like" : "Like this episode"}
                className="rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground"
              >
                <Heart className={cn("size-4", liked && "fill-accent text-accent")} />
              </button>
              <button
                onClick={() => toggleSave(active.id)}
                aria-pressed={saved}
                aria-label={saved ? "Remove from saved" : "Save episode"}
                className="rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground"
              >
                <Bookmark className={cn("size-4", saved && "fill-gold text-gold")} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div ref={playerRef} className="relative mt-4 scroll-mt-20 px-4">
        {locked ? (
          <div className="rounded-3xl border border-border bg-card p-6 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary">
              <Lock className="size-6 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-lg font-bold">
              Reach level {series.unlockLevel} to unlock
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              You're level {level.level}. Finish cards and quests to get there.
            </p>
            <Button variant="xp" size="xl" className="mt-4 w-full" asChild>
              <Link to="/quests">Earn XP in Quests</Link>
            </Button>
          </div>
        ) : (
          <EpisodePlayer
            key={active.id}
            episode={active}
            image={category.image}
            focus={series.focus}
            initialPosition={progress?.position ?? 0}
            completed={completed}
            onProgress={handleProgress}
            onComplete={handleComplete}
          />
        )}
      </div>

      {!locked && (
        <div className="relative mt-4 px-4">
          <div className="rounded-2xl bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-cat">
                  Episode {active.number}
                </p>
                <h2 className="font-display text-lg font-bold leading-tight">{active.title}</h2>
              </div>
              <span className="shrink-0 rounded-full bg-cat-soft px-2.5 py-1 text-[11px] font-bold text-cat">
                +{episodeXp(active.seconds)} XP
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">{active.summary}</p>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              What you'll learn
            </p>
            <ul className="mt-2 space-y-2">
              {active.takeaways.map((takeaway) => (
                <li key={takeaway} className="flex gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-cat" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <SourceList contentId={active.id} title={active.title} compact />
            </div>
            <Link
              to="/guide"
              search={{ q: `Explain “${active.title}” from “${series.title}” in simple terms.` }}
              className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-cat bg-cat-soft py-2.5 text-xs font-bold text-cat"
            >
              <Sparkles className="size-3.5" /> Ask the Guide about this episode
            </Link>
          </div>
        </div>
      )}

      <div className="relative mt-5 px-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider">Episodes</h2>
          <span className="text-xs text-muted-foreground">{series.creator}</span>
        </div>
        <div className="space-y-2">
          {series.episodes.map((episode) => {
            const episodeProgress = state.episodes[episode.id];
            const isActive = episode.id === active.id;
            const done = episodeProgress?.completed ?? false;
            return (
              <button
                key={episode.id}
                onClick={() => select(episode.id)}
                disabled={locked}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.99]",
                  isActive ? "border-cat bg-cat-soft" : "border-border bg-card hover:border-cat",
                  locked && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold",
                    done
                      ? "bg-success/20 text-success"
                      : isActive
                        ? "bg-cat text-background"
                        : "bg-secondary text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-4" /> : episode.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-bold">
                    {episode.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    {formatDuration(episode.seconds)}
                    {episodeProgress && episodeProgress.position > 0.01 && !done && (
                      <span className="text-cat">
                        · {Math.round(episodeProgress.position * 100)}% watched
                      </span>
                    )}
                  </span>
                  {!done && episodeProgress && episodeProgress.position > 0.01 && (
                    <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-secondary">
                      <span
                        className="block h-full rounded-full bg-cat"
                        style={{ width: `${Math.round(episodeProgress.position * 100)}%` }}
                      />
                    </span>
                  )}
                </span>
                {isActive && !done ? (
                  <Play className="size-4 shrink-0 fill-cat text-cat" />
                ) : (
                  <Play className="size-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {stats.completed === stats.total && (
        <div className="relative mx-4 mt-5 animate-rise rounded-2xl border border-gold/40 bg-gold/10 p-4 text-center">
          <Sparkles className="mx-auto size-6 text-gold" />
          <p className="mt-1 font-display font-bold text-gold">Series complete</p>
          <p className="text-xs text-foreground/75">
            Every episode finished. That's how a realm gets mastered.
          </p>
        </div>
      )}

      {quest && (
        <Link
          to="/quests/$questId"
          params={{ questId: quest.id }}
          data-cat={quest.category}
          className="mx-4 mt-5 flex items-center gap-3 rounded-2xl border border-cat bg-cat-soft p-4"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-cat text-background">
            <Swords className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-cat">
              Test this series
            </span>
            <span className="block font-display text-sm font-bold">{quest.title}</span>
          </span>
          <span className="text-xs font-bold text-primary">+{quest.reward} XP</span>
        </Link>
      )}

      <div className="relative mt-6 px-4">
        <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {stats.completed}/{stats.total} episodes ·{" "}
            {formatDuration(series.episodes.reduce((t, e) => t + e.seconds, 0))}
          </p>
          <Link to="/" className="flex items-center gap-1 text-xs font-bold text-primary">
            Back to Discover
          </Link>
        </div>
      </div>
    </div>
  );
}
