/**
 * Библиотека боевых карт Genesys: цельная местность сверху, разделённая на зоны (а не «острова»).
 * Каждая карта = рисунок (полы, стены, мебель, свет) + разметка зон (многоугольники) + дистанции между зонами.
 * Разметка зон становится регионами сцены Foundry (см. module/zones.mjs) — система берёт из них дистанцию и свойства.
 *
 * Запуск: node tools/battlemaps.mjs [ключ]  → assets/maps/<ключ>.jpg (+ thumbs), packs-src/scenes/battlemaps.json
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

export const require = createRequire(import.meta.url);
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
export const OUT = path.join(ROOT, "assets/maps");
export const W = 3000, H = 2000;

export function rng(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const f1 = n => n.toFixed(1);
export const poly = pts => pts.map(p => `${f1(p[0])},${f1(p[1])}`).join(" ");
export const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

/* ==========================================================================
   Общие определения: текстуры, фильтры, свет
   ========================================================================== */
export function defs(seed) {
  const r = rng(seed);
  // Доски: каждая — своя полоса с оттенком и волокнами.
  const planks = [];
  const pw = 600, ph = 360, rows = 9, rowH = ph / rows;
  for (let i = 0; i < rows; i++) {
    let x = -r() * 200;
    while (x < pw) {
      const len = 160 + r() * 260;
      const shade = 0.82 + r() * 0.3;
      const c = `rgb(${Math.round(150 * shade)},${Math.round(100 * shade)},${Math.round(58 * shade)})`;
      planks.push(`<rect x="${f1(x)}" y="${f1(i * rowH)}" width="${f1(len)}" height="${f1(rowH)}" fill="${c}" stroke="#3b2412" stroke-width="2.2"/>`);
      for (let g = 0; g < 3; g++) {
        const gy = i * rowH + 6 + r() * (rowH - 12);
        planks.push(`<path d="M${f1(x + 6)},${f1(gy)} q${f1(len / 3)},${f1((r() - 0.5) * 6)} ${f1(len - 12)},${f1((r() - 0.5) * 4)}" stroke="rgba(60,30,10,0.35)" stroke-width="1.6" fill="none"/>`);
      }
      planks.push(`<circle cx="${f1(x + len - 10)}" cy="${f1(i * rowH + rowH / 2)}" r="2.2" fill="#2a170a"/><circle cx="${f1(x + 10)}" cy="${f1(i * rowH + rowH / 2)}" r="2.2" fill="#2a170a"/>`);
      x += len;
    }
  }
  // Плитка (каменный пол кухни).
  const tiles = [];
  for (let y = 0; y < 300; y += 75) for (let x = 0; x < 300; x += 75) {
    const s = 0.85 + r() * 0.25;
    tiles.push(`<rect x="${x + 2}" y="${y + 2}" width="71" height="71" rx="6" fill="rgb(${Math.round(150 * s)},${Math.round(144 * s)},${Math.round(132 * s)})" stroke="#4a443c" stroke-width="3"/>`);
  }
  // Брусчатка.
  const cobbles = [];
  for (let y = 0; y < 320; y += 40) for (let x = -(y / 40 % 2) * 25; x < 320; x += 50) {
    const s = 0.75 + r() * 0.35;
    cobbles.push(`<rect x="${f1(x + 3 + r() * 3)}" y="${f1(y + 3 + r() * 3)}" width="${f1(42 + r() * 4)}" height="${f1(32 + r() * 3)}" rx="11" fill="rgb(${Math.round(120 * s)},${Math.round(116 * s)},${Math.round(110 * s)})" stroke="#2c2a27" stroke-width="2.5"/>`);
  }
  return `<defs>
    <pattern id="planks" width="${pw}" height="${ph}" patternUnits="userSpaceOnUse">${planks.join("")}</pattern>
    <pattern id="tiles" width="300" height="300" patternUnits="userSpaceOnUse">${tiles.join("")}</pattern>
    <pattern id="cobbles" width="320" height="320" patternUnits="userSpaceOnUse"><rect width="320" height="320" fill="#3a3733"/>${cobbles.join("")}</pattern>
    <pattern id="stonewall" width="120" height="60" patternUnits="userSpaceOnUse"><rect width="120" height="60" fill="#5b544a"/><path d="M0,30H120M60,0V30M0,30V60M120,30V60M30,30V60M90,30V60" stroke="#2c2722" stroke-width="5"/></pattern>
    <pattern id="rug" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="#7a1f22"/><path d="M0,30 L30,0 L60,30 L30,60Z" fill="#8f2a2c" stroke="#d8a64a" stroke-width="2"/><circle cx="30" cy="30" r="5" fill="#d8a64a"/></pattern>
    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="3"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <filter id="dirt" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="4" seed="11"/><feColorMatrix type="matrix" values="0 0 0 0 0.12  0 0 0 0 0.07  0 0 0 0 0.02  0 0 0 0.55 -0.15"/></filter>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="6" dy="10" stdDeviation="8" flood-color="rgba(0,0,0,0.55)"/></filter>
    <filter id="wallshadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="0" stdDeviation="16" flood-color="rgba(0,0,0,0.7)"/></filter>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="textshadow" x="-10%" y="-30%" width="120%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="rgba(0,0,0,0.85)"/></filter>
    <radialGradient id="warm" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(255,190,90,0.55)"/><stop offset="0.5" stop-color="rgba(255,150,60,0.18)"/><stop offset="1" stop-color="rgba(255,120,40,0)"/></radialGradient>
    <radialGradient id="fireglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(255,200,90,0.75)"/><stop offset="0.4" stop-color="rgba(255,120,40,0.35)"/><stop offset="1" stop-color="rgba(255,90,20,0)"/></radialGradient>
    <radialGradient id="tableWood" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#b9824a"/><stop offset="1" stop-color="#6e4422"/></radialGradient>
    <radialGradient id="barrelTop" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#a8733f"/><stop offset="1" stop-color="#5e3a1c"/></radialGradient>
    <radialGradient id="night" cx="50%" cy="45%" r="75%"><stop offset="0.5" stop-color="rgba(10,14,30,0)"/><stop offset="1" stop-color="rgba(5,8,20,0.65)"/></radialGradient>
  </defs>`;
}

/* ==========================================================================
   Мебель и предметы (вид сверху)
   ========================================================================== */
export const P = {
  roundTable(x, y, r = 70, chairs = 4, rot = 0) {
    const out = [];
    for (let i = 0; i < chairs; i++) {
      const a = rot + (i / chairs) * Math.PI * 2;
      const cx = x + Math.cos(a) * (r + 34), cy = y + Math.sin(a) * (r + 34);
      out.push(`<g transform="rotate(${f1(a * 180 / Math.PI + 90)} ${f1(cx)} ${f1(cy)})"><rect x="${f1(cx - 26)}" y="${f1(cy - 22)}" width="52" height="44" rx="9" fill="#7a4d26" stroke="#2f1b0b" stroke-width="3"/><rect x="${f1(cx - 26)}" y="${f1(cy + 12)}" width="52" height="10" rx="4" fill="#5a3517"/></g>`);
    }
    out.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="url(#tableWood)" stroke="#2f1b0b" stroke-width="5"/><circle cx="${x}" cy="${y}" r="${r * 0.82}" fill="none" stroke="rgba(255,220,170,0.18)" stroke-width="3"/>`);
    out.push(`<circle cx="${x - r * 0.3}" cy="${y - r * 0.2}" r="${r * 0.14}" fill="#d9d2c4" stroke="#6b6155" stroke-width="2"/><rect x="${x + r * 0.15}" y="${y + r * 0.05}" width="${r * 0.22}" height="${r * 0.28}" rx="4" fill="#c9a24a" stroke="#5e4517" stroke-width="2"/>`);
    return `<g filter="url(#soft)">${out.join("")}</g>`;
  },
  longTable(x, y, w, h, benches = true) {
    const out = [];
    if (benches) {
      out.push(`<rect x="${x + 10}" y="${y - 46}" width="${w - 20}" height="34" rx="8" fill="#6b4220" stroke="#2f1b0b" stroke-width="3"/>`);
      out.push(`<rect x="${x + 10}" y="${y + h + 12}" width="${w - 20}" height="34" rx="8" fill="#6b4220" stroke="#2f1b0b" stroke-width="3"/>`);
    }
    out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="url(#tableWood)" stroke="#2f1b0b" stroke-width="5"/>`);
    for (let i = 1; i < 4; i++) out.push(`<path d="M${x + 8},${y + h * i / 4} H${x + w - 8}" stroke="rgba(40,20,8,0.4)" stroke-width="2"/>`);
    return `<g filter="url(#soft)">${out.join("")}</g>`;
  },
  barrel(x, y, r = 46) {
    return `<g filter="url(#soft)"><circle cx="${x}" cy="${y}" r="${r}" fill="url(#barrelTop)" stroke="#2a170a" stroke-width="4"/>
      <circle cx="${x}" cy="${y}" r="${r * 0.86}" fill="none" stroke="#3b3b3b" stroke-width="6"/><circle cx="${x}" cy="${y}" r="${r * 0.45}" fill="none" stroke="rgba(40,20,8,0.5)" stroke-width="2"/>
      <path d="M${x - r * 0.6},${y} H${x + r * 0.6}" stroke="rgba(40,20,8,0.5)" stroke-width="2"/></g>`;
  },
  crate(x, y, s = 90, rot = 0) {
    return `<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})"><rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" fill="#9a6a38" stroke="#3b2412" stroke-width="5"/>
      <path d="M${x - s / 2},${y - s / 2} L${x + s / 2},${y + s / 2} M${x + s / 2},${y - s / 2} L${x - s / 2},${y + s / 2}" stroke="#5a3a1a" stroke-width="7"/>
      <rect x="${x - s / 2 + 6}" y="${y - s / 2 + 6}" width="${s - 12}" height="${s - 12}" fill="none" stroke="#c08a50" stroke-width="2" opacity="0.5"/></g>`;
  },
  counter(pts, w = 80) {
    const d = `M${pts.map(p => p.join(",")).join(" L")}`;
    return `<g filter="url(#soft)"><path d="${d}" fill="none" stroke="#2f1b0b" stroke-width="${w + 10}" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#7d4f27" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#a87444" stroke-width="${w * 0.35}" stroke-linejoin="round" stroke-linecap="round" opacity="0.7"/></g>`;
  },
  bottles(x, y, n = 6) {
    const cols = ["#3c7a3a", "#7a2a2a", "#b8892c", "#2f5f8a"];
    return Array.from({ length: n }, (_, i) => `<circle cx="${x + i * 26}" cy="${y}" r="9" fill="${cols[i % 4]}" stroke="#111" stroke-width="2"/><circle cx="${x + i * 26 - 3}" cy="${y - 3}" r="3" fill="rgba(255,255,255,0.5)"/>`).join("");
  },
  mug(x, y) { return `<circle cx="${x}" cy="${y}" r="13" fill="#c9a24a" stroke="#4a3010" stroke-width="3"/><circle cx="${x}" cy="${y}" r="7" fill="#f3e3b3"/>`; },
  fireplace(x, y, w = 260, h = 110) {
    return `<g><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="8" fill="url(#stonewall)" stroke="#1c1814" stroke-width="6"/>
      <rect x="${x - w * 0.32}" y="${y - h * 0.1}" width="${w * 0.64}" height="${h * 0.55}" rx="10" fill="#1a0f08"/>
      <ellipse cx="${x}" cy="${y + h * 0.15}" rx="${w * 0.22}" ry="${h * 0.16}" fill="#ff9a2e" filter="url(#glow)"/><ellipse cx="${x}" cy="${y + h * 0.15}" rx="${w * 0.1}" ry="${h * 0.08}" fill="#ffe38a"/>
      <circle cx="${x}" cy="${y + h * 0.6}" r="${w * 1.3}" fill="url(#fireglow)"/></g>`;
  },
  cauldron(x, y, r = 50) {
    return `<g filter="url(#soft)"><circle cx="${x}" cy="${y}" r="${r}" fill="#2a2a2a" stroke="#0d0d0d" stroke-width="6"/><circle cx="${x}" cy="${y}" r="${r * 0.78}" fill="#6a7a3a"/><circle cx="${x - r * 0.2}" cy="${y - r * 0.2}" r="${r * 0.12}" fill="#a6b860"/></g>`;
  },
  rug(x, y, w, h) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="url(#rug)" stroke="#d8a64a" stroke-width="6" opacity="0.92"/>`; },
  stairs(x, y, w, h, steps = 9, dir = "up") {
    const out = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#4a2e15"/>`];
    for (let i = 0; i < steps; i++) {
      const sy = dir === "up" ? y + h - (i + 1) * (h / steps) : y + i * (h / steps);
      const shade = 0.6 + (i / steps) * 0.5;
      out.push(`<rect x="${x + 6}" y="${f1(sy + 3)}" width="${w - 12}" height="${f1(h / steps - 5)}" fill="rgb(${Math.round(150 * shade)},${Math.round(98 * shade)},${Math.round(52 * shade)})" stroke="#2a170a" stroke-width="2"/>`);
    }
    out.push(`<path d="M${x + w / 2},${y + h - 30} V${y + 40} M${x + w / 2 - 22},${y + 66} L${x + w / 2},${y + 40} L${x + w / 2 + 22},${y + 66}" stroke="rgba(255,240,210,0.6)" stroke-width="6" fill="none" stroke-linecap="round"/>`);
    return `<g filter="url(#soft)">${out.join("")}</g>`;
  },
  armchair(x, y, rot = 0) {
    return `<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})"><rect x="${x - 45}" y="${y - 40}" width="90" height="80" rx="18" fill="#5a1d1f" stroke="#2a0b0c" stroke-width="4"/><rect x="${x - 30}" y="${y - 22}" width="60" height="52" rx="10" fill="#7a2a2c"/><rect x="${x - 45}" y="${y - 40}" width="90" height="22" rx="10" fill="#4a1516"/></g>`;
  },
  lantern(x, y) { return `<circle cx="${x}" cy="${y}" r="190" fill="url(#warm)"/><circle cx="${x}" cy="${y}" r="16" fill="#ffd36b" stroke="#5a3a10" stroke-width="4" filter="url(#glow)"/>`; },
  well(x, y) {
    return `<g filter="url(#soft)"><circle cx="${x}" cy="${y}" r="70" fill="url(#stonewall)" stroke="#1c1814" stroke-width="6"/><circle cx="${x}" cy="${y}" r="46" fill="#0d1a24"/><circle cx="${x}" cy="${y}" r="30" fill="#18394f" opacity="0.8"/>
      <rect x="${x - 90}" y="${y - 8}" width="180" height="16" fill="#6b4220" stroke="#2f1b0b" stroke-width="3"/></g>`;
  },
  wagon(x, y, rot = 0) {
    return `<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})"><rect x="${x - 120}" y="${y - 60}" width="240" height="120" rx="10" fill="#7d5a34" stroke="#2f1b0b" stroke-width="5"/>
      ${[-1, 1].map(s => `<rect x="${x - 100}" y="${y + s * 62 - 10}" width="50" height="20" rx="6" fill="#2a1a0c"/><rect x="${x + 50}" y="${y + s * 62 - 10}" width="50" height="20" rx="6" fill="#2a1a0c"/>`).join("")}
      <path d="M${x - 110},${y - 40} H${x + 110} M${x - 110},${y} H${x + 110} M${x - 110},${y + 40} H${x + 110}" stroke="rgba(40,20,8,0.5)" stroke-width="3"/>
      <rect x="${x + 120}" y="${y - 8}" width="90" height="16" fill="#5a3517"/><rect x="${x - 60}" y="${y - 45}" width="80" height="60" fill="#9a6a38" stroke="#3b2412" stroke-width="3"/></g>`;
  },
  door(x, y, w, horizontal = true) {
    return horizontal
      ? `<rect x="${x}" y="${y - 14}" width="${w}" height="28" fill="#6b4220" stroke="#2a170a" stroke-width="3"/><path d="M${x},${y} A${w},${w} 0 0 1 ${x + w},${y - w}" fill="none" stroke="rgba(255,240,210,0.25)" stroke-width="3" stroke-dasharray="8 8"/>`
      : `<rect x="${x - 14}" y="${y}" width="28" height="${w}" fill="#6b4220" stroke="#2a170a" stroke-width="3"/>`;
  },
  shelf(x, y, w, h) { return `<g filter="url(#soft)"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#5a3517" stroke="#2a170a" stroke-width="4"/>${P.bottles(x + 18, y + h / 2, Math.floor((w - 20) / 26))}</g>`; },
  sacks(x, y) { return `<g filter="url(#soft)">${[[0, 0], [50, 10], [20, 48]].map(([dx, dy]) => `<ellipse cx="${x + dx}" cy="${y + dy}" rx="34" ry="28" fill="#b89a68" stroke="#5e4a2a" stroke-width="3"/><path d="M${x + dx - 8},${y + dy - 26} q8,10 16,0" stroke="#5e4a2a" stroke-width="3" fill="none"/>`).join("")}</g>`; },
  hay(x, y) { return `<g filter="url(#soft)"><rect x="${x - 70}" y="${y - 45}" width="140" height="90" rx="12" fill="#d8b660" stroke="#7a6024" stroke-width="4"/><path d="M${x - 60},${y - 20} H${x + 60} M${x - 60},${y + 20} H${x + 60}" stroke="#9a7a30" stroke-width="3"/></g>`; }
};

/** Стены: толстая каменная обводка многоугольника с проёмами (gaps — отрезки [[x1,y1],[x2,y2]]). */
export function walls(segments, thick = 44) {
  const d = segments.map(s => `M${s[0][0]},${s[0][1]} L${s[1][0]},${s[1][1]}`).join(" ");
  return `<g filter="url(#wallshadow)"><path d="${d}" stroke="#1c1814" stroke-width="${thick + 10}" stroke-linecap="square"/><path d="${d}" stroke="url(#stonewall)" stroke-width="${thick}" stroke-linecap="square"/></g>`;
}

/* ==========================================================================
   Подписи и границы зон
   ========================================================================== */
export const TAG_ICON = { cover: "🛡", difficult: "👣", elevated: "⬆", hazard: "⚠", dark: "☾" };
export const TAG_LABEL = { cover: "укрытие", difficult: "труднопроходимо", elevated: "возвышенность", hazard: "опасно", dark: "плохая видимость" };

export function zoneOverlay(z, style) {
  const pts = poly(z.poly);
  const lx = z.label?.[0] ?? centroid(z.poly)[0], ly = z.label?.[1] ?? centroid(z.poly)[1];
  const tags = (z.tags ?? []).map(t => `${TAG_ICON[t]} ${TAG_LABEL[t]}`).join("  ·  ");
  return `<polygon points="${pts}" fill="${style.tint}" stroke="rgba(0,0,0,0.55)" stroke-width="12" stroke-dasharray="40 22" stroke-linejoin="round"/>
    <polygon points="${pts}" fill="none" stroke="${style.line}" stroke-width="6" stroke-dasharray="40 22" stroke-linejoin="round"/>
    <g filter="url(#textshadow)"><text x="${lx}" y="${ly}" text-anchor="middle" font-family="Oswald" font-weight="600" font-size="${z.size ?? 62}" letter-spacing="6" fill="${style.text}" stroke="rgba(20,10,4,0.85)" stroke-width="10" paint-order="stroke">${z.name.toUpperCase()}</text>
    ${tags ? `<text x="${lx}" y="${ly + 50}" text-anchor="middle" font-family="Roboto Condensed" font-size="32" fill="${style.text}" stroke="rgba(20,10,4,0.85)" stroke-width="8" paint-order="stroke">${tags}</text>` : ""}</g>`;
}
export function centroid(pts) { const n = pts.length; return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n]; }

/** Полный SVG карты: общие определения + свои определения карты + рисунок + разметка зон. */
export function mapSVG(map) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs(map.key)}${map.extraDefs ?? ""}${map.draw()}${map.zones.map(z => zoneOverlay(z, map.style)).join("")}</svg>`;
}

/** Шрифты для отрисовки (Oswald, Roboto Condensed — из assets/fonts). */
export function fontCSS() {
  const font = f => `file://${ROOT}/assets/fonts/${f}`;
  return `@font-face{font-family:Oswald;font-weight:400 700;src:url(${font("oswald-cyrillic-600-normal.woff2")}) format("woff2");unicode-range:U+0400-04FF}
    @font-face{font-family:Oswald;font-weight:400 700;src:url(${font("oswald-latin-600-normal.woff2")}) format("woff2");unicode-range:U+0000-03FF,U+2000-206F}
    @font-face{font-family:"Roboto Condensed";src:url(${font("roboto-condensed-cyrillic-400-normal.woff2")}) format("woff2");unicode-range:U+0400-04FF}
    @font-face{font-family:"Roboto Condensed";src:url(${font("roboto-condensed-latin-400-normal.woff2")}) format("woff2");unicode-range:U+0000-03FF}`;
}

/** Отрисовать карту в JPEG (3000×2000) и миниатюру. */
export async function renderMap(map, browser, outDir = OUT) {
  fs.mkdirSync(path.join(outDir, "thumbs"), { recursive: true });
  const file = path.join(ROOT, ".build", `bm-${map.key}.html`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"><style>${fontCSS()} body{margin:0}</style></head><body>${mapSVG(map)}</body></html>`);
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(`file://${file}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, `${map.key}.jpg`), type: "jpeg", quality: 86 });
  await page.close();
  const thumb = await browser.newPage({ viewport: { width: 600, height: 400 } });
  await thumb.goto(`file://${file}`);
  await thumb.addStyleTag({ content: "svg{width:600px;height:400px}" });
  await thumb.evaluate(() => document.fonts.ready);
  await thumb.screenshot({ path: path.join(outDir, "thumbs", `${map.key}.jpg`), type: "jpeg", quality: 80 });
  await thumb.close();
}
