import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Orbit, Swords, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAtlas } from "@/lib/atlas-store";

const TABS = [
  { to: "/", label: "Discover", icon: Compass },
  { to: "/world", label: "World", icon: Orbit },
  { to: "/quests", label: "Quests", icon: Swords },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { skillPoints } = useAtlas();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-3"
      style={{ paddingBottom: "calc(0.6rem + env(safe-area-inset-bottom))" }}
      aria-label="Main"
    >
      <div className="glass flex items-center justify-around rounded-3xl px-2 py-1.5 shadow-card">
        {TABS.map((tab) => {
          const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "relative flex h-8 w-12 items-center justify-center rounded-xl transition-all duration-300",
                  active && "bg-primary/15 shadow-glow",
                )}
              >
                <Icon
                  className={cn("size-5 transition-transform duration-300", active && "scale-110")}
                />
                {tab.to === "/world" && skillPoints > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {skillPoints}
                  </span>
                )}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
