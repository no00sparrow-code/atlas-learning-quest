import {
  Award,
  Bookmark,
  BookOpen,
  Compass,
  Film,
  Flame,
  Gem,
  Layers,
  Search,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";

/**
 * Achievements are defined as data with a measurable progress function, so the
 * profile can show partial progress and the store can unlock them automatically.
 */

export interface AchievementSnapshot {
  shortsCompleted: number;
  episodesCompleted: number;
  seriesCompleted: number;
  perfectQuizzes: number;
  mysteriesSolved: number;
  skillsUnlocked: number;
  streak: number;
  bestStreak: number;
  realmsTouched: number;
  savedCount: number;
}

export type AchievementTier = "bronze" | "silver" | "gold";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  hint: string;
  icon: LucideIcon;
  tier: AchievementTier;
  target: number;
  progress: (snapshot: AchievementSnapshot) => number;
  isUnlocked: (snapshot: AchievementSnapshot) => boolean;
}

function define(
  def: Omit<AchievementDef, "target" | "isUnlocked" | "hint"> & {
    target: number;
    hint: string;
  },
): AchievementDef {
  const capped = (value: number) => Math.max(0, Math.min(def.target, value));
  return {
    ...def,
    progress: (snapshot) => capped(def.progress(snapshot)),
    isUnlocked: (snapshot) => def.progress(snapshot) >= def.target,
  };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  define({
    id: "first-spark",
    name: "First Spark",
    description: "Finish your first short lesson",
    hint: "Watch any card in Discover to the end.",
    icon: Sparkles,
    tier: "bronze",
    target: 1,
    progress: (s) => s.shortsCompleted,
  }),
  define({
    id: "curious-mind",
    name: "Curious Mind",
    description: "Finish 10 short lessons",
    hint: "Ten cards is about eight minutes of learning.",
    icon: BookOpen,
    tier: "silver",
    target: 10,
    progress: (s) => s.shortsCompleted,
  }),
  define({
    id: "deep-diver",
    name: "Deep Diver",
    description: "Complete a full deep-dive episode",
    hint: "Open a series from Deep dives and watch to the end.",
    icon: Film,
    tier: "bronze",
    target: 1,
    progress: (s) => s.episodesCompleted,
  }),
  define({
    id: "series-sage",
    name: "Series Sage",
    description: "Finish every episode of one series",
    hint: "Pick a series and go all the way through.",
    icon: Layers,
    tier: "gold",
    target: 1,
    progress: (s) => s.seriesCompleted,
  }),
  define({
    id: "quiz-whiz",
    name: "Quiz Whiz",
    description: "Ace a quiz with no mistakes",
    hint: "Answer every question in a quiz correctly.",
    icon: Trophy,
    tier: "silver",
    target: 1,
    progress: (s) => s.perfectQuizzes,
  }),
  define({
    id: "detective",
    name: "Detective",
    description: "Solve a mystery quest",
    hint: "Close a case on the Quest board.",
    icon: Search,
    tier: "silver",
    target: 1,
    progress: (s) => s.mysteriesSolved,
  }),
  define({
    id: "pathfinder",
    name: "Pathfinder",
    description: "Unlock 5 skills in the World",
    hint: "Spend skill points on the skill tree.",
    icon: Gem,
    tier: "gold",
    target: 5,
    progress: (s) => s.skillsUnlocked,
  }),
  define({
    id: "on-fire",
    name: "On Fire",
    description: "Keep a 7-day learning streak",
    hint: "One finished lesson a day keeps it alive.",
    icon: Flame,
    tier: "gold",
    target: 7,
    progress: (s) => Math.max(s.streak, s.bestStreak),
  }),
  define({
    id: "polymath",
    name: "Polymath",
    description: "Learn in all 6 realms",
    hint: "Finish something from each knowledge realm.",
    icon: Compass,
    tier: "gold",
    target: 6,
    progress: (s) => s.realmsTouched,
  }),
  define({
    id: "archivist",
    name: "Archivist",
    description: "Save 5 things to your library",
    hint: "Tap the bookmark on any lesson.",
    icon: Bookmark,
    tier: "bronze",
    target: 5,
    progress: (s) => s.savedCount,
  }),
  define({
    id: "seasoned",
    name: "Seasoned",
    description: "Reach a 30-day streak",
    hint: "The long game. Thirty days, no gaps.",
    icon: Award,
    tier: "gold",
    target: 30,
    progress: (s) => Math.max(s.streak, s.bestStreak),
  }),
];

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** IDs whose target is met. Callers diff against what is already stored. */
export function evaluateAchievements(snapshot: AchievementSnapshot): string[] {
  return ACHIEVEMENTS.filter((a) => a.isUnlocked(snapshot)).map((a) => a.id);
}
