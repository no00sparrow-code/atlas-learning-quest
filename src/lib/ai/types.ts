export type AiProviderId = "on-device" | "ollama" | "openai-compatible";

export type AiLevel = "simple" | "standard" | "deep";

export interface AiConfig {
  provider: AiProviderId;
  /** Explicit opt-in. No model request is made without this. */
  consent: boolean;
  ollamaUrl: string;
  ollamaModel: string;
  openaiUrl: string;
  openaiModel: string;
}

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type AiProviderState = "ready" | "needs-download" | "not-detected" | "unreachable" | "error";

export interface AiProviderStatus {
  id: AiProviderId;
  label: string;
  state: AiProviderState;
  detail: string;
  checkedAt: number;
}

export interface AiCompletion {
  text: string;
  provider: AiProviderId;
  label: string;
  model: string;
}

export const AI_PROVIDER_LABELS: Record<AiProviderId, string> = {
  "on-device": "Browser on-device model",
  ollama: "Ollama (local)",
  "openai-compatible": "OpenAI-compatible local server",
};

export const DEFAULT_AI_CONFIG: AiConfig = {
  provider: "on-device",
  consent: false,
  ollamaUrl: "http://127.0.0.1:11434",
  ollamaModel: "llama3.2",
  openaiUrl: "http://127.0.0.1:1234",
  openaiModel: "local-model",
};
