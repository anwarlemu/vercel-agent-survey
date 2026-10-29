"use client";

import { useState } from "react";
import { questions } from "./questions";

// All 26 questions on one slow belt along the bottom edge. The list is doubled
// so the loop is seamless: the belt moves by exactly half its width. Hovering
// a question pauses the belt and shows what it asks in a label above the
// strip, positioned under the pointer so it never touches the belt's layout.
export function Ticker() {
  const [hover, setHover] = useState<{ i: number; x: number } | null>(null);

  const list = (hidden: boolean) => (
    <ol aria-hidden={hidden || undefined}>
      {questions.map((q, i) => (
        <li
          key={q.title}
          className="ticker-q"
          tabIndex={hidden ? -1 : 0}
          onPointerEnter={(e) =>
            setHover({ i, x: e.currentTarget.getBoundingClientRect().left })
          }
          onFocus={(e) =>
            setHover({ i, x: e.currentTarget.getBoundingClientRect().left })
          }
          onPointerLeave={() => setHover(null)}
          onBlur={() => setHover(null)}
        >
          <span className="n">{String(i + 1).padStart(2, "0")}</span>
          <span>{q.title}</span>
        </li>
      ))}
    </ol>
  );

  return (
    <aside
      className="ticker"
      aria-label="The 26 questions"
      data-paused={hover ? "" : undefined}
    >
      <div className="ticker-clip">
        <div className="ticker-belt">
          {list(false)}
          {list(true)}
        </div>
      </div>
      {hover && (
        <div
          className="ticker-label"
          role="tooltip"
          style={{ left: Math.max(16, hover.x + 28) }}
        >
          {questions[hover.i].body}
        </div>
      )}
    </aside>
  );
}
