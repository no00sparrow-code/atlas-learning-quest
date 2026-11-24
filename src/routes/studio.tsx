import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  CircleAlert,
  Cpu,
  Download,
  Film,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  STUDIO_SOURCES,
  buildStudioScript,
  formatStamp,
  runStudioQc,
  scriptToJson,
  slideSeconds,
  type StudioScript,
  type StudioSlide,
  type StudioSourceKind,
} from "@/lib/studio/script";
import { clearJobs, loadJobs, newJobId, upsertJob, type StudioJob } from "@/lib/studio/jobs";
import { renderStudioVideo, type RenderResult } from "@/lib/studio/render";
import { checkStudioQuota, consumeStudioRender } from "@/lib/ai/usage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Atlas Studio — local video drafts" },
      {
        name: "description",
        content:
          "A browser-local production desk for Atlas lessons: edit a sourced script, render a captioned WebM draft and review it before publication.",
      },
      { property: "og:title", content: "Atlas Studio — local video drafts" },
      {
        property: "og:description",
        content: "Script, render and review an educational video draft on your own device.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudioPage,
});

const CONSENT_KEY = "atlas-studio-consent-v1";

type ManualChecks = {
  sources: boolean;
  facts: boolean;
  rights: boolean;
};

function sourceKey(kind: StudioSourceKind, id: string): string {
  return `${kind}:${id}`;
}

function parseSourceKey(value: string): { kind: StudioSourceKind; id: string } | null {
  const index = value.indexOf(":");
  if (index < 0) return null;
  const kind = value.slice(0, index);
  const id = value.slice(index + 1);
  if ((kind !== "short" && kind !== "episode") || !id) return null;
  return { kind, id };
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "atlas-draft"
  );
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StudioPage() {
  const [sourceKeyValue, setSourceKeyValue] = useState("");
  const [script, setScript] = useState<StudioScript | null>(null);
  const [secondsPerSlide, setSecondsPerSlide] = useState(4);
  const [consent, setConsent] = useState(false);
  const [checks, setChecks] = useState<ManualChecks>({
    sources: false,
    facts: false,
    rights: false,
  });
  const [result, setResult] = useState<RenderResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoUrlRef = useRef<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState<StudioJob[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [renderedSignature, setRenderedSignature] = useState<string | null>(null);
  const [quota, setQuota] = useState(() => ({
    allowed: true,
    used: 0,
    limit: 3,
    remaining: 3,
    message: "3 local renders left today.",
  }));
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const initial = STUDIO_SOURCES[0];
    if (initial) {
      setSourceKeyValue(sourceKey(initial.kind, initial.id));
      setScript(buildStudioScript(initial.id, initial.kind) ?? null);
    }
    setJobs(loadJobs());
    setConsent(typeof localStorage !== "undefined" && localStorage.getItem(CONSENT_KEY) === "true");
    setQuota(checkStudioQuota(0));
  }, []);

  useEffect(() => {
    videoUrlRef.current = videoUrl;
  }, [videoUrl]);

  useEffect(() => {
    return () => {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const clearVideo = () => {
    const current = videoUrlRef.current;
    if (current) URL.revokeObjectURL(current);
    videoUrlRef.current = null;
    setVideoUrl(null);
  };

  const duration = script ? slideSeconds(script.slides.length) : 0;
  const qc = useMemo(
    () => (script ? runStudioQc(script, secondsPerSlide) : []),
    [script, secondsPerSlide],
  );
  const signature = script ? JSON.stringify(script) : "";
  const stale = Boolean(result && renderedSignature !== signature);
  const canApprove =
    Boolean(result) && !stale && checks.sources && checks.facts && checks.rights && !rendering;

  const selectSource = (value: string) => {
    setSourceKeyValue(value);
    const parsed = parseSourceKey(value);
    if (!parsed) return;
    const next = buildStudioScript(parsed.id, parsed.kind) ?? null;
    setScript(next);
    setResult(null);
    clearVideo();
    setRenderedSignature(null);
    setJobId(null);
    setError("");
    setChecks({ sources: false, facts: false, rights: false });
  };

  const replaceScript = (next: StudioScript) => {
    setScript(next);
    setChecks({ sources: false, facts: false, rights: false });
    if (jobId) {
      const existing = loadJobs().find((job) => job.id === jobId);
      if (existing && existing.status === "approved") {
        setJobs(
          upsertJob({
            ...existing,
            status: "draft",
            updatedAt: new Date().toISOString(),
          }),
        );
      }
    }
  };

  const editSlide = (
    index: number,
    field: keyof Pick<StudioSlide, "heading" | "body" | "caption">,
    value: string,
  ) => {
    if (!script) return;
    replaceScript({
      ...script,
      slides: script.slides.map((slide, slideIndex) =>
        slideIndex === index ? { ...slide, [field]: value } : slide,
      ),
    });
  };

  const editSource = (index: number, field: "label" | "url", value: string) => {
    if (!script) return;
    replaceScript({
      ...script,
      sources: script.sources.map((source, sourceIndex) =>
        sourceIndex === index ? { ...source, [field]: value } : source,
      ),
    });
  };

  const addSource = () => {
    if (!script) return;
    replaceScript({ ...script, sources: [...script.sources, { label: "", url: "" }] });
  };

  const removeSource = (index: number) => {
    if (!script) return;
    replaceScript({ ...script, sources: script.sources.filter((_, i) => i !== index) });
  };

  const setConsentValue = (value: boolean) => {
    setConsent(value);
    try {
      localStorage.setItem(CONSENT_KEY, String(value));
    } catch {
      /* preference remains in memory */
    }
  };

  const renderDraft = async () => {
    if (!script || rendering) return;
    if (!consent) {
      toast.error("Enable local rendering first. Nothing is processed until you do.");
      return;
    }
    const check = checkStudioQuota(duration);
    setQuota(check);
    if (!check.allowed) {
      toast.error(check.message);
      return;
    }
    consumeStudioRender(duration);
    setQuota(checkStudioQuota(duration));
    const controller = new AbortController();
    abortRef.current = controller;
    setRendering(true);
    setProgress(0);
    setError("");
    setResult(null);
    clearVideo();
    setRenderedSignature(null);
    const id = newJobId();
    setJobId(id);
    const now = new Date().toISOString();
    setJobs(
      upsertJob({
        id,
        sourceId: script.sourceId,
        sourceKind: script.sourceKind,
        title: script.sourceTitle,
        status: "draft",
        createdAt: now,
        updatedAt: now,
        durationSeconds: duration,
        muted: true,
      }),
    );

    try {
      const output = await renderStudioVideo(script, {
        secondsPerSlide,
        signal: controller.signal,
        onProgress: setProgress,
      });
      setResult(output);
      const url = URL.createObjectURL(output.blob);
      setVideoUrl(url);
      setRenderedSignature(JSON.stringify(script));
      setJobs((current) => {
        const existing = current.find((job) => job.id === id);
        if (!existing) return current;
        const job: StudioJob = {
          ...existing,
          status: "rendered",
          updatedAt: new Date().toISOString(),
          sizeBytes: output.sizeBytes,
        };
        return upsertJob(job);
      });
      toast.success("Real WebM draft rendered on this device.");
    } catch (renderError) {
      const message =
        renderError instanceof DOMException && renderError.name === "AbortError"
          ? "Render cancelled."
          : renderError instanceof Error
            ? renderError.message
            : "The render failed.";
      setError(message);
      setJobs((current) => {
        const existing = current.find((job) => job.id === id);
        if (!existing) return current;
        return upsertJob({
          ...existing,
          status: "failed",
          updatedAt: new Date().toISOString(),
          error: message,
        });
      });
      if (!(renderError instanceof DOMException && renderError.name === "AbortError")) {
        toast.error(message);
      }
    } finally {
      setRendering(false);
      abortRef.current = null;
    }
  };

  const cancelRender = () => {
    abortRef.current?.abort();
  };

  const approve = () => {
    if (!script || !result || !canApprove) return;
    const existing = jobId ? loadJobs().find((job) => job.id === jobId) : undefined;
    if (existing) {
      setJobs(
        upsertJob({
          ...existing,
          status: "approved",
          updatedAt: new Date().toISOString(),
          sizeBytes: result.sizeBytes,
        }),
      );
    }
    toast.success("Draft approved locally. Export the package for publication review.");
  };

  const downloadVideo = () => {
    if (!result || !script) return;
    download(
      new Blob([result.blob], { type: result.mimeType }),
      `${slug(script.sourceTitle)}.webm`,
    );
  };

  const downloadVtt = () => {
    if (!result || !script) return;
    download(
      new Blob([result.vtt], { type: "text/vtt;charset=utf-8" }),
      `${slug(script.sourceTitle)}.vtt`,
    );
  };

  const downloadScript = () => {
    if (!script) return;
    download(
      new Blob([scriptToJson(script)], { type: "application/json" }),
      `${slug(script.sourceTitle)}-script.json`,
    );
  };

  const downloadPackage = () => {
    if (!script || !result) return;
    const payload = {
      format: "atlas-studio-package-v1",
      exportedAt: new Date().toISOString(),
      approved: canApprove,
      script,
      qc,
      checks,
      render: {
        mimeType: result.mimeType,
        durationMs: result.durationMs,
        sizeBytes: result.sizeBytes,
        muted: true,
        subtitles: "vtt",
      },
      publication:
        "Not published. Owner review and manual media upload are required before this draft can appear in Atlas.",
    };
    download(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
      `${slug(script.sourceTitle)}-package.json`,
    );
  };

  const shortOptions = STUDIO_SOURCES.filter((source) => source.kind === "short");
  const episodeOptions = STUDIO_SOURCES.filter((source) => source.kind === "episode");
  const renderDisabled = !script || rendering || !consent || !quota.allowed;

  return (
    <div className="min-h-dvh bg-page pb-24">
      <header className="flex items-center gap-3 border-b border-border/60 bg-background/70 px-3 py-3 backdrop-blur-xl">
        <Link
          to="/"
          aria-label="Back to Atlas"
          className="rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-xp shadow-glow">
          <Film className="size-5 text-primary-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold leading-tight">Atlas Studio</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Local video drafts · silent WebM + captions
          </p>
        </div>
        <span className="hidden items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-warning sm:flex">
          <Cpu className="size-3" /> On-device
        </span>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-4 px-3 py-4 sm:px-4">
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="space-y-1">
              <h1 className="font-display text-base font-bold">A real draft, not a fake render</h1>
              <p className="text-xs leading-relaxed text-muted-foreground">
                This desk turns an Atlas lesson into an editable script and records an actual
                captioned WebM in your browser. It is{" "}
                <strong className="text-foreground">silent</strong> — narration, source verification
                by an AI agent and automatic publishing are not connected. Nothing renders until you
                consent below, and nothing leaves this device.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold">1 · Choose a lesson</h2>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Script from lesson data
                </span>
              </div>
              <select
                value={sourceKeyValue}
                onChange={(event) => selectSource(event.target.value)}
                disabled={rendering}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground"
              >
                <optgroup label="Micro-lessons">
                  {shortOptions.map((source) => (
                    <option key={source.id} value={sourceKey("short", source.id)}>
                      {source.title} — {source.meta}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Deep dives">
                  {episodeOptions.map((source) => (
                    <option key={source.id} value={sourceKey("episode", source.id)}>
                      {source.title} — {source.meta}
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                The first draft is assembled deterministically from the lesson&apos;s existing hook,
                ideas and takeaways. It is not an AI-authored script.
              </p>
            </section>

            {script && (
              <section className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-display text-sm font-bold">2 · Edit the script</h2>
                  <button
                    type="button"
                    onClick={() => {
                      const fresh = buildStudioScript(script.sourceId, script.sourceKind);
                      if (fresh) replaceScript(fresh);
                    }}
                    disabled={rendering}
                    className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="size-3" /> Re-draft
                  </button>
                </div>
                <div className="space-y-3">
                  {script.slides.map((slide, index) => (
                    <div
                      key={`${script.sourceId}-${index}`}
                      className="rounded-xl border border-border/70 bg-background/60 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          Slide {index + 1}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          starts {formatStamp(index * secondsPerSlide).slice(3, 8)}
                        </span>
                      </div>
                      <label className="block text-[10px] font-semibold text-muted-foreground">
                        Heading
                        <input
                          value={slide.heading}
                          disabled={rendering}
                          onChange={(event) => editSlide(index, "heading", event.target.value)}
                          className="mt-1 h-8 w-full rounded-lg border border-border bg-card px-2 text-xs text-foreground"
                        />
                      </label>
                      <label className="mt-2 block text-[10px] font-semibold text-muted-foreground">
                        Body
                        <textarea
                          value={slide.body}
                          disabled={rendering}
                          rows={3}
                          onChange={(event) => editSlide(index, "body", event.target.value)}
                          className="mt-1 w-full resize-y rounded-lg border border-border bg-card px-2 py-1.5 text-xs leading-relaxed text-foreground"
                        />
                      </label>
                      <label className="mt-2 block text-[10px] font-semibold text-muted-foreground">
                        Caption
                        <input
                          value={slide.caption}
                          disabled={rendering}
                          onChange={(event) => editSlide(index, "caption", event.target.value)}
                          className="mt-1 h-8 w-full rounded-lg border border-border bg-card px-2 text-xs text-foreground"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {script && (
              <section className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-display text-sm font-bold">3 · Source references</h2>
                  <button
                    type="button"
                    onClick={addSource}
                    disabled={rendering}
                    className="rounded-lg bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"
                  >
                    + Add reference
                  </button>
                </div>
                {script.sources.length === 0 ? (
                  <p className="rounded-lg border border-warning/30 bg-warning/10 p-2 text-[10px] leading-relaxed text-warning">
                    No references are attached to this lesson. Add at least one checkable source
                    before treating the draft as publication-ready.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {script.sources.map((source, index) => (
                      <div key={`${source.url}-${index}`} className="flex items-start gap-2">
                        <div className="grid min-w-0 flex-1 gap-1.5">
                          <input
                            value={source.label}
                            disabled={rendering}
                            placeholder="Source label"
                            aria-label={`Source ${index + 1} label`}
                            onChange={(event) => editSource(index, "label", event.target.value)}
                            className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs"
                          />
                          <input
                            value={source.url}
                            disabled={rendering}
                            placeholder="https://…"
                            aria-label={`Source ${index + 1} URL`}
                            onChange={(event) => editSource(index, "url", event.target.value)}
                            className="h-8 w-full rounded-lg border border-border bg-background px-2 text-[11px] text-muted-foreground"
                          />
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove source ${index + 1}`}
                          onClick={() => removeSource(index)}
                          disabled={rendering}
                          className="mt-1 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="font-display text-sm font-bold">4 · Render & review</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-[10px] font-semibold text-muted-foreground">
                  Seconds per slide
                  <select
                    value={secondsPerSlide}
                    onChange={(event) => setSecondsPerSlide(Number(event.target.value))}
                    disabled={rendering}
                    className="mt-1 h-8 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground"
                  >
                    {[3, 4, 5, 6].map((seconds) => (
                      <option key={seconds} value={seconds}>
                        {seconds}s
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-lg bg-background/60 p-2">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    Draft length
                  </p>
                  <p className="font-display text-sm font-bold tabular-nums">
                    {duration}s · {script?.slides.length ?? 0} slides
                  </p>
                </div>
              </div>

              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-xl border border-border/70 bg-background/60 p-2.5 text-[11px]">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsentValue(event.target.checked)}
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                />
                <span>
                  I consent to local rendering on this device
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">
                    Uses this tab&apos;s CPU/GPU for the duration. Atlas never starts renders in the
                    background or for another user. Today: {quota.used}/{quota.limit} renders used.
                  </span>
                </span>
              </label>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void renderDraft()}
                  disabled={renderDisabled}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold transition-all active:scale-95",
                    renderDisabled
                      ? "cursor-not-allowed bg-secondary text-muted-foreground"
                      : "bg-gradient-xp text-primary-foreground shadow-glow",
                  )}
                >
                  {rendering ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  {rendering ? "Rendering locally…" : "Render real WebM"}
                </button>
                {rendering && (
                  <button
                    type="button"
                    onClick={cancelRender}
                    className="rounded-xl border border-border px-3 py-2 text-[11px] font-bold text-muted-foreground"
                  >
                    Cancel
                  </button>
                )}
                {!consent && (
                  <span className="text-[10px] text-muted-foreground">Consent required.</span>
                )}
              </div>

              {rendering && (
                <div className="mt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {Math.round(progress * 100)}% · real-time capture; keep this tab open.
                  </p>
                </div>
              )}

              {quota.remaining === 0 && (
                <p className="mt-2 rounded-lg border border-warning/30 bg-warning/10 p-2 text-[10px] leading-relaxed text-warning">
                  {quota.message}
                </p>
              )}
              {error && (
                <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-[10px] leading-relaxed text-destructive">
                  {error}
                </p>
              )}

              {videoUrl && result && script && (
                <div className="mt-3 space-y-2">
                  <video
                    controls
                    src={videoUrl}
                    className="aspect-video w-full rounded-xl border border-border bg-black"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={downloadVideo}
                      className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1.5 text-[10px] font-bold text-foreground"
                    >
                      <Download className="size-3" /> WebM
                    </button>
                    <button
                      type="button"
                      onClick={downloadVtt}
                      className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1.5 text-[10px] font-bold text-foreground"
                    >
                      <Download className="size-3" /> VTT
                    </button>
                    <button
                      type="button"
                      onClick={downloadScript}
                      className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1.5 text-[10px] font-bold text-foreground"
                    >
                      <Download className="size-3" /> Script JSON
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {result.mimeType} · {formatBytes(result.sizeBytes)} · {result.durationMs / 1000}
                    s · silent
                  </p>
                  {stale && (
                    <p className="rounded-lg border border-warning/30 bg-warning/10 p-2 text-[10px] text-warning">
                      The script changed after this render. Render again before approval.
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="font-display text-sm font-bold">Quality check</h2>
              <ul className="mt-2 space-y-1.5">
                {qc.map((check) => (
                  <li key={check.id} className="flex items-start gap-2 text-[11px]">
                    {check.status === "pass" ? (
                      <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    ) : check.status === "warn" ? (
                      <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
                    ) : (
                      <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                    )}
                    <span>
                      <strong className="font-bold">{check.label}</strong>{" "}
                      <span className="text-muted-foreground">{check.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t border-border/60 pt-2 text-[10px] leading-relaxed text-muted-foreground">
                Automated checks only inspect structure, copy length, sources and captions. They do
                not verify factual accuracy. Human review is required.
              </p>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="font-display text-sm font-bold">5 · Human approval</h2>
              <div className="mt-2 space-y-2">
                {(
                  [
                    ["sources", "Sources are attached and reachable"],
                    ["facts", "I checked every factual claim against the references"],
                    ["rights", "I have the rights to use this text and its imagery"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-start gap-2 text-[11px]">
                    <input
                      type="checkbox"
                      checked={checks[key]}
                      onChange={(event) =>
                        setChecks((current) => ({ ...current, [key]: event.target.checked }))
                      }
                      className="mt-0.5 size-4 accent-[var(--primary)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={approve}
                disabled={!canApprove}
                className={cn(
                  "mt-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold",
                  canApprove
                    ? "bg-success/15 text-success"
                    : "cursor-not-allowed bg-secondary text-muted-foreground",
                )}
              >
                <BadgeCheck className="size-4" /> Approve local draft
              </button>
              <button
                type="button"
                onClick={downloadPackage}
                disabled={!canApprove}
                className="ml-2 mt-3 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[11px] font-bold text-foreground disabled:opacity-50"
              >
                <Download className="size-4" /> Export approval package
              </button>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                Approval is stored on this device only. It does not publish anything.
              </p>
            </section>

            <section className="rounded-2xl border border-dashed border-border bg-background/40 p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <h2 className="text-xs font-bold">Publishing is not connected</h2>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    An approved draft can be downloaded as WebM + VTT + package JSON. Making it
                    public requires the owner to host the file and add a verified URL to{" "}
                    <code className="rounded bg-secondary px-1">EPISODE_VIDEO_SOURCES</code>. Atlas
                    will not mark a lesson playable without real media.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-bold">Local job history</h2>
            {jobs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm("Clear local studio job history? Downloaded files are kept.")
                  ) {
                    setJobs(clearJobs());
                  }
                }}
                className="text-[10px] font-semibold text-muted-foreground hover:text-destructive"
              >
                Clear history
              </button>
            )}
          </div>
          {jobs.length === 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              No jobs yet. Rendered metadata is stored on this device; video files are downloads,
              not uploaded.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border/60">
              {jobs.map((job) => (
                <li key={job.id} className="flex flex-wrap items-center gap-2 py-2 text-[11px]">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                      job.status === "approved"
                        ? "bg-success/15 text-success"
                        : job.status === "failed"
                          ? "bg-destructive/15 text-destructive"
                          : job.status === "rendered"
                            ? "bg-primary/15 text-primary"
                            : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {job.status}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{job.title}</span>
                  <span className="text-muted-foreground">
                    {job.durationSeconds}s ·{" "}
                    {job.sizeBytes ? formatBytes(job.sizeBytes) : "no file"}
                    {" · "}
                    {new Date(job.updatedAt).toLocaleString()}
                  </span>
                  {job.error && (
                    <span className="w-full text-[10px] text-destructive">{job.error}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">
            Video files are not persisted after a reload. Download a draft before closing the tab.
          </p>
        </section>
      </main>
    </div>
  );
}
