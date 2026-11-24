import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, evaluateAchievements, type AchievementSnapshot } from "./achievements";

const empty: AchievementSnapshot = {
  shortsCompleted: 0,
  episodesCompleted: 0,
  seriesCompleted: 0,
  perfectQuizzes: 0,
  mysteriesSolved: 0,
  skillsUnlocked: 0,
  streak: 0,
  bestStreak: 0,
  realmsTouched: 0,
  savedCount: 0,
};

function achievement(id: string) {
  const found = ACHIEVEMENTS.find((a) => a.id === id);
  if (!found) throw new Error(`missing achievement ${id}`);
  return found;
}

describe("achievements", () => {
  it("unlocks nothing for a new profile", () => {
    expect(evaluateAchievements(empty)).toEqual([]);
  });

  it("unlocks the first-lesson and ten-lesson badges from shorts", () => {
    const ids = evaluateAchievements({ ...empty, shortsCompleted: 10 });
    expect(ids).toContain("first-spark");
    expect(ids).toContain("curious-mind");
  });

  it("unlocks deep-dive and series badges independently", () => {
    const ids = evaluateAchievements({ ...empty, episodesCompleted: 3, seriesCompleted: 1 });
    expect(ids).toContain("deep-diver");
    expect(ids).toContain("series-sage");
  });

  it("uses the best streak for streak badges", () => {
    const ids = evaluateAchievements({ ...empty, streak: 3, bestStreak: 30 });
    expect(ids).toContain("on-fire");
    expect(ids).toContain("seasoned");
  });

  it("caps progress at the target", () => {
    const curious = achievement("curious-mind");
    expect(curious.target).toBe(10);
    expect(curious.progress({ ...empty, shortsCompleted: 42 })).toBe(10);
    expect(curious.isUnlocked({ ...empty, shortsCompleted: 9 })).toBe(false);
  });

  it("unlocks polymath only across all six realms", () => {
    expect(evaluateAchievements({ ...empty, realmsTouched: 5 })).not.toContain("polymath");
    expect(evaluateAchievements({ ...empty, realmsTouched: 6 })).toContain("polymath");
  });
});
