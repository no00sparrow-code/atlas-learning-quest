import { describe, expect, it } from "vitest";
import { dayKey, daysBetween, nextStreak, shiftDay, streakAtRisk } from "./streak";

describe("streak rules", () => {
  it("keys days in local time", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(dayKey(new Date(2026, 11, 31, 0, 1))).toBe("2026-12-31");
  });

  it("shifts across month and year boundaries", () => {
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-01-01", "2026-01-31")).toBe(30);
  });

  it("keeps the streak on the same day", () => {
    expect(nextStreak(6, "2026-06-10", "2026-06-10")).toBe(6);
  });

  it("extends the streak on consecutive days", () => {
    expect(nextStreak(6, "2026-06-09", "2026-06-10")).toBe(7);
    expect(nextStreak(0, "2026-06-09", "2026-06-10")).toBe(1);
  });

  it("resets after a missed day", () => {
    expect(nextStreak(12, "2026-06-07", "2026-06-10")).toBe(1);
  });

  it("recovers gracefully from a missing or backwards last day", () => {
    expect(nextStreak(4, "", "2026-06-10")).toBe(1);
    expect(nextStreak(4, "2026-06-12", "2026-06-10")).toBe(4);
  });

  it("knows when a streak is at risk", () => {
    expect(streakAtRisk("2026-06-09", "2026-06-10")).toBe(true);
    expect(streakAtRisk("2026-06-10", "2026-06-10")).toBe(false);
    expect(streakAtRisk("2026-06-07", "2026-06-10")).toBe(false);
  });
});
