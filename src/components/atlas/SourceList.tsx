import { ExternalLink, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { sourcesFor } from "@/data/sources";

/**
 * Provenance for a lesson: reference links plus a route to flag an issue.
 * Links open in a new tab; no tracking or redirects.
 */
export function SourceList({
  contentId,
  title,
  compact = false,
}: {
  contentId: string;
  title: string;
  compact?: boolean;
}) {
  const sources = sourcesFor(contentId);
  const query = `I think there may be an error in "${title}". Can you check it?`;

  return (
    <div className={compact ? "rounded-xl bg-secondary/50 p-3" : "rounded-2xl bg-card p-4"}>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <ShieldCheck className="size-3.5 text-success" /> Sources & further reading
      </p>
      {sources.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-start gap-1.5 text-xs font-semibold text-foreground/85 underline-offset-2 hover:text-primary hover:underline"
              >
                <ExternalLink className="mt-0.5 size-3 shrink-0" />
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          No reference links attached to this lesson yet.
        </p>
      )}
      <Link
        to="/guide"
        search={{ q: query }}
        className="mt-2 inline-block text-[11px] font-bold text-primary underline-offset-2 hover:underline"
      >
        Spotted something wrong? Ask the Guide
      </Link>
    </div>
  );
}
