import type { StudioScript } from "./script";
import { buildVtt } from "./script";

export interface RenderOptions {
  secondsPerSlide: number;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export interface RenderResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  vtt: string;
  sizeBytes: number;
}

const WIDTH = 1280;
const HEIGHT = 720;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    const joined = lines.join(" ");
    if (joined.length < text.length) {
      let last = lines[maxLines - 1] ?? "";
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = `${last.trimEnd()}…`;
    }
  }
  return lines;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  script: StudioScript,
  secondsPerSlide: number,
  elapsedMs: number,
): void {
  const totalMs = script.slides.length * secondsPerSlide * 1000;
  const clamped = Math.max(0, Math.min(elapsedMs, totalMs - 1));
  const slideMs = secondsPerSlide * 1000;
  const index = Math.min(script.slides.length - 1, Math.floor(clamped / slideMs));
  const local = clamped - index * slideMs;
  const fadeIn = Math.min(1, local / 350);
  const fadeOut = Math.min(1, (slideMs - local) / 350);
  const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
  const slide = script.slides[index];
  if (!slide) return;

  ctx.globalAlpha = 1;
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, "#0a0d18");
  bg.addColorStop(0.55, "#10142a");
  bg.addColorStop(1, "#080a12");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(WIDTH - 120, 90, 20, WIDTH - 120, 90, 520);
  glow.addColorStop(0, `${script.accent}55`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(0, (1 - alpha) * 24);

  ctx.fillStyle = script.accent;
  ctx.fillRect(72, 64, 54, 5);

  ctx.font = "600 18px Manrope, system-ui, sans-serif";
  ctx.fillStyle = "#b9c0d4";
  ctx.letterSpacing = "4px";
  ctx.fillText("ATLAS", 140, 73);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#6f7891";
  ctx.font = "500 15px Manrope, system-ui, sans-serif";
  ctx.fillText("LOCAL VIDEO DRAFT · NO NARRATION", 220, 73);

  const headingFont = "600 64px Unbounded, Manrope, system-ui, sans-serif";
  ctx.font = headingFont;
  ctx.fillStyle = "#f7f8fc";
  const headingLines = wrapText(ctx, slide.heading, 1080, 2);
  headingLines.forEach((line, lineIndex) => {
    ctx.fillText(line, 72, 182 + lineIndex * 76);
  });

  ctx.font = "400 31px Manrope, system-ui, sans-serif";
  ctx.fillStyle = "#d5d9e6";
  const bodyLines = wrapText(ctx, slide.body, 1030, 4);
  const bodyTop = 330;
  bodyLines.forEach((line, lineIndex) => {
    ctx.fillText(line, 72, bodyTop + lineIndex * 47);
  });

  // Lower-third captions mirror the subtitle sidecar.
  ctx.fillStyle = "rgba(6, 8, 16, 0.72)";
  ctx.fillRect(56, 570, WIDTH - 112, 88);
  ctx.fillStyle = script.accent;
  ctx.fillRect(56, 570, 5, 88);
  ctx.font = "500 22px Manrope, system-ui, sans-serif";
  ctx.fillStyle = "#eef1f9";
  const caption = wrapText(ctx, slide.caption, WIDTH - 150, 2);
  caption.forEach((line, lineIndex) => {
    ctx.fillText(line, 82, 604 + lineIndex * 29);
  });

  ctx.font = "500 15px Manrope, system-ui, sans-serif";
  ctx.fillStyle = "#8b93a9";
  const sourceText = script.sources.length
    ? `Sources: ${script.sources
        .slice(0, 2)
        .map((source) => source.label)
        .join(" · ")}`
    : "No source references attached";
  ctx.fillText(sourceText.slice(0, 120), 72, 690);

  ctx.font = "600 14px Manrope, system-ui, sans-serif";
  ctx.fillStyle = "#6f7891";
  ctx.textAlign = "right";
  ctx.fillText(
    `${String(index + 1).padStart(2, "0")} / ${String(script.slides.length).padStart(2, "0")}`,
    WIDTH - 72,
    690,
  );
  ctx.textAlign = "left";

  const barWidth = WIDTH - 144;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(72, 704, barWidth, 3);
  ctx.fillStyle = script.accent;
  ctx.fillRect(72, 704, barWidth * Math.min(1, clamped / totalMs), 3);
  ctx.restore();
}

function supportedMimeType(): string {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const supported = candidates.find((type) => MediaRecorder.isTypeSupported(type));
  if (!supported) throw new Error("This browser cannot record WebM video.");
  return supported;
}

/**
 * Renders a silent visual draft entirely in this browser. No frames leave the
 * device. The output is a real WebM produced by MediaRecorder, not a mock.
 */
export async function renderStudioVideo(
  script: StudioScript,
  options: RenderOptions,
): Promise<RenderResult> {
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("Video rendering requires a browser with MediaRecorder support.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable in this browser.");
  if (typeof canvas.captureStream !== "function") {
    throw new Error("This browser cannot capture canvas frames for video.");
  }

  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => undefined);
  }

  const secondsPerSlide = Math.max(1, Math.min(15, options.secondsPerSlide));
  const totalMs = script.slides.length * secondsPerSlide * 1000;
  drawFrame(ctx, script, secondsPerSlide, 0);

  const mimeType = supportedMimeType();
  const stream = canvas.captureStream(30);
  const chunks: BlobPart[] = [];
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3_000_000 });
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("The browser's video recorder failed."));
    recorder.onstop = () => resolve();
  });

  const startedAt = performance.now();
  recorder.start(250);

  try {
    await new Promise<void>((resolve, reject) => {
      const tick = (now: number) => {
        if (options.signal?.aborted) {
          reject(new DOMException("Render cancelled.", "AbortError"));
          return;
        }
        const elapsed = Math.min(Math.max(0, now - startedAt), totalMs);
        drawFrame(ctx, script, secondsPerSlide, elapsed);
        options.onProgress?.(Math.min(1, elapsed / totalMs));
        if (elapsed >= totalMs) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  } catch (error) {
    if (recorder.state !== "inactive") recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }

  if (recorder.state !== "inactive") recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());

  const blob = new Blob(chunks, { type: mimeType.split(";")[0] ?? "video/webm" });
  if (blob.size === 0) {
    throw new Error("The recorder produced no video data. Try a Chromium browser.");
  }
  return {
    blob,
    mimeType,
    durationMs: totalMs,
    vtt: buildVtt(script, secondsPerSlide),
    sizeBytes: blob.size,
  };
}
