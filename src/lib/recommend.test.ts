import { describe, expect, it } from "vitest";
import { FEED } from "@/data/cards";
import { CATEGORIES } from "@/data/categories";
import { createDefaultState } from "./atlas-store";
import { rankSeries, rankShorts, recommendNext, scoreShort } from "./recommend";

const state = createDefaultState();

describe("recommendation engine", () => {
  it("puts retrieval before new content when reviews are due", () => {
    const steps = recommendNext(state);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0]?.kind).toBe("review");
    expect(steps[0]?.action.to).toBe("/review");
    expect(steps[0]?.reason.length).toBeGreaterThan(10);
  });

  it("returns a unique, explained next-step list", () => {
    const steps = recommendNext(state, 4);
    const nonReview = steps.filter((step) => step.kind !== "review");
    expect(new Set(nonReview.map((step) => step.kind)).size).toBe(nonReview.length);
    expect(steps.every((step) => step.minutes > 0 && step.xp > 0)).toBe(true);
    expect(steps.every((step) => step.reason.length > 0)).toBe(true);
  });

  it("keeps every feed card exactly once when ranking", () => {
    const ranked = rankShorts(state);
    expect(ranked).toHaveLength(FEED.length);
    expect(new Set(ranked.map((card) => card.id)).size).toBe(FEED.length);
  });

  it("explains an interest match in the score", () => {
    const card = FEED[0];
    if (!card) throw new Error("feed empty");
    const interested = scoreShort({ ...state, interests: [card.category] }, card);
    const uninterested = scoreShort({ ...state, interests: [] }, card);
    expect(interested.score).toBeGreaterThan(uninterested.score);
    expect(interested.reason).toContain("interest");
  });

  it("only ranks series the learner can open", () => {
    const ranked = rankSeries(state);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((series) => series.completed < series.total)).toBe(true);
    expect(CATEGORIES.some((category) => category.id === ranked[0]?.category)).toBe(true);
  });
});
