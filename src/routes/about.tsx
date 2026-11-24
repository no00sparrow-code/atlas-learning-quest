import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Database, Flag, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About & privacy — Atlas" },
      {
        name: "description",
        content:
          "How the Atlas beta works, where your data is stored, and how to report incorrect content.",
      },
      { property: "og:title", content: "About & privacy — Atlas" },
      {
        property: "og:description",
        content: "Atlas beta: local-only progress, no accounts, and a clear way to report errors.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const REPO = "https://github.com/no00sparrow-code/atlas-learning-quest";

function reportUrl(topic: string): string {
  const title = encodeURIComponent(`Content issue: ${topic}`);
  const body = encodeURIComponent(
    `What is wrong?\n\n\nWhere did you see it? (lesson, episode or quest)\n\n\nSuggested correction / source\n\n`,
  );
  return `${REPO}/issues/new?title=${title}&body=${body}`;
}

function AboutPage() {
  return (
    <div className="pb-nav">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl">
        <Link to="/profile" aria-label="Back to profile" className="rounded-full bg-secondary p-2">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Atlas beta
          </p>
          <p className="font-display text-sm font-bold">About, privacy & corrections</p>
        </div>
        <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gold">
          Beta
        </span>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-4">
        <section className="rounded-3xl border border-border bg-card p-5">
          <h1 className="text-2xl font-black">What this beta is</h1>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">
            Atlas is a learning feed: short visual lessons, multi-episode deep dives, quests, spaced
            review and a knowledge map. This is an early beta — the learning engine and content
            library are real, but some media is still being produced.
          </p>
          <div className="mt-4 space-y-2">
            <Row
              icon={Sparkles}
              title="Shorts are visual micro-lessons"
              body="They use a timed visual card and written insight, not a video file. Deep-dive episodes show a clear missing-video state until media is produced."
            />
            <Row
              icon={Lock}
              title="No account is created"
              body="Progress lives in this browser's localStorage. There is no cloud account, sign-in or cross-device sync in this beta."
            />
          </div>
        </section>

        <section id="privacy" className="rounded-3xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="size-4 text-primary" /> Privacy
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/80">
            <p>
              Atlas does not collect names, email addresses, passwords or payment details. Your
              display name is optional and stored only on this device alongside learning progress.
            </p>
            <p>
              No analytics or advertising scripts are included in this build. The hosting provider
              may receive standard request logs (IP address, user agent) when it serves the app.
            </p>
            <p>
              You can export a JSON backup from{" "}
              <Link
                to="/profile"
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                Profile → Account &amp; data
              </Link>
              , restore it on another browser, or reset all local data from the same screen.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Database className="size-4 text-primary" /> What is stored
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-foreground/80">
            <li>• XP, streaks, levels and daily goal progress</li>
            <li>• Lessons completed, likes, saves and watch history</li>
            <li>• Quiz results and concept memory / review schedule</li>
            <li>• Interests, ambitions and optional display name</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Stored under the browser key{" "}
            <code className="text-foreground/80">atlas-progress-v2</code>. Clearing site data
            removes it permanently.
          </p>
        </section>

        <section id="report" className="rounded-3xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Flag className="size-4 text-accent" /> Report incorrect content
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">
            Educational accuracy matters more than production speed. If a lesson, episode or quiz is
            wrong or misleading, report it with the title and a source where possible.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="glass" size="xl" asChild>
              <a href={reportUrl("lesson or episode")} target="_blank" rel="noreferrer">
                <Flag /> Open a content report
              </a>
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Reports open a GitHub issue. Do not include personal information in the report.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">What is not ready</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-foreground/80">
            <li>• Secure accounts, cloud sync and multi-device progress</li>
            <li>• Produced narration / video for deep-dive episodes</li>
            <li>• A live language-model assistant — the Guide is deterministic</li>
            <li>• Public deployment; this build is a local preview</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            The app never asks for a password or payment inside this beta.
          </p>
        </section>
      </div>
    </div>
  );
}

function Row({ icon: Icon, title, body }: { icon: typeof Sparkles; title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-secondary/40 p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div>
        <p className="text-xs font-bold">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
