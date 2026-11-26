import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(process.cwd(), "docs/backend/schema.sql"), "utf8");

describe("prepared creator-profile security policy", () => {
  it("defines the status guard as a security-definer trigger with an empty search path", () => {
    expect(schema).toMatch(
      /create or replace function public\.guard_creator_profile_status\(\)[\s\S]*?security definer[\s\S]*?set search_path = ''/,
    );
    expect(schema).toContain("create trigger creator_profiles_status_guard");
  });

  it("rejects status changes outside owner and trusted server contexts", () => {
    expect(schema).toContain("new.status is distinct from old.status");
    expect(schema).toContain("coalesce(auth.role(), '') <> 'service_role'");
    expect(schema).toContain("not public.is_owner()");
    expect(schema).toContain("using errcode = '42501'");
  });

  it("keeps creator row updates tied to the authenticated user or platform owner", () => {
    expect(schema).toContain("create policy creator_profiles_own_update");
    expect(schema).toContain("for update using (auth.uid() = user_id or public.is_owner())");
    expect(schema).toContain("create trigger creator_profiles_touch");
  });
});
