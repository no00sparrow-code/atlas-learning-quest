import { Link } from "@tanstack/react-router";
import { Check, Play } from "lucide-react";
import { getCategory } from "@/data/categories";
import { formatDuration } from "@/data/series";
import type { ContentRef } from "@/lib/library";
import { cn } from "@/lib/utils";

/** One normalized row for shorts and deep-dive episodes in the library. */
export function ContentRow({ item, meta }: { item: ContentRef; meta?: string | undefined }) {
  const category = getCategory(item.category);
  const body = (
    <>
      <div
        className="relative size-16 shrink-0 overflow-hidden rounded-xl"
        data-cat={item.category}
      >
        <img
          src={category.image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <span className="absolute inset-0 bg-overlay/45" />
        <span className="absolute inset-0 flex items-center justify-center">
          {item.completed ? (
            <Check className="size-5 text-success" />
          ) : (
            <Play className="size-5 fill-foreground text-foreground" />
          )}
        </span>
      </div>
      <div className="min-w-0 flex-1" data-cat={item.category}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-cat">
          {category.name}
          {item.kind === "episode" && item.episodeNumber ? ` · Ep ${item.episodeNumber}` : ""}
        </p>
        <p className="truncate font-display text-[15px] font-bold">{item.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDuration(item.seconds)}
          {item.kind === "episode" && item.seriesTitle ? ` · ${item.seriesTitle}` : ""}
          {meta ? ` · ${meta}` : ""}
        </p>
        {!item.completed && item.position > 0.01 && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-cat"
              style={{ width: `${Math.round(item.position * 100)}%` }}
            />
          </div>
        )}
      </div>
      <span
        className={cn(
          "shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold",
          item.completed ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground",
        )}
      >
        {item.completed
          ? "Done"
          : item.position > 0.01
            ? `${Math.round(item.position * 100)}%`
            : item.saved
              ? "Saved"
              : "Start"}
      </span>
    </>
  );

  const className =
    "flex animate-rise items-center gap-3 rounded-2xl border border-transparent bg-card p-2.5 transition-all hover:border-border active:scale-[0.99]";

  if (item.kind === "episode" && item.seriesId) {
    return (
      <Link
        to="/series/$seriesId"
        params={{ seriesId: item.seriesId }}
        search={{ episode: item.id }}
        className={className}
      >
        {body}
      </Link>
    );
  }
  return (
    <Link to="/watch/$cardId" params={{ cardId: item.id }} className={className}>
      {body}
    </Link>
  );
}
