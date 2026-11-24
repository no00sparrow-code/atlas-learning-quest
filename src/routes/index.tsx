import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Clapperboard, Lock, Play, Sparkles, Swords } from "lucide-react";
import { FEED, type FeedCard } from "@/data/cards";
import { CATEGORIES, getCategory, type CategoryId } from "@/data/categories";
import { getSeries } from "@/data/series";
import { FeedCardView } from "@/components/atlas/FeedCardView";
import { Hud } from "@/components/atlas/Hud";
import { BottomSheet } from "@/components/atlas/BottomSheet";
import { InsightSheetContent } from "@/components/atlas/InsightSheet";
import { XpBar } from "@/components/atlas/XpBar";
import { useAtlas } from "@/lib/atlas-store";
import { seriesOverview, type SeriesOverview } from "@/lib/library";
import { rankSeries, rankShorts } from "@/lib/recommend";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Discover — Atlas" },
      {
        name: "description",
        content:
          "Swipe through short lessons, then go deeper with multi-episode series in psychology, science, history, technology, creativity and business.",
      },
      { property: "og:title", content: "Discover — Atlas" },
      {
        property: "og:description",
        content:
          "Swipe through bite-sized lessons or settle into a full deep dive. Every minute earns XP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Discover,
});

type Filter = "foryou" | "all" | CategoryId;
type View = "shorts" | "deep";

function Discover() {
  const { state, level } = useAtlas();
  const [filter, setFilter] = useState<Filter>("foryou");
  const [view, setView] = useState<View>("shorts");
  const [activeIndex, setActiveIndex] = useState(0);
  const [insight, setInsight] = useState<FeedCard | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ranked once per filter/interest change so watching a card cannot reshuffle the feed mid-swipe.
  const cards = useMemo(() => {
    if (filter === "all") return FEED;
    if (filter === "foryou") return rankShorts(state);
    return FEED.filter((c) => c.category === filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, state.interests, state.memory]);

  const overview = useMemo(() => seriesOverview(state), [state]);

  const deepDives = useMemo(() => {
    if (filter === "foryou") return rankSeries(state);
    if (filter === "all") return overview;
    return overview.filter((series) => series.category === filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview, filter, state.interests, state.memory]);

  const featured = overview.find((s) => s.started && s.completed < s.total && s.nextEpisodeId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setActiveIndex(0);
  }, [filter, view]);

  useEffect(() => {
    if (view !== "shorts") return;
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset["index"]);
            if (!Number.isNaN(index)) setActiveIndex(index);
          }
        }
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [cards, view]);

  const filters: { id: Filter; label: string }[] = [
    { id: "foryou", label: "For you" },
    { id: "all", label: "All" },
    ...CATEGORIES.map((c) => ({ id: c.id as Filter, label: c.name })),
  ];

  return (
    <div className="relative">
      <div className="fixed inset-x-0 top-0 z-30 mx-auto max-w-md space-y-2 px-3 pt-3">
        <Hud variant="overlay" />
        <div className="flex rounded-2xl border border-border/60 bg-background/60 p-1 backdrop-blur-xl">
          {(
            [
              { id: "shorts", label: "Shorts", icon: Sparkles },
              { id: "deep", label: "Deep dives", icon: Clapperboard },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                aria-pressed={view === tab.id}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all",
                  view === tab.id
                    ? "bg-foreground text-background shadow-card"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
          {filters.map((f) => (
            <button
              key={f.id}
              data-cat={f.id === "foryou" || f.id === "all" ? undefined : f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
                filter === f.id
                  ? "bg-foreground text-background"
                  : "glass-dark text-foreground/80 hover:text-foreground",
              )}
            >
              {f.id === "foryou" && <Sparkles className="mr-1 inline size-3 -translate-y-px" />}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {view === "shorts" ? (
        <div ref={scrollRef} className="no-scrollbar h-dvh snap-y snap-mandatory overflow-y-scroll">
          {cards.map((card, i) => (
            <div key={`${filter}-${card.id}`} data-index={i}>
              <FeedCardView card={card} active={i === activeIndex} onOpenInsight={setInsight} />
            </div>
          ))}
          <EndOfFeed />
        </div>
      ) : (
        <div className="space-y-4 px-4 pb-nav pt-44">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
              Long form
            </p>
            <h1 className="text-2xl font-black">Go deeper</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Multi-episode series for when a short isn't enough. Progress is saved episode by
              episode.
            </p>
          </div>

          {featured && <ContinueCard overview={featured} playerLevel={level.level} />}

          <div className="space-y-3">
            {deepDives.map((item, index) => (
              <DeepDiveCard
                key={item.id}
                item={item}
                index={index}
                locked={level.level < requiredLevel(item)}
              />
            ))}
          </div>
        </div>
      )}

      <BottomSheet open={insight !== null} onClose={() => setInsight(null)} cat={insight?.category}>
        {insight && <InsightSheetContent card={insight} onClose={() => setInsight(null)} />}
      </BottomSheet>
    </div>
  );
}

function requiredLevel(item: SeriesOverview): number {
  return getSeries(item.id)?.unlockLevel ?? 1;
}

function ContinueCard({
  overview,
  playerLevel,
}: {
  overview: SeriesOverview;
  playerLevel: number;
}) {
  const series = getSeries(overview.id);
  const next = series?.episodes.find((e) => e.id === overview.nextEpisodeId);
  const category = getCategory(overview.category);
  if (!series || !next || playerLevel < series.unlockLevel) return null;
  return (
    <Link
      to="/series/$seriesId"
      params={{ seriesId: series.id }}
      search={{ episode: next.id }}
      data-cat={series.category}
      className="relative block overflow-hidden rounded-3xl border border-cat shadow-card"
    >
      <img
        src={category.image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: series.focus }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/10" />
      <div className="relative flex min-h-52 flex-col justify-end p-5">
        <span className="mb-auto w-fit rounded-full bg-gradient-xp px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-glow">
          Continue watching
        </span>
        <p className="mt-10 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cat">
          <category.icon className="size-3.5" /> {series.title}
        </p>
        <h2 className="mt-1 text-xl font-black leading-tight">
          E{next.number}: {next.title}
        </h2>
        <div className="mt-3 flex items-center gap-3">
          <XpBar progress={overview.progress} tone="cat" size="sm" />
          <span className="text-[11px] font-bold tabular-nums text-foreground/80">
            {overview.completed}/{overview.total}
          </span>
        </div>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
          Resume episode <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}

function DeepDiveCard({
  item,
  index,
  locked,
}: {
  item: SeriesOverview;
  index: number;
  locked: boolean;
}) {
  const series = getSeries(item.id);
  const category = getCategory(item.category);
  const complete = item.completed === item.total;
  return (
    <Link
      to="/series/$seriesId"
      params={{ seriesId: item.id }}
      data-cat={item.category}
      className="block animate-rise overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all hover:border-cat active:scale-[0.99]"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="relative h-32">
        <img
          src={category.image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: series?.focus ?? "50% 50%" }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
        <div className="absolute inset-x-4 top-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 rounded-full bg-cat-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cat backdrop-blur-md">
            <category.icon className="size-3" /> {category.name}
          </span>
          <span className="rounded-full glass-dark px-2.5 py-1 text-[10px] font-bold text-foreground/85">
            {item.total} eps · {item.minutes} min
          </span>
        </div>
        <div className="absolute inset-x-4 bottom-2">
          <h3 className="font-display text-lg font-black leading-tight drop-shadow">
            {item.title}
          </h3>
        </div>
        {locked && (
          <span className="absolute bottom-2 right-4 flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[10px] font-bold text-muted-foreground backdrop-blur-md">
            <Lock className="size-3" /> Level {series?.unlockLevel ?? 1}
          </span>
        )}
        {complete && (
          <span className="absolute bottom-2 right-4 flex items-center gap-1 rounded-full bg-success/20 px-2.5 py-1 text-[10px] font-bold text-success backdrop-blur-md">
            <Check className="size-3" /> Finished
          </span>
        )}
      </div>
      <div className="p-4 pt-2">
        <p className="line-clamp-2 text-sm text-muted-foreground">{item.subtitle}</p>
        <div className="mt-3 flex items-center gap-3">
          <XpBar progress={item.progress} tone="cat" size="sm" />
          <span className="shrink-0 text-[11px] font-bold tabular-nums text-muted-foreground">
            {item.started && !complete
              ? `${Math.round(item.progress * 100)}%`
              : `${item.completed}/${item.total}`}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground">{item.creator}</span>
          <span className="flex items-center gap-1 text-[11px] font-bold text-cat">
            {item.started && !complete ? "Resume" : "Start"}{" "}
            <Play className="size-3 fill-current" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function EndOfFeed() {
  return (
    <section className="flex h-dvh snap-start flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-gradient-xp shadow-glow">
        <Swords className="size-9 text-primary-foreground" />
      </div>
      <h2 className="text-2xl font-black">You're all caught up</h2>
      <p className="text-muted-foreground">
        Turn what you just learned into XP. Quests are waiting, or settle into a deep dive.
      </p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button variant="xp" size="xl" asChild>
          <Link to="/quests">Go to Quests</Link>
        </Button>
        <Button variant="glass" size="xl" asChild>
          <Link to="/library">Open your Library</Link>
        </Button>
      </div>
    </section>
  );
}
