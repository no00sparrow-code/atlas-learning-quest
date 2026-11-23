import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Award,
  BookOpen,
  Check,
  Compass,
  Flame,
  Gem,
  Plus,
  RotateCcw,
  Search,
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
import { useAtlas } from "@/lib/atlas-store";
import { rankForLevel } from "@/lib/progression";
import { useCountUp } from "@/hooks/use-count-up";
import { LevelBadge } from "@/components/atlas/LevelBadge";
import { XpBar } from "@/components/atlas/XpBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Atlas" },
      {
        name: "description",
        content: "Your level, interests, ambitions and learning progress in Atlas.",
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

const WEEK_SAMPLE = [60, 110, 35, 140, 80, 95];
const DAYS = ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Today"];

function Profile() {
  const { state, level, skillPoints, toggleInterest, addAmbition, removeAmbition, resetProgress } =
    useAtlas();
  const [draft, setDraft] = useState("");
  const totalXp = useCountUp(state.xp, 1200);
  const questsDone = Object.keys(state.completedQuests).length;

  const mastery = CATEGORIES.map((c) => {
    const cards = FEED.filter((f) => f.category === c.id);
    const quests = QUESTS.filter((q) => q.category === c.id);
    const skills = SKILLS.filter((s) => s.category === c.id);
    const earned =
      cards.filter((f) => state.watched.includes(f.id)).length +
      quests.filter((q) => state.completedQuests[q.id]).length * 2 +
      skills.filter((s) => state.unlockedSkills.includes(s.id)).length * 2;
    const max = cards.length + quests.length * 2 + skills.length * 2;
    return { c, pct: max ? earned / max : 0 };
  });

  const watchedCats = new Set(
    FEED.filter((f) => state.watched.includes(f.id)).map((f) => f.category),
  );
  const achievements = [
    {
      icon: Sparkles,
      name: "First Spark",
      desc: "Finish your first card",
      got: state.watched.length >= 1,
    },
    {
      icon: Trophy,
      name: "Quiz Whiz",
      desc: "Ace a quiz with no mistakes",
      got: Object.entries(state.completedQuests).some(
        ([id, r]) =>
          QUESTS.find((q) => q.id === id)?.type === "quiz" &&
          r.score &&
          r.score.split("/")[0] === r.score.split("/")[1],
      ),
    },
    {
      icon: Search,
      name: "Detective",
      desc: "Solve a mystery",
      got: Object.entries(state.completedQuests).some(
        ([id, r]) =>
          QUESTS.find((q) => q.id === id)?.type === "mystery" && r.score?.startsWith("Solved"),
      ),
    },
    {
      icon: Gem,
      name: "Pathfinder",
      desc: "Unlock 5 skills",
      got: state.unlockedSkills.length >= 5,
    },
    { icon: Flame, name: "On Fire", desc: "Keep a 7-day streak", got: state.streak >= 7 },
    { icon: Compass, name: "Polymath", desc: "Learn in all 6 realms", got: watchedCats.size >= 6 },
  ];

  const week = [...WEEK_SAMPLE, state.xpToday];
  const maxDay = Math.max(...week, 1);

  return (
    <div className="pb-nav">
      {/* hero */}
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
        {/* stats */}
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
            icon={BookOpen}
            value={String(state.watched.length)}
            label="Cards"
            tone="text-cat-science"
          />
        </div>

        {/* weekly */}
        <Section
          title="This week"
          right={
            <span className="text-xs font-semibold text-primary">{state.xpToday} XP today</span>
          }
        >
          <div className="flex h-32 items-end gap-2 rounded-2xl bg-card p-4">
            {week.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className={cn(
                      "w-full rounded-lg transition-all duration-1000",
                      i === week.length - 1 ? "bg-gradient-xp shadow-glow" : "bg-secondary",
                    )}
                    style={{ height: `${Math.max(6, (v / maxDay) * 100)}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase",
                    i === week.length - 1 ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {DAYS[i]}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* mastery */}
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

        {/* interests */}
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

        {/* ambitions */}
        <Section title="Ambitions">
          <div className="space-y-2">
            {state.ambitions.map((a) => (
              <div
                key={a}
                className="flex animate-rise items-center gap-3 rounded-2xl bg-card px-4 py-3"
              >
                <Target className="size-4 shrink-0 text-gold" />
                <span className="flex-1 text-sm font-semibold">{a}</span>
                <button
                  onClick={() => removeAmbition(a)}
                  aria-label={`Remove ${a}`}
                  className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                addAmbition(draft);
                setDraft("");
                toast.success("Ambition added");
              }}
              className="flex gap-2"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
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

        {/* achievements */}
        <Section
          title="Achievements"
          right={
            <span className="text-xs font-semibold text-gold">
              {achievements.filter((a) => a.got).length}/{achievements.length}
            </span>
          }
        >
          <div className="grid grid-cols-3 gap-2">
            {achievements.map((a) => (
              <div
                key={a.name}
                className={cn(
                  "flex flex-col items-center rounded-2xl p-3 text-center",
                  a.got ? "bg-card" : "bg-card/40",
                )}
                title={a.desc}
              >
                <span
                  className={cn(
                    "mb-2 flex size-11 items-center justify-center rounded-2xl",
                    a.got ? "bg-gradient-gold shadow-gold" : "bg-secondary",
                  )}
                >
                  <a.icon
                    className={cn(
                      "size-5",
                      a.got ? "text-gold-foreground" : "text-muted-foreground",
                    )}
                  />
                </span>
                <span className={cn("text-xs font-bold", !a.got && "text-muted-foreground")}>
                  {a.name}
                </span>
                <span className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                  {a.desc}
                </span>
              </div>
            ))}
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

        <button
          onClick={() => {
            resetProgress();
            toast("Progress reset to the demo start");
          }}
          className="mx-auto flex items-center gap-1.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-3.5" /> Reset demo progress
        </button>
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
