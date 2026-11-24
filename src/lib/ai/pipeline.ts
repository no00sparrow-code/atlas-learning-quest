import { getCategory } from "@/data/categories";
import type { Source } from "@/data/sources";
import {
  buildStudioScript,
  buildVtt,
  runStudioQc,
  type StudioScript,
  type StudioSourceKind,
} from "@/lib/studio/script";
import type { AtlasAgentId } from "./agents";

export type PipelineStageStatus =
  "pass" | "warn" | "fail" | "unavailable" | "ready" | "human-required";

export interface PipelineStage {
  id: string;
  agent: AtlasAgentId;
  label: string;
  status: PipelineStageStatus;
  detail: string;
}

export interface ProductionPipeline {
  script: StudioScript;
  vtt: string;
  qc: ReturnType<typeof runStudioQc>;
  stages: PipelineStage[];
  canRender: boolean;
  canApproveAutomatically: false;
  blockers: string[];
  generatedAt: string;
}

function urlIsCheckable(source: Source): boolean {
  try {
    const url = new URL(source.url);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * The local production pipeline. It never claims to perform web research,
 * factual review, narration or publishing. It assembles, checks and prepares
 * a draft, leaving the final factual and rights approval to a human.
 */
export function runProductionPipeline(
  sourceId: string,
  kind: StudioSourceKind,
  secondsPerSlide: number,
): ProductionPipeline | undefined {
  const script = buildStudioScript(sourceId, kind);
  if (!script) return undefined;
  const qc = runStudioQc(script, secondsPerSlide);
  const vtt = buildVtt(script, secondsPerSlide);
  const validSources = script.sources.filter(
    (source) => source.label.trim() && urlIsCheckable(source),
  );
  const invalidSources = script.sources.length - validSources.length;
  const structure = qc.find((check) => check.id === "slides");
  const copy = qc.find((check) => check.id === "copy");
  const captions = qc.find((check) => check.id === "captions");
  const duration = script.slides.length * secondsPerSlide;

  const stages: PipelineStage[] = [
    {
      id: "research",
      agent: "research",
      label: "Research",
      status: "unavailable",
      detail:
        "No web-research provider is connected. Atlas uses the reviewed lesson notes already in its library.",
    },
    {
      id: "verification",
      agent: "source-verification",
      label: "Source verification",
      status: validSources.length > 0 && invalidSources === 0 ? "pass" : "warn",
      detail:
        validSources.length === 0
          ? "No complete, checkable reference is attached. Human source work is required."
          : `${validSources.length} reference(s) have a label and HTTP(S) URL. URL syntax is checked; factual accuracy is not.`,
    },
    {
      id: "script",
      agent: "script",
      label: "Script",
      status: structure?.status === "pass" ? "pass" : "fail",
      detail:
        structure?.status === "pass"
          ? `${script.slides.length} editable slides assembled from lesson copy.`
          : "The draft does not meet the slide structure target.",
    },
    {
      id: "review",
      agent: "quality",
      label: "Educational review",
      status:
        copy?.status === "fail" || structure?.status === "fail"
          ? "fail"
          : copy?.status === "warn"
            ? "warn"
            : "human-required",
      detail:
        copy?.status === "fail" || structure?.status === "fail"
          ? "Structural QC failed. Fix the copy before rendering or approval."
          : "Automated structural QC passed where applicable; a human must check every factual claim.",
    },
    {
      id: "categorisation",
      agent: "categorisation",
      label: "Categorisation",
      status: "pass",
      detail: `${getCategory(script.category).name} · ${kind === "short" ? "micro-lesson" : "deep dive"} · local deterministic tags.`,
    },
    {
      id: "narration",
      agent: "narration",
      label: "Narration",
      status: "unavailable",
      detail: "No TTS engine is connected. The render will be silent.",
    },
    {
      id: "visuals",
      agent: "visuals",
      label: "Visuals & animation",
      status: "warn",
      detail:
        "Text-led slides with fades and lower thirds. No generative imagery or source footage is attached.",
    },
    {
      id: "subtitles",
      agent: "subtitles",
      label: "Subtitles",
      status: captions?.status === "pass" ? "pass" : "warn",
      detail: "WebVTT cues and burned-in captions are generated from slide copy.",
    },
    {
      id: "render",
      agent: "render",
      label: "Local render",
      status: "ready",
      detail: `Ready to render ${duration}s at 1280×720. This stage runs only after the user consents in Studio.`,
    },
    {
      id: "approval",
      agent: "quality",
      label: "Approval",
      status: "human-required",
      detail:
        "Factual accuracy, source reachability and rights checks are manual. Nothing is published automatically.",
    },
  ];

  const blockers: string[] = [];
  if (validSources.length === 0) blockers.push("No complete source reference is attached.");
  if (copy?.status === "fail" || structure?.status === "fail") {
    blockers.push("Structural QC failed.");
  }
  blockers.push("Human factual and rights approval is required.");

  return {
    script,
    vtt,
    qc,
    stages,
    canRender: structure?.status !== "fail" && copy?.status !== "fail",
    canApproveAutomatically: false,
    blockers,
    generatedAt: new Date().toISOString(),
  };
}
