import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, Send, Sparkles } from "lucide-react";
import { useAtlas } from "@/lib/atlas-store";
import {
  askAtlas,
  buildAgentContext,
  greeting,
  type AgentAction,
  type AgentReply,
} from "@/lib/agent";
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

interface Message {
  id: number;
  role: "agent" | "user";
  text: string;
  actions: AgentAction[];
  suggestions: string[];
}

function GuidePage() {
  const { q } = Route.useSearch();
  const { state, hydrated } = useAtlas();
  const context = useMemo(() => buildAgentContext(state), [state]);
  const [messages, setMessages] = useState<Message[]>(() => {
    const intro = greeting(context);
    return [
      {
        id: 0,
        role: "agent",
        text: intro.text,
        actions: intro.actions,
        suggestions: intro.suggestions,
      },
    ];
  });
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const pushReply = (reply: AgentReply) => {
    idRef.current += 1;
    setMessages((prev) => [
      ...prev,
      {
        id: idRef.current,
        role: "agent",
        text: reply.text,
        actions: reply.actions,
        suggestions: reply.suggestions,
      },
    ]);
  };

  const send = (value: string) => {
    const text = value.trim();
    if (!text || typing) return;
    idRef.current += 1;
    setMessages((prev) => [
      ...prev,
      { id: idRef.current, role: "user", text, actions: [], suggestions: [] },
    ]);
    setInput("");
    setTyping(true);
    timerRef.current = setTimeout(() => {
      pushReply(askAtlas(text, context));
      setTyping(false);
    }, 520);
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
      },
    ]);
    setTyping(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // Deep links (lesson sources, wrong review answers) arrive with a question ready to send.
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });
  useEffect(() => {
    if (!hydrated || !q || autoSent.current) return;
    autoSent.current = true;
    sendRef.current(q);
  }, [hydrated, q]);

  const last = messages[messages.length - 1];

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
          <p className="truncate text-[11px] text-muted-foreground">
            Rule-based library guide · no model connected
          </p>
        </div>
        <button
          onClick={reset}
          aria-label="Start a new conversation"
          className="rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-4" />
        </button>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
        <div className="mx-auto flex max-w-md flex-col gap-3">
          <div className="mx-auto flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="size-3 text-primary" /> Deterministic answers from the Atlas
            library — not a generative model
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
                        onClick={() => send(suggestion)}
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
          send(input);
        }}
        className="shrink-0 border-t border-border/70 bg-background/85 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-md items-center gap-2">
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
