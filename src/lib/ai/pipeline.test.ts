import { describe, expect, it } from "vitest";
import { ATLAS_AGENTS, atlasAgent } from "./agents";
import { runProductionPipeline } from "./pipeline";

describe("Atlas agent catalog", () => {
  it("declares unavailable capabilities honestly and keeps IDs unique", () => {
    const ids = ATLAS_AGENTS.map((agent) => agent.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(atlasAgent("research").status).toBe("not-implemented");
    expect(atlasAgent("narration").status).toBe("not-implemented");
    expect(atlasAgent("render").status).toBe("available");
    expect(atlasAgent("guide").status).toBe("model-gated");
  });
});

describe("local production pipeline", () => {
  it("runs structural stages and leaves factual approval to a human", () => {
    const pipeline = runProductionPipeline("spotlight-effect", "short", 4);
    expect(pipeline).toBeDefined();
    if (!pipeline) throw new Error("expected pipeline");
    const ids = pipeline.stages.map((stage) => stage.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(pipeline.stages).toHaveLength(10);
    expect(pipeline.stages.find((stage) => stage.id === "research")?.status).toBe("unavailable");
    expect(pipeline.stages.find((stage) => stage.id === "narration")?.status).toBe("unavailable");
    expect(pipeline.stages.find((stage) => stage.id === "approval")?.status).toBe("human-required");
    expect(pipeline.canRender).toBe(true);
    expect(pipeline.canApproveAutomatically).toBe(false);
    expect(pipeline.blockers).toContain("Human factual and rights approval is required.");
    expect(pipeline.vtt).toContain("WEBVTT");
  });

  it("carries real episode sources into verification", () => {
    const pipeline = runProductionPipeline("mem-1", "episode", 4);
    expect(pipeline?.stages.find((stage) => stage.id === "verification")?.status).toBe("pass");
    expect(pipeline?.script.sources.length).toBeGreaterThan(0);
  });

  it("returns undefined for an unknown source", () => {
    expect(runProductionPipeline("not-a-lesson", "short", 4)).toBeUndefined();
  });
});
