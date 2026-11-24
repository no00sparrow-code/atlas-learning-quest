import { Flame, Gem, Search, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAtlas } from "@/lib/atlas-store";
import { useCountUp } from "@/hooks/use-count-up";
import { LevelBadge } from "./LevelBadge";
import { XpBar } from "./XpBar";
import { cn } from "@/lib/utils";

/** Top status bar: level, XP to next level, streak and skill points. */
export function Hud({
  className,
  variant = "solid",
}: {
  className?: string;
  variant?: "solid" | "overlay";
}) {
  const { state, level, skillPoints } = useAtlas();
  const current = useCountUp(level.current);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2",
        variant === "solid" ? "glass" : "glass-dark",
        className,
      )}
    >
      <Link to="/profile" aria-label="Open profile">
        <LevelBadge level={level.level} progress={level.progress} size={40} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline justify-between text-[11px] font-semibold">
          <span className="font-display uppercase tracking-wider text-foreground">
            Lv {level.level}
          </span>
          <span className="tabular-nums text-muted-foreground">
            <span className="text-primary">{current}</span> / {level.needed} XP
          </span>
        </div>
        <XpBar progress={level.progress} size="sm" />
      </div>
      <div
        className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs font-bold text-accent"
        title="Day streak"
      >
        <Flame className="size-3.5 fill-accent" />
        {state.streak}
      </div>
      <Link
        to="/world"
        className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs font-bold text-primary"
        title="Skill points"
      >
        <Gem className="size-3.5" />
        {skillPoints}
      </Link>
      <Link
        to="/search"
        aria-label="Search Atlas"
        className="flex size-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-foreground"
      >
        <Search className="size-3.5" />
      </Link>
      <Link
        to="/guide"
        aria-label="Ask Atlas Guide"
        className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform hover:scale-105"
      >
        <Sparkles className="size-3.5" />
      </Link>
    </div>
  );
}
