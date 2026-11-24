import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  RotateCcw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAtlas } from "@/lib/atlas-store";
import { buildAgentContext, greeting, type AgentAction, type AgentReply } from "@/lib/agent";
import {
  AI_PROVIDER_LABELS,
  DEFAULT_AI_CONFIG,
  askGuide,
  checkProvider,
  loadAiConfig,
  loadUsage,
  saveAiConfig,
  isLoopbackEndpoint,
  LOCAL_LIMITS,
  type AiConfig,
  type AiLevel,
  type AiProviderId,
  type AiProviderStatus,
} from "@/lib/ai";
import type { GuideLessonContext } from "@/lib/ai/prompt";
import { FEED } from "@/data/cards";
import { ALL_EPISODES } from "@/data/series";
import { sourcesFor } from "@/data/sources";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/guide")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q = search["q"];
    return typeof q === "string" && q.trim().length > 0 ? { q: q.slice(0, 600) } : {};
  },
  head: () => ({
    meta: [
      { title: "Atlas Guide — learning & support" },
      {
        name: "description",
        content:
          "Ask Atlas to explain a lesson, plan your study time, find a quest or help you navigate the app.",
      },
      { property: "og:title", content: "Atlas Guide — learning & support" },
      {
        property: "og:description",
        content: "Your in-app guide for explanations, study plans and navigation help.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GuidePage,
});

interface MessageMeta {
  mode: "model" | "library";
  label?: string;
  notice?: string;
}

interface Message {
  id: number;
  role: "agent" | "user";
  text: string;
  actions: AgentAction[];
  suggestions: string[];
  meta?: MessageMeta;
}

const LEVELS: { id: AiLevel; label: string }[] = [
  { id: "simple", label: "Simple" },
  { id: "standard", label: "Standard" },
  { id: "deep", label: "Deeper" },
];

function lessonFromContext(
  inProgress: ReturnType<typeof buildAgentContext>["inProgress"],
): GuideLessonContext | undefined {
  const item = inProgress[0];
  if (!item) return undefined;
  if (item.kind === "short") {
    const card = FEED.find((entry) => entry.id === item.id);
    if (!card) return undefined;
    return {
      title: card.title,
      kind: "short",
      summary: card.hook,
      points: card.points,
      sourceLabels: sourcesFor(card.id).map((source) => source.label),
    };
  }
  const episode = ALL_EPISODES.find((entry) => entry.id === item.id);
  if (!episode) return undefined;
  return {
    title: `Episode ${episode.number}: ${episode.title}`,
    kind: "episode",
    summary: episode.summary,
    points: episode.takeaways,
  };
}

function GuidePage() {
  const { q } = Route.useSearch();
  const { state, hydrated } = useAtlas();
  const context = useMemo(() => buildAgentContext(state), [state]);
  const lesson = useMemo(() => lessonFromContext(context.inProgress), [context.inProgress]);
  const [messages, setMessages] = useState<Message[]>(() => {
    const intro = greeting(context);
    return [
      {
        id: 0,
        role: "agent",
        text: intro.text,
        actions: intro.actions,
        suggestions: intro.suggestions,
        meta: { mode: "library" },
      },
    ];
  });
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [level, setLevel] = useState<AiLevel>("standard");
  const [config, setConfig] = useState<AiConfig>(DEFAULT_AI_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [status, setStatus] = useState<AiProviderStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [remaining, setRemaining] = useState<number>(LOCAL_LIMITS.aiQueriesPerDay);
  const idRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);
  const configRef = useRef(config);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const saved = loadAiConfig();
    setConfig(saved);
    configRef.current = saved;
    const used = loadUsage().aiQueries;
    setRemaining(Math.max(0, LOCAL_LIMITS.aiQueriesPerDay - used));
    setConfigLoaded(true);
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  useEffect(() => {
    if (!configLoaded || !config.consent || config.provider !== "on-device") return;
    let cancelled = false;
    void checkProvider("on-device", DEFAULT_AI_CONFIG).then((result) => {
      if (!cancelled) setStatus(result);
    });
    return () => {
      cancelled = true;
    };
  }, [config.consent, config.provider, configLoaded]);

  const updateConfig = (patch: Partial<AiConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      saveAiConfig(next);
      configRef.current = next;
      return next;
    });
    setStatus(null);
  };

  const runCheck = async () => {
    if (!config.consent) {
      setStatus({
        id: config.provider,
        label: AI_PROVIDER_LABELS[config.provider],
        state: "error",
        detail: "Enable local processing below before checking a model connection.",
        checkedAt: Date.now(),
      });
      return;
    }
    setChecking(true);
    const result = await checkProvider(config.provider, config);
    if (mounted.current) {
      setStatus(result);
      setChecking(false);
    }
  };

  const pushAnswer = (reply: AgentReply, meta: MessageMeta) => {
    idRef.current += 1;
    setMessages((prev) => [
      ...prev,
      {
        id: idRef.current,
        role: "agent",
        text: reply.text,
        actions: reply.actions,
        suggestions: reply.suggestions,
        meta,
      },
    ]);
  };

  const send = async (value: string) => {
    const text = value.trim();
    if (!text || typing || !configLoaded) return;
    idRef.current += 1;
    setMessages((prev) => [
      ...prev,
      { id: idRef.current, role: "user", text, actions: [], suggestions: [] },
    ]);
    setInput("");
    setTyping(true);
    const answer = await askGuide({
      question: text,
      context,
      config: configRef.current,
      level,
      lesson,
    });
    if (!mounted.current) return;
    setRemaining(answer.remaining);
    pushAnswer(answer.reply, {
      mode: answer.mode,
      ...(answer.providerLabel ? { label: answer.providerLabel } : {}),
      ...(answer.notice ? { notice: answer.notice } : {}),
    });
    setTyping(false);
  };

  const reset = () => {
    const intro = greeting(context);
    setMessages([
      {
        id: 0,
        role: "agent",
        text: intro.text,
        actions: intro.actions,
        suggestions: intro.suggestions,
        meta: { mode: "library" },
      },
    ]);
    setTyping(false);
  };

  // Deep links (lesson sources, wrong review answers) arrive with a question ready to send.
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });
  useEffect(() => {
    if (!hydrated || !q || autoSent.current || !configLoaded) return;
    autoSent.current = true;
    void sendRef.current(q);
  }, [hydrated, q, configLoaded]);

  const last = messages[messages.length - 1];
  const modelEnabled = config.consent;
  const statusReady = status?.state === "ready";
  const statusUsable = statusReady || status?.state === "needs-download";
  const headerDetail = !modelEnabled
    ? "Rule-based library guide · no model connected"
    : statusReady
      ? `Local model connected · ${AI_PROVIDER_LABELS[config.provider]}`
      : status?.state === "unreachable"
        ? "Local model unreachable · library fallback"
        : status?.state === "not-detected"
          ? "No local model detected · library fallback"
          : status?.state === "needs-download"
            ? "On-device model needs download"
            : "Local model enabled · connection not checked";

  return (
    <div className="flex h-dvh flex-col bg-page">
      <header className="flex shrink-0 items-center gap-3 border-b border-border/60 bg-background/70 px-3 py-3 backdrop-blur-xl">
        <Link
          to="/"
          aria-label="Back to Atlas"
          className="rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <span className="relative flex size-10 items-center justify-center rounded-2xl bg-gradient-xp shadow-glow">
          <Sparkles className="size-5 text-primary-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold leading-tight">Atlas Guide</p>
          <p className="truncate text-[11px] text-muted-foreground">{headerDetail}</p>
        </div>
        <button
          onClick={() => setSettingsOpen((open) => !open)}
          aria-label="Guide model settings"
          aria-expanded={settingsOpen}
          className={cn(
            "rounded-full p-2 transition-colors",
            settingsOpen
              ? "bg-primary/15 text-primary"
              : "bg-secondary text-muted-foreground hover:text-foreground",
          )}
        >
          <Settings2 className="size-4" />
        </button>
        <button
          onClick={reset}
          aria-label="Start a new conversation"
          className="rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-4" />
        </button>
      </header>

      {settingsOpen && (
        <section className="max-h-[55vh] shrink-0 overflow-y-auto border-b border-border/60 bg-card/80 px-3 py-3">
          <div className="mx-auto max-w-md space-y-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Models are optional and run on <strong className="text-foreground">your</strong>{" "}
                device or a server you run. Atlas has no model API key and sends no Guide
                conversation to a central service. Rule-based answers always stay available.
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border/70 bg-background/60 p-2.5 text-xs">
              <input
                type="checkbox"
                checked={config.consent}
                onChange={(event) => updateConfig({ consent: event.target.checked })}
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span>
                Enable local model processing
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  Used only when you send a Guide question. Capped at 24 requests a day on this
                  device.
                </span>
              </span>
            </label>

            <label className="block text-[11px] font-semibold text-muted-foreground">
              Model source
              <select
                value={config.provider}
                onChange={(event) => updateConfig({ provider: event.target.value as AiProviderId })}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground"
              >
                <option value="on-device">Browser on-device model</option>
                <option value="ollama">Ollama on this computer</option>
                <option value="openai-compatible">Local OpenAI-compatible server</option>
              </select>
            </label>

            {config.provider === "ollama" && (
              <div className="grid grid-cols-[1fr_1fr] gap-2">
                <label className="block text-[11px] font-semibold text-muted-foreground">
                  Ollama URL
                  <input
                    value={config.ollamaUrl}
                    onChange={(event) => updateConfig({ ollamaUrl: event.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-muted-foreground">
                  Model
                  <input
                    value={config.ollamaModel}
                    onChange={(event) => updateConfig({ ollamaModel: event.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs"
                  />
                </label>
              </div>
            )}

            {config.provider === "openai-compatible" && (
              <div className="grid grid-cols-[1fr_1fr] gap-2">
                <label className="block text-[11px] font-semibold text-muted-foreground">
                  Server URL
                  <input
                    value={config.openaiUrl}
                    onChange={(event) => updateConfig({ openaiUrl: event.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-muted-foreground">
                  Model
                  <input
                    value={config.openaiModel}
                    onChange={(event) => updateConfig({ openaiModel: event.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs"
                  />
                </label>
              </div>
            )}

            {config.provider !== "on-device" &&
              !isLoopbackEndpoint(
                config.provider === "ollama" ? config.ollamaUrl : config.openaiUrl,
              ) && (
                <p className="rounded-lg border border-warning/30 bg-warning/10 p-2 text-[10px] leading-relaxed text-warning">
                  This endpoint is not loopback. Requests will leave this device and Atlas cannot
                  verify who receives them. Use a server you trust, and do not paste secrets into
                  this field — credentials are not supported.
                </p>
              )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void runCheck()}
                disabled={checking}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-secondary px-3 text-[11px] font-bold text-foreground disabled:opacity-60"
              >
                {checking ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : statusUsable ? (
                  <Wifi className="size-3.5 text-success" />
                ) : (
                  <WifiOff className="size-3.5" />
                )}
                {checking ? "Checking…" : "Check connection"}
              </button>
              <span className="text-[10px] text-muted-foreground">
                CORS must allow this origin.
              </span>
            </div>

            {status && (
              <p
                role="status"
                className={cn(
                  "rounded-lg border p-2 text-[10px] leading-relaxed",
                  statusUsable
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-warning/30 bg-warning/10 text-warning",
                )}
              >
                {status.detail}
              </p>
            )}

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              No hosted fallback is configured. If the model is unavailable, Atlas answers from its
              lesson library and labels that answer as library-based.
            </p>
          </div>
        </section>
      )}

      <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
        <div className="mx-auto flex max-w-md flex-col gap-3">
          <div className="mx-auto flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="size-3 text-primary" />
            {modelEnabled
              ? "Local model first · fallback answers from the Atlas library"
              : "Deterministic answers from the Atlas library — not a generative model"}
          </div>

          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              <div
                className={cn(
                  "flex gap-2",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {message.role === "agent" && (
                  <span className="mt-auto flex size-7 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <Sparkles className="size-3.5 text-primary" />
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    message.role === "user"
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md border border-border/60 bg-card text-foreground/90",
                  )}
                >
                  {message.text}
                </div>
              </div>

              {message.role === "agent" && message.meta && (
                <div className="ml-9 flex flex-col gap-1">
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-secondary/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    {message.meta.mode === "model" ? (
                      <>
                        <Wifi className="size-2.5 text-success" />
                        Local model · {message.meta.label}
                      </>
                    ) : (
                      <>
                        <Check className="size-2.5" />
                        Library answer
                      </>
                    )}
                  </span>
                  {message.meta.notice && (
                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      {message.meta.notice}
                    </p>
                  )}
                </div>
              )}

              {message.role === "agent" && message.actions.length > 0 && (
                <div className="ml-9 flex flex-wrap gap-2">
                  {message.actions.slice(0, 3).map((action, index) => (
                    <AgentActionLink
                      key={`${message.id}-${action.label}`}
                      action={action}
                      primary={index === 0}
                    />
                  ))}
                </div>
              )}

              {message.id === last?.id &&
                message.role === "agent" &&
                message.suggestions.length > 0 && (
                  <div className="ml-9 flex flex-wrap gap-1.5 pt-1">
                    {message.suggestions.slice(0, 4).map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => void send(suggestion)}
                        className="rounded-full border border-border/70 bg-background/60 px-2.5 py-1.5 text-left text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
            </div>
          ))}

          {typing && (
            <div className="flex gap-2">
              <span className="mt-auto flex size-7 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <Sparkles className="size-3.5 text-primary" />
              </span>
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border/60 bg-card px-3.5 py-3">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${dot * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="shrink-0 border-t border-border/70 bg-background/85 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-md space-y-2">
          {modelEnabled && (
            <div className="flex items-center justify-between gap-2">
              <div
                role="group"
                aria-label="Explanation level"
                className="flex rounded-lg bg-secondary p-0.5"
              >
                {LEVELS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={level === option.id}
                    onClick={() => setLevel(option.id)}
                    className={cn(
                      "rounded-md px-2 py-1 text-[10px] font-bold transition-colors",
                      level === option.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {remaining} model {remaining === 1 ? "answer" : "answers"} left today
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about a topic, plan or where to find something…"
              aria-label="Message Atlas Guide"
              className="h-11 min-w-0 flex-1 rounded-2xl border border-border bg-card px-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              aria-label="Send message"
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-2xl transition-all active:scale-95",
                input.trim() && !typing
                  ? "bg-gradient-xp text-primary-foreground shadow-glow"
                  : "cursor-not-allowed bg-secondary text-muted-foreground",
              )}
            >
              <Send className="size-4" />
            </button>
          </div>
          {!modelEnabled && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="mx-auto flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="size-3" />
              Connect a local model for adaptive explanations
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function AgentActionLink({ action, primary }: { action: AgentAction; primary?: boolean }) {
  const props = {
    to: action.to as "/",
    params: (action.params ?? {}) as never,
    search: (action.search ?? {}) as never,
    className: cn(
      "flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-all active:scale-95",
      primary
        ? "bg-primary text-primary-foreground shadow-glow"
        : "border border-border/70 bg-card text-foreground/85 hover:border-primary/40",
    ),
  };
  return (
    <Link {...props}>
      {action.label}
      <ArrowRight className="size-3" />
    </Link>
  );
}
