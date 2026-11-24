import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

/** Persistent entry point to the Atlas Guide agent. */
export function GuideFab() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[5.6rem] z-30 mx-auto flex max-w-md justify-end px-4">
      <Link
        to="/guide"
        aria-label="Ask Atlas Guide"
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-primary/30 bg-background/85 py-2.5 pl-3 pr-4 font-display text-[11px] font-bold uppercase tracking-wider text-primary shadow-glow backdrop-blur-xl transition-transform active:scale-95"
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-gradient-xp">
          <Sparkles className="size-3.5 text-primary-foreground" />
        </span>
        Ask Atlas
      </Link>
    </div>
  );
}
