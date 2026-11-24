import { describe, expect, it } from "vitest";
import { buildStudioScript, buildVtt, formatStamp, runStudioQc, slideSeconds } from "./script";

describe("studio script", () => {
  it("builds a sourced draft from a real lesson", () => {
    const script = buildStudioScript("spotlight-effect", "short");
    expect(script).toBeDefined();
    expect(script?.slides.length).toBeGreaterThanOrEqual(3);
    expect(script?.sources.length).toBeGreaterThan(0);
    expect(script?.slides[0]?.heading).toBe(script?.sourceTitle);
    expect(script?.slides.at(-1)?.heading).toBe("Takeaway");
  });

  it("produces a WebVTT sidecar with one cue per slide", () => {
    const script = buildStudioScript("spotlight-effect", "short");
    if (!script) throw new Error("expected script");
    const vtt = buildVtt(script, 4);
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt.match(/-->/g)).toHaveLength(script.slides.length);
    expect(vtt).toContain("00:00:00.000");
  });

  it("keeps structure checks honest and carries episode sources", () => {
    const script = buildStudioScript("mem-1", "episode");
    if (!script) throw new Error("expected episode script");
    const qc = runStudioQc(script, 4);
    expect(script.sources.length).toBeGreaterThan(0);
    expect(qc.find((check) => check.id === "sources")?.status).toBe("pass");
    expect(qc.find((check) => check.id === "slides")?.status).toBe("pass");
    expect(qc.find((check) => check.id === "captions")?.status).toBe("pass");
  });

  it("warns when a source row is blank or incomplete", () => {
    const script = buildStudioScript("mem-1", "episode");
    if (!script) throw new Error("expected episode script");
    const qc = runStudioQc({ ...script, sources: [{ label: "", url: "" }] }, 4);
    expect(qc.find((check) => check.id === "sources")?.status).toBe("warn");
  });

  it("uses a bounded real-time duration", () => {
    expect(slideSeconds(3)).toBe(12);
    expect(slideSeconds(12)).toBe(45);
    expect(formatStamp(65)).toBe("00:01:05.000");
  });
});
