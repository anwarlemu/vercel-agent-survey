"use client";

import { useEffect, useRef } from "react";
import { startRoom } from "./room-engine";

// An isometric robot lab, drawn procedurally at low resolution and scaled up
// with hard edges. Everything happens in `startRoom`; this component only
// owns the canvas.
export function Room() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => startRoom(ref.current!), []);

  return (
    <canvas
      ref={ref}
      className="room"
      role="img"
      aria-label="A pixel-art room where small robots type at desks, play games and tend a plant"
    />
  );
}
