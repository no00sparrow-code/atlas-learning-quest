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
import {
  availableSkillPoints,
  levelFromXp,
  XP_PER_CARD,
  XP_PER_NODE,
  type LevelInfo,
} from "./progression";

const STORAGE_KEY = "atlas-progress-v1";

export interface QuestResult {
  xp: number;
  score?: string;
}

export interface AtlasState {
  name: string;
  handle: string;
  xp: number;
  xpToday: number;
  streak: number;
  watched: string[];
  liked: string[];
  saved: string[];
  completedQuests: Record<string, QuestResult>;
  unlockedSkills: string[];
  interests: CategoryId[];
  ambitions: string[];
}

export const DEFAULT_STATE: AtlasState = {
  name: "Maya Chen",
  handle: "@maya.explores",
  xp: 380,
  xpToday: 45,
  streak: 6,
  watched: ["spotlight-effect"],
  liked: ["cleopatra-timeline"],
  saved: [],
  completedQuests: { "mind-tricks": { xp: 60, score: "3/3" } },
  unlockedSkills: ["psy-1", "sci-1", "tec-1"],
  interests: ["psychology", "science", "technology"],
  ambitions: ["Understand how the mind really works", "Launch my first side project"],
};

export interface XpEvent {
  id: number;
  amount: number;
  label: string;
}

interface AtlasContextValue {
  state: AtlasState;
  level: LevelInfo;
  skillPoints: number;
  events: XpEvent[];
  levelUp: number | null;
  dismissLevelUp: () => void;
  watchCard: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  completeQuest: (id: string, xp: number, score?: string) => void;
  unlockSkill: (id: string) => { ok: boolean; reason?: string };
  canUnlockSkill: (id: string) => { ok: boolean; reason?: string };
  toggleInterest: (id: CategoryId) => void;
  addAmbition: (text: string) => void;
  removeAmbition: (text: string) => void;
  resetProgress: () => void;
}

const AtlasContext = createContext<AtlasContextValue | null>(null);

export function AtlasProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AtlasState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [events, setEvents] = useState<XpEvent[]>([]);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const eventId = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<AtlasState>) });
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const level = useMemo(() => levelFromXp(state.xp), [state.xp]);
  const skillPoints = availableSkillPoints(
    level.level,
    Object.keys(state.completedQuests).length,
    state.unlockedSkills.length,
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  const grant = useCallback(
    (amount: number, label: string, mutate?: (s: AtlasState) => AtlasState) => {
      const before = levelFromXp(stateRef.current.xp).level;
      const after = levelFromXp(stateRef.current.xp + amount).level;
      setState((prev) => {
        const base = mutate ? mutate(prev) : prev;
        return { ...base, xp: prev.xp + amount, xpToday: prev.xpToday + amount };
      });
      if (after > before) setTimeout(() => setLevelUp(after), 900);
      if (amount > 0) {
        const id = ++eventId.current;
        setEvents((e) => [...e, { id, amount, label }]);
        setTimeout(() => setEvents((e) => e.filter((x) => x.id !== id)), 1900);
      }
    },
    [],
  );

  const watchCard = useCallback(
    (id: string) => {
      if (stateRef.current.watched.includes(id)) return;
      stateRef.current = { ...stateRef.current, watched: [...stateRef.current.watched, id] };
      grant(XP_PER_CARD, "Card complete", (s) =>
        s.watched.includes(id) ? s : { ...s, watched: [...s.watched, id] },
      );
    },
    [grant],
  );

  const toggleIn = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const toggleLike = useCallback((id: string) => {
    setState((s) => ({ ...s, liked: toggleIn(s.liked, id) }));
  }, []);
  const toggleSave = useCallback((id: string) => {
    setState((s) => ({ ...s, saved: toggleIn(s.saved, id) }));
  }, []);

  const completeQuest = useCallback(
    (id: string, xp: number, score?: string) => {
      if (stateRef.current.completedQuests[id]) return;
      const result: QuestResult = score === undefined ? { xp } : { xp, score };
      grant(xp, "Quest complete", (s) => ({
        ...s,
        completedQuests: { ...s.completedQuests, [id]: result },
      }));
    },
    [grant],
  );

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
      if (skillPoints < 1)
        return { ok: false, reason: "Earn a skill point (level up or finish a quest)" };
      return { ok: true };
    },
    [state.unlockedSkills, level.level, skillPoints],
  );

  const unlockSkill = useCallback(
    (id: string) => {
      const check = canUnlockSkill(id);
      if (!check.ok) return check;
      grant(XP_PER_NODE, "Skill unlocked", (s) => ({
        ...s,
        unlockedSkills: s.unlockedSkills.includes(id)
          ? s.unlockedSkills
          : [...s.unlockedSkills, id],
      }));
      return check;
    },
    [canUnlockSkill, grant],
  );

  const toggleInterest = useCallback((id: CategoryId) => {
    setState((s) => ({
      ...s,
      interests: s.interests.includes(id)
        ? s.interests.filter((x) => x !== id)
        : [...s.interests, id],
    }));
  }, []);

  const addAmbition = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    setState((s) => (s.ambitions.includes(t) ? s : { ...s, ambitions: [...s.ambitions, t] }));
  }, []);
  const removeAmbition = useCallback((text: string) => {
    setState((s) => ({ ...s, ambitions: s.ambitions.filter((a) => a !== text) }));
  }, []);

  const resetProgress = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  const value: AtlasContextValue = {
    state,
    level,
    skillPoints,
    events,
    levelUp,
    dismissLevelUp: () => setLevelUp(null),
    watchCard,
    toggleLike,
    toggleSave,
    completeQuest,
    unlockSkill,
    canUnlockSkill,
    toggleInterest,
    addAmbition,
    removeAmbition,
    resetProgress,
  };

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>;
}

export function useAtlas(): AtlasContextValue {
  const ctx = useContext(AtlasContext);
  if (!ctx) throw new Error("useAtlas must be used inside AtlasProvider");
  return ctx;
}
