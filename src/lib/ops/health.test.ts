import { beforeEach, describe, expect, it, vi } from "vitest";
import { runLocalHealthChecks } from "./health";

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

describe("local health checks", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("marks platform-wide metrics unavailable instead of inventing them", async () => {
    const checks = await runLocalHealthChecks();
    const platform = checks.find((check) => check.id === "platform");
    expect(platform?.status).toBe("unavailable");
    expect(platform?.detail).toMatch(/not estimated/);
    expect(checks.some((check) => check.id === "storage")).toBe(true);
    expect(checks.find((check) => check.id === "content-ids")?.status).toBe("pass");
    expect(checks.find((check) => check.id === "sources")?.status).toBe("pass");
  });
});
