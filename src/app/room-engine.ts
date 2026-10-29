// The room's engine: geometry, sprites, the robots' behaviour, drawing and
// pointer handling. `startRoom` takes a canvas, runs the animation loop on
// it and returns a function that stops everything and removes listeners.

// An isometric robot lab, drawn procedurally at low resolution and scaled up
// with hard edges, so every shape lands on one pixel grid. Polygons are filled
// with our own scanline fill (no antialiasing); faces get pixel content via
// small per-face grids. Six robots wander between stations: desks, a TV with
// pong, an arcade cabinet, a server rack, a vending machine, a plant, the rug.

// Geometry, in tiles (TW×TH px per tile) and px for heights.
const TW = 16;
const TH = 8;
const RW = 10; // room size along x
const RD = 8; // room size along y
const WALL = 60;
const T = 0.4; // wall thickness
const SLAB = 5;
// The room's own size and origin. On wide screens the canvas covers the whole
// viewport with the room centred, so a robot can be carried anywhere.
const ROX = Math.ceil((RD + T) * (TW / 2)) + 2;
const ROY = WALL + Math.ceil(2 * T * (TH / 2)) + 2;
const RW_PX = Math.ceil((RW + RD + 2 * T) * (TW / 2)) + 4;
const RH_PX = ROY + (RW + RD) * (TH / 2) + SLAB + 3;

const C = {
  floorA: "#161616",
  floorB: "#111111",
  seam: "#0d0d0d",
  floorEdge: "#262626",
  slabL: "#0c0c0c",
  slabR: "#080808",
  wallR: "#1e1e1e",
  wallL: "#181818",
  seamWall: "#151515",
  base: "#101010",
  cap: "#2c2c2c",
  capEdge: "#3d3d3d",
  wallEnd: "#0f0f0f",
  woodT: "#4a4a4a",
  woodL: "#3a3a3a",
  woodR: "#2c2c2c",
  woodE: "#5e5e5e",
  metalT: "#5a5a5a",
  metalL: "#474747",
  metalR: "#353535",
  metalE: "#707070",
  case: "#202020",
  caseL: "#1a1a1a",
  caseR: "#141414",
  dark: "#0a0a0a",
  screenOff: "#121212",
  screen: "#0f1c1c",
  cyan: "#6ff6f6",
  cyanDim: "#2f8f93",
  white: "#ededed",
  light: "#b5b5b5",
  mid: "#8f8f8f",
  grey: "#5a5a5a",
  rugA: "#1a1a1a",
  rugB: "#222222",
  rugEdge: "#2e2e2e",
  leaf: "#8f8f8f",
  leafL: "#b5b5b5",
  leafD: "#5a5a5a",
  potT: "#3a3a3a",
  potL: "#2e2e2e",
  potR: "#222222",
  bot: "#ededed",
  botS: "#98a0a4",
  botD: "#5d6468",
  botO: "#0a0a0a",
  sky: "#0e0e0e",
  star: "#ededed",
  moon: "#ededed",
  beanT: "#3a3a3a",
  beanL: "#2e2e2e",
  beanR: "#222222",
  cabT: "#2a2a2a",
  cabL: "#202020",
  cabR: "#161616",
  vendT: "#333333",
  vendL: "#282828",
  vendR: "#1e1e1e",
  lamp: "#ededed",
  shadow: "#070707",
};

type Dir = "px" | "nx" | "py" | "ny";
type Pose =
  | "type"
  | "game"
  | "arcade"
  | "coffee"
  | "inspect"
  | "water"
  | "idle"
  | "dance";
type Slot = {
  id: string;
  x: number;
  y: number;
  face: Dir;
  pose: Pose;
  sit?: boolean;
  min: number;
  max: number;
};

const SLOTS: Slot[] = [
  {
    id: "deskA",
    x: 3.0,
    y: 1.6,
    face: "ny",
    pose: "type",
    sit: true,
    min: 9,
    max: 16,
  },
  {
    id: "deskB",
    x: 5.7,
    y: 1.6,
    face: "ny",
    pose: "type",
    sit: true,
    min: 9,
    max: 16,
  },
  { id: "server", x: 0.8, y: 1.4, face: "ny", pose: "inspect", min: 4, max: 8 },
  { id: "vend", x: 7.45, y: 1.6, face: "ny", pose: "coffee", min: 3, max: 6 },
  {
    id: "tv",
    x: 2.3,
    y: 5.3,
    face: "nx",
    pose: "game",
    sit: true,
    min: 9,
    max: 15,
  },
  { id: "arcade", x: 8.7, y: 1.7, face: "ny", pose: "arcade", min: 6, max: 12 },
  { id: "plant", x: 1.45, y: 6.5, face: "nx", pose: "water", min: 3, max: 6 },
  { id: "rug", x: 5.3, y: 4.7, face: "py", pose: "dance", min: 4, max: 8 },
  { id: "corner", x: 8.2, y: 6.0, face: "px", pose: "idle", min: 3, max: 7 },
];
const AISLE = 3.7;
const CHEST = [C.cyan, C.white, C.cyan, C.white, C.cyan, C.white];

type Bot = {
  x: number;
  y: number;
  path: [number, number][];
  slot: Slot;
  arrived: boolean;
  timer: number;
  face: Dir;
  phase: number;
  chest: string;
  icon: { kind: string; until: number } | null;
  nextIcon: number;
  // Interaction: held by the cursor, falling after a drop, dizzy on landing,
  // or hopping after a tap. `loose` means it has no station to go back to.
  held: boolean;
  loose: boolean;
  lift: number;
  vy: number;
  dizzyUntil: number;
  jumpAt: number;
  rect: [number, number, number, number];
  // Screen offset between the cursor and the feet while held.
  grab: [number, number];
  // Flying back into the room after a drop outside it.
  back: { from: [number, number]; to: [number, number]; at: number } | null;
  // Easter eggs.
  taps: number[]; // recent tap times, for the breakdance
  spinUntil: number; // breakdancing
  sneezeAt: number; // shook too hard
  shakes: number; // direction changes while held
  lastDx: number;
  rider: Bot | null; // someone on these shoulders
  riding: Bot | null; // the one being ridden
  rideUntil: number;
  cheerUntil: number; // dropped on the TV
};

// Robot, 9 px wide. a antenna tip, o outline, b body, s shade, d dark, c chest.
const HEAD_FRONT = [
  "....a....",
  "....o....",
  ".ooooooo.",
  "obbbbbbso",
  "obbbbbbso",
  "obbbbbbso",
  ".ooooooo.",
];
const HEAD_BACK = [
  "....a....",
  "....o....",
  ".ooooooo.",
  "obbbbbbso",
  "obbsssbso",
  "obbbbbbso",
  ".ooooooo.",
];
const BODY_FRONT = [
  "...oso...",
  ".ooooooo.",
  ".obbcbso.",
  ".obbbbso.",
  ".ooooooo.",
];
const BODY_BACK = [
  "...oso...",
  ".ooooooo.",
  ".obdddso.",
  ".obbbbso.",
  ".ooooooo.",
];
const LEGS = [
  ["..oo.oo..", "..oo.oo.."],
  ["..oo.oo..", "..oo..oo."],
  ["..oo.oo..", ".oo..oo.."],
];

const HOLD_LIFT = 8;

const ICONS: Record<string, [string, string[]]> = {
  sweat: [C.cyan, ["..x..", ".x.x.", "x...x", "x...x", ".xxx."]],
  spiral: [C.white, [".xxx.", "x...x", "x.x.x", "x..x.", ".xx.."]],
  star: [C.cyan, ["..x..", ".xxx.", "xxxxx", ".xxx.", "..x.."]],
  zz: [C.mid, ["xxx..", "..x..", ".x...", "xxx..", "....."]],
  heart: [C.white, [".x.x.", "xxxxx", "xxxxx", ".xxx.", "..x.."]],
  bang: [C.white, ["..x..", "..x..", "..x..", ".....", "..x.."]],
  q: [C.cyan, [".xxx.", "...x.", "..x..", ".....", "..x.."]],
  note: [C.cyan, ["..xx.", "..x.x", "..x..", "xxx..", "xx..."]],
  dots: [C.bot, [".....", ".....", "x.x.x", ".....", "....."]],
  bolt: [C.cyan, ["..xx.", ".xx..", "xxxx.", "..xx.", ".xx.."]],
};
const POSE_ICON: Record<Pose, string> = {
  type: "dots",
  game: "heart",
  arcade: "bang",
  coffee: "bolt",
  inspect: "bang",
  water: "note",
  idle: "q",
  dance: "note",
};

// Guillermo's avatar, 56×36, six greys, framed on the left wall.
const PHOTO = [
  "44454443334444444444432222111000012444444444443344444344",
  "22354444333444444444322211111100000124434444443344444444",
  "00011223323354443444211000000000000001444444444344443444",
  "00111110122244434343211100000000000000134444444344444444",
  "00111100001224444432222222211000000000002444444444444444",
  "01110000001112444333553333322110000000000244455444443444",
  "00111111012211445345554333322221100000000024454445554444",
  "00111111121111344445544333322222110000000002554345554344",
  "10011111110000344445444333332222210000000001454345555444",
  "12111100111000344454444333333222210000000000355445555444",
  "21000000001211444444444333333222211000000000255445554444",
  "11000110000222444444443333333222211000000000145544554444",
  "11112210000111443333333333333322210000000000035554555544",
  "22223332100001421133221111222322210000000000024554455544",
  "22222333220001311123321112222222221000000000014554555544",
  "32211123332101211124322111222223221000000000004555455454",
  "12210022221110000144332221122233321100000000014555555555",
  "11100122210220012443333322222333332100000000035555555555",
  "21100222310112113433334433333333332100000000035555555555",
  "11111112110011134333334444443333332100000110035555555555",
  "10100111012000243333334444444333333101112221145555555555",
  "10110111102100322112334444444433333112222221245555555555",
  "21332012200101322101233333334333333233222322255555555555",
  "21343113200101222101233333333333333333322331355555555555",
  "31433124310101222211222333333333333333332322444554555555",
  "42333124321000222222211223333333333333333312533454555555",
  "42333123321100112222111223333333333333333103432343455555",
  "32233223321000343333322233333333333333331014322333455555",
  "32233223320000333223333333333333333222220023211333455555",
  "32343334320001332223333333333333322232320133222233445544",
  "33443344320131344334333333333332222333320133212222344544",
  "33443344320232354444333333332222223332100002221111124544",
  "44443343330232344443332233322111123210000000100011002444",
  "44433343331232232322222222211001232110000000000011000355",
  "44343343332232111111111110000012311100001101100000000144",
  "44443333333333013110000000001123211000022100000000000034",
];
const GREYS = [
  "#0a0a0a",
  "#2a2a2a",
  "#5a5a5a",
  "#8f8f8f",
  "#b5b5b5",
  "#ededed",
];

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export function startRoom(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d")!;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = RW_PX;
  let H = RH_PX;
  let OX = ROX;
  let OY = ROY;
  const fit = () => {
    const narrow = innerWidth <= 860;
    const s = narrow
      ? Math.max(2, Math.floor((innerWidth - 32) / RW_PX))
      : Math.max(
          2,
          Math.floor(
            Math.min((innerWidth * 0.42) / RW_PX, (innerHeight * 0.6) / RH_PX),
          ),
        );
    if (narrow) {
      W = RW_PX;
      H = RH_PX;
      OX = ROX;
      OY = ROY;
    } else {
      W = Math.ceil(innerWidth / s);
      H = Math.ceil(innerHeight / s);
      OX = Math.floor((W - RW_PX) / 2) + ROX;
      OY = Math.floor((H - RH_PX) / 2) + ROY;
    }
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${W * s}px`;
    canvas.style.height = `${H * s}px`;
  };
  fit();

  // ---- primitives -------------------------------------------------------

  const P = (x: number, y: number, z = 0): [number, number] => [
    Math.round(OX + (x - y) * (TW / 2)),
    Math.round(OY + (x + y) * (TH / 2) - z),
  ];

  const dot = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };

  // Scanline fill, sampled at pixel centres, spans rounded: crisp edges that
  // tile with their neighbours.
  const poly = (pts: [number, number][], fill: string | CanvasPattern) => {
    ctx.fillStyle = fill;
    const ys = pts.map((p) => p[1]);
    const y0 = Math.floor(Math.min(...ys));
    const y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y < y1; y++) {
      const yy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) {
          xs.push(a[0] + ((yy - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const l = Math.round(xs[i]);
        const r = Math.round(xs[i + 1]);
        if (r > l) ctx.fillRect(l, y, r - l, 1);
      }
    }
  };

  const line = (a: [number, number], b: [number, number], c: string) => {
    let [x0, y0] = a;
    const [x1, y1] = b;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    ctx.fillStyle = c;
    for (;;) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  };

  type Cols = { t: string; l: string; r: string; e?: string };
  // Cuboid: top, the +y face (lighter) and the +x face (darker), with a
  // highlight on the top's front edges.
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    h: number,
    c: Cols,
  ) => {
    poly(
      [
        P(x, y + d, z),
        P(x + w, y + d, z),
        P(x + w, y + d, z + h),
        P(x, y + d, z + h),
      ],
      c.l,
    );
    poly(
      [
        P(x + w, y, z),
        P(x + w, y + d, z),
        P(x + w, y + d, z + h),
        P(x + w, y, z + h),
      ],
      c.r,
    );
    poly(
      [
        P(x, y, z + h),
        P(x + w, y, z + h),
        P(x + w, y + d, z + h),
        P(x, y + d, z + h),
      ],
      c.t,
    );
    if (c.e) {
      line(P(x, y + d, z + h), P(x + w, y + d, z + h), c.e);
      line(P(x + w, y, z + h), P(x + w, y + d, z + h), c.e);
    }
  };

  const WOOD = { t: C.woodT, l: C.woodL, r: C.woodR, e: C.woodE };
  const METAL = { t: C.metalT, l: C.metalL, r: C.metalR, e: C.metalE };
  const CASE = { t: C.metalL, l: C.case, r: C.caseR, e: C.metalR };

  // Pixel grids on faces. u runs left→right on screen, v runs up.
  // Face of constant y (seen as the lower-left face), starting at x = xa.
  const faceX = (xa: number, y: number, z: number) => {
    const [sx, sy] = P(xa, y, z);
    return (u: number, v: number, c: string) =>
      dot(sx + u, sy + Math.floor(u / 2) - 1 - v, c);
  };
  // Face of constant x (seen as the lower-right face), from its left end y = yb.
  const faceY = (yb: number, x: number, z: number) => {
    const [sx, sy] = P(x, yb, z);
    return (u: number, v: number, c: string) =>
      dot(sx + u, sy - Math.ceil(u / 2) - 1 - v, c);
  };

  // Ordered-dither patterns for light pools.
  const dither = (c: string, keep: number) => {
    const p = document.createElement("canvas");
    p.width = p.height = 4;
    const g = p.getContext("2d")!;
    const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    g.fillStyle = c;
    B.forEach(
      (v, i) =>
        (v + 0.5) / 16 < keep && g.fillRect(i % 4, Math.floor(i / 4), 1, 1),
    );
    return ctx.createPattern(p, "repeat")!;
  };
  const glowCyan = dither("#1f3f47", 0.5);
  const glowWarm = dither("#2a2a2a", 0.38);

  const sprite = (
    rows: string[],
    left: number,
    top: number,
    map: Record<string, string>,
  ) => {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = map[row[i]];
        if (c) dot(left + i, top + j, c);
      }
    });
  };

  // ---- robots -----------------------------------------------------------

  const bots: Bot[] = [];
  const taken = new Set<string>();
  const start = [0, 1, 4, 5, 2, 7];
  start.forEach((si, i) => {
    const s = SLOTS[si];
    taken.add(s.id);
    bots.push({
      x: s.x,
      y: s.y,
      path: [],
      slot: s,
      arrived: true,
      timer: s.min + hash(i + 1) * (s.max - s.min),
      face: s.face,
      phase: hash(i * 7 + 3),
      chest: CHEST[i],
      icon: null,
      nextIcon: 2 + hash(i * 13) * 5,
      held: false,
      loose: false,
      lift: 0,
      vy: 0,
      dizzyUntil: -1,
      jumpAt: -10,
      rect: [0, 0, 0, 0],
      grab: [0, 0],
      back: null,
      taps: [],
      spinUntil: -1,
      sneezeAt: -10,
      shakes: 0,
      lastDx: 0,
      rider: null,
      riding: null,
      rideUntil: -1,
      cheerUntil: -1,
    });
  });

  const occupied = (id: string) =>
    bots.find((b) => b.slot.id === id && b.arrived);

  // Pick a free station and plan the walk there along the aisle.
  const pickNext = (b: Bot) => {
    const free = SLOTS.filter((s) => !taken.has(s.id));
    if (!free.length) {
      b.timer = 2;
      return;
    }
    const next = free[Math.floor(Math.random() * free.length)];
    taken.delete(b.slot.id);
    taken.add(next.id);
    b.slot = next;
    b.arrived = false;
    b.loose = false;
    b.icon = null;
    const pts: [number, number][] = [];
    if (Math.abs(b.y - AISLE) > 0.05) pts.push([b.x, AISLE]);
    pts.push([next.x, AISLE], [next.x, next.y]);
    b.path = pts;
  };

  // Sparks and confetti from the eggs.
  type Spark = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    until: number;
    c: string;
  };
  const sparks: Spark[] = [];
  const burst = (sx: number, sy: number, n: number, c: string, t: number) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 20 + Math.random() * 40;
      sparks.push({
        x: sx,
        y: sy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 30,
        until: t + 0.5 + Math.random() * 0.5,
        c,
      });
    }
  };

  let partyUntil = -1;
  let tvMatchUntil = -1;

  const step = (dt: number, t: number) => {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const k = sparks[i];
      k.vy += 120 * dt;
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      if (t > k.until) sparks.splice(i, 1);
    }
    for (const b of bots) {
      if (b.riding) {
        // On someone's shoulders: go where they go.
        b.x = b.riding.x;
        b.y = b.riding.y;
        if (t > b.rideUntil || b.riding.held) {
          // Hop off to one side, so the landing doesn't climb back on.
          b.x = Math.max(
            0.4,
            Math.min(RW - 0.4, b.x + (b.x < RW / 2 ? 0.8 : -0.8)),
          );
          b.riding.rider = null;
          b.riding = null;
          b.lift = 10;
          b.vy = 0;
        }
        continue;
      }
      if (b.held) continue;
      if (b.spinUntil > t || b.cheerUntil > t) continue;
      if (b.back) {
        // Dropped outside: fly back to the nearest spot inside, then fall.
        const k = Math.min(1, (t - b.back.at) / 0.35);
        const e = 1 - (1 - k) ** 3;
        b.x = b.back.from[0] + (b.back.to[0] - b.back.from[0]) * e;
        b.y = b.back.from[1] + (b.back.to[1] - b.back.from[1]) * e;
        if (k >= 1) b.back = null;
        continue;
      }
      if (b.lift > 0) {
        // Falling after a drop.
        b.vy += 160 * dt;
        b.lift -= b.vy * dt;
        if (b.lift <= 0) {
          b.lift = 0;
          b.vy = 0;
          // Landed on the TV: a cheer, and the screen starts a match.
          if (b.x < 1.2 && b.y > 4.3 && b.y < 6.1) {
            b.x = 1.45;
            b.y = 5.2;
            b.face = "nx";
            b.cheerUntil = t + 6;
            tvMatchUntil = t + 6;
            b.icon = { kind: "heart", until: t + 6 };
            burst(...P(b.x, b.y, 14), 14, C.cyan, t);
            continue;
          }
          // Landed on another robot: climb onto its shoulders for a bit.
          const under = bots.find(
            (o) =>
              o !== b &&
              !o.held &&
              !o.riding &&
              !o.rider &&
              o.lift === 0 &&
              Math.hypot(o.x - b.x, o.y - b.y) < 0.55,
          );
          if (under) {
            b.riding = under;
            under.rider = b;
            b.rideUntil = t + 5 + Math.random() * 4;
            b.icon = { kind: "star", until: t + 1.5 };
            under.icon = { kind: "bang", until: t + 1.5 };
            continue;
          }
          // Shaken robots land with a long spiral; the rest shake it off fast.
          if (b.icon?.kind === "spiral") {
            b.dizzyUntil = t + 3;
            b.icon.until = t + 3;
          } else {
            b.dizzyUntil = t + 1.1;
            b.icon = { kind: "q", until: t + 1.1 };
          }
        }
        continue;
      }
      if (b.loose) {
        if (t > b.dizzyUntil) pickNext(b);
        continue;
      }
      if (b.path.length) {
        const [tx, ty] = b.path[0];
        const dx = tx - b.x;
        const dy = ty - b.y;
        const dist = Math.hypot(dx, dy);
        const move = 1.3 * dt;
        if (Math.abs(dx) > Math.abs(dy)) b.face = dx > 0 ? "px" : "nx";
        else if (dy !== 0) b.face = dy > 0 ? "py" : "ny";
        if (dist <= move) {
          b.x = tx;
          b.y = ty;
          b.path.shift();
          if (!b.path.length) {
            b.arrived = true;
            b.face = b.slot.face;
            b.timer = b.slot.min + Math.random() * (b.slot.max - b.slot.min);
          }
        } else {
          b.x += (dx / dist) * move;
          b.y += (dy / dist) * move;
        }
        continue;
      }
      b.timer -= dt;
      if (t > b.nextIcon) {
        b.icon = { kind: POSE_ICON[b.slot.pose], until: t + 1.6 };
        b.nextIcon = t + 4 + Math.random() * 6;
      }
      if (b.timer <= 0) pickNext(b);
    }
  };

  const drawBot = (b: Bot, t: number) => {
    const walking = b.path.length > 0;
    const falling = !b.held && b.lift > 0;
    const dizzy = !b.held && !falling && b.loose && t < b.dizzyUntil;
    const spinning = !b.held && t < b.spinUntil;
    const cheering = !b.held && t < b.cheerUntil;
    const party = !b.held && !falling && !spinning && t < partyUntil;
    const sit = !walking && !b.held && !b.loose && !party && b.slot.sit;
    const pose: Pose | "walk" | "held" | "fall" | "dizzy" | "spin" = b.held
      ? "held"
      : falling
        ? "fall"
        : spinning
          ? "spin"
          : cheering || party
            ? "dance"
            : dizzy
              ? "dizzy"
              : walking
                ? "walk"
                : b.loose || b.riding
                  ? "idle"
                  : b.slot.pose;
    const [fx, fy] = P(b.x, b.y);
    const back =
      !b.held &&
      !falling &&
      !dizzy &&
      !party &&
      !spinning &&
      (b.face === "nx" || b.face === "ny");
    const tick = Math.floor(t * 6 + b.phase * 6);
    const alt = tick % 2;
    const fast = Math.floor(t * 14) % 2; // panic rate
    const bob = pose === "dance" ? alt : walking ? alt : 0;
    const height = sit ? 12 : 14;
    // A tap makes the robot hop.
    const hopT = t - b.jumpAt;
    const hop =
      hopT < 0.4 ? Math.round(5 * Math.sin((hopT / 0.4) * Math.PI)) : 0;
    // Riders sit on the shoulders of the robot beneath them.
    const ride = b.riding
      ? 12 +
        Math.round(b.riding.lift) +
        (b.riding.slot.sit && b.riding.arrived && !b.riding.loose ? 6 : 0)
      : 0;
    const partyHop = party
      ? Math.abs(Math.round(Math.sin(t * 9 + b.phase * 6) * 3))
      : 0;
    const lift = (sit ? 6 : 0) + Math.round(b.lift) + hop + ride + partyHop;
    const shake = b.held ? (fast ? 1 : -1) : dizzy ? (alt ? 1 : -1) : 0;
    const top = fy - height - lift - bob;
    const left = fx - 4 + shake;

    if (spinning) {
      // Headspin: upside down, rotating through four frames, sparks flying.
      const f = Math.floor(t * 10) % 4;
      const map = {
        a: C.cyan,
        o: C.botO,
        b: C.bot,
        s: C.botS,
        d: C.botD,
        c: b.chest,
      };
      ctx.fillStyle = C.shadow;
      ctx.fillRect(fx - 3, fy - 1, 7, 2);
      ctx.save();
      ctx.translate(fx, fy - 7);
      ctx.scale(f === 1 || f === 3 ? 0.4 : 1, -1);
      if (f === 2) ctx.scale(-1, 1);
      sprite(HEAD_FRONT, -4, -7, map);
      sprite(BODY_FRONT, -4, 0, map);
      sprite(LEGS[1 + (f % 2)], -4, 5, map);
      ctx.restore();
      dot(fx - 6 + (f % 2) * 12, fy - 10 + f, C.cyan);
      dot(fx + 6 - (f % 2) * 12, fy - 4 - f, C.cyan);
      b.rect = [fx - 5, fy - 15, 11, 16];
      return;
    }

    if (!sit) {
      // Shadow stays on the floor and shrinks as the robot rises.
      const sw = Math.max(3, 7 - Math.round(lift / 4));
      ctx.fillStyle = C.shadow;
      ctx.fillRect(fx - Math.floor(sw / 2), fy - 1, sw, 2);
    }

    const antenna =
      Math.floor(t * 1.5 + b.phase * 3) % 3 === 0 ? C.cyan : C.botD;
    const map = {
      a: antenna,
      o: C.botO,
      b: C.bot,
      s: C.botS,
      d: C.botD,
      c: b.chest,
    };
    sprite(back ? HEAD_BACK : HEAD_FRONT, left, top, map);
    sprite(back ? BODY_BACK : BODY_FRONT, left, top + 7, map);
    const legs = b.held ? LEGS[1 + fast] : walking ? LEGS[1 + alt] : LEGS[0];
    if (!sit) sprite(legs, left, top + 12, map);

    // Eyes look the way the robot faces; blink now and then. Wide when scared.
    if (!back) {
      const blink = !b.held && !falling && (t + b.phase * 5) % 4 < 0.12;
      const shift = b.face === "px" ? 1 : b.face === "nx" ? -1 : 0;
      if (b.held || falling) {
        for (const ex of [2, 5]) {
          dot(left + ex + 1, top + 3, C.cyan);
          dot(left + ex + 2, top + 3, C.cyan);
          dot(left + ex + 1, top + 4, C.cyan);
          dot(left + ex + 2, top + 4, C.cyan);
        }
        dot(left + 4, top + 5, C.botO);
      } else if (!blink) {
        for (const ex of [2, 5]) {
          dot(left + ex + shift + 1, top + 4, C.cyan);
          dot(left + ex + shift + 2, top + 4, C.cyan);
        }
      }
    }

    // Hands, by what the robot is doing.
    const hy = top + 9;
    const hand = (x: number, y: number) => dot(x, y, C.botS);
    switch (pose) {
      case "type":
        hand(left - 0, hy + alt);
        hand(left + 8, hy + 1 - alt);
        break;
      case "game":
        dot(left + 3, hy + 1, C.dark);
        dot(left + 4, hy + 1, C.dark);
        dot(left + 5, hy + 1, C.dark);
        hand(left + 2, hy + 1 - (tick % 3 === 0 ? 1 : 0));
        hand(left + 6, hy + 1 - (tick % 4 === 0 ? 1 : 0));
        break;
      case "arcade":
        hand(left + 1, hy - 1 + alt);
        hand(left + 7, hy - 1 + (tick % 3 === 0 ? 1 : 0));
        break;
      case "coffee":
        hand(left + 8, hy - 1);
        dot(left + 9, hy - 2, C.bot);
        dot(left + 9, hy - 1, C.mid);
        if (tick % 4 < 2) dot(left + 9, hy - 4, C.botD);
        hand(left, hy + 1);
        break;
      case "inspect":
        hand(left - 1, hy - 2);
        hand(left + 8, hy + 1);
        break;
      case "water":
        hand(left - 1, hy);
        dot(left - 2, hy, C.leafD);
        dot(left - 3, hy, C.leafD);
        dot(left - 3, hy - 1, C.leafD);
        if (tick % 3 === 0) dot(left - 4, hy + 2 + (tick % 2), C.cyanDim);
        hand(left + 8, hy + 1);
        break;
      case "dance":
        hand(left - 1, hy - 2 * alt);
        hand(left + 9, hy - 2 * (1 - alt));
        break;
      case "walk":
        hand(left, hy + alt);
        hand(left + 8, hy + 1 - alt);
        break;
      case "held":
        // Flailing: arms thrown up and down, sweat flying off.
        hand(left - 1, hy - 3 + 2 * fast);
        hand(left + 9, hy - 1 - 2 * fast);
        dot(left + 10 + fast, top + 2 - fast, C.cyan);
        dot(left - 2 - fast, top + 3 + fast, C.cyan);
        break;
      case "fall":
        hand(left - 1, hy - 3);
        hand(left + 9, hy - 3);
        break;
      case "dizzy":
        hand(left - 1, hy + 1 + alt);
        hand(left + 9, hy + 2 - alt);
        break;
      case "spin":
        break;
      default:
        hand(left, hy + 1);
        hand(left + 8, hy + 1);
    }

    // A sneeze: a cloud of pixels from the face.
    if (t - b.sneezeAt < 0.5) {
      const k = (t - b.sneezeAt) / 0.5;
      for (let i = 0; i < 6; i++) {
        const a = hash(i * 7 + 1) * 1.2 - 0.6;
        dot(
          left + 9 + Math.round(k * 10 * (0.5 + hash(i))),
          top + 4 + Math.round(a * k * 8),
          i % 2 ? C.cyan : C.white,
        );
      }
    }

    if (b.held) {
      sprite(ICONS[fast ? "bang" : "sweat"][1], left + 2, top - 7, {
        x: C.white,
      });
    } else if (dizzy && b.icon?.kind === "spiral") {
      sprite(ICONS.spiral[1], left + 2 + (alt ? 1 : 0), top - 7, {
        x: C.white,
      });
    } else if (b.icon && t < b.icon.until) {
      const [c, rows] = ICONS[b.icon.kind];
      sprite(rows, left + 2, top - 7, { x: c });
    }
    b.rect = [left - 1, top - 1, 11, height + 2];
  };

  // ---- the room ---------------------------------------------------------

  const drawShell = (t: number) => {
    // Floor slab sides.
    poly(
      [P(-T, RD, 0), P(RW, RD, 0), P(RW, RD, -SLAB), P(-T, RD, -SLAB)],
      C.slabL,
    );
    poly(
      [P(RW, -T, 0), P(RW, RD, 0), P(RW, RD, -SLAB), P(RW, -T, -SLAB)],
      C.slabR,
    );

    // Floor tiles, with plank seams.
    for (let i = 0; i < RW; i++) {
      for (let j = 0; j < RD; j++) {
        poly(
          [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)],
          (i + j) % 2 ? C.floorA : C.floorB,
        );
      }
    }
    for (let j = 1; j < RD; j++) line(P(0, j), P(RW, j), C.seam);
    line(P(0, RD), P(RW, RD), C.floorEdge);
    line(P(RW, 0), P(RW, RD), C.floorEdge);

    // Rug.
    poly([P(3.2, 3.2), P(7.4, 3.2), P(7.4, 6.2), P(3.2, 6.2)], C.rugEdge);
    poly([P(3.4, 3.4), P(7.2, 3.4), P(7.2, 6.0), P(3.4, 6.0)], C.rugA);
    for (let k = 0; k < 3; k++) {
      const y0 = 3.9 + k * 0.7;
      poly(
        [P(3.4, y0), P(7.2, y0), P(7.2, y0 + 0.25), P(3.4, y0 + 0.25)],
        C.rugB,
      );
    }

    // Walls.
    poly([P(0, 0, 0), P(RW, 0, 0), P(RW, 0, WALL), P(0, 0, WALL)], C.wallR);
    poly([P(0, 0, 0), P(0, RD, 0), P(0, RD, WALL), P(0, 0, WALL)], C.wallL);
    for (let k = 2; k < RW; k += 2)
      line(P(k, 0, 3), P(k, 0, WALL - 1), C.seamWall);
    for (let k = 2; k < RD; k += 2)
      line(P(0, k, 3), P(0, k, WALL - 1), C.seamWall);
    poly([P(0, 0, 0), P(RW, 0, 0), P(RW, 0, 3), P(0, 0, 3)], C.base);
    poly([P(0, 0, 0), P(0, RD, 0), P(0, RD, 3), P(0, 0, 3)], C.base);
    // Wall ends and caps.
    poly(
      [P(-T, RD, -SLAB), P(0, RD, -SLAB), P(0, RD, WALL), P(-T, RD, WALL)],
      C.wallEnd,
    );
    poly(
      [P(RW, -T, -SLAB), P(RW, 0, -SLAB), P(RW, 0, WALL), P(RW, -T, WALL)],
      C.slabR,
    );
    poly(
      [P(-T, -T, WALL), P(0, -T, WALL), P(0, RD, WALL), P(-T, RD, WALL)],
      C.cap,
    );
    poly(
      [P(-T, -T, WALL), P(RW, -T, WALL), P(RW, 0, WALL), P(-T, 0, WALL)],
      C.cap,
    );
    line(P(0, 0, WALL), P(0, RD, WALL), C.capEdge);
    line(P(0, 0, WALL), P(RW, 0, WALL), C.capEdge);
    // Neon strip just under the cap, the room's light source. It strobes
    // during a party.
    const partying = t < partyUntil;
    const neon = partying
      ? Math.floor(t * 8) % 2
        ? C.cyan
        : C.white
      : C.cyanDim;
    line(P(0, 0.3, WALL - 3), P(0, RD, WALL - 3), neon);
    line(P(0.3, 0, WALL - 3), P(RW, 0, WALL - 3), neon);
    line(P(0, 0.3, WALL - 4), P(0, RD, WALL - 4), "#1b2a2a");
    line(P(0.3, 0, WALL - 4), P(RW, 0, WALL - 4), "#1b2a2a");

    // Wall screen above the desks: a ticker chart, a rising arrow, a caption.
    poly(
      [P(1.95, 0, 25), P(6.75, 0, 25), P(6.75, 0, 47), P(1.95, 0, 47)],
      C.grey,
    );
    poly(
      [P(2.05, 0, 26), P(6.65, 0, 26), P(6.65, 0, 46), P(2.05, 0, 46)],
      C.dark,
    );
    const scr = faceX(2.05, 0, 26);
    const SW = 36;
    const SH = 19;
    // Faint ticker rows in the background.
    for (let v = 8; v < SH; v += 4) {
      for (let u = 1; u < SW - 1; u++) {
        if (hash(u * 3 + v * 11 + Math.floor(t * 0.7)) > 0.55)
          scr(u, v, "#1c1c1c");
      }
    }
    // The chart line, scrolling, trending up and to the right, above the caption.
    const shift = Math.floor(t * 4);
    let prev = -1;
    for (let u = 1; u < SW - 1; u++) {
      const k = u + shift;
      const base = 8 + ((k % 40) / 40) * 7;
      const y = Math.round(base + (hash(k) - 0.5) * 3);
      const yy = Math.max(7, Math.min(SH - 2, y));
      if (prev >= 0) {
        const lo = Math.min(prev, yy);
        const hi = Math.max(prev, yy);
        for (let v = lo; v <= hi; v++) scr(u, v, C.grey);
      }
      prev = yy;
    }
    // The arrow, bold and white, climbing across the chart. During a party
    // it points the other way: not stonks.
    const down = partying;
    for (let i = 0; i < 21; i++) {
      const u = 11 + i;
      const v = down ? 17 - Math.round(i * 0.5) : 7 + Math.round(i * 0.5);
      scr(u, v, C.white);
      scr(u, v + 1, C.white);
    }
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; i + j <= 4; j++)
        scr(33 - i, down ? 7 + j : 17 - j, C.white);
    }
    // Caption, 3×5 pixel capitals.
    const FONT: Record<string, string[]> = {
      S: ["111", "100", "111", "001", "111"],
      T: ["111", "010", "010", "010", "010"],
      O: ["111", "101", "101", "101", "111"],
      N: ["101", "111", "111", "101", "101"],
      K: ["101", "101", "110", "101", "101"],
    };
    [..."STONKS"].forEach((ch, n) =>
      FONT[ch].forEach((row, r) =>
        [...row].forEach((bit, c) => {
          if (bit === "1") scr(2 + n * 4 + c, 5 - r, C.light);
        }),
      ),
    );

    // Framed photo on the left wall.
    poly(
      [P(0, 8.0, 18), P(0, 0.75, 18), P(0, 0.75, 56), P(0, 8.0, 56)],
      C.grey,
    );
    poly(
      [P(0, 7.9, 19), P(0, 0.85, 19), P(0, 0.85, 55), P(0, 7.9, 55)],
      C.dark,
    );
    const photo = faceY(7.9, 0, 19);
    PHOTO.forEach((row, j) =>
      [...row].forEach((k, i) => photo(i, PHOTO.length - 1 - j, GREYS[+k])),
    );

    // Light pools from screens and the lamp, dithered on the floor.
    if (occupied("deskA"))
      poly([P(2.3, 1.2), P(3.7, 1.2), P(4.0, 2.7), P(2.0, 2.7)], glowCyan);
    if (occupied("deskB"))
      poly([P(5.0, 1.2), P(6.4, 1.2), P(6.7, 2.7), P(4.7, 2.7)], glowCyan);
    poly([P(0.9, 4.2), P(2.6, 4.0), P(3.4, 6.4), P(0.9, 6.2)], glowCyan);
    poly([P(8.1, 1.15), P(9.3, 1.15), P(9.6, 2.6), P(7.8, 2.6)], glowCyan);
  };

  type Item = { key: number; draw: (t: number) => void };

  const items: Item[] = [
    // Server rack against the left wall, LEDs on its face.
    {
      key: 0.8 + 0.5,
      draw: (t) => {
        box(0.2, 0.1, 0, 1.2, 0.8, 36, CASE);
        const f = faceX(0.2, 0.9, 0);
        for (let v = 6; v <= 32; v += 4) {
          for (let u = 2; u <= 8; u += 2) {
            const n = hash(u * 31 + v * 7 + Math.floor(t * (2 + (u % 3))));
            f(u, v, n > 0.8 ? C.cyan : n > 0.35 ? C.grey : C.dark);
          }
          for (let u = 1; u <= 9; u++) f(u, v - 2, C.caseL);
        }
      },
    },
    // Vending machine.
    {
      key: 7.55 + 1.05,
      draw: (t) => {
        box(7.0, 0.15, 0, 1.1, 0.9, 30, {
          t: C.vendT,
          l: C.vendL,
          r: C.vendR,
          e: "#444444",
        });
        const f = faceX(7.0, 1.05, 0);
        for (let u = 1; u <= 6; u++)
          for (let v = 10; v <= 26; v++) f(u, v, C.screen);
        const goods = [C.white, C.mid, C.light, C.cyan];
        for (let r = 0; r < 4; r++)
          for (let u = 2; u <= 5; u += 2) f(u, 12 + r * 4, goods[(r + u) % 4]);
        for (let u = 1; u <= 6; u++)
          f(u, 28, Math.floor(t * 2) % 2 ? C.cyan : C.cyanDim);
        for (let u = 2; u <= 5; u++) f(u, 5, C.dark);
      },
    },
    // Desk A with lamp, desk B; monitors show code while someone types.
    ...[
      { x: 2.0, id: "deskA", lamp: true },
      { x: 4.7, id: "deskB", lamp: false },
    ].map((d) => ({
      key: d.x + 1 + 0.65,
      draw: (t: number) => {
        const y = 0.15;
        box(d.x + 1.75, y + 0.1, 0, 0.15, 0.15, 10, WOOD);
        box(d.x + 0.05, y + 0.8, 0, 0.15, 0.15, 10, WOOD);
        box(d.x + 1.75, y + 0.8, 0, 0.15, 0.15, 10, WOOD);
        box(d.x, y, 10, 2, 1, 2, WOOD);
        const mx = d.x + 0.5;
        box(mx + 0.4, y + 0.35, 12, 0.2, 0.15, 3, METAL);
        box(mx, y + 0.2, 15, 1.0, 0.18, 9, CASE);
        const s = faceX(mx, y + 0.38, 15);
        const on = !!occupied(d.id);
        for (let u = 1; u <= 6; u++)
          for (let v = 1; v <= 7; v++) s(u, v, on ? C.screen : C.screenOff);
        if (on) {
          const scroll = Math.floor(t * 3);
          for (let r = 0; r < 4; r++) {
            const n = hash(r + scroll * 4 + d.x * 10);
            const len = 1 + Math.floor(n * 5);
            const indent = n > 0.6 ? 1 : 0;
            for (let u = 0; u < len && u + indent < 6; u++)
              s(1 + indent + u, 6 - r * 2, u === 0 ? C.cyan : C.cyanDim);
          }
        } else if (Math.floor(t * 2) % 2) {
          s(2, 6, C.cyanDim);
        }
        box(d.x + 0.55, y + 0.62, 12, 0.75, 0.25, 1, {
          t: "#3a3a3a",
          l: C.dark,
          r: C.dark,
        });
        if (d.lamp) {
          poly(
            [
              P(d.x + 1.4, y + 0.1, 12),
              P(d.x + 2, y + 0.1, 12),
              P(d.x + 2, y + 1, 12),
              P(d.x + 1.4, y + 1, 12),
            ],
            glowWarm,
          );
          box(d.x + 1.65, y + 0.35, 12, 0.12, 0.12, 8, METAL);
          box(d.x + 1.5, y + 0.3, 20, 0.35, 0.3, 2, {
            t: C.lamp,
            l: C.light,
            r: C.woodR,
          });
        } else {
          // A small figurine: smooth grey head, dark suit, arms folded.
          const [gx, gy] = P(d.x + 1.65, y + 0.5, 12);
          const fig = [
            ".LL.",
            "LLLL",
            "LLLL",
            ".LL.",
            "DDDD",
            "DSSD",
            "DDDD",
            ".DD.",
          ];
          fig.forEach((row, j) =>
            [...row].forEach((k, i) => {
              const c =
                k === "L"
                  ? C.light
                  : k === "D"
                    ? "#1e1e1e"
                    : k === "S"
                      ? C.grey
                      : null;
              if (c) dot(gx - 2 + i, gy - 8 + j, c);
            }),
          );
        }
      },
    })),
    // Stools at the desks.
    ...[3.0, 5.7].map((sx) => ({
      key: sx + 1.6 - 0.05,
      draw: () => box(sx - 0.25, 1.45, 0, 0.5, 0.4, 6, METAL),
    })),
    // TV on a stand; pong while someone plays.
    {
      key: 0.55 + 5.15,
      draw: (t) => {
        box(0.2, 4.4, 0, 0.7, 1.5, 5, WOOD);
        box(0.3, 4.6, 5, 0.5, 1.1, 9, CASE);
        line(P(0.55, 5.0, 14), P(0.55, 4.8, 17), C.botD);
        line(P(0.55, 5.2, 14), P(0.55, 5.5, 17), C.botD);
        const s = faceY(5.7, 0.8, 5);
        const playing = !!occupied("tv") || t < tvMatchUntil;
        for (let u = 1; u <= 7; u++)
          for (let v = 2; v <= 9; v++)
            s(u, v, playing ? "#0f1515" : C.screenOff);
        if (playing) {
          const bx = 1 + Math.round(Math.abs(((t * 5) % 12) - 6));
          const by = 2 + Math.round(Math.abs(((t * 3.3) % 14) - 7));
          const py = Math.max(3, Math.min(8, by));
          s(1, py, C.cyan);
          s(1, py - 1, C.cyan);
          s(7, py, C.cyan);
          s(7, py + 1, C.cyan);
          s(bx, by, C.white);
        } else if (Math.floor(t * 1.5) % 2) {
          s(4, 5, C.cyanDim);
        }
        box(1.05, 5.0, 0, 0.35, 0.3, 2, { t: C.bot, l: C.botS, r: C.botD });
      },
    },
    // Beanbag in front of the TV.
    {
      key: 2.3 + 5.3 - 0.06,
      draw: () => {
        box(1.8, 4.8, 0, 1.0, 1.0, 4, { t: C.beanT, l: C.beanL, r: C.beanR });
        box(1.95, 4.95, 4, 0.7, 0.7, 2, { t: C.beanT, l: C.beanL, r: C.beanR });
      },
    },
    // Arcade cabinet.
    {
      key: 8.7 + 0.65,
      draw: (t) => {
        box(8.2, 0.2, 0, 0.95, 0.9, 30, {
          t: C.cabT,
          l: C.cabL,
          r: C.cabR,
          e: "#3a3a3a",
        });
        box(8.2, 1.1, 11, 0.95, 0.28, 2, { t: C.cabT, l: C.cabL, r: C.cabR });
        const f = faceX(8.2, 1.1, 0);
        for (let u = 1; u <= 6; u++)
          for (let v = 14; v <= 22; v++) f(u, v, "#0d0d0d");
        for (let u = 1; u <= 6; u++)
          f(u, 26, Math.floor(t * 3) % 2 ? C.white : C.grey);
        // Invaders marching.
        const off = Math.round(Math.abs(((t * 2) % 4) - 2));
        for (const ix of [0, 3]) {
          f(1 + ix + off, 21, C.white);
          f(2 + ix + off, 21, C.white);
          f(1 + ix + off, 20, C.white);
        }
        if (occupied("arcade")) {
          const shot = Math.floor(t * 8) % 6;
          f(3 + off, 15 + shot, C.cyan);
        }
        f(3, 14, C.cyan);
        f(4, 14, C.cyan);
        const [jx, jy] = P(8.6, 1.25, 13);
        dot(jx, jy - 1, C.white);
        dot(jx, jy, C.dark);
      },
    },
    // Plants.
    ...[
      { x: 0.3, y: 6.8, tall: false },
      { x: 0.3, y: 2.6, tall: true },
    ].map((p) => ({
      key: p.x + p.y + 0.5,
      draw: (t: number) => {
        box(p.x, p.y, 0, 0.5, 0.5, 5, { t: C.potT, l: C.potL, r: C.potR });
        const [cx, cy] = P(p.x + 0.25, p.y + 0.25, 5);
        const sway = Math.round(Math.sin(t * 1.2 + p.x) * 0.6);
        const leaves = p.tall
          ? [
              "...x...",
              "..xLx..",
              ".xxLxx.",
              "xxLxxDx",
              ".xDxLx.",
              "xxLxxxx",
              ".DxLxD.",
              "..xDx..",
              "...x...",
              "...D...",
              "...D...",
            ]
          : ["..x.x..", ".xLxLx.", "xxLxxLx", ".xDxDx.", "..xDx..", "...D..."];
        leaves.forEach((row, j) =>
          [...row].forEach((k, i) => {
            const c =
              k === "x"
                ? C.leaf
                : k === "L"
                  ? C.leafL
                  : k === "D"
                    ? C.leafD
                    : null;
            if (c)
              dot(
                cx - 3 + i + (j < 3 ? sway : 0),
                cy - leaves.length + j + 1,
                c,
              );
          }),
        );
      },
    })),
  ];

  const draw = (t: number) => {
    ctx.clearRect(0, 0, W, H);
    drawShell(t);
    const all: Item[] = [
      ...items,
      ...bots.map((b) => ({
        key: b.held || b.lift > 0 ? 1e9 : b.x + b.y + (b.riding ? 0.01 : 0),
        draw: (tt: number) => drawBot(b, tt),
      })),
    ];
    all.sort((a, b) => a.key - b.key).forEach((it) => it.draw(t));
    for (const k of sparks) dot(Math.round(k.x), Math.round(k.y), k.c);
  };

  // ---- grabbing the robots ----------------------------------------------

  let now = 0;
  let grabbed: Bot | null = null;
  let dragging = false;
  let press: [number, number] = [0, 0];

  const toScene = (e: PointerEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [
      ((e.clientX - r.left) * W) / r.width,
      ((e.clientY - r.top) * H) / r.height,
    ];
  };
  const botAt = (sx: number, sy: number) =>
    [...bots]
      .sort((p, q) => q.x + q.y - (p.x + p.y))
      .find(
        ({ rect: [x, y, w, h] }) =>
          sx >= x && sx < x + w && sy >= y && sy < y + h,
      ) ?? null;
  // Screen point back to a floor position (anywhere, even outside the room).
  const toFloor = (sx: number, sy: number): [number, number] => {
    const a = (sx - OX) / (TW / 2);
    const c = (sy - OY) / (TH / 2);
    return [(a + c) / 2, (c - a) / 2];
  };
  const inside = (x: number, y: number): [number, number] => [
    Math.max(0.4, Math.min(RW - 0.4, x)),
    Math.max(0.4, Math.min(RD - 0.4, y)),
  ];

  const onDown = (e: PointerEvent) => {
    const [sx, sy] = toScene(e);
    const b = botAt(sx, sy);
    if (!b) return;
    grabbed = b;
    dragging = false;
    press = [sx, sy];
    // Remember where on the robot it was picked up, so that point stays
    // under the cursor.
    const [fx, fy] = P(b.x, b.y);
    b.grab = [
      sx - fx,
      sy - (fy - Math.round(b.lift) - (b.slot.sit && b.arrived ? 6 : 0)),
    ];
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const onMove = (e: PointerEvent) => {
    const [sx, sy] = toScene(e);
    if (!grabbed) {
      canvas.style.cursor = botAt(sx, sy) ? "grab" : "default";
      return;
    }
    if (!dragging && Math.hypot(sx - press[0], sy - press[1]) < 3) return;
    if (!dragging) {
      // Lifted off: it loses its station and its plans.
      dragging = true;
      grabbed.held = true;
      grabbed.loose = true;
      grabbed.arrived = false;
      grabbed.path = [];
      grabbed.icon = null;
      grabbed.spinUntil = -1;
      grabbed.cheerUntil = -1;
      grabbed.shakes = 0;
      taken.delete(grabbed.slot.id);
      if (grabbed.riding) {
        grabbed.riding.rider = null;
        grabbed.riding = null;
      }
    }
    // Shaken hard: count quick direction changes; enough of them and it
    // sneezes, then lands dizzy with a spiral.
    const dx = sx - press[0];
    press = [sx, sy];
    if (
      Math.abs(dx) > 4 &&
      Math.sign(dx) !== Math.sign(grabbed.lastDx) &&
      grabbed.lastDx !== 0
    ) {
      grabbed.shakes++;
      if (grabbed.shakes >= 8) {
        grabbed.shakes = 0;
        grabbed.sneezeAt = now;
        grabbed.icon = { kind: "spiral", until: now + 3 };
        burst(sx, sy, 8, C.white, now);
      }
    }
    if (Math.abs(dx) > 1) grabbed.lastDx = dx;
    // The grabbed point stays under the cursor; the robot hangs HOLD_LIFT
    // above the floor point beneath it.
    const [x, y] = toFloor(
      sx - grabbed.grab[0],
      sy - grabbed.grab[1] + HOLD_LIFT,
    );
    grabbed.x = x;
    grabbed.y = y;
    grabbed.lift = HOLD_LIFT;
    grabbed.face = "py";
  };
  const onUp = () => {
    if (!grabbed) return;
    if (dragging) {
      grabbed.held = false;
      grabbed.vy = 0;
      const [x, y] = inside(grabbed.x, grabbed.y);
      if (x !== grabbed.x || y !== grabbed.y) {
        grabbed.back = { from: [grabbed.x, grabbed.y], to: [x, y], at: now };
      }
    } else {
      // A tap: hop, say "!", look at the viewer. Five quick taps: breakdance.
      grabbed.taps = [...grabbed.taps.filter((x) => now - x < 2), now];
      if (grabbed.taps.length >= 5) {
        grabbed.taps = [];
        grabbed.spinUntil = now + 3;
        grabbed.icon = null;
        burst(...P(grabbed.x, grabbed.y, 8), 10, C.cyan, now);
      } else {
        grabbed.jumpAt = now;
        grabbed.icon = { kind: "bang", until: now + 1 };
        grabbed.face = "py";
      }
    }
    grabbed = null;
    dragging = false;
    canvas.style.cursor = "grab";
  };
  // ↑ ↑ ↓ ↓ ← → ← → B A: a dance party.
  const KONAMI = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ];
  let typed: string[] = [];
  const onKey = (e: KeyboardEvent) => {
    typed = [...typed, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(
      -KONAMI.length,
    );
    if (typed.join() === KONAMI.join()) {
      typed = [];
      partyUntil = now + 8;
      for (const b of bots) {
        b.face = "py";
        b.icon = { kind: "note", until: now + 8 };
        burst(...P(b.x, b.y, 10), 6, C.cyan, now);
      }
    }
  };
  if (!reduce) addEventListener("keydown", onKey);

  if (!reduce) {
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
  }

  let raf = 0;
  const t0 = performance.now();
  let last = t0;
  let lastDraw = -Infinity;
  const loop = (ts: number) => {
    const dt = Math.max(0, Math.min((ts - last) / 1000, 0.1));
    last = ts;
    const t = (ts - t0) / 1000;
    now = t;
    step(dt, t);
    // 30fps: smooth enough for walking, still reads as pixel animation.
    if (ts - lastDraw >= 33) {
      lastDraw = ts;
      draw(t);
    }
    raf = requestAnimationFrame(loop);
  };

  addEventListener("resize", fit);
  if (reduce) draw(0);
  else raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener("resize", fit);
    removeEventListener("keydown", onKey);
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
  };
}
