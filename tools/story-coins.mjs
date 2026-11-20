/**
 * Жетоны очков сюжета: светлая сторона (игроки) и тёмная (ведущий).
 * Символы — game-icons.net (CC BY 3.0). Запуск: node tools/story-coins.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ICONS = require("@iconify-json/game-icons/icons.json").icons;
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../assets/story");

function coin({ file, c1, c2, rim1, rim2, ink, glow, icon }) {
  const ticks = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    const x1 = 256 + Math.cos(a) * 226, y1 = 256 + Math.sin(a) * 226, x2 = 256 + Math.cos(a) * 240, y2 = 256 + Math.sin(a) * 240;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }).join("");
  const body = ICONS[icon].body;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
  <radialGradient id="face" cx="40%" cy="32%" r="75%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>
  <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${rim1}"/><stop offset=".5" stop-color="${rim2}"/><stop offset="1" stop-color="${rim1}"/></linearGradient>
  <radialGradient id="shine" cx="35%" cy="25%" r="55%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <filter id="glow"><feGaussianBlur stdDeviation="6"/></filter>
</defs>
<circle cx="256" cy="262" r="246" fill="#000" opacity=".35"/>
<circle cx="256" cy="256" r="246" fill="url(#rim)"/>
<g stroke="${rim1}" stroke-width="5" opacity=".7">${ticks}</g>
<circle cx="256" cy="256" r="214" fill="url(#face)" stroke="${rim2}" stroke-width="6"/>
<circle cx="256" cy="256" r="192" fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width="3" stroke-dasharray="6 10"/>
<g transform="translate(116 116) scale(0.547)" fill="${glow}" filter="url(#glow)" opacity=".8">${body.replace(/currentColor/g, glow)}</g>
<g transform="translate(116 116) scale(0.547)">${body.replace(/currentColor/g, ink)}</g>
<ellipse cx="200" cy="170" rx="150" ry="110" fill="url(#shine)"/>
</svg>
`;
  fs.writeFileSync(path.join(OUT, file), svg);
}

fs.mkdirSync(OUT, { recursive: true });
coin({ file: "player.svg", c1: "#fff6d6", c2: "#e9b44c", rim1: "#9c6a14", rim2: "#ffe39a", ink: "#5a3a06", glow: "#fff2b0", icon: "sunbeams" });
coin({ file: "gm.svg", c1: "#5a1a2a", c2: "#14060c", rim1: "#3a0d16", rim2: "#b8323f", ink: "#ffb3a8", glow: "#ff3b3b", icon: "evil-moon" });
console.log("ok");
