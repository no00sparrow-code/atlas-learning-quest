import type { StudioScript } from "./script";

const QUEUE_KEY = "atlas-studio-queue-v1";
const MAX_QUEUE = 12;

export type StudioQueueStatus = "queued" | "rendering" | "done" | "failed";

export interface StudioQueueItem {
  id: string;
  sourceId: string;
  sourceKind: StudioScript["sourceKind"];
  title: string;
  secondsPerSlide: number;
  durationSeconds: number;
  script: StudioScript;
  signature: string;
  status: StudioQueueStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
  jobId?: string;
}

function newQueueId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `queue-${crypto.randomUUID()}`;
  }
  return `queue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hash(input: string): string {
  let value = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return (value >>> 0).toString(16).padStart(8, "0");
}

export function queueSignature(script: StudioScript, secondsPerSlide: number): string {
  const content = JSON.stringify({
    slides: script.slides,
    sources: script.sources,
    sourceId: script.sourceId,
    sourceKind: script.sourceKind,
  });
  return `${script.sourceId}:${script.sourceKind}:${secondsPerSlide}:${hash(content)}`;
}

export function loadQueue(): StudioQueueItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudioQueueItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_QUEUE) : [];
  } catch {
    return [];
  }
}

function saveQueue(items: StudioQueueItem[]): StudioQueueItem[] {
  const next = items.slice(0, MAX_QUEUE);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
    } catch {
      /* queue metadata only; current tab state still works */
    }
  }
  return next;
}

export interface EnqueueResult {
  ok: boolean;
  reason?: string;
  queue: StudioQueueItem[];
  item?: StudioQueueItem;
}

export function enqueueScript(
  script: StudioScript,
  secondsPerSlide: number,
  queue = loadQueue(),
): EnqueueResult {
  if (queue.length >= MAX_QUEUE) {
    return {
      ok: false,
      reason: `The local queue is full (${MAX_QUEUE}). Render or remove an item first.`,
      queue,
    };
  }
  const signature = queueSignature(script, secondsPerSlide);
  if (
    queue.some(
      (item) =>
        item.signature === signature &&
        (item.status === "queued" || item.status === "rendering" || item.status === "done"),
    )
  ) {
    return {
      ok: false,
      reason: "This exact draft is already queued, rendering or rendered.",
      queue,
    };
  }
  const now = new Date().toISOString();
  const item: StudioQueueItem = {
    id: newQueueId(),
    sourceId: script.sourceId,
    sourceKind: script.sourceKind,
    title: script.sourceTitle,
    secondsPerSlide,
    durationSeconds: script.slides.length * secondsPerSlide,
    script,
    signature,
    status: "queued",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
  return { ok: true, queue: saveQueue([...queue, item]), item };
}

export type QueuePatch = Partial<Pick<StudioQueueItem, "status" | "attempts" | "error" | "jobId">>;

export function updateQueueItem(
  id: string,
  patch: QueuePatch,
  items = loadQueue(),
): StudioQueueItem[] {
  return saveQueue(
    items.map((item) =>
      item.id === id
        ? {
            ...item,
            ...patch,
            updatedAt: new Date().toISOString(),
          }
        : item,
    ),
  );
}

export function nextQueued(items = loadQueue()): StudioQueueItem | undefined {
  return [...items]
    .filter((item) => item.status === "queued")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
}

export function retryQueueItem(id: string, items = loadQueue()): StudioQueueItem[] {
  const cleared = items.map((item) => {
    if (item.id !== id) return item;
    const next = { ...item, status: "queued" as const, updatedAt: new Date().toISOString() };
    delete next.error;
    return next;
  });
  return saveQueue(cleared);
}

export function removeQueueItem(id: string, items = loadQueue()): StudioQueueItem[] {
  return saveQueue(items.filter((item) => item.id !== id));
}

export function clearCompleted(items = loadQueue()): StudioQueueItem[] {
  return saveQueue(items.filter((item) => item.status !== "done"));
}

export function queueCounts(items: StudioQueueItem[]): Record<StudioQueueStatus, number> {
  return {
    queued: items.filter((item) => item.status === "queued").length,
    rendering: items.filter((item) => item.status === "rendering").length,
    done: items.filter((item) => item.status === "done").length,
    failed: items.filter((item) => item.status === "failed").length,
  };
}
