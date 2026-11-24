export type BackendProvider = "supabase" | "none";

export interface BackendReadiness {
  provider: BackendProvider;
  configured: boolean;
  missing: string[];
  host?: string;
  note: string;
}

type EnvLike = Record<string, string | undefined>;

function browserEnv(): EnvLike {
  return import.meta.env as unknown as EnvLike;
}

function value(env: EnvLike, keys: string[]): string | undefined {
  for (const key of keys) {
    const candidate = env[key]?.trim();
    if (candidate) return candidate;
  }
  return undefined;
}

/**
 * Detects public Supabase configuration without exposing either value. Even a
 * configured project is not "connected": the sync/auth adapter is deliberately
 * not enabled in this build until it can be tested against two real accounts.
 */
export function detectBackendReadiness(env: EnvLike = browserEnv()): BackendReadiness {
  const url = value(env, ["VITE_SUPABASE_URL"]);
  const anonKey = value(env, ["VITE_SUPABASE_ANON_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
  const missing: string[] = [];
  if (!url) missing.push("VITE_SUPABASE_URL");
  if (!anonKey) missing.push("VITE_SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    return {
      provider: "none",
      configured: false,
      missing,
      note: "No backend is configured. Accounts, cloud sync and server-enforced limits are unavailable; local progress still works.",
    };
  }

  let host: string | undefined;
  try {
    host = new URL(url).host;
  } catch {
    return {
      provider: "none",
      configured: false,
      missing: ["a valid VITE_SUPABASE_URL"],
      note: "The Supabase URL is not a valid URL. Nothing will attempt to connect.",
    };
  }

  return {
    provider: "supabase",
    configured: true,
    missing: [],
    host,
    note: `Public Supabase configuration detected for ${host}. Authentication and sync are not enabled in this build until the adapter and RLS policies are tested with two real accounts.`,
  };
}
