import { FEED } from "@/data/cards";
import { ALL_EPISODES, getSeries } from "@/data/series";
import { sourcesFor, type Source } from "@/data/sources";
import type { CategoryId } from "@/data/categories";

export type StudioSourceKind = "short" | "episode";

export interface StudioSourceOption {
  id: string;
  kind: StudioSourceKind;
  title: string;
  meta: string;
  category: CategoryId;
}

export interface StudioSlide {
  heading: string;
  body: string;
  caption: string;
}

export interface StudioScript {
  sourceId: string;
  sourceKind: StudioSourceKind;
  sourceTitle: string;
  creatorName: string;
  category: CategoryId;
  accent: string;
  slides: StudioSlide[];
  sources: Source[];
  createdAt: string;
}

const ACCENTS: Record<CategoryId, string> = {
  psychology: "#a78bfa",
  science: "#818cf8",
  technology: "#22d3ee",
  history: "#fb923c",
  creativity: "#f472b6",
  business: "#fbbf24",
};

export const STUDIO_SOURCES: StudioSourceOption[] = [
  ...FEED.map((card) => ({
    id: card.id,
    kind: "short" as const,
    title: card.title,
    meta: `Micro-lesson · ${card.seconds}s · ${card.creatorName}`,
    category: card.category,
  })),
  ...ALL_EPISODES.map((episode) => {
    const series = getSeries(episode.seriesId);
    return {
      id: episode.id,
      kind: "episode" as const,
      title: `E${episode.number}: ${episode.title}`,
      meta: `${series?.title ?? "Deep dive"} · ${Math.round(episode.seconds / 60)} min`,
      category: series?.category ?? "psychology",
    };
  }),
];

export function buildStudioScript(
  sourceId: string,
  kind: StudioSourceKind,
): StudioScript | undefined {
  if (kind === "short") {
    const card = FEED.find((entry) => entry.id === sourceId);
    if (!card) return undefined;
    const slides: StudioSlide[] = [
      {
        heading: card.title,
        body: card.hook,
        caption: card.hook,
      },
      ...card.points.slice(0, 4).map((point, index) => ({
        heading: `Idea ${String(index + 1).padStart(2, "0")}`,
        body: point,
        caption: point,
      })),
      {
        heading: "Takeaway",
        body: card.takeaway,
        caption: card.takeaway,
      },
    ];
    return {
      sourceId: card.id,
      sourceKind: "short",
      sourceTitle: card.title,
      creatorName: card.creatorName,
      category: card.category,
      accent: ACCENTS[card.category],
      slides,
      sources: sourcesFor(card.id),
      createdAt: new Date().toISOString(),
    };
  }

  const episode = ALL_EPISODES.find((entry) => entry.id === sourceId);
  if (!episode) return undefined;
  const series = getSeries(episode.seriesId);
  const slides: StudioSlide[] = [
    {
      heading: episode.title,
      body: episode.summary,
      caption: episode.summary,
    },
    ...episode.takeaways.slice(0, 4).map((takeaway, index) => ({
      heading: `Takeaway ${index + 1}`,
      body: takeaway,
      caption: takeaway,
    })),
  ];
  const category = series?.category ?? "psychology";
  return {
    sourceId: episode.id,
    sourceKind: "episode",
    sourceTitle: episode.title,
    creatorName: series?.creatorName ?? "Atlas",
    category,
    accent: ACCENTS[category],
    slides,
    sources: sourcesFor(episode.id),
    createdAt: new Date().toISOString(),
  };
}

export function slideSeconds(slideCount: number): number {
  return Math.max(8, Math.min(45, slideCount * 4));
}

export function formatStamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.000`;
}

/** A real WebVTT sidecar derived from the on-screen text. No synthetic speech is implied. */
export function buildVtt(script: StudioScript, secondsPerSlide: number): string {
  const cues = script.slides.map((slide, index) => {
    const start = index * secondsPerSlide;
    const end = start + secondsPerSlide;
    const text = `${slide.heading}\n${slide.caption}`.replace(/-->/g, "→");
    return `${index + 1}\n${formatStamp(start)} --> ${formatStamp(end)}\n${text}`;
  });
  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
}

export interface QcCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export function runStudioQc(script: StudioScript, secondsPerSlide: number): QcCheck[] {
  const duration = script.slides.length * secondsPerSlide;
  const bodies = script.slides.map((slide) => slide.body.trim());
  const empty = bodies.some((body) => body.length === 0);
  const long = script.slides.filter((slide) => slide.body.length > 240);
  const validSources = script.sources.filter(
    (source) => source.label.trim().length > 0 && source.url.trim().length > 0,
  );
  return [
    {
      id: "slides",
      label: "Slide structure",
      status: script.slides.length >= 2 && script.slides.length <= 8 ? "pass" : "fail",
      detail: `${script.slides.length} slide${script.slides.length === 1 ? "" : "s"} (target 2–8).`,
    },
    {
      id: "copy",
      label: "On-screen copy",
      status: empty ? "fail" : long.length ? "warn" : "pass",
      detail: empty
        ? "One or more slides have empty body copy."
        : long.length
          ? `${long.length} slide(s) exceed 240 characters and may truncate.`
          : "Every slide has readable body copy.",
    },
    {
      id: "sources",
      label: "Source references",
      status: validSources.length > 0 ? "pass" : "warn",
      detail: validSources.length
        ? `${validSources.length} complete source reference(s) attached.`
        : "No complete source reference (label + URL) attached. Add one before publishing.",
    },
    {
      id: "duration",
      label: "Duration",
      status: duration <= 90 ? "pass" : "warn",
      detail: `${duration}s local draft (target ≤ 90s).`,
    },
    {
      id: "captions",
      label: "Captions",
      status: script.slides.every((slide) => slide.caption.trim()) ? "pass" : "warn",
      detail: "A WebVTT sidecar and burned-in captions are generated from slide copy.",
    },
  ];
}

export function scriptToJson(script: StudioScript): string {
  return JSON.stringify(script, null, 2);
}
