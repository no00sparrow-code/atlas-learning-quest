import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Eye, Gem, Lightbulb, Search, Sparkles, Trophy, X } from "lucide-react";
import {
  getQuest,
  type ChallengeQuest,
  type McqQuestion,
  type MysteryQuest,
  type Quest,
  type QuizQuest,
} from "@/data/quests";
import { getCategory } from "@/data/categories";
import { useAtlas } from "@/lib/atlas-store";
import { mysteryXp, quizXp } from "@/lib/progression";
import { useCountUp } from "@/hooks/use-count-up";
import { XpBar } from "@/components/atlas/XpBar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quests/$questId")({
  loader: ({ params }) => {
    const quest = getQuest(params.questId);
    if (!quest) throw notFound();
    return { questId: quest.id, title: quest.title, subtitle: quest.subtitle };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — Atlas Quest` },
          { name: "description", content: loaderData.subtitle },
          { property: "og:title", content: `${loaderData.title} — Atlas Quest` },
          { property: "og:description", content: loaderData.subtitle },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [{ title: "Quest unavailable — Atlas" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-black">Quest not found</h1>
      <Button variant="xp" size="xl" asChild>
        <Link to="/quests">Back to quests</Link>
      </Button>
    </div>
  ),
  component: QuestPage,
});

interface Outcome {
  xp: number;
  score: string;
  title: string;
  message: string;
  success: boolean;
}

function QuestPage() {
  const { questId } = Route.useLoaderData();
  const quest = getQuest(questId) as Quest;
  const { state, completeQuest } = useAtlas();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [stepProgress, setStepProgress] = useState(0);
  const alreadyDone = state.completedQuests[quest.id];
  const [practice] = useState(Boolean(alreadyDone));
  const cat = getCategory(quest.category);

  const finish = (o: Outcome) => {
    if (!practice) completeQuest(quest.id, o.xp, o.score);
    setOutcome(practice ? { ...o, xp: 0 } : o);
    setStepProgress(1);
  };

  return (
    <div data-cat={quest.category} className="relative min-h-dvh pb-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden">
        <img src={cat.image} alt="" className="h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/80 to-background" />
      </div>

      <header className="sticky top-0 z-20 flex items-center gap-3 bg-background/60 px-4 py-3 backdrop-blur-xl">
        <Link to="/quests" aria-label="Back to quests" className="rounded-full bg-secondary p-2">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <XpBar progress={stepProgress} tone="cat" size="sm" />
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 font-display text-xs font-bold text-primary">
          {practice ? "Practice" : `+${quest.reward} XP`}
        </span>
      </header>

      <div className="relative px-5 pt-4">
        {outcome ? (
          <Results outcome={outcome} practice={practice} />
        ) : (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cat">
              {quest.type} · {cat.name} · {quest.difficulty}
            </p>
            <h1 className="mt-1 text-3xl font-black leading-tight">{quest.title}</h1>
            <p className="mt-1 text-foreground/75">{quest.subtitle}</p>
            {practice && (
              <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
                You already earned XP here. Replaying in practice mode.
              </p>
            )}
            <div className="mt-6">
              {quest.type === "quiz" && (
                <QuizRunner quest={quest} onProgress={setStepProgress} onFinish={finish} />
              )}
              {quest.type === "mystery" && (
                <MysteryRunner quest={quest} onProgress={setStepProgress} onFinish={finish} />
              )}
              {quest.type === "challenge" && (
                <ChallengeRunner quest={quest} onProgress={setStepProgress} onFinish={finish} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- shared question UI ---------- */

function Question({
  q,
  onAnswered,
  nextLabel,
  onNext,
}: {
  q: McqQuestion;
  onAnswered?: (correct: boolean) => void;
  nextLabel: string;
  onNext: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === q.answer;

  return (
    <div className="animate-rise">
      <h2 className="font-display text-xl font-bold leading-snug">{q.question}</h2>
      <div className="mt-5 space-y-2.5">
        {q.options.map((opt, i) => {
          const isAnswer = i === q.answer;
          const isPicked = i === picked;
          return (
            <button
              key={opt}
              disabled={answered}
              onClick={() => {
                setPicked(i);
                onAnswered?.(i === q.answer);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3.5 text-left font-semibold transition-all",
                !answered && "border-border hover:border-cat active:scale-[0.99]",
                answered && isAnswer && "border-success bg-success/15",
                answered && isPicked && !isAnswer && "border-destructive bg-destructive/15",
                answered && !isAnswer && !isPicked && "border-border opacity-50",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold",
                  answered && isAnswer
                    ? "bg-success text-background"
                    : answered && isPicked
                      ? "bg-destructive text-foreground"
                      : "bg-secondary text-muted-foreground",
                )}
              >
                {answered && isAnswer ? (
                  <Check className="size-4" />
                ) : answered && isPicked ? (
                  <X className="size-4" />
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="mt-5 animate-rise space-y-4">
          <div className={cn("rounded-2xl p-4", correct ? "bg-success/15" : "bg-destructive/15")}>
            <p
              className={cn(
                "font-display font-bold",
                correct ? "text-success" : "text-destructive",
              )}
            >
              {correct ? "Correct!" : "Not quite"}
            </p>
            <p className="mt-1 text-sm text-foreground/85">{q.explanation}</p>
          </div>
          <Button variant="cat" size="xl" className="w-full" onClick={() => onNext(correct)}>
            {nextLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------- quiz ---------- */

function QuizRunner({
  quest,
  onProgress,
  onFinish,
}: {
  quest: QuizQuest;
  onProgress: (p: number) => void;
  onFinish: (o: Outcome) => void;
}) {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const total = quest.questions.length;
  const q = quest.questions[index];

  useEffect(() => onProgress(index / total), [index, total, onProgress]);
  if (!q) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <span>
          Question {index + 1} of {total}
        </span>
        <span className="text-success">{correct} correct</span>
      </div>
      <Question
        key={index}
        q={q}
        nextLabel={index + 1 < total ? "Next question" : "See results"}
        onNext={(ok) => {
          const nextCorrect = correct + (ok ? 1 : 0);
          setCorrect(nextCorrect);
          if (index + 1 < total) setIndex(index + 1);
          else {
            const perfect = nextCorrect === total;
            onFinish({
              xp: quizXp(quest.reward, nextCorrect, total),
              score: `${nextCorrect}/${total}`,
              title: perfect ? "Flawless!" : nextCorrect > 0 ? "Quest complete" : "Tough one",
              message: perfect
                ? "Every answer right. Your brain is on fire."
                : `You got ${nextCorrect} of ${total} right. XP scales with correct answers.`,
              success: nextCorrect > 0,
            });
          }
        }}
      />
    </div>
  );
}

/* ---------- mystery ---------- */

function MysteryRunner({
  quest,
  onProgress,
  onFinish,
}: {
  quest: MysteryQuest;
  onProgress: (p: number) => void;
  onFinish: (o: Outcome) => void;
}) {
  const [revealed, setRevealed] = useState(1);
  const [accusing, setAccusing] = useState(false);
  const potential = mysteryXp(quest.reward, revealed, true);

  useEffect(
    () => onProgress(accusing ? 0.85 : (revealed / quest.clues.length) * 0.7),
    [revealed, accusing, quest.clues.length, onProgress],
  );

  if (accusing) {
    return (
      <div>
        <button
          onClick={() => setAccusing(false)}
          className="mb-4 text-sm font-semibold text-muted-foreground"
        >
          ← Back to clues
        </button>
        <Question
          q={quest.final}
          nextLabel="Close the case"
          onNext={(ok) =>
            onFinish({
              xp: mysteryXp(quest.reward, revealed, ok),
              score: ok ? `Solved · ${revealed} clue${revealed > 1 ? "s" : ""}` : "Unsolved",
              title: ok ? "Case closed" : "The trail went cold",
              message: ok
                ? `You cracked it with ${revealed} clue${revealed > 1 ? "s" : ""}. Fewer clues, bigger rewards.`
                : "Wrong suspect, but you still learned the truth. Consolation XP awarded.",
              success: ok,
            })
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cat bg-cat-soft p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cat">
          <Search className="size-3.5" /> The case
        </p>
        <p className="mt-2 leading-relaxed">{quest.premise}</p>
      </div>

      <div className="space-y-2.5">
        {quest.clues.map((clue, i) => {
          const shown = i < revealed;
          return (
            <div
              key={i}
              className={cn(
                "flex gap-3 rounded-2xl border p-4 transition-all",
                shown
                  ? "animate-rise border-border bg-card"
                  : "border-dashed border-border bg-transparent",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg font-display text-xs font-bold",
                  shown ? "bg-cat text-background" : "bg-secondary text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              {shown ? (
                <p className="text-[15px] leading-snug">{clue}</p>
              ) : (
                <p className="select-none text-[15px] text-muted-foreground blur-[5px]">
                  Hidden clue hidden clue hidden clue here
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-2xl glass px-4 py-3 text-sm">
        <span className="text-muted-foreground">Potential reward</span>
        <span className="font-display font-bold text-primary">+{potential} XP</span>
      </div>

      <div className="flex gap-2">
        <Button
          variant="glass"
          size="xl"
          className="flex-1"
          disabled={revealed >= quest.clues.length}
          onClick={() => setRevealed((r) => r + 1)}
        >
          <Lightbulb /> Next clue
        </Button>
        <Button variant="cat" size="xl" className="flex-1" onClick={() => setAccusing(true)}>
          I've got it
        </Button>
      </div>
    </div>
  );
}

/* ---------- challenge ---------- */

function ChallengeRunner({
  quest,
  onProgress,
  onFinish,
}: {
  quest: ChallengeQuest;
  onProgress: (p: number) => void;
  onFinish: (o: Outcome) => void;
}) {
  const { state } = useAtlas();
  const [text, setText] = useState("");
  const min = quest.minChars ?? 80;
  const target = quest.watchTarget ?? 3;
  const watched = state.watched.length;
  const p =
    quest.mode === "write" ? Math.min(1, text.trim().length / min) : Math.min(1, watched / target);

  useEffect(() => onProgress(p * 0.9), [p, onProgress]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cat bg-cat-soft p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-cat">Your mission</p>
        <p className="mt-2 leading-relaxed">{quest.prompt}</p>
      </div>

      {quest.mode === "write" ? (
        <>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="e.g. A neutron star is what's left when a giant star collapses. It squeezes so hard that…"
            className="rounded-2xl border-2 border-border bg-card p-4 text-[15px] focus-visible:ring-0 focus-visible:border-cat"
          />
          <div className="flex items-center gap-3">
            <XpBar progress={p} tone="cat" size="sm" />
            <span className="w-16 text-right text-xs font-semibold tabular-nums text-muted-foreground">
              {Math.min(text.trim().length, min)}/{min}
            </span>
          </div>
          <Button
            variant="cat"
            size="xl"
            className="w-full"
            disabled={p < 1}
            onClick={() =>
              onFinish({
                xp: quest.reward,
                score: "Explained",
                title: "Knowledge locked in",
                message: "Explaining an idea simply is one of the strongest ways to remember it.",
                success: true,
              })
            }
          >
            Submit explanation
          </Button>
        </>
      ) : (
        <>
          <div className="rounded-2xl bg-card p-5 text-center">
            <Eye className="mx-auto size-8 text-cat" />
            <p className="mt-2 font-display text-4xl font-black tabular-nums">
              {Math.min(watched, target)}
              <span className="text-muted-foreground">/{target}</span>
            </p>
            <p className="text-sm text-muted-foreground">cards finished</p>
            <XpBar progress={p} tone="cat" className="mt-4" />
          </div>
          {p >= 1 ? (
            <Button
              variant="cat"
              size="xl"
              className="w-full"
              onClick={() =>
                onFinish({
                  xp: quest.reward,
                  score: "Streak",
                  title: "Curiosity rewarded",
                  message: "Three ideas in. That's how polymaths are made.",
                  success: true,
                })
              }
            >
              Claim reward
            </Button>
          ) : (
            <Button variant="cat" size="xl" className="w-full" asChild>
              <Link to="/">Go to Discover</Link>
            </Button>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- results ---------- */

function Results({ outcome, practice }: { outcome: Outcome; practice: boolean }) {
  const { skillPoints } = useAtlas();
  const xp = useCountUp(outcome.xp, 1200);
  return (
    <div className="flex flex-col items-center pt-6 text-center">
      <div className="relative mb-6 flex size-36 items-center justify-center">
        <span className="absolute inset-0 animate-burst rounded-full border-2 border-cat" />
        <span className="absolute inset-0 animate-burst rounded-full border-2 border-gold [animation-delay:0.5s]" />
        <div
          className={cn(
            "flex size-24 animate-pop-in items-center justify-center rounded-3xl",
            outcome.success ? "bg-gradient-gold shadow-gold" : "bg-secondary",
          )}
        >
          <Trophy
            className={cn(
              "size-11",
              outcome.success ? "text-gold-foreground" : "text-muted-foreground",
            )}
          />
        </div>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cat">{outcome.score}</p>
      <h2 className="mt-1 animate-rise text-3xl font-black">{outcome.title}</h2>
      <p className="mt-2 max-w-xs text-foreground/75">{outcome.message}</p>

      {!practice ? (
        <div className="mt-6 flex items-center gap-2 rounded-2xl glass px-6 py-4">
          <Sparkles className="size-6 text-primary" />
          <span className="font-display text-4xl font-black tabular-nums text-gradient-xp">
            +{xp}
          </span>
          <span className="font-display text-lg font-bold text-muted-foreground">XP</span>
        </div>
      ) : (
        <p className="mt-6 rounded-xl bg-secondary px-4 py-2 text-sm text-muted-foreground">
          Practice run · no XP
        </p>
      )}

      {!practice && (
        <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary">
          <Gem className="size-4" /> +1 skill point · {skillPoints} available
        </div>
      )}

      <div className="mt-8 grid w-full gap-2">
        <Button variant="xp" size="xl" asChild>
          <Link to="/world">Spend points in World</Link>
        </Button>
        <Button variant="glass" size="xl" asChild>
          <Link to="/quests">Back to quests</Link>
        </Button>
      </div>
    </div>
  );
}
