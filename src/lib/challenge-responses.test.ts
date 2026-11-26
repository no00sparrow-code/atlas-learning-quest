import { describe, expect, it } from "vitest";
import { buildChallengeResponse } from "./challenge-responses";

describe("practical challenge responses", () => {
  it("stores a trimmed write-challenge response with a timestamp", () => {
    const response = buildChallengeResponse("feynman-sprint", `  ${"A".repeat(80)}  `, 123);

    expect(response).toEqual({ text: "A".repeat(80), updatedAt: 123 });
  });

  it("rejects short answers and non-write quests", () => {
    expect(buildChallengeResponse("feynman-sprint", "Too short")).toBeNull();
    expect(buildChallengeResponse("mona-lisa", "A".repeat(100))).toBeNull();
    expect(buildChallengeResponse("curiosity-streak", "A".repeat(100))).toBeNull();
    expect(buildChallengeResponse("missing-quest", "A".repeat(100))).toBeNull();
  });

  it("bounds stored answer length", () => {
    const response = buildChallengeResponse("feynman-sprint", "A".repeat(6_000), 456);

    expect(response?.text).toHaveLength(5_000);
    expect(response?.updatedAt).toBe(456);
  });
});
