// Pure game rules for Atlas. Kept free of React so they can be unit-tested.

export const XP_PER_CARD = 15;
export const XP_PER_NODE = 20;
export const MYSTERY_WRONG_XP = 10;

/** XP required to advance from `level` to `level + 1`. */
export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 50;
}

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level */
  current: number;
  /** XP needed to finish the current level */
  needed: number;
  /** 0..1 progress through the current level */
  progress: number;
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, Math.floor(xp));
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  const needed = xpForLevel(level);
  return { level, current: remaining, needed, progress: remaining / needed };
}

/** Skill points: one per level plus one per completed quest, minus skills already unlocked. */
export function availableSkillPoints(
  level: number,
  completedQuests: number,
  unlockedSkills: number,
): number {
  return Math.max(0, level + completedQuests - unlockedSkills);
}

/** Quiz reward scales with correct answers. */
export function quizXp(reward: number, correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((reward * Math.min(correct, total)) / total);
}

/** Mystery reward: first clue is free, each extra clue costs 15%, floor of 40%. Wrong answer = consolation. */
export function mysteryXp(reward: number, cluesRevealed: number, solved: boolean): number {
  if (!solved) return MYSTERY_WRONG_XP;
  const extra = Math.max(0, cluesRevealed - 1);
  const factor = Math.max(0.4, 1 - extra * 0.15);
  return Math.round(reward * factor);
}

export const RANKS: { minLevel: number; title: string }[] = [
  { minLevel: 1, title: "Novice" },
  { minLevel: 3, title: "Explorer" },
  { minLevel: 5, title: "Scholar" },
  { minLevel: 8, title: "Sage" },
  { minLevel: 12, title: "Polymath" },
];

export function rankForLevel(level: number): string {
  let title = RANKS[0]?.title ?? "Novice";
  for (const r of RANKS) if (level >= r.minLevel) title = r.title;
  return title;
}
