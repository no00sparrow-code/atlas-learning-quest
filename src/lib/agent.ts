import type { AtlasState } from "./atlas-store";
import type { CategoryId } from "@/data/categories";
import { CATEGORIES, getCategory } from "@/data/categories";
import { FEED, type FeedCard } from "@/data/cards";
import {
  ALL_EPISODES,
  SERIES,
  episodeXp,
  formatDuration,
  getSeries,
  type Episode,
} from "@/data/series";
import { QUESTS, type Quest } from "@/data/quests";
import { SKILLS } from "@/data/skills";
import { ACHIEVEMENTS } from "@/data/achievements";
import { CONCEPTS } from "@/data/concepts";
import { REVIEW_QUESTIONS } from "@/data/reviewQuestions";
import { availableSkillPoints, levelFromXp } from "./progression";
import { buildSnapshot, DAILY_GOAL_XP, todayXp as computeTodayXp } from "./metrics";
import { continueWatching } from "./library";
import {
  dueConcepts,
  masteredConcepts,
  retentionRate,
  weakConcepts as weakestConcepts,
} from "./memory";
import { dayKey, streakAtRisk } from "./streak";

/**
 * Atlas Guide — a retrieval + intent agent over the learning library.
 *
 * It deliberately runs locally: no key, no network, instant on mobile. The
 * `askAtlas(question, context)` boundary is the seam where a hosted model could
 * be added later without changing the UI.
 */

export interface AgentAction {
  label: string;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
}

export interface AgentReply {
  text: string;
  actions: AgentAction[];
  suggestions: string[];
}

export interface AgentContext {
  name: string;
  level: number;
  xpIntoLevel: number;
  xpNeeded: number;
  streak: number;
  bestStreak: number;
  todayXp: number;
  skillPoints: number;
  interests: CategoryId[];
  completedShorts: string[];
  completedEpisodes: string[];
  completedQuests: string[];
  inProgress: {
    id: string;
    kind: "short" | "episode";
    title: string;
    seriesId?: string;
    position: number;
  }[];
  achievements: number;
  achievementTotal: number;
  savedCount: number;
  activeToday: boolean;
  streakAtRisk: boolean;
  dueReviews: number;
  weakConcepts: { id: string; name: string; strength: number }[];
  /** 0–100 demonstrated recall accuracy */
  retention: number;
  mastered: number;
}

export function buildAgentContext(state: AtlasState): AgentContext {
  const level = levelFromXp(state.xp);
  const today = dayKey();
  return {
    name: state.name.split(" ")[0] ?? state.name,
    level: level.level,
    xpIntoLevel: level.current,
    xpNeeded: level.needed,
    streak: state.streak,
    bestStreak: state.bestStreak,
    todayXp: computeTodayXp(state, today),
    skillPoints: availableSkillPoints(
      level.level,
      Object.keys(state.completedQuests).length,
      state.unlockedSkills.length,
    ),
    interests: state.interests,
    completedShorts: FEED.filter((c) => state.shorts[c.id]?.completed).map((c) => c.id),
    completedEpisodes: ALL_EPISODES.filter((e) => state.episodes[e.id]?.completed).map((e) => e.id),
    completedQuests: Object.keys(state.completedQuests),
    inProgress: continueWatching(state, 3).map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      ...(item.seriesId ? { seriesId: item.seriesId } : {}),
      position: item.position,
    })),
    achievements: Object.keys(state.achievements).length,
    achievementTotal: ACHIEVEMENTS.length,
    savedCount: state.saved.length,
    activeToday: state.lastActiveDay === today,
    streakAtRisk: streakAtRisk(state.lastActiveDay, today),
    dueReviews: dueConcepts(state.memory, today).length,
    weakConcepts: weakestConcepts(state.memory, 3).map((item) => ({
      id: item.concept.id,
      name: item.concept.name,
      strength: Math.round(item.memory.strength * 100),
    })),
    retention: Math.round(retentionRate(state.memory) * 100),
    mastered: masteredConcepts(state.memory).length,
  };
}

/* ------------------------------------------------------------------ actions */

const shortAction = (card: FeedCard): AgentAction => ({
  label: `Watch “${card.title}”`,
  to: "/watch/$cardId",
  params: { cardId: card.id },
});

const episodeAction = (episode: Episode, label?: string): AgentAction => {
  const series = getSeries(episode.seriesId);
  return {
    label: label ?? `Play E${episode.number}: ${episode.title}`,
    to: "/series/$seriesId",
    params: { seriesId: series?.id ?? episode.seriesId },
    search: { episode: episode.id },
  };
};

const seriesAction = (seriesId: string, label?: string): AgentAction => {
  const series = getSeries(seriesId);
  return {
    label: label ?? `Open “${series?.title ?? "series"}”`,
    to: "/series/$seriesId",
    params: { seriesId },
  };
};

const questAction = (quest: Quest, label?: string): AgentAction => ({
  label: label ?? `Start “${quest.title}” (+${quest.reward} XP)`,
  to: "/quests/$questId",
  params: { questId: quest.id },
});

const LIBRARY_ACTION: AgentAction = { label: "Open your Library", to: "/library" };
const DISCOVER_ACTION: AgentAction = { label: "Browse Discover", to: "/" };
const PROFILE_ACTION: AgentAction = { label: "Open Profile", to: "/profile" };
const WORLD_ACTION: AgentAction = { label: "Open the World map", to: "/world" };
const QUESTS_ACTION: AgentAction = { label: "Browse all Quests", to: "/quests" };
const REVIEW_ACTION: AgentAction = { label: "Start a review session", to: "/review" };
const MAP_ACTION: AgentAction = { label: "Open the knowledge map", to: "/map" };

const SUGGESTIONS = [
  "What should I review?",
  "What should I learn today?",
  "Explain the spotlight effect",
  "How do streaks work?",
  "I have 10 minutes",
];

/* ------------------------------------------------------------------- search */

export interface SearchHit {
  kind: "short" | "episode" | "series" | "quest" | "skill" | "concept";
  id: string;
  title: string;
  category: CategoryId;
  snippet: string;
  bullets: string[];
  keywords: string;
  score: number;
  action: AgentAction;
}

type Doc = Omit<SearchHit, "score">;

function buildIndex(): Doc[] {
  const docs: Doc[] = [];
  for (const card of FEED) {
    docs.push({
      kind: "short",
      id: card.id,
      title: card.title,
      category: card.category,
      snippet: card.hook,
      bullets: [...card.points, `Key idea: ${card.takeaway}`],
      keywords: [
        card.title,
        card.hook,
        card.takeaway,
        card.creatorName,
        getCategory(card.category).name,
        ...card.points,
      ].join(" "),
      action: shortAction(card),
    });
  }
  for (const series of SERIES) {
    docs.push({
      kind: "series",
      id: series.id,
      title: series.title,
      category: series.category,
      snippet: series.blurb,
      bullets: series.episodes.slice(0, 2).map((e) => `E${e.number}: ${e.title}`),
      keywords: [
        series.title,
        series.subtitle,
        series.blurb,
        series.creatorName,
        getCategory(series.category).name,
      ].join(" "),
      action: seriesAction(series.id),
    });
    for (const episode of series.episodes) {
      docs.push({
        kind: "episode",
        id: episode.id,
        title: `${series.title} · ${episode.title}`,
        category: series.category,
        snippet: episode.summary,
        bullets: episode.takeaways.slice(0, 2),
        keywords: [
          episode.title,
          episode.summary,
          series.title,
          series.subtitle,
          getCategory(series.category).name,
          ...episode.takeaways,
          ...episode.chapters.map((c) => c.label),
        ].join(" "),
        action: episodeAction(episode),
      });
    }
  }
  for (const quest of QUESTS) {
    docs.push({
      kind: "quest",
      id: quest.id,
      title: quest.title,
      category: quest.category,
      snippet: quest.subtitle,
      bullets: [
        `${quest.type === "quiz" ? "Quiz" : quest.type === "mystery" ? "Mystery" : "Challenge"} · ${quest.difficulty} · ${quest.minutes} min`,
        `Reward: up to ${quest.reward} XP`,
      ],
      keywords: [
        quest.title,
        quest.subtitle,
        getCategory(quest.category).name,
        quest.type,
        ...(quest.type === "mystery" ? [quest.premise] : []),
        ...(quest.type === "quiz" ? quest.questions.map((q) => q.question) : []),
      ].join(" "),
      action: questAction(quest),
    });
  }
  for (const skill of SKILLS) {
    docs.push({
      kind: "skill",
      id: skill.id,
      title: skill.name,
      category: skill.category,
      snippet: skill.description,
      bullets: [`Perk: ${skill.perk}`, `Tier ${skill.tier}`],
      keywords: [skill.name, skill.description, skill.perk, getCategory(skill.category).name].join(
        " ",
      ),
      action: WORLD_ACTION,
    });
  }
  for (const concept of CONCEPTS) {
    docs.push({
      kind: "concept",
      id: concept.id,
      title: concept.name,
      category: concept.category,
      snippet: concept.summary,
      bullets: [concept.why],
      keywords: [
        concept.name,
        concept.summary,
        concept.why,
        getCategory(concept.category).name,
        ...concept.related,
      ].join(" "),
      action: {
        label: `Open “${concept.name}” in the knowledge map`,
        to: "/map",
        search: { concept: concept.id },
      },
    });
  }
  return docs;
}

const INDEX = buildIndex();

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "what",
  "want",
  "know",
  "about",
  "tell",
  "explain",
  "please",
  "from",
  "have",
  "does",
  "your",
  "you",
  "can",
  "how",
  "why",
  "who",
  "when",
  "where",
  "are",
  "was",
  "were",
  "will",
  "would",
  "should",
  "could",
  "some",
  "more",
  "into",
  "them",
  "they",
  "there",
  "here",
  "give",
  "show",
  "learn",
  "learning",
  "need",
  "help",
  "with",
  "any",
  "something",
  "anything",
  "today",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

/** Ranked library search. Exported so the agent behaviour is testable. */
export function searchAtlas(query: string, category?: CategoryId): SearchHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const scored: SearchHit[] = [];
  for (const doc of INDEX) {
    if (category && doc.category !== category) continue;
    const title = doc.title.toLowerCase();
    const keywords = doc.keywords.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (title.includes(token)) score += 6;
      else if (keywords.includes(token)) score += 2;
    }
    if (category && doc.category === category) score += 1;
    if (score > 0) scored.push({ ...doc, score });
  }
  const kindRank: Record<SearchHit["kind"], number> = {
    short: 0,
    episode: 1,
    series: 2,
    concept: 3,
    quest: 4,
    skill: 5,
  };
  return scored.sort(
    (a, b) =>
      b.score - a.score || kindRank[a.kind] - kindRank[b.kind] || a.title.localeCompare(b.title),
  );
}

/* ---------------------------------------------------------------- utilities */

const CATEGORY_HINTS: Record<CategoryId, string[]> = {
  psychology: [
    "mind",
    "brain",
    "bias",
    "memory",
    "forget",
    "remember",
    "psychology",
    "habit",
    "emotion",
    "behavior",
  ],
  science: ["space", "universe", "star", "physics", "biology", "science", "cosmos", "quantum"],
  history: ["history", "rome", "roman", "ancient", "empire", "past", "historical"],
  technology: ["tech", "ai", "computer", "code", "internet", "robot", "machine", "algorithm"],
  creativity: ["creative", "creativity", "idea", "ideas", "art", "writing", "design", "invent"],
  business: ["business", "price", "pricing", "startup", "money", "market", "strategy", "economics"],
};

function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function detectCategory(text: string): CategoryId | undefined {
  for (const category of CATEGORIES) {
    if (hasWord(text, category.name) || hasWord(text, category.realm)) return category.id;
  }
  for (const [id, hints] of Object.entries(CATEGORY_HINTS) as [CategoryId, string[]][]) {
    if (hints.some((hint) => hasWord(text, hint))) return id;
  }
  return undefined;
}

function detectMinutes(text: string): number | undefined {
  const match = text.match(/(\d+)\s*(min|minute|hour|hr)/);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (Number.isNaN(value)) return undefined;
  return match[2]?.startsWith("h") ? value * 60 : value;
}

const pct = (value: number) => `${Math.round(value * 100)}%`;

function clip(text: string, max = 160): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function reply(text: string, actions: AgentAction[] = [], suggestions = SUGGESTIONS): AgentReply {
  return { text, actions, suggestions };
}

function pickShort(ctx: AgentContext, category?: CategoryId): FeedCard | undefined {
  const pending = FEED.filter((card) => !ctx.completedShorts.includes(card.id));
  if (category) {
    const match = pending.find((card) => card.category === category);
    if (match) return match;
  }
  for (const interest of ctx.interests) {
    const match = pending.find((card) => card.category === interest);
    if (match) return match;
  }
  return pending[0];
}

function pickEpisode(
  ctx: AgentContext,
  category?: CategoryId,
): { episode: Episode; seriesId: string } | undefined {
  const candidates: { episode: Episode; seriesId: string; priority: number }[] = [];
  for (const series of SERIES) {
    if (category && series.category !== category) continue;
    const episode = series.episodes.find((e) => !ctx.completedEpisodes.includes(e.id));
    if (!episode) continue;
    const priority = ctx.interests.includes(series.category) ? 1 : 2;
    candidates.push({ episode, seriesId: series.id, priority });
  }
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0];
}

function pickQuest(ctx: AgentContext, category?: CategoryId): Quest | undefined {
  const open = QUESTS.filter((quest) => !ctx.completedQuests.includes(quest.id));
  if (category) {
    const match = open.find((quest) => quest.category === category);
    if (match) return match;
  }
  return open[0];
}

/* ------------------------------------------------------------------ replies */

export function greeting(ctx: AgentContext): AgentReply {
  const first = ctx.inProgress[0];
  const actions: AgentAction[] = [];
  if (ctx.dueReviews > 0) actions.push(REVIEW_ACTION);
  if (first) {
    actions.push(
      first.kind === "episode" && first.seriesId
        ? seriesAction(first.seriesId, `Resume “${first.title}”`)
        : { label: `Resume “${first.title}”`, to: "/watch/$cardId", params: { cardId: first.id } },
    );
  }
  actions.push(DISCOVER_ACTION);
  const dueLine =
    ctx.dueReviews > 0
      ? `\n\n${ctx.dueReviews} concept${ctx.dueReviews === 1 ? " is" : "s are"} due for review — a few minutes now is worth more than a new lesson.`
      : "";
  return reply(
    `Hey ${ctx.name}, I'm Atlas Guide.\n\nYou're level ${ctx.level} with a ${ctx.streak}-day streak and ${ctx.todayXp}/${DAILY_GOAL_XP} XP toward today's goal.${dueLine}\n\nI can explain a concept, build a study plan around the time you have, quiz you, or point you to the right screen.\n\nWhat are you curious about?`,
    actions,
  );
}

function capabilities(): AgentReply {
  return reply(
    "I can do six things:\n\n• Explain a concept using lessons in the Atlas library\n• Recommend what to watch next — shorts or full deep dives\n• Build a plan for the time you have\n• Set retrieval-practice questions and explain mistakes\n• Show what is due for review and where your gaps are\n• Help with navigation, streaks, XP and achievements\n\nAsk naturally: “what should I review?”, “why do I forget things?”, “I have 8 minutes”, or “where are my saved videos?”",
    [DISCOVER_ACTION, REVIEW_ACTION],
    [
      "What should I review?",
      "Where are my saved videos?",
      "Why do I forget things?",
      "I have 8 minutes",
    ],
  );
}

function libraryReply(ctx: AgentContext): AgentReply {
  const actions: AgentAction[] = [LIBRARY_ACTION];
  const resume = ctx.inProgress[0];
  if (resume) {
    actions.push(
      resume.kind === "episode" && resume.seriesId
        ? seriesAction(resume.seriesId, `Resume “${resume.title}”`)
        : {
            label: `Resume “${resume.title}”`,
            to: "/watch/$cardId",
            params: { cardId: resume.id },
          },
    );
  }
  const resumeLine = resume
    ? `\n\nYou have ${ctx.inProgress.length} thing${ctx.inProgress.length === 1 ? "" : "s"} in progress — “${resume.title}” is ${pct(resume.position)} watched.`
    : "";
  return reply(
    `Your Library is the personal side of Atlas: Continue watching, Saved, Liked and History, all in one place. You have ${ctx.savedCount} saved item${ctx.savedCount === 1 ? "" : "s"}.${resumeLine}\n\nTap the bookmark on any lesson to save it, or the heart to keep it in Liked.`,
    actions,
    ["What should I learn today?", "How do achievements work?", "Show my progress"],
  );
}

function streakReply(ctx: AgentContext): AgentReply {
  const status = ctx.activeToday
    ? `You've already earned XP today, so your ${ctx.streak}-day streak is safe.`
    : ctx.streakAtRisk
      ? `Your ${ctx.streak}-day streak is waiting — one finished lesson today keeps it alive.`
      : `Your streak is at ${ctx.streak} days. Finish any lesson to start the next one.`;
  return reply(
    `${status}\n\nStreaks count calendar days with at least one completed lesson — a short card is enough. Miss a day and it resets to 1, so a two-minute lesson is always better than a perfect plan.\n\nYour best run so far: ${ctx.bestStreak} days. Today you're at ${ctx.todayXp}/${DAILY_GOAL_XP} XP; hitting the goal also unlocks a +30 XP bonus.`,
    [DISCOVER_ACTION, { label: "Set up today's plan", to: "/guide" }],
    ["What should I learn today?", "How do achievements work?", "Show my progress"],
  );
}

function achievementsReply(ctx: AgentContext): AgentReply {
  const snapshot = {
    streak: ctx.streak,
    bestStreak: ctx.bestStreak,
  };
  const next = ACHIEVEMENTS.filter((a) => a.id !== "on-fire").find(
    (a) => a.target > snapshot.streak,
  );
  const nextLine =
    next && next.target <= 10
      ? `\n\nClosest badge: ${next.name} — ${next.description.toLowerCase()}.`
      : "\n\nOpen Profile to see progress bars on every locked badge.";
  return reply(
    `You've unlocked ${ctx.achievements} of ${ctx.achievementTotal} achievements.${nextLine}\n\nAchievements track depth, not just time: complete a deep-dive episode, finish a whole series, ace a quiz, solve a mystery, keep a 7-day streak, or learn across all six realms.`,
    [PROFILE_ACTION, DISCOVER_ACTION],
    ["What should I learn today?", "How do streaks work?", "Show my progress"],
  );
}

function progressReply(ctx: AgentContext): AgentReply {
  const toNext = Math.max(0, ctx.xpNeeded - ctx.xpIntoLevel);
  const goal =
    ctx.todayXp >= DAILY_GOAL_XP
      ? "Today's goal is done — the +30 XP bonus is ready in Library."
      : `${DAILY_GOAL_XP - ctx.todayXp} XP left on today's goal.`;
  const actions: AgentAction[] = [QUESTS_ACTION];
  if (ctx.skillPoints > 0) actions.push(WORLD_ACTION);
  return reply(
    `Level ${ctx.level} · ${ctx.xpIntoLevel}/${ctx.xpNeeded} XP (${toNext} to level ${ctx.level + 1}).\n${ctx.streak}-day streak · best ${ctx.bestStreak} days · ${ctx.todayXp} XP today.\n\n${goal}\nDemonstrated recall: ${ctx.retention}% · ${ctx.mastered} concepts mastered · ${ctx.dueReviews} due for review.\n${ctx.achievements}/${ctx.achievementTotal} achievements · ${ctx.skillPoints} skill point${ctx.skillPoints === 1 ? "" : "s"} ready.\n\nXP for genuine learning: review correctly (+6, capped), finish a short (+15), a deep-dive episode (+20–80), or a quiz (+70–120).`,
    actions,
    ["What should I review?", "What should I learn today?", "How do streaks work?"],
  );
}

function profileReply(ctx: AgentContext): AgentReply {
  return reply(
    `Profile is where you tune the feed and track the long game.\n\n• Interests shape the For You ordering — add psychology, history, whatever pulls you in\n• Ambitions are your own goals, shown back to you daily\n• Realm mastery shows how deep you've gone in each of the six areas\n• Reset demo progress lives at the bottom\n\nYou currently follow ${ctx.interests.length} interest${ctx.interests.length === 1 ? "" : "s"}.`,
    [PROFILE_ACTION],
    ["What should I learn today?", "Show my progress", "How do achievements work?"],
  );
}

function reviewReply(ctx: AgentContext): AgentReply {
  const due = ctx.dueReviews;
  const weak = ctx.weakConcepts;
  if (due > 0) {
    const names = weak.length
      ? `\n\nWeakest right now: ${weak.map((c) => `${c.name} (${c.strength}%)`).join(", ")}.`
      : "";
    return reply(
      `You have ${due} concept${due === 1 ? "" : "s"} due for review. Retrieval is the part that actually builds memory — recognising a video again is not the same as being able to recall it.${names}\n\nA session is about ${Math.max(2, Math.min(10, due * 2))} minutes. Get one right and the next review moves further out; miss it and it comes back tomorrow.`,
      [REVIEW_ACTION, MAP_ACTION],
      ["What should I learn today?", "Quiz me instead", "Show my progress"],
    );
  }
  if (weak.length > 0) {
    const first = weak[0] as { id: string; name: string; strength: number };
    return reply(
      `Nothing is due today, but ${weak.length} concept${weak.length === 1 ? " is" : "s are"} still shaky: ${weak.map((c) => `${c.name} (${c.strength}%)`).join(", ")}.\n\nA short repair session on ${first.name} would be the highest-value thing you could do right now.`,
      [{ label: `Review ${first.name}`, to: "/review", search: { concept: first.id } }, MAP_ACTION],
      ["What should I learn today?", "Quiz me instead", "Show my progress"],
    );
  }
  return reply(
    `Your review queue is clear. ${ctx.mastered} concept${ctx.mastered === 1 ? "" : "s"} mastered, ${ctx.retention}% recall accuracy so far.\n\nI can start a practice round on new concepts whose prerequisites you have already met, or you can add something new to the map.`,
    [{ label: "Practice new concepts", to: "/review", search: { mode: "practice" } }, MAP_ACTION],
    ["What should I learn today?", "Show my progress", "I have 10 minutes"],
  );
}

function mapReply(ctx: AgentContext): AgentReply {
  return reply(
    `The knowledge map connects all ${CONCEPTS.length} concepts Atlas teaches. Each node shows demonstrated mastery, the lessons that explain it, and what it builds on.\n\nYou have mastered ${ctx.mastered} and your recall accuracy is ${ctx.retention}%. ${ctx.weakConcepts.length > 0 ? `Start with ${ctx.weakConcepts[0]?.name ?? "your weakest node"} — it is the lowest-confidence concept on the map.` : "Pick any unlocked concept to see what to learn next."}`,
    [MAP_ACTION, REVIEW_ACTION],
    ["What should I review?", "What should I learn today?", "Show my progress"],
  );
}

function practiceReply(ctx: AgentContext, category?: CategoryId): AgentReply {
  const question = category
    ? REVIEW_QUESTIONS.find((q) => q.category === category)
    : (REVIEW_QUESTIONS.find((q) => q.conceptId === ctx.weakConcepts[0]?.id) ??
      REVIEW_QUESTIONS[0]);
  if (!question) return capabilities();
  const concept = CONCEPTS.find((c) => c.id === question.conceptId);
  return reply(
    `Here's a retrieval question on “${concept?.name ?? "this concept"}”:\n\n${question.prompt}\n\n${question.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join("\n")}\n\nI'll keep the answer hidden. Open Review to answer it and get the explanation — a wrong answer is useful data, not a failure.`,
    [
      {
        label: "Answer in Review",
        to: "/review",
        search: { concept: question.conceptId },
      },
      MAP_ACTION,
    ],
    ["What should I review?", "What should I learn today?", "Show my progress"],
  );
}

function supportReply(): AgentReply {
  return reply(
    "Sorry you're stuck. A few things fix most Atlas problems:\n\n• Progress is stored locally in this browser, so clearing site data starts you fresh\n• If a screen looks wrong, pull to refresh — playback position and XP are saved\n• To start over deliberately, open Profile → Reset demo progress\n• Playback is simulated in this prototype; tapping pauses, swiping moves on\n\nIf something still feels broken after a refresh, tell me which screen and what you expected.",
    [PROFILE_ACTION, LIBRARY_ACTION],
    ["How do I reset my progress?", "Where are my saved videos?", "What can you do?"],
  );
}

function quizReply(ctx: AgentContext, category?: CategoryId): AgentReply {
  const quest =
    (category
      ? QUESTS.find((q) => q.category === category && !ctx.completedQuests.includes(q.id))
      : undefined) ??
    pickQuest(ctx, category) ??
    QUESTS[0];
  if (!quest) return capabilities();
  const kind = quest.type === "mystery" ? "mystery" : quest.type === "quiz" ? "quiz" : "challenge";
  return reply(
    `Here's one: “${quest.title}” — a ${quest.minutes}-minute ${kind} in ${getCategory(quest.category).name}, worth up to ${quest.reward} XP.\n\n${clip(quest.subtitle, 140)}\n\nAnswer wrong and you still get the explanation, so it's a low-risk way to find gaps.`,
    [questAction(quest), QUESTS_ACTION],
    category ? ["Quiz me on something else", "What should I learn today?"] : SUGGESTIONS,
  );
}

function planReply(ctx: AgentContext, category?: CategoryId): AgentReply {
  const short = pickShort(ctx, category);
  const long = pickEpisode(ctx, category);
  const quest = pickQuest(ctx, category);
  const actions: AgentAction[] = [];
  const lines: string[] = [`Here's a plan for today, ${ctx.name}:`];
  let index = 1;
  let minutes = 0;
  let xp = 0;

  if (short) {
    const seconds = Math.max(1, Math.round(short.seconds / 60));
    minutes += seconds;
    xp += 15;
    lines.push(`${index}. ${short.seconds}s warm-up — “${short.title}” (+15 XP)`);
    actions.push(shortAction(short));
    index += 1;
  }
  if (long) {
    const series = getSeries(long.seriesId);
    minutes += Math.round(long.episode.seconds / 60);
    xp += episodeXp(long.episode.seconds);
    lines.push(
      `${index}. One episode from “${series?.title ?? "a series"}” — E${long.episode.number} “${long.episode.title}” (${formatDuration(long.episode.seconds)}, +${episodeXp(long.episode.seconds)} XP)`,
    );
    actions.push(episodeAction(long.episode, `Play E${long.episode.number}`));
    index += 1;
  }
  if (quest) {
    minutes += quest.minutes;
    xp += quest.reward;
    lines.push(
      `${index}. A ${quest.type} — “${quest.title}” (${quest.minutes} min, up to +${quest.reward} XP)`,
    );
    actions.push(questAction(quest, `Start “${quest.title}”`));
  }
  lines.push(
    `\nAbout ${minutes} minutes, up to +${xp} XP. Finish the first item and your streak is safe.`,
  );
  return reply(lines.join("\n"), actions, [
    "I only have 5 minutes",
    "Show my progress",
    "Explain the spotlight effect",
  ]);
}

function recommendReply(ctx: AgentContext, question: string, category?: CategoryId): AgentReply {
  const minutes = detectMinutes(question);
  const resume = question.includes("something else") ? undefined : ctx.inProgress[0];

  if (minutes !== undefined && minutes <= 6) {
    const card = pickShort(ctx, category);
    if (card) {
      return reply(
        `With ${minutes} minute${minutes === 1 ? "" : "s"}, take a short: “${card.title}” (${card.seconds}s).\n\n${clip(card.hook, 150)}\n\nThat's +15 XP and keeps your streak alive.`,
        [shortAction(card), DISCOVER_ACTION],
        ["Something longer", "Quiz me instead", "What should I learn today?"],
      );
    }
  }

  if (ctx.dueReviews > 0 && !category && minutes === undefined) {
    const card = pickShort(ctx);
    const actions: AgentAction[] = [REVIEW_ACTION];
    if (card) actions.push(shortAction(card));
    return reply(
      `Before new material: ${ctx.dueReviews} concept${ctx.dueReviews === 1 ? " is" : "s are"} due for review. Retrieval first is the highest-value use of ten minutes.\n\nAfter that, a short: “${card?.title ?? "pick one in Discover"}”.`,
      actions,
      ["What should I learn today?", "I have 10 minutes", "Show my progress"],
    );
  }

  if (resume && !category) {
    const action =
      resume.kind === "episode" && resume.seriesId
        ? seriesAction(resume.seriesId, `Resume “${resume.title}”`)
        : {
            label: `Resume “${resume.title}”`,
            to: "/watch/$cardId",
            params: { cardId: resume.id },
          };
    return reply(
      `Pick up where you left off: “${resume.title}” is ${pct(resume.position)} finished.\n\nIf you'd rather start something new, say “something else” and I'll suggest a fresh lesson.`,
      [action, LIBRARY_ACTION],
      ["Something else", "What should I learn today?", "I have 10 minutes"],
    );
  }

  const short = pickShort(ctx, category);
  const long = pickEpisode(ctx, category);
  const actions: AgentAction[] = [];
  const parts: string[] = [];
  if (short) {
    parts.push(`A quick one: “${short.title}” (${short.seconds}s, +15 XP).`);
    actions.push(shortAction(short));
  }
  if (long) {
    const series = getSeries(long.seriesId);
    parts.push(
      `Go deeper: “${series?.title ?? "series"}” — E${long.episode.number} “${long.episode.title}” (${formatDuration(long.episode.seconds)}, +${episodeXp(long.episode.seconds)} XP).`,
    );
    actions.push(episodeAction(long.episode, `Watch “${long.episode.title}”`));
  }
  if (!short && !long) {
    return reply(
      "You've finished everything in that realm for now. A quest is the next best way to push your level.",
      [QUESTS_ACTION, WORLD_ACTION],
      SUGGESTIONS,
    );
  }
  const target = category ? getCategory(category) : undefined;
  return reply(
    `${target ? `In ${target.name}, here's` : "Here's"} where I'd start:\n\n${parts.map((p) => `• ${p}`).join("\n")}\n\nWant a quest on top? Say “quiz me on ${target?.name.toLowerCase() ?? "science"}”.`,
    [...actions, category ? { label: `More ${target?.name ?? ""}`, to: "/" } : DISCOVER_ACTION],
    ["I have 10 minutes", "Quiz me instead", "Show my progress"],
  );
}

function explainReply(question: string, category?: CategoryId): AgentReply {
  const hits = searchAtlas(question, category);
  if (hits.length === 0) {
    return reply(
      "I couldn't find a lesson on that in Atlas yet — the library covers psychology, science, history, technology, creativity and business. Try a broader term, or tell me the category and I'll suggest the closest deep dive.",
      [DISCOVER_ACTION, LIBRARY_ACTION],
      SUGGESTIONS,
    );
  }
  // A concept entry is a map destination, not a lesson: prefer something watchable
  // when the library has one, and fall back to the concept for uncovered ideas.
  const best =
    hits.find((hit) => hit.kind === "short") ??
    hits.find((hit) => hit.kind === "episode") ??
    (hits[0] as SearchHit);
  const related = hits.filter((hit) => hit !== best).slice(0, 2);
  const sourceLabel =
    best.kind === "quest"
      ? "from the quest board"
      : best.kind === "skill"
        ? "from the skill tree"
        : best.kind === "concept"
          ? "from your knowledge map"
          : "from the Atlas library";
  const text = [
    `Here's the short version of “${best.title}” ${sourceLabel}:`,
    "",
    best.snippet,
    "",
    ...best.bullets.map((bullet) => `• ${bullet}`),
    "",
    related.length
      ? `Related: ${related.map((hit) => `“${hit.title.split(" · ").pop() ?? hit.title}”`).join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const actions: AgentAction[] = [best.action];
  if (best.kind === "short") {
    const card = FEED.find((c) => c.id === best.id);
    if (card?.relatedQuest) {
      const quest = QUESTS.find((q) => q.id === card.relatedQuest);
      if (quest) actions.push(questAction(quest, "Test yourself"));
    }
  }
  return reply(clip(text, 900), actions, [
    "Test me on this",
    "What should I learn today?",
    "Something longer",
  ]);
}

/** The single entry point the UI calls. Pure and synchronous. */
export function askAtlas(question: string, ctx: AgentContext): AgentReply {
  const normalized = question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return reply(
      "Ask me anything about Atlas — a concept, what to watch, or where to find something.",
      [DISCOVER_ACTION],
    );
  }

  const has = (...words: string[]) => words.some((word) => normalized.includes(word));
  const category = detectCategory(normalized);

  if (
    has(
      "what should i review",
      "review my",
      "due for review",
      "spaced repetition",
      "revision",
      "knowledge gap",
      "my gaps",
      "weakest",
      "what am i forgetting",
      "retention",
    )
  ) {
    return reviewReply(ctx);
  }
  if (has("knowledge map", "my strengths", "mastery map", "concept map")) {
    return mapReply(ctx);
  }
  if (has("practice question", "practice questions", "give me a question", "generate a question")) {
    return practiceReply(ctx, category);
  }

  if (/^(hi|hey|hello|yo|sup|good (morning|evening|afternoon))\b/.test(normalized)) {
    return greeting(ctx);
  }
  if (has("what can you do", "who are you", "capabilities", "how do you work", "what do you do")) {
    return capabilities();
  }
  if (
    has(
      "stuck",
      "broken",
      "bug",
      "not working",
      "doesn't work",
      "problem",
      "support",
      "glitch",
      "error",
      "reset my progress",
    )
  ) {
    return supportReply();
  }
  if (
    has(
      "saved",
      "save",
      "bookmark",
      "library",
      "revisit",
      "continue watching",
      "watch history",
      "my history",
      "recently watched",
    )
  ) {
    return libraryReply(ctx);
  }
  if (has("streak", "days in a row", "on fire")) {
    return streakReply(ctx);
  }
  if (has("achievement", "badge", "trophy", "medal")) {
    return achievementsReply(ctx);
  }
  if (has("interest", "ambition", "my profile", "my name", "settings", "preferences")) {
    return profileReply(ctx);
  }
  if (has("quiz me", "test me", "give me a quiz", "challenge me", "questions about")) {
    return quizReply(ctx, category);
  }
  if (
    has(
      "what should i learn",
      "what should i watch",
      "recommend",
      "suggest",
      "something to watch",
      "something new",
      "i have",
      "i only have",
      "bored",
      "what next",
      "something else",
    )
  ) {
    if (has("plan", "schedule", "today")) return planReply(ctx, category);
    return recommendReply(ctx, normalized, category);
  }
  if (has("plan", "schedule", "study plan")) {
    return planReply(ctx, category);
  }
  if (has("my progress", "my level", "how am i doing", "how much xp", "next level", "my xp")) {
    return progressReply(ctx);
  }
  if (has("level up", "how do i level", "earn xp", "get xp", "xp work", "skill point")) {
    return progressReply(ctx);
  }

  const hits = searchAtlas(normalized, category);
  if (hits.length > 0) return explainReply(normalized, category);

  if (has("xp", "level", "rank")) return progressReply(ctx);

  return reply(
    "I'm not sure I understood that one. I'm best at Atlas lessons, deep dives, quests, streaks and where to find things.\n\nTry naming a topic (“dark matter”), a format (“a 10-minute video”), or a goal (“level up faster”).",
    [DISCOVER_ACTION, QUESTS_ACTION, LIBRARY_ACTION],
    SUGGESTIONS,
  );
}

/* Exported for tests and for future server-side reuse. */
export const agentInternals = {
  searchAtlas,
  detectCategory,
  detectMinutes,
  buildIndex: (): Doc[] => INDEX,
};
