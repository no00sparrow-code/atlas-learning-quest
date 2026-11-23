import { Gem, Star } from "lucide-react";
import { useAtlas } from "@/lib/atlas-store";
import { rankForLevel } from "@/lib/progression";
import { CATEGORIES } from "@/data/categories";
import { Button } from "@/components/ui/button";

export function LevelUpOverlay() {
  const { levelUp, dismissLevelUp } = useAtlas();
  if (levelUp === null) return null;
  const newRealm = CATEGORIES.find((c) => c.unlockLevel === levelUp);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-overlay/85 px-6 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-sm text-center">
        <div className="relative mx-auto mb-6 flex size-40 items-center justify-center">
          <span className="absolute inset-0 animate-burst rounded-full border-2 border-gold" />
          <span className="absolute inset-0 animate-burst rounded-full border-2 border-primary [animation-delay:0.45s]" />
          <span className="absolute inset-4 animate-spin-slow rounded-full border border-dashed border-gold/50" />
          <div className="flex size-28 animate-pop-in items-center justify-center rounded-full bg-gradient-gold shadow-gold">
            <span className="font-display text-5xl font-black text-gold-foreground">{levelUp}</span>
          </div>
        </div>
        <p className="mb-1 flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-[0.3em] text-gold">
          <Star className="size-3 fill-gold" /> Level up <Star className="size-3 fill-gold" />
        </p>
        <h2 className="animate-rise text-3xl font-black">You're now {rankForLevel(levelUp)}</h2>
        <div className="mt-5 space-y-2 text-left">
          <div className="flex animate-rise items-center gap-3 rounded-2xl glass px-4 py-3 [animation-delay:0.15s]">
            <Gem className="size-5 text-primary" />
            <span className="text-sm font-semibold">+1 Skill point to spend in World</span>
          </div>
          {newRealm && (
            <div
              data-cat={newRealm.id}
              className="flex animate-rise items-center gap-3 rounded-2xl border border-cat bg-cat-soft px-4 py-3 [animation-delay:0.3s]"
            >
              <newRealm.icon className="size-5 text-cat" />
              <span className="text-sm font-semibold">New realm unlocked: {newRealm.realm}</span>
            </div>
          )}
        </div>
        <Button variant="xp" size="xl" className="mt-6 w-full" onClick={dismissLevelUp}>
          Continue
        </Button>
      </div>
    </div>
  );
}
