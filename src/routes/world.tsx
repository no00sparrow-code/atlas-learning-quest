import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Gem, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, getCategory, type Category, type CategoryId } from "@/data/categories";
import { skillsFor, type SkillNode } from "@/data/skills";
import { useAtlas } from "@/lib/atlas-store";
import { XP_PER_NODE, xpForLevel } from "@/lib/progression";
import { Hud } from "@/components/atlas/Hud";
import { XpBar } from "@/components/atlas/XpBar";
import { BottomSheet } from "@/components/atlas/BottomSheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/world")({
  head: () => ({
    meta: [
      { title: "World — Atlas skill map" },
      {
        name: "description",
        content: "Explore six realms of knowledge and unlock skills as you level up.",
      },
      { property: "og:title", content: "World — Atlas skill map" },
      {
        property: "og:description",
        content: "A living skill tree: every lesson and quest opens new realms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: World,
});

const TREE_POS: Record<string, { x: number; y: number }> = {
  "1": { x: 50, y: 13 },
  "2a": { x: 20, y: 50 },
  "2b": { x: 80, y: 50 },
  "3": { x: 50, y: 86 },
};
function posOf(node: SkillNode) {
  const key = node.id.split("-")[1] ?? "1";
  return TREE_POS[key] ?? { x: 50, y: 50 };
}

function World() {
  const { state, level, skillPoints } = useAtlas();
  const [selected, setSelected] = useState<CategoryId>("psychology");
  const realm = getCategory(selected);

  const totalSkills = CATEGORIES.length * 4;

  return (
    <div className="pb-nav">
      <header className="sticky top-0 z-30 space-y-3 bg-background/70 px-4 pb-3 pt-3 backdrop-blur-xl">
        <Hud />
      </header>

      <div className="px-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
              The World
            </p>
            <h1 className="text-2xl font-black">Your knowledge map</h1>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-bold tabular-nums">
              {state.unlockedSkills.length}
              <span className="text-muted-foreground">/{totalSkills}</span>
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Skills
            </p>
          </div>
        </div>

        <Constellation selected={selected} onSelect={setSelected} />

        <div className="mb-4 flex items-center gap-3 rounded-2xl glass px-4 py-3">
          <Gem className="size-5 shrink-0 text-primary" />
          <p className="text-sm">
            <span className="font-bold text-primary">
              {skillPoints} skill point{skillPoints === 1 ? "" : "s"}
            </span>{" "}
            <span className="text-muted-foreground">
              · Earn more by leveling up and finishing quests.
            </span>
          </p>
        </div>

        <RealmPanel realm={realm} playerLevel={level.level} />
      </div>
    </div>
  );
}

function Constellation({
  selected,
  onSelect,
}: {
  selected: CategoryId;
  onSelect: (id: CategoryId) => void;
}) {
  const { state, level } = useAtlas();
  const radius = 37;
  const points = CATEGORIES.map((c, i) => {
    const angle = (i * 60 - 90) * (Math.PI / 180);
    return { c, x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
  });

  return (
    <div className="relative mx-auto my-4 aspect-square w-full max-w-[360px]">
      <div className="absolute inset-[8%] rounded-full border border-border grid-noise" />
      <div className="absolute inset-[24%] animate-spin-slow rounded-full border border-dashed border-primary/20" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {points.map(({ c, x, y }, i) => {
          const open = level.level >= c.unlockLevel;
          const next = points[(i + 1) % points.length];
          return (
            <g key={c.id} data-cat={c.id}>
              <line
                x1={50}
                y1={50}
                x2={x}
                y2={y}
                strokeWidth={open ? 0.6 : 0.4}
                strokeDasharray={open ? "2 1" : "1 1.5"}
                className={cn(open ? "stroke-cat animate-dash" : "stroke-muted-foreground/30")}
              />
              {next && (
                <line
                  x1={x}
                  y1={y}
                  x2={next.x}
                  y2={next.y}
                  strokeWidth={0.25}
                  className="stroke-muted-foreground/20"
                />
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute left-1/2 top-1/2 flex size-[26%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-gradient-xp text-primary-foreground shadow-glow">
        <span className="font-display text-[9px] font-bold uppercase tracking-widest opacity-80">
          Core
        </span>
        <span className="font-display text-2xl font-black leading-none">{level.level}</span>
      </div>

      {points.map(({ c, x, y }, i) => {
        const open = level.level >= c.unlockLevel;
        const owned = skillsFor(c.id).filter((s) => state.unlockedSkills.includes(s.id)).length;
        const isSel = selected === c.id;
        return (
          <button
            key={c.id}
            data-cat={c.id}
            onClick={() => onSelect(c.id)}
            className="absolute flex animate-orbit-float flex-col items-center"
            style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.4}s` }}
            aria-label={`${c.realm}${open ? "" : " (locked)"}`}
          >
            <span
              className={cn(
                "relative flex size-16 items-center justify-center overflow-hidden rounded-full border-2 transition-all duration-300",
                open ? "border-cat" : "border-border grayscale",
                isSel && "scale-110 glow-cat",
                isSel && open && "animate-pulse-glow",
              )}
            >
              <img
                src={c.image}
                alt=""
                className={cn("absolute inset-0 h-full w-full object-cover", !open && "opacity-40")}
              />
              <span className="absolute inset-0 bg-overlay/30" />
              {open ? (
                <c.icon className="relative size-6 text-foreground drop-shadow" />
              ) : (
                <Lock className="relative size-5 text-muted-foreground" />
              )}
            </span>
            <span
              className={cn(
                "mt-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider",
                isSel ? "text-cat" : "text-muted-foreground",
              )}
            >
              {c.name}
            </span>
            <span className="text-[9px] font-semibold text-muted-foreground">
              {open ? `${owned}/4` : `Lv ${c.unlockLevel}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RealmPanel({ realm, playerLevel }: { realm: Category; playerLevel: number }) {
  const { state, canUnlockSkill, unlockSkill } = useAtlas();
  const [openNode, setOpenNode] = useState<SkillNode | null>(null);
  const nodes = skillsFor(realm.id);
  const open = playerLevel >= realm.unlockLevel;
  const owned = nodes.filter((n) => state.unlockedSkills.includes(n.id)).length;

  // XP remaining until the realm's level
  let xpToGo = 0;
  if (!open) {
    let cum = 0;
    for (let l = 1; l < realm.unlockLevel; l++) cum += xpForLevel(l);
    xpToGo = Math.max(0, cum - state.xp);
  }

  const doUnlock = (node: SkillNode) => {
    const res = unlockSkill(node.id);
    if (res.ok) {
      toast.success(`${node.name} unlocked`, { description: node.perk });
      setOpenNode(null);
    } else toast.error(res.reason ?? "Can't unlock yet");
  };

  return (
    <section
      key={realm.id}
      data-cat={realm.id}
      className="animate-rise overflow-hidden rounded-3xl border border-cat bg-card shadow-card"
    >
      <div className="relative h-36">
        <img src={realm.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        <div className="absolute inset-x-4 bottom-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-cat">
            <realm.icon className="size-3.5" /> {realm.name}
          </p>
          <h2 className="text-xl font-black">{realm.realm}</h2>
          <p className="text-sm text-foreground/75">{realm.blurb}</p>
        </div>
      </div>

      {!open ? (
        <div className="space-y-3 p-5 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary">
            <Lock className="size-6 text-muted-foreground" />
          </div>
          <p className="font-display text-lg font-bold">Reach level {realm.unlockLevel} to enter</p>
          <p className="text-sm text-muted-foreground">
            {xpToGo} XP to go. Finish cards and quests to get there faster.
          </p>
          <Button variant="cat" size="xl" className="w-full" asChild>
            <Link to="/quests">Earn XP in Quests</Link>
          </Button>
        </div>
      ) : (
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold">
            <span className="uppercase tracking-wider text-muted-foreground">Realm mastery</span>
            <span className="text-cat">{owned}/4 skills</span>
          </div>
          <XpBar progress={owned / 4} tone="cat" size="sm" />

          <div className="relative mt-4 h-[300px]">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
            >
              {nodes.flatMap((n) =>
                n.requires.map((r) => {
                  const parent = nodes.find((p) => p.id === r);
                  if (!parent) return null;
                  const a = posOf(parent);
                  const b = posOf(n);
                  const lit =
                    state.unlockedSkills.includes(r) && state.unlockedSkills.includes(n.id);
                  const half = state.unlockedSkills.includes(r);
                  return (
                    <line
                      key={`${r}-${n.id}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      vectorEffect="non-scaling-stroke"
                      strokeWidth={lit ? 3 : 2}
                      strokeDasharray={lit ? undefined : "6 6"}
                      className={cn(
                        lit
                          ? "stroke-cat"
                          : half
                            ? "stroke-cat opacity-60 animate-dash"
                            : "stroke-muted-foreground/30",
                      )}
                    />
                  );
                }),
              )}
            </svg>
            {nodes.map((n) => {
              const p = posOf(n);
              const unlocked = state.unlockedSkills.includes(n.id);
              const check = canUnlockSkill(n.id);
              return (
                <button
                  key={n.id}
                  onClick={() => setOpenNode(n)}
                  className="absolute flex w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                >
                  <span
                    className={cn(
                      "flex rotate-45 items-center justify-center rounded-2xl border-2 transition-all",
                      n.tier === 3 ? "size-16" : "size-14",
                      unlocked && "border-cat bg-cat glow-cat",
                      !unlocked && check.ok && "animate-pulse-glow border-cat bg-cat-soft",
                      !unlocked && !check.ok && "border-border bg-secondary",
                    )}
                  >
                    <span className="-rotate-45">
                      {unlocked ? (
                        <Check className="size-6 text-background" strokeWidth={3} />
                      ) : check.ok ? (
                        <Sparkles className="size-6 text-cat" />
                      ) : (
                        <Lock className="size-5 text-muted-foreground" />
                      )}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "text-center text-[11px] font-bold leading-tight",
                      unlocked ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {n.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <BottomSheet open={openNode !== null} onClose={() => setOpenNode(null)} cat={realm.id}>
        {openNode && <NodeDetail node={openNode} onUnlock={() => doUnlock(openNode)} />}
      </BottomSheet>
    </section>
  );
}

function NodeDetail({ node, onUnlock }: { node: SkillNode; onUnlock: () => void }) {
  const { state, canUnlockSkill } = useAtlas();
  const unlocked = state.unlockedSkills.includes(node.id);
  const check = canUnlockSkill(node.id);
  const realm = getCategory(node.category);
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cat">
        {realm.realm} · Tier {node.tier}
      </p>
      <h3 className="mt-1 pr-8 text-2xl font-black">{node.name}</h3>
      <p className="mt-2 text-foreground/80">{node.description}</p>
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-cat bg-cat-soft p-4">
        <Sparkles className="size-5 shrink-0 text-cat" />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-cat">Perk</p>
          <p className="font-semibold">{node.perk}</p>
        </div>
      </div>
      <div className="mt-5">
        {unlocked ? (
          <Button variant="glass" size="xl" className="w-full" disabled>
            <Check /> Unlocked
          </Button>
        ) : check.ok ? (
          <Button variant="cat" size="xl" className="w-full" onClick={onUnlock}>
            <Gem /> Unlock · 1 point · +{XP_PER_NODE} XP
          </Button>
        ) : (
          <div className="space-y-2">
            <Button variant="glass" size="xl" className="w-full" disabled>
              <Lock /> Locked
            </Button>
            <p className="text-center text-sm text-muted-foreground">{check.reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
