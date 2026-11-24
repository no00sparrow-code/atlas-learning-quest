import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Award,
  Brain,
  Check,
  Clapperboard,
  Flame,
  Map,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES } from "@/data/categories";
import { FEED } from "@/data/cards";
import { QUESTS } from "@/data/quests";
import { SKILLS } from "@/data/skills";
import { ACHIEVEMENTS } from "@/data/achievements";
import { useAtlas } from "@/lib/atlas-store";
import { rankForLevel } from "@/lib/progression";
import { buildSnapshot, deepDiveMinutes, lastSevenDays, weeklyTotal } from "@/lib/metrics";
import { dueCount, masteredConcepts, retentionRate, weakConcepts } from "@/lib/memory";
import { useCountUp } from "@/hooks/use-count-up";
import { LevelBadge } from "@/components/atlas/LevelBadge";
import { XpBar } from "@/components/atlas/XpBar";
import { DataControls } from "@/components/atlas/DataControls";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Atlas" },
      {
        name: "description",
        content: "Your level, interests, ambitions, streak and learning progress in Atlas.",
      },
      { property: "og:title", content: "Profile — Atlas" },
      {
        property: "og:description",
        content: "Track your level, mastery and achievements across six realms of knowledge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const {
    state,
    level,
    skillPoints,
    todayXp,
    today,
    toggleInterest,
    addAmbition,
    removeAmbition,
    resetProgress,
  } = useAtlas();
  const [draft, setDraft] = useState("");
  const totalXp = useCountUp(state.xp, 1200);
  const questsDone = Object.keys(state.completedQuests).length;
  const snapshot = buildSnapshot(state);
  const week = lastSevenDays(state);
  const maxDay = Math.max(...week.map((day) => day.value), 1);
  const lessons = snapshot.shortsCompleted + snapshot.episodesCompleted;
  const deepMinutes = deepDiveMinutes(state);
  const unlockedCount = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;
  const memoryDue = dueCount(state.memory, today);
  const recall = Math.round(retentionRate(state.memory) * 100);
  const masteredCount = masteredConcepts(state.memory).length;
  const weakest = weakConcepts(state.memory, 2);

  const mastery = CATEGORIES.map((c) => {
    const cards = FEED.filter((f) => f.category === c.id);
    const quests = QUESTS.filter((q) => q.category === c.id);
    const skills = SKILLS.filter((s) => s.category === c.id);
    const earned =
      cards.filter((f) => state.shorts[f.id]?.completed).length +
      quests.filter((q) => state.completedQuests[q.id]).length * 2 +
      skills.filter((s) => state.unlockedSkills.includes(s.id)).length * 2;
    const max = cards.length + quests.length * 2 + skills.length * 2;
    return { c, pct: max ? earned / max : 0 };
  });

  return (
    <div className="pb-nav">
      <section className="relative overflow-hidden px-5 pb-6 pt-8">
        <div className="absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col items-center text-center">
          <div className="relative">
            <LevelBadge level={level.level} progress={level.progress} size={112} />
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-gold px-3 py-0.5 font-display text-[10px] font-black uppercase tracking-widest text-gold-foreground shadow-gold">
              {rankForLevel(level.level)}
            </span>
          </div>
          <h1 className="mt-5 text-2xl font-black">{state.name}</h1>
          <p className="text-sm text-muted-foreground">{state.handle}</p>

          <div className="mt-5 w-full rounded-2xl glass p-4 text-left">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-display text-sm font-bold">Level {level.level}</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {level.needed - level.current} XP to level {level.level + 1}
              </span>
            </div>
            <XpBar progress={level.progress} size="lg" />
          </div>
        </div>
      </section>

      <div className="space-y-6 px-4">
        <div className="grid grid-cols-4 gap-2">
          <MiniStat
            icon={Zap}
            value={totalXp.toLocaleString()}
            label="Total XP"
            tone="text-primary"
          />
          <MiniStat icon={Flame} value={String(state.streak)} label="Streak" tone="text-accent" />
          <MiniStat icon={Target} value={String(questsDone)} label="Quests" tone="text-gold" />
          <MiniStat
            icon={Clapperboard}
            value={String(lessons)}
            label="Lessons"
            tone="text-cat-science"
          />
        </div>

        <div className="flex items-center gap-3 rounded-2xl glass px-4 py-3 text-sm">
          <Clapperboard className="size-5 shrink-0 text-cat-science" />
          <p className="flex-1">
            <span className="font-bold">{snapshot.episodesCompleted} episodes</span>{" "}
            <span className="text-muted-foreground">
              · {deepMinutes} min of deep dives · {snapshot.seriesCompleted} series finished
            </span>
          </p>
        </div>

        <Section
          title="Memory"
          right={
            <Link to="/review" className="text-xs font-semibold text-primary">
              {memoryDue > 0 ? `${memoryDue} due` : "Review"}
            </Link>
          }
        >
          <div className="rounded-2xl bg-card p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-display text-lg font-bold tabular-nums text-primary">
                  {recall}%
                </p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Recall accuracy
                </p>
              </div>
              <div>
                <p className="font-display text-lg font-bold tabular-nums text-success">
                  {masteredCount}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Mastered
                </p>
              </div>
              <div>
                <p className="font-display text-lg font-bold tabular-nums text-accent">
                  {memoryDue}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Due now</p>
              </div>
            </div>
            {weakest.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {weakest.map((item) => (
                  <Link
                    key={item.concept.id}
                    to="/review"
                    search={{ concept: item.concept.id }}
                    className="rounded-full bg-secondary/70 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"
                  >
                    {item.concept.name} · {Math.round(item.memory.strength * 100)}%
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Button variant="glass" size="sm" className="flex-1" asChild>
                <Link to="/review">
                  <Brain /> Review
                </Link>
              </Button>
              <Button variant="glass" size="sm" className="flex-1" asChild>
                <Link to="/map">
                  <Map /> Knowledge map
                </Link>
              </Button>
            </div>
          </div>
        </Section>

        <Section
          title="This week"
          right={
            <span className="text-xs font-semibold text-primary">
              {todayXp} XP today · best {state.bestStreak} days
            </span>
          }
        >
          <div className="rounded-2xl bg-card p-4">
            <div className="flex h-32 items-end gap-2">
              {week.map((day) => (
                <div key={day.key} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className={cn(
                        "w-full rounded-lg transition-all duration-1000",
                        day.isToday ? "bg-gradient-xp shadow-glow" : "bg-secondary",
                      )}
                      style={{ height: `${Math.max(6, (day.value / maxDay) * 100)}%` }}
                      title={`${day.value} XP`}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[9px] font-bold uppercase",
                      day.isToday ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {weeklyTotal(state)} XP over the last 7 days.
            </p>
          </div>
        </Section>

        <Section title="Realm mastery">
          <div className="space-y-3 rounded-2xl bg-card p-4">
            {mastery.map(({ c, pct }) => (
              <div key={c.id} data-cat={c.id} className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cat-soft">
                  <c.icon className="size-4 text-cat" />
                </span>
                <div className="flex-1">
                  <div className="mb-1 flex justify-between text-xs font-semibold">
                    <span>{c.name}</span>
                    <span className="tabular-nums text-cat">{Math.round(pct * 100)}%</span>
                  </div>
                  <XpBar progress={pct} tone="cat" size="sm" />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Interests"
          right={<span className="text-xs text-muted-foreground">Shapes your For You feed</span>}
        >
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const on = state.interests.includes(c.id);
              return (
                <button
                  key={c.id}
                  data-cat={c.id}
                  onClick={() => toggleInterest(c.id)}
                  aria-pressed={on}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-bold transition-all active:scale-95",
                    on
                      ? "border-cat bg-cat-soft text-cat"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {on ? <Check className="size-3.5" /> : <c.icon className="size-3.5" />}
                  {c.name}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Ambitions">
          <div className="space-y-2">
            {state.ambitions.map((ambition) => (
              <div
                key={ambition}
                className="flex animate-rise items-center gap-3 rounded-2xl bg-card px-4 py-3"
              >
                <Target className="size-4 shrink-0 text-gold" />
                <span className="flex-1 text-sm font-semibold">{ambition}</span>
                <button
                  onClick={() => removeAmbition(ambition)}
                  aria-label={`Remove ${ambition}`}
                  className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.trim()) return;
                addAmbition(draft);
                setDraft("");
                toast.success("Ambition added");
              }}
              className="flex gap-2"
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add an ambition, e.g. Read 12 books this year"
                className="h-12 flex-1 rounded-2xl border border-border bg-card px-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <Button
                type="submit"
                variant="xp"
                className="size-12 rounded-2xl p-0"
                aria-label="Add ambition"
              >
                <Plus className="size-5" />
              </Button>
            </form>
          </div>
        </Section>

        <Section
          title="Achievements"
          right={
            <span className="text-xs font-semibold text-gold">
              {unlockedCount}/{ACHIEVEMENTS.length}
            </span>
          }
        >
          <div className="grid grid-cols-2 gap-2">
            {ACHIEVEMENTS.map((achievement) => {
              const got = Boolean(state.achievements[achievement.id]);
              const value = achievement.progress(snapshot);
              const Icon = achievement.icon;
              return (
                <div
                  key={achievement.id}
                  className={cn("flex gap-2.5 rounded-2xl p-3", got ? "bg-card" : "bg-card/40")}
                  title={achievement.hint}
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                      got ? "bg-gradient-gold shadow-gold" : "bg-secondary",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4.5",
                        got ? "text-gold-foreground" : "text-muted-foreground",
                      )}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn("truncate text-xs font-bold", !got && "text-muted-foreground")}
                    >
                      {achievement.name}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                      {achievement.description}
                    </p>
                    {got ? (
                      <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-gold">
                        <Trophy className="size-3" /> Unlocked
                      </p>
                    ) : (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary/70"
                            style={{ width: `${Math.round((value / achievement.target) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-bold tabular-nums text-muted-foreground">
                          {value}/{achievement.target}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <div className="flex items-center gap-3 rounded-2xl glass px-4 py-3">
          <Award className="size-5 text-primary" />
          <p className="flex-1 text-sm">
            <span className="font-bold">{state.unlockedSkills.length} skills</span>{" "}
            <span className="text-muted-foreground">
              unlocked · {skillPoints} point{skillPoints === 1 ? "" : "s"} to spend
            </span>
          </p>
        </div>

        <Section title="Account & data">
          <DataControls />
        </Section>

        <button
          onClick={() => {
            resetProgress();
            toast("Progress reset to the demo start");
          }}
          className="mx-auto flex items-center gap-1.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-3.5" /> Reset demo progress
        </button>

        <p className="flex items-center justify-center gap-1.5 pb-2 text-[10px] text-muted-foreground">
          <Sparkles className="size-3" /> Progress is stored on this device
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function MiniStat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Zap;
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
