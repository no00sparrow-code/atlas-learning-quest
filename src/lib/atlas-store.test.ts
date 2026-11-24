import { describe, expect, it } from "vitest";
import { createDemoState, createFreshState } from "./atlas-store";

describe("Atlas state defaults", () => {
  it("starts a new learner with no fabricated history and onboarding open", () => {
    const state = createFreshState();
    expect(state.onboarded).toBe(false);
    expect(state.xp).toBe(0);
    expect(state.streak).toBe(0);
    expect(state.history).toHaveLength(0);
    expect(state.watched).toHaveLength(0);
    expect(state.saved).toHaveLength(0);
    expect(state.memory).toEqual({});
    expect(state.interests).toEqual([]);
  });

  it("keeps the seeded demo explicitly separate for tests and demos", () => {
    const demo = createDemoState();
    expect(demo.onboarded).toBe(true);
    expect(demo.xp).toBeGreaterThan(0);
    expect(demo.history.length).toBeGreaterThan(0);
    expect(demo.name).toBe("Maya Chen");
  });
});
