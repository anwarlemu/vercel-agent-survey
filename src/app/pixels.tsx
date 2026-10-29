"use client";

import { useEffect, useRef } from "react";

// A grid of small dots that drifts behind the page. A slow noise field decides
// which cells are lit and how bright; a second field tints some patches cyan.
// Kept faint so the grey copy stays readable. Redrawn at a stepped 12fps,
// which suits the retro look and keeps the cost low.

const CELL = 14;
const DOT = 4; // chunky square pixels
const FPS = 12;

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

const fbm = (x: number, y: number) =>
  noise(x, y) * 0.65 + noise(x * 2.1 + 9, y * 2.1 + 3) * 0.35;

export function Pixels() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = innerWidth;
      h = innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const cols = Math.ceil(w / CELL);
      const rows = Math.ceil(h / CELL);
      // Quiet zones over the text: strongest bottom left, milder elsewhere.
      const quiet = (nx: number, ny: number) => {
        const zone = (
          cx: number,
          cy: number,
          rx: number,
          ry: number,
          k: number,
        ) => {
          const d = Math.hypot((nx - cx) / rx, (ny - cy) / ry);
          return 1 - k * Math.max(0, 1 - d * d);
        };
        return (
          zone(0, 1, 0.55, 0.5, 0.95) *
          zone(0, 0, 0.45, 0.35, 0.7) *
          zone(1, 0, 0.4, 0.45, 0.7) *
          zone(1, 1, 0.3, 0.3, 0.7)
        );
      };
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const n = fbm(i * 0.08 + t * 0.06, j * 0.08 - t * 0.04);
          if (n < 0.5) continue;
          // Leave gaps inside the clusters, more toward their edges.
          if (hash(i * 3.1, j * 1.7) > 0.35 + (n - 0.5) * 1.6) continue;
          // Each dot breathes on its own rhythm.
          const k = hash(i, j);
          const pulse = 0.7 + 0.3 * Math.sin(t * (0.8 + k) + k * 20);
          const level =
            Math.min(1, (n - 0.5) / 0.35) *
            pulse *
            0.9 *
            quiet(i / cols, j / rows);
          if (level < 0.08) continue;
          const tint = fbm(i * 0.05 - t * 0.05 + 40, j * 0.05 + 20) > 0.72;
          // Four flat steps, no in-between tones, like a dimmed LED panel.
          const step = Math.min(3, Math.floor(level * 4));
          ctx.fillStyle = tint
            ? ["#133434", "#1a4a4a", "#226363", "#2a7c7c"][step]
            : ["#1b1b1b", "#242424", "#2e2e2e", "#3a3a3a"][step];
          ctx.fillRect(
            i * CELL + (CELL - DOT) / 2,
            j * CELL + (CELL - DOT) / 2,
            DOT,
            DOT,
          );
        }
      }
    };

    let raf = 0;
    let lastDraw = -Infinity;
    const start = performance.now();
    const loop = (now: number) => {
      if (now - lastDraw >= 1000 / FPS) {
        lastDraw = now;
        draw((now - start) / 1000);
      }
      raf = requestAnimationFrame(loop);
    };

    const onResize = () => {
      resize();
      draw(reduce ? 0 : (performance.now() - start) / 1000);
    };
    addEventListener("resize", onResize);

    draw(0);
    canvas.dataset.ready = "";
    if (!reduce) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="pixels" aria-hidden />;
}
