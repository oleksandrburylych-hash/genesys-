/**
 * Боевые карты зонами для Genesys (дистанции вместо клеток).
 * Каждая карта — 3000×2000: зоны неровной формы с обстановкой (иконки game-icons.net, CC BY 3.0),
 * таблички с названием и свойствами зоны, связи между зонами с плашкой дистанции, картуш и легенда.
 * Стиль задаётся темой: пергамент, подземелье, стимпанк, тактическая карта, пустошь, хоррор, голограмма, чужая планета.
 *
 * Запуск: node tools/zone-maps.mjs   → assets/maps/<key>.jpg, assets/maps/thumbs/<key>.jpg, packs-src/scenes/zone-maps.json
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ICONS = require("@iconify-json/game-icons/icons.json").icons;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "assets/maps");
const W = 3000, H = 2000;

/* ---------- Случайность с зерном ---------- */
function rng(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ---------- Темы ---------- */
const THEMES = {
  parchment: {
    label: "Фэнтези · пергамент",
    bg: ["#f4e7c6", "#e3cc9a", "#c49f62"], grain: 0.35, grainColor: "#8a5a22", vignette: "rgba(90,50,15,0.5)", blotch: 0.22,
    zoneFill: ["#f6ecd2", "#e7d3a6"], zoneStroke: "#5a3a17", zoneStrokeW: 7, zoneDash: "", zoneOpacity: 0.92, zoneInnerGlow: "rgba(255,248,225,0.7)",
    rough: 6, ink: "#4a2e10", icon: "#5a3a17", iconOpacity: 0.85, shadow: "rgba(60,35,10,0.45)",
    plate: { fill: "#7a2a1e", stroke: "#e9c46a", text: "#fff6dd", shape: "banner" },
    link: "#5a3a17", linkW: 9, linkDash: "4 18", font: "Oswald", decor: "compass"
  },
  dungeon: {
    label: "Подземелье · факелы",
    bg: ["#2b2622", "#1a1715", "#0b0a09"], grain: 0.75, grainColor: "#000000", vignette: "rgba(0,0,0,0.85)",
    zoneFill: ["#5b4d3e", "#3b3128"], zoneStroke: "#c9a46a", zoneStrokeW: 6, zoneDash: "", zoneOpacity: 0.95, zoneInnerGlow: "rgba(255,170,70,0.35)",
    rough: 9, ink: "#f1d9a8", icon: "#f3e2bd", iconOpacity: 0.85, shadow: "rgba(0,0,0,0.8)", torch: true,
    plate: { fill: "#1c1612", stroke: "#c9a46a", text: "#f6dfae", shape: "plaque" },
    link: "#d9b77a", linkW: 8, linkDash: "2 16", font: "Oswald", decor: "chains"
  },
  steampunk: {
    label: "Стимпанк · латунь",
    bg: ["#24423f", "#173130", "#0d1e1d"], grain: 0.35, grainColor: "#000", vignette: "rgba(5,15,14,0.7)", grid: { size: 100, color: "rgba(160,220,210,0.07)" },
    zoneFill: ["#3d5f5a", "#284541"], zoneStroke: "#c8933f", zoneStrokeW: 10, zoneDash: "", zoneOpacity: 0.95, zoneInnerGlow: "rgba(240,200,120,0.25)",
    rough: 2, ink: "#f3d79c", icon: "#e6b766", iconOpacity: 0.9, shadow: "rgba(0,0,0,0.6)", rivets: true,
    plate: { fill: "#5a3a17", stroke: "#e9b55c", text: "#fbe7bd", shape: "plaque" },
    link: "#e0a64a", linkW: 10, linkDash: "", font: "Oswald", decor: "gears"
  },
  tactical: {
    label: "Современность · тактическая карта",
    bg: ["#3c4652", "#2b333c", "#1c2229"], grain: 0.25, grainColor: "#000", vignette: "rgba(10,14,18,0.6)", grid: { size: 125, color: "rgba(255,255,255,0.06)" },
    zoneFill: ["rgba(90,140,190,0.32)", "rgba(60,100,150,0.22)"], zoneStroke: "#e8f1fb", zoneStrokeW: 5, zoneDash: "", zoneOpacity: 1, zoneInnerGlow: "rgba(140,200,255,0.25)",
    rough: 0, ink: "#e8f1fb", icon: "#dfe9f5", iconOpacity: 0.8, shadow: "rgba(0,0,0,0.55)",
    plate: { fill: "#0f1720", stroke: "#f2a531", text: "#ffffff", shape: "tag" },
    link: "#f2a531", linkW: 7, linkDash: "22 14", font: "Oswald", decor: "crosshair"
  },
  wasteland: {
    label: "Пустошь · ржавчина",
    bg: ["#d7a86a", "#b97f43", "#7d4f24"], grain: 0.8, grainColor: "#3b2410", vignette: "rgba(60,30,10,0.6)",
    zoneFill: ["#e6c08a", "#c9955a"], zoneStroke: "#5a2e14", zoneStrokeW: 9, zoneDash: "28 10", zoneOpacity: 0.88, zoneInnerGlow: "rgba(255,230,180,0.4)",
    rough: 12, ink: "#3b1d0b", icon: "#4a240e", iconOpacity: 0.85, shadow: "rgba(60,30,10,0.5)",
    plate: { fill: "#2e2a26", stroke: "#e2582a", text: "#f3e3c8", shape: "stencil" },
    link: "#3b1d0b", linkW: 9, linkDash: "6 16", font: "Oswald", decor: "hazard"
  },
  horror: {
    label: "Хоррор · туман",
    bg: ["#4a4652", "#2c2a33", "#141218"], grain: 0.6, grainColor: "#000", vignette: "rgba(5,0,10,0.85)", fog: true,
    zoneFill: ["#6c6876", "#45424f"], zoneStroke: "#b9b2c9", zoneStrokeW: 4, zoneDash: "", zoneOpacity: 0.85, zoneInnerGlow: "rgba(200,190,230,0.2)",
    rough: 10, ink: "#e9e3f3", icon: "#d8d0e6", iconOpacity: 0.75, shadow: "rgba(0,0,0,0.7)",
    plate: { fill: "#2a0d12", stroke: "#a01e2c", text: "#f1e6ea", shape: "plaque" },
    link: "#a01e2c", linkW: 6, linkDash: "3 14", font: "Oswald", decor: "drips"
  },
  hologram: {
    label: "Будущее · голограмма",
    bg: ["#0b1e33", "#07111f", "#02060c"], grain: 0.15, grainColor: "#000", vignette: "rgba(0,0,0,0.6)", stars: true, grid: { size: 100, color: "rgba(80,200,255,0.06)" },
    zoneFill: ["rgba(40,170,230,0.22)", "rgba(20,90,160,0.14)"], zoneStroke: "#4fe3ff", zoneStrokeW: 5, zoneDash: "", zoneOpacity: 1, zoneInnerGlow: "rgba(80,220,255,0.35)",
    rough: 0, hex: true, ink: "#c9f6ff", icon: "#7fe9ff", iconOpacity: 0.85, shadow: "rgba(0,180,255,0.0)", glow: "#4fe3ff",
    plate: { fill: "rgba(4,25,45,0.92)", stroke: "#4fe3ff", text: "#d9fbff", shape: "tag" },
    link: "#ff4fd8", linkW: 6, linkDash: "18 10", font: "Oswald", decor: "hud"
  },
  alien: {
    label: "Чужая планета · биолюминесценция",
    bg: ["#123a2f", "#0a2219", "#03100b"], grain: 0.45, grainColor: "#000", vignette: "rgba(0,8,4,0.8)", spores: true,
    zoneFill: ["rgba(60,170,130,0.35)", "rgba(20,90,70,0.3)"], zoneStroke: "#7dffcf", zoneStrokeW: 5, zoneDash: "", zoneOpacity: 1, zoneInnerGlow: "rgba(200,60,255,0.3)",
    rough: 11, ink: "#e3fff4", icon: "#9dffe0", iconOpacity: 0.85, shadow: "rgba(0,0,0,0.5)", glow: "#c45bff",
    plate: { fill: "rgba(30,6,45,0.92)", stroke: "#c45bff", text: "#f3e3ff", shape: "tag" },
    link: "#c45bff", linkW: 7, linkDash: "5 14", font: "Oswald", decor: "spores"
  }
};

/* ---------- Свойства зон (по правилам Genesys) ---------- */
const TAGS = {
  cover: { icon: "checked-shield", label: "Укрытие", hint: "+1 к дальней защите" },
  difficult: { icon: "boot-prints", label: "Труднопроходимо", hint: "манёвры перемещения ×2" },
  elevated: { icon: "stairs", label: "Возвышенность", hint: "обзор, преимущество у стрелков" },
  hazard: { icon: "hazard-sign", label: "Опасно", hint: "урон или проверка при входе" },
  dark: { icon: "night-sky", label: "Плохая видимость", hint: "кости штрафа к дальним атакам" },
  impassable: { icon: "brick-wall", label: "Непроходимо", hint: "только навыком (лазание, полёт)" }
};
const RANGES = {
  engaged: { label: "ВПЛОТНУЮ", color: "#e9c46a", hint: "зоны рядом: 1 манёвр" },
  short: { label: "КОРОТКАЯ", color: "#6fcf74", hint: "1 манёвр между зонами" },
  medium: { label: "СРЕДНЯЯ", color: "#f2a531", hint: "2 манёвра между зонами" },
  long: { label: "ДЛИННАЯ", color: "#e2582a", hint: "действие + манёвр, или 2 манёвра ×2" }
};

/* ---------- Карты ---------- */
// x, y — центр зоны; w, h — размеры; props — иконки обстановки.
export const MAPS = [
  { key: "tavern", name: "Таверна «Сломанный рог»", theme: "parchment", worlds: ["fantasy", "terrinoth", "mythic"],
    zones: [
      { id: "hall", name: "Общий зал", x: 1250, y: 1050, w: 1050, h: 720, tags: ["cover"], props: ["round-table", "round-table", "wooden-chair", "beer-stein", "round-table", "wooden-chair"] },
      { id: "bar", name: "Стойка", x: 2250, y: 720, w: 650, h: 520, tags: ["cover"], props: ["barrel", "barrel", "wine-bottle", "beer-stein"] },
      { id: "hearth", name: "Очаг", x: 420, y: 650, w: 520, h: 520, tags: ["hazard"], props: ["fireplace", "cauldron", "candle-flame"] },
      { id: "gallery", name: "Галерея второго этажа", x: 1250, y: 330, w: 1100, h: 360, tags: ["elevated", "cover"], props: ["wooden-door", "wooden-door", "lantern"] },
      { id: "kitchen", name: "Кухня и кладовая", x: 2350, y: 1450, w: 620, h: 560, tags: ["difficult"], props: ["wooden-crate", "cauldron", "barrel", "knapsack"] },
      { id: "street", name: "Улица у входа", x: 480, y: 1660, w: 720, h: 480, tags: ["dark"], props: ["lantern", "old-wagon", "well"] }
    ],
    links: [["hall", "bar", "short"], ["hall", "hearth", "short"], ["hall", "gallery", "short"], ["bar", "kitchen", "engaged"], ["hall", "street", "short"], ["hall", "kitchen", "short"], ["hearth", "gallery", "medium"]] },

  { key: "forest-road", name: "Засада на лесной дороге", theme: "parchment", worlds: ["fantasy", "terrinoth", "mythic"],
    zones: [
      { id: "road", name: "Тракт", x: 1500, y: 1050, w: 1500, h: 420, tags: [], props: ["old-wagon", "knapsack", "wooden-crate"] },
      { id: "thicket", name: "Чаща", x: 650, y: 450, w: 900, h: 600, tags: ["cover", "difficult", "dark"], props: ["pine-tree", "pine-tree", "oak", "berry-bush", "pine-tree"] },
      { id: "ridge", name: "Скалистый гребень", x: 2350, y: 450, w: 800, h: 560, tags: ["elevated", "cover"], props: ["rock", "stone-pile", "pine-tree"] },
      { id: "ravine", name: "Овраг", x: 2300, y: 1620, w: 900, h: 480, tags: ["difficult", "hazard"], props: ["stone-pile", "dead-wood", "water-drop"] },
      { id: "fallen", name: "Поваленное дерево", x: 1450, y: 450, w: 500, h: 380, tags: ["cover"], props: ["dead-wood", "oak"] },
      { id: "camp", name: "Лагерь разбойников", x: 650, y: 1600, w: 820, h: 520, tags: ["cover"], props: ["campfire", "camping-tent", "wooden-crate", "spiked-fence"] }
    ],
    links: [["road", "thicket", "short"], ["road", "ridge", "medium"], ["road", "fallen", "engaged"], ["road", "ravine", "short"], ["road", "camp", "short"], ["thicket", "fallen", "short"], ["fallen", "ridge", "short"], ["camp", "thicket", "medium"]] },

  { key: "river-crossing", name: "Переправа у старой мельницы", theme: "parchment", worlds: ["fantasy", "terrinoth", "mythic"],
    zones: [
      { id: "bridge", name: "Мост", x: 1500, y: 1000, w: 520, h: 420, tags: ["difficult"], props: ["rope-bridge", "lantern"] },
      { id: "west", name: "Западный берег", x: 560, y: 1000, w: 800, h: 1100, tags: ["cover"], props: ["oak", "berry-bush", "old-wagon", "pine-tree"] },
      { id: "mill", name: "Мельница", x: 2420, y: 600, w: 700, h: 640, tags: ["cover", "elevated"], props: ["wooden-door", "wooden-crate", "anvil", "ladder"] },
      { id: "river", name: "Река", x: 1500, y: 300, w: 720, h: 420, tags: ["hazard", "difficult"], props: ["water-drop", "river", "fish-escape"] },
      { id: "ford", name: "Брод", x: 1500, y: 1700, w: 760, h: 420, tags: ["difficult"], props: ["water-drop", "stone-pile"] },
      { id: "east", name: "Мельничный двор", x: 2420, y: 1500, w: 700, h: 640, tags: [], props: ["well", "barrel", "wooden-fence"] }
    ],
    links: [["west", "bridge", "short"], ["bridge", "east", "short"], ["bridge", "mill", "short"], ["west", "ford", "short"], ["ford", "east", "short"], ["mill", "east", "engaged"], ["river", "bridge", "engaged"]] },

  { key: "crypt", name: "Склеп под часовней", theme: "dungeon", worlds: ["fantasy", "terrinoth", "mythic", "monster"],
    zones: [
      { id: "stairs", name: "Лестница вниз", x: 450, y: 450, w: 560, h: 520, tags: ["difficult", "elevated"], props: ["stairs", "torch", "spider-web"] },
      { id: "ossuary", name: "Костница", x: 1300, y: 600, w: 900, h: 640, tags: ["cover", "dark"], props: ["skull-crossed-bones", "coffin", "candle-skull", "coffin"] },
      { id: "altar", name: "Алтарь", x: 2350, y: 650, w: 760, h: 700, tags: ["hazard"], props: ["star-altar", "candle-flame", "candle-flame", "magic-lamp"] },
      { id: "corridor", name: "Узкий коридор", x: 1300, y: 1380, w: 1100, h: 360, tags: ["difficult"], props: ["torch", "cobweb", "torch"] },
      { id: "tomb", name: "Гробница основателя", x: 2350, y: 1550, w: 760, h: 560, tags: ["cover", "dark"], props: ["coffin", "open-chest", "crossed-bones"] },
      { id: "well", name: "Колодец во тьму", x: 420, y: 1550, w: 560, h: 560, tags: ["hazard", "dark"], props: ["well", "spider-web", "chewed-skull"] }
    ],
    links: [["stairs", "ossuary", "short"], ["ossuary", "altar", "short"], ["ossuary", "corridor", "engaged"], ["corridor", "tomb", "short"], ["corridor", "well", "short"], ["altar", "tomb", "medium"]] },

  { key: "cave-lair", name: "Логово в пещере", theme: "dungeon", worlds: ["fantasy", "terrinoth", "mythic", "monster"],
    zones: [
      { id: "mouth", name: "Вход в пещеру", x: 450, y: 1050, w: 620, h: 760, tags: [], props: ["falling-boulder", "campfire"] },
      { id: "tunnel", name: "Извилистый проход", x: 1250, y: 1300, w: 780, h: 420, tags: ["difficult", "dark"], props: ["stone-pile", "mushroom-gills"] },
      { id: "pool", name: "Подземное озеро", x: 1300, y: 500, w: 900, h: 560, tags: ["hazard", "difficult"], props: ["water-drop", "crystal-cluster", "kraken-tentacle"] },
      { id: "ledge", name: "Карниз", x: 2300, y: 450, w: 760, h: 440, tags: ["elevated", "cover"], props: ["rock", "crystal-cluster"] },
      { id: "lair", name: "Логово", x: 2300, y: 1350, w: 900, h: 760, tags: ["cover"], props: ["dinosaur-bones", "open-chest", "animal-skull", "gold-mine"] }
    ],
    links: [["mouth", "tunnel", "short"], ["tunnel", "lair", "short"], ["tunnel", "pool", "short"], ["pool", "ledge", "medium"], ["ledge", "lair", "short"], ["mouth", "pool", "medium"]] },

  { key: "airship-dock", name: "Причальная мачта дирижаблей", theme: "steampunk", worlds: ["steampunk", "weirdwar"],
    zones: [
      { id: "deck", name: "Палуба дирижабля", x: 2200, y: 650, w: 1100, h: 620, tags: ["elevated"], props: ["ship-wheel", "cannon", "wooden-crate", "anchor"] },
      { id: "gangway", name: "Трап", x: 1450, y: 820, w: 520, h: 300, tags: ["difficult", "hazard"], props: ["rope-bridge"] },
      { id: "platform", name: "Платформа мачты", x: 800, y: 700, w: 760, h: 620, tags: ["elevated", "cover"], props: ["cargo-crane", "wooden-crate", "barrel", "lantern"] },
      { id: "engine", name: "Паровая лебёдка", x: 800, y: 1550, w: 760, h: 560, tags: ["hazard", "cover"], props: ["power-generator", "pipes", "anvil"] },
      { id: "warehouse", name: "Склад грузов", x: 1950, y: 1550, w: 1000, h: 560, tags: ["cover"], props: ["cargo-crate", "cargo-crate", "forklift", "barrel"] }
    ],
    links: [["deck", "gangway", "engaged"], ["gangway", "platform", "engaged"], ["platform", "engine", "short"], ["engine", "warehouse", "short"], ["platform", "warehouse", "medium"], ["deck", "warehouse", "medium"]] },

  { key: "harbor-warehouse", name: "Склад в порту", theme: "tactical", worlds: ["modern", "weirdwar", "monster", "zombie"],
    zones: [
      { id: "yard", name: "Погрузочный двор", x: 700, y: 1050, w: 1000, h: 900, tags: [], props: ["truck", "cargo-crate", "forklift"] },
      { id: "floor", name: "Склад: стеллажи", x: 1800, y: 850, w: 900, h: 800, tags: ["cover", "dark"], props: ["cargo-crate", "cargo-crate", "wooden-crate", "cargo-crate", "forklift"] },
      { id: "office", name: "Контора на антресоли", x: 1800, y: 260, w: 700, h: 340, tags: ["elevated", "cover"], props: ["desk", "office-chair", "laptop"] },
      { id: "pier", name: "Причал", x: 2600, y: 1300, w: 560, h: 1100, tags: ["hazard"], props: ["cargo-ship", "anchor", "cargo-crane"] },
      { id: "containers", name: "Контейнерный лабиринт", x: 1250, y: 1720, w: 1100, h: 420, tags: ["cover", "difficult"], props: ["cargo-crate", "cargo-crate", "cargo-crate", "oil-drum"] }
    ],
    links: [["yard", "floor", "short"], ["floor", "office", "short"], ["floor", "pier", "short"], ["yard", "containers", "short"], ["containers", "pier", "medium"], ["containers", "floor", "short"]] },

  { key: "night-street", name: "Ночная улица и переулок", theme: "tactical", worlds: ["modern", "monster", "zombie", "weirdwar"],
    zones: [
      { id: "street", name: "Проезжая часть", x: 1500, y: 1000, w: 1900, h: 420, tags: [], props: ["jeep", "double-street-lights", "car-wheel"] },
      { id: "diner", name: "Закусочная", x: 650, y: 400, w: 900, h: 560, tags: ["cover"], props: ["round-table", "sofa", "beer-stein"] },
      { id: "roof", name: "Крыша", x: 2300, y: 380, w: 860, h: 520, tags: ["elevated", "cover"], props: ["radio-tower", "pipes"] },
      { id: "alley", name: "Тёмный переулок", x: 650, y: 1600, w: 900, h: 560, tags: ["dark", "cover"], props: ["oil-drum", "barricade", "spider-web"] },
      { id: "parking", name: "Парковка", x: 2300, y: 1600, w: 860, h: 560, tags: ["cover"], props: ["jeep", "truck", "car-battery"] }
    ],
    links: [["street", "diner", "short"], ["street", "roof", "medium"], ["street", "alley", "short"], ["street", "parking", "short"], ["diner", "alley", "medium"], ["roof", "parking", "short"]] },

  { key: "gas-station", name: "Заправка в пустоши", theme: "wasteland", worlds: ["postapoc", "zombie"],
    zones: [
      { id: "pumps", name: "Колонки", x: 1500, y: 1000, w: 800, h: 560, tags: ["cover", "hazard"], props: ["gas-pump", "gas-pump", "fuel-tank"] },
      { id: "store", name: "Магазинчик", x: 600, y: 550, w: 760, h: 640, tags: ["cover"], props: ["wooden-crate", "knapsack", "water-bottle"] },
      { id: "wrecks", name: "Кладбище машин", x: 2400, y: 600, w: 820, h: 700, tags: ["cover", "difficult"], props: ["jeep", "car-wheel", "oil-drum", "truck"] },
      { id: "barricade", name: "Баррикада", x: 600, y: 1550, w: 760, h: 520, tags: ["cover", "elevated"], props: ["barricade", "spiked-fence", "oil-drum"] },
      { id: "dunes", name: "Барханы", x: 2400, y: 1600, w: 820, h: 520, tags: ["difficult"], props: ["cactus", "animal-skull", "stone-pile"] },
      { id: "tower", name: "Водонапорная башня", x: 1500, y: 280, w: 520, h: 400, tags: ["elevated"], props: ["control-tower", "ladder"] }
    ],
    links: [["pumps", "store", "short"], ["pumps", "wrecks", "short"], ["pumps", "barricade", "short"], ["pumps", "dunes", "medium"], ["store", "tower", "short"], ["tower", "wrecks", "medium"], ["barricade", "dunes", "long"]] },

  { key: "manor", name: "Заброшенная усадьба", theme: "horror", worlds: ["monster", "modern", "weirdwar", "fantasy"],
    zones: [
      { id: "foyer", name: "Холл", x: 1500, y: 1100, w: 900, h: 640, tags: ["dark"], props: ["armchair", "candle-flame", "wooden-door"] },
      { id: "library", name: "Библиотека", x: 520, y: 600, w: 760, h: 700, tags: ["cover", "dark"], props: ["bookshelf", "bookshelf", "desk-lamp"] },
      { id: "stair", name: "Парадная лестница", x: 1500, y: 360, w: 760, h: 420, tags: ["elevated", "difficult"], props: ["stairs", "candle-flame"] },
      { id: "dining", name: "Столовая", x: 2480, y: 650, w: 720, h: 700, tags: ["cover"], props: ["table", "wine-bottle", "candle-skull"] },
      { id: "cellar", name: "Погреб", x: 2480, y: 1600, w: 720, h: 560, tags: ["dark", "hazard"], props: ["barrel", "coffin", "cobweb"] },
      { id: "garden", name: "Мёртвый сад", x: 520, y: 1600, w: 760, h: 560, tags: ["difficult", "dark"], props: ["evil-tree", "graveyard", "fog"] }
    ],
    links: [["foyer", "library", "short"], ["foyer", "stair", "short"], ["foyer", "dining", "short"], ["dining", "cellar", "short"], ["foyer", "garden", "short"], ["library", "garden", "medium"], ["foyer", "cellar", "medium"]] },

  { key: "starship-bridge", name: "Мостик звездолёта", theme: "hologram", worlds: ["scifi", "spaceopera"],
    zones: [
      { id: "bridge", name: "Командная палуба", x: 1500, y: 740, w: 1200, h: 560, tags: ["cover"], props: ["office-chair", "radar-dish", "laptop", "office-chair"] },
      { id: "helm", name: "Штурвал и навигация", x: 1500, y: 190, w: 820, h: 280, tags: ["elevated"], props: ["spaceship", "game-console"] },
      { id: "corridor", name: "Центральный коридор", x: 1500, y: 1560, w: 700, h: 520, tags: [], props: ["laser-turret", "door"] },
      { id: "reactor", name: "Реакторный отсек", x: 450, y: 1300, w: 700, h: 760, tags: ["hazard"], props: ["power-generator", "pipes", "lava"] },
      { id: "armory", name: "Оружейная", x: 2550, y: 1300, w: 700, h: 760, tags: ["cover"], props: ["cargo-crate", "laser-turret", "tesla-turret"] },
      { id: "airlock", name: "Шлюз", x: 2550, y: 400, w: 600, h: 520, tags: ["hazard", "difficult"], props: ["space-shuttle", "door"] }
    ],
    links: [["bridge", "helm", "engaged"], ["bridge", "corridor", "short"], ["corridor", "reactor", "short"], ["corridor", "armory", "short"], ["bridge", "airlock", "short"]] },

  { key: "station-hangar", name: "Грузовой ангар станции", theme: "hologram", worlds: ["scifi", "spaceopera"],
    zones: [
      { id: "pad", name: "Посадочная площадка", x: 1500, y: 950, w: 1300, h: 800, tags: [], props: ["spaceship", "space-shuttle", "fuel-tank"] },
      { id: "cargo", name: "Грузовой терминал", x: 420, y: 950, w: 620, h: 1100, tags: ["cover"], props: ["cargo-crate", "cargo-crate", "forklift", "robot-grab"] },
      { id: "control", name: "Диспетчерская", x: 2600, y: 400, w: 640, h: 520, tags: ["elevated", "cover"], props: ["control-tower", "laptop", "radar-dish"] },
      { id: "fuel", name: "Топливные магистрали", x: 2600, y: 1450, w: 640, h: 700, tags: ["hazard", "difficult"], props: ["fuel-tank", "pipes", "fire"] },
      { id: "catwalk", name: "Подвесные мостки", x: 1500, y: 180 + 40, w: 1300, h: 260, tags: ["elevated", "difficult"], props: ["ladder", "laser-turret"] },
      { id: "bay", name: "Энергетический барьер", x: 1500, y: 1780, w: 1300, h: 300, tags: ["hazard"], props: ["tesla-turret", "fog"] }
    ],
    links: [["pad", "cargo", "short"], ["pad", "control", "medium"], ["pad", "fuel", "short"], ["pad", "catwalk", "short"], ["pad", "bay", "short"], ["catwalk", "control", "short"]] },

  { key: "alien-jungle", name: "Джунгли чужой планеты", theme: "alien", worlds: ["scifi", "spaceopera"],
    zones: [
      { id: "crash", name: "Место крушения", x: 1500, y: 1050, w: 900, h: 640, tags: ["cover", "hazard"], props: ["space-shuttle", "fire", "cargo-crate"] },
      { id: "canopy", name: "Светящаяся чаща", x: 550, y: 550, w: 860, h: 760, tags: ["cover", "difficult", "dark"], props: ["deku-tree", "fern", "mushroom-gills", "vine-flower"] },
      { id: "spires", name: "Кристаллические шпили", x: 2450, y: 500, w: 820, h: 640, tags: ["elevated", "cover"], props: ["crystal-cluster", "crystal-cluster"] },
      { id: "hive", name: "Гнездо", x: 2450, y: 1550, w: 820, h: 640, tags: ["hazard", "dark"], props: ["alien-egg", "alien-egg", "floating-tentacles"] },
      { id: "swamp", name: "Кислотное болото", x: 550, y: 1600, w: 860, h: 560, tags: ["hazard", "difficult"], props: ["swamp", "water-drop", "purple-tentacle"] },
      { id: "ruins", name: "Древние руины", x: 1500, y: 280, w: 760, h: 400, tags: ["cover", "elevated"], props: ["ancient-ruins", "alien-skull"] }
    ],
    links: [["crash", "canopy", "short"], ["crash", "spires", "medium"], ["crash", "hive", "short"], ["crash", "swamp", "short"], ["canopy", "ruins", "medium"], ["ruins", "spires", "short"]] }
];

/* ---------- Геометрия ---------- */
/** Неровный контур зоны: точки по скруглённому прямоугольнику с шумом, сглаженные кривыми. */
function blobPath(z, rough, rand) {
  const n = 28, pts = [];
  const rx = z.w / 2, ry = z.h / 2, p = 4; // «суперэллипс» — почти прямоугольник со скруглёнными углами
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const k = 1 / Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), 1 / p);
    const jitter = 1 + (rand() - 0.5) * (rough / 100);
    pts.push([z.x + c * rx * k * jitter, z.y + s * ry * k * jitter]);
  }
  // Catmull-Rom → Безье
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

/** Точка на краю зоны в направлении другой точки (по суперэллипсу). */
function edgePoint(z, tx, ty) {
  const a = Math.atan2(ty - z.y, tx - z.x), c = Math.cos(a), s = Math.sin(a), p = 4;
  const k = 1 / Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), 1 / p);
  return [z.x + c * (z.w / 2) * k * 0.96, z.y + s * (z.h / 2) * k * 0.96];
}

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const icon = (name, x, y, size, color, opacity = 1, extra = "") => {
  const ic = ICONS[name];
  if (!ic) return "";
  const sc = size / 512;
  return `<g transform="translate(${(x - size / 2).toFixed(1)} ${(y - size / 2).toFixed(1)}) scale(${sc.toFixed(4)})" fill="${color}" opacity="${opacity}" ${extra}>${ic.body.replace(/fill="currentColor"/g, "").replace(/currentColor/g, color)}</g>`;
};

/* ---------- Раскладка: зоны в верхней части, внизу полоса под картуш и легенду ---------- */
const BAND = 250;
function layout(map) {
  const k = (H - BAND - 60) / H;
  return { ...map, zones: map.zones.map(z => ({ ...z, y: 40 + z.y * k, h: z.h * k })) };
}

/** Изгиб дорожки между зонами (одинаковый для линии и плашки дистанции). */
function linkGeom(map, a, b) {
  const zoneById = Object.fromEntries(map.zones.map(z => [z.id, z]));
  const za = zoneById[a], zb = zoneById[b];
  const [x1, y1] = edgePoint(za, zb.x, zb.y), [x2, y2] = edgePoint(zb, za.x, za.y);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const nx = -(y2 - y1), ny = x2 - x1, len = Math.hypot(nx, ny) || 1;
  const bend = (rng(`${map.key}:${a}-${b}`)() - 0.5) * 140;
  const cx = mx + nx / len * bend, cy = my + ny / len * bend;
  return { x1, y1, x2, y2, cx, cy, px: 0.25 * x1 + 0.5 * cx + 0.25 * x2, py: 0.25 * y1 + 0.5 * cy + 0.25 * y2 };
}

/* ---------- Рендер SVG ---------- */
export function mapSVG(rawMap) {
  const map = layout(rawMap);
  const T = THEMES[map.theme];
  const rand = rng(map.key);
  const parts = [];
  const zoneById = Object.fromEntries(map.zones.map(z => [z.id, z]));

  // defs
  parts.push(`<defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="${T.bg[0]}"/><stop offset="0.65" stop-color="${T.bg[1]}"/><stop offset="1" stop-color="${T.bg[2]}"/></radialGradient>
    <radialGradient id="vig" cx="50%" cy="50%" r="72%"><stop offset="0.55" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="${T.vignette}"/></radialGradient>
    <linearGradient id="zf" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${T.zoneFill[0]}"/><stop offset="1" stop-color="${T.zoneFill[1]}"/></linearGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="${Math.floor(rand() * 99)}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${T.grain} 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <filter id="blotch" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves="4" seed="${Math.floor(rand() * 99)}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${T.blotch ?? 0.45} -0.1"/></filter>
    <filter id="rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${T.rough * 1.2}" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="14"/><feOffset dx="6" dy="12"/><feComponentTransfer><feFuncA type="linear" slope="0.6"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="iconShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="3" dy="5" stdDeviation="4" flood-color="${T.shadow}"/></filter>
    <radialGradient id="torch" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(255,170,70,0.38)"/><stop offset="1" stop-color="rgba(255,120,40,0)"/></radialGradient>
    <radialGradient id="fogG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(220,215,235,0.22)"/><stop offset="1" stop-color="rgba(220,215,235,0)"/></radialGradient>
    <pattern id="hex" width="56" height="97" patternUnits="userSpaceOnUse"><path d="M28 0 L56 16 L56 48 L28 64 L0 48 L0 16Z M28 64 L28 97" fill="none" stroke="rgba(120,230,255,0.13)" stroke-width="2"/></pattern>
  </defs>`);

  // фон
  parts.push(`<rect width="${W}" height="${H}" fill="url(#bg)"/>`);
  parts.push(`<rect width="${W}" height="${H}" fill="${T.grainColor}" filter="url(#blotch)"/>`);
  if (T.grid) {
    const g = [];
    for (let x = 0; x <= W; x += T.grid.size) g.push(`M${x},0V${H}`);
    for (let y = 0; y <= H; y += T.grid.size) g.push(`M0,${y}H${W}`);
    parts.push(`<path d="${g.join("")}" stroke="${T.grid.color}" stroke-width="2"/>`);
  }
  if (T.stars) for (let i = 0; i < 420; i++) parts.push(`<circle cx="${(rand() * W).toFixed(0)}" cy="${(rand() * H).toFixed(0)}" r="${(rand() * 2.4 + 0.4).toFixed(1)}" fill="rgba(200,235,255,${(rand() * 0.7 + 0.2).toFixed(2)})"/>`);
  if (T.spores) for (let i = 0; i < 260; i++) parts.push(`<circle cx="${(rand() * W).toFixed(0)}" cy="${(rand() * H).toFixed(0)}" r="${(rand() * 6 + 1).toFixed(1)}" fill="${rand() > 0.5 ? "rgba(125,255,207," : "rgba(196,91,255,"}${(rand() * 0.45 + 0.1).toFixed(2)})" filter="url(#glow)"/>`);

  // декор фона
  parts.push(decor(T, rand));

  // связи (под зонами)
  for (const [a, b] of map.links) {
    const { x1, y1, x2, y2, cx, cy } = linkGeom(map, a, b);
    const glow = T.glow ? ` filter="url(#glow)"` : "";
    parts.push(`<path d="M${x1.toFixed(0)},${y1.toFixed(0)} Q${cx.toFixed(0)},${cy.toFixed(0)} ${x2.toFixed(0)},${y2.toFixed(0)}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="${T.linkW + 8}" stroke-linecap="round"/>`);
    parts.push(`<path d="M${x1.toFixed(0)},${y1.toFixed(0)} Q${cx.toFixed(0)},${cy.toFixed(0)} ${x2.toFixed(0)},${y2.toFixed(0)}" fill="none" stroke="${T.link}" stroke-width="${T.linkW}" stroke-linecap="round" stroke-dasharray="${T.linkDash}"${glow}/>`);
  }

  // зоны
  for (const z of map.zones) {
    const zr = rng(`${map.key}:${z.id}`);
    const d = blobPath(z, T.rough, zr);
    const rough = T.rough ? ` filter="url(#rough)"` : "";
    parts.push(`<g filter="url(#shadow)"><path d="${d}" fill="url(#zf)" opacity="${T.zoneOpacity}"${rough}/></g>`);
    if (T.hex) parts.push(`<path d="${d}" fill="url(#hex)"/>`);
    parts.push(`<path d="${d}" fill="${T.grainColor}" filter="url(#grain)" opacity="0.28"/>`);
    if (T.torch) parts.push(`<ellipse cx="${z.x}" cy="${z.y}" rx="${z.w * 0.55}" ry="${z.h * 0.55}" fill="url(#torch)"/>`);
    // внутренний ободок
    parts.push(`<path d="${d}" fill="none" stroke="${T.zoneInnerGlow}" stroke-width="${T.zoneStrokeW * 3}" opacity="0.55" transform="translate(${z.x} ${z.y}) scale(0.97) translate(${-z.x} ${-z.y})"/>`);
    const glow = T.glow ? ` filter="url(#glow)"` : "";
    parts.push(`<path d="${d}" fill="none" stroke="${T.zoneStroke}" stroke-width="${T.zoneStrokeW}" stroke-dasharray="${T.zoneDash}" stroke-linejoin="round"${glow}${T.glow ? "" : rough}/>`);
    if (T.rivets) {
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2, [ex, ey] = edgePoint(z, z.x + Math.cos(a) * 5000, z.y + Math.sin(a) * 5000);
        const ix = z.x + (ex - z.x) * 0.93, iy = z.y + (ey - z.y) * 0.93;
        parts.push(`<circle cx="${ix.toFixed(0)}" cy="${iy.toFixed(0)}" r="7" fill="#e6b766" stroke="#5a3a17" stroke-width="2"/>`);
      }
    }
    // обстановка: иконки по кругу внутри зоны, ниже таблички
    const props = z.props ?? [];
    props.forEach((p, i) => {
      const t = props.length === 1 ? 0.5 : i / (props.length - 1);
      const px = z.x - z.w * 0.32 + t * z.w * 0.64 + (zr() - 0.5) * z.w * 0.08;
      const py = z.y + z.h * 0.12 + (i % 2 ? z.h * 0.12 : -z.h * 0.02) + (zr() - 0.5) * z.h * 0.08;
      const size = Math.min(z.w, z.h) * (0.24 + zr() * 0.08);
      const rot = (zr() - 0.5) * 24;
      parts.push(`<g transform="rotate(${rot.toFixed(1)} ${px.toFixed(0)} ${py.toFixed(0)})" filter="${T.glow ? "url(#glow)" : "url(#iconShadow)"}">${icon(p, px, py, size, T.icon, T.iconOpacity)}</g>`);
    });
    // табличка с названием
    parts.push(plate(T, z));
  }

  // туман поверх (хоррор)
  if (T.fog) for (let i = 0; i < 14; i++) parts.push(`<ellipse cx="${(rand() * W).toFixed(0)}" cy="${(rand() * H).toFixed(0)}" rx="${(300 + rand() * 500).toFixed(0)}" ry="${(120 + rand() * 200).toFixed(0)}" fill="url(#fogG)"/>`);
  parts.push(`<rect width="${W}" height="${H}" fill="url(#vig)"/>`);
  parts.push(`<rect width="${W}" height="${H}" fill="${T.grainColor}" filter="url(#grain)" opacity="0.35"/>`);

  // картуш и легенда
  parts.push(cartouche(T, map));
  parts.push(legend(T, map));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("\n")}</svg>`;
}

function plate(T, z) {
  const name = z.name.toUpperCase();
  const fs = 46, w = Math.max(320, name.length * fs * 0.56 + 90), h = 78;
  const x = z.x - w / 2, y = z.y - z.h / 2 + 34;
  const P = T.plate;
  let shape;
  if (P.shape === "banner") {
    shape = `<path d="M${x - 30},${y + 10} L${x},${y} H${x + w} L${x + w + 30},${y + 10} L${x + w + 8},${y + h / 2 + 5} L${x + w + 30},${y + h} H${x - 30} L${x - 8},${y + h / 2 + 5}Z" fill="${P.fill}" stroke="${P.stroke}" stroke-width="5"/>`;
  } else if (P.shape === "stencil") {
    shape = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${P.fill}" stroke="${P.stroke}" stroke-width="6" transform="rotate(-2 ${z.x} ${y + h / 2})"/>`;
  } else if (P.shape === "tag") {
    shape = `<path d="M${x + 18},${y} H${x + w} L${x + w},${y + h - 18} L${x + w - 18},${y + h} H${x} V${y + 18}Z" fill="${P.fill}" stroke="${P.stroke}" stroke-width="4"${T.glow ? ' filter="url(#glow)"' : ""}/>`;
  } else {
    shape = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${P.fill}" stroke="${P.stroke}" stroke-width="5"/><rect x="${x + 8}" y="${y + 8}" width="${w - 16}" height="${h - 16}" rx="9" fill="none" stroke="${P.stroke}" stroke-opacity="0.45" stroke-width="2"/>`;
  }
  const tags = (z.tags ?? []).map((t, i, arr) => {
    const tx = z.x - (arr.length - 1) * 34 + i * 68;
    return `<g><circle cx="${tx}" cy="${y + h + 40}" r="29" fill="${P.fill}" stroke="${P.stroke}" stroke-width="4"/>${icon(TAGS[t].icon, tx, y + h + 40, 36, P.text)}</g>`;
  }).join("");
  return `<g filter="url(#iconShadow)">${shape}<text x="${z.x}" y="${y + h / 2 + fs * 0.36}" text-anchor="middle" font-family="${T.font}" font-weight="600" font-size="${fs}" letter-spacing="3" fill="${P.text}">${esc(name)}</text>${tags}</g>`;
}

function cartouche(T, map) {
  const P = T.plate, x = 40, y = H - BAND + 30, w = 1180, h = BAND - 60;
  return `<g filter="url(#iconShadow)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${P.fill}" stroke="${P.stroke}" stroke-width="6" opacity="0.94"/>
    <rect x="${x + 12}" y="${y + 12}" width="${w - 24}" height="${h - 24}" rx="12" fill="none" stroke="${P.stroke}" stroke-opacity="0.5" stroke-width="2"/>
    <text x="${x + 40}" y="${y + 92}" font-family="${T.font}" font-weight="700" font-size="${map.name.length > 26 ? 52 : 60}" letter-spacing="2" fill="${P.text}">${esc(map.name.toUpperCase())}</text>
    <text x="${x + 42}" y="${y + 150}" font-family="Roboto Condensed" font-size="34" fill="${P.stroke}">GENESYS · ${esc(T.label)}</text></g>`;
}

function legend(T, map) {
  const P = T.plate;
  const used = [...new Set(map.zones.flatMap(z => z.tags ?? []))];
  const ranges = [...new Set(map.links.map(l => l[2]))];
  const rows = [...ranges.map(r => ({ kind: "range", r })), ...used.map(t => ({ kind: "tag", t }))];
  // Полоса внизу: две колонки строк.
  const x = 1260, y = H - BAND + 30, w = W - x - 40, h = BAND - 60, perCol = Math.ceil(rows.length / 2), rh = Math.min(46, (h - 30) / perCol), colW = (w - 40) / 2;
  const out = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${P.fill}" stroke="${P.stroke}" stroke-width="5" opacity="0.94"/>`];
  rows.forEach((row, i) => {
    const col = Math.floor(i / perCol), ci = i % perCol;
    const ry = y + 22 + rh * 0.75 + ci * rh + (perCol < 4 ? (4 - perCol) * rh / 2 : 0);
    const x0 = x + col * colW;
    if (row.kind === "range") {
      const R = RANGES[row.r];
      out.push(`<rect x="${x0 + 26}" y="${ry - 32}" width="150" height="42" rx="21" fill="${P.fill}" stroke="${R.color}" stroke-width="4"/><text x="${x0 + 101}" y="${ry - 3}" text-anchor="middle" font-family="${T.font}" font-weight="600" font-size="22" fill="${R.color}">${R.label}</text>`);
      out.push(`<text x="${x0 + 192}" y="${ry}" font-family="Roboto Condensed" font-size="29" fill="${P.text}">${R.hint}</text>`);
    } else {
      out.push(`<circle cx="${x0 + 101}" cy="${ry - 11}" r="21" fill="${P.fill}" stroke="${P.stroke}" stroke-width="3"/>${icon(TAGS[row.t].icon, x0 + 101, ry - 11, 26, P.text)}`);
      out.push(`<text x="${x0 + 192}" y="${ry}" font-family="Roboto Condensed" font-size="29" fill="${P.text}"><tspan font-weight="700">${TAGS[row.t].label}</tspan> — ${TAGS[row.t].hint}</text>`);
    }
  });
  return `<g filter="url(#iconShadow)">${out.join("")}</g>`;
}

/** Плашки дистанций поверх всего — рисуем отдельно, чтобы зоны их не закрывали. */
function rangePills(T, rawMap) {
  const map = layout(rawMap);
  const placed = [];
  return map.links.map(([a, b, r]) => {
    const g = linkGeom(map, a, b);
    const R = RANGES[r], w = R.label.length * 22 + 50, h = 56;
    // Точка на дуге; если рядом уже есть плашка — сдвинуть вдоль дорожки.
    const at = t => [(1 - t) ** 2 * g.x1 + 2 * (1 - t) * t * g.cx + t * t * g.x2, (1 - t) ** 2 * g.y1 + 2 * (1 - t) * t * g.cy + t * t * g.y2];
    let mx, my;
    for (const t of [0.5, 0.36, 0.64, 0.26, 0.74]) {
      [mx, my] = at(t);
      if (!placed.some(p => Math.abs(p[0] - mx) < (p[2] + w) / 2 + 10 && Math.abs(p[1] - my) < h + 10)) break;
    }
    placed.push([mx, my, w]);
    return `<g filter="url(#iconShadow)"><rect x="${mx - w / 2}" y="${my - h / 2}" width="${w}" height="${h}" rx="28" fill="${T.plate.fill}" stroke="${R.color}" stroke-width="5"/>
      <text x="${mx}" y="${my + 12}" text-anchor="middle" font-family="${T.font}" font-weight="600" font-size="32" letter-spacing="2" fill="${R.color}">${R.label}</text></g>`;
  }).join("");
}

function decor(T, rand) {
  const out = [];
  if (T.decor === "compass") {
    const cx = 2800, cy = 200, r = 120;
    out.push(`<g opacity="0.75" stroke="${T.ink}" fill="none" stroke-width="4"><circle cx="${cx}" cy="${cy}" r="${r}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.8}" stroke-dasharray="4 10"/>
      <path d="M${cx},${cy - r * 1.2} L${cx + 24},${cy} L${cx},${cy + r * 1.2} L${cx - 24},${cy}Z" fill="${T.ink}" fill-opacity="0.6"/><path d="M${cx - r * 1.2},${cy} L${cx},${cy - 24} L${cx + r * 1.2},${cy} L${cx},${cy + 24}Z" fill="${T.ink}" fill-opacity="0.3"/></g>
      <text x="${cx}" y="${cy - r * 1.3}" text-anchor="middle" font-family="Oswald" font-size="40" fill="${T.ink}" opacity="0.8">С</text>`);
  } else if (T.decor === "gears") {
    for (let i = 0; i < 9; i++) out.push(icon("gears", rand() * W, rand() * H, 180 + rand() * 260, "#c8933f", 0.07));
  } else if (T.decor === "crosshair") {
    out.push(`<g stroke="rgba(242,165,49,0.35)" stroke-width="3" fill="none"><circle cx="2800" cy="200" r="90"/><path d="M2690,200H2910M2800,90V310"/></g>`);
    out.push(`<text x="2580" y="380" font-family="Roboto Condensed" font-size="30" fill="rgba(232,241,251,0.5)" letter-spacing="4">СЕКТОР · 01-${Math.floor(rand() * 90 + 10)}</text>`);
  } else if (T.decor === "hazard") {
    out.push(`<g opacity="0.25"><path d="M0,0 H${W} V40 H0Z" fill="#2e2a26"/>${Array.from({ length: 60 }, (_, i) => `<path d="M${i * 60},0 L${i * 60 + 30},0 L${i * 60},40 L${i * 60 - 30},40Z" fill="#e2582a"/>`).join("")}</g>`);
  } else if (T.decor === "hud") {
    out.push(`<g stroke="rgba(79,227,255,0.45)" stroke-width="4" fill="none"><path d="M40,140 V40 H140"/><path d="M${W - 140},40 H${W - 40} V140"/><path d="M40,${H - 140} V${H - 40} H140" opacity="0"/><path d="M${W - 40},${H - 600} V${H - 700}"/></g>`);
  } else if (T.decor === "chains" || T.decor === "drips") {
    for (let i = 0; i < 6; i++) out.push(icon(T.decor === "chains" ? "crossed-bones" : "drop", rand() * W, rand() * H, 120 + rand() * 120, T.ink, 0.05));
  }
  return out.join("");
}

/* ---------- Сборка ---------- */
async function main() {
  fs.mkdirSync(path.join(OUT, "thumbs"), { recursive: true });
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const font = f => `file://${ROOT}/assets/fonts/${f}`;
  const fontsCSS = `@font-face{font-family:Oswald;font-weight:400 700;src:url(${font("oswald-cyrillic-600-normal.woff2")}) format("woff2");unicode-range:U+0400-04FF}
    @font-face{font-family:Oswald;font-weight:400 700;src:url(${font("oswald-latin-600-normal.woff2")}) format("woff2");unicode-range:U+0000-03FF,U+2000-206F}
    @font-face{font-family:"Roboto Condensed";src:url(${font("roboto-condensed-cyrillic-400-normal.woff2")}) format("woff2");unicode-range:U+0400-04FF}
    @font-face{font-family:"Roboto Condensed";src:url(${font("roboto-condensed-latin-400-normal.woff2")}) format("woff2");unicode-range:U+0000-03FF,U+2000-206F}
    @font-face{font-family:"Roboto Condensed";font-weight:700;src:url(${font("roboto-condensed-cyrillic-700-normal.woff2")}) format("woff2");unicode-range:U+0400-04FF}
    @font-face{font-family:"Roboto Condensed";font-weight:700;src:url(${font("roboto-condensed-latin-700-normal.woff2")}) format("woff2");unicode-range:U+0000-03FF,U+2000-206F}`;
  const only = process.argv[2];
  const scenes = [];
  for (const map of MAPS) {
    if (only && only !== map.key) continue;
    let svg = mapSVG(map);
    svg = svg.replace("</svg>", `${rangePills(THEMES[map.theme], map)}</svg>`);
    const file = path.join(ROOT, ".build", `map-${map.key}.html`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"><style>${fontsCSS} body{margin:0}</style></head><body>${svg}</body></html>`);
    await page.goto(`file://${file}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${map.key}.jpg`), type: "jpeg", quality: 86 });
    const thumb = await browser.newPage({ viewport: { width: 600, height: 400 } });
    await thumb.goto(`file://${file}`);
    await thumb.addStyleTag({ content: "svg{width:600px;height:400px}" });
    await thumb.evaluate(() => document.fonts.ready);
    await thumb.screenshot({ path: path.join(OUT, "thumbs", `${map.key}.jpg`), type: "jpeg", quality: 80 });
    await thumb.close();
    console.log("карта:", map.key);
  }
  await browser.close();

  // Сцены для компендиума (без сетки: в Genesys дистанции, а не клетки).
  for (const map of MAPS) {
    scenes.push({
      name: map.name, type: "scene", folder: THEMES[map.theme].label,
      worlds: map.worlds,
      scene: {
        background: { src: `systems/genesys-rpg/assets/maps/${map.key}.jpg` },
        thumb: `systems/genesys-rpg/assets/maps/thumbs/${map.key}.jpg`,
        width: W, height: H, padding: 0.05, backgroundColor: THEMES[map.theme].bg[2],
        grid: { type: 0, size: 100 }, tokenVision: false, fog: { exploration: false },
        initial: { x: W / 2, y: H / 2, scale: 0.45 },
        flags: { "genesys-rpg": { zoneMap: true, bg: `systems/genesys-rpg/assets/maps/${map.key}.jpg`, bgColor: THEMES[map.theme].bg[2], zones: map.zones.map(z => ({ name: z.name, tags: z.tags })), links: map.links } }
      }
    });
  }
  fs.mkdirSync(path.join(ROOT, "packs-src/scenes"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "packs-src/scenes/zone-maps.json"), JSON.stringify(scenes, null, 2) + "\n");
  console.log("сцен:", scenes.length);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main();
