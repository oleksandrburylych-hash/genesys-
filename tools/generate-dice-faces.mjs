/**
 * Генерация картинок граней для Dice So Nice из иконок символов (assets/icons/*.svg).
 * Результат: assets/dice/<код>-<light|dark>.png (256×256, прозрачный фон).
 * Запуск: node tools/generate-dice-faces.mjs   (нужен Playwright с Chromium)
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ICONS = path.join(ROOT, "assets/icons");
const OUT = path.join(ROOT, "assets/dice");
const NAMES = { s: "success", a: "advantage", R: "triumph", f: "failure", t: "threat", D: "despair" };
const CODES = ["s", "ss", "a", "aa", "sa", "R", "f", "ff", "t", "tt", "ft", "D"];

const inner = key => fs.readFileSync(path.join(ICONS, `${NAMES[key]}.svg`), "utf8")
  .replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

function faceSVG(code, color) {
  const glyphs = [...code];
  const size = glyphs.length === 1 ? 150 : 110;
  const positions = glyphs.length === 1 ? [[53, 53]] : [[18, 73], [128, 73]];
  const body = glyphs.map((g, i) => {
    const [x, y] = positions[i];
    return `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="${color}">${inner(g)}</g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${body}</svg>`;
}

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 1 });
for (const [variant, color] of [["light", "#111111"], ["dark", "#ffffff"]]) {
  for (const code of CODES) {
    await page.setContent(`<html><body style="margin:0;background:transparent">${faceSVG(code, color)}</body></html>`);
    const file = path.join(OUT, `${code === code.toUpperCase() && code.length === 1 ? code + code.toLowerCase() : code}-${variant}.png`);
    await page.locator("svg").screenshot({ path: file, omitBackground: true });
  }
}
await browser.close();
console.log("готово:", fs.readdirSync(OUT).length, "файлов");
