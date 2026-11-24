import { describe, expect, it } from "vitest";
import { CONCEPTS } from "@/data/concepts";
import {
  buildReviewQueue,
  dueCount,
  gradeReview,
  masteredConcepts,
  masteryLevel,
  prerequisitesMet,
  retentionRate,
  weakConcepts,
  type ConceptMemory,
} from "./memory";

const TODAY = "2026-11-24";

function record(overrides: Partial<ConceptMemory> = {}): ConceptMemory {
  return {
    attempts: 1,
    correct: 1,
    strength: 0.6,
    ease: 2.2,
    interval: 2,
    dueDay: TODAY,
    lastSeen: TODAY,
    ...overrides,
  };
}

describe("memory engine", () => {
  it("grows strength and schedules further out after correct recall", () => {
    const first = gradeReview(undefined, true, TODAY);
    expect(first.attempts).toBe(1);
    expect(first.correct).toBe(1);
    expect(first.strength).toBeGreaterThan(0.3);
    expect(first.interval).toBe(1);
    expect(first.dueDay).toBe("2026-11-25");

    const second = gradeReview(first, true, "2026-11-25");
    expect(second.interval).toBeGreaterThan(first.interval);
    expect(second.strength).toBeGreaterThan(first.strength);
    expect(second.dueDay > "2026-11-25").toBe(true);
  });

  it("drops strength and brings a miss back tomorrow", () => {
    const previous = record({ strength: 0.8, interval: 6 });
    const missed = gradeReview(previous, false, TODAY);
    expect(missed.strength).toBeCloseTo(0.4);
    expect(missed.interval).toBe(1);
    expect(missed.dueDay).toBe("2026-11-25");
    expect(missed.correct).toBe(1);
  });

  it("maps strength to mastery levels", () => {
    expect(masteryLevel(undefined)).toBe("unseen");
    expect(masteryLevel(record({ strength: 0.2 }))).toBe("learning");
    expect(masteryLevel(record({ strength: 0.6 }))).toBe("familiar");
    expect(masteryLevel(record({ strength: 0.85 }))).toBe("mastered");
  });

  it("counts due concepts and recall accuracy", () => {
    const [a, b, c] = CONCEPTS;
    if (!a || !b || !c) throw new Error("concepts missing");
    const memory = {
      [a.id]: record({ dueDay: TODAY }),
      [b.id]: record({ dueDay: "2026-12-01" }),
      [c.id]: record({ attempts: 3, correct: 1, strength: 0.2, dueDay: "2026-12-01" }),
    };
    expect(dueCount(memory, TODAY)).toBe(1);
    expect(retentionRate(memory)).toBeCloseTo(3 / 5);
    expect(masteredConcepts(memory).length).toBe(0);
    expect(weakConcepts(memory).length).toBe(1);
  });

  it("prioritises due concepts, then shaky concepts in the queue", () => {
    const [dueConcept, weakConcept] = CONCEPTS;
    if (!dueConcept || !weakConcept) throw new Error("concepts missing");
    const memory = {
      [dueConcept.id]: record({ dueDay: "2026-11-20", strength: 0.5 }),
      [weakConcept.id]: record({ dueDay: "2026-12-20", strength: 0.2 }),
    };
    const queue = buildReviewQueue(memory, { today: TODAY, limit: 6 });
    expect(queue[0]?.concept.id).toBe(dueConcept.id);
    expect(queue[0]?.reason).toBe("Due for review");
    expect(queue.some((entry) => entry.reason === "Needs repair")).toBe(true);
    expect(queue.every((entry) => entry.question.options.length >= 3)).toBe(true);
    expect(queue.every((entry) => entry.question.answer >= 0)).toBe(true);
  });

  it("builds focused practice for one concept", () => {
    const concept = CONCEPTS[0];
    if (!concept) throw new Error("concept missing");
    const queue = buildReviewQueue({}, { conceptId: concept.id, today: TODAY });
    expect(queue).toHaveLength(1);
    expect(queue[0]?.concept.id).toBe(concept.id);
    expect(queue[0]?.reason).toBe("Focused practice");
  });

  it("can add new concepts whose prerequisites are met", () => {
    const queue = buildReviewQueue({}, { includeNew: true, limit: 10, today: TODAY });
    expect(queue.length).toBeGreaterThan(0);
    expect(queue[0]?.reason).toBe("New concept");
    expect(queue.every((entry) => entry.question.explanation.length > 10)).toBe(true);
  });

  it("requires familiar prerequisites before unlocking a concept", () => {
    const concept = CONCEPTS.find((entry) => entry.requires.length > 0);
    if (!concept) throw new Error("no concept with prerequisites");
    expect(prerequisitesMet(concept, {})).toBe(false);
    const memory: Record<string, ConceptMemory> = {};
    for (const id of concept.requires) memory[id] = record({ strength: 0.6 });
    expect(prerequisitesMet(concept, memory)).toBe(true);
  });
});
