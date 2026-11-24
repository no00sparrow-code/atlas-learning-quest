import type { AtlasState } from "./atlas-store";
import type { CategoryId } from "@/data/categories";
import { FEED } from "@/data/cards";
import { SERIES, getEpisode, seriesMinutes } from "@/data/series";
import { dayKey } from "./streak";

/** A normalized view of any learnable item, so feeds and rows do not care about type. */
export interface ContentRef {
  key: string;
  kind: "short" | "episode";
  id: string;
  title: string;
  subtitle: string;
  category: CategoryId;
  seconds: number;
  creator: string;
  seriesId?: string;
  seriesTitle?: string;
  episodeNumber?: number;
  position: number;
  completed: boolean;
  saved: boolean;
  liked: boolean;
  updatedAt: number;
}

export function resolveShort(state: AtlasState, id: string): ContentRef | null {
  const card = FEED.find((c) => c.id === id);
  if (!card) return null;
  const progress = state.shorts[id];
  return {
    key: `short:${id}`,
    kind: "short",
    id,
    title: card.title,
    subtitle: card.hook,
    category: card.category,
    seconds: card.seconds,
    creator: card.creator,
    position: progress?.position ?? 0,
    completed: progress?.completed ?? false,
    saved: state.saved.includes(id),
    liked: state.liked.includes(id),
    updatedAt: progress?.updatedAt ?? 0,
  };
}

export function resolveEpisode(state: AtlasState, id: string): ContentRef | null {
  const found = getEpisode(id);
  if (!found) return null;
  const { episode, series } = found;
  const progress = state.episodes[id];
  return {
    key: `episode:${id}`,
    kind: "episode",
    id,
    title: episode.title,
    subtitle: series.title,
    category: series.category,
    seconds: episode.seconds,
    creator: series.creator,
    seriesId: series.id,
    seriesTitle: series.title,
    episodeNumber: episode.number,
    position: progress?.position ?? 0,
    completed: progress?.completed ?? false,
    saved: state.saved.includes(id),
    liked: state.liked.includes(id),
    updatedAt: progress?.updatedAt ?? 0,
  };
}

export function resolveContent(state: AtlasState, id: string): ContentRef | null {
  return resolveEpisode(state, id) ?? resolveShort(state, id);
}

/** Everything the user has started but not finished, most recently touched first. */
export function continueWatching(state: AtlasState, limit = 6): ContentRef[] {
  const items: ContentRef[] = [];
  for (const [id, progress] of Object.entries(state.episodes)) {
    if (progress.position > 0.01 && !progress.completed) {
      const ref = resolveEpisode(state, id);
      if (ref) items.push(ref);
    }
  }
  for (const [id, progress] of Object.entries(state.shorts)) {
    if (progress.position > 0.01 && !progress.completed) {
      const ref = resolveShort(state, id);
      if (ref) items.push(ref);
    }
  }
  return items.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
}

export function savedItems(state: AtlasState): ContentRef[] {
  return state.saved
    .map((id) => resolveContent(state, id))
    .filter((item): item is ContentRef => item !== null);
}

export function likedItems(state: AtlasState): ContentRef[] {
  return state.liked
    .map((id) => resolveShort(state, id))
    .filter((item): item is ContentRef => item !== null);
}

/** Recently opened content, de-duplicated, newest first. */
export function recentItems(state: AtlasState, limit = 10): ContentRef[] {
  const seen = new Set<string>();
  const items: ContentRef[] = [];
  for (const entry of [...state.history].sort((a, b) => b.at - a.at)) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    const ref =
      entry.kind === "episode" ? resolveEpisode(state, entry.id) : resolveShort(state, entry.id);
    if (ref) items.push({ ...ref, updatedAt: entry.at });
    if (items.length >= limit) break;
  }
  return items;
}

export interface SeriesOverview {
  id: string;
  title: string;
  subtitle: string;
  category: CategoryId;
  creator: string;
  minutes: number;
  total: number;
  completed: number;
  progress: number;
  started: boolean;
  nextEpisodeId: string | null;
}

export function seriesOverview(state: AtlasState): SeriesOverview[] {
  return SERIES.map((series) => {
    const completed = series.episodes.filter((e) => state.episodes[e.id]?.completed).length;
    const started = series.episodes.some((e) => {
      const progress = state.episodes[e.id];
      return progress !== undefined && progress.position > 0.01;
    });
    const next = series.episodes.find((e) => !state.episodes[e.id]?.completed);
    return {
      id: series.id,
      title: series.title,
      subtitle: series.subtitle,
      category: series.category,
      creator: series.creator,
      minutes: seriesMinutes(series),
      total: series.episodes.length,
      completed,
      progress: completed / series.episodes.length,
      started,
      nextEpisodeId: next?.id ?? null,
    };
  });
}

/** Used by the library screen to describe "when" something happened. */
export function relativeTime(timestamp: number, now: number = Date.now()): string {
  if (!timestamp) return "Not started";
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function isNewToday(timestamp: number, today: string = dayKey()): boolean {
  return timestamp > 0 && dayKey(new Date(timestamp)) === today;
}
