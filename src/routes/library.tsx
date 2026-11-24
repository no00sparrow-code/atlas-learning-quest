import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Brain,
  Clapperboard,
  Clock,
  Flame,
  Heart,
  History,
  Map,
  PlayCircle,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useAtlas } from "@/lib/atlas-store";
import { buildSnapshot } from "@/lib/metrics";
import { dueCount, masteredConcepts, retentionRate, weakConcepts } from "@/lib/memory";
import { recommendNext, type NextStep } from "@/lib/recommend";
import { getCategory } from "@/data/categories";
import { continueWatching, likedItems, recentItems, relativeTime, savedItems } from "@/lib/library";
import { ACHIEVEMENTS } from "@/data/achievements";
import { Hud } from "@/components/atlas/Hud";
import { DailyGoalCard } from "@/components/atlas/DailyGoal";
import { ContentRow } from "@/components/atlas/ContentRow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library — Atlas" },
      {
        name: "description",
        content:
          "Pick up where you left off, revisit saved lessons and see everything you've watched.",
      },
      { property: "og:title", content: "Library — Atlas" },
      {
        property: "og:description",
        content: "Your personal feed: continue watching, saved lessons, likes and history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { state, level, today } = useAtlas();
  const [tab, setTab] = useState<"continue" | "saved" | "liked">("continue");
  const resume = continueWatching(state, 8);
  const saved = savedItems(state);
  const liked = likedItems(state);
  const recent = recentItems(state, 8);
  const snapshot = buildSnapshot(state);
  const unlocked = ACHIEVEMENTS.filter((a) => state.achievements[a.id]);
  const due = dueCount(state.memory, today);
  const retention = Math.round(retentionRate(state.memory) * 100);
  const mastered = masteredConcepts(state.memory).length;
  const weak = weakConcepts(state.memory, 2);
  const nextSteps = recommendNext(state, 3, today);

  const tabs = [
    { id: "continue", label: "Continue", count: resume.length, icon: PlayCircle },
    { id: "saved", label: "Saved", count: saved.length, icon: Bookmark },
    { id: "liked", label: "Liked", count: liked.length, icon: Heart },
  ] as const;

  const activeList = tab === "continue" ? resume : tab === "saved" ? saved : liked;

  return (
    <div className="pb-nav">
      <header className="sticky top-0 z-30 bg-background/70 px-4 pb-3 pt-3 backdrop-blur-xl">
        <Hud />
      </header>

      <div className="space-y-5 px-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
            Your library
          </p>
          <h1 className="text-2xl font-black">Everything you're learning</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Level {level.level} · {state.streak}-day streak · {state.saved.length} saved
          </p>
        </div>

        <DailyGoalCard />

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              Memory inbox
            </p>
            <span
              className={cn(
                "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold",
                due > 0 ? "bg-accent/15 text-accent" : "bg-success/15 text-success",
              )}
            >
              {due > 0 ? `${due} due` : "Clear"}
            </span>
          </div>
          <p className="mt-2 text-sm">
            <span className="font-bold">{retention}% recall</span>{" "}
            <span className="text-muted-foreground">
              · {mastered} concept{mastered === 1 ? "" : "s"} mastered
            </span>
          </p>
          {weak.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {weak.map((item) => (
                <Link
                  key={item.concept.id}
                  to="/map"
                  search={{ concept: item.concept.id }}
                  className="rounded-full bg-secondary/70 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"
                >
                  {item.concept.name} · {Math.round(item.memory.strength * 100)}%
                </Link>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Button variant={due > 0 ? "xp" : "glass"} size="sm" className="flex-1" asChild>
              <Link to="/review">
                <Brain /> {due > 0 ? `Review ${due}` : "Quick review"}
              </Link>
            </Button>
            <Button variant="glass" size="sm" className="flex-1" asChild>
              <Link to="/map">
                <Map /> Knowledge map
              </Link>
            </Button>
          </div>
        </section>

        {nextSteps.length > 0 && (
          <section>
            <div className="mb-2.5 flex items-baseline justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider">Next best step</h2>
              <span className="text-[10px] text-muted-foreground">Why this?</span>
            </div>
            <div className="space-y-2">
              {nextSteps.map((step) => (
                <NextStepRow key={`${step.kind}-${step.id}`} step={step} />
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-3 gap-2">
          <MiniStat icon={Flame} value={`${state.streak}`} label="Day streak" tone="text-accent" />
          <MiniStat
            icon={Clapperboard}
            value={`${snapshot.episodesCompleted}`}
            label="Episodes"
            tone="text-cat-science"
          />
          <MiniStat
            icon={Trophy}
            value={`${unlocked.length}/${ACHIEVEMENTS.length}`}
            label="Badges"
            tone="text-gold"
          />
        </div>

        <div className="flex gap-1 rounded-2xl bg-secondary/60 p-1">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all",
                  tab === item.id
                    ? "bg-background text-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {item.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px]",
                    tab === item.id
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {activeList.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="space-y-2">
            {activeList.map((item) => (
              <ContentRow
                key={item.key}
                item={item}
                meta={tab === "saved" ? relativeTime(item.updatedAt) : undefined}
              />
            ))}
          </div>
        )}

        <section>
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider">
              <History className="size-3.5" /> History
            </h2>
            <Link to="/profile" className="text-xs font-semibold text-primary">
              Achievements
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="rounded-2xl bg-card px-4 py-6 text-center text-sm text-muted-foreground">
              Nothing watched yet. Your history appears here automatically.
            </p>
          ) : (
            <div className="space-y-2">
              {recent.map((item) => (
                <ContentRow key={item.key} item={item} meta={relativeTime(item.updatedAt)} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider">
              <Sparkles className="size-3.5 text-gold" /> Latest badges
            </h2>
            <Link to="/profile" className="flex items-center gap-1 text-xs font-bold text-primary">
              All <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
            {unlocked
              .slice(-4)
              .reverse()
              .map((badge) => {
                const Icon = badge.icon;
                return (
                  <div
                    key={badge.id}
                    className="flex min-w-20 flex-1 flex-col items-center gap-1 rounded-xl bg-secondary/60 p-2.5 text-center"
                  >
                    <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-gold">
                      <Icon className="size-4 text-gold-foreground" />
                    </span>
                    <span className="text-[10px] font-bold leading-tight">{badge.name}</span>
                  </div>
                );
              })}
            {unlocked.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Finish your first lesson to start collecting.
              </p>
            )}
          </div>
        </section>

        <Link
          to="/"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Clock className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block font-display text-sm font-bold">Find something new</span>
            <span className="block text-xs text-muted-foreground">
              Shorts and deep dives, ordered around your interests
            </span>
          </span>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}

function NextStepRow({ step }: { step: NextStep }) {
  const category = step.category ? getCategory(step.category) : undefined;
  const props = {
    to: step.action.to as "/",
    params: (step.action.params ?? {}) as never,
    search: (step.action.search ?? {}) as never,
    ...(step.category ? { "data-cat": step.category } : {}),
    className:
      "flex animate-rise items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-all hover:border-primary/40 active:scale-[0.99]",
  };
  return (
    <Link {...props}>
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          step.kind === "review" ? "bg-primary/15 text-primary" : "bg-cat-soft text-cat",
        )}
      >
        {step.kind === "review" ? (
          <Brain className="size-4" />
        ) : step.kind === "quest" ? (
          <Trophy className="size-4" />
        ) : (
          <PlayCircle className="size-4" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {step.kind === "review" ? "Review" : category?.name} · {step.minutes} min
        </span>
        <span className="block truncate font-display text-sm font-bold">{step.title}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{step.reason}</span>
      </span>
      <span className="shrink-0 rounded-lg bg-secondary px-2 py-1 text-[10px] font-bold text-primary">
        +{step.xp}
      </span>
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function EmptyState({ tab }: { tab: "continue" | "saved" | "liked" }) {
  const copy =
    tab === "continue"
      ? {
          icon: PlayCircle,
          title: "Nothing in progress",
          body: "Start a short or open a deep dive. Playback position is saved automatically.",
        }
      : tab === "saved"
        ? {
            icon: BookmarkCheck,
            title: "No saved lessons yet",
            body: "Tap the bookmark on any card or episode to keep it here.",
          }
        : {
            icon: Heart,
            title: "No likes yet",
            body: "Double-tap a card in Discover, or tap the heart, to keep it in Liked.",
          };
  const Icon = copy.icon;
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
        <Icon className="size-5 text-muted-foreground" />
      </span>
      <p className="mt-3 font-display text-sm font-bold">{copy.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{copy.body}</p>
      <Button variant="glass" className="mt-4" asChild>
        <Link to="/">Browse Discover</Link>
      </Button>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Flame;
  value: string;
  label: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl glass p-3 text-center">
      <Icon className={cn("mx-auto mb-1 size-4", tone)} />
      <p className="font-display text-base font-bold tabular-nums">{value}</p>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
