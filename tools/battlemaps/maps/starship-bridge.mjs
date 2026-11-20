import { W, H, rng, f1, poly } from "../lib.mjs";

/* ==========================================================================
   Карта: мостик звездолёта (вид сверху, нос корабля справа)
   ========================================================================== */
const K = "starship-bridge";
const u = n => `url(#${K}-${n})`;

// Корпус: корма слева, нос (панорамное окно) справа.
const HT = 50, HB = 1950, HL = 40, XN = 2150, XF = 2950, YN1 = 760, YN2 = 1240;
const SLOPE = (YN1 - HT) / (XF - XN);
const HULL = [[HL, HT], [XN, HT], [XF, YN1], [XF, YN2], [XN, HB], [HL, HB]];
const XR = 700, XC = 1550, YA = 820, YB = 1180; // переборки: реактор | оружейная/коридор/шлюз | мостик

// Край возвышения штурвала — дуга эллипса, обрезанная корпусом (общая граница двух зон).
const EC = [2960, 1000], ERX = 660, ERY = 960;
const inHull = ([x, y]) => y > HT + (x - XN) * SLOPE && y < HB - (x - XN) * SLOPE;
const ell = t => [EC[0] + ERX * Math.cos(t), EC[1] + ERY * Math.sin(t)];
function cross(a, b) { // бисекция по углу: a внутри, b снаружи
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (inHull(ell(m))) a = m; else b = m; }
  return a;
}
const T_TOP = cross(Math.PI, Math.PI * 1.5), T_BOT = cross(Math.PI, Math.PI * 0.5);
const ARC = []; // сверху вниз
for (let i = 0; i <= 16; i++) { const t = T_TOP + (T_BOT - T_TOP) * i / 16; ARC.push(ell(t).map(v => Math.round(v))); }

/* ---------- свои узоры ---------- */
function makeDefs() {
  const r = rng(K + "-defs");
  const deck = [];
  for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) {
    const x = gx * 120, y = gy * 120, s = 0.86 + r() * 0.22;
    const c = `rgb(${Math.round(64 * s)},${Math.round(72 * s)},${Math.round(84 * s)})`;
    deck.push(`<rect x="${x + 2}" y="${y + 2}" width="116" height="116" rx="4" fill="${c}" stroke="#151a21" stroke-width="3"/>`);
    deck.push(`<path d="M${x + 6},${y + 112} V${y + 6} H${x + 112}" stroke="rgba(255,255,255,0.10)" stroke-width="3" fill="none"/><path d="M${x + 8},${y + 114} H${x + 114} V${y + 8}" stroke="rgba(0,0,0,0.30)" stroke-width="3" fill="none"/>`);
    for (const [dx, dy] of [[10, 10], [110, 10], [10, 110], [110, 110]]) deck.push(`<circle cx="${x + dx}" cy="${y + dy}" r="3.2" fill="#9aa6b5" stroke="#20262e" stroke-width="1.2"/>`);
    const k = r();
    if (k < 0.28) for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) deck.push(`<path d="M${x + 22 + i * 18},${y + 22 + j * 18} l8,-6" stroke="rgba(20,24,30,0.55)" stroke-width="3" stroke-linecap="round"/>`);
    else if (k < 0.4) for (let i = 0; i < 6; i++) deck.push(`<rect x="${x + 24}" y="${y + 26 + i * 12}" width="72" height="5" rx="2" fill="#141920"/>`);
  }
  const cmd = [];
  for (let gy = 0; gy < 2; gy++) for (let gx = 0; gx < 2; gx++) {
    const x = gx * 160, y = gy * 160, s = 0.9 + r() * 0.16;
    cmd.push(`<rect x="${x + 1.5}" y="${y + 1.5}" width="157" height="157" fill="rgb(${Math.round(36 * s)},${Math.round(44 * s)},${Math.round(58 * s)})" stroke="#0c1118" stroke-width="3"/>`);
    cmd.push(`<path d="M${x + 6},${y + 154} V${y + 6} H${x + 154}" stroke="rgba(150,200,255,0.07)" stroke-width="3" fill="none"/>`);
  }
  cmd.push(`<path d="M0,160 H320 M160,0 V320" stroke="rgba(90,200,255,0.18)" stroke-width="2"/>`);
  return `
  <pattern id="${K}-deck" width="480" height="480" patternUnits="userSpaceOnUse">${deck.join("")}</pattern>
  <pattern id="${K}-cmd" width="320" height="320" patternUnits="userSpaceOnUse">${cmd.join("")}</pattern>
  <pattern id="${K}-grate" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#11161d"/><path d="M0,5 H40 M0,15 H40 M0,25 H40 M0,35 H40" stroke="#3e4855" stroke-width="5"/><path d="M0,0 V40 M20,0 V40" stroke="#56616f" stroke-width="3"/></pattern>
  <pattern id="${K}-hazard" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="60" height="60" fill="#1b1b1b"/><rect width="30" height="60" fill="#d9a520"/></pattern>
  <pattern id="${K}-dais" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="#2c3646"/><rect x="2" y="2" width="96" height="96" rx="3" fill="#33404f" stroke="#141b25" stroke-width="3"/><circle cx="50" cy="50" r="3" fill="rgba(120,220,255,0.35)"/></pattern>
  <radialGradient id="${K}-cyan"><stop offset="0" stop-color="rgba(90,210,255,0.55)"/><stop offset="0.45" stop-color="rgba(60,170,255,0.18)"/><stop offset="1" stop-color="rgba(40,140,255,0)"/></radialGradient>
  <radialGradient id="${K}-red"><stop offset="0" stop-color="rgba(255,60,50,0.6)"/><stop offset="0.45" stop-color="rgba(255,40,30,0.2)"/><stop offset="1" stop-color="rgba(255,30,20,0)"/></radialGradient>
  <radialGradient id="${K}-amber"><stop offset="0" stop-color="rgba(255,180,80,0.5)"/><stop offset="0.5" stop-color="rgba(255,140,50,0.15)"/><stop offset="1" stop-color="rgba(255,120,40,0)"/></radialGradient>
  <radialGradient id="${K}-core"><stop offset="0" stop-color="#ffffff"/><stop offset="0.25" stop-color="#c8f6ff"/><stop offset="0.6" stop-color="#3fc9ff"/><stop offset="1" stop-color="#0a4c8a"/></radialGradient>
  <radialGradient id="${K}-coreglow"><stop offset="0" stop-color="rgba(120,230,255,0.75)"/><stop offset="0.35" stop-color="rgba(60,180,255,0.3)"/><stop offset="1" stop-color="rgba(30,120,255,0)"/></radialGradient>
  <radialGradient id="${K}-planet" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="#e8b27a"/><stop offset="0.5" stop-color="#a5583a"/><stop offset="1" stop-color="#2a0f12"/></radialGradient>
  <radialGradient id="${K}-nebula"><stop offset="0" stop-color="rgba(140,70,200,0.45)"/><stop offset="0.6" stop-color="rgba(60,40,140,0.15)"/><stop offset="1" stop-color="rgba(20,20,80,0)"/></radialGradient>
  <radialGradient id="${K}-vignette" cx="50%" cy="50%" r="72%"><stop offset="0.55" stop-color="rgba(2,6,16,0)"/><stop offset="1" stop-color="rgba(2,6,16,0.7)"/></radialGradient>
  <linearGradient id="${K}-screen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d6f93"/><stop offset="1" stop-color="#0a2538"/></linearGradient>
  <linearGradient id="${K}-glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgba(140,210,255,0.05)"/><stop offset="1" stop-color="rgba(140,210,255,0.28)"/></linearGradient>`;
}

/* ---------- примитивы ---------- */
const S = (inner, rot = 0, x = 0, y = 0) => `<g filter="url(#soft)"${rot ? ` transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})"` : ""}>${inner}</g>`;

/** Кресло сверху; rot — куда смотрит (0 = вправо). */
function chair(x, y, rot = 0, big = false) {
  const k = big ? 1.75 : 1.1;
  const sw = 26 * k, sh = 27 * k;
  return S(`<rect x="${f1(x - sw)}" y="${f1(y - sh)}" width="${f1(sw * 1.9)}" height="${f1(sh * 2)}" rx="${f1(12 * k)}" fill="#2a3240" stroke="#0b0f15" stroke-width="3"/>
    <rect x="${f1(x - sw * 0.75)}" y="${f1(y - sh * 0.7)}" width="${f1(sw * 1.45)}" height="${f1(sh * 1.4)}" rx="${f1(9 * k)}" fill="${big ? "#7a2638" : "#4d5f78"}"/>
    <rect x="${f1(x - sw - 8 * k)}" y="${f1(y - sh - 2)}" width="${f1(16 * k)}" height="${f1(sh * 2 + 4)}" rx="${f1(7 * k)}" fill="#1a2029" stroke="#0b0f15" stroke-width="2"/>
    <rect x="${f1(x - sw * 0.6)}" y="${f1(y - sh - 8 * k)}" width="${f1(sw * 1.4)}" height="${f1(10 * k)}" rx="4" fill="#1e2530"/><rect x="${f1(x - sw * 0.6)}" y="${f1(y + sh - 2 * k)}" width="${f1(sw * 1.4)}" height="${f1(10 * k)}" rx="4" fill="#1e2530"/>
    ${big ? `<rect x="${f1(x + 4)}" y="${f1(y - sh - 9 * k)}" width="${f1(sw * 0.7)}" height="${f1(10 * k)}" rx="3" fill="#2dc5ff" opacity="0.8"/><rect x="${f1(x + 4)}" y="${f1(y + sh - 1)}" width="${f1(sw * 0.7)}" height="${f1(10 * k)}" rx="3" fill="#ffb347" opacity="0.8"/>` : ""}`, rot, x, y);
}

/** Пульт: прямоугольник w×h, экран на стороне, обращённой к оператору (-x до поворота). */
function console_(x, y, w, h, rot = 0, col = "#39c6ff", r) {
  const btn = [];
  for (let i = 0; i < Math.floor((h - 30) / 16); i++) btn.push(`<rect x="${f1(x + w * 0.08)}" y="${f1(y - h / 2 + 18 + i * 16)}" width="9" height="7" rx="2" fill="${["#ff5a4a", "#ffc24a", "#5aff9a", "#39c6ff"][Math.floor(r() * 4)]}" opacity="0.85"/>`);
  return S(`<rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${w}" height="${h}" rx="8" fill="#222a35" stroke="#090c11" stroke-width="4"/>
    <rect x="${f1(x - w / 2 + 4)}" y="${f1(y - h / 2 + 4)}" width="${w - 8}" height="${h - 8}" rx="6" fill="none" stroke="#45505f" stroke-width="2"/>
    <rect x="${f1(x - w / 2 + 9)}" y="${f1(y - h / 2 + 10)}" width="${f1(w * 0.42)}" height="${h - 20}" rx="4" fill="${u("screen")}" stroke="${col}" stroke-width="2.5"/>
    <path d="M${f1(x - w / 2 + 16)},${f1(y)} l${f1(w * 0.08)},-10 l${f1(w * 0.08)},14 l${f1(w * 0.1)},-18" stroke="${col}" stroke-width="2.5" fill="none" opacity="0.9"/>
    ${btn.join("")}`, rot, x, y) + `<rect x="${f1(x - w / 2 + 9)}" y="${f1(y - h / 2 + 10)}" width="${f1(w * 0.42)}" height="${h - 20}" rx="4" fill="${col}" opacity="0.18" filter="url(#glow)"${rot ? ` transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})"` : ""}/>`;
}

/** Голографический экран: парящая полупрозрачная панель. */
function holoScreen(x, y, w, h, rot = 0, col = "#5fdcff", r) {
  const bars = [];
  for (let i = 0; i < 6; i++) { const bh = 8 + r() * (h * 0.45); bars.push(`<rect x="${f1(x - w / 2 + 14 + i * (w - 28) / 6)}" y="${f1(y + h / 2 - 10 - bh)}" width="${f1((w - 28) / 6 - 6)}" height="${f1(bh)}" fill="${col}" opacity="0.45"/>`); }
  return `<g transform="rotate(${rot} ${x} ${y})" filter="url(#glow)"><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${w}" height="${h}" rx="6" fill="${col}" fill-opacity="0.12" stroke="${col}" stroke-width="3" stroke-opacity="0.9"/>
    ${bars.join("")}<path d="M${f1(x - w / 2 + 12)},${f1(y - h / 2 + 16)} H${f1(x)}" stroke="${col}" stroke-width="4" opacity="0.8"/></g>`;
}

/** Голостол: круглый пульт с проекцией звёздной карты. */
function holoTable(x, y, R) {
  return S(`<circle cx="${x}" cy="${y}" r="${R}" fill="#1c232e" stroke="#090c11" stroke-width="5"/><circle cx="${x}" cy="${y}" r="${R - 12}" fill="#0c141d" stroke="#4b5868" stroke-width="3"/>`) +
    `<g filter="url(#glow)" opacity="0.95"><circle cx="${x}" cy="${y}" r="${R - 24}" fill="rgba(80,210,255,0.12)" stroke="#6fe2ff" stroke-width="2"/>
    <ellipse cx="${x}" cy="${y}" rx="${R * 0.62}" ry="${R * 0.28}" fill="none" stroke="#6fe2ff" stroke-width="2" stroke-dasharray="6 6" transform="rotate(-25 ${x} ${y})"/>
    <ellipse cx="${x}" cy="${y}" rx="${R * 0.4}" ry="${R * 0.16}" fill="none" stroke="#ffd27a" stroke-width="2" transform="rotate(30 ${x} ${y})"/>
    <circle cx="${x}" cy="${y}" r="${R * 0.13}" fill="#ffe7a8"/><circle cx="${f1(x + R * 0.5)}" cy="${f1(y - R * 0.22)}" r="7" fill="#8fe9ff"/><circle cx="${f1(x - R * 0.3)}" cy="${f1(y + R * 0.2)}" r="5" fill="#ff9d7a"/></g>
    <circle cx="${x}" cy="${y}" r="${R * 2.6}" fill="${u("cyan")}"/>`;
}

/** Труба с бликом и фланцами в вершинах. */
function pipe(pts, w = 26, col = "#5d6774", flange = true) {
  const d = `M${pts.map(p => p.map(f1).join(",")).join(" L")}`;
  const fl = flange ? pts.map(p => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(w / 2 + 7)}" fill="#3a424d" stroke="#0b0e13" stroke-width="3"/>`).join("") : "";
  return `<g filter="url(#soft)"><path d="${d}" stroke="#0b0e13" stroke-width="${w + 8}" fill="none" stroke-linejoin="round"/><path d="${d}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linejoin="round"/>
    <path d="${d}" stroke="rgba(255,255,255,0.28)" stroke-width="${f1(w * 0.22)}" fill="none" stroke-linejoin="round" transform="translate(${f1(-w * 0.18)},${f1(-w * 0.18)})"/>${fl}</g>`;
}

/** Металлический ящик. */
function crate(x, y, w, h, rot = 0, col = "#4f5d4a") {
  return S(`<rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${w}" height="${h}" rx="5" fill="${col}" stroke="#0d1014" stroke-width="4"/>
    <rect x="${f1(x - w / 2 + 8)}" y="${f1(y - h / 2 + 8)}" width="${w - 16}" height="${h - 16}" rx="3" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.5"/>
    ${[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => `<rect x="${f1(x + sx * w / 2 - (sx > 0 ? 16 : 0))}" y="${f1(y + sy * h / 2 - (sy > 0 ? 16 : 0))}" width="16" height="16" fill="#2b3036"/>`).join("")}
    <rect x="${f1(x - w * 0.3)}" y="${f1(y - 6)}" width="${f1(w * 0.6)}" height="12" fill="#d9a520" opacity="0.85"/>`, rot, x, y);
}

/** Винтовка сверху (вдоль оси x), длина ~len. */
function rifle(x, y, len = 120, rot = 0, col = "#2b313a") {
  return `<g transform="rotate(${rot} ${x} ${y})"><rect x="${f1(x)}" y="${f1(y - 5)}" width="${f1(len * 0.55)}" height="10" rx="3" fill="${col}" stroke="#07090c" stroke-width="2"/>
    <rect x="${f1(x + len * 0.55)}" y="${f1(y - 2.5)}" width="${f1(len * 0.45)}" height="5" fill="#1a1e24"/><rect x="${f1(x + len * 0.22)}" y="${f1(y - 8)}" width="${f1(len * 0.22)}" height="5" rx="2" fill="#4c5664"/>
    <path d="M${f1(x)},${f1(y - 6)} L${f1(x - len * 0.2)},${f1(y - 9)} L${f1(x - len * 0.2)},${f1(y + 9)} L${f1(x)},${f1(y + 6)}Z" fill="#3b2f26" stroke="#07090c" stroke-width="2"/>
    <rect x="${f1(x + len * 0.4)}" y="${f1(y - 3)}" width="8" height="6" fill="#ff5a3c"/></g>`;
}

/** Скафандр на стойке. */
function suit(x, y, rot = 0, col = "#d9dde2") {
  return S(`<rect x="${x - 34}" y="${y - 22}" width="68" height="46" rx="16" fill="${col}" stroke="#2a2f36" stroke-width="3"/>
    <rect x="${x - 54}" y="${y - 14}" width="22" height="40" rx="10" fill="${col}" stroke="#2a2f36" stroke-width="3"/><rect x="${x + 32}" y="${y - 14}" width="22" height="40" rx="10" fill="${col}" stroke="#2a2f36" stroke-width="3"/>
    <rect x="${x - 26}" y="${y - 30}" width="52" height="18" rx="6" fill="#56606c"/>
    <circle cx="${x}" cy="${y + 2}" r="20" fill="#eef1f4" stroke="#2a2f36" stroke-width="3"/><path d="M${x - 13},${y + 8} q13,14 26,0" fill="#e89a2c" stroke="#7a4a10" stroke-width="2"/>`, rot, x, y);
}

/** Переборки: тёмная обводка, металл, швы. */
function bulk(segs, t = 40) {
  const d = segs.map(s => `M${s[0][0]},${s[0][1]} L${s[1][0]},${s[1][1]}`).join(" ");
  return `<g filter="url(#wallshadow)"><path d="${d}" stroke="#06080c" stroke-width="${t + 12}" stroke-linecap="square" fill="none"/><path d="${d}" stroke="#4b5563" stroke-width="${t}" stroke-linecap="square" fill="none"/>
    <path d="${d}" stroke="#6b7685" stroke-width="${t * 0.4}" stroke-linecap="square" fill="none"/><path d="${d}" stroke="#1d232b" stroke-width="${t + 2}" stroke-dasharray="3 87" fill="none"/></g>`;
}

/** Шлюзовая/обычная дверь в проёме: створки с полосами. */
function hatch(x1, y1, x2, y2, t = 40, open = 0.5, light = "#5aff9a") {
  const vert = x1 === x2, len = vert ? y2 - y1 : x2 - x1, leaf = len / 2 * (1 - open);
  const L = [];
  if (vert) {
    L.push(`<rect x="${x1 - t / 2 - 6}" y="${y1 - 10}" width="${t + 12}" height="${len + 20}" fill="#06080c"/><rect x="${x1 - t / 2}" y="${y1}" width="${t}" height="${len}" fill="${u("grate")}"/>`);
    L.push(`<rect x="${x1 - 8}" y="${y1}" width="16" height="${f1(leaf)}" fill="${u("hazard")}" stroke="#06080c" stroke-width="2"/><rect x="${x1 - 8}" y="${f1(y2 - leaf)}" width="16" height="${f1(leaf)}" fill="${u("hazard")}" stroke="#06080c" stroke-width="2"/>`);
    L.push(`<circle cx="${x1 - t / 2 - 14}" cy="${y1 - 22}" r="7" fill="${light}" filter="url(#glow)"/>`);
  } else {
    L.push(`<rect x="${x1 - 10}" y="${y1 - t / 2 - 6}" width="${len + 20}" height="${t + 12}" fill="#06080c"/><rect x="${x1}" y="${y1 - t / 2}" width="${len}" height="${t}" fill="${u("grate")}"/>`);
    L.push(`<rect x="${x1}" y="${y1 - 8}" width="${f1(leaf)}" height="16" fill="${u("hazard")}" stroke="#06080c" stroke-width="2"/><rect x="${f1(x2 - leaf)}" y="${y1 - 8}" width="${f1(leaf)}" height="16" fill="${u("hazard")}" stroke="#06080c" stroke-width="2"/>`);
    L.push(`<circle cx="${x1 - 24}" cy="${y1 - t / 2 - 14}" r="7" fill="${light}" filter="url(#glow)"/>`);
  }
  return L.join("");
}

const glow = (x, y, rad, g = "cyan") => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${rad}" fill="${u(g)}"/>`;

/* ---------- рисунок ---------- */
function draw() {
  const r = rng(K + "-props");
  const L = [];
  // Космос за корпусом.
  L.push(`<rect width="${W}" height="${H}" fill="#04060d"/>`);
  L.push(`<circle cx="2700" cy="250" r="520" fill="${u("nebula")}"/><circle cx="2850" cy="1750" r="420" fill="${u("nebula")}"/>`);
  for (let i = 0; i < 260; i++) {
    const x = r() * W, y = r() * H, s = r();
    L.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.8 + s * s * 2.6)}" fill="${s > 0.9 ? "#ffe0b0" : s > 0.8 ? "#b8dcff" : "#ffffff"}" opacity="${f1(0.35 + r() * 0.65)}"/>`);
  }
  L.push(`<circle cx="3060" cy="1880" r="300" fill="${u("planet")}"/><circle cx="3060" cy="1880" r="306" fill="none" stroke="rgba(255,190,140,0.35)" stroke-width="10" filter="url(#glow)"/>`);

  // Полы.
  L.push(`<polygon points="${poly(HULL)}" fill="${u("deck")}"/>`);
  L.push(`<rect x="${XR}" y="${YA}" width="${XC - XR}" height="${YB - YA}" fill="${u("grate")}"/>`);
  const cmdPoly = [[XC, HT], [XN, HT], ...ARC, [XN, HB], [XC, HB]];
  const helmPoly = [ARC[0], [XF, YN1], [XF, YN2], ...ARC.slice().reverse()];
  L.push(`<polygon points="${poly(cmdPoly)}" fill="${u("cmd")}"/>`);
  L.push(`<polygon points="${poly(helmPoly)}" fill="${u("dais")}"/>`);
  L.push(`<polygon points="${poly(HULL)}" fill="#000" filter="url(#grain)" opacity="0.45"/>`);

  // Реакторный отсек: предупреждающее кольцо, ядро, трубы, баки.
  const RC = [370, 760];
  L.push(`<circle cx="${RC[0]}" cy="${RC[1]}" r="300" fill="${u("hazard")}" opacity="0.9"/><circle cx="${RC[0]}" cy="${RC[1]}" r="268" fill="#151a21" stroke="#06080c" stroke-width="6"/>`);
  L.push(pipe([[RC[0], RC[1]], [RC[0], HT + 30]], 46, "#59636f", false), pipe([[RC[0], RC[1]], [HL + 30, RC[1]]], 46, "#59636f", false));
  L.push(pipe([[RC[0] + 120, RC[1] + 120], [610, 1000], [XR + 30, 1000]], 34, "#3f6f8a"));
  L.push(pipe([[RC[0] - 120, RC[1] + 120], [140, 1100], [140, 1860]], 30, "#3f6f8a"));
  L.push(pipe([[RC[0] + 140, RC[1] - 140], [600, 300], [600, HT + 30]], 30, "#7a5a3a"));
  L.push(pipe([[RC[0], RC[1] + 200], [RC[0], 1420], [560, 1420], [560, 1860]], 38, "#59636f"));
  L.push(pipe([[230, 1250], [230, 1880]], 22, "#7a5a3a", false));
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    L.push(`<rect x="${f1(RC[0] + Math.cos(a) * 205 - 22)}" y="${f1(RC[1] + Math.sin(a) * 205 - 14)}" width="44" height="28" rx="5" fill="#3a4350" stroke="#06080c" stroke-width="3" transform="rotate(${f1(a * 180 / Math.PI)} ${f1(RC[0] + Math.cos(a) * 205)} ${f1(RC[1] + Math.sin(a) * 205)})" filter="url(#soft)"/>`);
  }
  L.push(`<circle cx="${RC[0]}" cy="${RC[1]}" r="185" fill="none" stroke="#2c333d" stroke-width="22"/><circle cx="${RC[0]}" cy="${RC[1]}" r="185" fill="none" stroke="#8fe9ff" stroke-width="4" stroke-dasharray="30 18" filter="url(#glow)"/>`);
  L.push(`<circle cx="${RC[0]}" cy="${RC[1]}" r="560" fill="${u("coreglow")}"/>`);
  L.push(`<circle cx="${RC[0]}" cy="${RC[1]}" r="150" fill="${u("core")}" stroke="#0b2440" stroke-width="10"/>`);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; L.push(`<path d="M${RC[0]},${RC[1]} Q${f1(RC[0] + Math.cos(a + 0.5) * 70)},${f1(RC[1] + Math.sin(a + 0.5) * 70)} ${f1(RC[0] + Math.cos(a) * 140)},${f1(RC[1] + Math.sin(a) * 140)}" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.8" filter="url(#glow)"/>`); }
  L.push(`<circle cx="${RC[0]}" cy="${RC[1]}" r="60" fill="#ffffff" filter="url(#glow)"/>`);
  // Охладители и пульт управления реактором.
  for (const [x, y, rr] of [[380, 1260, 70], [420, 1640, 80], [180, 1500, 0]]) if (rr) L.push(S(`<circle cx="${x}" cy="${y}" r="${rr}" fill="#3d4a58" stroke="#06080c" stroke-width="5"/><circle cx="${x}" cy="${y}" r="${rr * 0.7}" fill="none" stroke="#6b7a8a" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${rr * 0.25}" fill="#2dc5ff" opacity="0.8"/><path d="M${x - rr * 0.7},${y} H${x + rr * 0.7}" stroke="#222a33" stroke-width="5"/>`));
  L.push(console_(620, 1250, 70, 170, 180, "#ffb347", r), console_(620, 560, 70, 150, 180, "#39c6ff", r));
  L.push(chair(540, 1250, 0));
  L.push(`<g opacity="0.55"><circle cx="460" cy="1060" r="40" fill="rgba(230,240,255,0.35)" filter="url(#glow)"/><circle cx="500" cy="1090" r="30" fill="rgba(230,240,255,0.25)" filter="url(#glow)"/></g>`);
  L.push(`<rect x="${HL + 40}" y="${HB - 60}" width="${XR - HL - 80}" height="22" fill="${u("hazard")}" opacity="0.8"/>`);

  // Оружейная: стойки с оружием, шкафчики, верстак, ящики.
  L.push(S(`<rect x="770" y="${HT + 30}" width="720" height="64" rx="6" fill="#2a313b" stroke="#06080c" stroke-width="4"/>`));
  for (let i = 0; i < 11; i++) L.push(rifle(800 + i * 64, HT + 130, 105, -90, i % 3 ? "#2b313a" : "#3b4450"));
  L.push(S(`<rect x="${XR + 30}" y="260" width="70" height="420" rx="5" fill="#2e3742" stroke="#06080c" stroke-width="4"/>`));
  for (let i = 0; i < 5; i++) L.push(`<rect x="${XR + 36}" y="${266 + i * 82}" width="58" height="76" rx="3" fill="#3b4654" stroke="#141a21" stroke-width="2"/><path d="M${XR + 46},${286 + i * 82} h38 M${XR + 46},${296 + i * 82} h38 M${XR + 46},${306 + i * 82} h38" stroke="#1a2028" stroke-width="3"/><circle cx="${XR + 84}" cy="${326 + i * 82}" r="4" fill="${i === 2 ? "#ff5a4a" : "#5aff9a"}"/>`);
  L.push(S(`<rect x="960" y="270" width="300" height="120" rx="8" fill="#3a3f46" stroke="#06080c" stroke-width="4"/><rect x="972" y="282" width="276" height="96" rx="5" fill="#2a2f35"/>`));
  L.push(rifle(1000, 320, 150, 0, "#4c5664"), `<circle cx="1180" cy="350" r="12" fill="#ffb347" opacity="0.8"/><rect x="1200" y="300" width="36" height="20" rx="3" fill="#5a6470"/>`);
  L.push(glow(1110, 330, 160, "amber"));
  L.push(crate(860, 640, 110, 90, 6, "#4f5d4a"), crate(800, 540, 80, 80, -8, "#5a5040"), crate(1380, 640, 120, 96, -4, "#4f5d4a"), crate(1450, 520, 80, 70, 12, "#3e4c5c"));
  L.push(S(`<rect x="1240" y="700" width="120" height="70" rx="10" fill="#2e3640" stroke="#06080c" stroke-width="4"/><circle cx="1270" cy="735" r="16" fill="#1a1f25"/><circle cx="1330" cy="735" r="16" fill="#1a1f25"/>`));

  // Шлюз: внутренняя камера, внешний люк, скафандры, кабели и опрокинутые ящики.
  const yCh = 1600;
  L.push(`<rect x="${XR + 40}" y="${yCh}" width="${XC - XR - 80}" height="${HB - yCh - 10}" fill="${u("hazard")}" opacity="0.85"/><rect x="${XR + 70}" y="${yCh + 30}" width="${XC - XR - 140}" height="${HB - yCh - 60}" fill="${u("grate")}" stroke="#06080c" stroke-width="4"/>`);
  for (let i = 0; i < 4; i++) L.push(`<path d="M${XR + 100 + i * 180},${yCh + 60} v${HB - yCh - 110}" stroke="#7b8695" stroke-width="10" stroke-linecap="round" opacity="0.7"/>`);
  for (let i = 0; i < 4; i++) L.push(suit(XR + 70, 1280 + i * 100, 90, i === 3 ? "#e8b04a" : "#d9dde2"));
  L.push(S(`<rect x="${XC - 110}" y="1240" width="70" height="300" rx="5" fill="#2e3742" stroke="#06080c" stroke-width="4"/>`));
  for (let i = 0; i < 4; i++) L.push(`<rect x="${XC - 102}" y="${1250 + i * 72}" width="54" height="64" rx="3" fill="#3a4552"/><circle cx="${XC - 75}" cy="${1282 + i * 72}" r="12" fill="#cfd6de" stroke="#2a2f36" stroke-width="2"/>`);
  L.push(crate(980, 1760, 100, 80, 28, "#5a5040"), crate(1180, 1720, 80, 80, -35, "#3e4c5c"), crate(1360, 1800, 90, 70, 72, "#4f5d4a"));
  for (let i = 0; i < 4; i++) {
    const x0 = 860 + r() * 500, y0 = 1650 + r() * 200;
    L.push(`<path d="M${f1(x0)},${f1(y0)} c${f1(60 + r() * 80)},${f1(-80 + r() * 60)} ${f1(120 + r() * 60)},${f1(40 + r() * 60)} ${f1(200 + r() * 80)},${f1(-20 + r() * 40)}" stroke="#14181e" stroke-width="13" fill="none" stroke-linecap="round" filter="url(#soft)"/><path d="M${f1(x0)},${f1(y0)} c${0},0 0,0 0,0" stroke="#ffb347" stroke-width="0"/>`);
  }
  L.push(`<path d="M${XR + 70},${yCh} H${XC - 70}" stroke="#ff4a3a" stroke-width="6" stroke-dasharray="20 14" filter="url(#glow)"/>`);
  L.push(glow(XR + 90, yCh - 30, 300, "red"), glow(XC - 90, yCh - 30, 300, "red"), `<circle cx="${XR + 90}" cy="${yCh - 30}" r="12" fill="#ff5a4a" filter="url(#glow)"/><circle cx="${XC - 90}" cy="${yCh - 30}" r="12" fill="#ff5a4a" filter="url(#glow)"/>`);

  // Центральный коридор: световые полосы, кабель-каналы, стрелки.
  L.push(`<rect x="${XR + 20}" y="${YA + 26}" width="${XC - XR - 40}" height="10" rx="5" fill="#7fe6ff" filter="url(#glow)" opacity="0.8"/><rect x="${XR + 20}" y="${YB - 36}" width="${XC - XR - 40}" height="10" rx="5" fill="#7fe6ff" filter="url(#glow)" opacity="0.8"/>`);
  L.push(pipe([[XR + 20, YA + 58], [XC - 20, YA + 58]], 16, "#3f6f8a", false), pipe([[XR + 20, YB - 60], [XC - 20, YB - 60]], 16, "#7a5a3a", false));
  for (let i = 0; i < 3; i++) L.push(`<path d="M${780 + i * 40},950 l30,50 l-30,50" stroke="rgba(120,230,255,0.35)" stroke-width="10" fill="none"/><path d="M${1350 + i * 40},950 l30,50 l-30,50" stroke="rgba(120,230,255,0.35)" stroke-width="10" fill="none"/>`);
  for (let x = XR + 120; x < XC; x += 220) L.push(glow(x, 1000, 170));

  // Командная палуба: голостол, кресло капитана, пульты по дуге, станции вдоль стен.
  L.push(`<circle cx="2050" cy="1000" r="330" fill="none" stroke="rgba(90,200,255,0.25)" stroke-width="6"/><circle cx="2050" cy="1000" r="230" fill="rgba(10,16,26,0.45)" stroke="#2c3a4c" stroke-width="10"/>`);
  L.push(holoTable(1760, 1000, 105));
  L.push(chair(2050, 1000, 0, true));
  for (const s of [-1, 1]) {
    // Дуга пультов вокруг капитана (укрытие).
    for (let i = 0; i < 3; i++) {
      const a = (s * (50 + i * 27)) * Math.PI / 180, x = 2050 + Math.cos(a) * 330, y = 1000 + Math.sin(a) * 330;
      L.push(console_(x, y, 70, 150, a * 180 / Math.PI, i === 1 ? "#ffb347" : "#39c6ff", r));
      L.push(chair(2050 + Math.cos(a) * 250, 1000 + Math.sin(a) * 250, a * 180 / Math.PI));
    }
  }
  // Станции вдоль верхней и нижней стен.
  for (const [y, rot] of [[HT + 70, -90], [HB - 70, 90]]) for (let i = 0; i < 3; i++) {
    const x = 1680 + i * 170;
    L.push(console_(x, y, 70, 140, rot, i === 1 ? "#5aff9a" : "#39c6ff", r));
    L.push(chair(x, y + (rot < 0 ? 85 : -85), rot + 180));
  }
  L.push(holoScreen(XC + 60, 520, 160, 70, 90, "#5fdcff", r), holoScreen(XC + 60, 1480, 160, 70, 90, "#ffb347", r));
  // Тактический стол и лифт.
  L.push(S(`<rect x="1700" y="360" width="300" height="80" rx="14" fill="#222a35" stroke="#090c11" stroke-width="4"/><rect x="1712" y="372" width="276" height="56" rx="8" fill="${u("screen")}" stroke="#ff7a5a" stroke-width="2.5"/>`));
  L.push(`<g filter="url(#glow)"><path d="M1730,410 l40,-20 l30,14 l50,-10 l40,22 l60,-18" stroke="#ff9a7a" stroke-width="3" fill="none"/><circle cx="1880" cy="396" r="8" fill="#ff5a4a"/></g>`);
  L.push(chair(1780, 485, -90), chair(1920, 485, -90), holoScreen(1850, 290, 220, 50, 0, "#ff8a6a", r), glow(1850, 400, 220, "amber"));
  L.push(`<circle cx="1690" cy="1720" r="80" fill="#121820" stroke="#06080c" stroke-width="6"/><circle cx="1690" cy="1720" r="66" fill="none" stroke="${u("hazard")}" stroke-width="14"/><circle cx="1690" cy="1720" r="48" fill="#2a3442" stroke="#5fdcff" stroke-width="3"/><path d="M1670,1720 l20,-22 l20,22 M1670,1740 l20,-22 l20,22" stroke="#5fdcff" stroke-width="5" fill="none"/>`);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.39; L.push(`<path d="M${f1(1760 + Math.cos(a) * 130)},${f1(1000 + Math.sin(a) * 130)} L${f1(1760 + Math.cos(a) * 200)},${f1(1000 + Math.sin(a) * 200)}" stroke="rgba(95,220,255,0.35)" stroke-width="4"/>`); }
  L.push(glow(1760, 1000, 0), glow(1700, HT + 140, 220), glow(1700, HB - 140, 220), glow(2050, 1000, 380));

  // Штурвал и навигация: ступени возвышения, пилотские кресла, навигационная голограмма.
  for (let k = 0; k < 3; k++) {
    const pts = ARC.map(([x, y]) => { const dx = x - EC[0], dy = y - EC[1]; const s = 1 - k * 0.035; return [EC[0] + dx * s, EC[1] + dy * s]; }).filter(inHull);
    L.push(`<polyline points="${poly(pts)}" fill="none" stroke="${k === 0 ? "#0b0f15" : "rgba(160,220,255,0.35)"}" stroke-width="${k === 0 ? 10 : 4}"/>`);
  }
  L.push(`<polyline points="${poly(ARC)}" fill="none" stroke="#5fdcff" stroke-width="3" opacity="0.7" filter="url(#glow)"/>`);
  L.push(console_(2830, 830, 80, 190, 0, "#39c6ff", r), console_(2830, 1170, 80, 190, 0, "#39c6ff", r));
  L.push(chair(2720, 830, 0), chair(2720, 1170, 0));
  L.push(S(`<path d="M2860,${1000 - 60} q40,60 0,120" stroke="#222a35" stroke-width="40" fill="none" stroke-linecap="round"/>`), `<path d="M2860,${1000 - 60} q40,60 0,120" stroke="#ffb347" stroke-width="6" fill="none" filter="url(#glow)"/>`);
  L.push(console_(2560, 1420, 70, 150, 40, "#5aff9a", r), chair(2500, 1370, 40));
  L.push(holoScreen(2490, 640, 170, 90, 90, "#8fe9ff", r));
  L.push(glow(2780, 1000, 420), glow(2560, 1420, 220));

  // Корпус и переборки.
  const hullSegs = [[[HL, HT], [XN, HT]], [[HL, HT], [HL, HB]], [[HL, HB], [XN, HB]]];
  L.push(bulk(hullSegs, 56));
  L.push(bulk([
    [[XR, HT], [XR, 900]], [[XR, 1100], [XR, HB]],
    [[XR, YA], [1030, YA]], [[1220, YA], [XC, YA]],
    [[XR, YB], [1030, YB]], [[1220, YB], [XC, YB]],
    [[XC, HT], [XC, 900]], [[XC, 1100], [XC, HB]],
    [[XR + 40, yCh], [XR + 70, yCh]], [[XC - 70, yCh], [XC - 40, yCh]]
  ], 36));
  L.push(hatch(XR, 900, XR, 1100, 36, 0.8, "#ffb347"), hatch(1030, YA, 1220, YA, 36, 0.85), hatch(1030, YB, 1220, YB, 36, 0.3, "#ff5a4a"), hatch(XC, 900, XC, 1100, 36, 1));
  // Внешний люк шлюза в нижней обшивке.
  L.push(`<rect x="1010" y="${HB - 40}" width="230" height="80" rx="10" fill="#06080c"/><rect x="1020" y="${HB - 32}" width="210" height="64" rx="8" fill="${u("hazard")}"/><rect x="1050" y="${HB - 20}" width="150" height="40" rx="6" fill="#3a4350" stroke="#06080c" stroke-width="4"/><circle cx="1125" cy="${HB}" r="14" fill="#ff5a4a" filter="url(#glow)"/>`);
  // Панорамное окно на носу: стекло, рама, переплёты.
  const nose = [[XN, HT], [XF, YN1], [XF, YN2], [XN, HB]];
  const nd = `M${nose.map(p => p.join(",")).join(" L")}`;
  L.push(`<path d="${nd}" stroke="#06080c" stroke-width="54" fill="none" stroke-linejoin="miter"/><path d="${nd}" stroke="#7fd4ff" stroke-width="36" fill="none" stroke-linejoin="miter" opacity="0.35"/><path d="${nd}" stroke="#e6f6ff" stroke-width="4" fill="none" opacity="0.6" transform="translate(-6,0)"/>`);
  for (let i = 0; i < nose.length - 1; i++) {
    const [a, b] = [nose[i], nose[i + 1]], n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 160);
    for (let j = 0; j <= n; j++) { const x = a[0] + (b[0] - a[0]) * j / n, y = a[1] + (b[1] - a[1]) * j / n; L.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="20" fill="#3a4350" stroke="#06080c" stroke-width="5"/>`); }
  }
  L.push(`<polygon points="${poly([[XN + 40, HT + 60], [XF - 50, YN1 + 10], [XF - 50, YN2 - 10], [XN + 40, HB - 60], [XN - 120, HB - 60], [XN - 120, HT + 60]])}" fill="${u("glass")}" opacity="0.5"/>`);
  // Свет и затемнение краёв.
  L.push(glow(RC[0], 1700, 260, "amber"));
  L.push(`<rect width="${W}" height="${H}" fill="${u("vignette")}"/>`);
  return L.join("\n");
}

/* ---------- зоны ---------- */
const ZONES = [
  { id: "reactor", name: "Реакторный отсек", tags: ["hazard"], poly: [[HL, HT], [XR, HT], [XR, HB], [HL, HB]], label: [370, 1470], size: 46 },
  { id: "armory", name: "Оружейная", tags: ["cover"], poly: [[XR, HT], [XC, HT], [XC, YA], [XR, YA]], label: [1125, 520], size: 56 },
  { id: "corridor", name: "Центральный коридор", tags: [], poly: [[XR, YA], [XC, YA], [XC, YB], [XR, YB]], label: [1125, 1022], size: 46 },
  { id: "airlock", name: "Шлюз", tags: ["hazard", "difficult"], poly: [[XR, YB], [XC, YB], [XC, HB], [XR, HB]], label: [1125, 1430], size: 60 },
  { id: "command", name: "Командная палуба", tags: ["cover"], poly: [[XC, HT], [XN, HT], ...ARC, [XN, HB], [XC, HB]], label: [1880, 1560], size: 50 },
  { id: "helm", name: "Штурвал и навигация", tags: ["elevated"], poly: [ARC[0], [XF, YN1], [XF, YN2], ...ARC.slice().reverse().slice(0, -1)], label: [2585, 1000], size: 38 }
];
const LINKS = [
  ["reactor", "corridor", "short"], ["armory", "corridor", "short"], ["airlock", "corridor", "short"],
  ["corridor", "command", "short"], ["command", "helm", "engaged"], ["armory", "command", "medium"], ["airlock", "command", "medium"]
];

export default {
  key: K, name: "Мостик звездолёта", folder: "Будущее", worlds: ["scifi", "spaceopera"],
  bgColor: "#04060d",
  extraDefs: makeDefs(),
  draw, zones: ZONES, links: LINKS,
  style: { tint: "rgba(90,200,255,0.04)", line: "rgba(120,220,255,0.9)", text: "#d8f4ff" }
};
