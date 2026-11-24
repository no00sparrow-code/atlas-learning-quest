import { Link } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import type { FeedCard } from "@/data/cards";
import { getCategory } from "@/data/categories";
import { useAtlas } from "@/lib/atlas-store";
import { XP_PER_CARD } from "@/lib/progression";
import { Button } from "@/components/ui/button";
import { SourceList } from "./SourceList";

/** Expanded lesson notes for a short, shared by the feed and the watch page. */
export function InsightSheetContent({ card, onClose }: { card: FeedCard; onClose: () => void }) {
  const { state, watchCard } = useAtlas();
  const category = getCategory(card.category);
  const learned = state.shorts[card.id]?.completed ?? state.watched.includes(card.id);

  return (
    <div data-cat={card.category}>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cat">
        <category.icon className="size-3.5" /> {category.name} · Key insight
      </span>
      <h3 className="mt-2 pr-8 text-xl font-extrabold leading-tight">{card.title}</h3>
      <ol className="mt-4 space-y-3">
        {card.points.map((point, index) => (
          <li key={index} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-cat-soft font-display text-xs font-bold text-cat">
              {index + 1}
            </span>
            <span className="text-[15px] leading-snug text-foreground/90">{point}</span>
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-2xl border border-cat bg-cat-soft p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-cat">Takeaway</p>
        <p className="mt-1 font-display text-base font-bold">{card.takeaway}</p>
      </div>
      <div className="mt-4">
        <SourceList contentId={card.id} title={card.title} compact />
      </div>
      <div className="mt-4 flex gap-2">
        {learned ? (
          <Button variant="glass" size="xl" className="flex-1" onClick={onClose}>
            Learned ✓
          </Button>
        ) : (
          <Button
            variant="xp"
            size="xl"
            className="flex-1"
            onClick={() => {
              watchCard(card.id);
              onClose();
            }}
          >
            Mark learned · +{XP_PER_CARD} XP
          </Button>
        )}
        {card.relatedQuest && (
          <Button variant="cat" size="xl" asChild>
            <Link to="/quests/$questId" params={{ questId: card.relatedQuest }}>
              <Swords /> Quest
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
