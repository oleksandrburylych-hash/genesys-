/**
 * Графика нарративных кубиков:
 *  — assets/dice/shape/<key>.svg — гранёные силуэты (d6 — квадрат, d8 — ромб, d12 — шестиугольник) для чата, листа и окна броска;
 *  — assets/dice/<код>-<light|dark>.png — грани для Dice So Nice (символ с обводкой и тенью, 256×256, прозрачный фон).
 * Запуск: node tools/dice-art.mjs   (нужен Playwright с Chromium)
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "assets/dice");
const SHAPES = path.join(OUT, "shape");

/** Цвета: основной, светлая грань, тёмная грань, обводка. */
export const DIE_COLORS = {
  boost: ["#8ad6f6", "#c9effd", "#4aa5d3", "#2b6f93"],
  setback: ["#2c2c2e", "#4d4d50", "#0b0b0c", "#000000"],
  ability: ["#3db34c", "#74da80", "#23792f", "#145020"],
  difficulty: ["#6b37a2", "#9264c6", "#3f1e62", "#24103a"],
  proficiency: ["#f6c41a", "#ffe26e", "#c48f00", "#7d5a00"],
  challenge: ["#d3303a", "#f2686f", "#8c1a20", "#560c10"]
};

const grad = (id, a, b, x1 = 0, y1 = 0, x2 = 1, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

function d6([base, light, dark, edge]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad("g", light, dark)}${grad("i", base, dark, 0, 0, 0.3, 1)}</defs>
  <rect x="5" y="5" width="90" height="90" rx="16" fill="url(#g)" stroke="${edge}" stroke-width="3"/>
  <rect x="15" y="15" width="70" height="70" rx="10" fill="url(#i)"/>
  <path d="M25 15 H75 Q85 15 85 25 V38 Q50 28 15 38 V25 Q15 15 25 15 Z" fill="#fff" opacity=".16"/>
  <rect x="5" y="5" width="90" height="90" rx="16" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1.5" transform="translate(1.5 1.5) scale(.97)"/></svg>`;
}

function d8([base, light, dark, edge]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad("c", base, dark, 0.2, 0, 0.8, 1)}</defs>
  <polygon points="50,2 98,50 50,98 2,50" fill="${base}" stroke="${edge}" stroke-width="3" stroke-linejoin="round"/>
  <polygon points="50,2 2,50 26,50 50,26" fill="${light}"/>
  <polygon points="50,2 98,50 74,50 50,26" fill="${base}"/>
  <polygon points="98,50 50,98 50,74 74,50" fill="${dark}"/>
  <polygon points="2,50 50,98 50,74 26,50" fill="${base}" opacity=".9"/>
  <polygon points="50,24 76,50 50,76 24,50" fill="url(#c)" stroke="#fff" stroke-opacity=".3" stroke-width="1"/>
  <polygon points="50,2 98,50 50,98 2,50" fill="none" stroke="${edge}" stroke-width="3" stroke-linejoin="round"/></svg>`;
}

function d12([base, light, dark, edge]) {
  const P = "50,2 93,26 93,74 50,98 7,74 7,26";
  const I = [[50, 22], [74, 36], [74, 64], [50, 78], [26, 64], [26, 36]];
  const O = [[50, 2], [93, 26], [93, 74], [50, 98], [7, 74], [7, 26]];
  const shades = [light, base, dark, dark, base, light];
  const facets = O.map((o, i) => {
    const o2 = O[(i + 1) % 6], i1 = I[i], i2 = I[(i + 1) % 6];
    return `<polygon points="${o.join(",")} ${o2.join(",")} ${i2.join(",")} ${i1.join(",")}" fill="${shades[i]}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${grad("c", base, dark, 0.2, 0, 0.8, 1)}</defs>
  ${facets}<polygon points="${I.map(p => p.join(",")).join(" ")}" fill="url(#c)" stroke="#fff" stroke-opacity=".3" stroke-width="1"/>
  <polygon points="${P}" fill="none" stroke="${edge}" stroke-width="3" stroke-linejoin="round"/></svg>`;
}

export function shapeSVG(key) {
  const c = DIE_COLORS[key];
  if (key === "boost" || key === "setback") return d6(c);
  if (key === "ability" || key === "difficulty") return d8(c);
  return d12(c);
}

/* ---------- Грани для Dice So Nice ---------- */
const ICONS = path.join(ROOT, "assets/icons");
const NAMES = { s: "success", a: "advantage", R: "triumph", f: "failure", t: "threat", D: "despair" };
const CODES = ["s", "ss", "a", "aa", "sa", "R", "f", "ff", "t", "tt", "ft", "D"];
const inner = key => fs.readFileSync(path.join(ICONS, `${NAMES[key]}.svg`), "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

function faceSVG(code, ink, outline) {
  const glyphs = [...code];
  const size = glyphs.length === 1 ? 160 : 100;
  const positions = glyphs.length === 1 ? [[48, 48]] : [[26, 84], [130, 84]];
  const body = glyphs.map((g, i) => {
    const [x, y] = positions[i];
    return `<g transform="translate(${x} ${y}) scale(${size / 24})">
      <g fill="${outline}" stroke="${outline}" stroke-width="2.2" stroke-linejoin="round">${inner(g)}</g>
      <g fill="${ink}">${inner(g)}</g></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${body}</svg>`;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  fs.mkdirSync(SHAPES, { recursive: true });
  for (const key of Object.keys(DIE_COLORS)) fs.writeFileSync(path.join(SHAPES, `${key}.svg`), shapeSVG(key));
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 1 });
  // light — для светлых кубиков (тёмный символ со светлой обводкой), dark — для тёмных (белый символ с тёмной обводкой).
  for (const [variant, ink, outline] of [["light", "#121212", "rgba(255,255,255,0.85)"], ["dark", "#ffffff", "rgba(0,0,0,0.85)"]]) {
    for (const code of CODES) {
      await page.setContent(`<html><body style="margin:0;background:transparent">${faceSVG(code, ink, outline)}</body></html>`);
      const file = path.join(OUT, `${code === code.toUpperCase() && code.length === 1 ? code + code.toLowerCase() : code}-${variant}.png`);
      await page.locator("svg").screenshot({ path: file, omitBackground: true });
    }
  }
  await browser.close();
  console.log("готово: силуэты и грани");
}
