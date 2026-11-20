import { W, H, rng, f1, poly } from "../lib.mjs";

/* ==========================================================================
   Карта: джунгли чужой планеты (вид сверху, полумрак и биолюминесценция)
   ========================================================================== */
const K = "alien-jungle";
const u = n => `url(#${K}-${n})`;

/* ---------- границы зон: общие ломаные между узлами ---------- */
const A = [1050, 0], B = [2050, 0], J1 = [980, 1020], J2 = [1180, 1300], J3 = [2100, 950], J4 = [1950, 1350];
const L1 = [0, 1150], R1 = [W, 1000], Bo1 = [1000, H], Bo2 = [2150, H];
const E = {
  thicketCrash: [A, [980, 250], [1060, 520], [940, 800], J1],
  crashSpires: [B, [2000, 300], [2120, 600], J3],
  spiresNest: [J3, [2400, 1050], [2700, 960], R1],
  crashNest: [J3, [2020, 1150], J4],
  thicketRuins: [L1, [300, 1080], [650, 1150], J1],
  crashRuins: [J1, [1100, 1180], J2],
  crashSwamp: [J2, [1450, 1380], [1700, 1300], J4],
  ruinsSwamp: [J2, [1100, 1550], [1050, 1800], Bo1],
  swampNest: [J4, [2100, 1600], [2080, 1820], Bo2]
};
const rev = a => a.slice().reverse();
/** Склеить цепочку ломаных (каждая продолжает предыдущую) в многоугольник. */
const chain = (...parts) => { const out = []; for (const p of parts) for (const q of p) { const l = out[out.length - 1]; if (!l || l[0] !== q[0] || l[1] !== q[1]) out.push(q); } const f = out[0], l = out[out.length - 1]; if (f[0] === l[0] && f[1] === l[1]) out.pop(); return out; };
const ZP = {
  thicket: chain([[0, 0]], E.thicketCrash, rev(E.thicketRuins)),
  crash: chain(E.crashSpires, E.crashNest, rev(E.crashSwamp), rev(E.crashRuins), rev(E.thicketCrash)),
  spires: chain([B, [W, 0]], rev(E.spiresNest), rev(E.crashSpires)),
  nest: chain(E.spiresNest, [[W, H]], rev(E.swampNest), rev(E.crashNest)),
  swamp: chain(E.crashSwamp, E.swampNest, [Bo1], rev(E.ruinsSwamp)),
  ruins: chain(E.thicketRuins, E.crashRuins, E.ruinsSwamp, [[0, H]])
};

/* ---------- геометрия ---------- */
function inside(p, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c; } return c; }
function edgeDist(p, pts) {
  let m = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    m = Math.min(m, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy));
  }
  return m;
}
/** Гладкий замкнутый (или открытый) путь Катмулла-Рома. */
function smooth(pts, closed = true) {
  const n = pts.length, g = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return closed ? d + "Z" : d;
}
function blobPts(cx, cy, rx, ry, r, n = 9, j = 0.3, rot = 0) {
  const o = [];
  for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2, k = 1 - j / 2 + j * r(); o.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return o;
}
const blob = (cx, cy, rx, ry, r, n, j, rot) => smooth(blobPts(cx, cy, rx, ry, r, n, j, rot));
/** Случайные точки внутри зоны с отступом от края и вне запретных прямоугольников. */
function scatter(zone, n, r, { margin = 60, avoid = [], minGap = 0, placed = [] } = {}) {
  const pts = ZP[zone], out = [];
  for (let t = 0; t < n * 60 && out.length < n; t++) {
    const p = [r() * W, r() * H];
    if (!inside(p, pts) || edgeDist(p, pts) < margin) continue;
    if (avoid.some(([x1, y1, x2, y2]) => p[0] > x1 && p[0] < x2 && p[1] > y1 && p[1] < y2)) continue;
    if (minGap && [...placed, ...out].some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < minGap)) continue;
    out.push(p);
  }
  return out;
}

/* ---------- зоны: подписи (и места, свободные от крупных предметов) ---------- */
const LBL = { thicket: [470, 560], crash: [1500, 1175], spires: [2560, 600], nest: [2560, 1560], swamp: [1590, 1700], ruins: [520, 1500] };
const box = (k, w = 300, up = 70, down = 80) => [LBL[k][0] - w, LBL[k][1] - up, LBL[k][0] + w, LBL[k][1] + down];

/* ---------- свои узоры ---------- */
function makeDefs() {
  const r = rng(K + "-defs");
  const stones = [];
  for (let y = 0; y < 240; y += 60) for (let x = -(y / 60 % 2) * 40; x < 240; x += 80) {
    const s = 0.8 + r() * 0.3;
    stones.push(`<rect x="${x + 3}" y="${y + 3}" width="74" height="54" rx="5" fill="rgb(${Math.round(92 * s)},${Math.round(98 * s)},${Math.round(104 * s)})" stroke="#1d2226" stroke-width="3"/>`);
    if (r() < 0.3) stones.push(`<path d="M${x + 12 + r() * 30},${y + 10} l${f1(10 + r() * 14)},${f1(16 + r() * 14)} l${f1(-6 + r() * 12)},${f1(12 + r() * 10)}" stroke="#2a3034" stroke-width="2" fill="none"/>`);
  }
  return `
  <pattern id="${K}-stones" width="240" height="240" patternUnits="userSpaceOnUse">${stones.join("")}</pattern>
  ${Object.entries(ZP).map(([k, pts]) => `<clipPath id="${K}-clip-${k}"><polygon points="${poly(pts)}"/></clipPath>`).join("")}
  <filter id="${K}-feather" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="${K}-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
  <filter id="${K}-mottle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="4" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0.01  0 0 0 0 0.03  0 0 0 -1.6 1.0"/></filter>
  <filter id="${K}-speck" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="5"/><feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.85  0 0 0 0 0.8  0 0 0 2.2 -1.25"/></filter>
  <radialGradient id="${K}-fire"><stop offset="0" stop-color="rgba(255,210,110,0.8)"/><stop offset="0.35" stop-color="rgba(255,120,40,0.35)"/><stop offset="1" stop-color="rgba(255,80,20,0)"/></radialGradient>
  <radialGradient id="${K}-cyan"><stop offset="0" stop-color="rgba(80,255,230,0.55)"/><stop offset="0.45" stop-color="rgba(40,200,220,0.16)"/><stop offset="1" stop-color="rgba(20,160,200,0)"/></radialGradient>
  <radialGradient id="${K}-magenta"><stop offset="0" stop-color="rgba(240,110,255,0.6)"/><stop offset="0.45" stop-color="rgba(180,70,240,0.18)"/><stop offset="1" stop-color="rgba(140,40,220,0)"/></radialGradient>
  <radialGradient id="${K}-acidglow"><stop offset="0" stop-color="rgba(190,255,60,0.38)"/><stop offset="0.5" stop-color="rgba(120,230,40,0.1)"/><stop offset="1" stop-color="rgba(80,200,20,0)"/></radialGradient>
  <radialGradient id="${K}-sick"><stop offset="0" stop-color="rgba(220,255,150,0.45)"/><stop offset="0.5" stop-color="rgba(160,220,90,0.12)"/><stop offset="1" stop-color="rgba(120,200,60,0)"/></radialGradient>
  <radialGradient id="${K}-acid" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#d4f55a"/><stop offset="0.18" stop-color="#8cc82a"/><stop offset="0.6" stop-color="#3a7014"/><stop offset="1" stop-color="#1a300a"/></radialGradient>
  <radialGradient id="${K}-mush" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#d8fff6"/><stop offset="0.35" stop-color="#4ff0dc"/><stop offset="1" stop-color="#14506a"/></radialGradient>
  <radialGradient id="${K}-mushP" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#ffe0ff"/><stop offset="0.35" stop-color="#e06cff"/><stop offset="1" stop-color="#4a1868"/></radialGradient>
  <radialGradient id="${K}-egg" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#f4ffd0"/><stop offset="0.4" stop-color="#b9cf7a"/><stop offset="1" stop-color="#3d3a22"/></radialGradient>
  <radialGradient id="${K}-slime" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="rgba(230,255,210,0.75)"/><stop offset="0.6" stop-color="rgba(150,200,120,0.45)"/><stop offset="1" stop-color="rgba(90,130,70,0.2)"/></radialGradient>
  <radialGradient id="${K}-vignette" cx="50%" cy="50%" r="72%"><stop offset="0.5" stop-color="rgba(2,4,10,0)"/><stop offset="1" stop-color="rgba(2,4,10,0.72)"/></radialGradient>
  <linearGradient id="${K}-hull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9c0c8"/><stop offset="1" stop-color="#59616b"/></linearGradient>`;
}

/* ---------- примитивы ---------- */
const glow = (x, y, rad, g = "cyan") => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rad)}" fill="${u(g)}"/>`;

/** Крона чужого дерева: несколько лопастей, прожилки и светящиеся стручки. */
function tree(x, y, R, r, hue = 0) {
  const pal = [["#1d3b4a", "#2b5a66", "#3f8a8a"], ["#33224a", "#4c3270", "#7650a0"], ["#1d3a2c", "#2c5a40", "#4a8a5a"]][hue];
  const o = [`<path d="${blob(x, y, R, R, r, 11, 0.35)}" fill="${pal[0]}" stroke="#070a0e" stroke-width="4"/>`];
  const lobes = 5 + Math.floor(r() * 3);
  for (let i = 0; i < lobes; i++) {
    const a = i / lobes * Math.PI * 2 + r(), d = R * (0.35 + r() * 0.25), lr = R * (0.38 + r() * 0.15);
    o.push(`<path d="${blob(x + Math.cos(a) * d, y + Math.sin(a) * d, lr, lr, r, 7, 0.3)}" fill="${pal[1]}" stroke="rgba(0,0,0,0.35)" stroke-width="3"/>`);
  }
  o.push(`<path d="${blob(x - R * 0.15, y - R * 0.15, R * 0.4, R * 0.4, r, 7, 0.3)}" fill="${pal[2]}" opacity="0.8"/>`);
  for (let i = 0; i < 5; i++) { const a = r() * Math.PI * 2; o.push(`<path d="M${f1(x)},${f1(y)} Q${f1(x + Math.cos(a + 0.4) * R * 0.4)},${f1(y + Math.sin(a + 0.4) * R * 0.4)} ${f1(x + Math.cos(a) * R * 0.85)},${f1(y + Math.sin(a) * R * 0.85)}" stroke="rgba(0,0,0,0.3)" stroke-width="3" fill="none"/>`); }
  const pods = [];
  for (let i = 0; i < 4 + Math.floor(r() * 4); i++) { const a = r() * Math.PI * 2, d = R * (0.3 + r() * 0.6); pods.push(`<circle cx="${f1(x + Math.cos(a) * d)}" cy="${f1(y + Math.sin(a) * d)}" r="${f1(4 + r() * 5)}" fill="${hue === 1 ? "#ff9cf5" : "#9cfff0"}"/>`); }
  return `<g filter="url(#soft)">${o.join("")}</g><g filter="url(#glow)">${pods.join("")}</g>`;
}
/** «Пальма» чужого мира: веер длинных листьев со светящимися кончиками. */
function frond(x, y, R, r) {
  const o = [], g = [], n = 9 + Math.floor(r() * 4), col = r() < 0.5 ? ["#1f4a52", "#3a8a86"] : ["#3a2456", "#7a4ab0"];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + r() * 0.3, l = R * (0.75 + r() * 0.35), bend = (r() - 0.5) * 0.6;
    const tip = [x + Math.cos(a) * l, y + Math.sin(a) * l], c = [x + Math.cos(a + bend) * l * 0.55, y + Math.sin(a + bend) * l * 0.55];
    const w = R * 0.16, px = -Math.sin(a) * w, py = Math.cos(a) * w;
    o.push(`<path d="M${f1(x)},${f1(y)} Q${f1(c[0] + px)},${f1(c[1] + py)} ${f1(tip[0])},${f1(tip[1])} Q${f1(c[0] - px)},${f1(c[1] - py)} ${f1(x)},${f1(y)}Z" fill="${col[0]}" stroke="#070a0e" stroke-width="3"/>`);
    o.push(`<path d="M${f1(x)},${f1(y)} Q${f1(c[0])},${f1(c[1])} ${f1(tip[0])},${f1(tip[1])}" stroke="${col[1]}" stroke-width="3" fill="none"/>`);
    g.push(`<circle cx="${f1(tip[0])}" cy="${f1(tip[1])}" r="${f1(4 + r() * 3)}" fill="#c8fff4"/>`);
  }
  o.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(R * 0.14)}" fill="#2a1e14" stroke="#070a0e" stroke-width="3"/>`);
  return `<g filter="url(#soft)">${o.join("")}</g><g filter="url(#glow)">${g.join("")}</g>`;
}
/** Группа светящихся грибов. */
function mushrooms(x, y, r, purple = false) {
  const o = [], g = [];
  const n = 3 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const cx = x + (r() - 0.5) * 120, cy = y + (r() - 0.5) * 120, R = 14 + r() * 26;
    o.push(`<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R)}" fill="${u(purple ? "mushP" : "mush")}" stroke="#06121a" stroke-width="3"/>`);
    for (let k = 0; k < 3; k++) o.push(`<circle cx="${f1(cx + (r() - 0.5) * R)}" cy="${f1(cy + (r() - 0.5) * R)}" r="${f1(2 + r() * 3)}" fill="rgba(255,255,255,0.7)"/>`);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; o.push(`<path d="M${f1(cx + Math.cos(a) * R * 0.3)},${f1(cy + Math.sin(a) * R * 0.3)} L${f1(cx + Math.cos(a) * R * 0.9)},${f1(cy + Math.sin(a) * R * 0.9)}" stroke="rgba(0,40,60,0.35)" stroke-width="1.6"/>`); }
  }
  g.push(glow(x, y, 170, purple ? "magenta" : "cyan"));
  return g.join("") + `<g filter="url(#soft)">${o.join("")}</g>`;
}
/** Папоротник/кустик: веер изогнутых листьев. */
function fern(x, y, r, col = "#3c8a6a", n = 7, len = 60) {
  const o = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + r() * 0.5, l = len * (0.7 + r() * 0.5);
    o.push(`<path d="M${f1(x)},${f1(y)} Q${f1(x + Math.cos(a + 0.4) * l * 0.6)},${f1(y + Math.sin(a + 0.4) * l * 0.6)} ${f1(x + Math.cos(a) * l)},${f1(y + Math.sin(a) * l)}" stroke="${col}" stroke-width="${f1(7 + r() * 5)}" stroke-linecap="round" fill="none"/>`);
  }
  return `<g filter="url(#soft)" opacity="0.95">${o.join("")}</g>`;
}
/** Кристаллический шпиль: шестигранная призма сверху (грани верхушки) + наклонные осколки + длинная тень. */
function hexPrism(x, y, R, rot, P) {
  const v = [];
  for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 3; v.push([x + Math.cos(a) * R, y + Math.sin(a) * R]); }
  const o = [`<polygon points="${poly(v)}" fill="${P[1]}" stroke="#14061e" stroke-width="3" stroke-linejoin="round"/>`];
  for (let i = 0; i < 6; i++) {
    const a = v[i], b = v[(i + 1) % 6], mx = (a[0] + b[0]) / 2 - x, my = (a[1] + b[1]) / 2 - y;
    const lit = (-mx - my) / (Math.hypot(mx, my) * 1.42); // свет сверху-слева
    o.push(`<polygon points="${poly([[x, y], a, b])}" fill="${lit > 0.3 ? P[0] : lit < -0.3 ? P[2] : P[1]}" opacity="0.9"/>`);
  }
  o.push(`<polygon points="${poly(v)}" fill="none" stroke="#14061e" stroke-width="3" stroke-linejoin="round"/><path d="${v.map((p, i) => `M${f1(x)},${f1(y)} L${f1(p[0])},${f1(p[1])}`).join(" ")}" stroke="rgba(20,6,30,0.45)" stroke-width="1.6"/>`);
  return o.join("");
}
function crystals(x, y, R, r, pal = 0) {
  const P = [["#f6d0ff", "#b45ee0", "#5a2280"], ["#d8fdff", "#4fd0e8", "#1d5a80"]][pal];
  const o = [];
  // Тень высокого шпиля.
  o.push(`<path d="M${f1(x - R * 0.5)},${f1(y)} L${f1(x + R * 2.4)},${f1(y + R * 2.0)} L${f1(x + R * 2.0)},${f1(y + R * 2.5)} L${f1(x)},${f1(y + R * 0.5)}Z" fill="rgba(5,0,12,0.45)" filter="url(#${K}-feather)"/>`);
  o.push(`<path d="${blob(x, y, R * 0.9, R * 0.8, r, 8, 0.4)}" fill="#3c3448" stroke="#0e0c14" stroke-width="4"/>`);
  const dir = r() * Math.PI * 2, n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const a = dir + (r() - 0.5) * 2.4, l = R * (0.7 + r() * 0.6), w = R * (0.14 + r() * 0.1);
    const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca, bx = x + ca * R * 0.2, by = y + sa * R * 0.2;
    const b1 = [bx + px * w, by + py * w], b2 = [bx - px * w, by - py * w], m1 = [bx + ca * l * 0.8 + px * w, by + sa * l * 0.8 + py * w], m2 = [bx + ca * l * 0.8 - px * w, by + sa * l * 0.8 - py * w], tip = [bx + ca * l, by + sa * l];
    const lightSide = (px + py) < 0;
    o.push(`<polygon points="${poly([b1, m1, tip, m2, b2])}" fill="${P[1]}" stroke="#14061e" stroke-width="3" stroke-linejoin="round"/>`);
    o.push(`<polygon points="${poly([b1, m1, tip, [bx + ca * l * 0.85, by + sa * l * 0.85], [bx, by]])}" fill="${lightSide ? P[0] : P[2]}" opacity="0.85"/>`);
    o.push(`<path d="M${f1(bx)},${f1(by)} L${f1(tip[0])},${f1(tip[1])}" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>`);
  }
  o.push(hexPrism(x, y, R * 0.42, r() * 1, P));
  for (let i = 0; i < 3; i++) { const a = r() * Math.PI * 2, d = R * (0.55 + r() * 0.2); o.push(hexPrism(x + Math.cos(a) * d, y + Math.sin(a) * d, R * (0.13 + r() * 0.1), r(), P)); }
  return glow(x, y, R * 2.4, pal ? "cyan" : "magenta") + `<g filter="url(#soft)">${o.join("")}</g>` + `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(R * 0.12)}" fill="#fff" opacity="0.8" filter="url(#glow)"/>`;
}
function rock(x, y, R, r, col = "#4a4858") {
  const pts = blobPts(x, y, R, R * (0.7 + r() * 0.3), r, 7, 0.35, r() * 6);
  return `<g filter="url(#soft)"><polygon points="${poly(pts)}" fill="${col}" stroke="#0e0c14" stroke-width="4" stroke-linejoin="round"/><polygon points="${poly(pts.map(([px, py]) => [x + (px - x) * 0.55 - R * 0.12, y + (py - y) * 0.55 - R * 0.12]))}" fill="rgba(255,255,255,0.1)"/></g>`;
}
/** Пламя: слои языков огня + отсвет. */
function fire(x, y, s, r) {
  const o = [glow(x, y, 280 * s, "fire")];
  o.push(`<path d="${blob(x, y, 50 * s, 44 * s, r, 13, 0.9)}" fill="#e0400a" opacity="0.9" filter="url(#glow)"/>`);
  o.push(`<path d="${blob(x, y, 36 * s, 32 * s, r, 11, 0.8)}" fill="#ff8a1e"/>`, `<path d="${blob(x, y, 22 * s, 19 * s, r, 9, 0.7)}" fill="#ffd860"/>`, `<path d="${blob(x, y, 9 * s, 8 * s, r, 7, 0.5)}" fill="#fff6c8"/>`);
  for (let i = 0; i < 6; i++) o.push(`<circle cx="${f1(x + (r() - 0.3) * 120 * s)}" cy="${f1(y + (r() - 0.7) * 120 * s)}" r="${f1(2 + r() * 2.5)}" fill="#ffc060" filter="url(#glow)"/>`);
  return o.join("");
}
const smoke = (x, y, s, r) => { const o = []; for (let i = 0; i < 5; i++) o.push(`<circle cx="${f1(x + i * 40 * s + (r() - 0.5) * 30)}" cy="${f1(y - i * 30 * s + (r() - 0.5) * 30)}" r="${f1((40 + i * 16) * s)}" fill="rgba(60,60,66,${f1(0.32 - i * 0.04)})"/>`); return `<g filter="url(#${K}-blur)">${o.join("")}</g>`; };
/** Обломок обшивки: неровный металлический осколок. */
function shard(x, y, R, r) {
  const pts = blobPts(x, y, R, R * 0.6, r, 5, 0.8, r() * 6);
  return `<g filter="url(#soft)"><polygon points="${poly(pts)}" fill="#7a828c" stroke="#15181c" stroke-width="3"/><path d="M${f1(pts[0][0])},${f1(pts[0][1])} L${f1(pts[2][0])},${f1(pts[2][1])}" stroke="rgba(0,0,0,0.35)" stroke-width="2"/><polygon points="${poly(pts.slice(0, 3))}" fill="rgba(20,16,12,0.45)"/></g>`;
}
/** Яйцо (вид сверху) с прожилками; open — вылупившееся. */
function egg(x, y, R, r, open = false) {
  if (open) {
    const pet = [];
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + r(); pet.push(`<path d="M${f1(x)},${f1(y)} Q${f1(x + Math.cos(a - 0.5) * R * 1.4)},${f1(y + Math.sin(a - 0.5) * R * 1.4)} ${f1(x + Math.cos(a) * R * 1.3)},${f1(y + Math.sin(a) * R * 1.3)} Q${f1(x + Math.cos(a + 0.5) * R * 1.4)},${f1(y + Math.sin(a + 0.5) * R * 1.4)} ${f1(x)},${f1(y)}Z" fill="#8a8a5a" stroke="#1c1a10" stroke-width="3"/>`); }
    return `<g filter="url(#soft)">${pet.join("")}<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(R * 0.6)}" fill="#141008"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(R * 0.4)}" fill="rgba(190,255,120,0.35)"/></g>`;
  }
  const v = [];
  for (let i = 0; i < 4; i++) { const a = r() * Math.PI * 2; v.push(`<path d="M${f1(x + Math.cos(a) * R * 0.9)},${f1(y + Math.sin(a) * R * 0.9)} Q${f1(x + Math.cos(a + 0.6) * R * 0.4)},${f1(y + Math.sin(a + 0.6) * R * 0.4)} ${f1(x + (r() - 0.5) * R * 0.3)},${f1(y + (r() - 0.5) * R * 0.3)}" stroke="#5a7a2a" stroke-width="2.5" fill="none"/>`); }
  return `<g filter="url(#soft)"><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(R)}" ry="${f1(R * 0.92)}" fill="${u("egg")}" stroke="#1c1a10" stroke-width="3"/>${v.join("")}<path d="M${f1(x - R * 0.2)},${f1(y - R * 0.5)} q${f1(R * 0.25)},${f1(-R * 0.15)} ${f1(R * 0.5)},0" stroke="rgba(255,255,255,0.6)" stroke-width="3" fill="none"/></g>`;
}
/** Сломанная колонна (вид сверху). */
function pillar(x, y, R, broken, r) {
  const fl = [];
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; fl.push(`<circle cx="${f1(x + Math.cos(a) * R * 0.86)}" cy="${f1(y + Math.sin(a) * R * 0.86)}" r="${f1(R * 0.14)}" fill="rgba(20,24,28,0.4)"/>`); }
  return `<g filter="url(#soft)"><rect x="${f1(x - R * 1.25)}" y="${f1(y - R * 1.25)}" width="${f1(R * 2.5)}" height="${f1(R * 2.5)}" rx="6" fill="#4d555c" stroke="#15191c" stroke-width="4"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(R)}" fill="#7c868e" stroke="#15191c" stroke-width="4"/>${fl.join("")}
    ${broken ? `<path d="${blob(x, y, R * 0.6, R * 0.5, r, 7, 0.7)}" fill="#5c656c"/>` : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(R * 0.45)}" fill="none" stroke="#5ff0d8" stroke-width="3" opacity="0.8" filter="url(#glow)"/>`}</g>`;
}
function block(x, y, w, h, rot) {
  return `<g filter="url(#soft)" transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})"><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="5" fill="#6a737a" stroke="#15191c" stroke-width="4"/><rect x="${f1(x - w / 2 + 8)}" y="${f1(y - h / 2 + 8)}" width="${f1(w - 16)}" height="${f1(h * 0.3)}" fill="rgba(255,255,255,0.1)"/><path d="M${f1(x - w / 4)},${f1(y)} h${f1(w / 2)} m${f1(-w / 4)},-12 v24" stroke="#4ad8c4" stroke-width="3" opacity="0.6"/></g>`;
}
function vine(pts, r) { return `<path d="${smooth(pts, false)}" stroke="#1d3a26" stroke-width="12" fill="none" stroke-linecap="round"/><path d="${smooth(pts, false)}" stroke="#3a7a4a" stroke-width="6" fill="none" stroke-linecap="round"/>` + pts.slice(1, -1).map(([x, y]) => `<ellipse cx="${f1(x + 10)}" cy="${f1(y - 8)}" rx="14" ry="8" fill="#4a8a5a" transform="rotate(${f1(r() * 180)} ${f1(x + 10)} ${f1(y - 8)})"/>`).join(""); }

/* ---------- рисунок ---------- */
function draw() {
  const r = rng(K + "-props");
  const L = [];
  // Грунт: основа и подложки зон с мягкими краями.
  L.push(`<rect width="${W}" height="${H}" fill="#14201f"/>`);
  const ground = { thicket: "#12302c", crash: "#2a221c", spires: "#3a3446", nest: "#2a1a24", swamp: "#2a301a", ruins: "#232c26" };
  L.push(`<g filter="url(#${K}-feather)">${Object.entries(ground).map(([k, c]) => `<polygon points="${poly(ZP[k])}" fill="${c}"/>`).join("")}</g>`);
  L.push(`<rect width="${W}" height="${H}" filter="url(#${K}-mottle)" opacity="0.8"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="#000" filter="url(#grain)" opacity="0.55"/>`);

  /* --- Древние руины: ступенчатая платформа, колонны, глифы, лианы --- */
  const PX = 520, PY = 1580;
  for (let k = 0; k < 4; k++) {
    const w = 640 - k * 80, h = 580 - k * 80;
    L.push(`<rect x="${PX - w / 2}" y="${PY - h / 2}" width="${w}" height="${h}" rx="6" fill="${k === 3 ? u("stones") : `rgb(${70 + k * 10},${76 + k * 10},${80 + k * 10})`}" stroke="#101418" stroke-width="5" ${k === 0 ? 'filter="url(#wallshadow)"' : ""}/>`);
    if (k < 3) L.push(`<rect x="${PX - w / 2 + 6}" y="${PY - h / 2 + 6}" width="${w - 12}" height="${h - 12}" rx="4" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>`);
  }
  L.push(`<rect x="${PX - 80}" y="${PY + 160}" width="160" height="140" fill="#2a3034"/>${[0, 1, 2, 3].map(i => `<rect x="${PX - 76}" y="${PY + 164 + i * 34}" width="152" height="30" fill="rgb(${120 - i * 14},${126 - i * 14},${130 - i * 14})" stroke="#15191c" stroke-width="2"/>`).join("")}`);
  L.push(`<rect x="${PX - 320}" y="${PY - 290}" width="640" height="580" fill="#000" filter="url(#grain)" opacity="0.35"/>`);
  // Алтарь-глиф на верхней площадке.
  L.push(`<g filter="url(#glow)"><circle cx="${PX}" cy="${PY + 85}" r="62" fill="none" stroke="#5ff0d8" stroke-width="4" opacity="0.85"/><circle cx="${PX}" cy="${PY + 85}" r="40" fill="none" stroke="#5ff0d8" stroke-width="2" stroke-dasharray="10 8"/>${[0, 1, 2, 3, 4, 5].map(i => { const a = i / 6 * Math.PI * 2; return `<path d="M${f1(PX + Math.cos(a) * 44)},${f1(PY + 85 + Math.sin(a) * 44)} L${f1(PX + Math.cos(a) * 70)},${f1(PY + 85 + Math.sin(a) * 70)}" stroke="#5ff0d8" stroke-width="4"/>`; }).join("")}<circle cx="${PX}" cy="${PY + 85}" r="12" fill="#bffff4"/></g>`, glow(PX, PY + 85, 220));
  for (const [x, y, b] of [[PX - 200, PY - 190, false], [PX + 200, PY - 190, true], [PX - 200, PY + 190, true], [PX + 200, PY + 190, false]]) L.push(pillar(x, y, 30, b, r));
  L.push(pillar(130, 1250, 34, true, r), pillar(920, 1330, 32, false, r), pillar(110, 1930, 30, true, r), block(940, 1900, 150, 80, 22), block(150, 1720, 120, 70, -40), block(890, 1520, 110, 60, 64), block(230, 1360, 90, 60, 12), block(700, 1950, 130, 60, -8));
  L.push(vine([[PX - 320, PY - 120], [PX - 260, PY - 60], [PX - 300, PY + 40], [PX - 230, PY + 120]], r), vine([[PX + 300, PY + 290], [PX + 250, PY + 230], [PX + 290, PY + 150], [PX + 230, PY + 80]], r), vine([[60, 1500], [140, 1560], [100, 1640], [180, 1700]], r));
  for (const p of scatter("ruins", 10, r, { margin: 50, avoid: [[PX - 340, PY - 310, PX + 340, PY + 310]] })) L.push(fern(p[0], p[1], r, "#2f6a52", 6, 50));

  /* --- Светящаяся чаща: деревья, грибы, папоротники, затемнение --- */
  const avoidT = [box("thicket", 260, 70, 90)];
  for (const p of scatter("thicket", 40, r, { margin: 40, avoid: avoidT })) L.push(fern(p[0], p[1], r, r() < 0.5 ? "#2f7a6a" : "#5a3a8a", 7, 55));
  for (const p of scatter("thicket", 9, r, { margin: 60, avoid: avoidT, minGap: 150 })) L.push(mushrooms(p[0], p[1], r, r() < 0.4));
  const trees = scatter("thicket", 18, r, { margin: 30, avoid: [box("thicket", 280, 110, 120)], minGap: 170 });
  L.push(`<polygon points="${poly(ZP.thicket)}" fill="rgba(0,6,14,0.45)" filter="url(#${K}-feather)"/>`);
  for (const p of trees) L.push(r() < 0.35 ? frond(p[0], p[1], 90 + r() * 50, r) : tree(p[0], p[1], 90 + r() * 60, r, Math.floor(r() * 3)));
  for (const p of scatter("thicket", 30, r, { margin: 20 })) L.push(`<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(2 + r() * 3)}" fill="#aaffee" filter="url(#glow)" opacity="0.8"/>`);

  /* --- Кристаллические шпили: край плато, валуны, кристаллы --- */
  const rim = chain(E.crashSpires, E.spiresNest);
  L.push(`<path d="${smooth(rim, false)}" stroke="#0e0c14" stroke-width="70" fill="none" stroke-linecap="round" filter="url(#wallshadow)"/><path d="${smooth(rim, false)}" stroke="#585266" stroke-width="44" fill="none" stroke-linecap="round" transform="translate(14,-14)"/><path d="${smooth(rim, false)}" stroke="#77708a" stroke-width="14" fill="none" stroke-linecap="round" transform="translate(26,-26)"/>`);
  for (let i = 0; i < rim.length - 1; i++) for (let k = 0; k < 5; k++) { const t = r(), x = rim[i][0] + (rim[i + 1][0] - rim[i][0]) * t + 30, y = rim[i][1] + (rim[i + 1][1] - rim[i][1]) * t - 30; L.push(rock(x, y, 22 + r() * 24, r, "#625b72")); }
  const avoidS = [box("spires", 280, 80, 90)];
  for (const p of scatter("spires", 12, r, { margin: 80, avoid: avoidS })) L.push(rock(p[0], p[1], 20 + r() * 40, r, "#4e4860"));
  const cr = [[2250, 200, 130, 0], [2700, 170, 150, 1], [2900, 420, 110, 0], [2280, 520, 100, 1], [2850, 800, 120, 1], [2500, 860, 90, 0], [2560, 330, 70, 0], [2130, 380, 60, 1]];
  for (const [x, y, R, p] of cr) L.push(crystals(x, y, R, r, p));

  /* --- Место крушения: борозда, обломки челнока, пожар, дым --- */
  const furrow = [[1150, -40], [1220, 160], [1330, 360], [1470, 540]];
  L.push(`<path d="${smooth(furrow, false)}" stroke="#4a3a2c" stroke-width="210" fill="none" stroke-linecap="round" opacity="0.9" filter="url(#${K}-feather)"/><path d="${smooth(furrow, false)}" stroke="#0f0b08" stroke-width="140" fill="none" stroke-linecap="round" filter="url(#${K}-feather)"/>`);
  L.push(`<path d="${smooth(furrow.map(([x, y]) => [x - 110, y + 60]), false)}" stroke="#5a4634" stroke-width="40" fill="none" stroke-linecap="round" filter="url(#${K}-feather)"/><path d="${smooth(furrow.map(([x, y]) => [x + 100, y - 50]), false)}" stroke="#5a4634" stroke-width="40" fill="none" stroke-linecap="round" filter="url(#${K}-feather)"/>`);
  for (const p of [[1300, 620], [1650, 820], [1820, 980], [1280, 900], [1560, 470]]) L.push(`<path d="${blob(p[0], p[1], 150 + r() * 60, 110 + r() * 50, r, 9, 0.5)}" fill="rgba(8,6,4,0.55)" filter="url(#${K}-feather)"/>`);
  L.push(`<path d="M1060,180 L1150,140 M1340,90 L1280,190 M1420,300 L1340,380" stroke="#0c0906" stroke-width="10" stroke-linecap="round" opacity="0.6"/>`);
  // Фюзеляж челнока (повёрнут вдоль траектории).
  const FX = 1640, FY = 720, FA = 40;
  L.push(`<g transform="rotate(${FA} ${FX} ${FY})" filter="url(#soft)">
    <path d="M${FX - 300},${FY - 90} L${FX + 120},${FY - 100} L${FX + 170},${FY - 60} L${FX + 140},${FY - 20} L${FX + 190},${FY + 30} L${FX + 130},${FY + 100} L${FX - 300},${FY + 90} Z" fill="${u("hull")}" stroke="#15181c" stroke-width="6"/>
    <path d="M${FX - 280},${FY - 40} H${FX + 120} M${FX - 280},${FY + 40} H${FX + 120} M${FX - 150},${FY - 92} V${FY + 92} M${FX}, ${FY - 96} V${FY + 96}" stroke="rgba(0,0,0,0.28)" stroke-width="3" fill="none"/>
    <path d="M${FX - 290},${FY - 88} L${FX + 100},${FY - 98} L${FX + 100},${FY - 80} L${FX - 290},${FY - 70} Z" fill="#d06a24"/>
    <path d="M${FX - 120},${FY - 30} L${FX - 40},${FY - 70} L${FX + 30},${FY - 10} L${FX - 30},${FY + 50} L${FX - 110},${FY + 30} Z" fill="#1a1612"/>
    <path d="M${FX - 100},${FY - 20} L${FX - 50},${FY - 50} L${FX + 10},${FY - 10} L${FX - 40},${FY + 30} Z" fill="#3a2a1a"/>
    ${[-1, 0, 1].map(s => `<rect x="${FX - 345}" y="${FY + s * 50 - 22}" width="50" height="44" rx="6" fill="#2a2d31" stroke="#111" stroke-width="3"/>`).join("")}
    <path d="M${FX - 160},${FY + 90} L${FX - 300},${FY + 260} L${FX - 360},${FY + 250} L${FX - 280},${FY + 90} Z" fill="#6a727c" stroke="#15181c" stroke-width="5"/>
  </g>`);
  // Оторванная носовая часть и крыло.
  L.push(`<g transform="rotate(-25 1890 960)" filter="url(#soft)"><path d="M1800,900 L1900,890 C1960,900 2000,930 2010,960 C2000,990 1960,1020 1900,1030 L1800,1020 L1820,990 L1790,960 L1815,930 Z" fill="${u("hull")}" stroke="#15181c" stroke-width="5"/><path d="M1930,935 C1965,945 1985,955 1990,962 C1985,972 1965,980 1930,988 Z" fill="#12324a" stroke="#0b1520" stroke-width="3"/><path d="M1800,900 L1815,930 L1790,960 L1820,990 L1800,1020" stroke="#1a1612" stroke-width="10" fill="none"/></g>`);
  L.push(`<g transform="rotate(-62 1290 830)" filter="url(#soft)"><path d="M1170,790 L1420,770 L1440,840 L1330,860 L1300,880 L1260,850 L1170,860 Z" fill="#6a727c" stroke="#15181c" stroke-width="5"/><path d="M1200,810 H1400 M1220,840 H1330" stroke="rgba(0,0,0,0.3)" stroke-width="3"/><path d="M1380,775 L1420,770 L1440,840 L1400,845 Z" fill="#d06a24"/></g>`);
  // Поваленные деревья вдоль борозды.
  for (const [x, y, a, l] of [[1060, 330, 20, 300], [1440, 180, 150, 280], [1230, 560, 200, 240], [1780, 250, 100, 220]]) {
    const rad = a * Math.PI / 180, x2 = x + Math.cos(rad) * l, y2 = y + Math.sin(rad) * l;
    L.push(`<g filter="url(#soft)"><path d="M${x},${y} L${f1(x2)},${f1(y2)}" stroke="#1e1410" stroke-width="40" stroke-linecap="round"/><path d="M${x},${y} L${f1(x2)},${f1(y2)}" stroke="#4a3428" stroke-width="28" stroke-linecap="round"/><path d="M${x},${y} L${f1(x2)},${f1(y2)}" stroke="#6a4c38" stroke-width="6" stroke-linecap="round" transform="translate(-5,-5)"/><circle cx="${x}" cy="${y}" r="22" fill="#3a2a1e" stroke="#1e1410" stroke-width="4"/><circle cx="${x}" cy="${y}" r="10" fill="#6a4c38"/></g>`);
    L.push(`<g opacity="0.85">${tree(x2, y2, 70, r, 1).replace(/<g filter="url\(#glow\)">[\s\S]*$/, "")}</g>`);
  }
  // Выпавший груз.
  for (const [x, y, rot, c] of [[1200, 1000, 20, "#3a6a8a"], [1290, 1060, -15, "#8a5a2a"], [1760, 1090, 35, "#3a6a8a"], [1980, 780, 10, "#8a5a2a"]]) L.push(`<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})"><rect x="${x - 45}" y="${y - 35}" width="90" height="70" rx="5" fill="${c}" stroke="#101215" stroke-width="4"/><rect x="${x - 37}" y="${y - 27}" width="74" height="54" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2.5"/><rect x="${x - 25}" y="${y - 5}" width="50" height="10" fill="#e0aa22"/></g>`);
  for (const p of scatter("crash", 26, r, { margin: 50, avoid: [box("crash", 290, 70, 90), [1350, 520, 1880, 950]] })) L.push(shard(p[0], p[1], 14 + r() * 26, r));
  L.push(`<path d="M1460,610 C1500,560 1560,580 1600,540" stroke="#1a1a1a" stroke-width="7" fill="none"/><path d="M1700,860 C1740,900 1720,960 1770,990" stroke="#2a2a2a" stroke-width="6" fill="none"/>`);
  // Пожар и дым.
  for (const [x, y, s] of [[1700, 640, 1.7], [1290, 920, 1.3], [1860, 1010, 1.1], [1540, 470, 1.0], [1580, 860, 0.9], [1120, 760, 0.8], [1450, 300, 0.7]]) L.push(fire(x, y, s, r));
  L.push(smoke(1700, 600, 1.8, r), smoke(1300, 880, 1.3, r), smoke(1860, 980, 1.2, r), smoke(1540, 440, 1, r));

  /* --- Кислотное болото: грязь, лужи кислоты, пузыри, тростник, коряги --- */
  const pools = [[1300, 1490, 170, 100], [1830, 1470, 200, 110], [1320, 1880, 210, 100], [1820, 1880, 230, 105], [1560, 1440, 80, 50], [1100, 1700, 0, 0], [1960, 1700, 60, 120]];
  for (const [x, y, rx, ry] of pools) if (rx) {
    const d = blob(x, y, rx, ry, r, 14, 0.42);
    L.push(glow(x, y, Math.max(rx, ry) * 1.8, "acidglow"));
    L.push(`<path d="${d}" fill="#1c2410" stroke="#0c1006" stroke-width="16" transform="translate(4,6)"/><path d="${d}" fill="${u("acid")}" stroke="#4a6a1a" stroke-width="5"/>`);
    for (let i = 0; i < 6; i++) { const bx = x + (r() - 0.5) * rx * 1.2, by = y + (r() - 0.5) * ry * 1.1, br = 4 + r() * 9; L.push(`<circle cx="${f1(bx)}" cy="${f1(by)}" r="${f1(br)}" fill="none" stroke="#f6ffb0" stroke-width="2.5" opacity="0.85"/><circle cx="${f1(bx - br * 0.3)}" cy="${f1(by - br * 0.3)}" r="${f1(br * 0.25)}" fill="#fff"/>`); }
  }
  for (const [x, y, rx, ry] of [[1150, 1420, 70, 40], [1580, 1940, 90, 40], [1100, 1950, 60, 30], [1560, 1530, 60, 30]]) L.push(`<path d="${blob(x, y, rx, ry, r, 10, 0.4)}" fill="#0e1608" stroke="#2a3a12" stroke-width="4" opacity="0.9"/><path d="${blob(x - rx * 0.2, y - ry * 0.2, rx * 0.4, ry * 0.25, r, 6, 0.3)}" fill="rgba(160,220,80,0.18)"/>`);
  L.push(`<g opacity="0.5" filter="url(#${K}-blur)"><ellipse cx="1830" cy="1440" rx="160" ry="60" fill="rgba(200,255,120,0.35)"/><ellipse cx="1320" cy="1860" rx="160" ry="50" fill="rgba(200,255,120,0.3)"/></g>`);
  const avoidW = [box("swamp", 270, 70, 85)];
  for (const p of scatter("swamp", 22, r, { margin: 40, avoid: avoidW })) {
    if (pools.some(([x, y, rx, ry]) => rx && ((p[0] - x) / rx) ** 2 + ((p[1] - y) / ry) ** 2 < 1.3)) continue;
    const reeds = [];
    for (let i = 0; i < 7; i++) { const a = r() * Math.PI * 2, l = 20 + r() * 30; reeds.push(`<path d="M${f1(p[0])},${f1(p[1])} l${f1(Math.cos(a) * l)},${f1(Math.sin(a) * l)}" stroke="${r() < 0.5 ? "#6a7a2a" : "#4a5a1a"}" stroke-width="4" stroke-linecap="round"/><circle cx="${f1(p[0] + Math.cos(a) * l)}" cy="${f1(p[1] + Math.sin(a) * l)}" r="4" fill="#c8e05a"/>`); }
    L.push(`<g filter="url(#soft)">${reeds.join("")}</g>`);
  }
  L.push(`<g filter="url(#soft)"><path d="M1560,1600 C1640,1580 1720,1600 1800,1580" stroke="#2a1e14" stroke-width="34" stroke-linecap="round" fill="none"/><path d="M1560,1600 C1640,1580 1720,1600 1800,1580" stroke="#4a3624" stroke-width="20" stroke-linecap="round" fill="none"/><path d="M1680,1590 l30,-40 M1740,1590 l20,40" stroke="#3a2a1a" stroke-width="10" stroke-linecap="round"/></g>`);
  L.push(`<g filter="url(#soft)"><path d="M1130,1780 C1180,1800 1200,1760 1250,1770" stroke="#2a1e14" stroke-width="26" stroke-linecap="round" fill="none"/><path d="M1130,1780 C1180,1800 1200,1760 1250,1770" stroke="#4a3624" stroke-width="14" stroke-linecap="round" fill="none"/></g>`);

  /* --- Гнездо: смоляные гребни, слизь, яйца, кости, затемнение --- */
  const NC = [2560, 1480];
  L.push(`<polygon points="${poly(ZP.nest)}" fill="rgba(4,0,8,0.5)" filter="url(#${K}-feather)"/>`);
  for (const [x, y, rx, ry] of [[2300, 1300, 120, 70], [2800, 1700, 150, 80], [2400, 1880, 120, 60], [2900, 1250, 80, 60]]) L.push(`<path d="${blob(x, y, rx, ry, r, 9, 0.35)}" fill="${u("slime")}" stroke="rgba(200,240,170,0.5)" stroke-width="3"/><path d="${blob(x - rx * 0.2, y - ry * 0.25, rx * 0.3, ry * 0.2, r, 6, 0.3)}" fill="rgba(255,255,255,0.35)"/>`);
  L.push(`<g clip-path="url(#${K}-clip-nest)">`);
  for (let i = 0; i < 40; i++) { const x = 2050 + r() * 950, y = 950 + r() * 1050; L.push(`<path d="M${f1(x)},${f1(y)} q${f1((r() - 0.5) * 160)},${f1((r() - 0.5) * 160)} ${f1((r() - 0.5) * 260)},${f1((r() - 0.5) * 260)}" stroke="rgba(90,50,80,0.3)" stroke-width="${f1(4 + r() * 6)}" fill="none" stroke-linecap="round"/>`); }
  // Смоляные курганы-ульи с норами и нити паутины между ними.
  const mounds = [[2200, 1080, 110], [2950, 1080, 120], [2950, 1960, 140], [2230, 1960, 120], [2600, 1180, 80], [2120, 1700, 70], [2880, 1380, 70]];
  for (let i = 0; i < mounds.length; i++) for (const j of [(i + 1) % mounds.length, (i + 3) % mounds.length]) {
    const [x1, y1] = mounds[i], [x2, y2] = mounds[j];
    L.push(`<path d="M${x1},${y1} Q${f1((x1 + x2) / 2 + (r() - 0.5) * 120)},${f1((y1 + y2) / 2 + (r() - 0.5) * 120)} ${x2},${y2}" stroke="rgba(220,215,190,0.22)" stroke-width="3" fill="none"/>`);
  }
  for (const [x, y, R] of mounds) {
    const o = [`<path d="${blob(x, y, R * 1.15, R, r, 11, 0.3)}" fill="#24161f" stroke="#0a0508" stroke-width="5"/>`];
    for (let k = 1; k < 4; k++) o.push(`<path d="${blob(x - k * 4, y - k * 4, R * (1 - k * 0.2), R * (0.9 - k * 0.18), r, 10, 0.25)}" fill="none" stroke="${k % 2 ? "#4a3242" : "#36222f"}" stroke-width="${12 - k * 2}"/>`);
    o.push(`<ellipse cx="${x + R * 0.1}" cy="${y + R * 0.1}" rx="${f1(R * 0.3)}" ry="${f1(R * 0.24)}" fill="#050204"/>`);
    L.push(`<g filter="url(#soft)">${o.join("")}</g><ellipse cx="${x + R * 0.1}" cy="${y + R * 0.1}" rx="${f1(R * 0.16)}" ry="${f1(R * 0.12)}" fill="rgba(200,255,120,0.35)" filter="url(#glow)"/>`);
  }
  L.push("</g>");
  const avoidN = [box("nest", 270, 75, 85)];
  const eggSpots = [[2260, 1180, 6], [2780, 1180, 7], [2300, 1760, 6], [2760, 1830, 8], [2900, 1520, 5], [2180, 1500, 4]];
  for (const [x, y, n] of eggSpots) {
    L.push(glow(x, y, 200, "sick"));
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = r() * 70; const ex = x + Math.cos(a) * d, ey = y + Math.sin(a) * d; if (avoidN.some(([x1, y1, x2, y2]) => ex > x1 && ex < x2 && ey > y1 && ey < y2)) continue; L.push(egg(ex, ey, 24 + r() * 10, r, r() < 0.18)); }
  }
  for (const p of scatter("nest", 12, r, { margin: 60, avoid: avoidN })) L.push(`<path d="M${f1(p[0])},${f1(p[1])} l${f1(30 + r() * 20)},${f1((r() - 0.5) * 30)}" stroke="#d8d0b8" stroke-width="8" stroke-linecap="round" filter="url(#soft)"/><circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="7" fill="#d8d0b8"/>`);

  /* --- Атмосфера: споры, свечение, затемнение краёв --- */
  for (let i = 0; i < 90; i++) { const x = r() * W, y = r() * H; L.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(1.5 + r() * 3)}" fill="${r() < 0.6 ? "#9cfff0" : "#f0a8ff"}" opacity="${f1(0.4 + r() * 0.5)}" filter="url(#glow)"/>`); }
  L.push(`<rect width="${W}" height="${H}" fill="${u("vignette")}"/>`);
  return L.join("\n");
}

/* ---------- зоны ---------- */
const ZONES = [
  { id: "thicket", name: "Светящаяся чаща", tags: ["cover", "difficult", "dark"], poly: ZP.thicket, label: LBL.thicket, size: 54 },
  { id: "crash", name: "Место крушения", tags: ["cover", "hazard"], poly: ZP.crash, label: LBL.crash, size: 58 },
  { id: "spires", name: "Кристаллические шпили", tags: ["elevated", "cover"], poly: ZP.spires, label: LBL.spires, size: 46 },
  { id: "nest", name: "Гнездо", tags: ["hazard", "dark"], poly: ZP.nest, label: LBL.nest, size: 64 },
  { id: "swamp", name: "Кислотное болото", tags: ["hazard", "difficult"], poly: ZP.swamp, label: LBL.swamp, size: 52 },
  { id: "ruins", name: "Древние руины", tags: ["cover", "elevated"], poly: ZP.ruins, label: LBL.ruins, size: 54 }
];
const LINKS = [
  ["thicket", "crash", "short"], ["thicket", "ruins", "short"], ["crash", "spires", "short"], ["crash", "nest", "short"],
  ["crash", "ruins", "short"], ["crash", "swamp", "short"], ["spires", "nest", "short"], ["ruins", "swamp", "short"], ["swamp", "nest", "short"]
];

export default {
  key: K, name: "Джунгли чужой планеты", folder: "Чужие миры", worlds: ["scifi", "spaceopera"],
  bgColor: "#0a1012",
  extraDefs: makeDefs(),
  draw, zones: ZONES, links: LINKS,
  style: { tint: "rgba(120,255,220,0.03)", line: "rgba(140,255,220,0.85)", text: "#dcfff4" }
};
