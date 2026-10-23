"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { generateCardAudio, resolveCard } from "@/lib/videoCard";
import { createVideoScene, drawVideoFrame, type VideoScene } from "@/lib/videoCard/draw";
import { runScene, sizeCanvas } from "@/lib/videoCard/player";
import { closingPreviewTime, stagePreviewTime } from "@/lib/videoCard/helpers";
import { primaryButton, secondaryButton } from "./shared";

/**
 * A little birthday card that plays ON SCREEN for the person whose Birthday
 * Bridge it is. It only plays in the browser: nothing is recorded, saved
 * or sent, and the sound only starts when the visitor taps the button.
 */
export function BirthdayCardPlayer({ name, makeCardHref }: { name: string; makeCardHref: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<VideoScene | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [playing, setPlaying] = useState(false);
  const [withSound, setWithSound] = useState(false);
  const card = useMemo(
    () =>
      resolveCard({
        type: "birthday",
        recipientName: name,
        subtitle: "Your friends are thinking of you today",
        senderName: "your friends"
      }),
    [name]
  );

  async function play(sound: boolean) {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    if (!canvas || !scene) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPlaying(true);
    setWithSound(sound);
    sizeCanvas(canvas, 0.4);
    let audio;
    let audioCtx: AudioContext | null = null;
    if (sound) {
      audioCtx = new AudioContext();
      await audioCtx.resume();
      audio = {
        ctx: audioCtx,
        samples: generateCardAudio(scene.timeline.duration, audioCtx.sampleRate),
        destination: audioCtx.destination
      };
    }
    await runScene({
      canvas,
      scene,
      draw: { watermark: "badge" },
      audio,
      signal: controller.signal
    });
    void audioCtx?.close();
    if (abortRef.current === controller) {
      abortRef.current = null;
      setPlaying(false);
      setWithSound(false);
      drawEnd();
    }
  }

  function drawEnd() {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !scene || !ctx) return;
    drawVideoFrame(ctx, scene, closingPreviewTime(scene.timeline), {
      scale: canvas.width / 1080,
      watermark: "badge"
    });
  }

  useEffect(() => {
    const scene = createVideoScene(card);
    sceneRef.current = scene;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      sizeCanvas(canvas, 0.4);
      drawVideoFrame(ctx, scene, stagePreviewTime(scene.timeline), {
        scale: canvas.width / 1080,
        watermark: "badge"
      });
    }
    // Autoplay (silent) unless the visitor asked their device for less motion.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) void play(false);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card]);

  return (
    <section
      aria-labelledby="bridge-card-heading"
      className="rounded-2xl bg-white/90 p-5 shadow-xl ring-1 ring-white/80"
    >
      <h2 className="font-heading text-2xl font-black text-[#30273A]" id="bridge-card-heading">
        Your birthday card
      </h2>
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <canvas
          aria-label={`Animated birthday card for ${name}`}
          className="max-h-[60vh] w-auto max-w-full rounded-2xl bg-[#08103c] shadow-lg"
          ref={canvasRef}
          role="img"
          style={{ aspectRatio: "1080 / 1920", maxWidth: 270 }}
        />
        <div className="grid gap-3">
          <p className="text-sm font-semibold text-[#463B52]">
            A little celebration from JoyDrop. It plays right here on your screen. Tap to hear
            the music.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              className={primaryButton}
              disabled={playing && withSound}
              onClick={() => void play(true)}
              type="button"
            >
              {playing && withSound ? "Playing..." : "Play with sound"}
            </button>
            <button
              className={secondaryButton}
              disabled={playing}
              onClick={() => void play(false)}
              type="button"
            >
              Replay
            </button>
          </div>
          <Link className="text-sm font-black text-primary underline" href={makeCardHref}>
            Make a video card for someone
          </Link>
        </div>
      </div>
    </section>
  );
}
