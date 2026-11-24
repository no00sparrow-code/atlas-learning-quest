import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HealthCheck } from "./health";
import {
  clearHealthHistory,
  loadHealthHistory,
  recordHealthSnapshot,
  snapshotFromChecks,
} from "./monitor";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

const checks: HealthCheck[] = [
  {
    id: "storage",
    label: "Storage",
    status: "pass",
    detail: "ok",
    scope: "browser",
    checkedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "platform",
    label: "Platform",
    status: "unavailable",
    detail: "no backend",
    scope: "platform",
    checkedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sources",
    label: "Sources",
    status: "warn",
    detail: "missing",
    scope: "content",
    checkedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("local health history", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("records timestamped counts and warnings without inventing platform data", () => {
    const snapshot = snapshotFromChecks(checks);
    expect(snapshot.counts).toEqual({ pass: 1, warn: 1, fail: 0, unavailable: 1 });
    expect(snapshot.failed.map((item) => item.id)).toContain("sources");
    expect(snapshot.failed.map((item) => item.id)).not.toContain("platform");
    const history = recordHealthSnapshot(checks);
    expect(history).toHaveLength(1);
    expect(loadHealthHistory()).toHaveLength(1);
  });

  it("replaces a duplicate snapshot from a double mount and clears history", () => {
    const first = recordHealthSnapshot(checks);
    const second = recordHealthSnapshot(checks, first);
    expect(second).toHaveLength(1);
    expect(clearHealthHistory()).toHaveLength(0);
    expect(loadHealthHistory()).toHaveLength(0);
  });
});
