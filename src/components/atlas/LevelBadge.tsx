import { cn } from "@/lib/utils";

interface LevelBadgeProps {
  level: number;
  progress: number;
  size?: number;
  className?: string;
}

/** Hexagon-ish level emblem wrapped in an animated progress ring. */
export function LevelBadge({ level, progress, size = 44, className }: LevelBadgeProps) {
  const stroke = Math.max(3, size / 14);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="stroke-gold transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="flex items-center justify-center rounded-full bg-gradient-gold font-display font-bold text-gold-foreground shadow-gold"
          style={{ width: size - stroke * 3, height: size - stroke * 3, fontSize: size * 0.32 }}
        >
          {level}
        </div>
      </div>
    </div>
  );
}
