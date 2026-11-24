import type { AtlasState } from "./atlas-store";
import type { AchievementSnapshot } from "@/data/achievements";
import { ALL_EPISODES, SERIES, getSeries } from "@/data/series";
import { CATEGORIES } from "@/data/categories";
import { FEED } from "@/data/cards";
import { QUESTS } from "@/data/quests";
import { dayKey, shiftDay } from "./streak";

export const DAILY_GOAL_XP = 60;
export const DAILY_GOAL_BONUS = 30;

export function xpOn(state: AtlasState, day: string): number {
  return state.xpByDay[day] ?? 0;
}

export function todayXp(state: AtlasState, today: string = dayKey()): number {
  return xpOn(state, today);
}

export interface WeekDay {
  key: string;
  label: string;
  short: string;
  value: number;
  isToday: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Last seven local days, oldest first, including today. */
export function lastSevenDays(state: AtlasState, today: string = dayKey()): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const key = shiftDay(today, i - 6);
    const date = new Date(`${key}T12:00:00`);
    return {
      key,
      label: WEEKDAYS[date.getDay()] ?? "",
      short: (WEEKDAYS[date.getDay()] ?? "").slice(0, 1),
      value: xpOn(state, key),
      isToday: key === today,
    };
  });
}

export function weeklyTotal(state: AtlasState, today: string = dayKey()): number {
  return lastSevenDays(state, today).reduce((sum, d) => sum + d.value, 0);
}

export function buildSnapshot(state: AtlasState): AchievementSnapshot {
  const perfectQuizzes = Object.entries(state.completedQuests).filter(([id, result]) => {
    const quest = QUESTS.find((q) => q.id === id);
    if (quest?.type !== "quiz" || !result.score) return false;
    const [got, total] = result.score.split("/");
    return got !== undefined && got === total;
  }).length;

  const mysteriesSolved = Object.entries(state.completedQuests).filter(
    ([id, result]) =>
      QUESTS.find((q) => q.id === id)?.type === "mystery" && result.score?.startsWith("Solved"),
  ).length;

  const episodesCompleted = ALL_EPISODES.filter((e) => state.episodes[e.id]?.completed).length;
  const shortsCompleted = FEED.filter((c) => state.shorts[c.id]?.completed).length;

  const seriesCompleted = SERIES.filter((series) =>
    series.episodes.every((e) => state.episodes[e.id]?.completed),
  ).length;

  const realms = new Set<string>();
  for (const card of FEED) if (state.shorts[card.id]?.completed) realms.add(card.category);
  for (const series of SERIES) {
    if (series.episodes.some((e) => state.episodes[e.id]?.completed)) realms.add(series.category);
  }

  return {
    shortsCompleted,
    episodesCompleted,
    seriesCompleted,
    perfectQuizzes,
    mysteriesSolved,
    skillsUnlocked: state.unlockedSkills.length,
    streak: state.streak,
    bestStreak: state.bestStreak,
    realmsTouched: Math.min(realms.size, CATEGORIES.length),
    savedCount: state.saved.length,
  };
}

export interface SeriesStats {
  total: number;
  completed: number;
  started: number;
  progress: number;
  secondsLeft: number;
  nextEpisodeId: string | null;
}

export function seriesStats(state: AtlasState, seriesId: string): SeriesStats {
  const series = getSeries(seriesId);
  if (!series) {
    return { total: 0, completed: 0, started: 0, progress: 0, secondsLeft: 0, nextEpisodeId: null };
  }
  let completed = 0;
  let started = 0;
  let secondsLeft = 0;
  let nextEpisodeId: string | null = null;
  for (const episode of series.episodes) {
    const progress = state.episodes[episode.id];
    if (progress?.completed) completed += 1;
    if (progress && progress.position > 0.01) started += 1;
    if (!progress?.completed) {
      secondsLeft += Math.max(0, Math.round(episode.seconds * (1 - (progress?.position ?? 0))));
      if (!nextEpisodeId) nextEpisodeId = episode.id;
    }
  }
  return {
    total: series.episodes.length,
    completed,
    started,
    progress: series.episodes.length ? completed / series.episodes.length : 0,
    secondsLeft,
    nextEpisodeId,
  };
}

export function deepDiveMinutes(state: AtlasState): number {
  return Math.round(
    ALL_EPISODES.reduce((total, episode) => {
      const progress = state.episodes[episode.id];
      if (!progress) return total;
      const watched = progress.completed ? 1 : Math.min(1, progress.position);
      return total + (episode.seconds * watched) / 60;
    }, 0),
  );
}
