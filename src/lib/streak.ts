// Date + streak rules, kept pure so they are easy to reason about and test.

/** Local (not UTC) calendar day, so a "day" matches the user's evening. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dayFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function shiftDay(key: string, days: number): string {
  const date = dayFromKey(key);
  date.setDate(date.getDate() + days);
  return dayKey(date);
}

/** Whole days between two keys (b - a). Noon anchoring avoids DST edge cases. */
export function daysBetween(a: string, b: string): number {
  return Math.round((dayFromKey(b).getTime() - dayFromKey(a).getTime()) / 86_400_000);
}

/**
 * The streak after learning today.
 * - Same day (or a clock that moved backwards): unchanged.
 * - Yesterday: one more day.
 * - A gap: back to day one.
 */
export function nextStreak(current: number, lastActiveDay: string, today: string): number {
  const safeCurrent = Math.max(0, current);
  if (!lastActiveDay) return 1;
  const gap = daysBetween(lastActiveDay, today);
  if (gap <= 0) return Math.max(1, safeCurrent);
  if (gap === 1) return safeCurrent + 1;
  return 1;
}

/** True when the streak is still intact today but not yet extended. */
export function streakAtRisk(lastActiveDay: string, today: string): boolean {
  return Boolean(lastActiveDay) && daysBetween(lastActiveDay, today) === 1;
}

/** True when the streak was already lost (yesterday or earlier, no activity since). */
export function streakBroken(lastActiveDay: string, today: string): boolean {
  return Boolean(lastActiveDay) && daysBetween(lastActiveDay, today) > 1;
}
