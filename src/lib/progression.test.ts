import { describe, expect, it } from "vitest";
import {
  availableSkillPoints,
  levelFromXp,
  mysteryXp,
  quizXp,
  rankForLevel,
  xpForLevel,
} from "./progression";

describe("progression rules", () => {
  it("each level needs 50 more XP than the last, starting at 100", () => {
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(2)).toBe(150);
    expect(xpForLevel(4)).toBe(250);
  });

  it("converts total XP into level and in-level progress", () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, current: 0, needed: 100 });
    expect(levelFromXp(100)).toMatchObject({ level: 2, current: 0, needed: 150 });
    expect(levelFromXp(380)).toMatchObject({ level: 3, current: 130, needed: 200 });
  });

  it("grants one skill point per level and per quest, minus unlocked skills", () => {
    expect(availableSkillPoints(3, 1, 3)).toBe(1);
    expect(availableSkillPoints(1, 0, 5)).toBe(0);
  });

  it("scales quiz XP by correct answers", () => {
    expect(quizXp(80, 4, 4)).toBe(80);
    expect(quizXp(80, 2, 4)).toBe(40);
    expect(quizXp(80, 0, 4)).toBe(0);
  });

  it("reduces mystery XP 15% per extra clue, never below 40%, and gives 10 XP when wrong", () => {
    expect(mysteryXp(120, 1, true)).toBe(120);
    expect(mysteryXp(120, 3, true)).toBe(84);
    expect(mysteryXp(120, 10, true)).toBe(48);
    expect(mysteryXp(120, 2, false)).toBe(10);
  });

  it("names ranks by level", () => {
    expect(rankForLevel(1)).toBe("Novice");
    expect(rankForLevel(3)).toBe("Explorer");
    expect(rankForLevel(5)).toBe("Scholar");
  });
});
