import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentContext } from "@/lib/agent";
import { DEFAULT_AI_CONFIG } from "./types";
import { buildGuideMessages } from "./prompt";
import { askGuide } from "./guide";
import { checkProvider, isLoopbackEndpoint, runProvider } from "./providers";
import { checkAiQuota, consumeAiQuery, loadUsage } from "./usage";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

const context: AgentContext = {
  name: "Ada",
  level: 4,
  xpIntoLevel: 120,
  xpNeeded: 300,
  streak: 6,
  bestStreak: 8,
  todayXp: 20,
  skillPoints: 1,
  interests: ["psychology"],
  completedShorts: ["private-id"],
  completedEpisodes: [],
  completedQuests: [],
  inProgress: [
    {
      id: "spotlight-effect",
      kind: "short",
      title: "The spotlight effect",
      position: 14,
    },
  ],
  achievements: 2,
  achievementTotal: 12,
  savedCount: 3,
  activeToday: true,
  streakAtRisk: false,
  dueReviews: 2,
  weakConcepts: [{ id: "spacing", name: "Spacing effect", strength: 34 }],
  retention: 68,
  mastered: 3,
};

describe("Guide prompt", () => {
  it("includes the level instruction, weak concept and lesson, without raw progress arrays", () => {
    const messages = buildGuideMessages({
      question: "Why does everyone notice my mistakes?",
      context,
      level: "simple",
      lesson: {
        title: "The spotlight effect",
        kind: "short",
        summary: "We overestimate how much others notice us.",
        sourceLabels: ["Spotlight effect — Wikipedia"],
      },
    });
    expect(messages).toHaveLength(2);
    expect(messages[0]?.content).toContain("curious beginner");
    expect(messages[1]?.content).toContain("Spacing effect");
    expect(messages[1]?.content).toContain("The spotlight effect");
    expect(messages[1]?.content).toContain("Spotlight effect — Wikipedia");
    expect(messages[1]?.content).not.toContain("private-id");
  });

  it("uses a deeper instruction for deep questions", () => {
    const messages = buildGuideMessages({ question: "Explain", context, level: "deep" });
    expect(messages[0]?.content).toContain("counterexample");
  });
});

describe("local model configuration", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("does not call a model without explicit consent", async () => {
    await expect(runProvider(DEFAULT_AI_CONFIG, [])).rejects.toThrow(/not been enabled/);
    const answer = await askGuide({
      question: "What should I review?",
      context,
      config: DEFAULT_AI_CONFIG,
      level: "standard",
    });
    expect(answer.mode).toBe("library");
    expect(answer.reply.text.length).toBeGreaterThan(20);
  });

  it("recognises local endpoints and flags remote ones", () => {
    expect(isLoopbackEndpoint("http://127.0.0.1:11434")).toBe(true);
    expect(isLoopbackEndpoint("http://localhost:1234/v1")).toBe(true);
    expect(isLoopbackEndpoint("https://models.example.com")).toBe(false);
    expect(isLoopbackEndpoint("not a url")).toBe(false);
  });

  it("reports the browser LanguageModel API as unavailable when it is absent", async () => {
    vi.stubGlobal("LanguageModel", undefined);
    const status = await checkProvider("on-device", DEFAULT_AI_CONFIG);
    expect(status.state).toBe("not-detected");
    expect(status.detail).toMatch(/does not expose/);
  });

  it("parses a local OpenAI-compatible completion only when consent is on", async () => {
    const config = {
      ...DEFAULT_AI_CONFIG,
      consent: true,
      provider: "openai-compatible" as const,
      openaiUrl: "http://127.0.0.1:1234/v1",
      openaiModel: "test-model",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Spaced repetition strengthens recall." } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await runProvider(config, [{ role: "user", content: "Why review?" }]);
    expect(result.text).toContain("Spaced repetition");
    expect(result.provider).toBe("openai-compatible");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:1234/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("never presents a failed local model as a model answer", async () => {
    const config = {
      ...DEFAULT_AI_CONFIG,
      consent: true,
      provider: "openai-compatible" as const,
      openaiUrl: "http://127.0.0.1:9",
    };
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("connection refused")));
    const answer = await askGuide({
      question: "What is spaced repetition?",
      context,
      config,
      level: "standard",
    });
    expect(answer.mode).toBe("library");
    expect(answer.notice).toMatch(/unavailable/);
  });
});

describe("local allowances", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("starts with a full daily allowance and refuses past the cap", () => {
    expect(loadUsage().aiQueries).toBe(0);
    expect(checkAiQuota().remaining).toBe(24);
    for (let i = 0; i < 24; i += 1) consumeAiQuery();
    expect(checkAiQuota().allowed).toBe(false);
    expect(consumeAiQuery().allowed).toBe(false);
    expect(checkAiQuota().message).toMatch(/resets tomorrow/);
  });
});
