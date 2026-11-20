import { W, H, rng, f1, poly } from "../lib.mjs";

/* ==========================================================================
   Карта: грузовой ангар космической станции (вид сверху, выход в космос справа)
   ========================================================================== */
const K = "station-hangar";
const u = n => `url(#${K}-${n})`;

const WT = 36, WB = 1964, WL = 36; // внешние стены ангара
const XCR = 800, YCR = 700;        // диспетчерская (стекло справа и снизу)
const YF = 400;                    // край топливных магистралей
const YP = 1500, XCG = 1600;       // яма с мостками / грузовой терминал
const XB = 2450, XE = 2790;        // начало барьерной площадки, линия поля

/* ---------- свои узоры ---------- */
function makeDefs() {
  const r = rng(K + "-defs");
  const fl = [];
  for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) {
    const x = gx * 200, y = gy * 200, s = 0.88 + r() * 0.2;
    fl.push(`<rect x="${x + 2}" y="${y + 2}" width="196" height="196" fill="rgb(${Math.round(82 * s)},${Math.round(86 * s)},${Math.round(92 * s)})" stroke="#24272c" stroke-width="4"/>`);
    fl.push(`<path d="M${x + 8},${y + 192} V${y + 8} H${x + 192}" stroke="rgba(255,255,255,0.08)" stroke-width="3" fill="none"/>`);
    for (const [dx, dy] of [[14, 14], [186, 14], [14, 186], [186, 186], [100, 14], [100, 186], [14, 100], [186, 100]]) fl.push(`<circle cx="${x + dx}" cy="${y + dy}" r="3.4" fill="#a7adb5" stroke="#2a2d32" stroke-width="1.2"/>`);
    if (r() < 0.35) fl.push(`<ellipse cx="${f1(x + 50 + r() * 100)}" cy="${f1(y + 50 + r() * 100)}" rx="${f1(14 + r() * 30)}" ry="${f1(10 + r() * 20)}" fill="rgba(20,18,16,0.35)"/>`);
    if (r() < 0.3) for (let i = 0; i < 4; i++) fl.push(`<rect x="${x + 40}" y="${y + 60 + i * 22}" width="120" height="8" rx="3" fill="#2c3036"/>`);
  }
  const ctl = [];
  for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) {
    const s = 0.9 + r() * 0.15;
    ctl.push(`<rect x="${gx * 60 + 1}" y="${gy * 60 + 1}" width="58" height="58" fill="rgb(${Math.round(34 * s)},${Math.round(44 * s)},${Math.round(60 * s)})" stroke="#121924" stroke-width="2"/>`);
  }
  return `
  <pattern id="${K}-floor" width="600" height="600" patternUnits="userSpaceOnUse">${fl.join("")}</pattern>
  <pattern id="${K}-ctl" width="240" height="240" patternUnits="userSpaceOnUse">${ctl.join("")}</pattern>
  <pattern id="${K}-grate" width="36" height="36" patternUnits="userSpaceOnUse"><rect width="36" height="36" fill="rgba(10,12,16,0.55)"/><path d="M0,4 H36 M0,13 H36 M0,22 H36 M0,31 H36" stroke="#6b737e" stroke-width="4"/><path d="M0,0 V36 M18,0 V36" stroke="#8a929c" stroke-width="3"/></pattern>
  <pattern id="${K}-hazard" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="56" height="56" fill="#1d1d1d"/><rect width="28" height="56" fill="#e0aa22"/></pattern>
  <pattern id="${K}-pit" width="160" height="160" patternUnits="userSpaceOnUse"><rect width="160" height="160" fill="#0b0e13"/><path d="M0,40 H160 M0,120 H160" stroke="#1a2029" stroke-width="18"/><path d="M40,0 V160 M120,0 V160" stroke="#141a22" stroke-width="10"/><circle cx="80" cy="80" r="14" fill="#151b24" stroke="#232b36" stroke-width="4"/></pattern>
  <radialGradient id="${K}-flood"><stop offset="0" stop-color="rgba(220,235,255,0.42)"/><stop offset="0.5" stop-color="rgba(200,220,255,0.12)"/><stop offset="1" stop-color="rgba(200,220,255,0)"/></radialGradient>
  <radialGradient id="${K}-cyan"><stop offset="0" stop-color="rgba(90,210,255,0.55)"/><stop offset="0.45" stop-color="rgba(60,170,255,0.18)"/><stop offset="1" stop-color="rgba(40,140,255,0)"/></radialGradient>
  <radialGradient id="${K}-amber"><stop offset="0" stop-color="rgba(255,180,60,0.6)"/><stop offset="0.5" stop-color="rgba(255,140,30,0.18)"/><stop offset="1" stop-color="rgba(255,120,20,0)"/></radialGradient>
  <radialGradient id="${K}-green"><stop offset="0" stop-color="rgba(140,255,90,0.6)"/><stop offset="0.5" stop-color="rgba(90,230,60,0.2)"/><stop offset="1" stop-color="rgba(60,200,40,0)"/></radialGradient>
  <radialGradient id="${K}-red"><stop offset="0" stop-color="rgba(255,70,50,0.55)"/><stop offset="0.5" stop-color="rgba(255,50,30,0.15)"/><stop offset="1" stop-color="rgba(255,40,20,0)"/></radialGradient>
  <radialGradient id="${K}-engine"><stop offset="0" stop-color="#ffffff"/><stop offset="0.3" stop-color="#9fe8ff"/><stop offset="1" stop-color="rgba(40,150,255,0)"/></radialGradient>
  <radialGradient id="${K}-planet" cx="30%" cy="40%" r="75%"><stop offset="0" stop-color="#7ec8ff"/><stop offset="0.45" stop-color="#2a6fb0"/><stop offset="1" stop-color="#06142a"/></radialGradient>
  <radialGradient id="${K}-vignette" cx="50%" cy="50%" r="72%"><stop offset="0.55" stop-color="rgba(4,6,12,0)"/><stop offset="1" stop-color="rgba(4,6,12,0.68)"/></radialGradient>
  <linearGradient id="${K}-hull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3cad2"/><stop offset="0.5" stop-color="#9aa3ad"/><stop offset="1" stop-color="#5d6670"/></linearGradient>
  <linearGradient id="${K}-wing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d96a1"/><stop offset="1" stop-color="#5a626c"/></linearGradient>
  <linearGradient id="${K}-field" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgba(80,200,255,0)"/><stop offset="0.45" stop-color="rgba(120,220,255,0.55)"/><stop offset="0.55" stop-color="rgba(200,245,255,0.8)"/><stop offset="1" stop-color="rgba(80,200,255,0)"/></linearGradient>
  <linearGradient id="${K}-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="rgba(150,215,255,0.55)"/><stop offset="1" stop-color="rgba(80,150,210,0.35)"/></linearGradient>
  <linearGradient id="${K}-screen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d6f93"/><stop offset="1" stop-color="#0a2538"/></linearGradient>`;
}

/* ---------- примитивы ---------- */
const S = (inner, rot = 0, x = 0, y = 0) => `<g filter="url(#soft)"${rot ? ` transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})"` : ""}>${inner}</g>`;
const glow = (x, y, rad, g = "cyan") => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${rad}" fill="${u(g)}"/>`;

function pipe(pts, w = 26, col = "#5d6774", flange = true) {
  const d = `M${pts.map(p => p.map(f1).join(",")).join(" L")}`;
  const fl = flange ? pts.map(p => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(w / 2 + 7)}" fill="#3a424d" stroke="#0b0e13" stroke-width="3"/>`).join("") : "";
  return `<g filter="url(#soft)"><path d="${d}" stroke="#0b0e13" stroke-width="${w + 8}" fill="none" stroke-linejoin="round"/><path d="${d}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linejoin="round"/>
    <path d="${d}" stroke="rgba(255,255,255,0.3)" stroke-width="${f1(w * 0.2)}" fill="none" stroke-linejoin="round" transform="translate(0,${f1(-w * 0.22)})"/>${fl}</g>`;
}
/** Фланцы-хомуты поперёк горизонтальной трубы. */
const clamps = (x1, x2, y, w, step = 140) => { const o = []; for (let x = x1; x <= x2; x += step) o.push(`<rect x="${x - 7}" y="${f1(y - w / 2 - 7)}" width="14" height="${w + 14}" rx="3" fill="#2d333b" stroke="#0b0e13" stroke-width="2"/>`); return o.join(""); };

function valve(x, y, R = 24, col = "#c0392b") {
  const sp = [0, 1, 2, 3].map(i => { const a = i * Math.PI / 4; return `<path d="M${f1(x - Math.cos(a) * R)},${f1(y - Math.sin(a) * R)} L${f1(x + Math.cos(a) * R)},${f1(y + Math.sin(a) * R)}" stroke="${col}" stroke-width="4"/>`; }).join("");
  return S(`<circle cx="${x}" cy="${y}" r="${R}" fill="none" stroke="${col}" stroke-width="7"/>${sp}<circle cx="${x}" cy="${y}" r="7" fill="#222"/>`);
}

function chair(x, y, rot = 0) {
  return S(`<rect x="${x - 27}" y="${y - 28}" width="52" height="56" rx="12" fill="#2a3240" stroke="#0b0f15" stroke-width="3"/><rect x="${x - 20}" y="${y - 20}" width="40" height="40" rx="9" fill="#4d5f78"/>
    <rect x="${x - 35}" y="${y - 30}" width="16" height="60" rx="7" fill="#1a2029" stroke="#0b0f15" stroke-width="2"/>`, rot, x, y);
}
function console_(x, y, w, h, rot, col, r) {
  const btn = [];
  for (let i = 0; i < Math.floor((h - 30) / 16); i++) btn.push(`<rect x="${f1(x + w * 0.1)}" y="${f1(y - h / 2 + 18 + i * 16)}" width="9" height="7" rx="2" fill="${["#ff5a4a", "#ffc24a", "#5aff9a", "#39c6ff"][Math.floor(r() * 4)]}" opacity="0.85"/>`);
  const tr = rot ? ` transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})"` : "";
  return S(`<rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${w}" height="${h}" rx="8" fill="#232a33" stroke="#090c11" stroke-width="4"/>
    <rect x="${f1(x - w / 2 + 9)}" y="${f1(y - h / 2 + 10)}" width="${f1(w * 0.45)}" height="${h - 20}" rx="4" fill="${u("screen")}" stroke="${col}" stroke-width="2.5"/>
    <path d="M${f1(x - w / 2 + 16)},${f1(y)} l${f1(w * 0.08)},-10 l${f1(w * 0.08)},14 l${f1(w * 0.1)},-18" stroke="${col}" stroke-width="2.5" fill="none"/>${btn.join("")}`, rot, x, y) +
    `<rect x="${f1(x - w / 2 + 9)}" y="${f1(y - h / 2 + 10)}" width="${f1(w * 0.45)}" height="${h - 20}" rx="4" fill="${col}" opacity="0.2" filter="url(#glow)"${tr}/>`;
}
function holoScreen(x, y, w, h, rot, col, r) {
  const bars = [];
  for (let i = 0; i < 7; i++) { const bh = 8 + r() * (h * 0.5); bars.push(`<rect x="${f1(x - w / 2 + 14 + i * (w - 28) / 7)}" y="${f1(y + h / 2 - 10 - bh)}" width="${f1((w - 28) / 7 - 6)}" height="${f1(bh)}" fill="${col}" opacity="0.45"/>`); }
  return `<g transform="rotate(${rot} ${x} ${y})" filter="url(#glow)"><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${w}" height="${h}" rx="6" fill="${col}" fill-opacity="0.12" stroke="${col}" stroke-width="3"/>${bars.join("")}<path d="M${f1(x - w / 2 + 12)},${f1(y - h / 2 + 16)} H${f1(x)}" stroke="${col}" stroke-width="4" opacity="0.8"/></g>`;
}

/** Грузовой контейнер (рёбра вдоль длинной стороны). */
function container(x, y, w, h, rot, col) {
  const ribs = [];
  for (let i = 1; i < Math.floor(w / 26); i++) ribs.push(`<path d="M${f1(x - w / 2 + i * 26)},${f1(y - h / 2 + 8)} V${f1(y + h / 2 - 8)}" stroke="rgba(0,0,0,0.28)" stroke-width="5"/><path d="M${f1(x - w / 2 + i * 26 + 4)},${f1(y - h / 2 + 8)} V${f1(y + h / 2 - 8)}" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>`);
  return S(`<rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${w}" height="${h}" rx="4" fill="${col}" stroke="#101215" stroke-width="5"/>${ribs.join("")}
    ${[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => `<rect x="${f1(x + sx * w / 2 - (sx > 0 ? 18 : 0))}" y="${f1(y + sy * h / 2 - (sy > 0 ? 18 : 0))}" width="18" height="18" fill="#2a2d31"/>`).join("")}
    <rect x="${f1(x - w * 0.18)}" y="${f1(y - 14)}" width="${f1(w * 0.36)}" height="28" fill="rgba(240,240,240,0.75)"/><rect x="${f1(x - w * 0.15)}" y="${f1(y - 6)}" width="${f1(w * 0.3)}" height="12" fill="rgba(30,30,30,0.6)"/>`, rot, x, y);
}
function crate(x, y, s, rot, col = "#56604f") {
  return S(`<rect x="${f1(x - s / 2)}" y="${f1(y - s / 2)}" width="${s}" height="${s}" rx="4" fill="${col}" stroke="#101215" stroke-width="4"/><rect x="${f1(x - s / 2 + 7)}" y="${f1(y - s / 2 + 7)}" width="${s - 14}" height="${s - 14}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.5"/><rect x="${f1(x - s * 0.3)}" y="${f1(y - 5)}" width="${f1(s * 0.6)}" height="10" fill="#e0aa22" opacity="0.85"/>`, rot, x, y);
}
function pallet(x, y, rot, r) {
  const o = [`<rect x="${x - 70}" y="${y - 55}" width="140" height="110" fill="#8a6a3e" stroke="#3a2a14" stroke-width="3"/>`];
  for (let i = 0; i < 4; i++) o.push(`<rect x="${x - 62 + (i % 2) * 64}" y="${y - 48 + Math.floor(i / 2) * 50}" width="58" height="44" rx="3" fill="${["#b08a54", "#a07a44", "#c49a60"][Math.floor(r() * 3)]}" stroke="#4a3418" stroke-width="2.5"/>`);
  o.push(`<path d="M${x - 70},${y} H${x + 70}" stroke="#2a6fb0" stroke-width="5"/>`);
  return S(o.join(""), rot, x, y);
}
/** Погрузчик (вилы вперёд, по оси +x). */
function forklift(x, y, rot) {
  return S(`<rect x="${x + 70}" y="${y - 40}" width="80" height="12" fill="#9aa3ad" stroke="#222" stroke-width="2"/><rect x="${x + 70}" y="${y + 28}" width="80" height="12" fill="#9aa3ad" stroke="#222" stroke-width="2"/>
    <rect x="${x + 56}" y="${y - 52}" width="16" height="104" fill="#3a3f46"/>
    <rect x="${x - 80}" y="${y - 58}" width="138" height="116" rx="14" fill="#e0aa22" stroke="#4a3608" stroke-width="4"/>
    ${[[-60, -64], [20, -64], [-60, 52], [20, 52]].map(([dx, dy]) => `<rect x="${x + dx}" y="${y + dy}" width="40" height="12" rx="4" fill="#15171a"/>`).join("")}
    <rect x="${x - 40}" y="${y - 40}" width="80" height="80" rx="8" fill="#2a2d31" stroke="#15171a" stroke-width="3"/><rect x="${x - 30}" y="${y - 22}" width="40" height="44" rx="6" fill="#4d5f78"/>
    <rect x="${x - 80}" y="${y - 30}" width="24" height="60" rx="4" fill="#6a5010"/>`, rot, x, y);
}
/** Грузовой робот-шагоход. */
function robot(x, y, rot) {
  return S(`${[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => `<path d="M${x + sx * 30},${y + sy * 30} L${x + sx * 62},${y + sy * 58}" stroke="#3a3f46" stroke-width="16" stroke-linecap="round"/><circle cx="${x + sx * 64}" cy="${y + sy * 60}" r="14" fill="#2a2d31" stroke="#111" stroke-width="3"/>`).join("")}
    <path d="M${x + 30},${y - 34} L${x + 96},${y - 46} M${x + 30},${y + 34} L${x + 96},${y + 46}" stroke="#6b737e" stroke-width="12" stroke-linecap="round"/>
    <rect x="${x + 90}" y="${y - 58}" width="20" height="26" rx="4" fill="#e0aa22"/><rect x="${x + 90}" y="${y + 32}" width="20" height="26" rx="4" fill="#e0aa22"/>
    <rect x="${x - 44}" y="${y - 44}" width="88" height="88" rx="22" fill="#c9cfd6" stroke="#2a2d31" stroke-width="4"/><rect x="${x - 30}" y="${y - 30}" width="60" height="60" rx="14" fill="#8a929c"/>
    <circle cx="${x + 26}" cy="${y}" r="13" fill="#0b1a24" stroke="#2a2d31" stroke-width="3"/>`, rot, x, y) + `<circle cx="${x + 26 * Math.cos(rot * Math.PI / 180)}" cy="${y + 26 * Math.sin(rot * Math.PI / 180)}" r="8" fill="#ff5a3a" filter="url(#glow)"/>`;
}
/** Тележка с инструментами / топливный кар. */
function cart(x, y, rot, col = "#c0392b") {
  return S(`<rect x="${x - 60}" y="${y - 36}" width="120" height="72" rx="8" fill="${col}" stroke="#1a1a1a" stroke-width="4"/><rect x="${x - 50}" y="${y - 26}" width="60" height="52" rx="5" fill="#2a2d31"/>
    <circle cx="${x + 34}" cy="${y}" r="20" fill="#d6d9dd" stroke="#333" stroke-width="3"/><circle cx="${x + 34}" cy="${y}" r="9" fill="#888"/>`, rot, x, y);
}

/** Шаттл сверху, нос вправо. */
function ship(cx, cy) {
  const o = [];
  const B = (dx, dy) => `${f1(cx + dx)},${f1(cy + dy)}`;
  // Крылья.
  for (const s of [-1, 1]) {
    o.push(`<path d="M${B(60, s * 70)} L${B(-150, s * 330)} L${B(-260, s * 330)} L${B(-240, s * 90)} Z" fill="${u("wing")}" stroke="#1a1d22" stroke-width="5"/>`);
    o.push(`<path d="M${B(-150, s * 330)} L${B(-260, s * 330)} L${B(-256, s * 290)} L${B(-160, s * 290)} Z" fill="#c0392b"/>`);
    o.push(`<path d="M${B(10, s * 100)} L${B(-200, s * 120)} M${B(-60, s * 170)} L${B(-220, s * 180)} M${B(-110, s * 240)} L${B(-240, s * 245)}" stroke="rgba(0,0,0,0.3)" stroke-width="3"/>`);
    o.push(`<rect x="${f1(cx - 300)}" y="${f1(cy + s * 62 - 26)}" width="80" height="52" rx="10" fill="#4a525c" stroke="#1a1d22" stroke-width="4"/>`);
  }
  // Фюзеляж.
  o.push(`<path d="M${B(420, 0)} C${B(380, -70)} ${B(240, -100)} ${B(80, -100)} L${B(-260, -96)} L${B(-320, -70)} L${B(-320, 70)} L${B(-260, 96)} L${B(80, 100)} C${B(240, 100)} ${B(380, 70)} ${B(420, 0)} Z" fill="${u("hull")}" stroke="#1a1d22" stroke-width="6"/>`);
  o.push(`<path d="M${B(-260, -40)} H${B(160, -40).split(",")[0]} M${B(-260, 40)} H${B(160, 40).split(",")[0]} M${B(-100, -96)} V${B(-100, 96).split(",")[1]} M${B(60, -100)} V${B(60, 100).split(",")[1]}" stroke="rgba(0,0,0,0.25)" stroke-width="3" fill="none"/>`);
  o.push(`<rect x="${f1(cx - 220)}" y="${f1(cy - 70)}" width="190" height="140" rx="12" fill="rgba(0,0,0,0.12)" stroke="rgba(0,0,0,0.3)" stroke-width="3"/>`);
  o.push(`<path d="M${B(-240, -96)} L${B(160, -100)} L${B(160, -84)} L${B(-240, -80)} Z" fill="#e0aa22" opacity="0.9"/><path d="M${B(-240, 96)} L${B(160, 100)} L${B(160, 84)} L${B(-240, 80)} Z" fill="#e0aa22" opacity="0.9"/>`);
  // Кабина.
  o.push(`<path d="M${B(380, 0)} C${B(360, -44)} ${B(300, -58)} ${B(250, -56)} L${B(250, 56)} C${B(300, 58)} ${B(360, 44)} ${B(380, 0)} Z" fill="#12324a" stroke="#0b1520" stroke-width="5"/>`);
  o.push(`<path d="M${B(350, -18)} C${B(330, -36)} ${B(300, -42)} ${B(270, -40)}" stroke="rgba(200,240,255,0.7)" stroke-width="6" fill="none" stroke-linecap="round"/>`);
  // Двигатели.
  for (const s of [-1, 0, 1]) o.push(`<rect x="${f1(cx - 350)}" y="${f1(cy + s * 52 - 22)}" width="40" height="44" rx="6" fill="#2a2d31" stroke="#111" stroke-width="3"/>`);
  return `<g filter="url(#soft)">${o.join("")}</g>` + [-1, 0, 1].map(s => `<ellipse cx="${f1(cx - 372)}" cy="${f1(cy + s * 52)}" rx="44" ry="24" fill="${u("engine")}" opacity="0.8"/>`).join("");
}

/** Стены ангара. */
function bulk(segs, t = 40) {
  const d = segs.map(s => `M${s[0][0]},${s[0][1]} L${s[1][0]},${s[1][1]}`).join(" ");
  return `<g filter="url(#wallshadow)"><path d="${d}" stroke="#08090c" stroke-width="${t + 12}" stroke-linecap="square" fill="none"/><path d="${d}" stroke="#555c66" stroke-width="${t}" stroke-linecap="square" fill="none"/>
    <path d="${d}" stroke="#737b86" stroke-width="${t * 0.35}" stroke-linecap="square" fill="none"/><path d="${d}" stroke="#262a30" stroke-width="${t + 2}" stroke-dasharray="4 96" fill="none"/></g>`;
}
/** Стеклянная стена диспетчерской. */
function glassWall(x1, y1, x2, y2) {
  const d = `M${x1},${y1} L${x2},${y2}`, n = Math.round(Math.hypot(x2 - x1, y2 - y1) / 130), posts = [];
  for (let i = 0; i <= n; i++) posts.push(`<rect x="${f1(x1 + (x2 - x1) * i / n - 13)}" y="${f1(y1 + (y2 - y1) * i / n - 13)}" width="26" height="26" fill="#3a4049" stroke="#08090c" stroke-width="3"/>`);
  return `<path d="${d}" stroke="#08090c" stroke-width="30" fill="none"/><path d="${d}" stroke="${u("glass")}" stroke-width="22" fill="none"/><path d="${d}" stroke="rgba(255,255,255,0.65)" stroke-width="3" fill="none"/>${posts.join("")}`;
}

/* ---------- рисунок ---------- */
function draw() {
  const r = rng(K + "-props");
  const L = [];
  // Пол ангара.
  L.push(`<rect width="${W}" height="${H}" fill="${u("floor")}"/>`);
  L.push(`<rect width="${W}" height="${H}" filter="url(#dirt)" opacity="0.7"/>`);
  // Космос за барьером.
  L.push(`<rect x="${XE}" y="0" width="${W - XE}" height="${H}" fill="#03050b"/>`);
  for (let i = 0; i < 110; i++) { const s = r(); L.push(`<circle cx="${f1(XE + 20 + r() * (W - XE))}" cy="${f1(r() * H)}" r="${f1(0.8 + s * s * 2.6)}" fill="${s > 0.85 ? "#bfe0ff" : "#fff"}" opacity="${f1(0.4 + r() * 0.6)}"/>`); }
  L.push(`<circle cx="3380" cy="1300" r="560" fill="${u("planet")}"/><circle cx="3380" cy="1300" r="566" fill="none" stroke="rgba(150,220,255,0.5)" stroke-width="10" filter="url(#glow)"/>`);

  // Диспетчерская: пол, пульты вдоль стекла, кресла, голоэкран, лестница вниз.
  L.push(`<rect x="0" y="0" width="${XCR}" height="${YCR}" fill="${u("ctl")}"/>`);
  L.push(`<rect x="0" y="0" width="${XCR}" height="${YCR}" fill="#000" filter="url(#grain)" opacity="0.4"/>`);
  for (let i = 0; i < 3; i++) { L.push(console_(XCR - 70, 150 + i * 150, 70, 130, 0, i === 1 ? "#ffb347" : "#39c6ff", r), chair(XCR - 160, 150 + i * 150, 0)); }
  for (let i = 0; i < 3; i++) { L.push(console_(140 + i * 160, YCR - 70, 70, 130, 90, "#39c6ff", r), chair(140 + i * 160, YCR - 160, 90)); }
  L.push(S(`<rect x="100" y="90" width="300" height="160" rx="16" fill="#232a33" stroke="#090c11" stroke-width="4"/>`), holoScreen(250, 170, 250, 110, 0, "#5fdcff", r), glow(250, 170, 260));
  L.push(S(`<rect x="${WL + 20}" y="300" width="60" height="200" rx="6" fill="#2b323c" stroke="#090c11" stroke-width="4"/>`), `<rect x="${WL + 30}" y="320" width="40" height="160" rx="4" fill="#0b1a24" stroke="#5aff9a" stroke-width="2"/>`);
  L.push(glow(XCR - 120, 300, 330), glow(300, YCR - 120, 300));

  // Яма с подвесными мостками.
  L.push(`<rect x="${WL}" y="${YCR}" width="${XCR - WL}" height="${YP - YCR}" fill="${u("pit")}"/>`);
  L.push(pipe([[WL + 60, 820], [XCR - 40, 820]], 30, "#2c3e52", false), pipe([[WL + 60, 1420], [600, 1420], [600, YCR + 40]], 26, "#3c3226", false), pipe([[340, YCR + 40], [340, YP - 40]], 34, "#26323e", false));
  L.push(`<circle cx="520" cy="980" r="70" fill="#0f141a" stroke="#202833" stroke-width="8"/><path d="M520,910 V1050 M450,980 H590 M470,930 L570,1030 M570,930 L470,1030" stroke="#1d252f" stroke-width="10"/>`);
  L.push(glow(520, 980, 160, "red"), glow(200, 1300, 180), `<circle cx="200" cy="1300" r="10" fill="#5fdcff" filter="url(#glow)"/>`);
  L.push(`<rect x="${WL}" y="${YCR}" width="${XCR - WL}" height="${YP - YCR}" fill="rgba(0,0,0,0.35)"/>`);
  // Мостки: решётка, перила, распорки.
  const walk = (x, y, w, h) => `<g filter="url(#soft)"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2a3038"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${u("grate")}"/>` +
    (w > h ? `<path d="M${x},${y + 4} H${x + w} M${x},${y + h - 4} H${x + w}" stroke="#e0aa22" stroke-width="6"/>` : `<path d="M${x + 4},${y} V${y + h} M${x + w - 4},${y} V${y + h}" stroke="#e0aa22" stroke-width="6"/>`) + `</g>`;
  L.push(walk(WL, 1190, XCR - WL, 90), walk(130, YCR, 90, YP - YCR), walk(560, YCR, 90, 490), walk(130, 1190, 520, 90));
  L.push(`<rect x="90" y="1150" width="170" height="170" fill="#2a3038" stroke="#e0aa22" stroke-width="6" filter="url(#soft)"/><rect x="90" y="1150" width="170" height="170" fill="${u("grate")}"/>`);
  L.push(`<path d="M${WL},${YCR} H${XCR} M${XCR},${YCR} V${YP} M${WL},${YP} H${XCR}" stroke="${u("hazard")}" stroke-width="22" fill="none"/>`);

  // Топливные магистрали.
  L.push(`<rect x="${XCR}" y="0" width="${XB - XCR}" height="${YF}" fill="rgba(30,34,40,0.35)"/>`);
  L.push(pipe([[XCR, 100], [XB, 100]], 44, "#8a7a3a", false), clamps(XCR + 80, XB - 40, 100, 44));
  L.push(pipe([[XCR, 172], [XB, 172]], 34, "#4a7a5a", false), clamps(XCR + 150, XB - 40, 172, 34, 180));
  L.push(pipe([[XCR, 236], [XB, 236]], 26, "#6b737e", false), clamps(XCR + 100, XB - 40, 236, 26, 200));
  for (const [x, w] of [[880, 280], [2170, 240]]) L.push(S(`<rect x="${x}" y="270" width="${w}" height="110" rx="55" fill="#7a8794" stroke="#14181d" stroke-width="5"/><rect x="${x + 6}" y="282" width="${w - 12}" height="22" rx="11" fill="rgba(255,255,255,0.22)"/>${[0.25, 0.5, 0.75].map(k => `<path d="M${x + w * k},272 V378" stroke="#3a424d" stroke-width="8"/>`).join("")}<rect x="${x + w / 2 - 50}" y="312" width="100" height="26" fill="#e0aa22"/><text x="${x + w / 2}" y="332" text-anchor="middle" font-family="Oswald" font-size="22" fill="#222">H₂-7</text>`));
  L.push(valve(1100, 172, 26), valve(1700, 100, 30), valve(2300, 172, 26, "#e0aa22"), valve(1250, 236, 20, "#e0aa22"));
  // Разрыв и утечка.
  L.push(`<g filter="url(#glow)"><path d="M1880,236 l20,-16 l12,22 l18,-14" stroke="#ddffcc" stroke-width="4" fill="none"/></g>`);
  L.push(`<path d="M1800,250 C1760,300 1820,360 1900,380 C1980,400 2080,420 2120,380 C2160,340 2060,300 2020,280 C1960,250 1880,230 1800,250 Z" fill="rgba(120,255,80,0.45)" stroke="rgba(180,255,140,0.8)" stroke-width="4" filter="url(#glow)"/>`);
  L.push(`<ellipse cx="1760" cy="360" rx="44" ry="20" fill="rgba(120,255,80,0.4)" filter="url(#glow)"/><ellipse cx="2180" cy="370" rx="30" ry="14" fill="rgba(120,255,80,0.4)" filter="url(#glow)"/>`);
  L.push(`<g opacity="0.6">${[0, 1, 2, 3, 4].map(i => `<circle cx="${1880 + i * 34}" cy="${210 - i * 26}" r="${26 + i * 10}" fill="rgba(210,255,200,0.22)" filter="url(#glow)"/>`).join("")}</g>`);
  L.push(glow(1950, 320, 320, "green"));
  L.push(`<path d="M${XCR},${YF} H${XB}" stroke="${u("hazard")}" stroke-width="20"/>`);
  for (const x of [1000, 1400, 2400]) L.push(`<circle cx="${x}" cy="${YF - 30}" r="9" fill="#ffb347" filter="url(#glow)"/>`, glow(x, YF - 30, 120, "amber"));

  // Посадочная площадка: разметка, корабль, шланги.
  const PC = [1700, 950];
  L.push(`<circle cx="${PC[0]}" cy="${PC[1]}" r="470" fill="rgba(20,22,26,0.45)"/><circle cx="${PC[0]}" cy="${PC[1]}" r="450" fill="none" stroke="#e0aa22" stroke-width="20"/><circle cx="${PC[0]}" cy="${PC[1]}" r="410" fill="none" stroke="#e0aa22" stroke-width="5" stroke-dasharray="40 30"/>`);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; L.push(`<circle cx="${f1(PC[0] + Math.cos(a) * 450)}" cy="${f1(PC[1] + Math.sin(a) * 450)}" r="8" fill="${i % 2 ? "#ffb347" : "#fff6d0"}" filter="url(#glow)"/>`); }
  L.push(`<text x="${PC[0] - 330}" y="${PC[1] + 70}" font-family="Oswald" font-size="190" font-weight="700" fill="rgba(240,240,240,0.18)" transform="rotate(-90 ${PC[0] - 330} ${PC[1]})" text-anchor="middle">07</text>`);
  for (let i = 0; i < 4; i++) L.push(`<path d="M${2200 + i * 80},${PC[1] - 70} l50,70 l-50,70" stroke="rgba(224,170,34,0.75)" stroke-width="18" fill="none"/>`);
  L.push(`<path d="M${XCR + 40},${YP - 40} H${XCG - 40} M${XCG + 40},${YP + 40} H${XB - 40}" stroke="rgba(224,170,34,0.6)" stroke-width="10" stroke-dasharray="60 30"/>`);
  L.push(ship(PC[0] + 30, PC[1]));
  L.push(`<path d="M1500,${YF} C1500,520 1560,560 1520,700" stroke="#1a1a1a" stroke-width="18" fill="none" filter="url(#soft)"/><path d="M1500,${YF} C1500,520 1560,560 1520,700" stroke="#4a7a5a" stroke-width="10" fill="none"/>`);
  L.push(cart(2200, 1650, -10, "#c0392b"), cart(1050, 640, 80, "#2a6fb0"), crate(2400, 1800, 80, 14), crate(2310, 1830, 70, -6, "#4a5560"));
  L.push(`<path d="M2140,1640 C2000,1500 1880,1350 1760,1260" stroke="#1a1a1a" stroke-width="14" fill="none"/><path d="M2140,1640 C2000,1500 1880,1350 1760,1260" stroke="#c0392b" stroke-width="7" fill="none"/>`);
  // Лестница из диспетчерской.
  L.push(`<g filter="url(#soft)"><rect x="${XCR + 10}" y="500" width="170" height="130" fill="#2a3038"/>${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${XCR + 14 + i * 27}" y="504" width="23" height="122" fill="rgb(${90 - i * 8},${96 - i * 8},${104 - i * 8})" stroke="#111" stroke-width="2"/>`).join("")}<path d="M${XCR + 10},500 H${XCR + 180} M${XCR + 10},630 H${XCR + 180}" stroke="#e0aa22" stroke-width="6"/></g>`);
  L.push(glow(1300, 650, 520, "flood"), glow(2150, 650, 500, "flood"), glow(1300, 1250, 500, "flood"), glow(2150, 1250, 500, "flood"));

  // Грузовой терминал: контейнеры, паллеты, погрузчик, робот, конвейер.
  L.push(`<rect x="${WL}" y="${YP}" width="${XCG - WL}" height="${WB - YP}" fill="rgba(60,50,30,0.12)"/>`);
  L.push(`<path d="M${WL + 30},${YP + 30} H${XCG - 30} V${WB - 30}" stroke="rgba(224,170,34,0.55)" stroke-width="8" fill="none" stroke-dasharray="50 24"/>`);
  L.push(container(270, 1620, 400, 150, 0, "#b5562a"), container(270, 1800, 400, 150, 0, "#2f6a8f"));
  L.push(container(1320, 1640, 380, 150, -4, "#3f7a4a"), container(1380, 1830, 360, 140, 3, "#b5562a"));
  L.push(pallet(890, 1890, 0, r), pallet(1060, 1880, 6, r), crate(1100, 1600, 80, 10), crate(1030, 1560, 66, -20, "#4a5560"));
  L.push(forklift(700, 1600, 0), robot(600, 1880, -60));
  L.push(glow(560, 1760, 360, "amber"), glow(1200, 1720, 300, "amber"), `<circle cx="560" cy="${WB - 30}" r="10" fill="#ffb347" filter="url(#glow)"/><circle cx="1200" cy="${WB - 30}" r="10" fill="#ffb347" filter="url(#glow)"/>`);

  // Энергетический барьер: площадка с шевронами, эмиттеры, поле.
  L.push(`<rect x="${XB}" y="${WT}" width="${XE - XB}" height="${WB - WT}" fill="rgba(25,30,40,0.5)"/>`);
  L.push(`<path d="M${XB + 20},${WT} V${WB}" stroke="${u("hazard")}" stroke-width="24"/>`);
  for (let y = 160; y < WB - 100; y += 220) L.push(`<path d="M${XB + 70},${y} l60,50 l-60,50 M${XB + 130},${y} l60,50 l-60,50" stroke="rgba(255,90,60,0.65)" stroke-width="14" fill="none"/>`);
  L.push(`<rect x="${XE - 60}" y="${WT}" width="120" height="${WB - WT}" fill="${u("field")}"/>`);
  for (let k = 0; k < 4; k++) {
    let d = `M${XE + (r() - 0.5) * 20},${WT}`;
    for (let y = WT; y < WB; y += 40) d += ` L${f1(XE + (r() - 0.5) * 34)},${y + 40}`;
    L.push(`<path d="${d}" stroke="${k % 2 ? "#bff2ff" : "#5fdcff"}" stroke-width="${k % 2 ? 2.5 : 4}" fill="none" opacity="0.8" filter="url(#glow)"/>`);
  }
  for (let y = WT + 60; y < WB; y += 300) {
    L.push(S(`<rect x="${XE - 36}" y="${y - 40}" width="72" height="80" rx="10" fill="#3a4049" stroke="#08090c" stroke-width="4"/><rect x="${XE - 24}" y="${y - 28}" width="48" height="56" rx="6" fill="#20262e"/>`));
    L.push(`<circle cx="${XE}" cy="${y}" r="16" fill="#cff6ff" filter="url(#glow)"/>`, glow(XE, y, 220));
  }

  // Стены.
  L.push(bulk([[[WL, WT], [XE, WT]], [[WL, WT], [WL, WB]], [[WL, WB], [XE, WB]]], 52));
  L.push(bulk([[[XE - 10, WT], [XE + 70, WT]], [[XE - 10, WB], [XE + 70, WB]]], 80));
  L.push(glassWall(XCR, WT + 20, XCR, 500), glassWall(XCR, 630, XCR, YCR), glassWall(WL + 20, YCR, XCR, YCR));
  // Мигающие огни, свет у барьера и затемнение краёв.
  L.push(glow(XB + 20, 300, 160, "red"), glow(XB + 20, 1700, 160, "red"), `<circle cx="${XB + 20}" cy="300" r="10" fill="#ff5a4a" filter="url(#glow)"/><circle cx="${XB + 20}" cy="1700" r="10" fill="#ff5a4a" filter="url(#glow)"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="${u("vignette")}"/>`);
  return L.join("\n");
}

/* ---------- зоны ---------- */
const ZONES = [
  { id: "control", name: "Диспетчерская", tags: ["elevated", "cover"], poly: [[0, 0], [XCR, 0], [XCR, YCR], [0, YCR]], label: [400, 430], size: 54 },
  { id: "fuel", name: "Топливные магистрали", tags: ["hazard", "difficult"], poly: [[XCR, 0], [XB, 0], [XB, YF], [XCR, YF]], label: [1470, 320], size: 46 },
  { id: "catwalks", name: "Подвесные мостки", tags: ["elevated", "difficult"], poly: [[0, YCR], [XCR, YCR], [XCR, YP], [0, YP]], label: [490, 1410], size: 46 },
  { id: "pad", name: "Посадочная площадка", tags: [], poly: [[XCR, YF], [XB, YF], [XB, H], [XCG, H], [XCG, YP], [XCR, YP]], label: [2080, 1530], size: 54 },
  { id: "cargo", name: "Грузовой терминал", tags: ["cover"], poly: [[0, YP], [XCG, YP], [XCG, H], [0, H]], label: [770, 1745], size: 52 },
  { id: "barrier", name: "Энергетический барьер", tags: ["hazard"], poly: [[XB, 0], [W, 0], [W, H], [XB, H]], label: [2700, 1000], size: 34 }
];
const LINKS = [
  ["control", "fuel", "short"], ["control", "catwalks", "short"], ["control", "pad", "short"],
  ["fuel", "pad", "short"], ["catwalks", "pad", "short"], ["catwalks", "cargo", "short"],
  ["cargo", "pad", "short"], ["pad", "barrier", "medium"], ["fuel", "barrier", "short"]
];

export default {
  key: K, name: "Грузовой ангар станции", folder: "Будущее", worlds: ["scifi", "spaceopera"],
  bgColor: "#05070c",
  extraDefs: makeDefs(),
  draw, zones: ZONES, links: LINKS,
  style: { tint: "rgba(255,220,120,0.03)", line: "rgba(255,214,110,0.9)", text: "#fff1c8" }
};
