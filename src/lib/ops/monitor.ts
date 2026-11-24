import type { HealthCheck, HealthStatus } from "./health";

const HISTORY_KEY = "atlas-health-history-v1";
const MAX_SNAPSHOTS = 20;

export interface HealthSnapshot {
  id: string;
  at: string;
  counts: Record<HealthStatus, number>;
  failed: { id: string; label: string; detail: string }[];
}

function newSnapshotId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `health-${crypto.randomUUID()}`;
  }
  return `health-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function snapshotFromChecks(checks: HealthCheck[]): HealthSnapshot {
  return {
    id: newSnapshotId(),
    at: new Date().toISOString(),
    counts: {
      pass: checks.filter((check) => check.status === "pass").length,
      warn: checks.filter((check) => check.status === "warn").length,
      fail: checks.filter((check) => check.status === "fail").length,
      unavailable: checks.filter((check) => check.status === "unavailable").length,
    },
    failed: checks
      .filter((check) => check.status === "fail" || check.status === "warn")
      .map((check) => ({ id: check.id, label: check.label, detail: check.detail })),
  };
}

export function loadHealthHistory(): HealthSnapshot[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HealthSnapshot[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_SNAPSHOTS) : [];
  } catch {
    return [];
  }
}

export function recordHealthSnapshot(
  checks: HealthCheck[],
  history = loadHealthHistory(),
): HealthSnapshot[] {
  const snapshot = snapshotFromChecks(checks);
  const latest = history[0];
  // React development mounts can run the same check twice; replace a duplicate.
  if (
    latest &&
    latest.counts.pass === snapshot.counts.pass &&
    latest.counts.warn === snapshot.counts.warn &&
    latest.counts.fail === snapshot.counts.fail &&
    latest.counts.unavailable === snapshot.counts.unavailable &&
    Date.now() - new Date(latest.at).getTime() < 4000
  ) {
    const next = [snapshot, ...history.slice(1)].slice(0, MAX_SNAPSHOTS);
    return persist(next);
  }
  const next = [snapshot, ...history].slice(0, MAX_SNAPSHOTS);
  return persist(next);
}

function persist(history: HealthSnapshot[]): HealthSnapshot[] {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      /* local history only */
    }
  }
  return history;
}

export function clearHealthHistory(): HealthSnapshot[] {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
  }
  return [];
}
