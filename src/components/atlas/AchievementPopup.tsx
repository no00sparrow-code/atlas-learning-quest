import { useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { useAtlas } from "@/lib/atlas-store";
import { getAchievement } from "@/data/achievements";

/** Shows the newest unlocked achievement, one at a time, with an auto-dismiss. */
export function AchievementPopup() {
  const { achievementQueue, dismissAchievement } = useAtlas();
  const id = achievementQueue[0];

  useEffect(() => {
    if (!id) return;
    const timer = setTimeout(dismissAchievement, 5500);
    return () => clearTimeout(timer);
  }, [id, dismissAchievement]);

  if (!id) return null;
  const achievement = getAchievement(id);
  if (!achievement) return null;
  const Icon = achievement.icon;
  const remaining = achievementQueue.length - 1;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[5.9rem] z-[65] mx-auto flex max-w-md justify-center px-3">
      <div className="pointer-events-auto flex w-full animate-rise items-center gap-3 rounded-2xl border border-gold/50 bg-background/95 p-3 shadow-gold backdrop-blur-xl">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-gold shadow-gold">
          <Icon className="size-6 text-gold-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
            <Sparkles className="size-3" /> Achievement unlocked
          </p>
          <p className="truncate font-display text-sm font-bold">{achievement.name}</p>
          <p className="truncate text-xs text-muted-foreground">{achievement.description}</p>
        </div>
        {remaining > 0 && (
          <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground">
            +{remaining}
          </span>
        )}
        <button
          onClick={dismissAchievement}
          aria-label="Dismiss achievement"
          className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
