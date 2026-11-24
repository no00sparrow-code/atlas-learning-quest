import type { AtlasState } from "./atlas-store";
import type { CategoryId } from "@/data/categories";
import { getCategory } from "@/data/categories";
import type { FeedCard } from "@/data/cards";
import { FEED } from "@/data/cards";
import { SERIES } from "@/data/series";
import { QUESTS } from "@/data/quests";
import { conceptsForContent } from "@/data/concepts";
import { levelFromXp } from "./progression";
import { categoryStrength, dueCount, weakConcepts } from "./memory";
import { seriesOverview, type SeriesOverview } from "./library";
import { dayKey } from "./streak";

const DAY = 86_400_000;
const TODAY = () => dayKey();

export interface NextStepAction {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
}

export interface NextStep {
  id: string;
  kind: "review" | "short" | "episode" | "quest";
  title: string;
  subtitle: string;
  category?: CategoryId;
  minutes: number;
  xp: number;
  /** Human-readable explanation of why this was selected */
  reason: string;
  action: NextStepAction;
}

interface Scored<T> {
  item: T;
  score: number;
  reason: string;
}

function recentShort(state: AtlasState, id: string, now: number): boolean {
  const entry = state.history.find((h) => h.kind === "short" && h.id === id);
  return Boolean(entry && now - entry.at < 2 * DAY);
}

function conceptGap(state: AtlasState, conceptIds: string[]): string | undefined {
  for (const id of conceptIds) {
    const record = state.memory[id];
    if (record && record.attempts > 0 && record.strength < 0.55) return id;
  }
  return undefined;
}

/** Explainable ordering for short cards. Completed lessons are kept but demoted. */
export function scoreShort(
  state: AtlasState,
  card: FeedCard,
  now: number = Date.now(),
): Scored<FeedCard> {
  let score = 0;
  const reasons: string[] = [];
  const category = getCategory(card.category);

  if (state.interests.includes(card.category)) {
    score += 2.5;
    reasons.push(`Matches your interest in ${category.name}`);
  }

  const conceptIds = conceptsForContent("short", card.id).map((c) => c.id);
  const gap = conceptGap(state, conceptIds);
  if (gap) {
    score += 3.5;
    reasons.push("Builds on a concept you are still strengthening");
  }

  if (categoryStrength(state.memory, card.category) < 0.4) score += 1;

  if (state.shorts[card.id]?.completed) {
    score -= 4;
  } else {
    score += 1;
  }

  if (recentShort(state, card.id, now)) score -= 3;

  if (reasons.length === 0) reasons.push("A quick win for today");

  return { item: card, score, reason: reasons[0] ?? "A quick win for today" };
}

/** For You ordering. Stable when scores tie, so the feed does not shuffle. */
export function rankShorts(state: AtlasState, now: number = Date.now()): FeedCard[] {
  return FEED.map((card, index) => ({ ...scoreShort(state, card, now), index }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}

function scoreSeries(
  state: AtlasState,
  overview: SeriesOverview,
  now: number,
): Scored<SeriesOverview> | null {
  const series = SERIES.find((s) => s.id === overview.id);
  if (!series) return null;
  if (overview.completed === overview.total) return null;
  if (levelFromXp(state.xp).level < series.unlockLevel) return null;

  let score = 0;
  const reasons: string[] = [];
  if (overview.started) {
    score += 4;
    reasons.push("Continue the series you already started");
  }
  if (state.interests.includes(series.category)) {
    score += 2;
    reasons.push(`Because you follow ${getCategory(series.category).name}`);
  }
  const gap = conceptGap(
    state,
    conceptsForContent("episode", overview.nextEpisodeId ?? "").map((c) => c.id),
  );
  if (gap) {
    score += 2.5;
    reasons.push("Covers a topic you are working on");
  }
  if (categoryStrength(state.memory, series.category) < 0.35) score += 1;
  void now;

  return { item: overview, score, reason: reasons[0] ?? "A deep dive worth starting" };
}

export function rankSeries(state: AtlasState, now: number = Date.now()): SeriesOverview[] {
  return seriesOverview(state)
    .map((overview) => ({ overview, scored: scoreSeries(state, overview, now) }))
    .filter(
      (entry): entry is { overview: SeriesOverview; scored: Scored<SeriesOverview> } =>
        entry.scored !== null,
    )
    .sort((a, b) => b.scored.score - a.scored.score)
    .map((entry) => entry.overview);
}

/**
 * The "what should I do next" engine. Retrieval before consumption:
 * reviews and gaps outrank new lessons, and every result carries a reason.
 */
export function recommendNext(
  state: AtlasState,
  limit = 4,
  today: string = TODAY(),
  now: number = Date.now(),
): NextStep[] {
  const results: NextStep[] = [];
  const due = dueCount(state.memory, today);

  if (due > 0) {
    results.push({
      id: "review-due",
      kind: "review",
      title: `${due} concept${due === 1 ? "" : "s"} due for review`,
      subtitle: "Retrieve before you forget. A few minutes is enough.",
      minutes: Math.max(2, Math.min(10, due * 2)),
      xp: due * 6,
      reason: "Spaced repetition kept your streak and your memory alive",
      action: { to: "/review" },
    });
  } else {
    const weak = weakConcepts(state.memory, 1)[0];
    if (weak) {
      results.push({
        id: `repair-${weak.concept.id}`,
        kind: "review",
        title: `Repair: ${weak.concept.name}`,
        subtitle: weak.concept.summary,
        category: weak.concept.category,
        minutes: 3,
        xp: 6,
        reason: "You missed this recently, so it is worth another retrieval",
        action: { to: "/review", search: { concept: weak.concept.id } },
      });
    }
  }

  const shortScores = FEED.filter((card) => !state.shorts[card.id]?.completed)
    .map((card) => scoreShort(state, card, now))
    .sort((a, b) => b.score - a.score);

  const topShort = shortScores[0];
  if (topShort) {
    results.push({
      id: topShort.item.id,
      kind: "short",
      title: topShort.item.title,
      subtitle: topShort.item.hook,
      category: topShort.item.category,
      minutes: Math.max(1, Math.round(topShort.item.seconds / 60)),
      xp: 15,
      reason: topShort.reason,
      action: { to: "/watch/$cardId", params: { cardId: topShort.item.id } },
    });
  }

  const series = rankSeries(state, now).find((entry) => entry.nextEpisodeId);
  if (series) {
    const full = SERIES.find((s) => s.id === series.id);
    const next = full?.episodes.find((e) => e.id === series.nextEpisodeId);
    if (full && next) {
      results.push({
        id: next.id,
        kind: "episode",
        title: next.title,
        subtitle: full.title,
        category: full.category,
        minutes: Math.round(next.seconds / 60),
        xp: Math.max(20, Math.min(80, Math.round((next.seconds / 60) * 2.5))),
        reason: series.started
          ? "Continue the deep dive you already started"
          : "The best deep dive for your current interests",
        action: {
          to: "/series/$seriesId",
          params: { seriesId: full.id },
          search: { episode: next.id },
        },
      });
    }
  }

  const openQuests = QUESTS.filter((quest) => !state.completedQuests[quest.id]);
  const quest =
    openQuests.find((entry) => state.interests.includes(entry.category)) ?? openQuests[0];
  if (quest) {
    results.push({
      id: quest.id,
      kind: "quest",
      title: quest.title,
      subtitle: quest.subtitle,
      category: quest.category,
      minutes: quest.minutes,
      xp: quest.reward,
      reason: "Turn what you have watched into demonstrated knowledge",
      action: { to: "/quests/$questId", params: { questId: quest.id } },
    });
  }

  const seenKinds = new Set<NextStep["kind"]>();
  return results
    .filter((step) => {
      if (seenKinds.has(step.kind) && step.kind !== "review") return false;
      seenKinds.add(step.kind);
      return true;
    })
    .slice(0, limit);
}
