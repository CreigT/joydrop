/**
 * Plays or records a card scene in the browser. Uses requestAnimationFrame
 * for drawing and (optionally) WebAudio for sound.
 */

import { generateCardAudio } from "./audio";
import { drawVideoFrame, type DrawOptions, type VideoScene } from "./draw";
import { CARD_HEIGHT, CARD_WIDTH, CARD_FPS } from "./types";
import { pickMimeType } from "./helpers";

export type RunAudio = {
  ctx: AudioContext;
  samples: Float32Array;
  /** Where the sound goes: ctx.destination (speakers) or a recording stream. */
  destination: AudioNode;
};

export type RunOptions = {
  canvas: HTMLCanvasElement;
  scene: VideoScene;
  draw?: DrawOptions;
  audio?: RunAudio;
  loop?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: number, seconds: number) => void;
};

export function sizeCanvas(canvas: HTMLCanvasElement, scale: number) {
  canvas.width = Math.round(CARD_WIDTH * scale);
  canvas.height = Math.round(CARD_HEIGHT * scale);
}

/** Draws frames until the card ends (or loops / aborts). */
export function runScene(options: RunOptions): Promise<"finished" | "aborted"> {
  const { canvas, scene, audio, signal } = options;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas is not available."));
  const duration = scene.timeline.duration;

  return new Promise((resolve) => {
    let source: AudioBufferSourceNode | null = null;
    let startedAt = 0;
    let frame = 0;
    let done = false;

    const clock = () =>
      audio ? audio.ctx.currentTime - startedAt : (performance.now() - startedAt) / 1000;

    const startClock = () => {
      if (audio) {
        const buffer = audio.ctx.createBuffer(1, audio.samples.length, audio.ctx.sampleRate);
        buffer.copyToChannel(audio.samples as Float32Array<ArrayBuffer>, 0);
        source = audio.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(audio.destination);
        startedAt = audio.ctx.currentTime + 0.05;
        source.start(startedAt);
      } else {
        startedAt = performance.now();
      }
    };

    const finish = (result: "finished" | "aborted") => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      try {
        source?.stop();
      } catch {
        /* already stopped */
      }
      signal?.removeEventListener("abort", onAbort);
      resolve(result);
    };
    const onAbort = () => finish("aborted");
    signal?.addEventListener("abort", onAbort);
    if (signal?.aborted) return finish("aborted");

    startClock();
    const tick = () => {
      if (done) return;
      let t = Math.max(0, clock());
      if (t >= duration) {
        if (options.loop) {
          try {
            source?.stop();
          } catch {
            /* ignore */
          }
          startClock();
          t = 0;
        } else {
          drawVideoFrame(ctx, scene, duration, {
            ...options.draw,
            scale: canvas.width / CARD_WIDTH
          });
          options.onProgress?.(1, duration);
          return finish("finished");
        }
      }
      drawVideoFrame(ctx, scene, t, { ...options.draw, scale: canvas.width / CARD_WIDTH });
      options.onProgress?.(t / duration, t);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  });
}

export function canRecordVideo(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function"
  );
}

export function recordingFormat() {
  if (typeof MediaRecorder === "undefined") return null;
  return pickMimeType((type) => MediaRecorder.isTypeSupported(type));
}

export type RecordOptions = {
  canvas: HTMLCanvasElement;
  scene: VideoScene;
  draw?: DrawOptions;
  includeSound?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
};

export type RecordedVideo = {
  blob: Blob;
  mimeType: string;
  extension: string;
};

/**
 * Records the scene to a video file in real time (about 14 seconds).
 * Prefers mp4 (h264), falls back to webm.
 */
export async function recordVideo(options: RecordOptions): Promise<RecordedVideo | null> {
  if (!canRecordVideo()) throw new Error("This browser can't make videos yet.");
  const format = recordingFormat();
  if (!format) throw new Error("This browser can't save videos yet.");

  const { canvas, scene } = options;
  const stream = canvas.captureStream(CARD_FPS);
  let audioCtx: AudioContext | null = null;
  let audio: RunAudio | undefined;

  if (options.includeSound !== false) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctor) {
      audioCtx = new Ctor();
      await audioCtx.resume();
      const destination = audioCtx.createMediaStreamDestination();
      destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      audio = {
        ctx: audioCtx,
        samples: generateCardAudio(scene.timeline.duration, audioCtx.sampleRate),
        destination
      };
    }
  }

  const bits = Math.round(
    (canvas.width * canvas.height) / (CARD_WIDTH * CARD_HEIGHT) * 6_000_000
  );
  const recorder = new MediaRecorder(stream, {
    mimeType: format.mimeType,
    videoBitsPerSecond: Math.max(2_500_000, bits),
    audioBitsPerSecond: 128_000
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(250);
  const result = await runScene({
    canvas,
    scene,
    draw: options.draw,
    audio,
    signal: options.signal,
    onProgress: options.onProgress
  });
  // Let the last frames and the audio tail flush.
  await new Promise((resolve) => setTimeout(resolve, 250));
  if (recorder.state !== "inactive") recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());
  await audioCtx?.close();

  if (result === "aborted") return null;
  const blob = new Blob(chunks, { type: format.mimeType.split(";")[0] });
  return { blob, mimeType: blob.type, extension: format.extension };
}

/** Saves the still card as a PNG blob. */
export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not save the picture."))), "image/png");
  });
}
