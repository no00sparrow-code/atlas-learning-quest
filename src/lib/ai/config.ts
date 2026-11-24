import { DEFAULT_AI_CONFIG, type AiConfig, type AiProviderId } from "./types";

const CONFIG_KEY = "atlas-ai-config-v1";

function normalise(raw: Partial<AiConfig> | null): AiConfig {
  return {
    ...DEFAULT_AI_CONFIG,
    ...(raw ?? {}),
    provider: (raw?.provider as AiProviderId | undefined) ?? DEFAULT_AI_CONFIG.provider,
    consent: raw?.consent === true,
  };
}

/** Local-only AI preferences. There is no API key in this config. */
export function loadAiConfig(): AiConfig {
  if (typeof localStorage === "undefined") return { ...DEFAULT_AI_CONFIG };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return normalise(raw ? (JSON.parse(raw) as Partial<AiConfig>) : null);
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

export function saveAiConfig(config: AiConfig): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(normalise(config)));
  } catch {
    /* private mode or quota: preferences stay in memory only */
  }
}

export function clearAiConfig(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(CONFIG_KEY);
  } catch {
    /* ignore */
  }
}
