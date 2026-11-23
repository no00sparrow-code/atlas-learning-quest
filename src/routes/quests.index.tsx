import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  HelpCircle,
  Search,
  Swords,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { QUESTS, type Quest } from "@/data/quests";
import { getCategory } from "@/data/categories";
import { useAtlas } from "@/lib/atlas-store";
import { Hud } from "@/components/atlas/Hud";
import { XpBar } from "@/components/atlas/XpBar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quests/")({
  head: () => ({
    meta: [
      { title: "Quests — Atlas" },
      {
        name: "description",
        content: "Quizzes, mysteries and challenges that turn what you learn into XP.",
      },
      { property: "og:title", content: "Quests — Atlas" },
      {
        property: "og:description",
        content: "Solve history mysteries, ace quizzes and take on challenges for XP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Quests,
});

type Tab = "all" | Quest["type"];

const TYPE_META: Record<Quest["type"], { label: string; icon: typeof HelpCircle }> = {
  quiz: { label: "Quiz", icon: HelpCircle },
  mystery: { label: "Mystery", icon: Search },
  challenge: { label: "Challenge", icon: Target },
};

function Quests() {
  const { state } = useAtlas();
  const [tab, setTab] = useState<Tab>("all");
  const done = Object.keys(state.completedQuests).length;
  const featured = QUESTS.find((q) => !state.completedQuests[q.id]) ?? QUESTS[0];
  const list = QUESTS.filter((q) => (tab === "all" ? true : q.type === tab)).filter(
    (q) => q.id !== featured?.id || tab !== "all",
  );
  const earned = Object.values(state.completedQuests).reduce((a, r) => a + r.xp, 0);

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "quiz", label: "Quizzes" },
    { id: "mystery", label: "Mysteries" },
    { id: "challenge", label: "Challenges" },
  ];

  return (
    <div className="pb-nav">
      <header className="sticky top-0 z-30 bg-background/70 px-4 pb-3 pt-3 backdrop-blur-xl">
        <Hud />
      </header>

      <div className="space-y-5 px-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
            Quest board
          </p>
          <h1 className="text-2xl font-black">Prove what you know</h1>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat icon={Trophy} value={`${done}/${QUESTS.length}`} label="Completed" />
          <Stat icon={Zap} value={String(earned)} label="Quest XP" />
          <Stat icon={Swords} value={String(QUESTS.length - done)} label="Open" />
        </div>

        {featured && tab === "all" && <FeaturedQuest quest={featured} />}

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all",
                tab === t.id
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {list.map((q, i) => (
            <QuestRow key={q.id} quest={q} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Trophy; value: string; label: string }) {
  return (
    <div className="rounded-2xl glass p-3">
      <Icon className="mb-1 size-4 text-gold" />
      <p className="font-display text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function FeaturedQuest({ quest }: { quest: Quest }) {
  const cat = getCategory(quest.category);
  const meta = TYPE_META[quest.type];
  return (
    <Link
      to="/quests/$questId"
      params={{ questId: quest.id }}
      data-cat={quest.category}
      className="relative block overflow-hidden rounded-3xl border border-cat shadow-card"
    >
      <img
        src={cat.image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover animate-kenburns"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
      <div className="relative flex min-h-56 flex-col justify-end p-5">
        <div className="mb-auto flex items-center justify-between">
          <span className="rounded-full bg-gradient-gold px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gold-foreground shadow-gold">
            Featured
          </span>
          <span className="rounded-full glass-dark px-3 py-1 font-display text-xs font-bold text-primary">
            +{quest.reward} XP
          </span>
        </div>
        <p className="mt-10 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cat">
          <meta.icon className="size-3.5" /> {meta.label} · {cat.name}
        </p>
        <h2 className="text-2xl font-black leading-tight">{quest.title}</h2>
        <p className="mt-1 text-sm text-foreground/80">{quest.subtitle}</p>
        <span className="mt-4 inline-flex h-12 items-center justify-center rounded-2xl bg-cat font-display text-sm font-bold uppercase tracking-wider text-background glow-cat">
          Start quest
        </span>
      </div>
    </Link>
  );
}

function QuestRow({ quest, index }: { quest: Quest; index: number }) {
  const { state } = useAtlas();
  const cat = getCategory(quest.category);
  const meta = TYPE_META[quest.type];
  const result = state.completedQuests[quest.id];
  const watchProgress =
    quest.type === "challenge" && quest.mode === "watch"
      ? Math.min(1, state.watched.length / (quest.watchTarget ?? 3))
      : null;

  return (
    <Link
      to="/quests/$questId"
      params={{ questId: quest.id }}
      data-cat={quest.category}
      className={cn(
        "flex animate-rise items-center gap-3 rounded-2xl border bg-card p-3 transition-all active:scale-[0.99]",
        result ? "border-border opacity-75" : "border-transparent hover:border-cat",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
        <img src={cat.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-overlay/40">
          <meta.icon className="size-6 text-cat" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-cat">
          {meta.label} · {quest.difficulty}
        </p>
        <p className="truncate font-display text-[15px] font-bold">{quest.title}</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3" /> {quest.minutes} min
          </span>
          {watchProgress !== null && !result && (
            <span className="flex items-center gap-1">
              <Eye className="size-3" />{" "}
              {Math.min(
                state.watched.length,
                quest.type === "challenge" ? (quest.watchTarget ?? 3) : 3,
              )}
              /{quest.type === "challenge" ? quest.watchTarget : 3}
            </span>
          )}
        </div>
        {watchProgress !== null && !result && (
          <XpBar progress={watchProgress} tone="cat" size="sm" className="mt-2" />
        )}
      </div>
      {result ? (
        <div className="flex flex-col items-center text-success">
          <CheckCircle2 className="size-6" />
          <span className="text-[10px] font-bold">{result.score ?? `+${result.xp}`}</span>
        </div>
      ) : (
        <span className="rounded-xl bg-secondary px-2.5 py-1.5 font-display text-xs font-bold text-primary">
          +{quest.reward}
        </span>
      )}
    </Link>
  );
}
