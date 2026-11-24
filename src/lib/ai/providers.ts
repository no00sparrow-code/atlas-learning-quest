import {
  AI_PROVIDER_LABELS,
  type AiCompletion,
  type AiConfig,
  type AiMessage,
  type AiProviderId,
  type AiProviderStatus,
} from "./types";

interface BrowserLanguageModelSession {
  prompt: (input: string) => Promise<string>;
  destroy?: () => void;
}

interface BrowserLanguageModel {
  availability?: () => Promise<string>;
  create: (options?: {
    initialPrompts?: AiMessage[];
    temperature?: number;
    topK?: number;
    monitor?: (monitor: EventTarget) => void;
  }) => Promise<BrowserLanguageModelSession>;
}

function languageModel(): BrowserLanguageModel | undefined {
  return (globalThis as typeof globalThis & { LanguageModel?: BrowserLanguageModel }).LanguageModel;
}

const CHECK_TIMEOUT_MS = 2500;
const REPLY_TIMEOUT_MS = 70_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function cleanBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function openAiBase(url: string): string {
  return cleanBase(url).replace(/\/v1$/, "");
}

export function isLoopbackEndpoint(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export async function checkProvider(id: AiProviderId, config: AiConfig): Promise<AiProviderStatus> {
  const checkedAt = Date.now();
  const label = AI_PROVIDER_LABELS[id];

  if (id === "on-device") {
    const lm = languageModel();
    if (!lm) {
      return {
        id,
        label,
        state: "not-detected",
        detail:
          "This browser does not expose the built-in LanguageModel API. Use a Chromium build with on-device AI enabled, or configure Ollama below.",
        checkedAt,
      };
    }
    try {
      const availability = (await lm.availability?.()) ?? "available";
      if (availability === "unavailable") {
        return {
          id,
          label,
          state: "not-detected",
          detail: "The browser exposes the API but reports no available on-device model.",
          checkedAt,
        };
      }
      if (availability === "downloadable" || availability === "downloading") {
        return {
          id,
          label,
          state: "needs-download",
          detail:
            "An on-device model is supported but not downloaded yet. The first request will trigger a browser-managed download; Atlas does not host it.",
          checkedAt,
        };
      }
      return {
        id,
        label,
        state: "ready",
        detail: "Browser-managed on-device model is available.",
        checkedAt,
      };
    } catch (error) {
      return {
        id,
        label,
        state: "error",
        detail: error instanceof Error ? error.message : "Could not query the on-device model.",
        checkedAt,
      };
    }
  }

  if (id === "ollama") {
    const url = `${cleanBase(config.ollamaUrl)}/api/tags`;
    try {
      const response = await fetchWithTimeout(url, { method: "GET" }, CHECK_TIMEOUT_MS);
      if (!response.ok) {
        return {
          id,
          label,
          state: "unreachable",
          detail: `Ollama answered HTTP ${response.status}. Check that the server is running.`,
          checkedAt,
        };
      }
      const payload = (await response.json()) as { models?: { name?: string }[] };
      const models = payload.models?.map((model) => model.name).filter(Boolean) ?? [];
      const configured = models.some((name) => name === config.ollamaModel);
      return {
        id,
        label,
        state: "ready",
        detail: configured
          ? `Connected to Ollama. ${config.ollamaModel} is installed.`
          : `Connected to Ollama (${models.length} model${models.length === 1 ? "" : "s"} installed). Pull “${config.ollamaModel}” or change the model name.`,
        checkedAt,
      };
    } catch {
      return {
        id,
        label,
        state: "unreachable",
        detail:
          "Could not reach Ollama. Start it locally and allow this origin with OLLAMA_ORIGINS. Atlas does not proxy it.",
        checkedAt,
      };
    }
  }

  const url = `${openAiBase(config.openaiUrl)}/v1/models`;
  try {
    const response = await fetchWithTimeout(url, { method: "GET" }, CHECK_TIMEOUT_MS);
    if (!response.ok) {
      return {
        id,
        label,
        state: "unreachable",
        detail: `The local OpenAI-compatible server answered HTTP ${response.status}.`,
        checkedAt,
      };
    }
    const payload = (await response.json()) as { data?: { id?: string }[] };
    const models = payload.data?.map((model) => model.id).filter(Boolean) ?? [];
    return {
      id,
      label,
      state: "ready",
      detail: models.length
        ? `Connected. ${models.length} model(s) exposed; configured model: ${config.openaiModel}.`
        : "Connected to a local OpenAI-compatible server.",
      checkedAt,
    };
  } catch {
    return {
      id,
      label,
      state: "unreachable",
      detail:
        "Could not reach the local OpenAI-compatible server. Start it and confirm its CORS origin allows Atlas.",
      checkedAt,
    };
  }
}

async function runOnDevice(messages: AiMessage[]): Promise<AiCompletion> {
  const lm = languageModel();
  if (!lm) throw new AiUnavailableError("This browser has no built-in language model.");
  const system = messages.find((message) => message.role === "system")?.content ?? "";
  const user = messages.find((message) => message.role === "user")?.content ?? "";
  const session = await lm.create({
    initialPrompts: system ? [{ role: "system", content: system }] : [],
    temperature: 0.3,
    topK: 3,
  });
  try {
    const text = await session.prompt(user);
    if (!text.trim()) throw new AiUnavailableError("The on-device model returned an empty reply.");
    return {
      text: text.trim(),
      provider: "on-device",
      label: "On-device model",
      model: "browser-managed",
    };
  } finally {
    session.destroy?.();
  }
}

async function runOllama(messages: AiMessage[], config: AiConfig): Promise<AiCompletion> {
  const response = await fetchWithTimeout(
    `${cleanBase(config.ollamaUrl)}/api/chat`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: config.ollamaModel,
        messages,
        stream: false,
        options: { temperature: 0.3 },
      }),
    },
    REPLY_TIMEOUT_MS,
  );
  if (!response.ok) {
    throw new AiUnavailableError(`Ollama answered HTTP ${response.status}.`);
  }
  const payload = (await response.json()) as { message?: { content?: string } };
  const text = payload.message?.content?.trim();
  if (!text) throw new AiUnavailableError("Ollama returned an empty reply.");
  return {
    text,
    provider: "ollama",
    label: "Ollama",
    model: config.ollamaModel,
  };
}

async function runOpenAiCompatible(messages: AiMessage[], config: AiConfig): Promise<AiCompletion> {
  const response = await fetchWithTimeout(
    `${openAiBase(config.openaiUrl)}/v1/chat/completions`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: config.openaiModel,
        messages,
        temperature: 0.3,
        stream: false,
      }),
    },
    REPLY_TIMEOUT_MS,
  );
  if (!response.ok) {
    throw new AiUnavailableError(`The local server answered HTTP ${response.status}.`);
  }
  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new AiUnavailableError("The local model returned an empty reply.");
  return {
    text,
    provider: "openai-compatible",
    label: "Local model",
    model: config.openaiModel,
  };
}

export async function runProvider(config: AiConfig, messages: AiMessage[]): Promise<AiCompletion> {
  if (!config.consent) {
    throw new AiUnavailableError("Local model processing has not been enabled.");
  }
  if (config.provider === "on-device") return runOnDevice(messages);
  if (config.provider === "ollama") return runOllama(messages, config);
  return runOpenAiCompatible(messages, config);
}
