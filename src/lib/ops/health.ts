import { FEED } from "@/data/cards";
import { ALL_EPISODES } from "@/data/series";
import { sourcesFor } from "@/data/sources";
import { EPISODE_VIDEO_SOURCES } from "@/data/videos";
import { checkProvider } from "@/lib/ai/providers";
import { loadAiConfig } from "@/lib/ai/config";
import { LOCAL_LIMITS, loadUsage } from "@/lib/ai/usage";
import { loadJobs } from "@/lib/studio/jobs";

export type HealthStatus = "pass" | "warn" | "fail" | "unavailable";

export interface HealthCheck {
  id: string;
  label: string;
  status: HealthStatus;
  detail: string;
  scope: "browser" | "content" | "integration" | "platform";
  checkedAt: string;
}

const now = () => new Date().toISOString();

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

/**
 * Browser-local checks only. There is no Atlas backend to query for users,
 * infrastructure, spend or revenue, so those stay `unavailable` — never guessed.
 */
export async function runLocalHealthChecks(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  const checkedAt = now();

  try {
    localStorage.setItem("atlas-health-probe", "1");
    localStorage.removeItem("atlas-health-probe");
    checks.push({
      id: "storage",
      label: "Local storage",
      status: "pass",
      detail: "Progress, quotas and studio job metadata can be written on this device.",
      scope: "browser",
      checkedAt,
    });
  } catch {
    checks.push({
      id: "storage",
      label: "Local storage",
      status: "fail",
      detail:
        "Local storage is blocked. Progress will not persist after this tab closes; export cannot help until storage is available.",
      scope: "browser",
      checkedAt,
    });
  }

  const allIds = [
    ...FEED.map((card) => `short:${card.id}`),
    ...ALL_EPISODES.map((episode) => `episode:${episode.id}`),
  ];
  checks.push({
    id: "content-ids",
    label: "Content identifiers",
    status: unique(allIds) ? "pass" : "fail",
    detail: unique(allIds)
      ? `${allIds.length} lessons have unique IDs across shorts and episodes.`
      : "Duplicate lesson IDs found. Routing and progress would collide.",
    scope: "content",
    checkedAt,
  });

  const shortsWithoutSources = FEED.filter((card) => sourcesFor(card.id).length === 0).length;
  checks.push({
    id: "sources",
    label: "Lesson source references",
    status: shortsWithoutSources === 0 ? "pass" : "warn",
    detail:
      shortsWithoutSources === 0
        ? "Every micro-lesson has at least one reference link."
        : `${shortsWithoutSources} micro-lesson(s) have no reference link. Their claims are not independently checkable in-app.`,
    scope: "content",
    checkedAt,
  });

  const realVideos = Object.keys(EPISODE_VIDEO_SOURCES).length;
  checks.push({
    id: "episode-media",
    label: "Published episode media",
    status: realVideos === 0 ? "warn" : "pass",
    detail:
      realVideos === 0
        ? "No produced episode video is registered. Players show an explicit missing-media state rather than simulated playback."
        : `${realVideos} episode video source(s) registered.`,
    scope: "content",
    checkedAt,
  });

  const rendererSupported =
    typeof MediaRecorder !== "undefined" &&
    (MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ||
      MediaRecorder.isTypeSupported("video/webm"));
  checks.push({
    id: "renderer",
    label: "Local video renderer",
    status: rendererSupported ? "pass" : "warn",
    detail: rendererSupported
      ? "Canvas capture + MediaRecorder can create a real WebM draft in this browser."
      : "This browser cannot record WebM. The studio will report the failure instead of pretending to render.",
    scope: "browser",
    checkedAt,
  });

  const usage = loadUsage();
  checks.push({
    id: "allowances",
    label: "Daily local allowances",
    status: "pass",
    detail: `Model ${usage.aiQueries}/${LOCAL_LIMITS.aiQueriesPerDay} · renders ${usage.studioRenders}/${LOCAL_LIMITS.studioRendersPerDay} · ${usage.studioSeconds}/${LOCAL_LIMITS.studioSecondsPerDay}s. Resets on the next local day.`,
    scope: "browser",
    checkedAt,
  });

  const jobs = loadJobs();
  const failed = jobs.filter((job) => job.status === "failed").length;
  checks.push({
    id: "studio-jobs",
    label: "Studio job history",
    status: failed > 0 ? "warn" : "pass",
    detail:
      jobs.length === 0
        ? "No local studio jobs recorded yet."
        : `${jobs.length} local job(s); ${failed} failed. Failures stay in history with their error text.`,
    scope: "browser",
    checkedAt,
  });

  const config = loadAiConfig();
  if (!config.consent) {
    checks.push({
      id: "model",
      label: "Guide model provider",
      status: "unavailable",
      detail:
        "Local model processing is off. Library-grounded Guide answers remain available; no network request is made.",
      scope: "integration",
      checkedAt,
    });
  } else if (config.provider === "on-device") {
    const provider = await checkProvider(config.provider, config);
    checks.push({
      id: "model",
      label: "Guide model provider",
      status:
        provider.state === "ready"
          ? "pass"
          : provider.state === "needs-download"
            ? "warn"
            : "unavailable",
      detail: provider.detail,
      scope: "integration",
      checkedAt,
    });
  } else {
    checks.push({
      id: "model",
      label: "Guide model provider",
      status: "unavailable",
      detail: `Configured for ${config.provider}, but this status page does not probe local model servers. Use “Check connection” in Guide settings.`,
      scope: "integration",
      checkedAt,
    });
  }

  checks.push({
    id: "platform",
    label: "Platform-wide health",
    status: "unavailable",
    detail:
      "No Atlas backend, owner session or infrastructure provider is configured. User counts, CPU/RAM/storage, spend and revenue cannot be measured here and are not estimated.",
    scope: "platform",
    checkedAt,
  });

  return checks;
}
