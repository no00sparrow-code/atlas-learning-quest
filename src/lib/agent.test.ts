import { describe, expect, it } from "vitest";
import { askAtlas, buildAgentContext, greeting, searchAtlas } from "./agent";
import { createDefaultState } from "./atlas-store";

const context = buildAgentContext(createDefaultState());

describe("Atlas Guide agent", () => {
  it("greets the learner by name with their level and streak", () => {
    const reply = greeting(context);
    expect(reply.text).toContain("Maya");
    expect(reply.text).toContain(`level ${context.level}`);
    expect(reply.text).toContain(`${context.streak}-day streak`);
  });

  it("sends saved-video questions to the library", () => {
    const reply = askAtlas("Where are my saved videos?", context);
    expect(reply.actions[0]?.to).toBe("/library");
    expect(reply.text).toContain("Library");
  });

  it("finds and links the lesson behind a concept question", () => {
    const reply = askAtlas("Explain the spotlight effect", context);
    expect(reply.text.toLowerCase()).toContain("spotlight");
    expect(reply.actions[0]?.to).toBe("/watch/$cardId");
    expect(reply.actions[0]?.params?.["cardId"]).toBe("spotlight-effect");
  });

  it("recommends a quiz inside the requested realm", () => {
    const reply = askAtlas("Quiz me on history", context);
    expect(reply.actions[0]?.to).toBe("/quests/$questId");
    expect(reply.actions[0]?.params?.["questId"]).toBe("mona-lisa");
  });

  it("keeps a five-minute request short", () => {
    const reply = askAtlas("I only have 5 minutes", context);
    expect(reply.text).toContain("5 minutes");
    expect(reply.actions[0]?.to).toBe("/watch/$cardId");
  });

  it("builds a multi-step plan with real XP values", () => {
    const reply = askAtlas("Make me a study plan for today", context);
    expect(reply.text).toContain("plan for today");
    expect(reply.actions.length).toBeGreaterThanOrEqual(2);
    expect(reply.text).toContain("streak");
  });

  it("answers progress questions with level maths", () => {
    const reply = askAtlas("How am I doing? Show my progress", context);
    expect(reply.text).toContain(`Level ${context.level}`);
    expect(reply.text).toContain("streak");
  });

  it("finds dark-matter content in the deep dives", () => {
    const hits = searchAtlas("dark matter");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.keywords.toLowerCase()).toContain("dark matter");
  });

  it("handles support questions without pretending to fix state", () => {
    const reply = askAtlas("The app is broken and I'm stuck", context);
    expect(reply.text.toLowerCase()).toContain("refresh");
    expect(reply.actions.some((a) => a.to === "/profile")).toBe(true);
  });

  it("sends review questions to the memory inbox", () => {
    const reply = askAtlas("What should I review?", context);
    expect(reply.actions[0]?.to).toBe("/review");
    expect(reply.text.toLowerCase()).toContain("review");
    expect(reply.text.toLowerCase()).toMatch(/due|shaky|weak/);
  });

  it("opens the knowledge map when asked about mastery", () => {
    const reply = askAtlas("Show me my knowledge map", context);
    expect(reply.actions[0]?.to).toBe("/map");
    expect(reply.text).toContain("concepts");
  });

  it("sets a retrieval question without revealing the answer", () => {
    const reply = askAtlas("Give me a practice question", context);
    expect(reply.actions[0]?.to).toBe("/review");
    expect(reply.actions[0]?.search?.["concept"]).toBeTruthy();
    expect(reply.text).toContain("A.");
    expect(reply.text.toLowerCase()).toContain("hidden");
  });

  it("includes demonstrated recall in progress reports", () => {
    const reply = askAtlas("How am I doing? Show my progress", context);
    expect(reply.text).toContain("Demonstrated recall");
    expect(reply.text).toContain(`${context.retention}%`);
    expect(reply.text).toContain(`${context.dueReviews} due`);
  });

  it("searches concepts as well as lessons", () => {
    const hits = searchAtlas("spacing effect");
    expect(hits.some((hit) => hit.kind === "concept")).toBe(true);
  });

  it("falls back honestly for unknown topics", () => {
    const reply = askAtlas("quantum basket weaving on mars", context);
    expect(reply.text.length).toBeGreaterThan(20);
    expect(reply.actions.length).toBeGreaterThan(0);
  });
});
