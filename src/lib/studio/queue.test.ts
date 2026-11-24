import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildStudioScript } from "./script";
import {
  clearCompleted,
  enqueueScript,
  loadQueue,
  nextQueued,
  queueCounts,
  queueSignature,
  removeQueueItem,
  retryQueueItem,
  updateQueueItem,
} from "./queue";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

const script = buildStudioScript("spotlight-effect", "short");

describe("studio production queue", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("queues a real draft once and rejects an exact duplicate", () => {
    if (!script) throw new Error("expected fixture");
    const first = enqueueScript(script, 4);
    expect(first.ok).toBe(true);
    expect(first.queue).toHaveLength(1);
    const duplicate = enqueueScript(script, 4, first.queue);
    expect(duplicate.ok).toBe(false);
    expect(duplicate.reason).toMatch(/already queued/);
    expect(queueSignature(script, 5)).not.toBe(queueSignature(script, 4));
  });

  it("tracks transitions, retries and clears completed items", () => {
    if (!script) throw new Error("expected fixture");
    const { queue, item } = enqueueScript(script, 4);
    if (!item) throw new Error("expected queue item");
    let items = updateQueueItem(item.id, { status: "rendering", attempts: 1 }, queue);
    expect(nextQueued(items)).toBeUndefined();
    items = updateQueueItem(item.id, { status: "failed", error: "capture failed" }, items);
    expect(queueCounts(items).failed).toBe(1);
    items = retryQueueItem(item.id, items);
    expect(items[0]?.status).toBe("queued");
    expect(items[0]?.error).toBeUndefined();
    items = updateQueueItem(item.id, { status: "done" }, items);
    expect(clearCompleted(items)).toHaveLength(0);
  });

  it("persists queue metadata and removes items explicitly", () => {
    if (!script) throw new Error("expected fixture");
    const { item } = enqueueScript(script, 4);
    if (!item) throw new Error("expected queue item");
    expect(loadQueue()).toHaveLength(1);
    expect(removeQueueItem(item.id)).toHaveLength(0);
    expect(loadQueue()).toHaveLength(0);
  });
});
