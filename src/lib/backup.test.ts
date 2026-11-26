import { describe, expect, it } from "vitest";
import { createDemoState } from "./atlas-store";
import { isAtlasBackup } from "./backup";

describe("Atlas backup validation", () => {
  it("accepts a complete exported learner state", () => {
    expect(isAtlasBackup(createDemoState())).toBe(true);
  });

  it("rejects non-object and unsupported backup data", () => {
    expect(isAtlasBackup(null)).toBe(false);
    expect(isAtlasBackup([])).toBe(false);
    expect(isAtlasBackup({ version: 1 })).toBe(false);
    expect(isAtlasBackup({ version: 2 })).toBe(false);
  });

  it("rejects malformed progress collections before restore", () => {
    const backup = createDemoState();
    expect(isAtlasBackup({ ...backup, watched: "lesson-1" })).toBe(false);
    expect(isAtlasBackup({ ...backup, xpByDay: { "2026-11-26": "many" } })).toBe(false);
    expect(
      isAtlasBackup({
        ...backup,
        shorts: { lesson: { position: 4, completed: true, updatedAt: 1 } },
      }),
    ).toBe(false);
    expect(
      isAtlasBackup({
        ...backup,
        memory: {
          concept: {
            attempts: 1,
            correct: 2,
            strength: 0.5,
            ease: 2,
            interval: 1,
            dueDay: "2026-11-27",
            lastSeen: "2026-11-26",
          },
        },
      }),
    ).toBe(false);
  });

  it("rejects invalid review entries and unknown interests", () => {
    const backup = createDemoState();
    expect(isAtlasBackup({ ...backup, interests: ["not-a-category"] })).toBe(false);
    expect(
      isAtlasBackup({
        ...backup,
        reviewLog: [{ at: 1, conceptId: "x", correct: true, source: "unknown" }],
      }),
    ).toBe(false);
  });
});
