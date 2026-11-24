import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { FEED, type FeedCard } from "@/data/cards";
import { FeedCardView } from "@/components/atlas/FeedCardView";
import { BottomSheet } from "@/components/atlas/BottomSheet";
import { InsightSheetContent } from "@/components/atlas/InsightSheet";
import { useAtlas } from "@/lib/atlas-store";

export const Route = createFileRoute("/watch/$cardId")({
  loader: ({ params }) => {
    const card = FEED.find((c) => c.id === params.cardId);
    if (!card) throw notFound();
    return { cardId: card.id, title: card.title, hook: card.hook };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — Atlas` },
          { name: "description", content: loaderData.hook },
          { property: "og:title", content: `${loaderData.title} — Atlas` },
          { property: "og:description", content: loaderData.hook },
          { property: "og:type", content: "article" },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [{ title: "Lesson unavailable — Atlas" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-black">Lesson not found</h1>
      <Link
        to="/"
        className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
      >
        Back to Discover
      </Link>
    </div>
  ),
  component: WatchPage,
});

function WatchPage() {
  const { cardId } = Route.useLoaderData();
  const card = FEED.find((c) => c.id === cardId) as FeedCard;
  const { trackOpen } = useAtlas();
  const [insight, setInsight] = useState<FeedCard | null>(null);

  useEffect(() => {
    trackOpen("short", card.id);
  }, [card.id, trackOpen]);

  return (
    <div className="relative">
      <Link
        to="/"
        aria-label="Back to Discover"
        className="absolute left-3 top-3 z-30 flex size-10 items-center justify-center rounded-full border border-border/60 bg-background/60 backdrop-blur-xl"
        style={{ marginTop: "env(safe-area-inset-top)" }}
      >
        <ArrowLeft className="size-5" />
      </Link>
      <FeedCardView card={card} active onOpenInsight={setInsight} />
      <BottomSheet open={insight !== null} onClose={() => setInsight(null)} cat={insight?.category}>
        {insight && <InsightSheetContent card={insight} onClose={() => setInsight(null)} />}
      </BottomSheet>
    </div>
  );
}
