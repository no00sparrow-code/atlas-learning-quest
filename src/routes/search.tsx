import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Film, Search, Sparkles, Swords } from "lucide-react";
import { getCategory } from "@/data/categories";
import { searchAtlas, type SearchHit } from "@/lib/agent";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q = search["q"];
    return typeof q === "string" && q.trim() ? { q: q.slice(0, 120) } : {};
  },
  head: () => ({
    meta: [
      { title: "Search — Atlas" },
      {
        name: "description",
        content: "Search lessons, deep dives, quests and concepts across the Atlas library.",
      },
      { property: "og:title", content: "Search — Atlas" },
      {
        property: "og:description",
        content: "Find any lesson or concept by topic.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

type Kind = SearchHit["kind"];
type Filter = "all" | Kind;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "short", label: "Shorts" },
  { id: "episode", label: "Episodes" },
  { id: "series", label: "Series" },
  { id: "quest", label: "Quests" },
  { id: "concept", label: "Concepts" },
];

const KIND_META: Record<Kind, { label: string; icon: typeof BookOpen }> = {
  short: { label: "Short", icon: Sparkles },
  episode: { label: "Episode", icon: Film },
  series: { label: "Series", icon: BookOpen },
  quest: { label: "Quest", icon: Swords },
  concept: { label: "Concept", icon: Sparkles },
  skill: { label: "Skill", icon: Sparkles },
};

function SearchPage() {
  const { q: initialQuery } = Route.useSearch();
  const [query, setQuery] = useState(initialQuery ?? "");
  const [filter, setFilter] = useState<Filter>("all");

  const hits = useMemo(() => (query.trim() ? searchAtlas(query.trim()) : []), [query]);
  const filtered = filter === "all" ? hits : hits.filter((hit) => hit.kind === filter);

  return (
    <div className="pb-nav">
      <header className="sticky top-0 z-30 space-y-3 bg-background/70 px-4 pb-3 pt-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search memory, pricing, attention…"
              aria-label="Search Atlas"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="rounded-full px-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
          </div>
          <Link to="/" aria-label="Back to Discover" className="rounded-xl bg-secondary p-2.5">
            <ArrowRight className="size-4 rotate-180" />
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
                filter === item.id
                  ? "bg-foreground text-background"
                  : "glass-dark text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4">
        {!query.trim() ? (
          <div className="pt-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              Search the library
            </p>
            <h1 className="mt-1 text-2xl font-black">What are you curious about?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Search short lessons, deep-dive episodes, quests and the concept map.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["memory", "dark matter", "pricing", "attention", "constraints", "Rome"].map(
                (term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="rounded-full border border-border bg-card px-3 py-2 text-xs font-bold text-foreground/80"
                  >
                    {term}
                  </button>
                ),
              )}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="font-display text-sm font-bold">No matches for “{query}”</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a broader topic: memory, universe, Rome, pricing, creativity.
            </p>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-muted-foreground">
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </p>
            {filtered.map((hit) => (
              <ResultRow key={`${hit.kind}-${hit.id}`} hit={hit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultRow({ hit }: { hit: SearchHit }) {
  const meta = KIND_META[hit.kind];
  const category = getCategory(hit.category);
  const Icon = meta.icon;
  const props = {
    to: hit.action.to as "/",
    params: (hit.action.params ?? {}) as never,
    search: (hit.action.search ?? {}) as never,
    "data-cat": hit.category,
    className:
      "flex animate-rise items-center gap-3 rounded-2xl border border-transparent bg-card p-3 transition-all hover:border-border active:scale-[0.99]",
  };

  return (
    <Link {...props}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cat-soft">
        <Icon className="size-4 text-cat" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cat">
          {meta.label} · {category.name}
        </span>
        <span className="mt-0.5 block truncate font-display text-sm font-bold">
          {hit.title.split(" · ").pop()}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
          {hit.snippet}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
