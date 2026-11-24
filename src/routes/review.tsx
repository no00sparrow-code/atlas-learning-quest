import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Brain, Check, Map, RotateCcw, Sparkles, X } from "lucide-react";
import { getCategory } from "@/data/categories";
import { useAtlas } from "@/lib/atlas-store";
import {
  buildReviewQueue,
  dueCount,
  masteryLevel,
  retentionRate,
  type ReviewCandidate,
} from "@/lib/memory";
import { XpBar } from "@/components/atlas/XpBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/review")({
  validateSearch: (search: Record<string, unknown>): { concept?: string; mode?: string } => {
    const result: { concept?: string; mode?: string } = {};
    if (typeof search["concept"] === "string") result.concept = search["concept"];
    if (typeof search["mode"] === "string") result.mode = search["mode"];
    return result;
  },
  head: () => ({
    meta: [
      { title: "Review — Atlas" },
      {
        name: "description",
        content: "Spaced retrieval practice that adapts to what you actually remember.",
      },
      { property: "og:title", content: "Review — Atlas" },
      {
        property: "og:description",
        content: "Retrieve, correct and reschedule — the part of learning that makes it stick.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { concept: conceptFilter, mode } = Route.useSearch();
  const { state, hydrated, today, recordReview } = useAtlas();

  const [practice, setPractice] = useState(mode === "practice");
  const [round, setRound] = useState(0);
  const [started, setStarted] = useState(false);
  const [queue, setQueue] = useState<ReviewCandidate[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);

  // Freeze the session when it starts: memory changing mid-round must not reshuffle it.
  useEffect(() => {
    if (!hydrated || started) return;
    setQueue(
      buildReviewQueue(state.memory, {
        limit: practice ? 8 : 6,
        includeNew: practice || Boolean(conceptFilter),
        ...(conceptFilter ? { conceptId: conceptFilter } : {}),
        today,
      }),
    );
    setStarted(true);
  }, [hydrated, started, state.memory, practice, conceptFilter, today, round]);

  const restart = (nextPractice: boolean) => {
    setPractice(nextPractice);
    setIndex(0);
    setPicked(null);
    setAnswers([]);
    setDone(false);
    setStarted(false);
    setRound((value) => value + 1);
  };

  const current = queue[index];
  const answered = picked !== null;

  const answer = (option: number) => {
    if (!current || answered) return;
    const correct = option === current.question.answer;
    setPicked(option);
    setAnswers((prev) => [...prev, correct]);
    recordReview(current.concept.id, correct);
  };

  const advance = () => {
    if (index + 1 >= queue.length) {
      setDone(true);
    } else {
      setIndex(index + 1);
      setPicked(null);
    }
  };

  if (!hydrated || !started) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-page">
        <p className="text-sm text-muted-foreground">Opening your memory inbox…</p>
      </div>
    );
  }

  const due = dueCount(state.memory, today);
  const retention = Math.round(retentionRate(state.memory) * 100);

  if (queue.length === 0) {
    return (
      <div className="min-h-dvh bg-page pb-10">
        <ReviewHeader title="Review" />
        <div className="px-5 pt-4">
          <div className="rounded-3xl border border-border bg-card p-6 text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-success/15">
              <Check className="size-7 text-success" />
            </span>
            <h1 className="mt-4 text-2xl font-black">Memory inbox clear</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing is due and no shaky concepts are waiting. Atlas schedules reviews further
              apart each time you recall something correctly.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {retention}% recall accuracy · {due} due now
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button variant="xp" size="xl" onClick={() => restart(true)}>
                <Sparkles /> Practice new concepts
              </Button>
              <Button variant="glass" size="xl" asChild>
                <Link to="/map">
                  <Map /> Open the knowledge map
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    const correct = answers.filter(Boolean).length;
    const total = answers.length || 1;
    const accuracy = Math.round((correct / total) * 100);
    return (
      <div className="min-h-dvh bg-page pb-12">
        <ReviewHeader title="Review complete" />
        <div className="px-5 pt-4">
          <div className="rounded-3xl border border-border bg-card p-6 text-center">
            <span
              className={cn(
                "mx-auto flex size-20 items-center justify-center rounded-full font-display text-2xl font-black",
                accuracy >= 80
                  ? "bg-success/20 text-success"
                  : accuracy >= 50
                    ? "bg-gold/20 text-gold"
                    : "bg-accent/20 text-accent",
              )}
            >
              {accuracy}%
            </span>
            <h1 className="mt-4 text-2xl font-black">
              {correct} of {answers.length} recalled
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {accuracy >= 80
                ? "Strong recall. Those concepts just moved further into the future."
                : "Misses are the useful part: they tell Atlas exactly what to bring back tomorrow."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-left">
              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="font-display text-lg font-bold tabular-nums">{due}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Due now
                </p>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="font-display text-lg font-bold tabular-nums">{retention}%</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Recall accuracy
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-1.5 text-left">
              {queue.slice(0, answers.length).map((item, i) => (
                <div
                  key={`${item.concept.id}-${i}`}
                  className="flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-2 text-xs"
                >
                  {answers[i] ? (
                    <Check className="size-3.5 shrink-0 text-success" />
                  ) : (
                    <X className="size-3.5 shrink-0 text-accent" />
                  )}
                  <span className="flex-1 font-semibold">{item.concept.name}</span>
                  <Link
                    to="/map"
                    search={{ concept: item.concept.id }}
                    className="text-[10px] font-bold text-primary"
                  >
                    Map
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Button variant="xp" size="xl" onClick={() => restart(practice)}>
                <RotateCcw /> Review again
              </Button>
              <Button variant="glass" size="xl" onClick={() => restart(true)}>
                <Sparkles /> Practice new concepts
              </Button>
              <Button variant="glass" size="xl" asChild>
                <Link to="/map">
                  <Map /> Knowledge map
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const category = getCategory(current.concept.category);
  const mastery = masteryLevel(current.memory);
  const question = current.question;
  const correct = answered && picked === question.answer;

  return (
    <div data-cat={current.concept.category} className="min-h-dvh bg-page pb-12">
      <ReviewHeader title={conceptFilter ? "Focused practice" : "Review"} />
      <div className="px-4 pt-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <XpBar progress={(index + (answered ? 1 : 0)) / queue.length} tone="cat" size="sm" />
          </div>
          <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
            {Math.min(index + 1, queue.length)}/{queue.length}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-cat bg-cat-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cat">
            <category.icon className="size-3" /> {category.name}
          </span>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {current.reason}
          </span>
          <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
            <Brain className="size-3.5" />{" "}
            {mastery === "unseen"
              ? "New"
              : `${Math.round((current.memory?.strength ?? 0) * 100)}% strength`}
          </span>
        </div>

        <div className="mt-3 rounded-3xl border border-border bg-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {current.concept.name}
          </p>
          <h1 className="mt-1 font-display text-xl font-bold leading-snug">{question.prompt}</h1>

          <div className="mt-4 space-y-2">
            {question.options.map((option, optionIndex) => {
              const isAnswer = optionIndex === question.answer;
              const isPicked = optionIndex === picked;
              return (
                <button
                  key={option}
                  disabled={answered}
                  onClick={() => answer(optionIndex)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border-2 bg-background/40 px-3.5 py-3 text-left text-sm font-semibold transition-all",
                    !answered && "border-border hover:border-cat active:scale-[0.99]",
                    answered && isAnswer && "border-success bg-success/15",
                    answered && isPicked && !isAnswer && "border-accent bg-accent/15",
                    answered && !isAnswer && !isPicked && "border-border opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-lg font-display text-xs font-bold",
                      answered && isAnswer
                        ? "bg-success text-background"
                        : answered && isPicked
                          ? "bg-accent text-background"
                          : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {answered && isAnswer ? (
                      <Check className="size-4" />
                    ) : answered && isPicked ? (
                      <X className="size-4" />
                    ) : (
                      String.fromCharCode(65 + optionIndex)
                    )}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="mt-4 animate-rise space-y-3">
              <div className={cn("rounded-2xl p-4", correct ? "bg-success/15" : "bg-accent/15")}>
                <p
                  className={cn(
                    "font-display text-sm font-bold",
                    correct ? "text-success" : "text-accent",
                  )}
                >
                  {correct ? "Correct recall" : "Not this time"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                  {question.explanation}
                </p>
                <p className="mt-2 text-xs italic text-muted-foreground">
                  {current.concept.summary}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-bold">
                  <Link
                    to="/guide"
                    search={{
                      q: `Explain ${current.concept.name} simply. I just answered a review question about it.`,
                    }}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Ask the Guide
                  </Link>
                  <Link
                    to="/map"
                    search={{ concept: current.concept.id }}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    See it on the map
                  </Link>
                </div>
              </div>
              <Button variant="cat" size="xl" className="w-full" onClick={advance}>
                {index + 1 >= queue.length ? "See results" : "Next concept"}
              </Button>
            </div>
          )}
        </div>

        {!answered && (
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Answer from memory. +6 XP for a correct recall, +2 for an honest miss.
          </p>
        )}
      </div>
    </div>
  );
}

function ReviewHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl">
      <Link to="/" aria-label="Back to Discover" className="rounded-full bg-secondary p-2">
        <ArrowLeft className="size-5" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Retrieval practice
        </p>
        <p className="font-display text-sm font-bold">{title}</p>
      </div>
      <Link
        to="/map"
        className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold text-muted-foreground"
      >
        <Map className="size-3.5" /> Map
      </Link>
    </header>
  );
}
