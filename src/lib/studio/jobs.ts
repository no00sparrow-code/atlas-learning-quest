import type { StudioSourceKind } from "./script";

const JOBS_KEY = "atlas-studio-jobs-v1";

export type StudioJobStatus = "draft" | "rendered" | "approved" | "failed";

export interface StudioJob {
  id: string;
  sourceId: string;
  sourceKind: StudioSourceKind;
  title: string;
  status: StudioJobStatus;
  createdAt: string;
  updatedAt: string;
  durationSeconds: number;
  sizeBytes?: number;
  muted: boolean;
  error?: string;
}

export function newJobId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadJobs(): StudioJob[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudioJob[];
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

function saveJobs(jobs: StudioJob[]): StudioJob[] {
  const next = jobs.slice(0, 20);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(JOBS_KEY, JSON.stringify(next));
    } catch {
      /* metadata only; the video download is unaffected */
    }
  }
  return next;
}

export function upsertJob(job: StudioJob): StudioJob[] {
  const jobs = loadJobs();
  const index = jobs.findIndex((entry) => entry.id === job.id);
  if (index >= 0) jobs[index] = job;
  else jobs.unshift(job);
  return saveJobs(jobs);
}

export function clearJobs(): StudioJob[] {
  return saveJobs([]);
}
