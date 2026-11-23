import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface XpBarProps {
  progress: number;
  className?: string;
  tone?: "xp" | "gold" | "cat";
  size?: "sm" | "md" | "lg";
}

/** Animated progress bar with a sweeping shine. Fills from 0 on mount. */
export function XpBar({ progress, className, tone = "xp", size = "md" }: XpBarProps) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(1, progress))));
    return () => cancelAnimationFrame(id);
  }, [progress]);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-secondary",
        size === "sm" && "h-1.5",
        size === "md" && "h-2.5",
        size === "lg" && "h-3.5",
        className,
      )}
    >
      <div
        className={cn(
          "relative h-full rounded-full transition-[width] duration-1000 ease-out",
          tone === "xp" && "bg-gradient-xp shadow-glow",
          tone === "gold" && "bg-gradient-gold shadow-gold",
          tone === "cat" && "bg-cat glow-cat",
        )}
        style={{ width: `${shown * 100}%` }}
      >
        <div className="xp-shine absolute inset-0 animate-shimmer rounded-full" />
      </div>
    </div>
  );
}
