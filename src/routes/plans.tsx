import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, CreditCard, ShieldCheck, Sparkles, X } from "lucide-react";
import { LOCAL_LIMITS } from "@/lib/ai/usage";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Plans & allowances — Atlas" },
      {
        name: "description",
        content:
          "Atlas is free during beta. Local model and studio allowances are shown honestly; payments are not enabled.",
      },
    ],
  }),
  component: PlansPage,
});

const TIERS = [
  {
    id: "free",
    name: "Free beta",
    price: "£0",
    cadence: "no card",
    status: "Active now",
    description: "All current learning content and tools, with device-side guardrails.",
    benefits: [
      "Every micro-lesson, deep dive, quest and review",
      "Atlas Guide with library-grounded answers",
      `${LOCAL_LIMITS.aiQueriesPerDay} local model answers per day`,
      `${LOCAL_LIMITS.studioRendersPerDay} local studio renders per day`,
      "Progress, import and export on this device",
    ],
    missing: ["Cloud sync across devices", "Hosted model allowance"],
    active: true,
  },
  {
    id: "plus",
    name: "Atlas Plus",
    price: "Not priced",
    cadence: "payments disabled",
    status: "Planned",
    description: "A future hosted tier. No price has been set and nothing can be purchased.",
    benefits: [
      "Everything in Free beta",
      "Cloud progress sync (planned)",
      "Hosted Guide allowance (planned)",
      "Larger studio export allowance (planned)",
    ],
    missing: ["Payment provider", "Compliance review", "Backend accounts"],
    active: false,
  },
  {
    id: "creator",
    name: "Creator",
    price: "Not priced",
    cadence: "payments disabled",
    status: "Planned",
    description: "A future creator plan for publishing packs. No revenue is being collected.",
    benefits: [
      "Everything in Plus (planned)",
      "Pack and course publishing (planned)",
      "Creator revenue reporting (planned)",
      "Moderation workflow (planned)",
    ],
    missing: ["Marketplace backend", "Payout and tax setup", "Content policy review"],
    active: false,
  },
];

function PlansPage() {
  return (
    <div className="min-h-dvh bg-page pb-24">
      <header className="flex items-center gap-3 border-b border-border/60 bg-background/70 px-3 py-3 backdrop-blur-xl">
        <Link
          to="/profile"
          aria-label="Back to profile"
          className="rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <span className="flex size-10 items-center justify-center rounded-2xl bg-secondary">
          <CreditCard className="size-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold leading-tight">Plans & allowances</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Free during beta · no payment screen
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4">
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-bold">Nothing here takes a payment</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Atlas is free while it is a beta. Payment processing is not integrated, no card
                details are requested, and no subscription can be activated. The paid tiers below
                are an architecture preview only.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {TIERS.map((tier) => (
            <article
              key={tier.id}
              className={`rounded-2xl border p-4 ${
                tier.active ? "border-primary/50 bg-card" : "border-border bg-card/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold">{tier.name}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                    tier.active
                      ? "bg-success/15 text-success"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {tier.status}
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-bold">{tier.price}</p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {tier.cadence}
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                {tier.description}
              </p>
              <ul className="mt-3 space-y-1.5">
                {tier.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-1.5 text-[10px]">
                    <Check className="mt-0.5 size-3 shrink-0 text-success" />
                    {benefit}
                  </li>
                ))}
                {tier.missing.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-1.5 text-[10px] text-muted-foreground"
                  >
                    <X className="mt-0.5 size-3 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {tier.active ? (
                <Link
                  to="/"
                  className="mt-4 flex h-8 items-center justify-center rounded-lg bg-primary text-[10px] font-bold text-primary-foreground"
                >
                  Keep learning
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-4 flex h-8 w-full cursor-not-allowed items-center justify-center rounded-lg bg-secondary text-[10px] font-bold text-muted-foreground"
                >
                  Payments not enabled
                </button>
              )}
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <h2 className="text-xs font-bold">How the free allowances work</h2>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                Lessons, quests, review and the deterministic Guide are not metered. The local model
                and studio have daily caps because they use your device:{" "}
                {LOCAL_LIMITS.aiQueriesPerDay} model answers, {LOCAL_LIMITS.studioRendersPerDay}{" "}
                renders and {LOCAL_LIMITS.studioSecondsPerDay} seconds of rendering per day. When a
                cap is reached, Atlas explains when it resets; it does not silently fail or open a
                payment screen.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-dashed border-border bg-background/40 p-4">
          <h2 className="text-xs font-bold">What is still required for a paid tier</h2>
          <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
            <li>• Authenticated accounts with isolated server-side data</li>
            <li>• A payment provider, refund policy, tax handling and age requirements</li>
            <li>• Server-side entitlements and spending limits</li>
            <li>• Owner approval before any paid infrastructure is activated</li>
          </ul>
          <p className="mt-2 text-[10px] text-muted-foreground">
            None of those are configured. Atlas does not simulate a checkout or a subscription.
          </p>
        </section>
      </main>
    </div>
  );
}
