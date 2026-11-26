import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CategoryId } from "@/data/categories";
import { CATEGORIES } from "@/data/categories";
import { SKILLS } from "@/data/skills";
import { evaluateAchievements } from "@/data/achievements";
import { getEpisode, episodeXp } from "@/data/series";
import {
  availableSkillPoints,
  levelFromXp,
  XP_PER_CARD,
  XP_PER_NODE,
  type LevelInfo,
} from "./progression";
import { restoreProgressBackup, parseProgressBackup } from "./progress-backup";
import {
  buildSnapshot,
  DAILY_GOAL_BONUS,
  DAILY_GOAL_XP,
  todayXp as computeTodayXp,
} from "./metrics";
import { dayKey, nextStreak, shiftDay } from "./streak";
import {
  gradeReview,
  REVIEW_XP_CAP,
  XP_FOR_CORRECT_REVIEW,
  XP_FOR_REVIEW_ATTEMPT,
  type ConceptMemory,
} from "./memory";

const STORAGE_KEY = "atlas-progress-v2";
const RECOVERY_KEY = "atlas-progress-recovery";
const LEGACY_KEY = "atlas-progress-v1";

export type ContentKind = "short" | "episode";

export interface QuestResult {
  xp: number;
  score?: string;
}

export interface VideoProgress {
  /** 0..1 playback position */
  position: number;
  completed: boolean;
  updatedAt: number;
}

export interface HistoryEntry {
  kind: ContentKind;
  id: string;
  at: number;
}

export interface ReviewAttempt {
  at: number;
  conceptId: string;
  correct: boolean;
  source: "review" | "quiz";
}

export interface AtlasState {
  version: 2;
  /** False until the first-run introduction is completed. */
  onboarded: boolean;
  name: string;
  handle: string;
  xp: number;
  streak: number;
  bestStreak: number;
  /** Local day key (YYYY-MM-DD) of the last learning action */
  lastActiveDay: string;
  xpByDay: Record<string, number>;
  watched: string[];
  liked: string[];
  saved: string[];
  shorts: Record<string, VideoProgress>;
  episodes: Record<string, VideoProgress>;
  history: HistoryEntry[];
  completedQuests: Record<string, QuestResult>;
  unlockedSkills: string[];
  achievements: Record<string, number>;
  claimedGoals: string[];
  interests: CategoryId[];
  ambitions: string[];
  /** Demonstrated understanding per concept */
  memory: Record<string, ConceptMemory>;
  reviewLog: ReviewAttempt[];
  /** Daily cap so review XP cannot be farmed */
  reviewXpByDay: Record<string, number>;
}

const DAY = 86_400_000;

/** A brand-new learner: no fake history, no inherited XP. */
export function createFreshState(): AtlasState {
  return {
    version: 2,
    onboarded: false,
    name: "",
    handle: "",
    xp: 0,
    streak: 0,
    bestStreak: 0,
    lastActiveDay: "",
    xpByDay: {},
    watched: [],
    liked: [],
    saved: [],
    shorts: {},
    episodes: {},
    history: [],
    completedQuests: {},
    unlockedSkills: [],
    achievements: {},
    claimedGoals: [],
    interests: [],
    ambitions: [],
    memory: {},
    reviewLog: [],
    reviewXpByDay: {},
  };
}

/** Seeded profile used by tests and the demo; never used for a first-time visitor. */
export function createDemoState(): AtlasState {
  const now = Date.now();
  const today = dayKey();
  const dayBefore = (n: number) => dayKey(new Date(now - n * DAY));
  return {
    version: 2,
    onboarded: true,
    name: "Maya Chen",
    handle: "@maya.explores",
    xp: 380,
    streak: 6,
    bestStreak: 9,
    lastActiveDay: today,
    xpByDay: {
      [today]: 45,
      [dayBefore(1)]: 140,
      [dayBefore(2)]: 80,
      [dayBefore(3)]: 110,
      [dayBefore(4)]: 35,
      [dayBefore(5)]: 60,
      [dayBefore(6)]: 25,
    },
    watched: ["spotlight-effect"],
    liked: ["cleopatra-timeline"],
    saved: ["zeigarnik"],
    shorts: {
      "spotlight-effect": { position: 1, completed: true, updatedAt: now - 0.2 * DAY },
      zeigarnik: { position: 0.35, completed: false, updatedAt: now - 0.02 * DAY },
      "gps-einstein": { position: 0.62, completed: false, updatedAt: now - 1 * DAY },
    },
    episodes: {
      "mem-1": { position: 1, completed: true, updatedAt: now - 2 * DAY },
      "mem-2": { position: 0.35, completed: false, updatedAt: now - 0.05 * DAY },
    },
    history: [
      { kind: "short", id: "zeigarnik", at: now - 0.02 * DAY },
      { kind: "episode", id: "mem-2", at: now - 0.05 * DAY },
      { kind: "episode", id: "mem-1", at: now - 2 * DAY },
      { kind: "short", id: "spotlight-effect", at: now - 0.2 * DAY },
      { kind: "short", id: "gps-einstein", at: now - 1 * DAY },
    ],
    completedQuests: { "mind-tricks": { xp: 60, score: "3/3" } },
    unlockedSkills: ["psy-1", "sci-1", "tec-1"],
    achievements: {},
    claimedGoals: [],
    interests: ["psychology", "science", "technology"],
    ambitions: ["Understand how the mind really works", "Launch my first side project"],
    memory: {
      "spotlight-effect": {
        attempts: 3,
        correct: 2,
        strength: 0.55,
        ease: 2.3,
        interval: 2,
        dueDay: shiftDay(today, -1),
        lastSeen: shiftDay(today, -3),
      },
      "memory-reconstruction": {
        attempts: 1,
        correct: 0,
        strength: 0.2,
        ease: 1.98,
        interval: 1,
        dueDay: today,
        lastSeen: shiftDay(today, -1),
      },
      "cosmic-scale": {
        attempts: 2,
        correct: 2,
        strength: 0.72,
        ease: 2.38,
        interval: 4,
        dueDay: shiftDay(today, 2),
        lastSeen: shiftDay(today, -2),
      },
    },
    reviewLog: [
      {
        at: now - 3 * DAY,
        conceptId: "spotlight-effect",
        correct: true,
        source: "review",
      },
      {
        at: now - 2 * DAY,
        conceptId: "cosmic-scale",
        correct: true,
        source: "quiz",
      },
      {
        at: now - 1 * DAY,
        conceptId: "memory-reconstruction",
        correct: false,
        source: "review",
      },
    ],
    reviewXpByDay: {},
  };
}

export interface XpEvent {
  id: number;
  amount: number;
  label: string;
}

interface AtlasContextValue {
  state: AtlasState;
  hydrated: boolean;
  recoveryBackup: string | null;
  clearRecoveryBackup: () => void;
  level: LevelInfo;
  skillPoints: number;
  today: string;
  todayXp: number;
  dailyGoalXp: number;
  dailyGoalBonus: number;
  goalClaimed: boolean;
  events: XpEvent[];
  levelUp: number | null;
  achievementQueue: string[];
  dismissLevelUp: () => void;
  dismissAchievement: () => void;
  watchCard: (id: string) => void;
  watchEpisode: (id: string) => void;
  saveProgress: (kind: ContentKind, id: string, position: number) => void;
  trackOpen: (kind: ContentKind, id: string) => void;
  claimDailyGoal: () => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  completeQuest: (id: string, xp: number, score?: string) => void;
  unlockSkill: (id: string) => { ok: boolean; reason?: string };
  canUnlockSkill: (id: string) => { ok: boolean; reason?: string };
  toggleInterest: (id: CategoryId) => void;
  addAmbition: (text: string) => void;
  removeAmbition: (text: string) => void;
  recordReview: (conceptId: string, correct: boolean) => void;
  recordQuizAttempt: (conceptId: string, correct: boolean) => void;
  importProgress: (raw: string) => { ok: boolean; error?: string };
  updateProfile: (name: string, handle: string) => void;
  completeOnboarding: (name: string, interests: CategoryId[]) => void;
  resetProgress: () => void;
}

const AtlasContext = createContext<AtlasContextValue | null>(null);

function pushHistory(
  history: HistoryEntry[],
  kind: ContentKind,
  id: string,
  at: number,
): HistoryEntry[] {
  return [{ kind, id, at }, ...history.filter((h) => !(h.kind === kind && h.id === id))].slice(
    0,
    60,
  );
}

/** Add XP, extend the streak, and record the day's total in one place. */
export function withXp(state: AtlasState, amount: number, today: string = dayKey()): AtlasState {
  if (amount <= 0) return state;
  const streak = nextStreak(state.streak, state.lastActiveDay, today);
  return {
    ...state,
    xp: state.xp + amount,
    xpByDay: { ...state.xpByDay, [today]: (state.xpByDay[today] ?? 0) + amount },
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    lastActiveDay: today,
  };
}

/** Validate stored state and migrate v1 (watched cards, no resume data). */
function hydrate(
  raw: string | null,
  legacy: string | null,
): { state: AtlasState; recovery: string | null; error: string | null } {
  return restoreProgressBackup(raw, createFreshState(), dayKey(), Date.now(), legacy);
}

export function AtlasProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AtlasState>(createFreshState);
  const [hydrated, setHydrated] = useState(false);
  const [recoveryBackup, setRecoveryBackup] = useState<string | null>(null);
  const [events, setEvents] = useState<XpEvent[]>([]);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<string[]>([]);
  const eventId = useRef(0);
  const pendingLabel = useRef("XP earned");
  const prevXp = useRef<number | null>(null);
  const prevLevel = useRef<number | null>(null);
  const achievementsPrimed = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const legacy = raw ? null : localStorage.getItem(LEGACY_KEY);
      const restored = hydrate(raw, legacy);
      setState(restored.state);
      try {
        const existingRecovery = localStorage.getItem(RECOVERY_KEY);
        if (restored.recovery && !existingRecovery) {
          localStorage.setItem(RECOVERY_KEY, restored.recovery);
          setRecoveryBackup(restored.recovery);
        } else {
          setRecoveryBackup(existingRecovery);
        }
      } catch {
        setRecoveryBackup(restored.recovery);
      }
    } catch {
      /* storage unavailable: run from defaults */
    }
    setHydrated(true);
  }, []);

  // Debounced writes keep rapid playback updates from thrashing storage.
  useEffect(() => {
    if (!hydrated) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* quota or private mode: ignore */
      }
    }, 250);
    return () => clearTimeout(id);
  }, [state, hydrated]);

  const today = dayKey();
  const level = useMemo(() => levelFromXp(state.xp), [state.xp]);
  const skillPoints = useMemo(
    () =>
      availableSkillPoints(
        level.level,
        Object.keys(state.completedQuests).length,
        state.unlockedSkills.length,
      ),
    [level.level, state.completedQuests, state.unlockedSkills.length],
  );
  const todayXp = computeTodayXp(state, today);

  // XP toasts derive from the XP delta, so every award path gets one.
  useEffect(() => {
    if (!hydrated) return;
    if (prevXp.current === null) {
      prevXp.current = state.xp;
      return;
    }
    const delta = state.xp - prevXp.current;
    prevXp.current = state.xp;
    if (delta <= 0) return;
    const id = ++eventId.current;
    const label = pendingLabel.current;
    setEvents((list) => [...list, { id, amount: delta, label }]);
    // No cleanup here: clearing this timer on the next award would strand the toast.
    setTimeout(() => setEvents((list) => list.filter((e) => e.id !== id)), 2100);
  }, [state.xp, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (prevLevel.current === null) {
      prevLevel.current = level.level;
      return;
    }
    if (level.level > prevLevel.current) setLevelUp(level.level);
    prevLevel.current = level.level;
  }, [level.level, hydrated]);

  // Achievements are evaluated from derived stats, so any action can unlock them.
  useEffect(() => {
    if (!hydrated) return;
    const snapshot = buildSnapshot(state);
    const fresh = evaluateAchievements(snapshot).filter((id) => !state.achievements[id]);
    if (fresh.length === 0) return;
    const at = Date.now();
    const additions = Object.fromEntries(fresh.map((id) => [id, at]));
    setState((prev) => ({ ...prev, achievements: { ...prev.achievements, ...additions } }));
    if (achievementsPrimed.current) {
      setAchievementQueue((queue) => [...queue, ...fresh]);
    } else {
      achievementsPrimed.current = true;
    }
  }, [state, hydrated]);

  const watchCard = useCallback((id: string) => {
    pendingLabel.current = "Lesson complete";
    setState((prev) => {
      if (prev.shorts[id]?.completed) return prev;
      const at = Date.now();
      return withXp(
        {
          ...prev,
          watched: prev.watched.includes(id) ? prev.watched : [...prev.watched, id],
          shorts: { ...prev.shorts, [id]: { position: 1, completed: true, updatedAt: at } },
          history: pushHistory(prev.history, "short", id, at),
        },
        XP_PER_CARD,
      );
    });
  }, []);

  const watchEpisode = useCallback((id: string) => {
    const xp = getEpisode(id) ? episodeXp(getEpisode(id)!.episode.seconds) : 30;
    pendingLabel.current = "Deep dive complete";
    setState((prev) => {
      if (prev.episodes[id]?.completed) return prev;
      const at = Date.now();
      return withXp(
        {
          ...prev,
          episodes: { ...prev.episodes, [id]: { position: 1, completed: true, updatedAt: at } },
          history: pushHistory(prev.history, "episode", id, at),
        },
        xp,
      );
    });
  }, []);

  const saveProgress = useCallback((kind: ContentKind, id: string, position: number) => {
    const clamped = Math.max(0, Math.min(1, position));
    setState((prev) => {
      const existing = kind === "short" ? prev.shorts[id] : prev.episodes[id];
      if (existing?.completed) return prev;
      if (existing && Math.abs(existing.position - clamped) < 0.004) return prev;
      const record: VideoProgress = {
        position: clamped,
        completed: false,
        updatedAt: Date.now(),
      };
      return kind === "short"
        ? { ...prev, shorts: { ...prev.shorts, [id]: record } }
        : { ...prev, episodes: { ...prev.episodes, [id]: record } };
    });
  }, []);

  const trackOpen = useCallback((kind: ContentKind, id: string) => {
    setState((prev) => {
      const at = Date.now();
      const latest = prev.history.find((h) => h.kind === kind && h.id === id);
      if (latest && at - latest.at < 30_000) return prev;
      return { ...prev, history: pushHistory(prev.history, kind, id, at) };
    });
  }, []);

  const claimDailyGoal = useCallback(() => {
    pendingLabel.current = "Daily goal bonus";
    setState((prev) => {
      const day = dayKey();
      if ((prev.xpByDay[day] ?? 0) < DAILY_GOAL_XP || prev.claimedGoals.includes(day)) return prev;
      return withXp({ ...prev, claimedGoals: [...prev.claimedGoals, day] }, DAILY_GOAL_BONUS, day);
    });
  }, []);

  const toggleLike = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      liked: prev.liked.includes(id) ? prev.liked.filter((x) => x !== id) : [...prev.liked, id],
    }));
  }, []);

  const toggleSave = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      saved: prev.saved.includes(id) ? prev.saved.filter((x) => x !== id) : [...prev.saved, id],
    }));
  }, []);

  const completeQuest = useCallback((id: string, xp: number, score?: string) => {
    pendingLabel.current = "Quest complete";
    setState((prev) => {
      if (prev.completedQuests[id]) return prev;
      const result: QuestResult = score === undefined ? { xp } : { xp, score };
      return withXp({ ...prev, completedQuests: { ...prev.completedQuests, [id]: result } }, xp);
    });
  }, []);

  const canUnlockSkill = useCallback(
    (id: string): { ok: boolean; reason?: string } => {
      const node = SKILLS.find((s) => s.id === id);
      if (!node) return { ok: false, reason: "Unknown skill" };
      if (state.unlockedSkills.includes(id)) return { ok: false, reason: "Already unlocked" };
      const realm = CATEGORIES.find((c) => c.id === node.category);
      const needLevel = (realm?.unlockLevel ?? 1) + node.levelOffset;
      if (level.level < needLevel) return { ok: false, reason: `Reach level ${needLevel}` };
      const missing = node.requires.filter((r) => !state.unlockedSkills.includes(r));
      if (missing.length) {
        const names = missing.map((m) => SKILLS.find((s) => s.id === m)?.name ?? m).join(" + ");
        return { ok: false, reason: `Unlock ${names} first` };
      }
      if (skillPoints < 1) {
        return { ok: false, reason: "Earn a skill point (level up or finish a quest)" };
      }
      return { ok: true };
    },
    [state.unlockedSkills, level.level, skillPoints],
  );

  const unlockSkill = useCallback(
    (id: string) => {
      const check = canUnlockSkill(id);
      if (!check.ok) return check;
      pendingLabel.current = "Skill unlocked";
      setState((prev) => {
        if (prev.unlockedSkills.includes(id)) return prev;
        return withXp({ ...prev, unlockedSkills: [...prev.unlockedSkills, id] }, XP_PER_NODE);
      });
      return check;
    },
    [canUnlockSkill],
  );

  const toggleInterest = useCallback((id: CategoryId) => {
    setState((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((x) => x !== id)
        : [...prev.interests, id],
    }));
  }, []);

  const addAmbition = useCallback((text: string) => {
    const value = text.trim();
    if (!value) return;
    setState((prev) =>
      prev.ambitions.includes(value) ? prev : { ...prev, ambitions: [...prev.ambitions, value] },
    );
  }, []);

  const removeAmbition = useCallback((text: string) => {
    setState((prev) => ({ ...prev, ambitions: prev.ambitions.filter((a) => a !== text) }));
  }, []);

  // Retrieval practice: memory changes every time, XP is capped daily.
  const recordReview = useCallback((conceptId: string, correct: boolean) => {
    const at = Date.now();
    pendingLabel.current = correct ? "Recall strengthened" : "Review logged";
    setState((prev) => {
      const today = dayKey();
      const record = gradeReview(prev.memory[conceptId], correct, today);
      const earnedToday = prev.reviewXpByDay[today] ?? 0;
      const wanted = correct ? XP_FOR_CORRECT_REVIEW : XP_FOR_REVIEW_ATTEMPT;
      const award = Math.min(wanted, Math.max(0, REVIEW_XP_CAP - earnedToday));
      const base: AtlasState = {
        ...prev,
        memory: { ...prev.memory, [conceptId]: record },
        reviewLog: [...prev.reviewLog, { at, conceptId, correct, source: "review" as const }].slice(
          -300,
        ),
        reviewXpByDay:
          award > 0 ? { ...prev.reviewXpByDay, [today]: earnedToday + award } : prev.reviewXpByDay,
      };
      return award > 0 ? withXp(base, award, today) : base;
    });
  }, []);

  // Quiz answers update mastery without granting extra XP (the quest pays out once).
  const recordQuizAttempt = useCallback((conceptId: string, correct: boolean) => {
    const at = Date.now();
    setState((prev) => {
      const record = gradeReview(prev.memory[conceptId], correct, dayKey());
      return {
        ...prev,
        memory: { ...prev.memory, [conceptId]: record },
        reviewLog: [...prev.reviewLog, { at, conceptId, correct, source: "quiz" as const }].slice(
          -300,
        ),
      };
    });
  }, []);

  const importProgress = useCallback((raw: string) => {
    const result = parseProgressBackup(raw, createFreshState(), dayKey());
    if (!result.ok) return result;
    setState(result.state);
    return { ok: true };
  }, []);

  const clearRecoveryBackup = useCallback(() => {
    try {
      localStorage.removeItem(RECOVERY_KEY);
    } catch {
      /* storage unavailable */
    }
    setRecoveryBackup(null);
  }, []);

  const updateProfile = useCallback((name: string, handle: string) => {
    const cleanName = name.trim().slice(0, 48);
    if (!cleanName) return;
    const cleanHandle = handle.trim().replace(/^@+/, "").slice(0, 32);
    setState((prev) => ({
      ...prev,
      name: cleanName,
      handle: cleanHandle ? `@${cleanHandle}` : prev.handle,
    }));
  }, []);

  const completeOnboarding = useCallback((name: string, interests: CategoryId[]) => {
    const cleanName = name.trim().slice(0, 48);
    setState((prev) => ({
      ...prev,
      name: cleanName || "Learner",
      handle:
        prev.handle ||
        `@${(cleanName || "learner")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "")
          .slice(0, 18)}`,
      interests,
      onboarded: true,
    }));
  }, []);

  const resetProgress = useCallback(() => {
    achievementsPrimed.current = false;
    setAchievementQueue([]);
    setLevelUp(null);
    setEvents([]);
    prevXp.current = null;
    prevLevel.current = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* storage unavailable */
    }
    setState(createFreshState());
  }, []);

  const dismissAchievement = useCallback(() => {
    setAchievementQueue((queue) => queue.slice(1));
  }, []);

  const value: AtlasContextValue = {
    state,
    hydrated,
    level,
    skillPoints,
    today,
    todayXp,
    dailyGoalXp: DAILY_GOAL_XP,
    dailyGoalBonus: DAILY_GOAL_BONUS,
    goalClaimed: state.claimedGoals.includes(today),
    events,
    levelUp,
    achievementQueue,
    dismissLevelUp: () => setLevelUp(null),
    dismissAchievement,
    watchCard,
    watchEpisode,
    saveProgress,
    trackOpen,
    claimDailyGoal,
    toggleLike,
    toggleSave,
    completeQuest,
    unlockSkill,
    canUnlockSkill,
    toggleInterest,
    addAmbition,
    removeAmbition,
    recordReview,
    recordQuizAttempt,
    importProgress,
    recoveryBackup,
    clearRecoveryBackup,
    updateProfile,
    completeOnboarding,
    resetProgress,
  };

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>;
}

export function useAtlas(): AtlasContextValue {
  const ctx = useContext(AtlasContext);
  if (!ctx) throw new Error("useAtlas must be used inside AtlasProvider");
  return ctx;
}
