import { W, H, rng, f1, poly, P } from "../lib.mjs";

/* ==========================================================================
   Карта: причальная мачта дирижаблей (стимпанк, вид сверху, закат)
   Слева — клёпаный диск причальной мачты и нижняя терраса (паровая лебёдка, склад),
   справа — пришвартованный дирижабль: палуба гондолы, край баллона; между ними — трап над бездной.
   ========================================================================== */
const K = "airship-dock";
const DISC = { x: 800, y: 620, r: 560 };            // верхняя площадка мачты
const TER = { x: 110, y: 1060, w: 1770, h: 840 };   // нижняя терраса (лебёдка + склад)
const HULL = { cx: 2300, top: 40, bot: 1940, half: 310 };
const GANG_Y = 480;                                  // ось трапа

/* ---------- Геометрия ---------- */
const discY = x => DISC.y + Math.sqrt(Math.max(0, DISC.r ** 2 - (x - DISC.x) ** 2)); // нижний край диска
const xCut = Math.sqrt(DISC.r ** 2 - (TER.y - DISC.y) ** 2);                          // где диск пересекает край террасы
const ARC = (() => { // нижняя дуга диска между пересечениями с террасой (слева направо)
  const pts = [[DISC.x - xCut, TER.y]];
  for (let x = DISC.x - xCut + 70; x < DISC.x + xCut - 20; x += 90) pts.push([x, discY(x)]);
  pts.push([DISC.x + xCut, TER.y], [1000, discY(1000)]);
  return pts.sort((a, b) => a[0] - b[0]);
})();

function hullPath(i = 0) {
  const { cx, top, bot, half } = HULL, h = half - i, l = cx - h, r = cx + h, t = top + i * 1.8, b = bot - i;
  return `M${cx},${t} C${f1(cx + h * 0.55)},${t + 40} ${r},${t + 330} ${r},${t + 640} L${r},${b - 260} C${r},${b - 80} ${f1(r - h * 0.3)},${b} ${cx},${b} C${f1(l + h * 0.3)},${b} ${l},${b - 80} ${l},${b - 260} L${l},${t + 640} C${l},${t + 330} ${f1(cx - h * 0.55)},${t + 40} ${cx},${t} Z`;
}

/* ---------- Определения: свои текстуры и градиенты ---------- */
function extraDefs() {
  const r = rng(K + "-defs");
  // Клёпаные стальные листы.
  const plates = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const s = 0.82 + r() * 0.3, x = i * 80, y = j * 80;
    plates.push(`<rect x="${x + 1}" y="${y + 1}" width="78" height="78" fill="rgb(${Math.round(104 * s)},${Math.round(96 * s)},${Math.round(86 * s)})" stroke="#26211c" stroke-width="2.5"/>`);
    plates.push(`<path d="M${x + 3},${y + 76} V${y + 3} H${x + 76}" stroke="rgba(255,235,200,0.10)" stroke-width="2" fill="none"/>`);
    if (r() < 0.35) plates.push(`<ellipse cx="${f1(x + 15 + r() * 50)}" cy="${f1(y + 15 + r() * 50)}" rx="${f1(6 + r() * 16)}" ry="${f1(4 + r() * 10)}" fill="rgba(130,62,26,${f1(0.12 + r() * 0.2)})"/>`);
    if (r() < 0.3) plates.push(`<path d="M${f1(x + 10 + r() * 30)},${f1(y + 10 + r() * 60)} l${f1(20 + r() * 30)},${f1((r() - 0.5) * 20)}" stroke="rgba(220,210,190,0.18)" stroke-width="1.4"/>`);
    for (const [dx, dy] of [[9, 9], [71, 9], [9, 71], [71, 71], [40, 9], [40, 71]]) plates.push(`<circle cx="${x + dx}" cy="${y + dy}" r="2.8" fill="#2e2822"/><circle cx="${x + dx - 0.9}" cy="${y + dy - 0.9}" r="1.2" fill="rgba(255,225,170,0.45)"/>`);
  }
  // Решётчатый настил.
  const grate = `<rect width="36" height="36" fill="#1d1a17"/><rect x="2" y="2" width="14" height="14" fill="#5c5348"/><rect x="20" y="2" width="14" height="14" fill="#544b41"/><rect x="2" y="20" width="14" height="14" fill="#514940"/><rect x="20" y="20" width="14" height="14" fill="#5f564b"/>`;
  // Палуба: продольные доски тика.
  const deck = [];
  for (let c = 0; c < 8; c++) {
    const y0 = -r() * 300; let y = y0;
    while (y < y0 + 720) {
      const len = Math.min(180 + r() * 220, y0 + 720 - y), s = 0.8 + r() * 0.3, gx = c * 30 + 8 + r() * 14;
      for (const oy of [0, 720]) {
        const yy = y + oy;
        deck.push(`<rect x="${c * 30}" y="${f1(yy)}" width="30" height="${f1(len)}" fill="rgb(${Math.round(156 * s)},${Math.round(108 * s)},${Math.round(64 * s)})" stroke="#2e1c0e" stroke-width="2"/>`);
        deck.push(`<path d="M${f1(gx)},${f1(yy + 8)} v${f1(len - 16)}" stroke="rgba(70,38,14,0.35)" stroke-width="1.4" fill="none"/>`);
        deck.push(`<circle cx="${c * 30 + 9}" cy="${f1(yy + 8)}" r="1.8" fill="#24150a"/><circle cx="${c * 30 + 21}" cy="${f1(yy + 8)}" r="1.8" fill="#24150a"/>`);
      }
      y += len;
    }
  }
  return `<defs>
    <pattern id="${K}-plates" width="320" height="320" patternUnits="userSpaceOnUse">${plates.join("")}</pattern>
    <pattern id="${K}-grate" width="36" height="36" patternUnits="userSpaceOnUse">${grate}</pattern>
    <pattern id="${K}-deck" width="240" height="720" patternUnits="userSpaceOnUse">${deck.join("")}</pattern>
    <pattern id="${K}-hazard" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="40" height="40" fill="#c9a032"/><rect width="20" height="40" fill="#2a2420"/></pattern>
    <linearGradient id="${K}-sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9a77a"/><stop offset="0.45" stop-color="#a98a8c"/><stop offset="1" stop-color="#5a5a78"/></linearGradient>
    <linearGradient id="${K}-env" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b2f25"/><stop offset="0.06" stop-color="#7a6248"/><stop offset="0.2" stop-color="#b79c72"/><stop offset="0.4" stop-color="#dcc79c"/><stop offset="1" stop-color="#e8d8b0"/></linearGradient>
    <linearGradient id="${K}-boiler" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a2512"/><stop offset="0.3" stop-color="#b8693a"/><stop offset="0.5" stop-color="#e09a62"/><stop offset="0.75" stop-color="#a65a2e"/><stop offset="1" stop-color="#3e1e0e"/></linearGradient>
    <linearGradient id="${K}-drum" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e2a26"/><stop offset="0.4" stop-color="#8b8276"/><stop offset="0.55" stop-color="#a59c8e"/><stop offset="1" stop-color="#26221e"/></linearGradient>
    <linearGradient id="${K}-barrelV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1f1a16"/><stop offset="0.45" stop-color="#6a5f52"/><stop offset="1" stop-color="#1a1612"/></linearGradient>
    <radialGradient id="${K}-brass" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#f1d58a"/><stop offset="0.5" stop-color="#c0923e"/><stop offset="1" stop-color="#6e4c1a"/></radialGradient>
    <radialGradient id="${K}-copper" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#f0a872"/><stop offset="0.55" stop-color="#b0603a"/><stop offset="1" stop-color="#5a2a14"/></radialGradient>
    <radialGradient id="${K}-iron" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#7d756a"/><stop offset="1" stop-color="#2a2622"/></radialGradient>
    <radialGradient id="${K}-sun" cx="0%" cy="0%" r="110%"><stop offset="0" stop-color="rgba(255,176,96,0.34)"/><stop offset="0.5" stop-color="rgba(255,140,80,0.10)"/><stop offset="1" stop-color="rgba(255,120,60,0)"/></radialGradient>
    <radialGradient id="${K}-vig" cx="45%" cy="50%" r="72%"><stop offset="0.55" stop-color="rgba(30,18,30,0)"/><stop offset="1" stop-color="rgba(25,14,28,0.62)"/></radialGradient>
    <radialGradient id="${K}-fire" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(255,210,110,0.85)"/><stop offset="0.35" stop-color="rgba(255,120,40,0.4)"/><stop offset="1" stop-color="rgba(255,80,20,0)"/></radialGradient>
    <linearGradient id="${K}-beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgba(255,244,205,0.55)"/><stop offset="1" stop-color="rgba(255,244,205,0)"/></linearGradient>
    <filter id="${K}-blur" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="${K}-cloud" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26"/></filter>
    <filter id="${K}-steam" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="13"/></filter>
    <filter id="${K}-depth" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="28" dy="44" stdDeviation="26" flood-color="rgba(20,10,20,0.6)"/></filter>
    <filter id="${K}-step" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="6" dy="22" stdDeviation="12" flood-color="rgba(0,0,0,0.65)"/></filter>
  </defs>`;
}

/* ---------- Примитивы ---------- */
const rivet = (x, y, s = 3) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${s}" fill="#2b231a"/><circle cx="${f1(x - s * 0.3)}" cy="${f1(y - s * 0.3)}" r="${f1(s * 0.45)}" fill="rgba(255,226,170,0.6)"/>`;
function rivetCircle(cx, cy, rad, n, s = 3) { let o = ""; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o += rivet(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, s); } return o; }
function rivetLine(x1, y1, x2, y2, step = 26, s = 3) { const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step)); let o = ""; for (let i = 0; i <= n; i++) o += rivet(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n, s); return o; }

function gear(cx, cy, rad, teeth, fill = `url(#${K}-brass)`, hole = true) {
  const pts = [], n = teeth * 4, rIn = rad - Math.max(10, rad * 0.12);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = i % 4 < 2 ? rad : rIn; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  let o = `<polygon points="${poly(pts)}" fill="${fill}" stroke="#2a1d0c" stroke-width="3" stroke-linejoin="round"/>`;
  if (hole) {
    o += `<circle cx="${cx}" cy="${cy}" r="${f1(rIn * 0.78)}" fill="none" stroke="#5a3e14" stroke-width="3"/>`;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; o += `<circle cx="${f1(cx + Math.cos(a) * rIn * 0.5)}" cy="${f1(cy + Math.sin(a) * rIn * 0.5)}" r="${f1(rIn * 0.14)}" fill="#2a1d0c" opacity="0.8"/>`; }
    o += `<circle cx="${cx}" cy="${cy}" r="${f1(rIn * 0.22)}" fill="#3a2a12" stroke="#d7b46a" stroke-width="2"/>`;
  }
  return o;
}

function pipe(d, w = 24, col = "#b2653b") {
  return `<g filter="url(#soft)"><path d="${d}" fill="none" stroke="#2a150a" stroke-width="${w + 8}" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="rgba(255,214,160,0.5)" stroke-width="${f1(w * 0.22)}" stroke-linejoin="round" stroke-linecap="round" transform="translate(${f1(-w * 0.2)},${f1(-w * 0.2)})"/></g>`;
}
const flange = (x, y, w = 24, vertical = false) => vertical
  ? `<rect x="${x - w / 2 - 7}" y="${y - 6}" width="${w + 14}" height="12" rx="3" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="2"/>`
  : `<rect x="${x - 6}" y="${y - w / 2 - 7}" width="12" height="${w + 14}" rx="3" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="2"/>`;
function valve(x, y, rad = 22, col = "#8e2a1e") {
  let o = `<circle cx="${x}" cy="${y}" r="${rad}" fill="none" stroke="#1d0d08" stroke-width="9"/><circle cx="${x}" cy="${y}" r="${rad}" fill="none" stroke="${col}" stroke-width="6"/>`;
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; o += `<path d="M${x},${y} L${f1(x + Math.cos(a) * rad)},${f1(y + Math.sin(a) * rad)}" stroke="${col}" stroke-width="4"/>`; }
  return o + `<circle cx="${x}" cy="${y}" r="6" fill="url(#${K}-brass)"/>`;
}
function gauge(x, y, rad = 20) {
  return `<circle cx="${x}" cy="${y}" r="${rad + 4}" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${rad}" fill="#efe6cf"/><path d="M${x},${y} L${x + rad * 0.6},${y - rad * 0.5}" stroke="#8a1a10" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="3" fill="#222"/>`;
}

function rope(x1, y1, x2, y2, sag = 0, w = 7, shadow = true) {
  const mx = (x1 + x2) / 2 + sag * 0.3, my = (y1 + y2) / 2 + sag, d = `M${f1(x1)},${f1(y1)} Q${f1(mx)},${f1(my)} ${f1(x2)},${f1(y2)}`;
  return `${shadow ? `<path d="${d}" transform="translate(10,16)" stroke="rgba(0,0,0,0.28)" stroke-width="${w}" fill="none"/>` : ""}<path d="${d}" stroke="#3a2614" stroke-width="${w + 3}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#b9925a" stroke-width="${w}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="rgba(70,42,16,0.65)" stroke-width="${w - 2}" stroke-dasharray="3 6" fill="none"/>`;
}
function coil(x, y, rad = 36) {
  let o = `<circle cx="${x}" cy="${y}" r="${rad + 3}" fill="#3a2614"/>`;
  for (let rr = rad; rr > 8; rr -= 6) o += `<circle cx="${x}" cy="${y}" r="${rr}" fill="none" stroke="#b9925a" stroke-width="4.5"/><circle cx="${x}" cy="${y}" r="${rr}" fill="none" stroke="rgba(70,42,16,0.6)" stroke-width="3" stroke-dasharray="3 5"/>`;
  return `<g filter="url(#soft)">${o}<circle cx="${x}" cy="${y}" r="8" fill="#24160a"/></g>`;
}
function bollard(x, y, rad = 22) {
  return `<g filter="url(#soft)"><circle cx="${x}" cy="${y}" r="${rad + 6}" fill="#1e1a16"/><circle cx="${x}" cy="${y}" r="${rad}" fill="url(#${K}-iron)" stroke="#111" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${rad * 0.55}" fill="url(#${K}-brass)"/></g>`;
}
function truss(x1, y1, x2, y2, w = 46, col = "#4a4038") {
  const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy * w / 2, ny = ux * w / 2;
  const a = [x1 + nx, y1 + ny], b = [x2 + nx, y2 + ny], c = [x2 - nx, y2 - ny], d = [x1 - nx, y1 - ny];
  let web = `M${f1(a[0])},${f1(a[1])}`; const n = Math.round(L / w);
  for (let i = 1; i <= n; i++) { const t = i / n, s = i % 2 ? -1 : 1; web += ` L${f1(x1 + (x2 - x1) * t + nx * s)},${f1(y1 + (y2 - y1) * t + ny * s)}`; }
  return `<g filter="url(#${K}-depth)"><path d="${web}" stroke="#1a1612" stroke-width="9" fill="none"/><path d="${web}" stroke="${col}" stroke-width="5" fill="none"/>
    <path d="M${f1(a[0])},${f1(a[1])} L${f1(b[0])},${f1(b[1])} M${f1(d[0])},${f1(d[1])} L${f1(c[0])},${f1(c[1])}" stroke="#1a1612" stroke-width="16"/><path d="M${f1(a[0])},${f1(a[1])} L${f1(b[0])},${f1(b[1])} M${f1(d[0])},${f1(d[1])} L${f1(c[0])},${f1(c[1])}" stroke="#7a6a58" stroke-width="10"/></g>`;
}
function cannon(x, y, rot, len = 170) {
  return `<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})">
    <rect x="${x - 50}" y="${y - 36}" width="100" height="92" rx="10" fill="#6a4524" stroke="#24150a" stroke-width="4"/>
    ${[[-58, -26], [42, -26], [-58, 30], [42, 30]].map(([dx, dy]) => `<rect x="${x + dx}" y="${y + dy}" width="16" height="30" rx="4" fill="#2a1d12" stroke="#000" stroke-width="2"/>`).join("")}
    <path d="M${x - 24},${y + 46} L${x - 15},${y - len} L${x + 15},${y - len} L${x + 24},${y + 46} Z" fill="url(#${K}-barrelV)" stroke="#0e0c0a" stroke-width="4"/>
    <rect x="${x - 21}" y="${y - len - 6}" width="42" height="16" rx="5" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="2"/>
    <rect x="${x - 25}" y="${y - 6}" width="50" height="10" rx="3" fill="url(#${K}-brass)"/><rect x="${x - 23}" y="${y - len * 0.55}" width="46" height="8" rx="3" fill="url(#${K}-brass)"/>
    <circle cx="${x}" cy="${y + 58}" r="11" fill="#1c1916" stroke="#000" stroke-width="2"/><ellipse cx="${x}" cy="${y - len - 2}" rx="9" ry="4" fill="#050505"/></g>`;
}
function shipWheel(x, y, rad = 66) {
  let o = `<circle cx="${x}" cy="${y}" r="${rad + 26}" fill="rgba(0,0,0,0)"/>`;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, ex = x + Math.cos(a) * (rad + 22), ey = y + Math.sin(a) * (rad + 22);
    o += `<path d="M${x},${y} L${f1(ex)},${f1(ey)}" stroke="#2a170a" stroke-width="13" stroke-linecap="round"/><path d="M${x},${y} L${f1(ex)},${f1(ey)}" stroke="#9a6234" stroke-width="8" stroke-linecap="round"/><circle cx="${f1(ex)}" cy="${f1(ey)}" r="8" fill="#b97a40" stroke="#2a170a" stroke-width="3"/>`;
  }
  o += `<circle cx="${x}" cy="${y}" r="${rad}" fill="none" stroke="#2a170a" stroke-width="18"/><circle cx="${x}" cy="${y}" r="${rad}" fill="none" stroke="#a46a38" stroke-width="12"/><circle cx="${x}" cy="${y}" r="${rad}" fill="none" stroke="#d7b46a" stroke-width="3"/>`;
  return `<g filter="url(#soft)">${o}<circle cx="${x}" cy="${y}" r="20" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="3"/></g>`;
}
function propeller(x, y, rad, rot = 0) {
  let o = `<circle cx="${x}" cy="${y}" r="${rad}" fill="rgba(230,215,180,0.12)" stroke="rgba(255,240,210,0.25)" stroke-width="3"/>`;
  for (let i = 0; i < 4; i++) o += `<ellipse cx="${x}" cy="${y - rad * 0.5}" rx="${rad * 0.16}" ry="${rad * 0.5}" fill="#6a4a2a" stroke="#22150a" stroke-width="3" transform="rotate(${rot + i * 90} ${x} ${y})"/>`;
  return `<g filter="url(#soft)">${o}<circle cx="${x}" cy="${y}" r="${rad * 0.18}" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="3"/></g>`;
}
function steam(r, x, y, s = 1, n = 7) {
  let o = "";
  for (let i = 0; i < n; i++) o += `<circle cx="${f1(x + (r() - 0.3) * 90 * s + i * 14 * s)}" cy="${f1(y + (r() - 0.6) * 70 * s - i * 6 * s)}" r="${f1((26 + r() * 40) * s)}" fill="rgba(245,240,232,${f1(0.35 + r() * 0.3)})"/>`;
  return `<g filter="url(#${K}-steam)">${o}</g>`;
}
function smoke(r, x, y, dx, dy, n = 9) {
  let o = "";
  for (let i = 0; i < n; i++) { const t = i / n; o += `<circle cx="${f1(x + dx * t + (r() - 0.5) * 30)}" cy="${f1(y + dy * t + (r() - 0.5) * 30)}" r="${f1(28 + t * 70 + r() * 20)}" fill="rgba(105,98,96,${f1(0.75 - t * 0.5)})"/>`; }
  return `<g filter="url(#${K}-steam)">${o}</g>`;
}
function crateStack(x, y, s, rot, high = false) {
  return high ? `<g filter="url(#${K}-step)">${P.crate(x, y, s, rot)}${P.crate(x + 4, y - 6, s * 0.86, rot + 6)}</g>` : P.crate(x, y, s, rot);
}
function railPath(d, w = 9) { return `<path d="${d}" fill="none" stroke="#24180c" stroke-width="${w + 6}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#c39a48" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="rgba(255,236,180,0.55)" stroke-width="2" stroke-linecap="round"/>`; }
function metalStairs(x, y, w, h, steps) {
  let o = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1c1916"/>`;
  for (let i = 0; i < steps; i++) { const sy = y + i * h / steps, s = 1 - i / steps * 0.45; o += `<rect x="${x + 8}" y="${f1(sy + 2)}" width="${w - 16}" height="${f1(h / steps - 4)}" fill="rgb(${Math.round(120 * s)},${Math.round(110 * s)},${Math.round(96 * s)})" stroke="#111" stroke-width="2"/><path d="M${x + 14},${f1(sy + h / steps / 2)} H${x + w - 14}" stroke="rgba(0,0,0,0.35)" stroke-width="2" stroke-dasharray="6 5"/>`; }
  return `<g filter="url(#soft)">${o}${railPath(`M${x + 4},${y} V${y + h}`, 6)}${railPath(`M${x + w - 4},${y} V${y + h}`, 6)}</g>`;
}

/* ---------- Фон: город далеко внизу, облака ---------- */
function cityBelow() {
  const r = rng(K + "-city");
  const L = [`<rect width="${W}" height="${H}" fill="url(#${K}-sky)"/>`];
  const roofs = ["#8c5b44", "#6f6a66", "#7d4c3a", "#5d6068", "#94714f", "#6b5446", "#855f4c", "#7a7068"];
  const city = [`<rect x="-900" y="-900" width="4800" height="3800" fill="#857670"/>`];
  let by = -700;
  while (by < 2800) {
    const bh = 90 + r() * 70; let bx = -900;
    while (bx < 3900) {
      const bw = 120 + r() * 150;
      if (r() < 0.07) { // сквер
        city.push(`<rect x="${f1(bx)}" y="${f1(by)}" width="${f1(bw)}" height="${f1(bh)}" fill="#5f6a44"/>`);
        for (let k = 0; k < 6; k++) city.push(`<circle cx="${f1(bx + 12 + r() * (bw - 24))}" cy="${f1(by + 12 + r() * (bh - 24))}" r="${f1(8 + r() * 9)}" fill="#46522f"/>`);
      } else {
        city.push(`<rect x="${f1(bx)}" y="${f1(by)}" width="${f1(bw)}" height="${f1(bh)}" fill="#3e3434"/>`);
        let x = bx;
        while (x < bx + bw - 14) {
          const w = Math.min(28 + r() * 40, bx + bw - x), hgt = bh * (0.38 + r() * 0.14);
          for (const yy of [by, by + bh - hgt]) {
            const col = roofs[Math.floor(r() * roofs.length)];
            city.push(`<rect x="${f1(x + 1)}" y="${f1(yy + 1)}" width="${f1(w - 2)}" height="${f1(hgt - 2)}" fill="${col}"/><rect x="${f1(x + 1)}" y="${f1(yy + hgt / 2)}" width="${f1(w - 2)}" height="${f1(hgt / 2 - 1)}" fill="rgba(0,0,0,0.25)"/>`);
          }
          x += w;
        }
      }
      bx += bw + 22;
    }
    by += bh + 22;
  }
  // Купол собора и площадь.
  city.push(`<circle cx="1180" cy="1700" r="120" fill="#8a8070"/><circle cx="1180" cy="1700" r="70" fill="#5f7a6e" stroke="#3a4a42" stroke-width="6"/><path d="M1180,1630 V1770 M1110,1700 H1250" stroke="#3a4a42" stroke-width="5"/>`);
  L.push(`<g transform="rotate(-14 1500 1000)" filter="url(#${K}-blur)">${city.join("")}
    <path d="M-900,1300 C-200,1100 300,1500 1000,1300 S2200,800 3000,1000 S3800,1300 4200,1100" stroke="#3e4a58" stroke-width="90" fill="none"/>
    <path d="M-900,1300 C-200,1100 300,1500 1000,1300 S2200,800 3000,1000 S3800,1300 4200,1100" stroke="rgba(170,180,200,0.3)" stroke-width="30" fill="none"/></g>`);
  // Заводские трубы и дым внизу.
  for (const [x, y] of [[180, 1950], [1500, 170], [2860, 1180], [60, 120], [1700, 1980]]) L.push(`<circle cx="${x}" cy="${y}" r="16" fill="#2a2220" filter="url(#${K}-blur)"/>`, smoke(r, x, y, 160, -90, 7).replace(/rgba\(50,44,44/g, "rgba(90,80,80"));
  // Далёкий дирижабль внизу, под облаками.
  L.push(`<g transform="rotate(-24 1690 850)" filter="url(#${K}-blur)" opacity="0.8"><ellipse cx="1690" cy="850" rx="150" ry="46" fill="#9a8a70"/><ellipse cx="1690" cy="842" rx="130" ry="20" fill="#b9a888"/><rect x="1640" y="880" width="90" height="16" rx="6" fill="#5a4030"/><path d="M1540,850 l-30,-26 v52 Z" fill="#7a6a54"/></g>`);
  // Дымка высоты.
  L.push(`<rect width="${W}" height="${H}" fill="rgba(196,168,166,0.5)"/>`);
  // Облака под площадкой.
  const clouds = [];
  for (let i = 0; i < 34; i++) {
    const cx = r() * W, cy = r() * H, s = 0.6 + r() * 1.2, a = 0.4 + r() * 0.45;
    for (let k = 0; k < 5; k++) clouds.push(`<ellipse cx="${f1(cx + (r() - 0.5) * 260 * s)}" cy="${f1(cy + (r() - 0.5) * 110 * s)}" rx="${f1((110 + r() * 120) * s)}" ry="${f1((50 + r() * 50) * s)}" fill="rgba(${r() < 0.5 ? "255,236,222" : "246,214,206"},${f1(a)})"/>`);
  }
  L.push(`<g filter="url(#${K}-cloud)">${clouds.join("")}</g>`);
  return L.join("\n");
}

/* ---------- Нижняя терраса: лебёдка и склад ---------- */
function terrace() {
  const r = rng(K + "-terrace");
  const { x, y, w, h } = TER, c = 60;
  const shape = [[x, y], [x + w, y], [x + w, y + h - c], [x + w - c, y + h], [x + c, y + h], [x, y + h - c]];
  const L = [];
  // Опорные балки, торчащие за край.
  for (const [bx, by, bw, bh] of [[x - 60, y + 160, 80, 36], [x - 60, y + 560, 80, 36], [x + 400, y + h - 20, 36, 70], [x + 1150, y + h - 20, 36, 70], [x + w - 20, y + 300, 80, 36], [x + w - 20, y + 650, 80, 36]])
    L.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#3a332c" stroke="#15120f" stroke-width="4" filter="url(#${K}-depth)"/>`);
  L.push(`<g filter="url(#${K}-depth)"><polygon points="${poly(shape)}" fill="url(#${K}-plates)" stroke="#15120f" stroke-width="10"/></g>`);
  L.push(`<polygon points="${poly(shape)}" fill="rgba(30,20,10,0.18)"/>`);
  L.push(`<polygon points="${poly(shape)}" fill="none" stroke="#6a5a44" stroke-width="22" stroke-linejoin="round"/>`);
  L.push(rivetLine(x + 12, y + 12, x + 12, y + h - c, 30), rivetLine(x + w - 12, y + 12, x + w - 12, y + h - c, 30), rivetLine(x + c, y + h - 12, x + w - c, y + h - 12, 30));
  // Решётчатые мостки под механизмами.
  L.push(`<rect x="160" y="1170" width="820" height="560" fill="url(#${K}-grate)" stroke="#2a241e" stroke-width="8" opacity="0.92"/>`);
  L.push(`<rect x="1700" y="1110" width="150" height="760" fill="url(#${K}-grate)" stroke="#2a241e" stroke-width="8" opacity="0.92"/>`);
  // Перила по внешнему краю террасы (с проходами).
  const rail = [
    `M${x + 22},${y + 120} V${y + 440}`, `M${x + 22},${y + 600} V${y + h - c - 10} L${x + c + 10},${y + h - 22} H${x + w - c - 10}`,
    `M${x + w - c - 10},${y + h - 22} H${x + w - c - 10} L${x + w - 22},${y + h - c - 10} V${y + 60}`,
    `M${x + 22},${y + 22} V${y + 60}`, `M${x + w - 22},${y + 22} H${DISC.x + xCut + 160}`, `M${x + 22},${y + 22} H${DISC.x - xCut - 120}`
  ];
  for (const d of rail) L.push(railPath(d));
  for (let px = x + 22; px <= x + w - 22; px += 110) for (const py of [y + h - 22]) L.push(`<circle cx="${px}" cy="${py}" r="9" fill="url(#${K}-brass)" stroke="#24180c" stroke-width="3"/>`);
  for (let py = y + 140; py < y + h - c; py += 110) L.push(`${py > y + 440 && py < y + 600 ? "" : `<circle cx="${x + 22}" cy="${py}" r="9" fill="url(#${K}-brass)" stroke="#24180c" stroke-width="3"/>`}<circle cx="${x + w - 22}" cy="${py}" r="9" fill="url(#${K}-brass)" stroke="#24180c" stroke-width="3"/>`);
  // Предупреждающая разметка у края без перил (подъёмная площадка).
  L.push(`<rect x="${x + 6}" y="${y + 450}" width="40" height="140" fill="url(#${K}-hazard)" opacity="0.85"/>`);
  return L.join("\n") + winch(r) + cargo(r);
}

function winch(r) {
  const L = [];
  // Котёл: горизонтальный цилиндр с клёпаными поясами.
  const bx = 200, by = 1210, bw = 230, bh = 470;
  L.push(`<g filter="url(#${K}-step)"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${bw / 2}" fill="url(#${K}-boiler)" stroke="#2a130a" stroke-width="6"/>`);
  for (let yy = by + 90; yy < by + bh - 60; yy += 80) L.push(`<rect x="${bx + 2}" y="${yy}" width="${bw - 4}" height="14" fill="rgba(60,26,10,0.55)"/>${rivetLine(bx + 22, yy + 7, bx + bw - 22, yy + 7, 22, 2.6)}`);
  L.push(`<circle cx="${bx + bw / 2}" cy="${by + 120}" r="52" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="4"/>${rivetCircle(bx + bw / 2, by + 120, 40, 12, 2.4)}<circle cx="${bx + bw / 2}" cy="${by + 120}" r="18" fill="url(#${K}-copper)" stroke="#2a1d0c" stroke-width="3"/></g>`);
  // Топка: открытая дверца, огонь.
  L.push(`<circle cx="${bx + bw / 2}" cy="${by + bh + 20}" r="240" fill="url(#${K}-fire)"/>`);
  L.push(`<rect x="${bx + 55}" y="${by + bh - 30}" width="120" height="58" rx="10" fill="#1a0c06" stroke="#0a0503" stroke-width="5"/><rect x="${bx + 68}" y="${by + bh - 20}" width="94" height="38" rx="8" fill="#ff8a26" filter="url(#glow)"/><rect x="${bx + 90}" y="${by + bh - 12}" width="50" height="20" rx="6" fill="#ffe08a"/>`);
  // Дымовая труба и дым.
  L.push(`<g filter="url(#soft)"><circle cx="${bx + bw / 2}" cy="${by + 330}" r="54" fill="#2a2420" stroke="#0f0d0b" stroke-width="5"/><circle cx="${bx + bw / 2}" cy="${by + 330}" r="42" fill="#0b0a09"/><circle cx="${bx + bw / 2}" cy="${by + 330}" r="54" fill="none" stroke="url(#${K}-brass)" stroke-width="6"/></g>`);
  L.push(smoke(r, bx + bw / 2, by + 330, 340, -280, 10));
  // Угольный ларь и лопата.
  L.push(`<g filter="url(#soft)"><rect x="130" y="1700" width="150" height="110" rx="6" fill="#3a2a1c" stroke="#120c06" stroke-width="6"/><rect x="142" y="1712" width="126" height="86" fill="#141210"/></g>`);
  L.push(Array.from({ length: 40 }, () => { const g = Math.round(28 + r() * 30); return `<circle cx="${f1(150 + r() * 112)}" cy="${f1(1718 + r() * 76)}" r="${f1(6 + r() * 7)}" fill="rgb(${g},${g},${g + 4})" stroke="#060606" stroke-width="1.2"/>`; }).join(""));
  L.push(`<g filter="url(#soft)"><path d="M290,1730 L360,1700" stroke="#6a4524" stroke-width="9" stroke-linecap="round"/><path d="M282,1722 l-30,4 l2,26 l30,-2 Z" fill="#5a5650" stroke="#111" stroke-width="2"/></g>`);
  // Барабан лебёдки с намотанным тросом.
  const dx = 560, dy = 1380, dw = 330, dh = 140;
  L.push(`<g filter="url(#${K}-step)"><rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="10" fill="url(#${K}-drum)" stroke="#0f0d0b" stroke-width="5"/>`);
  for (let xx = dx + 12; xx < dx + dw - 8; xx += 9) L.push(`<path d="M${xx},${dy + 4} l7,${dh - 8}" stroke="rgba(20,18,16,0.55)" stroke-width="3"/>`);
  L.push(`<rect x="${dx - 26}" y="${dy - 30}" width="30" height="${dh + 60}" rx="6" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="4"/><rect x="${dx + dw - 4}" y="${dy - 30}" width="30" height="${dh + 60}" rx="6" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="4"/>`);
  L.push(`${rivetLine(dx - 11, dy - 18, dx - 11, dy + dh + 18, 26, 2.6)}${rivetLine(dx + dw + 11, dy - 18, dx + dw + 11, dy + dh + 18, 26, 2.6)}</g>`);
  // Шестерни передачи и маховик.
  L.push(`<g filter="url(#${K}-step)">${gear(dx + dw + 70, dy + 40, 78, 16)}${gear(dx + dw + 60, dy + 178, 46, 10, `url(#${K}-copper)`)}</g>`);
  const fx = 800, fy = 1640, fr = 92;
  let fly = `<circle cx="${fx}" cy="${fy}" r="${fr}" fill="none" stroke="#120f0c" stroke-width="30"/><circle cx="${fx}" cy="${fy}" r="${fr}" fill="none" stroke="#4e463e" stroke-width="22"/><circle cx="${fx}" cy="${fy}" r="${fr + 8}" fill="none" stroke="rgba(255,230,190,0.15)" stroke-width="3"/>`;
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.2; fly += `<path d="M${fx},${fy} L${f1(fx + Math.cos(a) * fr)},${f1(fy + Math.sin(a) * fr)}" stroke="#3a332c" stroke-width="12"/>`; }
  L.push(`<g filter="url(#${K}-step)">${fly}<circle cx="${fx}" cy="${fy}" r="24" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="4"/></g>`);
  // Паровые цилиндры с шатунами к маховику.
  L.push(`<g filter="url(#${K}-step)">${[0, 1].map(i => `<rect x="${500}" y="${1560 + i * 100}" width="170" height="64" rx="12" fill="url(#${K}-copper)" stroke="#2a130a" stroke-width="4"/>${rivetLine(512, 1566 + i * 100, 512, 1618 + i * 100, 16, 2.4)}${rivetLine(658, 1566 + i * 100, 658, 1618 + i * 100, 16, 2.4)}<path d="M670,${1592 + i * 100} L${fx - 10},${fy - 30 + i * 60}" stroke="#1b1714" stroke-width="16" stroke-linecap="round"/><path d="M670,${1592 + i * 100} L${fx - 10},${fy - 30 + i * 60}" stroke="#9c9284" stroke-width="9" stroke-linecap="round"/>`).join("")}</g>`);
  // Трубы от котла к цилиндрам и к лебёдке.
  L.push(pipe(`M${bx + bw - 10},${by + 120} H470 V1590 H500`, 22));
  L.push(pipe(`M${bx + bw - 10},${by + 210} H460 Q475,1290 520,1290 H940 V1360`, 18, "#a85a34"));
  L.push(flange(470, 1250, 22, true), flange(470, 1500, 22, true), flange(700, 1290, 18), flange(860, 1290, 18));
  L.push(valve(470, 1400, 24), valve(940, 1300, 20, "#8a5a1a"), gauge(380, 1170, 22), gauge(540, 1240, 18), gauge(1000 - 70, 1460, 18));
  // Трос от барабана к ступице мачты.
  L.push(`<path d="M760,${dy + 6} L790,815" stroke="rgba(0,0,0,0.3)" stroke-width="9" transform="translate(12,18)"/><path d="M760,${dy + 6} L790,815" stroke="#141210" stroke-width="10"/><path d="M760,${dy + 6} L790,815" stroke="#6e675e" stroke-width="5" stroke-dasharray="7 4"/>`);
  // Пар: утечки у фланцев и из клапана.
  L.push(steam(r, 480, 1490, 0.9), steam(r, 690, 1560, 0.7, 5), steam(r, 950, 1350, 0.8, 5), steam(r, 330, 1180, 0.6, 4));
  // Ящик с инструментами, ведро.
  L.push(`<g filter="url(#soft)"><rect x="880" y="1760" width="90" height="56" rx="6" fill="#7a2a1c" stroke="#2a0e08" stroke-width="4"/><path d="M890,1788 H960" stroke="#c39a48" stroke-width="5"/></g>`);
  L.push(P.lantern(160, 1160), P.lantern(990, 1880));
  return L.join("\n");
}

function cargo(r) {
  const L = [];
  // Штабели ящиков с проходами между ними.
  const crates = [[1110, 1330, 96, 4, true], [1215, 1325, 88, -6, false], [1120, 1440, 90, 10, false], [1340, 1250, 84, 3, false],
    [1330, 1500, 100, -4, true], [1440, 1505, 86, 8, false], [1335, 1610, 92, 2, false], [1560, 1240, 90, -10, true], [1595, 1345, 70, 14, false],
    [1110, 1640, 80, -8, false], [1215, 1660, 96, 5, true]];
  for (const [x, y, s, rot, hi] of crates) L.push(crateStack(x, y, s, rot, hi));
  // Бочки.
  for (const [x, y, rr] of [[1580, 1560, 40], [1640, 1630, 38], [1560, 1655, 36], [1505, 1395, 34]]) L.push(P.barrel(x, y, rr));
  // Тюки под грузовой сетью.
  L.push(P.sacks(1260, 1180).replace(/<g filter="url\(#soft\)">/, `<g filter="url(#soft)">`));
  L.push(`<path d="M1218,1150 L1330,1150 L1330,1250 L1218,1250 Z M1218,1175 H1330 M1218,1200 H1330 M1218,1225 H1330 M1243,1150 V1250 M1268,1150 V1250 M1293,1150 V1250" stroke="rgba(40,26,12,0.7)" stroke-width="3" fill="none"/>`);
  // Ручная тележка.
  L.push(`<g filter="url(#soft)" transform="rotate(-18 1470 1720)"><rect x="1420" y="1680" width="110" height="74" rx="6" fill="#5a4a38" stroke="#1d150c" stroke-width="4"/><path d="M1530,1690 l40,-14 M1530,1745 l40,14" stroke="#c39a48" stroke-width="7" stroke-linecap="round"/><rect x="1436" y="1668" width="26" height="12" fill="#151210"/><rect x="1484" y="1668" width="26" height="12" fill="#151210"/><rect x="1436" y="1754" width="26" height="12" fill="#151210"/><rect x="1484" y="1754" width="26" height="12" fill="#151210"/>${P.crate(1460, 1716, 54, 6).replace('filter="url(#soft)"', "")}</g>`);
  // Поворотный кран: основание, противовес, стрела над палубой дирижабля.
  const cx = 1775, cy = 1320, tx = 2290, ty = 1450;
  L.push(`<g filter="url(#${K}-step)"><circle cx="${cx}" cy="${cy}" r="96" fill="url(#${K}-iron)" stroke="#0f0d0b" stroke-width="6"/>${rivetCircle(cx, cy, 84, 24, 3)}</g>`);
  L.push(truss(cx, cy, tx, ty, 52));
  const a = Math.atan2(ty - cy, tx - cx), bx = cx - Math.cos(a) * 110, by = cy - Math.sin(a) * 110;
  L.push(`<g filter="url(#${K}-step)" transform="rotate(${f1(a * 180 / Math.PI)} ${f1(bx)} ${f1(by)})"><rect x="${f1(bx - 60)}" y="${f1(by - 70)}" width="120" height="140" rx="8" fill="#3a332c" stroke="#0f0d0b" stroke-width="5"/><rect x="${f1(bx - 44)}" y="${f1(by - 54)}" width="88" height="108" fill="url(#${K}-hazard)" opacity="0.5"/></g>`);
  L.push(`<g filter="url(#${K}-step)"><rect x="${cx - 50}" y="${cy - 44}" width="100" height="88" rx="10" fill="#6a3a1e" stroke="#1d0d06" stroke-width="5"/><rect x="${cx - 36}" y="${cy - 30}" width="72" height="34" rx="4" fill="#9fc6c8" opacity="0.75"/>${gear(cx, cy + 22, 22, 8, `url(#${K}-brass)`, false)}</g>`);
  return L.join("\n");
}

/* ---------- Верхний диск мачты ---------- */
function disc() {
  const r = rng(K + "-disc");
  const { x: cx, y: cy, r: R } = DISC;
  const L = [];
  L.push(`<g filter="url(#${K}-depth)"><circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${K}-plates)" stroke="#15120f" stroke-width="12"/></g>`);
  // Кольцевые швы и радиальные листы.
  for (const rr of [200, 330, 450]) L.push(`<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="#211c17" stroke-width="5"/><circle cx="${cx}" cy="${cy}" r="${rr + 3}" fill="none" stroke="rgba(255,235,200,0.08)" stroke-width="2"/>${rivetCircle(cx, cy, rr - 10, Math.round(rr / 14), 2.6)}`);
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; L.push(`<path d="M${f1(cx + Math.cos(a) * 200)},${f1(cy + Math.sin(a) * 200)} L${f1(cx + Math.cos(a) * (R - 30))},${f1(cy + Math.sin(a) * (R - 30))}" stroke="rgba(25,20,16,0.55)" stroke-width="3"/>`); }
  // Латунный пояс по краю.
  L.push(`<circle cx="${cx}" cy="${cy}" r="${R - 22}" fill="none" stroke="#2a1d0c" stroke-width="36"/><circle cx="${cx}" cy="${cy}" r="${R - 22}" fill="none" stroke="#a87c34" stroke-width="28"/><circle cx="${cx}" cy="${cy}" r="${R - 30}" fill="none" stroke="rgba(255,230,170,0.35)" stroke-width="3"/>${rivetCircle(cx, cy, R - 22, 90, 3)}`);
  // Перила по краю диска с проходами к трапу и к лестницам.
  const gangA = Math.asin((GANG_Y - cy) / R), gaps = [[gangA - 0.13, gangA + 0.13], [Math.acos((600 - cx) / R) - 0.13, Math.acos((600 - cx) / R) + 0.13], [Math.acos((1090 - cx) / R) - 0.13, Math.acos((1090 - cx) / R) + 0.13]];
  const norm = a => (a + Math.PI * 4) % (Math.PI * 2);
  const inGap = a => gaps.some(([g0, g1]) => { const n = norm(a), s = norm(g0), e = norm(g1); return s < e ? n > s && n < e : n > s || n < e; });
  const RR = R - 6;
  let seg = [], segs = [];
  for (let i = 0; i <= 360; i++) { const a = i / 360 * Math.PI * 2; if (inGap(a)) { if (seg.length > 1) segs.push(seg); seg = []; } else seg.push([cx + Math.cos(a) * RR, cy + Math.sin(a) * RR]); }
  if (seg.length > 1) segs.push(seg);
  for (const s of segs) L.push(railPath(`M${s.map(p => `${f1(p[0])},${f1(p[1])}`).join(" L")}`, 10));
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; if (!inGap(a)) L.push(`<circle cx="${f1(cx + Math.cos(a) * RR)}" cy="${f1(cy + Math.sin(a) * RR)}" r="10" fill="url(#${K}-brass)" stroke="#24180c" stroke-width="3"/>`); }
  // Ступица мачты: зубчатый венец, люк с лестницей вниз.
  L.push(`<g filter="url(#${K}-step)">${gear(cx, cy, 196, 40, "#3e362e", false)}<circle cx="${cx}" cy="${cy}" r="168" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="5"/>${rivetCircle(cx, cy, 154, 36, 3)}
    <circle cx="${cx}" cy="${cy}" r="128" fill="url(#${K}-iron)" stroke="#1a1612" stroke-width="4"/>${[0, 1, 2, 3].map(i => `<path d="M${cx},${cy} L${f1(cx + Math.cos(i * Math.PI / 2 + 0.78) * 128)},${f1(cy + Math.sin(i * Math.PI / 2 + 0.78) * 128)}" stroke="#2a241e" stroke-width="6"/>`).join("")}
    <circle cx="${cx}" cy="${cy}" r="62" fill="#0d0b09" stroke="#c39a48" stroke-width="6"/>${[-30, -10, 10, 30].map(d => `<path d="M${cx - 28},${cy + d} H${cx + 28}" stroke="#6a5a44" stroke-width="5"/>`).join("")}<path d="M${cx - 28},${cy - 44} V${cy + 44} M${cx + 28},${cy - 44} V${cy + 44}" stroke="#4e4236" stroke-width="5"/></g>`);
  // Шкив троса лебёдки у ступицы.
  L.push(`<g filter="url(#soft)"><rect x="${cx - 26}" y="${cy + 168}" width="52" height="56" rx="8" fill="#3a332c" stroke="#0f0d0b" stroke-width="4"/><circle cx="${cx}" cy="${cy + 196}" r="20" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="3"/></g>`);
  // Швартовая стрела к дирижаблю.
  const sa = 0.2, sx = cx + Math.cos(sa) * 180, sy = cy + Math.sin(sa) * 180, ex = 1520, ey = cy + Math.tan(sa) * (ex - cx);
  L.push(truss(sx, sy, ex, ey, 48, "#5a4e42"));
  L.push(`<g filter="url(#soft)"><circle cx="${f1(ex)}" cy="${f1(ey)}" r="30" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="5"/><circle cx="${f1(ex)}" cy="${f1(ey)}" r="10" fill="#2a1d0c"/></g>`);
  L.push(`<g id="${K}-boomcable">${rope(ex, ey, 2010, 860, 30, 8, false)}</g>`);
  // Ящики, бочки (укрытие) у левого края диска.
  L.push(crateStack(405, 560, 92, 8, true), P.crate(450, 665, 80, -6), P.crate(345, 470, 70, 18), P.barrel(380, 760, 42), P.barrel(470, 790, 38), P.barrel(330, 680, 36));
  L.push(crateStack(1040, 930, 86, -12, true), P.crate(1140, 870, 72, 6), P.barrel(1150, 975, 36));
  // Бухты каната и кнехты у трапа.
  L.push(bollard(1290, GANG_Y - 95), bollard(1295, GANG_Y + 100), bollard(1308, 800), bollard(1230, 985), coil(1180, 380, 38), coil(1210, 700, 32));
  // Подзорная труба на треноге.
  L.push(`<g filter="url(#soft)">${[0, 2.1, 4.2].map(a => `<path d="M1080,280 l${f1(Math.cos(a) * 46)},${f1(Math.sin(a) * 46)}" stroke="#3a2a18" stroke-width="7" stroke-linecap="round"/>`).join("")}<g transform="rotate(-35 1080 280)"><rect x="1030" y="268" width="140" height="24" rx="8" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="3"/><rect x="1150" y="264" width="30" height="32" rx="6" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="3"/><rect x="1060" y="266" width="10" height="28" fill="#6e4c1a"/></g></g>`);
  // Прожектор с лучом в небо.
  L.push(`<path d="M560,190 L-80,-260 L-260,40 Z" fill="url(#${K}-beam)" opacity="0.75" transform="rotate(4 560 190)"/>`);
  L.push(`<g filter="url(#soft)" transform="rotate(-150 560 190)"><rect x="520" y="160" width="90" height="60" rx="14" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="4"/><ellipse cx="612" cy="190" rx="12" ry="28" fill="#fff6d0" filter="url(#glow)"/><rect x="540" y="216" width="40" height="14" fill="#3a332c"/></g>`);
  // Паропровод от лебёдки к механизму мачты.
  L.push(pipe(`M600,1140 Q560,1000 610,880 T690,${cy + 150}`, 16, "#a85a34"));
  L.push(flange(600, 1060, 16, true));
  // Фонари по краю.
  for (const a of [3.5, 4.3, 5.25, 0.55, 2.45, 1.95]) L.push(P.lantern(f1(cx + Math.cos(a) * (R - 70)), f1(cy + Math.sin(a) * (R - 70))));
  // Лестницы вниз на террасу.
  L.push(metalStairs(540, 1120, 120, 170, 7), metalStairs(1030, 1076, 120, 170, 7));
  return L.join("\n");
}

/* ---------- Трап ---------- */
function gangway() {
  const x1 = 1330, x2 = 2030, y = GANG_Y, hw = 52, L = [];
  L.push(`<rect x="${x1}" y="${y - hw}" width="${x2 - x1}" height="${hw * 2}" fill="rgba(0,0,0,0.35)" transform="translate(26,40)" filter="url(#${K}-steam)"/>`);
  L.push(`<rect x="${x1}" y="${y - hw + 6}" width="${x2 - x1}" height="12" fill="#3a2a18"/><rect x="${x1}" y="${y + hw - 18}" width="${x2 - x1}" height="12" fill="#3a2a18"/>`);
  const r = rng(K + "-gang");
  for (let x = x1 + 4; x < x2 - 10; x += 27) {
    if (Math.abs(x - 1712) < 14) continue; // выпавшая доска
    const s = 0.75 + r() * 0.35, tilt = (r() - 0.5) * 3;
    L.push(`<rect x="${x}" y="${y - hw}" width="23" height="${hw * 2}" rx="2" fill="rgb(${Math.round(150 * s)},${Math.round(102 * s)},${Math.round(58 * s)})" stroke="#2a170a" stroke-width="2" transform="rotate(${f1(tilt)} ${x + 11} ${y})"/>`);
  }
  // Сломанная доска висит.
  L.push(`<rect x="1716" y="${y + 10}" width="22" height="70" rx="2" fill="#6e4a28" stroke="#2a170a" stroke-width="2" transform="rotate(28 1726 ${y + 30})"/>`);
  // Канатные поручни со столбиками.
  for (const s of [-1, 1]) {
    L.push(rope(x1 + 20, y + s * (hw + 8), x2 - 20, y + s * (hw + 8), s * 16, 7, false));
    for (let x = x1 + 20; x <= x2 - 20; x += 135) L.push(`<circle cx="${x}" cy="${y + s * (hw + 8)}" r="9" fill="url(#${K}-brass)" stroke="#24180c" stroke-width="3"/>`);
  }
  // Швартовые канаты через пропасть.
  L.push(rope(1295, GANG_Y - 95, 2005, 330, 40), rope(1295, GANG_Y + 100, 2000, 720, 50), rope(1308, 800, 2000, 980, 60), rope(1230, 985, 2000, 1180, 70));
  return L.join("\n");
}

/* ---------- Дирижабль: гондола и баллон ---------- */
function airship() {
  const r = rng(K + "-ship");
  const { cx } = HULL, L = [];
  // Тень корпуса на облаках далеко внизу почти не видна — даём лишь глубину.
  L.push(`<g filter="url(#${K}-depth)"><path d="${hullPath(0)}" fill="#3a2414" stroke="#140b05" stroke-width="10"/></g>`);
  // Винты на корме.
  L.push(`<rect x="2100" y="1890" width="20" height="90" fill="#3a332c"/><rect x="2480" y="1890" width="20" height="90" fill="#3a332c"/>`);
  L.push(propeller(2110, 1975, 120, 20), propeller(2490, 1975, 120, 65));
  // Обшивка борта: латунный кант с заклёпками.
  L.push(`<path d="${hullPath(14)}" fill="#6a4a2a" stroke="#c39a48" stroke-width="8"/>`);
  L.push(`<path d="${hullPath(34)}" fill="url(#${K}-deck)" stroke="#2a170a" stroke-width="6"/>`);
  L.push(`<path d="${hullPath(34)}" fill="#000" filter="url(#grain)" opacity="0.35"/>`);
  // Леер: латунные стойки вдоль борта.
  L.push(railPath(hullPath(22).replace(/ Z$/, ""), 7));
  // Проход трапа в борту (калитка открыта).
  L.push(`<rect x="1972" y="${GANG_Y - 50}" width="74" height="100" fill="url(#${K}-deck)"/><rect x="1972" y="${GANG_Y - 50}" width="74" height="100" fill="rgba(0,0,0,0.15)"/>`);
  L.push(`<path d="M2010,${GANG_Y - 52} l52,-30" stroke="#c39a48" stroke-width="8" stroke-linecap="round"/><path d="M2010,${GANG_Y + 52} l52,30" stroke="#c39a48" stroke-width="8" stroke-linecap="round"/>`);
  // Носовая поворотная пушка на турели.
  L.push(`<g filter="url(#soft)"><circle cx="${cx}" cy="330" r="96" fill="url(#${K}-iron)" stroke="#111" stroke-width="5"/>${rivetCircle(cx, 330, 84, 24, 2.6)}<circle cx="${cx}" cy="330" r="96" fill="none" stroke="#c39a48" stroke-width="5"/></g>`);
  L.push(cannon(cx, 340, -12, 190));
  L.push(`<g filter="url(#soft)">${[[2215, 470], [2385, 470], [2240, 500], [2360, 500]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12" fill="#1a1816" stroke="#000" stroke-width="2"/>`).join("")}</g>`); // ядра
  // Бортовая пушка у левого борта, смотрит на мачту.
  L.push(cannon(2095, 1210, -90, 150));
  // Груз на палубе: ящики, бочки, бухта каната.
  L.push(crateStack(2120, 700, 84, 6, true), P.crate(2130, 800, 70, -8), P.barrel(2490, 690, 36), P.barrel(2480, 780, 34), P.barrel(2420, 730, 32), coil(2470, 1180, 40), coil(2155, 1580, 30));
  // Грузовой люк под стрелой крана.
  L.push(`<g filter="url(#soft)"><rect x="2200" y="1370" width="200" height="160" rx="6" fill="#3a2414" stroke="#140b05" stroke-width="6"/><rect x="2212" y="1382" width="176" height="136" fill="url(#${K}-grate)"/><rect x="2200" y="1370" width="200" height="160" rx="6" fill="none" stroke="#c39a48" stroke-width="4"/></g>`);
  // Груз на крюке крана, висящий над люком.
  L.push(`<g filter="url(#${K}-depth)"><path d="M2290,1450 L2250,1410 M2290,1450 L2330,1410 M2290,1450 L2250,1495 M2290,1450 L2330,1495" stroke="#2a241e" stroke-width="4"/>${P.crate(2290, 1452, 92, 12).replace('filter="url(#soft)"', "")}<circle cx="2290" cy="1450" r="12" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="3"/></g>`);
  // Корма: приподнятый мостик со штурвалом.
  const qy = 1610;
  L.push(`<g filter="url(#${K}-step)"><path d="${hullPath(48)}" fill="url(#${K}-deck)" clip-path="url(#${K}-qclip)"/></g>`);
  L.push(`<clipPath id="${K}-qclip"><rect x="1900" y="${qy}" width="800" height="400"/></clipPath>`);
  L.push(`<path d="M2020,${qy} H2580" stroke="#24180c" stroke-width="14"/>${railPath(`M2030,${qy + 4} H2215 M2385,${qy + 4} H2570`, 7)}`);
  L.push(`<g filter="url(#soft)">${[0, 1, 2, 3].map(i => `<rect x="2225" y="${qy - 72 + i * 18}" width="150" height="16" fill="rgb(${120 + i * 12},${84 + i * 8},${48 + i * 5})" stroke="#2a170a" stroke-width="2"/>`).join("")}</g>`);
  L.push(shipWheel(cx, 1760, 62));
  L.push(`<g filter="url(#soft)"><rect x="${cx - 26}" y="1660" width="52" height="40" rx="8" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="3"/><circle cx="${cx}" cy="1680" r="13" fill="#efe6cf" stroke="#2a1d0c" stroke-width="2"/><path d="M${cx},1680 l6,-9" stroke="#8a1a10" stroke-width="2"/></g>`);
  L.push(`<g filter="url(#soft)">${gauge(2450, 1700, 24)}<path d="M2150,1700 q-20,-30 6,-50" stroke="#c39a48" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="2156" cy="1650" r="14" fill="url(#${K}-brass)" stroke="#2a1d0c" stroke-width="3"/></g>`);
  L.push(`<g filter="url(#soft)"><rect x="2420" y="1790" width="80" height="60" rx="8" fill="#5a2a1a" stroke="#1d0a05" stroke-width="4"/><rect x="2120" y="1790" width="64" height="64" rx="6" fill="#6a4a2a" stroke="#1d0a05" stroke-width="4"/></g>`);
  // Фонари на палубе.
  for (const [x, y] of [[2050, 560], [2550, 560], [2050, 1090], [2550, 1090], [2300, 1880]]) L.push(P.lantern(x, y));
  // Такелаж к баллону.
  const rig = [];
  for (let y = 240; y < 1820; y += 120) {
    const t = (y - 40) / 1900, x0 = y < 680 ? cx + (HULL.half - 22) * Math.min(1, 0.35 + t * 2.4) : cx + HULL.half - 22;
    rig.push(rope(x0, y, 2720 + r() * 20, y - 60 - r() * 60, 0, 4, false));
  }
  L.push(rig.join(""));
  return L.join("\n");
}

function envelope() {
  const r = rng(K + "-env");
  const x0 = 2690, L = [];
  const d = `M${x0 + 240},-200 C${x0 + 30},-60 ${x0},300 ${x0},700 L${x0},1400 C${x0},1800 ${x0 + 30},2060 ${x0 + 240},2200 L3800,2200 L3800,-200 Z`;
  L.push(`<g filter="url(#${K}-depth)"><path d="${d}" fill="url(#${K}-env)" stroke="#2a1d10" stroke-width="8"/></g>`);
  // Продольные швы полотнищ и поперечные шпангоуты.
  for (const k of [40, 110, 200, 300]) L.push(`<path d="M${x0 + 240 + k * 0.6},-200 C${x0 + 30 + k},-60 ${x0 + k},300 ${x0 + k},700 L${x0 + k},1400 C${x0 + k},1800 ${x0 + 30 + k},2060 ${x0 + 240 + k * 0.6},2200" stroke="rgba(70,50,30,0.45)" stroke-width="3" fill="none"/>`);
  for (let y = 60; y < 2000; y += 170) L.push(`<path d="M${x0 + (y < 300 || y > 1800 ? 40 : 4)},${y} Q${x0 + 160},${y + 14} 3000,${y + 4}" stroke="rgba(90,60,30,0.55)" stroke-width="7" fill="none"/><path d="M${x0 + 30},${y} Q${x0 + 160},${y + 14} 3000,${y + 4}" stroke="#a87c34" stroke-width="3" fill="none" stroke-dasharray="2 10"/>`);
  // Заплаты.
  for (const [x, y, w, h] of [[2810, 520, 90, 70], [2900, 1240, 70, 100], [2780, 1620, 60, 50]]) L.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(140,110,70,0.55)" stroke="rgba(60,40,20,0.7)" stroke-width="3" stroke-dasharray="6 4" transform="rotate(${f1((r() - 0.5) * 16)} ${x} ${y})"/>`);
  L.push(`<rect x="2900" y="-50" width="60" height="2100" fill="rgba(255,244,220,0.22)" filter="url(#${K}-steam)"/>`);
  // Нижняя кромка в тени.
  L.push(`<path d="M${x0},700 L${x0},1400" stroke="rgba(20,12,6,0.5)" stroke-width="18"/>`);
  return L.join("\n");
}

function draw() {
  const L = [];
  L.push(cityBelow());
  L.push(terrace());
  L.push(disc());
  L.push(airship());
  L.push(envelope());
  L.push(gangway());
  // Чайки.
  const gr = rng(K + "-gulls");
  for (const [x, y, k] of [[1560, 640, 1], [1640, 690, 0.8], [1880, 930, 1.1], [1520, 1010, 0.9], [2660, 1300, 1]]) {
    const a = (gr() - 0.5) * 60, d = `M${x - 26 * k},${y - 6 * k} Q${x - 12 * k},${y - 14 * k} ${x},${y} Q${x + 12 * k},${y - 14 * k} ${x + 26 * k},${y - 6 * k}`;
    L.push(`<g transform="rotate(${f1(a)} ${x} ${y})"><path d="${d}" transform="translate(30,50)" stroke="rgba(40,30,40,0.25)" stroke-width="${6 * k}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#f4efe6" stroke-width="${6 * k}" fill="none" stroke-linecap="round"/><path d="M${x - 26 * k},${y - 6 * k} l6,1 M${x + 26 * k},${y - 6 * k} l-6,1" stroke="#2a2a2a" stroke-width="${5 * k}" stroke-linecap="round"/></g>`);
  }
  // Закатный свет и виньетка.
  L.push(`<rect width="${W}" height="${H}" fill="url(#${K}-sun)"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="url(#${K}-vig)"/>`);
  return L.join("\n");
}

/* ---------- Зоны ---------- */
const ZONES = [
  { id: "platform", name: "Платформа мачты", tags: ["elevated", "cover"], poly: [[0, 0], [1400, 0], [1400, TER.y], ...ARC.slice().reverse(), [0, TER.y]], label: [800, 335], size: 56 },
  { id: "gangway", name: "Трап", tags: ["difficult", "hazard"], poly: [[1400, 0], [1960, 0], [1960, TER.y], [1400, TER.y]], label: [1680, 200], size: 58 },
  { id: "deck", name: "Палуба дирижабля", tags: ["elevated"], poly: [[1960, 0], [3000, 0], [3000, H], [1960, H]], label: [2300, 1000], size: 46 },
  { id: "winch", name: "Паровая лебёдка", tags: ["hazard", "cover"], poly: [[0, TER.y], ...ARC.filter(p => p[0] <= 1000), [1000, H], [0, H]], label: [560, 1830], size: 54 },
  { id: "cargo", name: "Склад грузов", tags: ["cover"], poly: [...ARC.filter(p => p[0] >= 1000), [1960, TER.y], [1960, H], [1000, H]], label: [1430, 1830], size: 56 }
];
const LINKS = [["platform", "gangway", "short"], ["gangway", "deck", "engaged"], ["platform", "winch", "short"], ["platform", "cargo", "short"],
  ["winch", "cargo", "short"], ["gangway", "cargo", "short"], ["cargo", "deck", "medium"]];

export default {
  key: K, name: "Причальная мачта дирижаблей", folder: "Стимпанк", worlds: ["steampunk", "weirdwar"],
  bgColor: "#3b3340",
  extraDefs: extraDefs(),
  draw, zones: ZONES, links: LINKS,
  style: { tint: "rgba(255,220,160,0.04)", line: "rgba(255,212,140,0.92)", text: "#ffe4b4" }
};
