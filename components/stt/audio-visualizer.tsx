"use client";

import { useEffect, useRef } from "react";
import type { AudioVisualizerProps } from "@/lib/stt-types";

const BAR_COUNT = 32;
const BAR_GAP = 2;

export function AudioVisualizer({ isActive, analyserNode }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize to container
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const dataArray = analyserNode
      ? new Uint8Array(analyserNode.frequencyBinCount)
      : null;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      const barWidth = (w - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT;
      const centerY = h / 2;

      if (isActive && analyserNode && dataArray) {
        analyserNode.getByteFrequencyData(dataArray);

        for (let i = 0; i < BAR_COUNT; i++) {
          // Map bar index to frequency bin
          const binIndex = Math.floor(
            (i / BAR_COUNT) * analyserNode.frequencyBinCount
          );
          const value = dataArray[binIndex] / 255;
          const barH = Math.max(4, value * h * 0.8);

          const x = i * (barWidth + BAR_GAP);

          // Green accent with opacity based on amplitude
          const opacity = 0.3 + value * 0.7;
          ctx.fillStyle = `oklch(0.65 0.2 145 / ${opacity})`;
          ctx.beginPath();
          ctx.roundRect(x, centerY - barH / 2, barWidth, barH, 2);
          ctx.fill();
        }
      } else {
        // Idle — flat bars
        for (let i = 0; i < BAR_COUNT; i++) {
          const x = i * (barWidth + BAR_GAP);
          ctx.fillStyle = "oklch(0.30 0.01 260 / 0.5)";
          ctx.beginPath();
          ctx.roundRect(x, centerY - 2, barWidth, 4, 2);
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
    };
  }, [isActive, analyserNode]);

  return (
    <canvas
      ref={canvasRef}
      className="h-16 w-full"
      aria-hidden="true"
    />
  );
}
