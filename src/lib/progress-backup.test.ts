import { describe, expect, it } from "vitest";
import { createFreshState } from "./atlas-store";
import {
  normaliseProgressBackup,
  parseProgressBackup,
  restoreProgressBackup,
} from "./progress-backup";

const TODAY = "2026-11-26";

describe("progress backup validation", () => {
  it("preserves valid learner progress and the current backup version", () => {
    const base = createFreshState();
    const result = parseProgressBackup(
      JSON.stringify({
        version: 2,
        onboarded: true,
        name: "Ada",
        xp: 240,
        watched: ["first-lesson"],
        saved: ["second-lesson"],
        interests: ["science", "technology"],
        shorts: {
          "first-lesson": { position: 1, completed: true, updatedAt: 100 },
        },
      }),
      base,
      TODAY,
      200,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toMatchObject({
      version: 2,
      onboarded: true,
      name: "Ada",
      xp: 240,
      watched: ["first-lesson"],
      saved: ["second-lesson"],
      interests: ["science", "technology"],
      shorts: {
        "first-lesson": { position: 1, completed: true, updatedAt: 100 },
      },
    });
  });

  it("rejects malformed, unsupported and oversized backups", () => {
    const base = createFreshState();

    expect(parseProgressBackup("{", base, TODAY).ok).toBe(false);
    expect(parseProgressBackup("[]", base, TODAY).ok).toBe(false);
    expect(parseProgressBackup('{"version":99,"xp":10}', base, TODAY).ok).toBe(false);
    expect(parseProgressBackup("x".repeat(5_000_001), base, TODAY)).toMatchObject({
      ok: false,
      error: "That backup file is too large to import.",
    });
  });

  it("bounds progress and recall values while dropping malformed entries", () => {
    const base = createFreshState();
    const unsafeShorts = Object.fromEntries([["__proto__", { position: 1, completed: true }]]);
    const state = normaliseProgressBackup(
      {
        version: 2,
        xp: -50,
        name: "A".repeat(100),
        interests: ["science", "unknown", "science"],
        shorts: {
          lesson: { position: 4, completed: false, updatedAt: 10 },
          broken: { position: Number.NaN, completed: false },
          ...unsafeShorts,
        },
        memory: {
          concept: {
            attempts: 2,
            correct: 8,
            strength: 4,
            ease: 9,
            interval: 999,
            dueDay: TODAY,
            lastSeen: "not-a-date",
          },
          broken: { attempts: 1, strength: 0.5, ease: 2.2, dueDay: "tomorrow" },
        },
      },
      base,
      TODAY,
      123,
    );

    expect(state).not.toBeNull();
    expect(state?.xp).toBe(0);
    expect(state?.name).toHaveLength(48);
    expect(state?.interests).toEqual(["science"]);
    expect(state?.shorts).toEqual({
      lesson: { position: 1, completed: false, updatedAt: 10 },
    });
    expect(state?.memory).toEqual({
      concept: {
        attempts: 2,
        correct: 2,
        strength: 1,
        ease: 2.8,
        interval: 120,
        dueDay: TODAY,
        lastSeen: "",
      },
    });
  });

  it("migrates legacy watched cards and daily XP into version two state", () => {
    const base = createFreshState();
    const state = normaliseProgressBackup(
      { version: 1, xp: 90, xpToday: 25, watched: ["legacy-card", "__proto__"] },
      base,
      TODAY,
      456,
    );

    expect(state).not.toBeNull();
    expect(state?.version).toBe(2);
    expect(state?.onboarded).toBe(true);
    expect(state?.xpByDay[TODAY]).toBe(25);
    expect(state?.shorts["legacy-card"]).toEqual({
      position: 1,
      completed: true,
      updatedAt: 456,
    });
    expect(Object.keys(state?.shorts ?? {})).toEqual(["legacy-card"]);
    expect(Object.getPrototypeOf(state?.shorts)).toBe(Object.prototype);
  });

  it("keeps rejected local backups available for recovery", () => {
    const base = createFreshState();
    const raw = '{"version":99,"xp":500}';
    const restored = restoreProgressBackup(raw, base, TODAY, 789);

    expect(restored.state).toBe(base);
    expect(restored.recovery).toBe(raw);
    expect(restored.error).toBe("That file is not a supported Atlas backup.");
    expect(restoreProgressBackup(null, base, TODAY).recovery).toBeNull();
  });

  it("rejects impossible calendar dates in review schedules", () => {
    const state = normaliseProgressBackup(
      {
        version: 2,
        memory: {
          concept: {
            attempts: 1,
            correct: 1,
            strength: 0.5,
            ease: 2.2,
            interval: 1,
            dueDay: "2026-99-99",
            lastSeen: TODAY,
          },
        },
      },
      createFreshState(),
      TODAY,
    );

    expect(state?.memory).toEqual({});
  });
});
