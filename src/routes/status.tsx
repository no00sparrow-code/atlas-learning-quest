import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { ATLAS_AGENTS } from "@/lib/ai/agents";
import { runLocalHealthChecks, type HealthCheck, type HealthStatus } from "@/lib/ops/health";
import {
  clearHealthHistory,
  loadHealthHistory,
  recordHealthSnapshot,
  type HealthSnapshot,
} from "@/lib/ops/monitor";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Local status — Atlas" },
      {
        name: "description",
        content:
          "Browser-local integrity checks for Atlas: storage, lesson references, media, local renderer and model provider.",
      },
    ],
  }),
  component: StatusPage,
});

const STATUS_STYLE: Record<HealthStatus, { icon: typeof CheckCircle2; classes: string }> = {
  pass: { icon: CheckCircle2, classes: "text-success" },
  warn: { icon: CircleAlert, classes: "text-warning" },
  fail: { icon: XCircle, classes: "text-destructive" },
  unavailable: { icon: CircleHelp, classes: "text-muted-foreground" },
};

function StatusPage() {
  const [checks, setChecks] = useState<HealthCheck[] | null>(null);
  const [history, setHistory] = useState<HealthSnapshot[]>([]);
  const [running, setRunning] = useState(false);
  const started = useRef(false);

  const run = async () => {
    setRunning(true);
    const result = await runLocalHealthChecks();
    setChecks(result);
    setHistory(recordHealthSnapshot(result));
    setRunning(false);
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    setHistory(loadHealthHistory());
    void run();
  }, []);

  const counts = checks
    ? {
        pass: checks.filter((check) => check.status === "pass").length,
        warn: checks.filter((check) => check.status === "warn").length,
        fail: checks.filter((check) => check.status === "fail").length,
        unavailable: checks.filter((check) => check.status === "unavailable").length,
      }
    : null;

  return (
    <div className="min-h-dvh bg-page pb-24">
      <header className="flex items-center gap-3 border-b border-border/60 bg-background/70 px-3 py-3 backdrop-blur-xl">
        <Link
          to="/profile"
          aria-label="Back to profile"
          className="rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <span className="flex size-10 items-center justify-center rounded-2xl bg-secondary">
          <ShieldCheck className="size-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold leading-tight">Local status</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Browser checks · not platform-wide metrics
          </p>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          aria-label="Re-run local checks"
          className="rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground disabled:opacity-60"
        >
          {running ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        </button>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4">
        <section className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <p className="text-xs font-bold text-warning">
            Read this as a device check, not a dashboard
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Atlas currently runs without a backend, owner account or infrastructure provider. The
            checks below inspect this browser and the bundled lesson data. Anything that needs
            authoritative records is marked <strong className="text-foreground">unavailable</strong>{" "}
            and is never filled with a made-up number.
          </p>
        </section>

        {counts && (
          <section className="grid grid-cols-4 gap-2">
            {(
              [
                ["pass", counts.pass],
                ["warn", counts.warn],
                ["fail", counts.fail],
                ["unavailable", counts.unavailable],
              ] as const
            ).map(([status, count]) => (
              <div
                key={status}
                className="rounded-xl border border-border bg-card p-2.5 text-center"
              >
                <p
                  className={cn(
                    "font-display text-lg font-bold tabular-nums",
                    STATUS_STYLE[status].classes,
                  )}
                >
                  {count}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  {status}
                </p>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-sm font-bold">Latest checks</h2>
          {!checks ? (
            <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Running local checks…
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-border/60">
              {checks.map((check) => {
                const style = STATUS_STYLE[check.status];
                const Icon = style.icon;
                return (
                  <li key={check.id} className="flex items-start gap-2 py-2.5">
                    <Icon className={cn("mt-0.5 size-4 shrink-0", style.classes)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold">
                        {check.label}{" "}
                        <span className="ml-1 rounded bg-secondary px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                          {check.scope}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                        {check.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {checks?.[0] && (
            <p className="mt-2 border-t border-border/60 pt-2 text-[9px] text-muted-foreground">
              Checked {new Date(checks[0].checkedAt).toLocaleString()} · results are local to this
              browser.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-sm font-bold">Agent capabilities</h2>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            A capability list, not a claim of automation. “Not implemented” agents have no hidden
            fallback; “model-gated” means the local Guide works but generative answers need a
            configured model.
          </p>
          <ul className="mt-2 divide-y divide-border/60">
            {ATLAS_AGENTS.map((agent) => (
              <li key={agent.id} className="flex items-start gap-2 py-2 text-[10px]">
                <span
                  className={cn(
                    "mt-0.5 size-2 shrink-0 rounded-full",
                    agent.status === "available"
                      ? "bg-success"
                      : agent.status === "model-gated"
                        ? "bg-warning"
                        : "bg-muted-foreground/50",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground">
                    {agent.name}{" "}
                    <span className="font-normal uppercase tracking-wider text-muted-foreground">
                      {agent.status.replace("-", " ")} · {agent.mode}
                    </span>
                  </p>
                  <p className="text-muted-foreground">{agent.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-bold">Check history</h2>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setHistory(clearHealthHistory())}
                className="text-[10px] font-semibold text-muted-foreground hover:text-destructive"
              >
                Clear history
              </button>
            )}
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Recorded on this device whenever you run a check while the app is open. This is not a
            scheduled server monitor, and it does not observe other devices.
          </p>
          {history.length === 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">No local snapshots yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border/60">
              {history.slice(0, 6).map((snapshot) => (
                <li
                  key={snapshot.id}
                  className="flex flex-wrap items-center gap-2 py-2 text-[10px] text-muted-foreground"
                >
                  <span className="font-semibold text-foreground">
                    {new Date(snapshot.at).toLocaleString()}
                  </span>
                  <span className="text-success">{snapshot.counts.pass} pass</span>
                  <span className="text-warning">{snapshot.counts.warn} warn</span>
                  <span className="text-destructive">{snapshot.counts.fail} fail</span>
                  <span>{snapshot.counts.unavailable} unavailable</span>
                  {snapshot.failed.length > 0 && (
                    <span className="w-full truncate">
                      Needs attention: {snapshot.failed.map((item) => item.label).join(", ")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-dashed border-border bg-background/40 p-4">
          <h2 className="text-xs font-bold">Not measurable yet</h2>
          <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
            <li>• Authoritative online/offline user counts and registrations</li>
            <li>• CPU, RAM, storage and bandwidth consumption</li>
            <li>• Verified or estimated infrastructure spend and revenue</li>
            <li>• Server-side rate limits, spend limits and emergency shutdown</li>
            <li>• Owner admin, moderation queue and security alerts</li>
            <li>• Marketplace purchases and creator payouts</li>
          </ul>
          <p className="mt-2 text-[10px] text-muted-foreground">
            These require an authenticated backend and provider integrations. See the repository
            beta notes for the exact setup required.
          </p>
        </section>
      </main>
    </div>
  );
}
