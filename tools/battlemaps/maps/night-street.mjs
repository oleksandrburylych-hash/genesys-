import { W, H, rng, f1 } from "../lib.mjs";

/* ==========================================================================
   Карта: ночная улица и переулок (современность, вид сверху)
   Сверху — закусочная (интерьер) и крыша соседнего дома; посередине — улица с тротуарами;
   снизу — тёмный переулок между домами и парковка. Неон, фонари, мокрый асфальт.
   ========================================================================== */
const K = "night-street";
const ROAD = { y1: 840, y2: 1220 };    // проезжая часть
const WALK = { n: 700, s: 1330 };      // фасады / граница тротуаров
const DINER = { x: 40, x2: 1420 };
const ROOF = { x: 1480 };
const ALLEY = { x: 250, x2: 850 };

function extraDefs() {
  const r = rng(K + "-defs");
  const asph = [`<rect width="320" height="320" fill="#2a2c31"/>`];
  for (let k = 0; k < 320; k++) { const g = Math.round(30 + r() * 60); asph.push(`<circle cx="${f1(r() * 320)}" cy="${f1(r() * 320)}" r="${f1(0.8 + r() * 1.7)}" fill="rgb(${g},${g},${g + 5})"/>`); }
  for (let k = 0; k < 4; k++) asph.push(`<ellipse cx="${f1(r() * 320)}" cy="${f1(r() * 320)}" rx="${f1(20 + r() * 40)}" ry="${f1(10 + r() * 20)}" fill="rgba(0,0,0,0.18)"/>`);
  const gravel = [`<rect width="200" height="200" fill="#3a3a3c"/>`];
  for (let k = 0; k < 260; k++) { const g = Math.round(50 + r() * 70); gravel.push(`<circle cx="${f1(r() * 200)}" cy="${f1(r() * 200)}" r="${f1(1.2 + r() * 2.4)}" fill="rgb(${g},${g - 3},${g - 6})"/>`); }
  const walk = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const s = 0.88 + r() * 0.16; walk.push(`<rect x="${i * 60 + 1}" y="${j * 60 + 1}" width="58" height="58" fill="rgb(${Math.round(112 * s)},${Math.round(112 * s)},${Math.round(116 * s)})" stroke="#3a3b40" stroke-width="2"/>`); }
  const bricks = [`<rect width="80" height="40" fill="#5a2e24"/>`, `<path d="M0,0.5 H80 M0,20 H80 M40,0 V20 M0,20 V40 M80,20 V40" stroke="#2a1510" stroke-width="3"/>`];
  return `<defs>
    <pattern id="${K}-asphalt" width="320" height="320" patternUnits="userSpaceOnUse">${asph.join("")}</pattern>
    <pattern id="${K}-gravel" width="200" height="200" patternUnits="userSpaceOnUse">${gravel.join("")}</pattern>
    <pattern id="${K}-walk" width="240" height="240" patternUnits="userSpaceOnUse">${walk.join("")}</pattern>
    <pattern id="${K}-brick" width="80" height="40" patternUnits="userSpaceOnUse">${bricks.join("")}</pattern>
    <pattern id="${K}-checker" width="80" height="80" patternUnits="userSpaceOnUse"><rect width="80" height="80" fill="#d6cebe"/><rect width="40" height="40" fill="#222226"/><rect x="40" y="40" width="40" height="40" fill="#222226"/></pattern>
    <pattern id="${K}-steel" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#8a8f96"/><path d="M0,20 H40 M20,0 V40" stroke="#6a6f76" stroke-width="2"/></pattern>
    <pattern id="${K}-grate" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#15171a"/><rect x="2" y="2" width="12" height="12" fill="none" stroke="#5a5f66" stroke-width="2.5"/></pattern>
    <radialGradient id="${K}-hole"><stop offset="0" stop-color="#000" stop-opacity="1"/><stop offset="0.5" stop-color="#000" stop-opacity="0.65"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <radialGradient id="${K}-sodium"><stop offset="0" stop-color="rgba(255,196,120,0.45)"/><stop offset="0.5" stop-color="rgba(255,160,80,0.14)"/><stop offset="1" stop-color="rgba(255,140,60,0)"/></radialGradient>
    <radialGradient id="${K}-pink"><stop offset="0" stop-color="rgba(255,70,170,0.5)"/><stop offset="0.5" stop-color="rgba(255,60,160,0.16)"/><stop offset="1" stop-color="rgba(255,60,160,0)"/></radialGradient>
    <radialGradient id="${K}-cyan"><stop offset="0" stop-color="rgba(60,230,255,0.42)"/><stop offset="0.5" stop-color="rgba(60,220,255,0.12)"/><stop offset="1" stop-color="rgba(60,220,255,0)"/></radialGradient>
    <radialGradient id="${K}-red"><stop offset="0" stop-color="rgba(255,60,50,0.5)"/><stop offset="0.5" stop-color="rgba(255,50,40,0.16)"/><stop offset="1" stop-color="rgba(255,50,40,0)"/></radialGradient>
    <radialGradient id="${K}-warm"><stop offset="0" stop-color="rgba(255,226,170,0.38)"/><stop offset="0.6" stop-color="rgba(255,210,150,0.12)"/><stop offset="1" stop-color="rgba(255,200,140,0)"/></radialGradient>
    <radialGradient id="${K}-amber"><stop offset="0" stop-color="rgba(255,170,40,0.55)"/><stop offset="1" stop-color="rgba(255,150,30,0)"/></radialGradient>
    <radialGradient id="${K}-vig" cx="50%" cy="50%" r="72%"><stop offset="0.55" stop-color="rgba(4,6,18,0)"/><stop offset="1" stop-color="rgba(2,3,12,0.72)"/></radialGradient>
    <linearGradient id="${K}-beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgba(255,250,220,0.5)"/><stop offset="1" stop-color="rgba(255,250,220,0)"/></linearGradient>
    <linearGradient id="${K}-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="rgba(160,210,240,0.55)"/><stop offset="1" stop-color="rgba(90,140,180,0.35)"/></linearGradient>
    <filter id="${K}-neon" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="9" result="b"/><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="c"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="${K}-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>
    <filter id="${K}-high" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="12" dy="20" stdDeviation="12" flood-color="rgba(0,0,0,0.7)"/></filter>
    ${darkMask()}
  </defs>`;
}

/* ---------- Свет ---------- */
const LIGHTS = [ // x, y, радиус, цвет, сила дырки в темноте
  [330, 780, 330, "sodium", 1], [1330, 780, 330, "sodium", 1], [2420, 780, 330, "sodium", 1], [880, 1270, 330, "sodium", 1], [1960, 1270, 330, "sodium", 1], [2860, 1270, 300, "sodium", 1],
  [650, 760, 330, "pink", 1], [1050, 760, 200, "cyan", 0.8], [2570, 660, 380, "red", 0.9],
  [330, 430, 380, "warm", 1], [900, 430, 380, "warm", 1], [1260, 430, 260, "warm", 0.9],
  [2120, 1560, 420, "sodium", 1], [770, 1650, 190, "warm", 0.7], [2450, 290, 170, "warm", 0.7], [1660, 270, 130, "warm", 0.7]
];
function darkMask() {
  return `<mask id="${K}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${LIGHTS.map(([x, y, rr, , k]) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="url(#${K}-hole)" opacity="${k}"/>`).join("")}
    <path d="M2390,1015 L2760,880 L2800,1060 Z" fill="#000" opacity="0.55" filter="url(#${K}-blur)"/></mask>`;
}

/* ---------- Примитивы ---------- */
const S = `filter="url(#soft)"`;
function car(x, y, rot, col, o = {}) { // седан 240×104, (x,y) — центр, капот вправо
  const L = [];
  L.push(`<rect x="${x - 120}" y="${y - 52}" width="240" height="104" rx="30" fill="${col}" stroke="#0b0d10" stroke-width="4"/>`);
  L.push(`<rect x="${x - 112}" y="${y - 44}" width="224" height="88" rx="24" fill="rgba(255,255,255,0.06)"/>`);
  L.push(`<path d="M${x + 26},${y - 42} q24,42 0,84 l30,-6 q16,-36 0,-72 Z" fill="#141c26"/><path d="M${x - 60},${y - 40} q-16,40 0,80 l-24,-4 q-12,-36 0,-72 Z" fill="#141c26"/>`);
  L.push(`<rect x="${x - 58}" y="${y - 42}" width="84" height="84" rx="12" fill="${col}"/><rect x="${x - 58}" y="${y - 42}" width="84" height="84" rx="12" fill="rgba(0,0,0,0.12)"/>`);
  L.push(`<path d="M${x + 34},${y - 30} l10,22" stroke="rgba(255,255,255,0.28)" stroke-width="4"/><path d="M${x + 70},${y - 40} q20,40 0,80" stroke="rgba(0,0,0,0.3)" stroke-width="3" fill="none"/>`);
  L.push(`<rect x="${x + 108}" y="${y - 42}" width="10" height="22" rx="3" fill="#fff6d8"/><rect x="${x + 108}" y="${y + 20}" width="10" height="22" rx="3" fill="#fff6d8"/><rect x="${x - 120}" y="${y - 42}" width="8" height="20" rx="3" fill="#c0201a"/><rect x="${x - 120}" y="${y + 22}" width="8" height="20" rx="3" fill="#c0201a"/>`);
  L.push(`<rect x="${x + 16}" y="${y - 64}" width="16" height="12" rx="3" fill="${col}" stroke="#0b0d10" stroke-width="2"/><rect x="${x + 16}" y="${y + 52}" width="16" height="12" rx="3" fill="${col}" stroke="#0b0d10" stroke-width="2"/>`);
  if (o.taxi) L.push(`<rect x="${x - 30}" y="${y - 12}" width="30" height="24" rx="4" fill="#fff4b0" stroke="#222" stroke-width="2"/><path d="M${x - 118},${y} H${x + 118}" stroke="rgba(0,0,0,0.5)" stroke-width="4" stroke-dasharray="10 10"/>`);
  if (o.police) L.push(`<rect x="${x - 24}" y="${y - 30}" width="20" height="60" rx="4" fill="#222"/><rect x="${x - 22}" y="${y - 28}" width="16" height="26" fill="#ff3030"/><rect x="${x - 22}" y="${y + 2}" width="16" height="26" fill="#3070ff"/>`);
  if (o.door) L.push(`<path d="M${x - 10},${y - 52} l70,-60" stroke="${col}" stroke-width="12" stroke-linecap="round"/><path d="M${x - 10},${y - 52} l70,-60" stroke="rgba(0,0,0,0.3)" stroke-width="4"/>`);
  if (o.glass) { const g = rng(K + x + y); for (let i = 0; i < 14; i++) L.push(`<rect x="${f1(x + 60 + g() * 90)}" y="${f1(y - 120 + g() * 240)}" width="6" height="4" fill="rgba(200,230,255,0.7)"/>`); }
  return `<g ${S} transform="rotate(${rot} ${x} ${y})">${L.join("")}</g>`;
}
function van(x, y, rot, col) {
  return `<g ${S} transform="rotate(${rot} ${x} ${y})"><rect x="${x - 150}" y="${y - 58}" width="300" height="116" rx="16" fill="${col}" stroke="#0b0d10" stroke-width="4"/>
    <rect x="${x - 140}" y="${y - 48}" width="210" height="96" rx="6" fill="rgba(255,255,255,0.08)"/>${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${x - 130 + i * 34},${y - 46} V${y + 46}" stroke="rgba(0,0,0,0.18)" stroke-width="3"/>`).join("")}
    <path d="M${x + 80},${y - 50} q22,50 0,100 l40,-8 q14,-42 0,-84 Z" fill="#141c26"/><rect x="${x + 138}" y="${y - 50}" width="10" height="22" rx="3" fill="#fff6d8"/><rect x="${x + 138}" y="${y + 28}" width="10" height="22" rx="3" fill="#fff6d8"/>
    <circle cx="${x - 146}" cy="${y - 46}" r="9" fill="#ffb020"/><circle cx="${x - 146}" cy="${y + 46}" r="9" fill="#ffb020"/><circle cx="${x + 146}" cy="${y - 54}" r="9" fill="#ffb020"/><circle cx="${x + 146}" cy="${y + 54}" r="9" fill="#ffb020"/></g>`;
}
function streetLamp(x, y, dir) { // dir: 1 — плафон вниз (на улицу), -1 — вверх
  return `<g ${S}><circle cx="${x}" cy="${y}" r="14" fill="#2a2d33" stroke="#0b0c0e" stroke-width="3"/><rect x="${x - 4}" y="${dir > 0 ? y : y - 70}" width="8" height="70" fill="#2a2d33"/><ellipse cx="${x}" cy="${y + dir * 74}" rx="16" ry="24" fill="#2a2d33" stroke="#0b0c0e" stroke-width="3"/><ellipse cx="${x}" cy="${y + dir * 74}" rx="10" ry="16" fill="#fff0c0" filter="url(#glow)"/></g>`;
}
function tree(x, y, rr, r) {
  let o = `<circle cx="${x}" cy="${y}" r="${rr}" fill="#16261a"/>`;
  for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, d = r() * rr * 0.5; o += `<circle cx="${f1(x + Math.cos(a) * d)}" cy="${f1(y + Math.sin(a) * d)}" r="${f1(rr * (0.35 + r() * 0.3))}" fill="rgb(${Math.round(30 + r() * 20)},${Math.round(56 + r() * 26)},${Math.round(34 + r() * 14)})"/>`; }
  return `<g filter="url(#${K}-high)">${o}<circle cx="${x - rr * 0.25}" cy="${y - rr * 0.25}" r="${rr * 0.3}" fill="rgba(160,200,120,0.12)"/></g>`;
}
function trashBags(x, y, n, r) {
  let o = "";
  for (let i = 0; i < n; i++) { const bx = x + (r() - 0.5) * 90, by = y + (r() - 0.5) * 70, s = 22 + r() * 14; o += `<ellipse cx="${f1(bx)}" cy="${f1(by)}" rx="${f1(s)}" ry="${f1(s * 0.85)}" fill="#141518" stroke="#000" stroke-width="2"/><ellipse cx="${f1(bx - s * 0.3)}" cy="${f1(by - s * 0.3)}" rx="${f1(s * 0.35)}" ry="${f1(s * 0.2)}" fill="rgba(255,255,255,0.18)"/>`; }
  return `<g ${S}>${o}</g>`;
}
function dumpster(x, y, w, h, col, rot = 0) {
  return `<g filter="url(#${K}-high)" transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${col}" stroke="#05080a" stroke-width="5"/><rect x="${x + 6}" y="${y + 6}" width="${w / 2 - 9}" height="${h - 12}" fill="rgba(0,0,0,0.2)"/><rect x="${x + w / 2 + 3}" y="${y + 6}" width="${w / 2 - 9}" height="${h - 12}" fill="rgba(255,255,255,0.06)"/><path d="M${x + w / 2},${y + 4} V${y + h - 4}" stroke="#05080a" stroke-width="4"/></g>`;
}
function fireEscape(x, y, w, h, side) { // решётчатые площадки с лестницей, прикреплены к стене
  const L = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${K}-grate)" stroke="#0b0c0e" stroke-width="4"/>`];
  const rx = side > 0 ? x + w : x;
  L.push(`<path d="M${rx},${y} V${y + h} M${x},${y} H${x + w} M${x},${y + h} H${x + w}" stroke="#3a3f46" stroke-width="7"/>`);
  for (let yy = y + h * 0.3; yy < y + h * 0.7; yy += 16) L.push(`<path d="M${x + 10},${f1(yy)} H${x + w - 10}" stroke="#4a5058" stroke-width="5"/>`);
  L.push(`<rect x="${x + 6}" y="${y + h * 0.3}" width="${w - 12}" height="${h * 0.4}" fill="none" stroke="#2a2e33" stroke-width="4"/>`);
  return `<g filter="url(#${K}-high)">${L.join("")}</g>`;
}
function neonText(x, y, text, size, col, rot = 0, spacing = 10) {
  return `<g transform="rotate(${rot} ${x} ${y})" filter="url(#${K}-neon)"><text x="${x}" y="${y}" text-anchor="middle" font-family="Oswald" font-weight="600" font-size="${size}" letter-spacing="${spacing}" fill="none" stroke="${col}" stroke-width="${f1(size * 0.06)}">${text}</text><text x="${x}" y="${y}" text-anchor="middle" font-family="Oswald" font-weight="600" font-size="${size}" letter-spacing="${spacing}" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="${f1(size * 0.018)}">${text}</text></g>`;
}
function puddle(x, y, rx, ry, tint, rot = 0) {
  return `<g transform="rotate(${rot} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="rgba(10,18,30,0.65)"/><ellipse cx="${x + rx * 0.1}" cy="${y - ry * 0.1}" rx="${rx * 0.75}" ry="${ry * 0.55}" fill="${tint}" filter="url(#${K}-blur)"/><ellipse cx="${x - rx * 0.3}" cy="${y - ry * 0.3}" rx="${rx * 0.25}" ry="${ry * 0.12}" fill="rgba(255,255,255,0.15)"/></g>`;
}
function manhole(x, y) { return `<circle cx="${x}" cy="${y}" r="34" fill="#1c1d20" stroke="#0a0a0c" stroke-width="4"/><circle cx="${x}" cy="${y}" r="26" fill="none" stroke="#3a3c40" stroke-width="3"/><path d="M${x - 22},${y} H${x + 22} M${x},${y - 22} V${y + 22} M${x - 15},${y - 15} L${x + 15},${y + 15} M${x + 15},${y - 15} L${x - 15},${y + 15}" stroke="#3a3c40" stroke-width="3"/>`; }
function steam(r, x, y, s = 1) {
  let o = ""; for (let i = 0; i < 7; i++) o += `<circle cx="${f1(x + (r() - 0.3) * 80 * s + i * 12)}" cy="${f1(y - i * 14 * s + (r() - 0.5) * 30)}" r="${f1((24 + r() * 30) * s)}" fill="rgba(220,225,235,${f1(0.18 + r() * 0.18)})"/>`;
  return `<g filter="url(#${K}-blur)">${o}</g>`;
}
function parapet(x, y, w, h, t = 22) {
  return `<g filter="url(#wallshadow)"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#141518" stroke-width="${t + 8}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#7d7a74" stroke-width="${t}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="3"/></g>`;
}

/* ---------- Улица ---------- */
function street() {
  const r = rng(K + "-street"), L = [];
  L.push(`<rect y="${WALK.n}" width="${W}" height="${WALK.s - WALK.n}" fill="url(#${K}-walk)"/>`);
  L.push(`<rect y="${ROAD.y1}" width="${W}" height="${ROAD.y2 - ROAD.y1}" fill="url(#${K}-asphalt)"/>`);
  // Бордюры, разметка.
  for (const y of [ROAD.y1, ROAD.y2]) L.push(`<rect y="${y - 8}" width="${W}" height="16" fill="#8e8e90" stroke="#3a3a3e" stroke-width="2"/>`);
  L.push(`<path d="M0,${ROAD.y1 + 24} H${W} M0,${ROAD.y2 - 24} H${W}" stroke="rgba(230,230,225,0.6)" stroke-width="6"/>`);
  L.push(`<path d="M0,1025 H1180 M1500,1025 H${W} M0,1037 H1180 M1500,1037 H${W}" stroke="rgba(235,190,50,0.85)" stroke-width="6"/>`);
  for (let y = ROAD.y1 + 40; y < ROAD.y2 - 40; y += 54) L.push(`<rect x="1220" y="${y}" width="240" height="28" fill="rgba(235,235,230,0.78)"/>`);
  L.push(`<path d="M1180,${ROAD.y1 + 30} V${ROAD.y2 - 30} M1500,${ROAD.y1 + 30} V${ROAD.y2 - 30}" stroke="rgba(235,235,230,0.6)" stroke-width="10"/>`);
  // Съезд к парковке, устье переулка.
  L.push(`<rect x="1520" y="${ROAD.y2 + 8}" width="300" height="${WALK.s - ROAD.y2 - 8}" fill="url(#${K}-asphalt)"/><path d="M1520,${ROAD.y2 + 8} l-30,${WALK.s - ROAD.y2 - 8} M1820,${ROAD.y2 + 8} l30,${WALK.s - ROAD.y2 - 8}" stroke="#8e8e90" stroke-width="10"/>`);
  L.push(`<rect x="${ALLEY.x + 30}" y="${ROAD.y2 + 8}" width="${ALLEY.x2 - ALLEY.x - 60}" height="${WALK.s - ROAD.y2 - 8}" fill="rgba(30,30,34,0.5)"/>`);
  // Грязь, трещины, заплаты асфальта.
  for (let i = 0; i < 6; i++) L.push(`<rect x="${f1(r() * 2800)}" y="${f1(ROAD.y1 + 40 + r() * 280)}" width="${f1(60 + r() * 140)}" height="${f1(30 + r() * 50)}" fill="rgba(0,0,0,0.18)" transform="rotate(${f1((r() - 0.5) * 10)})"/>`);
  L.push(manhole(560, 940), manhole(2050, 1130));
  for (const x of [200, 1000, 1650, 2700]) L.push(`<rect x="${x}" y="${ROAD.y2 - 30}" width="70" height="22" fill="url(#${K}-grate)" stroke="#0a0a0c" stroke-width="2"/>`);
  // Лужи с отражениями неона.
  L.push(puddle(700, 905, 120, 34, "rgba(255,70,170,0.5)"), puddle(1080, 1150, 90, 26, "rgba(60,220,255,0.4)"), puddle(2560, 905, 150, 36, "rgba(255,60,50,0.5)"), puddle(1800, 980, 80, 22, "rgba(255,190,110,0.35)"), puddle(400, 1270, 70, 20, "rgba(255,190,110,0.35)"));
  // Машины: такси, брошенная машина с открытой дверью и разбитым стеклом, фургон с аварийкой, полицейская у тротуара.
  L.push(car(760, 1130, 0, "#e2b21e", { taxi: true }));
  L.push(`<path d="M2390,1015 L2760,880 L2800,1060 Z" fill="url(#${K}-beam)" opacity="0.6" filter="url(#${K}-blur)"/>`);
  L.push(car(2270, 1020, -18, "#6a7480", { door: true, glass: true }));
  L.push(van(2760, 915, 180, "#d9d9d6"));
  L.push(car(150, 920, 180, "#1e2a3a", { police: true }));
  // Тротуары: фонари, гидрант, урны, почтовый ящик, деревья, остановка.
  for (const x of [330, 1330, 2420]) L.push(streetLamp(x, WALK.n + 24, 1));
  for (const x of [880, 1960, 2860]) L.push(streetLamp(x, WALK.s - 24, -1));
  L.push(`<g ${S}><circle cx="1720" cy="${ROAD.y1 - 40}" r="18" fill="#b8241c" stroke="#3a0a08" stroke-width="4"/><circle cx="1720" cy="${ROAD.y1 - 40}" r="8" fill="#e04a3a"/><rect x="1698" y="${ROAD.y1 - 46}" width="44" height="12" fill="#b8241c"/></g>`);
  L.push(`<g ${S}><circle cx="1440" cy="770" r="24" fill="#2a3a2c" stroke="#0a120c" stroke-width="4"/><circle cx="1440" cy="770" r="14" fill="#101410"/><rect x="2100" y="1250" width="56" height="50" rx="6" fill="#1f4a8a" stroke="#0a1830" stroke-width="4"/><circle cx="1270" cy="1265" r="22" fill="#2a3a2c" stroke="#0a120c" stroke-width="4"/></g>`);
  L.push(`<g ${S}><rect x="2560" y="1240" width="250" height="66" fill="url(#${K}-glass)" stroke="#2a3038" stroke-width="5"/><rect x="2575" y="1290" width="220" height="14" fill="#4a3a2e"/></g>`);
  L.push(tree(110, 1270, 62, r), tree(2380, 1272, 58, r), tree(1980, 780, 58, r));
  L.push(trashBags(1150, 780, 4, r), steam(r, 2050, 1110, 1.1), steam(r, 560, 920, 0.8));
  // Газеты, мусор на тротуаре.
  for (let i = 0; i < 14; i++) L.push(`<rect x="${f1(r() * 3000)}" y="${f1(WALK.n + 20 + r() * 100 + (r() < 0.5 ? 0 : 500))}" width="${f1(10 + r() * 16)}" height="${f1(8 + r() * 12)}" fill="rgba(220,215,200,0.6)" transform="rotate(${f1(r() * 90)})"/>`);
  return L.join("\n");
}

/* ---------- Закусочная ---------- */
function diner() {
  const r = rng(K + "-diner"), L = [], { x, x2 } = DINER, yS = WALK.n - 20;
  L.push(`<rect x="0" y="0" width="${ROOF.x - 20}" height="${WALK.n}" fill="#1c1d22"/>`);
  L.push(`<rect x="${x}" y="0" width="${x2 - x}" height="${yS}" fill="url(#${K}-checker)"/>`);
  L.push(`<rect x="${x}" y="0" width="${x2 - x}" height="230" fill="url(#tiles)"/>`); // кухня
  L.push(`<rect x="${x}" y="0" width="${x2 - x}" height="${yS}" fill="#000" filter="url(#grain)" opacity="0.35"/>`);
  // Кухня: плита, гриль, фритюр, холодильник, мойка, разделочный стол.
  L.push(`<g ${S}><rect x="90" y="30" width="260" height="110" fill="url(#${K}-steel)" stroke="#2a2d31" stroke-width="5"/><rect x="104" y="44" width="110" height="82" fill="#202226"/>${[0, 1, 2, 3, 4, 5].map(i => `<path d="M110,${54 + i * 12} H208" stroke="#4a3a2a" stroke-width="4"/>`).join("")}<rect x="104" y="44" width="110" height="82" fill="rgba(255,120,30,0.25)"/>${[[250, 65], [310, 65], [250, 110], [310, 110]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="20" fill="#1c1d20" stroke="#555" stroke-width="3"/><circle cx="${a}" cy="${b}" r="10" fill="none" stroke="#d24a1a" stroke-width="3"/>`).join("")}</g>`);
  L.push(`<g ${S}><rect x="370" y="30" width="150" height="100" fill="url(#${K}-steel)" stroke="#2a2d31" stroke-width="5"/><rect x="384" y="44" width="56" height="72" fill="#c49a2a"/><rect x="450" y="44" width="56" height="72" fill="#c49a2a"/><path d="M390,60 h44 M456,60 h44" stroke="#e8c860" stroke-width="3"/></g>`);
  L.push(`<g ${S}><rect x="560" y="30" width="220" height="90" fill="#b8bec6" stroke="#2a2d31" stroke-width="5"/><path d="M670,34 V116" stroke="#2a2d31" stroke-width="3"/><rect x="800" y="30" width="180" height="80" fill="url(#${K}-steel)" stroke="#2a2d31" stroke-width="5"/><rect x="816" y="44" width="70" height="52" rx="10" fill="#4a5a6a"/><circle cx="851" cy="70" r="5" fill="#222"/><rect x="1000" y="30" width="110" height="140" fill="#d8dce0" stroke="#2a2d31" stroke-width="5"/><path d="M1055,34 V166" stroke="#2a2d31" stroke-width="3"/></g>`);
  L.push(`<g ${S}><rect x="420" y="160" width="300" height="56" fill="url(#${K}-steel)" stroke="#2a2d31" stroke-width="4"/><rect x="460" y="170" width="70" height="36" fill="#d8b070"/><circle cx="600" cy="188" r="16" fill="#eee" stroke="#888" stroke-width="2"/><circle cx="660" cy="188" r="14" fill="#c8402a"/></g>`);
  // Перегородка кухни с окном раздачи и дверью-маятником.
  L.push(`<path d="M${x},235 H1110 M1200,235 H1180" stroke="#2a2a2e" stroke-width="14"/><path d="M300,235 H900" stroke="#b8bec6" stroke-width="10"/>`);
  L.push(`<path d="M1110,235 l60,40 M1200,235 l-30,40" stroke="#8a8f96" stroke-width="6"/>`);
  // Стойка с табуретами.
  L.push(`<g ${S}><path d="M140,300 H1060 Q1100,300 1100,340 V420" stroke="#1a1214" stroke-width="80" fill="none"/><path d="M140,300 H1060 Q1100,300 1100,340 V420" stroke="#c8c8cc" stroke-width="70" fill="none"/><path d="M140,300 H1060 Q1100,300 1100,340 V420" stroke="#b02a34" stroke-width="54" fill="none"/><path d="M140,288 H1060" stroke="rgba(255,255,255,0.18)" stroke-width="6"/></g>`);
  for (let sx = 190; sx <= 1010; sx += 92) L.push(`<g ${S}><circle cx="${sx}" cy="378" r="26" fill="#d0d0d4" stroke="#222" stroke-width="3"/><circle cx="${sx}" cy="378" r="19" fill="#c8303a"/><circle cx="${sx - 6}" cy="372" r="6" fill="rgba(255,255,255,0.35)"/></g>`);
  // На стойке: кофе, тарелки, салфетницы, витрина с пирогом, касса.
  for (let i = 0; i < 9; i++) { const cx = 190 + i * 92 + (r() - 0.5) * 30; L.push(r() < 0.5 ? `<circle cx="${f1(cx)}" cy="300" r="14" fill="#f0eee8" stroke="#888" stroke-width="2"/><circle cx="${f1(cx)}" cy="300" r="8" fill="#3a1e10"/>` : `<circle cx="${f1(cx)}" cy="302" r="22" fill="#f4f2ec" stroke="#999" stroke-width="2"/><circle cx="${f1(cx + 4)}" cy="300" r="10" fill="#c8a050"/>`); }
  L.push(`<circle cx="420" cy="298" r="28" fill="rgba(220,240,255,0.5)" stroke="#ccc" stroke-width="3"/><path d="M420,298 L440,280 A28,28 0 0 1 448,300 Z" fill="#d8a050"/><rect x="1072" y="350" width="56" height="44" fill="#3a3a40" stroke="#111" stroke-width="3"/><rect x="1080" y="356" width="40" height="14" fill="#60ff90" opacity="0.7"/>`);
  // Кабинки у окон.
  for (const bx of [170, 400, 630, 860]) {
    L.push(`<g ${S}><rect x="${bx - 112}" y="545" width="56" height="140" rx="16" fill="#8e1e28" stroke="#2a0a0e" stroke-width="4"/><rect x="${bx + 56}" y="545" width="56" height="140" rx="16" fill="#8e1e28" stroke="#2a0a0e" stroke-width="4"/>
      <rect x="${bx - 112}" y="545" width="20" height="140" rx="8" fill="#6a1018"/><rect x="${bx + 92}" y="545" width="20" height="140" rx="8" fill="#6a1018"/>
      <rect x="${bx - 46}" y="560" width="92" height="124" rx="6" fill="#e6dccb" stroke="#555" stroke-width="3"/><rect x="${bx - 46}" y="560" width="92" height="124" rx="6" fill="none" stroke="#c8c8cc" stroke-width="5"/></g>`);
    L.push(`<circle cx="${bx - 18}" cy="600" r="18" fill="#f4f2ec" stroke="#999" stroke-width="2"/><circle cx="${bx + 20}" cy="640" r="12" fill="#f0eee8" stroke="#888" stroke-width="2"/><circle cx="${bx + 20}" cy="640" r="7" fill="#3a1e10"/><rect x="${bx - 10}" y="662" width="20" height="14" fill="#c8c8cc"/>`);
  }
  // Подвесные лампы над столиками и стойкой.
  for (const lx of [170, 400, 630, 860]) L.push(`<circle cx="${lx}" cy="622" r="15" fill="#ffe6b0" stroke="#3a2a10" stroke-width="3" filter="url(#glow)"/>`);
  for (const lx of [260, 560, 860]) L.push(`<circle cx="${lx}" cy="250" r="13" fill="#ffe6b0" stroke="#3a2a10" stroke-width="3" filter="url(#glow)"/>`);
  // Опрокинутый стул/стол, рассыпанная еда — следы паники.
  L.push(`<g ${S} transform="rotate(30 1240 560)"><circle cx="1240" cy="560" r="44" fill="#e6dccb" stroke="#555" stroke-width="3"/><circle cx="1240" cy="560" r="44" fill="none" stroke="#c8c8cc" stroke-width="5"/></g><g ${S}><rect x="1180" y="620" width="44" height="40" rx="8" fill="#c8303a" stroke="#2a0a0e" stroke-width="3" transform="rotate(-40 1200 640)"/><rect x="1290" y="500" width="44" height="40" rx="8" fill="#c8303a" stroke="#2a0a0e" stroke-width="3"/></g>`);
  L.push(`<circle cx="1160" cy="520" r="18" fill="#f4f2ec" stroke="#999" stroke-width="2"/><path d="M1130,540 q30,20 70,6" stroke="#8a1a10" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.8"/>`);
  // Музыкальный автомат.
  L.push(`<g ${S}><rect x="1300" y="380" width="96" height="70" rx="30" fill="#7a3a1a" stroke="#1a0a04" stroke-width="4"/><rect x="1312" y="392" width="72" height="46" rx="20" fill="#ffcf5a" opacity="0.85" filter="url(#glow)"/><path d="M1320,415 H1376" stroke="#ff4fa8" stroke-width="5"/></g>`);
  // Туалеты.
  L.push(`<rect x="1220" y="0" width="200" height="235" fill="url(#tiles)" opacity="0.9"/><path d="M1220,0 V235 M1220,118 H1420" stroke="#2a2a2e" stroke-width="14"/><path d="M1220,60 v40 M1220,170 v40" stroke="#c8c8cc" stroke-width="16"/>`);
  L.push(`<g ${S}><ellipse cx="1380" cy="58" rx="22" ry="28" fill="#f0f0f0" stroke="#666" stroke-width="3"/><ellipse cx="1380" cy="176" rx="22" ry="28" fill="#f0f0f0" stroke="#666" stroke-width="3"/><rect x="1260" y="30" width="44" height="34" rx="6" fill="#e8e8e8" stroke="#666" stroke-width="3"/></g>`);
  // Стены: кирпич снаружи; фасад — витрины и стеклянная дверь.
  const wall = (d, t = 30) => `<g filter="url(#wallshadow)"><path d="${d}" stroke="#120a08" stroke-width="${t + 8}" fill="none" stroke-linecap="square"/><path d="${d}" stroke="url(#${K}-brick)" stroke-width="${t}" fill="none" stroke-linecap="square"/></g>`;
  L.push(wall(`M${x},-20 V${yS} H80 M${x2},-20 V${yS} H1390`));
  L.push(`<path d="M80,${yS} H1150 M1260,${yS} H1390" stroke="#14181e" stroke-width="22"/><path d="M80,${yS} H1150 M1260,${yS} H1390" stroke="url(#${K}-glass)" stroke-width="14"/>`);
  for (let mx = 80; mx <= 1150; mx += 214) L.push(`<rect x="${mx - 6}" y="${yS - 13}" width="12" height="26" fill="#c8c8cc"/>`);
  L.push(`<path d="M1150,${yS} l70,-70" stroke="url(#${K}-glass)" stroke-width="10"/><path d="M1150,${yS} l70,-70" stroke="#c8c8cc" stroke-width="3"/><path d="M1150,${yS - 100} A100,100 0 0 1 1250,${yS}" stroke="rgba(255,255,255,0.25)" stroke-width="3" fill="none" stroke-dasharray="8 6"/>`);
  // Козырёк-маркиза над тротуаром.
  L.push(`<g filter="url(#${K}-high)">${Array.from({ length: 13 }, (_, i) => `<rect x="${80 + i * 82}" y="${yS + 12}" width="82" height="56" fill="${i % 2 ? "#e8e2d4" : "#b02a34"}"/>`).join("")}<path d="M80,${yS + 68} ${Array.from({ length: 13 }, (_, i) => `q20,14 41,0 q20,14 41,0`).join(" ")}" fill="none" stroke="#2a0a0e" stroke-width="3"/></g>`);
  return L.join("\n");
}

/* ---------- Крыша соседнего дома ---------- */
function roof() {
  const r = rng(K + "-roof"), L = [], x0 = ROOF.x, yS = WALK.n - 14;
  L.push(`<rect x="${x0}" y="-30" width="${W - x0 + 40}" height="${yS + 30}" fill="url(#${K}-gravel)"/>`);
  L.push(`<rect x="${x0}" y="-30" width="${W - x0 + 40}" height="${yS + 30}" filter="url(#dirt)" opacity="0.7"/>`);
  for (const [px, py, rx, ry] of [[2050, 640, 120, 30], [2860, 140, 90, 40], [1700, 560, 60, 24]]) L.push(puddle(px, py, rx, ry, "rgba(255,120,110,0.25)"));
  // Выход на крышу (будка с дверью).
  L.push(`<g filter="url(#${K}-high)"><rect x="1560" y="60" width="200" height="180" fill="#4a4844" stroke="#141414" stroke-width="6"/><rect x="1572" y="72" width="176" height="156" fill="#3a3834"/><path d="M1572,72 L1748,228 M1748,72 L1572,228" stroke="rgba(0,0,0,0.2)" stroke-width="4"/></g>`);
  L.push(`<rect x="1620" y="236" width="80" height="16" fill="#6a4a2a" stroke="#1a0a04" stroke-width="3"/><circle cx="1660" cy="250" r="9" fill="#ffe2a0" filter="url(#glow)"/><path d="M1620,252 l-40,70" stroke="#6a4a2a" stroke-width="8"/>`);
  // Большой кондиционер с вентиляторами и воздуховоды.
  const fan = (cx, cy, rr) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="#1a1c20" stroke="#0a0a0c" stroke-width="3"/>${[0, 1, 2, 3].map(i => `<ellipse cx="${cx}" cy="${cy - rr * 0.45}" rx="${rr * 0.18}" ry="${rr * 0.45}" fill="#5a5f66" transform="rotate(${i * 90 + 20} ${cx} ${cy})"/>`).join("")}<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="#3a3f46" stroke-width="4" stroke-dasharray="4 6"/><circle cx="${cx}" cy="${cy}" r="${rr * 0.18}" fill="#8a8f96"/>`;
  L.push(`<g filter="url(#${K}-high)"><rect x="1880" y="90" width="300" height="190" rx="8" fill="#9aa0a6" stroke="#22262a" stroke-width="5"/><rect x="1880" y="90" width="300" height="190" rx="8" fill="url(#${K}-steel)" opacity="0.4"/>${fan(1960, 185, 62)}${fan(2100, 185, 62)}</g>`);
  L.push(`<g ${S}><path d="M2180,180 H2300 V420" stroke="#14161a" stroke-width="58" fill="none"/><path d="M2180,180 H2300 V420" stroke="#8a9096" stroke-width="48" fill="none"/>${[2210, 2250, 2300].map(xx => `<path d="M${xx},158 V202" stroke="#5a6066" stroke-width="3"/>`).join("")}${[230, 300, 370].map(yy => `<path d="M2276,${yy} H2324" stroke="#5a6066" stroke-width="3"/>`).join("")}</g>`);
  L.push(`<g filter="url(#${K}-high)"><rect x="2240" y="420" width="140" height="120" rx="6" fill="#9aa0a6" stroke="#22262a" stroke-width="5"/>${fan(2310, 480, 46)}</g>`);
  // Световые фонари крыши (стекло, свет снизу).
  L.push(`<g filter="url(#${K}-high)"><rect x="2380" y="240" width="160" height="100" fill="#2a2a2e" stroke="#111" stroke-width="5"/><rect x="2390" y="250" width="68" height="80" fill="rgba(255,220,150,0.75)"/><rect x="2462" y="250" width="68" height="80" fill="rgba(255,220,150,0.6)"/><path d="M2390,290 H2530" stroke="#2a2a2e" stroke-width="4"/></g>`);
  // Водонапорный бак на опорах.
  const tx = 2760, ty = 300, tr = 140;
  let tank = `${[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => `<rect x="${tx + a * tr * 0.78 - 14}" y="${ty + b * tr * 0.78 - 14}" width="28" height="28" fill="#2a2a2e" stroke="#0a0a0c" stroke-width="3"/>`).join("")}<circle cx="${tx}" cy="${ty}" r="${tr}" fill="#6a4a30" stroke="#1a0e06" stroke-width="6"/>`;
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; tank += `<path d="M${tx},${ty} L${f1(tx + Math.cos(a) * tr)},${f1(ty + Math.sin(a) * tr)}" stroke="rgba(30,16,6,0.55)" stroke-width="3"/>`; }
  tank += `<circle cx="${tx}" cy="${ty}" r="${tr - 30}" fill="none" stroke="#2a2a2e" stroke-width="6"/><circle cx="${tx}" cy="${ty}" r="${tr - 80}" fill="none" stroke="#2a2a2e" stroke-width="5"/><circle cx="${tx}" cy="${ty}" r="16" fill="#3a3a3e" stroke="#111" stroke-width="3"/><path d="M${tx - tr},${ty} L${tx - tr - 40},${ty + 60}" stroke="#3a3a3e" stroke-width="8"/>`;
  L.push(`<g filter="url(#${K}-high)">${tank}</g>`);
  // Тарелка, антенны, вентиляционные трубы.
  L.push(`<g filter="url(#${K}-high)"><ellipse cx="2470" cy="110" rx="56" ry="44" fill="#d8d8d4" stroke="#333" stroke-width="4" transform="rotate(-30 2470 110)"/><path d="M2470,110 l40,-30" stroke="#333" stroke-width="5"/><circle cx="2510" cy="80" r="8" fill="#555"/></g>`);
  const antenna = (ax, ay, len, rot) => `<g transform="rotate(${rot} ${ax} ${ay})" filter="url(#${K}-high)"><path d="M${ax},${ay} V${ay - len}" stroke="#0e0f12" stroke-width="11"/><path d="M${ax},${ay} V${ay - len}" stroke="#7a8088" stroke-width="5"/>${[0.2, 0.4, 0.6, 0.8].map((t, i) => `<path d="M${ax - 50 + i * 8},${ay - len * t} H${ax + 50 - i * 8}" stroke="#0e0f12" stroke-width="8"/><path d="M${ax - 50 + i * 8},${ay - len * t} H${ax + 50 - i * 8}" stroke="#8a9098" stroke-width="4"/>`).join("")}<circle cx="${ax}" cy="${ay}" r="10" fill="#5a6068" stroke="#0e0f12" stroke-width="3"/></g>`;
  L.push(antenna(2140, 560, 180, 30), antenna(2920, 600, 160, -20), antenna(1840, 120, 150, 10));
  for (let i = 0; i < 9; i++) { const vx = 1560 + r() * 1400, vy = 40 + r() * 600; if (vx > 1560 && vx < 2040 && vy > 400) continue; L.push(`<g ${S}><circle cx="${f1(vx)}" cy="${f1(vy)}" r="14" fill="#5a5f66" stroke="#111" stroke-width="3"/><circle cx="${f1(vx)}" cy="${f1(vy)}" r="7" fill="#111"/></g>`); }
  // Уголок отдыха: шезлонги, переносной холодильник, гирлянда.
  L.push(`<g ${S}>${[[2470, 500, -12], [2580, 520, 10]].map(([cx, cy, a]) => `<g transform="rotate(${a} ${cx} ${cy})"><rect x="${cx - 26}" y="${cy - 60}" width="52" height="120" rx="8" fill="#2a6a8a" stroke="#0a1a24" stroke-width="3"/>${[0, 1, 2, 3, 4].map(i => `<path d="M${cx - 22},${cy - 40 + i * 20} H${cx + 22}" stroke="#e8e2d4" stroke-width="5"/>`).join("")}</g>`).join("")}<rect x="2500" y="590" width="60" height="40" rx="6" fill="#c8402a" stroke="#2a0a04" stroke-width="3"/><rect x="2500" y="590" width="60" height="12" fill="#e8e8e8"/></g>`);
  const lights = []; for (let t = 0; t <= 1.0001; t += 1 / 22) { const lx = 1760 + (2640 - 1760) * t, ly = 240 + (420 - 240) * t + Math.sin(t * Math.PI) * 120; lights.push([lx, ly]); }
  L.push(`<path d="M${lights.map(p => `${f1(p[0])},${f1(p[1])}`).join(" L")}" stroke="#111" stroke-width="3" fill="none"/>${lights.map(([lx, ly], i) => `<circle cx="${f1(lx)}" cy="${f1(ly)}" r="6" fill="${["#ffd27a", "#ff7ab0", "#7ae0ff", "#b0ff7a"][i % 4]}" filter="url(#glow)"/>`).join("")}`);
  // Парапет крыши.
  L.push(parapet(x0, -40, W - x0 + 60, yS + 40));
  // Неоновая вывеска на парапете над улицей.
  L.push(`<g filter="url(#${K}-high)"><rect x="2300" y="${yS - 96}" width="540" height="64" fill="#14141a" stroke="#050508" stroke-width="5"/>${[2340, 2440, 2540, 2640, 2740, 2800].map(xx => `<rect x="${xx}" y="${yS - 32}" width="10" height="24" fill="#2a2a2e"/>`).join("")}</g>`);
  L.push(neonText(2584, yS - 40, "HOTEL", 56, "#ff3a30", 0, 46));
  return L.join("\n");
}

/* ---------- Тёмный переулок ---------- */
function alley() {
  const r = rng(K + "-alley"), L = [], y0 = WALK.s;
  // Мостовая переулка: старая брусчатка, сток посередине.
  L.push(`<rect x="${ALLEY.x}" y="${y0}" width="${ALLEY.x2 - ALLEY.x}" height="${H - y0}" fill="url(#cobbles)"/>`);
  L.push(`<rect x="${ALLEY.x}" y="${y0}" width="${ALLEY.x2 - ALLEY.x}" height="${H - y0}" fill="rgba(10,12,20,0.35)"/>`);
  L.push(`<path d="M${(ALLEY.x + ALLEY.x2) / 2},${y0} V${H}" stroke="rgba(0,0,0,0.5)" stroke-width="26"/><path d="M${(ALLEY.x + ALLEY.x2) / 2},${y0} V${H}" stroke="rgba(60,80,100,0.35)" stroke-width="10"/>`);
  L.push(puddle(470, 1560, 90, 40, "rgba(255,200,130,0.25)", 80), puddle(640, 1880, 110, 34, "rgba(120,140,180,0.2)", 10), puddle(560, 1390, 70, 22, "rgba(255,190,110,0.35)"));
  // Дома по сторонам: плоские крыши с парапетом.
  L.push(`<rect x="-40" y="${y0}" width="${ALLEY.x + 40}" height="${H - y0 + 40}" fill="#24252a"/><rect x="-40" y="${y0}" width="${ALLEY.x + 40}" height="${H - y0 + 40}" fill="url(#${K}-gravel)" opacity="0.5"/>`);
  L.push(`<rect x="${ALLEY.x2}" y="${y0}" width="${1150 - ALLEY.x2}" height="${H - y0 + 40}" fill="#24252a"/><rect x="${ALLEY.x2}" y="${y0}" width="${1150 - ALLEY.x2}" height="${H - y0 + 40}" fill="url(#${K}-gravel)" opacity="0.5"/>`);
  L.push(parapet(-40, y0 + 12, ALLEY.x + 28, H - y0 + 60, 26), parapet(ALLEY.x2 + 12, y0 + 12, 1150 - ALLEY.x2 - 24, H - y0 + 60, 26));
  L.push(`<g filter="url(#${K}-high)"><rect x="60" y="1500" width="110" height="90" fill="#7a7e84" stroke="#1a1c1f" stroke-width="4"/><circle cx="115" cy="1545" r="32" fill="#1a1c20"/><rect x="920" y="1780" width="150" height="110" fill="#7a7e84" stroke="#1a1c1f" stroke-width="4"/><circle cx="965" cy="1835" r="30" fill="#1a1c20"/><circle cx="1030" cy="1835" r="30" fill="#1a1c20"/></g>`);
  L.push(`<g ${S}><rect x="980" y="1420" width="90" height="90" fill="#2e2f34" stroke="#0c0c0e" stroke-width="4"/><rect x="990" y="1430" width="70" height="70" fill="#3e3f44"/></g>`);
  // Пожарные лестницы на стенах переулка.
  L.push(fireEscape(ALLEY.x - 4, 1720, 92, 250, -1), fireEscape(ALLEY.x2 - 88, 1440, 92, 260, 1), fireEscape(ALLEY.x2 - 88, 1790, 92, 200, 1));
  // Мусорные баки, пакеты, коробки, тележка из магазина.
  L.push(dumpster(ALLEY.x + 20, 1400, 110, 170, "#2a5a3a", 0), dumpster(ALLEY.x2 - 230, 1700, 120, 170, "#3a4a6a", 6));
  L.push(trashBags(ALLEY.x + 140, 1470, 5, r), trashBags(ALLEY.x2 - 110, 1620, 3, r), trashBags(ALLEY.x + 150, 1950, 4, r));
  L.push(`<g ${S}>${[[380, 1650, 70, 50, 20], [420, 1700, 60, 46, -15], [700, 1950, 80, 56, 8]].map(([bx, by, w, h, a]) => `<g transform="rotate(${a} ${bx} ${by})"><rect x="${bx - w / 2}" y="${by - h / 2}" width="${w}" height="${h}" fill="#9a7a50" stroke="#3a2a14" stroke-width="3"/><path d="M${bx - w / 2},${by} H${bx + w / 2}" stroke="#6a5030" stroke-width="3"/></g>`).join("")}</g>`);
  L.push(`<g ${S} transform="rotate(-25 560 1780)"><rect x="510" y="1745" width="100" height="70" fill="none" stroke="#b8bcc2" stroke-width="5"/>${[0, 1, 2, 3].map(i => `<path d="M${520 + i * 24},1748 V1812" stroke="#8a8e94" stroke-width="2"/>`).join("")}<path d="M610,1750 l26,-10 M610,1810 l26,10" stroke="#b8bcc2" stroke-width="5"/></g>`);
  // Пар из решётки, лампа над чёрным входом.
  L.push(`<rect x="430" y="1820" width="90" height="50" fill="url(#${K}-grate)" stroke="#0a0a0c" stroke-width="3"/>`, steam(r, 470, 1830, 1));
  L.push(`<rect x="${ALLEY.x2 - 12}" y="1600" width="16" height="100" fill="#3a2a1e" stroke="#120a06" stroke-width="3"/><circle cx="${ALLEY.x2 - 22}" cy="1650" r="10" fill="#ffd890" filter="url(#glow)"/>`);
  // Кошка на крышке бака.
  L.push(`<g ${S}><ellipse cx="${ALLEY.x + 80}" cy="1450" rx="16" ry="22" fill="#141414"/><circle cx="${ALLEY.x + 80}" cy="1424" r="11" fill="#141414"/><path d="M${ALLEY.x + 74},1416 l-3,-8 l6,4 M${ALLEY.x + 86},1416 l3,-8 l-6,4" fill="#141414" stroke="#141414" stroke-width="3"/><circle cx="${ALLEY.x + 76}" cy="1422" r="2" fill="#d8ff60"/><circle cx="${ALLEY.x + 84}" cy="1422" r="2" fill="#d8ff60"/><path d="M${ALLEY.x + 80},1472 q20,10 10,30" stroke="#141414" stroke-width="5" fill="none"/></g>`);
  return L.join("\n");
}

/* ---------- Парковка ---------- */
function parking() {
  const r = rng(K + "-park"), L = [], x0 = 1150, y0 = WALK.s;
  L.push(`<rect x="${x0}" y="${y0}" width="${W - x0}" height="${H - y0}" fill="url(#${K}-asphalt)"/>`);
  L.push(`<rect x="${x0}" y="${y0}" width="${W - x0}" height="${H - y0}" filter="url(#dirt)" opacity="0.5"/>`);
  // Места: нижний ряд и верхний правый ряд.
  const sw = 130;
  for (let x = 1250; x <= 2950; x += sw) L.push(`<path d="M${x},1700 V1990" stroke="rgba(235,235,230,0.65)" stroke-width="6"/>`);
  L.push(`<path d="M1250,1700 H2950" stroke="rgba(235,235,230,0.25)" stroke-width="4" stroke-dasharray="20 20"/>`);
  for (let x = 2310; x <= 2960; x += sw) L.push(`<path d="M${x},${y0 + 20} V1560" stroke="rgba(235,235,230,0.65)" stroke-width="6"/>`);
  for (let x = 1250 + sw / 2; x < 2950; x += sw) L.push(`<rect x="${x - 40}" y="1960" width="80" height="16" rx="6" fill="#8a8a88" stroke="#333" stroke-width="2"/>`);
  for (const [x, y, a] of [[1700, 1640, 0], [2150, 1640, 0]]) L.push(`<path d="M${x - 70},${y} H${x + 40} M${x + 10},${y - 26} L${x + 56},${y} L${x + 10},${y + 26}" stroke="rgba(235,235,230,0.5)" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="rotate(${a} ${x} ${y})"/>`);
  // Масляные пятна.
  for (let i = 0; i < 12; i++) L.push(`<ellipse cx="${f1(1300 + r() * 1650)}" cy="${f1(1750 + r() * 200)}" rx="${f1(16 + r() * 30)}" ry="${f1(10 + r() * 16)}" fill="rgba(0,0,0,0.3)"/>`);
  // Островок с деревьями и мачтой освещения.
  L.push(`<g ${S}><rect x="1960" y="1400" width="300" height="120" rx="50" fill="#5e5e5c" stroke="#2a2a2a" stroke-width="5"/><rect x="1972" y="1412" width="276" height="96" rx="42" fill="#2a3a22"/></g>`);
  L.push(tree(2020, 1455, 56, r), tree(2200, 1460, 52, r));
  L.push(`<g ${S}><circle cx="2110" cy="1460" r="16" fill="#2a2d33" stroke="#0b0c0e" stroke-width="3"/><path d="M2110,1460 h-60 M2110,1460 h60" stroke="#2a2d33" stroke-width="8"/><rect x="2036" y="1450" width="30" height="20" rx="4" fill="#fff0c0" filter="url(#glow)"/><rect x="2154" y="1450" width="30" height="20" rx="4" fill="#fff0c0" filter="url(#glow)"/></g>`);
  // Будка оплаты и шлагбаум у въезда.
  L.push(`<g filter="url(#${K}-high)"><rect x="1300" y="1380" width="120" height="100" fill="#d8d4c8" stroke="#2a2a2a" stroke-width="5"/><rect x="1312" y="1392" width="96" height="76" fill="#3a4048"/><rect x="1316" y="1440" width="88" height="24" fill="#9fd0ff" opacity="0.5"/></g>`);
  L.push(`<g ${S}><rect x="1488" y="1356" width="24" height="24" fill="#333"/><rect x="1500" y="1362" width="280" height="12" fill="#e8e8e8"/>${[0, 1, 2, 3].map(i => `<rect x="${1530 + i * 64}" y="1362" width="32" height="12" fill="#c42a24"/>`).join("")}</g>`);
  // Машины.
  const cols = ["#7a1e22", "#2b3c55", "#b8b8b2", "#1e1e22", "#3e5a3a", "#6a5a3a", "#4a4e58"];
  let ci = 0;
  for (const x of [1315, 1445, 1705, 1965, 2095, 2485, 2745, 2875]) L.push(car(x, 1840 + (r() - 0.5) * 16, 90 + (r() - 0.5) * 6, cols[ci++ % cols.length]));
  L.push(car(2375, 1440, -90, "#c8c4b8"), car(2635, 1450, -90 + 4, "#2a2a30", { door: true }), van(2865, 1460, -90, "#3a4a5a").replace(/fill="#ffb020"/g, 'fill="#5a4a2a"'));
  // Тележка из супермаркета, брошенная сумка.
  L.push(`<g ${S} transform="rotate(35 1850 1560)"><rect x="1810" y="1530" width="90" height="62" fill="none" stroke="#b8bcc2" stroke-width="5"/>${[0, 1, 2].map(i => `<path d="M${1830 + i * 24},1532 V1590" stroke="#8a8e94" stroke-width="2"/>`).join("")}<path d="M1900,1534 l22,-10 M1900,1588 l22,10" stroke="#b8bcc2" stroke-width="5"/></g>`);
  L.push(`<g ${S}><rect x="1580" y="1500" width="60" height="44" rx="10" fill="#8a3a2a" stroke="#2a0a04" stroke-width="3" transform="rotate(20 1610 1522)"/></g>`);
  // Стена соседнего дома слева.
  L.push(`<path d="M${x0},${y0} V${H}" stroke="#141518" stroke-width="10"/>`);
  return L.join("\n");
}

function lighting() {
  const L = [];
  L.push(`<rect width="${W}" height="${H}" fill="rgba(5,8,24,0.66)" mask="url(#${K}-mask)"/>`);
  L.push(`<rect x="0" y="${WALK.s}" width="1150" height="${H - WALK.s}" fill="rgba(2,3,12,0.2)" mask="url(#${K}-mask)"/>`);
  for (const [x, y, rr, c] of LIGHTS) L.push(`<circle cx="${x}" cy="${y}" r="${rr}" fill="url(#${K}-${c})"/>`);
  L.push(`<circle cx="2760" cy="915" r="110" fill="url(#${K}-amber)" opacity="0.6"/><circle cx="150" cy="920" r="160" fill="url(#${K}-red)" opacity="0.5"/><circle cx="150" cy="920" r="160" fill="url(#${K}-cyan)" opacity="0.35" transform="translate(30,0)"/>`);
  // Неоновая вывеска закусочной поверх темноты — светится.
  L.push(`<g filter="url(#${K}-high)"><rect x="440" y="${WALK.n + 2}" width="420" height="78" rx="10" fill="#101016" stroke="#050508" stroke-width="5"/><rect x="900" y="${WALK.n + 14}" width="190" height="56" rx="8" fill="#101016" stroke="#050508" stroke-width="4"/></g>`);
  L.push(neonText(650, WALK.n + 66, "DINER", 66, "#ff4fb0", 0, 34), neonText(995, WALK.n + 58, "OPEN 24/7", 34, "#4fe8ff", 0, 4));
  L.push(neonText(2584, WALK.n - 54, "HOTEL", 56, "#ff3a30", 0, 46).replace(/<g /, '<g opacity="0.6" '));
  L.push(`<rect width="${W}" height="${H}" fill="url(#${K}-vig)"/>`);
  return L.join("\n");
}

function draw() {
  return [street(), diner(), roof(), alley(), parking(), lighting()].join("\n");
}

const ZONES = [
  { id: "diner", name: "Закусочная", tags: ["cover"], poly: [[0, 0], [1450, 0], [1450, WALK.n], [0, WALK.n]], label: [640, 470], size: 56 },
  { id: "roof", name: "Крыша", tags: ["elevated", "cover"], poly: [[1450, 0], [W, 0], [W, WALK.n], [1450, WALK.n]], label: [1800, 470], size: 60 },
  { id: "street", name: "Проезжая часть", tags: [], poly: [[0, WALK.n], [W, WALK.n], [W, WALK.s], [0, WALK.s]], label: [1700, 1090], size: 58 },
  { id: "alley", name: "Тёмный переулок", tags: ["dark", "cover"], poly: [[0, WALK.s], [1150, WALK.s], [1150, H], [0, H]], label: [550, 1640], size: 48 },
  { id: "parking", name: "Парковка", tags: ["cover"], poly: [[1150, WALK.s], [W, WALK.s], [W, H], [1150, H]], label: [2420, 1640], size: 58 }
];
const LINKS = [["street", "diner", "short"], ["street", "roof", "medium"], ["street", "alley", "short"], ["street", "parking", "short"],
  ["diner", "roof", "medium"], ["alley", "parking", "short"]];

export default {
  key: K, name: "Ночная улица и переулок", folder: "Современность", worlds: ["modern", "monster", "zombie", "weirdwar"],
  bgColor: "#0b0d16",
  extraDefs: extraDefs(),
  draw, zones: ZONES, links: LINKS,
  style: { tint: "rgba(120,160,255,0.03)", line: "rgba(130,230,255,0.85)", text: "#e6f6ff" }
};
