/**
 * Плашки-иконки в стиле книги правил: градиент категории, золотая рамка, белый символ
 * из коллекции game-icons.net (CC BY 3.0, см. assets/icons/gi/CREDITS.md).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { PALETTES } from "./icon-rules.mjs";

const require = createRequire(import.meta.url);
const ICONS = require("@iconify-json/game-icons/icons.json").icons;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
export const TILE_DIR = path.join(ROOT, "assets/icons/gi");

/** Путь Foundry к плашке (создаёт файл при необходимости). */
export function tilePath(category, icon) {
  if (!ICONS[icon]) throw new Error(`Нет иконки game-icons: ${icon}`);
  const dir = path.join(TILE_DIR, category);
  const file = path.join(dir, `${icon}.svg`);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, tileSVG(category, icon));
  }
  return `systems/genesys-rpg/assets/icons/gi/${category}/${icon}.svg`;
}

function tileSVG(category, icon) {
  const [c1, c2] = PALETTES[category] ?? ["#56626e", "#2b3238"];
  const body = ICONS[icon].body.replace(/currentColor/g, "#ffffff");
  const shadow = ICONS[icon].body.replace(/currentColor/g, "rgba(0,0,0,0.45)");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><radialGradient id="g" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs>
<rect x="10" y="10" width="492" height="492" rx="70" fill="url(#g)" stroke="#f2a531" stroke-width="12"/>
<rect x="30" y="30" width="452" height="452" rx="54" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="4"/>
<g transform="translate(92 100) scale(0.64)">${shadow}</g>
<g transform="translate(92 92) scale(0.64)">${body}</g>
</svg>
`;
}
