type JsonRecord = Record<string, unknown>;

const CATEGORY_IDS = new Set([
  "psychology",
  "science",
  "history",
  "technology",
  "creativity",
  "business",
]);
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ITEMS = 5_000;
const MAX_BACKUP_CHARS = 5_000_000;

function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_KEY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day
  );
}

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function safeKey(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 160 &&
    !["__proto__", "prototype", "constructor"].includes(value)
  );
}

function boundedNumber(value: unknown, fallback = 0, max = 1_000_000_000): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(max, Math.floor(value)))
    : fallback;
}

function boundedStrings(
  value: unknown,
  fallback: string[] = [],
  maxItems = MAX_ITEMS,
  maxLength = 160,
): string[] {
  if (!Array.isArray(value)) return fallback;
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.slice(0, maxLength))
        .filter(Boolean),
    ),
  ].slice(0, maxItems);
}

function dateNumberMap(value: unknown): Record<string, number> {
  const source = record(value);
  const result: Record<string, number> = {};
  if (!source) return result;

  for (const [key, item] of Object.entries(source).slice(0, MAX_ITEMS)) {
    if (isDateKey(key) && typeof item === "number" && Number.isFinite(item) && item >= 0) {
      result[key] = Math.min(1_000_000_000, Math.floor(item));
    }
  }
  return result;
}

function progressMap(
  value: unknown,
  now: number,
): Record<string, { position: number; completed: boolean; updatedAt: number }> {
  const source = record(value);
  const result: Record<string, { position: number; completed: boolean; updatedAt: number }> = {};
  if (!source) return result;

  for (const [id, item] of Object.entries(source).slice(0, MAX_ITEMS)) {
    const entry = record(item);
    if (
      !entry ||
      !safeKey(id) ||
      typeof entry.position !== "number" ||
      !Number.isFinite(entry.position) ||
      typeof entry.completed !== "boolean"
    ) {
      continue;
    }
    result[id] = {
      position: Math.max(0, Math.min(1, entry.position)),
      completed: entry.completed,
      updatedAt: boundedNumber(entry.updatedAt, now, Number.MAX_SAFE_INTEGER),
    };
  }
  return result;
}

function historyList(value: unknown): Array<{ kind: "short" | "episode"; id: string; at: number }> {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 100).flatMap((item) => {
    const entry = record(item);
    if (
      !entry ||
      (entry.kind !== "short" && entry.kind !== "episode") ||
      typeof entry.id !== "string" ||
      !entry.id ||
      typeof entry.at !== "number" ||
      !Number.isFinite(entry.at) ||
      entry.at < 0
    ) {
      return [];
    }
    return [{ kind: entry.kind, id: entry.id.slice(0, 160), at: Math.floor(entry.at) }];
  });
}

function questResults(value: unknown): Record<string, { xp: number; score?: string }> {
  const source = record(value);
  const result: Record<string, { xp: number; score?: string }> = {};
  if (!source) return result;

  for (const [id, item] of Object.entries(source).slice(0, MAX_ITEMS)) {
    const entry = record(item);
    if (
      !entry ||
      !safeKey(id) ||
      typeof entry.xp !== "number" ||
      !Number.isFinite(entry.xp) ||
      entry.xp < 0
    ) {
      continue;
    }
    result[id] = {
      xp: boundedNumber(entry.xp),
      ...(typeof entry.score === "string" ? { score: entry.score.slice(0, 40) } : {}),
    };
  }
  return result;
}

function memoryMap(value: unknown): Record<
  string,
  {
    attempts: number;
    correct: number;
    strength: number;
    ease: number;
    interval: number;
    dueDay: string;
    lastSeen: string;
  }
> {
  const source = record(value);
  const result: Record<
    string,
    {
      attempts: number;
      correct: number;
      strength: number;
      ease: number;
      interval: number;
      dueDay: string;
      lastSeen: string;
    }
  > = {};
  if (!source) return result;

  for (const [id, item] of Object.entries(source).slice(0, MAX_ITEMS)) {
    const entry = record(item);
    if (
      !entry ||
      !safeKey(id) ||
      typeof entry.strength !== "number" ||
      !Number.isFinite(entry.strength) ||
      typeof entry.ease !== "number" ||
      !Number.isFinite(entry.ease) ||
      !isDateKey(entry.dueDay)
    ) {
      continue;
    }

    const attempts = boundedNumber(entry.attempts);
    result[id] = {
      attempts,
      correct: Math.min(attempts, boundedNumber(entry.correct)),
      strength: Math.max(0, Math.min(1, entry.strength)),
      ease: Math.max(1.3, Math.min(2.8, entry.ease)),
      interval: boundedNumber(entry.interval, 0, 120),
      dueDay: entry.dueDay,
      lastSeen: isDateKey(entry.lastSeen) ? entry.lastSeen : "",
    };
  }
  return result;
}

function reviewLog(value: unknown): Array<{
  at: number;
  conceptId: string;
  correct: boolean;
  source: "review" | "quiz";
}> {
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_ITEMS).flatMap((item) => {
    const entry = record(item);
    if (
      !entry ||
      typeof entry.at !== "number" ||
      !Number.isFinite(entry.at) ||
      entry.at < 0 ||
      typeof entry.conceptId !== "string" ||
      typeof entry.correct !== "boolean" ||
      (entry.source !== "review" && entry.source !== "quiz")
    ) {
      return [];
    }
    return [
      {
        at: Math.floor(entry.at),
        conceptId: entry.conceptId.slice(0, 160),
        correct: entry.correct,
        source: entry.source,
      },
    ];
  });
}

/** Validate and bound imported/local progress before it enters application state. */
export function normaliseProgressBackup<T extends object>(
  value: unknown,
  base: T,
  today: string,
  now = Date.now(),
): T | null {
  const parsed = record(value);
  if (!parsed) return null;
  if (parsed.version !== undefined && parsed.version !== 1 && parsed.version !== 2) return null;
  if (parsed.version === undefined && !("xp" in parsed || "watched" in parsed)) return null;
  if (!isDateKey(today)) return null;

  const defaults = base as JsonRecord;
  const watched = boundedStrings(parsed.watched, (defaults.watched as string[]) ?? []);
  const shorts = progressMap(parsed.shorts, now);
  if (parsed.shorts == null) {
    for (const id of watched) {
      shorts[id] = { position: 1, completed: true, updatedAt: now };
    }
  }

  const interests = Array.isArray(parsed.interests)
    ? [
        ...new Set(
          parsed.interests.filter(
            (item): item is string => typeof item === "string" && CATEGORY_IDS.has(item),
          ),
        ),
      ].slice(0, CATEGORY_IDS.size)
    : ((defaults.interests as string[]) ?? []);

  const xpByDay = dateNumberMap(parsed.xpByDay);
  if (parsed.xpByDay == null) {
    const oldToday =
      typeof parsed.xpToday === "number" && Number.isFinite(parsed.xpToday)
        ? boundedNumber(parsed.xpToday)
        : 0;
    if (oldToday > 0) xpByDay[today] = oldToday;
  }

  const achievements: Record<string, number> = {};
  const achievementSource = record(parsed.achievements);
  if (achievementSource) {
    for (const [id, at] of Object.entries(achievementSource).slice(0, MAX_ITEMS)) {
      if (safeKey(id) && typeof at === "number" && Number.isFinite(at) && at >= 0) {
        achievements[id] = Math.floor(at);
      }
    }
  }

  return {
    ...defaults,
    version: 2,
    onboarded: typeof parsed.onboarded === "boolean" ? parsed.onboarded : true,
    name: typeof parsed.name === "string" ? parsed.name.slice(0, 48) : (defaults.name ?? ""),
    handle:
      typeof parsed.handle === "string"
        ? parsed.handle.slice(0, 40)
        : (defaults.handle ?? ""),
    xp: boundedNumber(parsed.xp, (defaults.xp as number) ?? 0),
    streak: boundedNumber(parsed.streak, (defaults.streak as number) ?? 0, 100_000),
    bestStreak: boundedNumber(parsed.bestStreak, (defaults.bestStreak as number) ?? 0, 100_000),
    lastActiveDay: isDateKey(parsed.lastActiveDay) ? parsed.lastActiveDay : "",
    xpByDay,
    watched,
    liked: boundedStrings(parsed.liked, (defaults.liked as string[]) ?? []),
    saved: boundedStrings(parsed.saved, (defaults.saved as string[]) ?? []),
    shorts,
    episodes: progressMap(parsed.episodes, now),
    history: historyList(parsed.history),
    completedQuests: questResults(parsed.completedQuests),
    unlockedSkills: boundedStrings(
      parsed.unlockedSkills,
      (defaults.unlockedSkills as string[]) ?? [],
    ),
    achievements,
    claimedGoals: boundedStrings(
      parsed.claimedGoals,
      (defaults.claimedGoals as string[]) ?? [],
      5_000,
      10,
    ),
    interests,
    ambitions: boundedStrings(parsed.ambitions, (defaults.ambitions as string[]) ?? [], 100, 120),
    memory: memoryMap(parsed.memory),
    reviewLog: reviewLog(parsed.reviewLog),
    reviewXpByDay: dateNumberMap(parsed.reviewXpByDay),
  } as T;
}

/** Parse an export without replacing the current state when the file is invalid. */
export function parseProgressBackup<T extends object>(
  raw: string,
  base: T,
  today: string,
  now = Date.now(),
): { ok: true; state: T } | { ok: false; error: string } {
  if (raw.length > MAX_BACKUP_CHARS) {
    return { ok: false, error: "That backup file is too large to import." };
  }

  try {
    const state = normaliseProgressBackup(JSON.parse(raw) as unknown, base, today, now);
    return state
      ? { ok: true, state }
      : { ok: false, error: "That file is not a supported Atlas backup." };
  } catch {
    return { ok: false, error: "Could not read that backup file." };
  }
}
