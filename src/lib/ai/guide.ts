import { askAtlas, type AgentContext, type AgentReply } from "@/lib/agent";
import { buildGuideMessages, type GuideLessonContext } from "./prompt";
import { runProvider } from "./providers";
import { checkAiQuota, consumeAiQuery } from "./usage";
import type { AiConfig, AiLevel } from "./types";

export interface GuideAnswer {
  reply: AgentReply;
  mode: "model" | "library";
  providerLabel?: string;
  notice?: string;
  remaining: number;
}

export interface AskGuideInput {
  question: string;
  context: AgentContext;
  config: AiConfig;
  level: AiLevel;
  lesson?: GuideLessonContext | undefined;
}

function errorText(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "the local model timed out";
  }
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 160);
  }
  return "the local model could not be reached";
}

/**
 * A model-backed Guide with an honest deterministic fallback. The fallback is
 * not presented as AI output; callers render `mode` next to every reply.
 */
export async function askGuide({
  question,
  context,
  config,
  level,
  lesson,
}: AskGuideInput): Promise<GuideAnswer> {
  const fallback = askAtlas(question, context);
  const quota = checkAiQuota();

  if (!config.consent) {
    return { reply: fallback, mode: "library", remaining: quota.remaining };
  }
  if (!quota.allowed) {
    return {
      reply: fallback,
      mode: "library",
      notice: quota.message,
      remaining: 0,
    };
  }

  try {
    const completion = await runProvider(
      config,
      buildGuideMessages({ question, context, level, lesson }),
    );
    consumeAiQuery();
    return {
      reply: {
        text: completion.text.slice(0, 4000),
        actions: fallback.actions.slice(0, 2),
        suggestions: fallback.suggestions,
      },
      mode: "model",
      providerLabel: `${completion.label} · ${completion.model}`,
      notice: "Model-generated. Check important claims against the cited lesson sources.",
      remaining: Math.max(0, quota.remaining - 1),
    };
  } catch (error) {
    return {
      reply: fallback,
      mode: "library",
      notice: `Local model unavailable (${errorText(error)}). Showing the library-grounded answer instead.`,
      remaining: quota.remaining,
    };
  }
}
