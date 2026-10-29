"use client";

import { useEffect, useState } from "react";

// A boot screen in the room's own style: a blinking robot head, a stepped
// block progress bar and a one-line status. It is server-rendered and runs
// entirely on CSS animations, so it starts at first paint and is gone 420ms
// later whether or not JavaScript has loaded yet. React only removes it from
// the DOM afterwards. Reduced motion hides it entirely (see globals.css).

export const BOOT_STEPS = 6;

const HEAD = [
  "....a....",
  "....o....",
  ".ooooooo.",
  "obbbbbbso",
  "obEbbEbso",
  "obbbbbbso",
  ".ooooooo.",
];

const FILL: Record<string, string> = {
  o: "#0a0a0a",
  b: "#ededed",
  s: "#98a0a4",
  E: "#6ff6f6",
  a: "#6ff6f6",
};

export function Boot() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setGone(true), 700);
    return () => clearTimeout(id);
  }, []);

  if (gone) return null;

  return (
    <div className="boot" aria-hidden>
      <svg className="boot-head" viewBox="0 0 9 7" shapeRendering="crispEdges">
        {HEAD.map((row, y) =>
          [...row].map((k, x) =>
            k === "." ? null : (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={1}
                height={1}
                className={k === "E" ? "boot-eye" : k === "a" ? "boot-ant" : undefined}
                fill={FILL[k]}
              />
            ),
          ),
        )}
      </svg>
      <div className="boot-bar">
        {Array.from({ length: BOOT_STEPS }, (_, i) => (
          <span key={i} style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
      <p className="boot-text">
        <span className="boot-busy">booting…</span>
        <span className="boot-ready">ready</span>
      </p>
    </div>
  );
}
