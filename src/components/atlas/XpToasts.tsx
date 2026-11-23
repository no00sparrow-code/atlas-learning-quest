import { Sparkles } from "lucide-react";
import { useAtlas } from "@/lib/atlas-store";

/** Floating "+XP" pills that rise and fade whenever XP is earned. */
export function XpToasts() {
  const { events } = useAtlas();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[60] mx-auto flex max-w-md flex-col items-center gap-2">
      {events.map((e) => (
        <div
          key={e.id}
          className="flex animate-float-up items-center gap-2 rounded-full border border-primary/40 bg-background/80 px-4 py-2 shadow-glow backdrop-blur-md"
        >
          <Sparkles className="size-4 text-primary" />
          <span className="font-display text-sm font-bold text-gradient-xp">+{e.amount} XP</span>
          <span className="text-xs font-medium text-muted-foreground">{e.label}</span>
        </div>
      ))}
    </div>
  );
}
