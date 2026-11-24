import { describe, expect, it } from "vitest";
import { detectBackendReadiness } from "./config";

describe("backend readiness", () => {
  it("stays explicitly unconfigured without public Supabase values", () => {
    const status = detectBackendReadiness({});
    expect(status.configured).toBe(false);
    expect(status.provider).toBe("none");
    expect(status.missing).toEqual(["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]);
    expect(status.note).toMatch(/unavailable/);
  });

  it("detects configuration without claiming authentication or sync works", () => {
    const status = detectBackendReadiness({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY: "public-anon-key",
    });
    expect(status.configured).toBe(true);
    expect(status.host).toBe("example.supabase.co");
    expect(status.note).toMatch(/not enabled/);
    expect(JSON.stringify(status)).not.toContain("public-anon-key");
  });

  it("rejects a malformed project URL", () => {
    const status = detectBackendReadiness({
      VITE_SUPABASE_URL: "not-a-url",
      VITE_SUPABASE_ANON_KEY: "public-anon-key",
    });
    expect(status.configured).toBe(false);
    expect(status.note).toMatch(/not a valid URL/);
  });
});
