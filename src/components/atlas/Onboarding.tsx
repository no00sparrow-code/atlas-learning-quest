import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Brain, Check, Compass, Flame, Lock, Sparkles } from "lucide-react";
import { CATEGORIES, type CategoryId } from "@/data/categories";
import { FEED } from "@/data/cards";
import { useAtlas } from "@/lib/atlas-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 3;

export function Onboarding() {
  const { completeOnboarding } = useAtlas();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [interests, setInterests] = useState<CategoryId[]>(["psychology", "science"]);

  const starter = FEED.find((card) => interests.includes(card.category)) ?? FEED[0];
  const hero = CATEGORIES.find((category) => category.id === interests[0])?.image;

  const toggle = (id: CategoryId) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const finish = (destination: "discover" | "lesson") => {
    completeOnboarding(name, interests);
    if (destination === "lesson" && starter) {
      void navigate({ to: "/watch/$cardId", params: { cardId: starter.id } });
    } else {
      void navigate({ to: "/" });
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-page">
      {hero && (
        <img
          src={hero}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-20 blur-[2px]"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/90 to-background" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-xp text-primary-foreground shadow-glow">
              <Compass className="size-5" />
            </span>
            <span className="font-display text-sm font-bold uppercase tracking-[0.2em]">Atlas</span>
          </div>
          <span className="rounded-full border border-border bg-card/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Local beta
          </span>
        </div>

        <div className="mt-5 flex gap-1.5" aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}>
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                index <= step ? "bg-primary" : "bg-secondary",
              )}
            />
          ))}
        </div>

        <div className="flex flex-1 flex-col justify-center py-8">
          {step === 0 && (
            <div className="animate-rise">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
                Learn like you play
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight">
                Get curious.
                <br />
                Prove it stuck.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Atlas is a learning feed built around memory, not watch time. Take a short visual
                lesson, test yourself, then come back right before you would forget.
              </p>

              <div className="mt-6 space-y-2.5">
                <Feature
                  icon={Sparkles}
                  title="Discover in seconds"
                  body="Short visual lessons and multi-episode deep dives across six realms."
                />
                <Feature
                  icon={Brain}
                  title="Earn XP for understanding"
                  body="Quizzes and retrieval practice feed your knowledge map — not just your streak."
                />
                <Feature
                  icon={Lock}
                  title="No account needed"
                  body="This beta saves progress in this browser only. You can export a backup anytime."
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="animate-rise">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
                Make it yours
              </p>
              <h1 className="mt-2 text-2xl font-black">What pulls you in?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick a few realms. This shapes your For You feed and the first lesson we suggest.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {CATEGORIES.map((category) => {
                  const selected = interests.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      data-cat={category.id}
                      onClick={() => toggle(category.id)}
                      aria-pressed={selected}
                      className={cn(
                        "flex items-center gap-2 rounded-2xl border p-3 text-left transition-all active:scale-[0.98]",
                        selected
                          ? "border-cat bg-cat-soft text-cat"
                          : "border-border bg-card/70 text-muted-foreground",
                      )}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background/40">
                        <category.icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 text-xs font-bold">{category.name}</span>
                      {selected && <Check className="size-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <label className="mt-5 block">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  What should we call you? <span className="font-normal">(optional)</span>
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your first name"
                  maxLength={32}
                  autoComplete="given-name"
                  className="mt-2 h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="animate-rise">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
                How progress works
              </p>
              <h1 className="mt-2 text-2xl font-black">Small loops, real memory</h1>

              <div className="mt-5 space-y-2.5">
                <Feature
                  icon={Sparkles}
                  title="XP and levels"
                  body="Finish lessons, quests and reviews to level up. XP reflects effort; mastery reflects recall."
                />
                <Feature
                  icon={Brain}
                  title="Spaced review"
                  body="Correct answers push a concept further out. Misses come back tomorrow, when they matter most."
                />
                <Feature
                  icon={Flame}
                  title="Streaks that mean something"
                  body="One genuine learning action a day keeps the streak alive. No passive watching required."
                />
              </div>

              {starter && (
                <div
                  data-cat={starter.category}
                  className="mt-5 rounded-2xl border border-cat bg-cat-soft p-4"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cat">
                    Your first activity · about 10 seconds
                  </p>
                  <p className="mt-1 font-display text-sm font-bold">{starter.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{starter.hook}</p>
                </div>
              )}

              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                Progress stays on this device. Read the{" "}
                <Link
                  to="/about"
                  className="font-bold text-primary underline-offset-2 hover:underline"
                >
                  beta privacy note
                </Link>{" "}
                or export a backup later from Profile.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button
              variant="glass"
              size="xl"
              className="flex-1"
              onClick={() => setStep((value) => value - 1)}
            >
              <ArrowLeft /> Back
            </Button>
          )}
          {step < 2 ? (
            <Button
              variant="xp"
              size="xl"
              className="flex-[2]"
              onClick={() => setStep((value) => value + 1)}
            >
              {step === 0 ? "Get started" : "Continue"} <ArrowRight />
            </Button>
          ) : (
            <Button variant="xp" size="xl" className="flex-[2]" onClick={() => finish("lesson")}>
              Start lesson <ArrowRight />
            </Button>
          )}
        </div>
        {step === 2 && (
          <button
            onClick={() => finish("discover")}
            className="mt-3 text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Or browse Discover first
          </button>
        )}
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Sparkles;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card/70 p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
