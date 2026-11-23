import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Swords } from "lucide-react";
import { FEED, type FeedCard } from "@/data/cards";
import { CATEGORIES, getCategory, type CategoryId } from "@/data/categories";
import { FeedCardView } from "@/components/atlas/FeedCardView";
import { Hud } from "@/components/atlas/Hud";
import { BottomSheet } from "@/components/atlas/BottomSheet";
import { useAtlas } from "@/lib/atlas-store";
import { XP_PER_CARD } from "@/lib/progression";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Discover — Atlas" },
      {
        name: "description",
        content:
          "Swipe through bite-sized lessons in psychology, science, history, technology, creativity and business.",
      },
      { property: "og:title", content: "Discover — Atlas" },
      {
        property: "og:description",
        content: "Swipe through bite-sized lessons and earn XP for every one you finish.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Discover,
});

type Filter = "foryou" | "all" | CategoryId;

function Discover() {
  const { state, watchCard } = useAtlas();
  const [filter, setFilter] = useState<Filter>("foryou");
  const [activeIndex, setActiveIndex] = useState(0);
  const [insight, setInsight] = useState<FeedCard | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const cards = useMemo(() => {
    if (filter === "all") return FEED;
    if (filter === "foryou") {
      const mine = FEED.filter((c) => state.interests.includes(c.category));
      const rest = FEED.filter((c) => !state.interests.includes(c.category));
      return [...mine, ...rest];
    }
    return FEED.filter((c) => c.category === filter);
  }, [filter, state.interests]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setActiveIndex(0);
  }, [filter]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset["index"]);
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        }
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [cards]);

  const filters: { id: Filter; label: string }[] = [
    { id: "foryou", label: "For you" },
    { id: "all", label: "All" },
    ...CATEGORIES.map((c) => ({ id: c.id as Filter, label: c.name })),
  ];

  return (
    <div className="relative">
      <div className="fixed inset-x-0 top-0 z-30 mx-auto max-w-md space-y-2 px-3 pt-3">
        <Hud variant="overlay" />
        <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
          {filters.map((f) => (
            <button
              key={f.id}
              data-cat={f.id === "foryou" || f.id === "all" ? undefined : f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
                filter === f.id
                  ? "bg-foreground text-background"
                  : "glass-dark text-foreground/80 hover:text-foreground",
              )}
            >
              {f.id === "foryou" && <Sparkles className="mr-1 inline size-3 -translate-y-px" />}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="no-scrollbar h-dvh snap-y snap-mandatory overflow-y-scroll">
        {cards.map((card, i) => (
          <div key={`${filter}-${card.id}`} data-index={i}>
            <FeedCardView card={card} active={i === activeIndex} onOpenInsight={setInsight} />
          </div>
        ))}
        <EndOfFeed />
      </div>

      <BottomSheet open={insight !== null} onClose={() => setInsight(null)} cat={insight?.category}>
        {insight && (
          <InsightContent
            card={insight}
            learned={state.watched.includes(insight.id)}
            onLearn={() => watchCard(insight.id)}
            onClose={() => setInsight(null)}
          />
        )}
      </BottomSheet>
    </div>
  );
}

function InsightContent({
  card,
  learned,
  onLearn,
  onClose,
}: {
  card: FeedCard;
  learned: boolean;
  onLearn: () => void;
  onClose: () => void;
}) {
  const category = getCategory(card.category);
  return (
    <div>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cat">
        <category.icon className="size-3.5" /> {category.name} · Key insight
      </span>
      <h3 className="mt-2 pr-8 text-xl font-extrabold leading-tight">{card.title}</h3>
      <ol className="mt-4 space-y-3">
        {card.points.map((p, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-cat-soft font-display text-xs font-bold text-cat">
              {i + 1}
            </span>
            <span className="text-[15px] leading-snug text-foreground/90">{p}</span>
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-2xl border border-cat bg-cat-soft p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-cat">Takeaway</p>
        <p className="mt-1 font-display text-base font-bold">{card.takeaway}</p>
      </div>
      <div className="mt-5 flex gap-2">
        {learned ? (
          <Button variant="glass" size="xl" className="flex-1" onClick={onClose}>
            Learned ✓
          </Button>
        ) : (
          <Button variant="xp" size="xl" className="flex-1" onClick={onLearn}>
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

function EndOfFeed() {
  return (
    <section className="flex h-dvh snap-start flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-gradient-xp shadow-glow">
        <Swords className="size-9 text-primary-foreground" />
      </div>
      <h2 className="text-2xl font-black">You're all caught up</h2>
      <p className="text-muted-foreground">
        Turn what you just learned into XP. Quests are waiting.
      </p>
      <Button variant="xp" size="xl" asChild>
        <Link to="/quests">Go to Quests</Link>
      </Button>
    </section>
  );
}
