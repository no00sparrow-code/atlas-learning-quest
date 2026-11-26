import type { CategoryId } from "@/data/categories";
import { CONCEPTS, conceptsForCategory, getConcept, type Concept } from "@/data/concepts";
import { questionsForConcept, type ReviewQuestion } from "@/data/reviewQuestions";
import { dayKey, shiftDay } from "./streak";

/** Per-concept memory state. Strength is demonstrated recall, not watch time. */
export interface ConceptMemory {
  attempts: number;
  correct: number;
  /** 0..1 estimate of how well the concept is retained */
  strength: number;
  /** Spaced-repetition ease, 1.3–2.8 */
  ease: number;
  /** Current interval in days */
  interval: number;
  dueDay: string;
  lastSeen: string;
}

export const REVIEW_XP_CAP = 48;
export const XP_FOR_CORRECT_REVIEW = 6;
export const XP_FOR_REVIEW_ATTEMPT = 2;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * SM-2-inspired update: correct recall grows strength and the interval,
 * a miss drops strength and schedules the concept again tomorrow.
 */
export function gradeReview(
  previous: ConceptMemory | undefined,
  correct: boolean,
  today: string = dayKey(),
): ConceptMemory {
  const base: ConceptMemory = previous ?? {
    attempts: 0,
    correct: 0,
    strength: 0,
    ease: 2.2,
    interval: 0,
    dueDay: today,
    lastSeen: "",
  };

  const strength = correct
    ? clamp(base.strength + (1 - base.strength) * 0.42, 0, 1)
    : clamp(base.strength * 0.5, 0, 1);
  const ease = clamp(base.ease + (correct ? 0.08 : -0.2), 1.3, 2.8);
  const interval = correct
    ? clamp(base.interval > 0 ? Math.round(base.interval * ease) : 1, 1, 120)
    : 1;

  return {
    attempts: base.attempts + 1,
    correct: base.correct + (correct ? 1 : 0),
    strength,
    ease,
    interval,
    dueDay: shiftDay(today, interval),
    lastSeen: today,
  };
}

export type MasteryLevel = "unseen" | "learning" | "familiar" | "mastered";

export function masteryLevel(memory: ConceptMemory | undefined): MasteryLevel {
  if (!memory || memory.attempts === 0) return "unseen";
  if (memory.strength >= 0.8) return "mastered";
  if (memory.strength >= 0.5) return "familiar";
  return "learning";
}

export const MASTERY_LABEL: Record<MasteryLevel, string> = {
  unseen: "Not started",
  learning: "Learning",
  familiar: "Familiar",
  mastered: "Mastered",
};

export function isDue(memory: ConceptMemory | undefined, today: string = dayKey()): boolean {
  return Boolean(memory && memory.attempts > 0 && memory.dueDay <= today);
}

export function dueCount(memory: Record<string, ConceptMemory>, today: string = dayKey()): number {
  return Object.values(memory).filter((record) => isDue(record, today)).length;
}

/** Recall accuracy across everything ever attempted (0..1). */
export function retentionRate(memory: Record<string, ConceptMemory>): number {
  let attempts = 0;
  let correct = 0;
  for (const record of Object.values(memory)) {
    attempts += record.attempts;
    correct += record.correct;
  }
  return attempts === 0 ? 0 : correct / attempts;
}

export function masteredConcepts(memory: Record<string, ConceptMemory>): Concept[] {
  return CONCEPTS.filter((concept) => masteryLevel(memory[concept.id]) === "mastered");
}

export function weakConcepts(
  memory: Record<string, ConceptMemory>,
  limit = 4,
): { concept: Concept; memory: ConceptMemory }[] {
  return CONCEPTS.map((concept) => ({ concept, memory: memory[concept.id] }))
    .filter(
      (item): item is { concept: Concept; memory: ConceptMemory } =>
        item.memory !== undefined && item.memory.attempts > 0 && item.memory.strength < 0.55,
    )
    .sort((a, b) => a.memory.strength - b.memory.strength)
    .slice(0, limit);
}

/** Average strength of attempted concepts in a realm (0 when nothing attempted). */
export function categoryStrength(
  memory: Record<string, ConceptMemory>,
  category: CategoryId,
): number {
  const list = conceptsForCategory(category);
  if (list.length === 0) return 0;
  const total = list.reduce((sum, concept) => sum + (memory[concept.id]?.strength ?? 0), 0);
  return total / list.length;
}

/** Prerequisites are met when they are at least familiar. */
export function prerequisitesMet(concept: Concept, memory: Record<string, ConceptMemory>): boolean {
  return concept.requires.every((id) => {
    const level = masteryLevel(memory[id]);
    return level === "familiar" || level === "mastered";
  });
}

export function nextConceptsToLearn(
  memory: Record<string, ConceptMemory>,
  limit = 3,
  interests: readonly CategoryId[] = [],
): Concept[] {
  const count = Math.max(0, Math.floor(limit));
  if (count === 0) return [];

  const interestSet = new Set(interests);
  const candidates = CONCEPTS.map((concept, index) => ({ concept, index }))
    .filter(
      ({ concept }) =>
        masteryLevel(memory[concept.id]) === "unseen" && prerequisitesMet(concept, memory),
    )
    .sort((a, b) => {
      const interestRank =
        Number(interestSet.has(b.concept.category)) - Number(interestSet.has(a.concept.category));
      return interestRank || a.concept.difficulty - b.concept.difficulty || a.index - b.index;
    });

  const selected: Concept[] = [];
  const selectedCategories = new Set<CategoryId>();
  for (const { concept } of candidates) {
    if (selected.length >= count) break;
    if (!selectedCategories.has(concept.category)) {
      selected.push(concept);
      selectedCategories.add(concept.category);
    }
  }

  for (const { concept } of candidates) {
    if (selected.length >= count) break;
    if (!selected.includes(concept)) selected.push(concept);
  }
  return selected;
}

export type ReviewReason = "Due for review" | "Needs repair" | "New concept" | "Focused practice";

export interface ReviewCandidate {
  concept: Concept;
  question: ReviewQuestion;
  reason: ReviewReason;
  memory?: ConceptMemory;
}

export interface ReviewQueueOptions {
  limit?: number;
  conceptId?: string;
  includeNew?: boolean;
  today?: string;
}

function candidateFor(
  concept: Concept,
  memory: ConceptMemory | undefined,
  reason: ReviewReason,
): ReviewCandidate | null {
  const questions = questionsForConcept(concept.id);
  if (questions.length === 0) return null;
  const index = (memory?.attempts ?? 0) % questions.length;
  const question = questions[index];
  if (!question) return null;
  return { concept, question, reason, ...(memory ? { memory } : {}) };
}

/**
 * Prioritises concepts that are due, then concepts that were missed recently,
 * then (optionally) brand-new concepts whose prerequisites are met.
 */
export function buildReviewQueue(
  memory: Record<string, ConceptMemory>,
  options: ReviewQueueOptions = {},
): ReviewCandidate[] {
  const today = options.today ?? dayKey();
  const limit = Math.max(1, options.limit ?? 6);

  if (options.conceptId) {
    const concept = getConcept(options.conceptId);
    if (!concept) return [];
    const candidate = candidateFor(concept, memory[concept.id], "Focused practice");
    return candidate ? [candidate] : [];
  }

  const due = CONCEPTS.map((concept) => ({ concept, record: memory[concept.id] }))
    .filter(
      (item): item is { concept: Concept; record: ConceptMemory } =>
        item.record !== undefined && isDue(item.record, today),
    )
    .sort(
      (a, b) =>
        a.record.dueDay.localeCompare(b.record.dueDay) || a.record.strength - b.record.strength,
    );

  const weak = CONCEPTS.map((concept) => ({ concept, record: memory[concept.id] }))
    .filter(
      (item): item is { concept: Concept; record: ConceptMemory } =>
        item.record !== undefined &&
        item.record.attempts > 0 &&
        item.record.strength < 0.55 &&
        !isDue(item.record, today),
    )
    .sort((a, b) => a.record.strength - b.record.strength);

  const fresh = options.includeNew
    ? CONCEPTS.filter((concept) => !memory[concept.id] && prerequisitesMet(concept, memory)).sort(
        (a, b) => a.difficulty - b.difficulty,
      )
    : [];

  const results: ReviewCandidate[] = [];
  const seen = new Set<string>();
  const push = (concept: Concept, record: ConceptMemory | undefined, reason: ReviewReason) => {
    if (seen.has(concept.id)) return;
    const candidate = candidateFor(concept, record, reason);
    if (!candidate) return;
    seen.add(concept.id);
    results.push(candidate);
  };

  for (const item of due) push(item.concept, item.record, "Due for review");
  for (const item of weak) push(item.concept, item.record, "Needs repair");
  for (const concept of fresh) push(concept, undefined, "New concept");

  return results.slice(0, limit);
}

/** Concepts whose scheduled review has arrived, ordered by urgency. */
export function dueConcepts(
  memory: Record<string, ConceptMemory>,
  today: string = dayKey(),
): Concept[] {
  return CONCEPTS.filter((concept) => isDue(memory[concept.id], today));
}
