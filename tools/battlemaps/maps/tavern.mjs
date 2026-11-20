import { W, H, rng, P, walls } from "../lib.mjs";

/* ==========================================================================
   Карта: таверна
   ========================================================================== */
const BUILDING = { x: 150, y: 110, w: 2700, h: 1430 };

function tavern() {
  const r = rng("tavern-props");
  const b = BUILDING, xR = b.x + b.w, yB = b.y + b.h;
  const xBar = 1980, yKitchen = 860, xHearthEnd = 760, yStairsEnd = 520, xStairs = 760, xStairsEnd = 1180;
  const L = [];
  // Улица — брусчатка по всей нижней части и по краям.
  L.push(`<rect width="${W}" height="${H}" fill="url(#cobbles)"/>`);
  L.push(`<rect width="${W}" height="${H}" filter="url(#dirt)"/>`);
  // Пол здания: доски, кухня — плитка.
  L.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="url(#planks)"/>`);
  L.push(`<rect x="${xBar}" y="${yKitchen}" width="${xR - xBar}" height="${yB - yKitchen}" fill="url(#tiles)"/>`);
  L.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#000" filter="url(#grain)" opacity="0.5"/>`);
  // Ковёр у очага.
  L.push(P.rug(260, 300, 420, 300));
  // Очаг у северной стены.
  L.push(P.fireplace(440, b.y + 70, 300, 120));
  L.push(P.armchair(330, 420, -20), P.armchair(560, 430, 25));
  // Лестница на второй этаж.
  L.push(P.stairs(xStairs + 40, b.y + 30, xStairsEnd - xStairs - 80, yStairsEnd - b.y - 60, 10));
  // Общий зал: круглые и длинные столы.
  L.push(P.roundTable(560, 860, 75, 4, 0.4), P.roundTable(980, 760, 70, 5, 0.1), P.roundTable(1450, 760, 80, 4, 0.8), P.roundTable(1050, 1180, 75, 4, 0.2), P.roundTable(1580, 1200, 70, 5, 0.6));
  L.push(P.longTable(330, 1120, 420, 110));
  for (const [x, y] of [[560, 860], [980, 760], [1450, 760], [1050, 1180], [1580, 1200]]) L.push(P.mug(x + 30, y + 22), P.mug(x - 34, y - 10));
  // Стойка: Г-образный прилавок, полки с бутылками, бочки.
  L.push(P.counter([[xBar + 60, 260], [xBar + 60, 700], [xR - 380, 700]], 84));
  L.push(P.shelf(xBar + 200, b.y + 40, 560, 60), P.shelf(xR - 120, 300, 60, 380).replace(/<circle[^/]*\/>/g, ""));
  for (const [x, y] of [[xR - 140, 230], [xR - 140, 340], [xR - 250, 230]]) L.push(P.barrel(x, y));
  L.push(P.bottles(xBar + 30, 480, 1), P.mug(xBar + 60, 420), P.mug(xBar + 60, 560), P.mug(xBar + 200, 700), P.mug(xBar + 380, 700));
  // Кухня: котёл, ящики, мешки, бочки, разделочный стол.
  L.push(P.cauldron(2250, 1130), P.longTable(2460, 980, 300, 90, false), P.crate(2700, 1400, 92, 8), P.crate(2600, 1430, 80, -12), P.sacks(2150, 1390), P.barrel(2760, 1200, 42));
  // Улица: колодец, телега, сено, фонари.
  L.push(P.well(500, 1790), P.wagon(1500, 1800, -4), P.hay(2550, 1770));
  // Стены с проёмами.
  L.push(walls([
    [[b.x, b.y], [xR, b.y]],
    [[b.x, b.y], [b.x, yB]],
    [[xR, b.y], [xR, yB]],
    [[b.x, yB], [880, yB]], [[1100, yB], [2380, yB]], [[2560, yB], [xR, yB]], // входная дверь и задняя дверь кухни
    [[xBar, yKitchen], [xBar, 1080]], [[xBar, 1260], [xBar, yB]], // дверь из зала на кухню
    [[xBar, yKitchen], [xR, yKitchen]] // кухня отделена от стойки
  ]));
  L.push(P.door(880, yB, 220), P.door(2380, yB, 180), P.door(xBar, 1080, 180, false));
  // Свет.
  L.push(P.lantern(1000, 980), P.lantern(1700, 960), P.lantern(2350, 520), P.lantern(2400, 1250), P.lantern(990, 1660), P.lantern(2200, 1660));
  L.push(`<rect width="${W}" height="${H}" fill="url(#night)"/>`);
  return L.join("\n");
}

/** Зоны таверны: многоугольники для разметки и регионов Foundry. */
const TAVERN_ZONES = [
  { id: "hearth", name: "У очага", tags: ["hazard"], poly: [[150, 110], [760, 110], [760, 700], [150, 700]], label: [455, 590], size: 54 },
  { id: "stairs", name: "Лестница", tags: ["elevated"], poly: [[760, 110], [1180, 110], [1180, 520], [760, 520]], label: [970, 470], size: 48 },
  { id: "hall", name: "Общий зал", tags: ["cover"], poly: [[760, 520], [1180, 520], [1180, 110], [1980, 110], [1980, 1540], [150, 1540], [150, 700], [760, 700]], label: [1300, 1000] },
  { id: "bar", name: "Стойка", tags: ["cover"], poly: [[1980, 110], [2850, 110], [2850, 860], [1980, 860]], label: [2420, 560] },
  { id: "kitchen", name: "Кухня", tags: ["difficult"], poly: [[1980, 860], [2850, 860], [2850, 1540], [1980, 1540]], label: [2420, 1300] },
  { id: "street", name: "Улица", tags: ["dark"], poly: [[0, 1540], [3000, 1540], [3000, 2000], [0, 2000]], label: [1000, 1890] }
];
const TAVERN_LINKS = [["hearth", "hall", "short"], ["stairs", "hall", "short"], ["hearth", "stairs", "short"], ["hall", "bar", "short"], ["hall", "kitchen", "short"], ["bar", "kitchen", "short"], ["hall", "street", "short"], ["kitchen", "street", "short"]];


export default {
  key: "tavern", name: "Таверна «Сломанный рог»", folder: "Фэнтези", worlds: ["fantasy", "terrinoth", "mythic"],
  draw: tavern, zones: TAVERN_ZONES, links: TAVERN_LINKS,
  style: { tint: "rgba(255,230,170,0.05)", line: "rgba(255,226,150,0.9)", text: "#ffe9b8" }
};
