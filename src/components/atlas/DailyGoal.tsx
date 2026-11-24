import { Check, Gift, Sparkles } from "lucide-react";
import { useAtlas } from "@/lib/atlas-store";
import { XpBar } from "./XpBar";
import { cn } from "@/lib/utils";

/** The day's retention loop: a small XP target with a claimable bonus. */
export function DailyGoalCard({ className }: { className?: string }) {
  const { todayXp, dailyGoalXp, dailyGoalBonus, goalClaimed, claimDailyGoal } = useAtlas();
  const progress = Math.min(1, todayXp / dailyGoalXp);
  const reached = todayXp >= dailyGoalXp;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-4",
        goalClaimed ? "border-success/40" : "border-border",
        className,
      )}
    >
      <div className="absolute -right-8 -top-10 size-28 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Daily goal
          </p>
          <span className="ml-auto font-display text-xs font-bold tabular-nums">
            {Math.min(todayXp, dailyGoalXp)}
            <span className="text-muted-foreground">/{dailyGoalXp} XP</span>
          </span>
        </div>
        <XpBar progress={progress} size="md" className="mt-3" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {goalClaimed
              ? "Bonus claimed. Come back tomorrow to keep the streak."
              : reached
                ? `Goal reached. Claim +${dailyGoalBonus} XP.`
                : `${dailyGoalXp - todayXp} XP to go · one short lesson is 15 XP.`}
          </p>
          {goalClaimed ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success">
              <Check className="size-3.5" /> Claimed
            </span>
          ) : (
            <button
              onClick={claimDailyGoal}
              disabled={!reached}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all",
                reached
                  ? "bg-gradient-xp text-primary-foreground shadow-glow active:scale-95"
                  : "cursor-not-allowed bg-secondary text-muted-foreground",
              )}
            >
              <Gift className="size-3.5" /> +{dailyGoalBonus}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
