/**
 * Сборка боевых карт: отрисовать карты из tools/battlemaps/maps/*.mjs и записать сцены для компендиума «Боевые зоны».
 * Запуск: node tools/battlemaps/build.mjs [ключ]   (ключ — отрисовать только одну карту; сцены пишутся всегда для всех)
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, W, H, require, renderMap } from "./lib.mjs";

const dir = path.join(ROOT, "tools/battlemaps/maps");
const maps = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".mjs")).sort()) maps.push((await import(path.join(dir, f))).default);

const only = process.argv[2];
const { chromium } = require("playwright");
const browser = await chromium.launch();
for (const map of maps) {
  if (only && only !== map.key) continue;
  await renderMap(map, browser);
  console.log("карта:", map.key);
}
await browser.close();

// Сцены: без сетки (дистанции Genesys), зоны — во флагах сцены (из них система строит регионы и считает дистанцию).
const scenes = maps.map(map => ({
  name: map.name, type: "scene", folder: map.folder, worlds: map.worlds,
  scene: {
    background: { src: `systems/genesys-rpg/assets/maps/${map.key}.jpg` },
    thumb: `systems/genesys-rpg/assets/maps/thumbs/${map.key}.jpg`,
    width: W, height: H, padding: 0.05, backgroundColor: map.bgColor ?? "#1a1a1a",
    grid: { type: 0, size: 100 }, tokenVision: false, fog: { exploration: false },
    initial: { x: W / 2, y: H / 2, scale: 0.45 },
    flags: { "genesys-rpg": { zoneMap: true, bg: `systems/genesys-rpg/assets/maps/${map.key}.jpg`, bgColor: map.bgColor ?? "#1a1a1a",
      zones: map.zones.map(z => ({ id: z.id, name: z.name, tags: z.tags ?? [], poly: z.poly })), links: map.links } }
  }
}));
fs.mkdirSync(path.join(ROOT, "packs-src/scenes"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "packs-src/scenes/battlemaps.json"), JSON.stringify(scenes, null, 2) + "\n");
console.log("сцен:", scenes.length);
