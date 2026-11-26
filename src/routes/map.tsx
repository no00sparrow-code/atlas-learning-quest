import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Brain,
  Check,
  Film,
  Flame,
  Lock,
  Map as MapIcon,
  Play,
  Sparkles,
  Swords,
  Target,
} from "lucide-react";
import { CATEGORIES, getCategory } from "@/data/categories";
import { FEED } from "@/data/cards";
import { QUESTS } from "@/data/quests";
import { getEpisode } from "@/data/series";
import { conceptsForCategory, getConcept, relatedConcepts, type Concept } from "@/data/concepts";
import { useAtlas } from "@/lib/atlas-store";
import {
  MASTERY_LABEL,
  masteredConcepts,
  masteryLevel,
  nextConceptsToLearn,
  prerequisitesMet,
  retentionRate,
  type ConceptMemory,
} from "@/lib/memory";
import { dayKey, daysBetween } from "@/lib/streak";
import { Hud } from "@/components/atlas/Hud";
import { XpBar } from "@/components/atlas/XpBar";
import { BottomSheet } from "@/components/atlas/BottomSheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/map")({
  validateSearch: (search: Record<string, unknown>): { concept?: string } => {
    const concept = search["concept"];
    return typeof concept === "string" ? { concept } : {};
  },
  head: () => ({
    meta: [
      { title: "Knowledge map — Atlas" },
      {
        name: "description",
        content:
          "See every concept, how it connects, what you have mastered and what to learn next.",
      },
      { property: "og:title", content: "Knowledge map — Atlas" },
      {
        property: "og:description",
        content: "A living map of your intellectual development, concept by concept.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KnowledgeMap,
});

const LEVEL_TEXT: Record<string, string> = {
  unseen: "text-muted-foreground",
  learning: "text-accent",
  familiar: "text-gold",
  mastered: "text-success",
};

function KnowledgeMap() {
  const { concept: initialConcept } = Route.useSearch();
  const { state, today } = useAtlas();
  const [selectedId, setSelectedId] = useState<string | null>(initialConcept ?? null);
  const selected = selectedId ? getConcept(selectedId) : undefined;

  const mastered = useMemo(() => masteredConcepts(state.memory), [state.memory]);
  const next = useMemo(
    () => nextConceptsToLearn(state.memory, 3, state.interests),
    [state.memory, state.interests],
  );
  const retention = Math.round(retentionRate(state.memory) * 100);
  const due = Object.values(state.memory).filter(
    (memory) => memory.attempts > 0 && memory.dueDay <= today,
  ).length;

  return (
    <div className="pb-nav">
      <header className="sticky top-0 z-30 bg-background/70 px-4 pb-3 pt-3 backdrop-blur-xl">
        <Hud />
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-5 px-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
              Knowledge map
            </p>
            <h1 className="text-2xl font-black">What you actually know</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Mastery comes from recalled answers, not watch time. Tap a concept to see its
              connections.
            </p>
          </div>
          <Link
            to="/world"
            aria-label="Open the skill tree"
            className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground"
          >
            <MapIcon className="size-4" />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat icon={Check} value={`${mastered.length}`} label="Mastered" tone="text-success" />
          <Stat icon={Brain} value={`${retention}%`} label="Recall" tone="text-primary" />
          <Stat icon={Flame} value={`${due}`} label="Due" tone="text-accent" />
        </div>

        {(due > 0 || next.length > 0) && (
          <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Sparkles className="size-5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold">
                {due > 0 ? `${due} concept${due === 1 ? "" : "s"} due` : "Next best concepts"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {due > 0
                  ? "Retrieve them before they fade."
                  : next.map((concept) => concept.name).join(" · ")}
              </p>
            </div>
            {due > 0 ? (
              <Button variant="xp" size="sm" asChild>
                <Link to="/review">Review</Link>
              </Button>
            ) : (
              <Button variant="glass" size="sm" onClick={() => setSelectedId(next[0]?.id ?? null)}>
                Explore
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-card px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-secondary" /> Not started
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-accent" /> Learning
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-gold" /> Familiar
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-success" /> Mastered
          </span>
        </div>

        {CATEGORIES.map((category) => {
          const concepts = conceptsForCategory(category.id);
          const attempted = concepts.filter((c) => state.memory[c.id]?.attempts);
          const average =
            attempted.length > 0
              ? attempted.reduce((sum, c) => sum + (state.memory[c.id]?.strength ?? 0), 0) /
                attempted.length
              : 0;
          return (
            <section
              key={category.id}
              data-cat={category.id}
              className="overflow-hidden rounded-3xl border border-border bg-card"
            >
              <div className="flex items-center gap-3 border-b border-border/60 p-4">
                <span className="flex size-9 items-center justify-center rounded-xl bg-cat-soft">
                  <category.icon className="size-4 text-cat" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-bold">{category.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {category.realm} · {attempted.length}/{concepts.length} attempted
                  </p>
                </div>
                <span className="text-xs font-bold tabular-nums text-cat">
                  {Math.round(average * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3">
                {concepts.map((concept) => (
                  <ConceptNode
                    key={concept.id}
                    concept={concept}
                    memory={state.memory[concept.id]}
                    allMemory={state.memory}
                    today={today}
                    onSelect={() => setSelectedId(concept.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <Link
          to="/review"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Target className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block font-display text-sm font-bold">Strengthen a weak concept</span>
            <span className="block text-xs text-muted-foreground">
              Short retrieval sessions adapt to your answers.
            </span>
          </span>
          <ArrowLeft className="size-4 rotate-180 text-muted-foreground" />
        </Link>
      </div>

      <BottomSheet
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        cat={selected?.category}
      >
        {selected && (
          <ConceptDetail
            concept={selected}
            memory={state.memory[selected.id]}
            onSelect={(id) => setSelectedId(id)}
          />
        )}
      </BottomSheet>
    </div>
  );
}

function ConceptNode({
  concept,
  memory,
  allMemory,
  today,
  onSelect,
}: {
  concept: Concept;
  memory: ConceptMemory | undefined;
  allMemory: Record<string, ConceptMemory>;
  today: string;
  onSelect: () => void;
}) {
  const level = masteryLevel(memory);
  const strength = memory?.strength ?? 0;
  const due = Boolean(memory && memory.attempts > 0 && memory.dueDay <= today);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex flex-col rounded-2xl border p-3 text-left transition-all active:scale-[0.98]",
        level === "unseen" && "border-border bg-background/40",
        level !== "unseen" && !due && "border-border bg-secondary/40",
        due && "border-accent/60 bg-accent/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", LEVEL_TEXT[level])}>
          {MASTERY_LABEL[level]}
        </span>
        {due && <span className="size-2 rounded-full bg-accent" aria-label="Due for review" />}
        {level === "mastered" && <Check className="size-3.5 text-success" />}
      </div>
      <p className="mt-1.5 text-xs font-bold leading-tight">{concept.name}</p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-background/60">
        <div
          className={cn(
            "h-full rounded-full",
            level === "mastered" ? "bg-success" : due ? "bg-accent" : "bg-cat",
          )}
          style={{ width: `${Math.max(4, Math.round(strength * 100))}%` }}
        />
      </div>
      <p className="mt-1.5 text-[9px] text-muted-foreground">
        {memory?.attempts
          ? `${memory.correct}/${memory.attempts} recalled`
          : prerequisitesMet(concept, allMemory)
            ? "Ready to start"
            : "Builds on another concept"}
      </p>
    </button>
  );
}

function ConceptDetail({
  concept,
  memory,
  onSelect,
}: {
  concept: Concept;
  memory: ConceptMemory | undefined;
  onSelect: (id: string) => void;
}) {
  const category = getCategory(concept.category);
  const level = masteryLevel(memory);
  const strength = Math.round((memory?.strength ?? 0) * 100);
  const accuracy =
    memory && memory.attempts > 0 ? Math.round((memory.correct / memory.attempts) * 100) : 0;
  const dueIn = memory?.attempts ? daysBetween(dayKey(), memory.dueDay) : null;
  const related = relatedConcepts(concept.id);
  const cards = concept.cardIds
    .map((id) => FEED.find((card) => card.id === id))
    .filter((card) => Boolean(card));
  const episodes = concept.episodeIds.map((id) => getEpisode(id)).filter((entry) => Boolean(entry));
  const quests = concept.questIds
    .map((id) => QUESTS.find((quest) => quest.id === id))
    .filter((quest) => Boolean(quest));

  return (
    <div data-cat={concept.category}>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cat">
        <category.icon className="size-3.5" /> {category.name} ·{" "}
        {concept.difficulty === 1 ? "Foundation" : concept.difficulty === 2 ? "Core" : "Advanced"}
      </p>
      <h3 className="mt-1 pr-8 text-2xl font-black">{concept.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground/80">{concept.summary}</p>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={cn(
            "rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            LEVEL_TEXT[level],
          )}
        >
          {MASTERY_LABEL[level]}
        </span>
        {dueIn !== null && dueIn <= 0 && (
          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold text-accent">
            Due for review
          </span>
        )}
        <span className="ml-auto text-xs font-bold tabular-nums text-muted-foreground">
          {strength}% strength
        </span>
      </div>
      <XpBar
        progress={strength / 100}
        tone={level === "mastered" ? "gold" : "cat"}
        size="sm"
        className="mt-2"
      />

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-secondary/60 p-2.5">
          <p className="font-display text-base font-bold tabular-nums">{memory?.attempts ?? 0}</p>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Attempts</p>
        </div>
        <div className="rounded-xl bg-secondary/60 p-2.5">
          <p className="font-display text-base font-bold tabular-nums">{accuracy}%</p>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Accuracy</p>
        </div>
        <div className="rounded-xl bg-secondary/60 p-2.5">
          <p className="font-display text-base font-bold tabular-nums">
            {memory?.interval ? `${memory.interval}d` : "—"}
          </p>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Interval</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-cat bg-cat-soft p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-cat">Why it matters</p>
        <p className="mt-1 text-sm">{concept.why}</p>
      </div>

      {related.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Connections
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {related.map((conceptRelated) => (
              <button
                key={conceptRelated.id}
                onClick={() => onSelect(conceptRelated.id)}
                className="rounded-full border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground"
              >
                {concept.requires.includes(conceptRelated.id) ? "Builds on" : "Related:"}{" "}
                {conceptRelated.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Learn it
        </p>
        {cards.map((card) =>
          card ? (
            <Link
              key={card.id}
              to="/watch/$cardId"
              params={{ cardId: card.id }}
              className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2.5 text-xs font-semibold"
            >
              <Play className="size-3.5 text-cat" /> {card.title}
            </Link>
          ) : null,
        )}
        {episodes.map((entry) =>
          entry ? (
            <Link
              key={entry.episode.id}
              to="/series/$seriesId"
              params={{ seriesId: entry.series.id }}
              search={{ episode: entry.episode.id }}
              className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2.5 text-xs font-semibold"
            >
              <Film className="size-3.5 text-cat" /> {entry.series.title}: {entry.episode.title}
            </Link>
          ) : null,
        )}
        {quests.map((quest) =>
          quest ? (
            <Link
              key={quest.id}
              to="/quests/$questId"
              params={{ questId: quest.id }}
              className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2.5 text-xs font-semibold"
            >
              <Swords className="size-3.5 text-cat" /> {quest.title}
            </Link>
          ) : null,
        )}
        {cards.length + episodes.length + quests.length === 0 && (
          <p className="rounded-xl bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            No lesson attached yet. The practice question is the fastest way in.
          </p>
        )}
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="cat" size="xl" className="flex-1" asChild>
          <Link to="/review" search={{ concept: concept.id }}>
            <Brain /> Practice
          </Link>
        </Button>
        <Button variant="glass" size="xl" asChild>
          <Link
            to="/guide"
            search={{ q: `Explain ${concept.name} with a concrete example.` }}
            aria-label={`Ask the Guide about ${concept.name}`}
          >
            <Sparkles /> Ask
          </Link>
        </Button>
      </div>
      {level === "unseen" && (
        <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <Lock className="size-3" /> Mastery unlocks as you answer questions correctly
        </p>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Check;
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
