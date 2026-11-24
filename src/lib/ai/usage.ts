import { dayKey } from "@/lib/streak";

const USAGE_KEY = "atlas-ai-usage-v1";

export const LOCAL_LIMITS = {
  aiQueriesPerDay: 24,
  studioRendersPerDay: 3,
  studioSecondsPerDay: 120,
} as const;

export interface LocalUsage {
  day: string;
  aiQueries: number;
  studioRenders: number;
  studioSeconds: number;
}

function freshUsage(day = dayKey()): LocalUsage {
  return { day, aiQueries: 0, studioRenders: 0, studioSeconds: 0 };
}

export function loadUsage(): LocalUsage {
  if (typeof localStorage === "undefined") return freshUsage();
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return freshUsage();
    const parsed = JSON.parse(raw) as Partial<LocalUsage>;
    if (parsed.day !== dayKey()) return freshUsage();
    return {
      day: parsed.day,
      aiQueries: Math.max(0, Number(parsed.aiQueries) || 0),
      studioRenders: Math.max(0, Number(parsed.studioRenders) || 0),
      studioSeconds: Math.max(0, Number(parsed.studioSeconds) || 0),
    };
  } catch {
    return freshUsage();
  }
}

function saveUsage(usage: LocalUsage): LocalUsage {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
    } catch {
      /* ignore */
    }
  }
  return usage;
}

export interface QuotaCheck {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  message: string;
}

export function checkAiQuota(usage = loadUsage()): QuotaCheck {
  const used = usage.aiQueries;
  const limit = LOCAL_LIMITS.aiQueriesPerDay;
  const remaining = Math.max(0, limit - used);
  return {
    allowed: remaining > 0,
    used,
    limit,
    remaining,
    message:
      remaining > 0
        ? `${remaining} local model request${remaining === 1 ? "" : "s"} left today.`
        : "Today's local model allowance is used up. Rule-based Atlas Guides still work; the allowance resets tomorrow.",
  };
}

export function consumeAiQuery(): QuotaCheck {
  const usage = loadUsage();
  const check = checkAiQuota(usage);
  if (!check.allowed) return check;
  const next = saveUsage({ ...usage, aiQueries: usage.aiQueries + 1 });
  return checkAiQuota(next);
}

export function checkStudioQuota(seconds: number, usage = loadUsage()): QuotaCheck {
  const used = usage.studioRenders;
  const limit = LOCAL_LIMITS.studioRendersPerDay;
  const remaining = Math.max(0, limit - used);
  const secondsLeft = Math.max(0, LOCAL_LIMITS.studioSecondsPerDay - usage.studioSeconds);
  if (seconds > secondsLeft) {
    return {
      allowed: false,
      used,
      limit,
      remaining,
      message: `This render is ${seconds}s, but only ${secondsLeft}s of local rendering time remains today.`,
    };
  }
  return {
    allowed: remaining > 0,
    used,
    limit,
    remaining,
    message:
      remaining > 0
        ? `${remaining} local render${remaining === 1 ? "" : "s"} left today.`
        : "Today's local render allowance is used up. It resets tomorrow.",
  };
}

export function consumeStudioRender(seconds: number): QuotaCheck {
  const usage = loadUsage();
  const check = checkStudioQuota(seconds, usage);
  if (!check.allowed) return check;
  const next = saveUsage({
    ...usage,
    studioRenders: usage.studioRenders + 1,
    studioSeconds: usage.studioSeconds + seconds,
  });
  return checkStudioQuota(seconds, next);
}
