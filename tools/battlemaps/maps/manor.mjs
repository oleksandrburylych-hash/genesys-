import { W, H, rng, f1, poly } from "../lib.mjs";

/* ==========================================================================
   Карта: заброшенная усадьба (вид сверху, холодный туман, пыль, свечи)
   ========================================================================== */
const R = rng("manor-detail");
const rr = (a, b) => a + R() * (b - a);
const pick = a => a[Math.floor(R() * a.length)];

/* ---------- геометрия ---------- */
function smooth(pts) {
  const n = pts.length, m = (p, q) => `${f1((p[0] + q[0]) / 2)},${f1((p[1] + q[1]) / 2)}`;
  let d = `M${m(pts[0], pts[1])}`;
  for (let i = 1; i <= n; i++) { const p = pts[i % n], q = pts[(i + 1) % n]; d += ` Q${f1(p[0])},${f1(p[1])} ${m(p, q)}`; }
  return d + "Z";
}
function blobPts(cx, cy, rx, ry, n = 9, jit = 0.35, rot = 0) {
  return Array.from({ length: n }, (_, i) => { const a = rot + i / n * Math.PI * 2, k = 1 + (R() - 0.5) * jit; return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]; });
}

/* ---------- текстуры ---------- */
function checker() {
  const r = rng("manor-checker"), o = [];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const dark = (x + y) % 2, s = 0.9 + r() * 0.15;
    o.push(`<rect x="${x * 80}" y="${y * 80}" width="80" height="80" fill="${dark ? `rgb(${Math.round(42 * s)},${Math.round(45 * s)},${Math.round(52 * s)})` : `rgb(${Math.round(176 * s)},${Math.round(178 * s)},${Math.round(182 * s)})`}" stroke="#1a1c20" stroke-width="2"/>`);
    if (r() < 0.6) o.push(`<path d="M${x * 80 + r() * 80},${y * 80} q${f1(r() * 40 - 20)},40 ${f1(r() * 60 - 30)},80" stroke="${dark ? "rgba(140,145,155,0.25)" : "rgba(90,95,105,0.3)"}" stroke-width="1.5" fill="none"/>`);
  }
  return `<pattern id="manor-checker" width="320" height="320" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">${o.join("")}</pattern>`;
}
function parquet() {
  const r = rng("manor-parquet"), o = [];
  for (let by = 0; by < 2; by++) for (let bx = 0; bx < 2; bx++) {
    const vert = (bx + by) % 2;
    for (let k = 0; k < 4; k++) {
      const s = 0.8 + r() * 0.3, c = `rgb(${Math.round(92 * s)},${Math.round(66 * s)},${Math.round(48 * s)})`;
      o.push(vert ? `<rect x="${bx * 100 + k * 25}" y="${by * 100}" width="25" height="100" fill="${c}" stroke="#20150e" stroke-width="2"/>` : `<rect x="${bx * 100}" y="${by * 100 + k * 25}" width="100" height="25" fill="${c}" stroke="#20150e" stroke-width="2"/>`);
    }
  }
  return `<pattern id="manor-parquet" width="200" height="200" patternUnits="userSpaceOnUse">${o.join("")}</pattern>`;
}
function planks() {
  const r = rng("manor-planks"), o = [], rowH = 40;
  for (let i = 0; i < 10; i++) {
    let x = -r() * 200;
    while (x < 600) {
      const len = 180 + r() * 260, s = 0.8 + r() * 0.3;
      o.push(`<rect x="${f1(x)}" y="${i * rowH}" width="${f1(len)}" height="${rowH}" fill="rgb(${Math.round(104 * s)},${Math.round(84 * s)},${Math.round(66 * s)})" stroke="#211812" stroke-width="2.2"/>`);
      o.push(`<path d="M${f1(x + 6)},${f1(i * rowH + 8 + r() * 24)} h${f1(len - 12)}" stroke="rgba(30,20,12,0.3)" stroke-width="1.5"/>`);
      x += len;
    }
  }
  return `<pattern id="manor-planks" width="600" height="400" patternUnits="userSpaceOnUse" patternTransform="rotate(90)">${o.join("")}</pattern>`;
}
function flags() {
  const r = rng("manor-flags"), o = [];
  for (let row = 0; row < 4; row++) { let x = -r() * 80; while (x < 320) { const w = 70 + r() * 70, s = 0.75 + r() * 0.3; o.push(`<rect x="${f1(x + 3)}" y="${row * 80 + 3}" width="${f1(w - 6)}" height="74" rx="6" fill="rgb(${Math.round(84 * s)},${Math.round(86 * s)},${Math.round(84 * s)})" stroke="#141615" stroke-width="3"/>`); x += w; } }
  return `<pattern id="manor-flags" width="320" height="320" patternUnits="userSpaceOnUse"><rect width="320" height="320" fill="#161817"/>${o.join("")}</pattern>`;
}
function deadGrass() {
  const r = rng("manor-grass"), o = [];
  for (let i = 0; i < 260; i++) { const x = r() * 240, y = r() * 240, a = r() * 6.28, l = 6 + r() * 14, c = pick2(r, ["#7d7656", "#6a6448", "#8e8662", "#5a5640", "#9a9070"]); o.push(`<path d="M${f1(x)},${f1(y)} l${f1(Math.cos(a) * l)},${f1(Math.sin(a) * l)}" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`); }
  return `<pattern id="manor-grass" width="240" height="240" patternUnits="userSpaceOnUse"><rect width="240" height="240" fill="#4e4b3a"/>${o.join("")}</pattern>`;
}
function pick2(r, a) { return a[Math.floor(r() * a.length)]; }
function gravel() {
  const r = rng("manor-gravel"), o = [];
  for (let i = 0; i < 220; i++) { const c = Math.round(110 + r() * 70); o.push(`<circle cx="${f1(r() * 160)}" cy="${f1(r() * 160)}" r="${f1(2 + r() * 4)}" fill="rgb(${c},${c},${c - 6})" stroke="rgba(20,20,20,0.5)" stroke-width="1"/>`); }
  return `<pattern id="manor-gravel" width="160" height="160" patternUnits="userSpaceOnUse"><rect width="160" height="160" fill="#6a685e"/>${o.join("")}</pattern>`;
}
function wallPattern() {
  const r = rng("manor-wall"), o = [];
  for (let row = 0; row < 4; row++) for (let x = -(row % 2) * 25; x < 100; x += 50) { const s = 0.8 + r() * 0.3; o.push(`<rect x="${x + 1.5}" y="${row * 25 + 1.5}" width="47" height="22" fill="rgb(${Math.round(52 * s)},${Math.round(54 * s)},${Math.round(62 * s)})" stroke="#0a0b0e" stroke-width="2"/>`); }
  return `<pattern id="manor-wall" width="100" height="100" patternUnits="userSpaceOnUse">${o.join("")}</pattern>`;
}

const EXTRA = `<defs>
  ${checker()}${parquet()}${planks()}${flags()}${deadGrass()}${gravel()}${wallPattern()}
  <filter id="manor-fog" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.0032 0.0055" numOctaves="4" seed="21"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.78  0 0 0 0 0.82  0 0 0 0 0.9  0 0 0 1.5 -0.66"/></filter>
  <filter id="manor-mud" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="4" seed="8"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.14  0 0 0 0 0.1  0 0 0 1.4 -0.55"/></filter>
  <filter id="manor-dust" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="2"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.75  0 0 0 0 0.74  0 0 0 0 0.7  0 0 0 1.1 -0.5"/></filter>
  <filter id="manor-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="manor-treeshadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
  <linearGradient id="manor-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5e4634"/><stop offset="1" stop-color="#2e2018"/></linearGradient>
  <radialGradient id="manor-stone" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#a6a9ae"/><stop offset="1" stop-color="#4c4f56"/></radialGradient>
  <radialGradient id="manor-candle" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(255,190,100,0.55)"/><stop offset="0.45" stop-color="rgba(255,150,70,0.18)"/><stop offset="1" stop-color="rgba(255,120,50,0)"/></radialGradient>
  <radialGradient id="manor-moon" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(170,200,240,0.35)"/><stop offset="1" stop-color="rgba(140,170,220,0)"/></radialGradient>
  <radialGradient id="manor-hole" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity="1"/><stop offset="0.55" stop-color="#000" stop-opacity="0.7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <radialGradient id="manor-pit" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000"/><stop offset="0.7" stop-color="#07080a"/><stop offset="1" stop-color="#1c1e20"/></radialGradient>
  <radialGradient id="manor-vignette" cx="50%" cy="50%" r="72%"><stop offset="0.5" stop-color="rgba(5,8,16,0)"/><stop offset="1" stop-color="rgba(5,8,16,0.72)"/></radialGradient>
  <g id="manor-candle1"><circle r="7" fill="#e9e3d0" stroke="#5a5446" stroke-width="2"/><circle r="4" fill="#ffd36b" filter="url(#glow)"/><circle r="1.8" fill="#fff6d0"/></g>
  <g id="manor-book"><rect x="-14" y="-5" width="28" height="10" rx="1.5" stroke="#111" stroke-width="1.5"/></g>
</defs>`;

/* ---------- предметы ---------- */
const lights = [], glows = [];
function candle(x, y, light = 150) {
  lights.push([x, y, light, 0.85]); glows.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(light * 0.9)}" fill="url(#manor-candle)"/>`);
  return `<use href="#manor-candle1" transform="translate(${f1(x)} ${f1(y)})"/>`;
}
function candelabra(x, y, light = 300) {
  lights.push([x, y, light, 0.95]); glows.push(`<circle cx="${x}" cy="${y}" r="${light}" fill="url(#manor-candle)"/>`);
  return `<g><circle cx="${x}" cy="${y}" r="26" fill="none" stroke="#8a7a4a" stroke-width="5"/><path d="M${x - 26},${y} H${x + 26} M${x},${y - 26} V${y + 26}" stroke="#8a7a4a" stroke-width="4"/>${[[0, 0], [-26, 0], [26, 0], [0, -26], [0, 26]].map(([dx, dy]) => `<use href="#manor-candle1" transform="translate(${x + dx} ${y + dy}) scale(0.85)"/>`).join("")}</g>`;
}
function chair(x, y, rot = 0, fallen = false) {
  const t = `translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})${fallen ? " scale(1 0.8)" : ""}`;
  return `<g filter="url(#soft)" transform="${t}"><rect x="-24" y="-22" width="48" height="44" rx="6" fill="#4e3a2c" stroke="#1a120c" stroke-width="3"/><rect x="-18" y="-14" width="36" height="30" rx="4" fill="#5a2a32"/><rect x="-26" y="-30" width="52" height="12" rx="4" fill="#3a2a1e" stroke="#1a120c" stroke-width="2"/></g>`;
}
function armchair(x, y, rot = 0) {
  return `<g filter="url(#soft)" transform="translate(${x} ${y}) rotate(${rot})"><rect x="-46" y="-42" width="92" height="84" rx="18" fill="#3e2a30" stroke="#160d10" stroke-width="4"/><rect x="-30" y="-22" width="60" height="54" rx="10" fill="#5a3a44"/><rect x="-46" y="-42" width="92" height="22" rx="10" fill="#2e1e22"/><path d="M-20,0 l18,12 l14,-16" stroke="#c8c0b0" stroke-width="3" fill="none" opacity="0.6"/></g>`;
}
function sheetFurniture(x, y, w, h, rot = 0) { // мебель под пыльным чехлом
  const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2 + 6, h / 2], [-w / 2 - 6, h / 2]];
  return `<g filter="url(#soft)" transform="translate(${x} ${y}) rotate(${rot})"><path d="${smooth(pts.flatMap((p, i) => { const q = pts[(i + 1) % 4]; return [p, [(p[0] + q[0]) / 2 + rr(-8, 8), (p[1] + q[1]) / 2 + rr(-8, 8)]]; }))}" fill="#b8bcc0" stroke="#5a5e66" stroke-width="3"/>
    <path d="M${-w * 0.3},${-h * 0.4} q${w * 0.1},${h * 0.4} 0,${h * 0.8} M${w * 0.1},${-h * 0.45} q${-w * 0.08},${h * 0.5} ${w * 0.05},${h * 0.9}" stroke="rgba(70,75,85,0.45)" stroke-width="3" fill="none"/></g>`;
}
function bookcase(x, y, w, h, vertical = false) {
  const cols = ["#6a2a2a", "#2a4a3a", "#3a3a5a", "#6a5a2a", "#4a2a3a", "#5a4a3a", "#2a3a4a"];
  const o = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2e2018" stroke="#120a06" stroke-width="4"/>`];
  if (!vertical) { let bx = x + 6; while (bx < x + w - 12) { const bw = rr(9, 16); o.push(`<rect x="${f1(bx)}" y="${y + 6}" width="${f1(bw - 1.5)}" height="${h - 12}" fill="${pick(cols)}" stroke="#111" stroke-width="1"/>`); bx += bw; } }
  else { let by = y + 6; while (by < y + h - 12) { const bh = rr(9, 16); o.push(`<rect x="${x + 6}" y="${f1(by)}" width="${w - 12}" height="${f1(bh - 1.5)}" fill="${pick(cols)}" stroke="#111" stroke-width="1"/>`); by += bh; } }
  return `<g filter="url(#soft)">${o.join("")}</g>`;
}
/** Отдельно стоящий двусторонний стеллаж. */
function stack(x, y, w, h) {
  return bookcase(x, y, w, h / 2) + bookcase(x, y + h / 2, w, h / 2);
}
function books(cx, cy, rad, n) {
  const cols = ["#7a3030", "#2e5a44", "#44446a", "#7a6a30", "#5a3044", "#c8c0a8"];
  const o = [];
  for (let i = 0; i < n; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * rad; o.push(`<use href="#manor-book" fill="${pick(cols)}" transform="translate(${f1(cx + Math.cos(a) * d)} ${f1(cy + Math.sin(a) * d)}) rotate(${f1(rr(0, 180))}) scale(${f1(rr(0.9, 1.4))})"/>`); }
  for (let i = 0; i < n / 3; i++) { const x = cx + rr(-rad, rad), y = cy + rr(-rad, rad); o.push(`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(rr(14, 24))}" height="${f1(rr(10, 16))}" fill="#d8d0b8" stroke="#6a6250" stroke-width="1" transform="rotate(${f1(rr(0, 90))} ${f1(x)} ${f1(y)})"/>`); }
  return `<g filter="url(#soft)">${o.join("")}</g>`;
}
function rug(x, y, w, h, c1 = "#4a2a34", c2 = "#7a5a3a") {
  return `<g opacity="0.85"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${c1}" stroke="${c2}" stroke-width="8"/><rect x="${x + 24}" y="${y + 24}" width="${w - 48}" height="${h - 48}" fill="none" stroke="${c2}" stroke-width="4" stroke-dasharray="14 8"/><ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w * 0.22}" ry="${h * 0.22}" fill="none" stroke="${c2}" stroke-width="5"/></g>`;
}
function cobweb(x, y, sx, sy, size = 120) {
  const o = [], n = 6;
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2; o.push(`M${x},${y} l${f1(Math.cos(a) * size * sx)},${f1(Math.sin(a) * size * sy)}`); }
  for (let k = 1; k <= 4; k++) { const rad = size * k / 4.3; let d = ""; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2, r2 = rad * (i % 2 ? 0.9 : 1); d += `${i ? "L" : "M"}${f1(x + Math.cos(a) * r2 * sx)},${f1(y + Math.sin(a) * r2 * sy)} `; } o.push(d); }
  return `<path d="${o.join(" ")}" stroke="rgba(225,230,235,0.4)" stroke-width="1.6" fill="none"/>`;
}
function debris(cx, cy, rad, n, col = "#4e3a2c") {
  const o = [];
  for (let i = 0; i < n; i++) { const x = cx + rr(-rad, rad), y = cy + rr(-rad, rad), l = rr(20, 70); o.push(`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(l)}" height="${f1(rr(6, 12))}" fill="${col}" stroke="#140e0a" stroke-width="2" transform="rotate(${f1(rr(0, 180))} ${f1(x)} ${f1(y)})"/>`); }
  return `<g filter="url(#soft)">${o.join("")}</g>`;
}
function shards(cx, cy, rad, n) {
  const o = [];
  for (let i = 0; i < n; i++) { const x = cx + rr(-rad, rad), y = cy + rr(-rad, rad), s = rr(4, 10); o.push(`<path d="M${f1(x)},${f1(y - s)} l${f1(s * 0.7)},${f1(s * 1.4)} l${f1(-s * 1.3)},${f1(-s * 0.3)}z" fill="rgba(210,225,240,0.7)" stroke="rgba(60,70,80,0.6)" stroke-width="1"/>`); }
  return o.join("");
}
function chandelier(x, y, r = 110) {
  const o = [`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#6a5a3a" stroke-width="9"/><circle cx="${x}" cy="${y}" r="${r * 0.5}" fill="none" stroke="#6a5a3a" stroke-width="6"/>`];
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; o.push(`<path d="M${x},${y} L${f1(x + Math.cos(a) * r)},${f1(y + Math.sin(a) * r)}" stroke="#5a4a2a" stroke-width="5"/><circle cx="${f1(x + Math.cos(a) * r)}" cy="${f1(y + Math.sin(a) * r)}" r="9" fill="#d8d0b8" stroke="#5a5446" stroke-width="2"/>`); }
  for (let i = 0; i < 24; i++) { const a = R() * 6.28, d = r * rr(0.2, 1.3); o.push(`<circle cx="${f1(x + Math.cos(a) * d)}" cy="${f1(y + Math.sin(a) * d)}" r="${f1(rr(3, 6))}" fill="rgba(220,235,250,0.8)" stroke="rgba(60,70,80,0.6)" stroke-width="1"/>`); }
  return `<g filter="url(#soft)">${o.join("")}</g>` + shards(x, y, r * 1.6, 40);
}
function barrel(x, y, r = 40) {
  return `<g filter="url(#soft)"><circle cx="${x}" cy="${y}" r="${r}" fill="#5a4030" stroke="#1a100a" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${r * 0.86}" fill="none" stroke="#3a3a3a" stroke-width="5"/><circle cx="${x}" cy="${y}" r="${r * 0.4}" fill="none" stroke="rgba(20,10,5,0.5)" stroke-width="2"/></g>`;
}
function wineRack(x, y, w, h) {
  const o = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2a1e16" stroke="#0e0906" stroke-width="4"/>`];
  for (let yy = y + 14; yy < y + h - 8; yy += 22) for (let xx = x + 14; xx < x + w - 8; xx += 22) o.push(R() < 0.75 ? `<circle cx="${xx}" cy="${yy}" r="8" fill="${pick(["#2a4a2a", "#4a1a22", "#1e2a1e"])}" stroke="#000" stroke-width="1.5"/>` : `<circle cx="${xx}" cy="${yy}" r="8" fill="#140c08"/>`);
  return `<g filter="url(#soft)">${o.join("")}</g>`;
}
function crate(x, y, s = 80, rot = 0) {
  return `<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})"><rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" fill="#6a5440" stroke="#21170e" stroke-width="4"/><path d="M${x - s / 2},${y - s / 2} L${x + s / 2},${y + s / 2} M${x + s / 2},${y - s / 2} L${x - s / 2},${y + s / 2}" stroke="#4a3828" stroke-width="6"/></g>`;
}
function deadTree(x, y, size, seed) {
  const r = rng(seed), segs = [];
  const grow = (px, py, a, len, w, depth) => {
    const nx = px + Math.cos(a) * len, ny = py + Math.sin(a) * len, mx = (px + nx) / 2 + (r() - 0.5) * len * 0.3, my = (py + ny) / 2 + (r() - 0.5) * len * 0.3;
    segs.push([`M${f1(px)},${f1(py)} Q${f1(mx)},${f1(my)} ${f1(nx)},${f1(ny)}`, w]);
    if (depth <= 0 || w < 2) return;
    const k = r() < 0.7 ? 2 : 3;
    for (let i = 0; i < k; i++) grow(nx, ny, a + (r() - 0.5) * 1.3, len * (0.6 + r() * 0.2), w * 0.62, depth - 1);
  };
  const n = 5 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) grow(x, y, i / n * 6.28 + r() * 0.6, size * (0.3 + r() * 0.12), size * 0.09, 4);
  const draw = (col, dx, dy) => segs.map(([d, w]) => `<path d="${d}" stroke="${col}" stroke-width="${f1(w)}" fill="none" stroke-linecap="round" transform="translate(${dx} ${dy})"/>`).join("");
  return `<g filter="url(#manor-treeshadow)" opacity="0.7">${draw("#000", 34, 44)}</g><g>${draw("#2a221c", 0, 0)}</g><g opacity="0.6">${segs.filter(s => s[1] > 4).map(([d, w]) => `<path d="${d}" stroke="#7a6a5a" stroke-width="${f1(w * 0.35)}" fill="none" stroke-linecap="round" transform="translate(-1.5 -1.5)"/>`).join("")}</g>
    <circle cx="${x}" cy="${y}" r="${f1(size * 0.1)}" fill="#2a221c" stroke="#120e0a" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${f1(size * 0.06)}" fill="none" stroke="#4a3e32" stroke-width="2"/>`;
}
function grave(x, y, rot = 0, kind = 0, open = false) {
  const o = [];
  if (open) o.push(`<rect x="-34" y="10" width="68" height="140" rx="4" fill="#0e0c0a" stroke="#2a221a" stroke-width="4"/><path d="${smooth(blobPts(70, 80, 40, 70, 9, 0.3))}" fill="#3a2e22" stroke="#1a140e" stroke-width="3"/>`);
  else o.push(`<path d="${smooth([[-30, 16], [0, 10], [30, 16], [34, 70], [28, 130], [0, 138], [-28, 130], [-34, 70]])}" fill="#2a2219" stroke="#15110c" stroke-width="3"/><path d="M-18,40 l10,6 M8,70 l12,-4 M-10,100 l8,8" stroke="#5a4a36" stroke-width="3"/>`);
  if (kind === 0) o.push(`<rect x="-40" y="-14" width="80" height="26" rx="10" fill="url(#manor-stone)" stroke="#202226" stroke-width="3"/>`);
  else if (kind === 1) o.push(`<path d="M-8,-40 h16 v26 h26 v16 h-26 v12 h-16 v-12 h-26 v-16 h26z" fill="url(#manor-stone)" stroke="#202226" stroke-width="3" transform="scale(1 0.7)"/>`);
  else o.push(`<rect x="-36" y="-14" width="72" height="26" rx="4" fill="url(#manor-stone)" stroke="#202226" stroke-width="3" transform="rotate(14)"/><rect x="-20" y="16" width="40" height="18" rx="4" fill="#6a6e74" stroke="#202226" stroke-width="2" transform="rotate(-20)"/>`);
  return `<g filter="url(#soft)" transform="translate(${x} ${y}) rotate(${rot})">${o.join("")}</g>`;
}
function bramble(cx, cy, rx, ry) {
  const o = [`<path d="${smooth(blobPts(cx, cy, rx, ry, 11, 0.35))}" fill="rgba(36,30,22,0.55)"/>`];
  for (let i = 0; i < Math.round(rx * ry / 110); i++) { const a = R() * 6.28, d = Math.sqrt(R()), x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d, t = R() * 6.28, l = rr(14, 34); o.push(`<path d="M${f1(x)},${f1(y)} q${f1(Math.cos(t + 1) * l * 0.4)},${f1(Math.sin(t + 1) * l * 0.4)} ${f1(Math.cos(t) * l)},${f1(Math.sin(t) * l)}" stroke="${pick(["#7a6448", "#5e4c36", "#8a7452", "#3a3024", "#4a5a30"])}" stroke-width="3" fill="none" stroke-linecap="round"/>`); }
  return `<g filter="url(#soft)">${o.join("")}</g>`;
}
/** Окно в стене + лунный свет на полу. */
function windowAt(x, y, len, side) {
  const vert = side === "w" || side === "e";
  const pane = vert ? `<rect x="${x - 8}" y="${y - len / 2}" width="16" height="${len}" fill="#7a8ea6" stroke="#20242c" stroke-width="3"/><path d="M${x},${y - len / 2} V${y + len / 2}" stroke="#20242c" stroke-width="3"/>`
    : `<rect x="${x - len / 2}" y="${y - 8}" width="${len}" height="16" fill="#7a8ea6" stroke="#20242c" stroke-width="3"/><path d="M${x - len / 2},${y} H${x + len / 2}" stroke="#20242c" stroke-width="3"/>`;
  const d = 260, sp = 0.35;
  const shaft = side === "w" ? [[x, y - len / 2], [x + d, y - len / 2 + d * sp], [x + d, y + len / 2 + d * sp], [x, y + len / 2]]
    : side === "e" ? [[x, y - len / 2], [x - d, y - len / 2 + d * sp], [x - d, y + len / 2 + d * sp], [x, y + len / 2]]
      : side === "n" ? [[x - len / 2, y], [x - len / 2 + d * sp, y + d], [x + len / 2 + d * sp, y + d], [x + len / 2, y]]
        : [[x - len / 2, y], [x - len / 2 + d * sp, y - d], [x + len / 2 + d * sp, y - d], [x + len / 2, y]];
  glows.push(`<polygon points="${poly(shaft)}" fill="rgba(170,200,240,0.2)" filter="url(#manor-blur)"/>`);
  const c = shaft.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]);
  lights.push([c[0], c[1], len * 0.9 + 60, 0.6]);
  return pane;
}
function mwalls(segs, thick) {
  const d = segs.map(s => `M${s[0][0]},${s[0][1]} L${s[1][0]},${s[1][1]}`).join(" ");
  return `<g filter="url(#wallshadow)"><path d="${d}" stroke="#0c0d10" stroke-width="${thick + 10}" stroke-linecap="square" fill="none"/><path d="${d}" stroke="url(#manor-wall)" stroke-width="${thick}" stroke-linecap="square" fill="none"/><path d="${d}" stroke="rgba(200,210,225,0.08)" stroke-width="${thick * 0.3}" stroke-linecap="square" fill="none"/></g>`;
}
function door(x, y, w, vert, open = 0) {
  return `<g filter="url(#soft)" transform="rotate(${open} ${x} ${y})">${vert ? `<rect x="${x - 10}" y="${y}" width="20" height="${w}" fill="#4a3424" stroke="#140c08" stroke-width="3"/>` : `<rect x="${x}" y="${y - 10}" width="${w}" height="20" fill="#4a3424" stroke="#140c08" stroke-width="3"/>`}</g>`;
}

/* ---------- сборка ---------- */
// Дом: x 50..2280, y 50..1420. Комнаты: библиотека, погреб (слева), лестница и холл (центр), столовая (справа).
const X0 = 50, Y0 = 50, X1 = 760, X2 = 1520, X3 = 2280, YS = 620, YL = 900, Y1 = 1420;

function draw() {
  lights.length = 0; glows.length = 0;
  const L = [];
  // Сад: мёртвая трава, грязь, гравийная дорожка.
  L.push(`<rect width="${W}" height="${H}" fill="url(#manor-grass)"/>`, `<rect width="${W}" height="${H}" filter="url(#manor-mud)"/>`);
  L.push(`<path d="M1060,${Y1} L1220,${Y1} C1230,1600 1300,1760 1280,2000 L1020,2000 C1060,1800 1040,1600 1060,${Y1}Z" fill="url(#manor-gravel)" stroke="#2a2a26" stroke-width="4"/>`);
  L.push(`<path d="M2300,625 C2380,640 2400,720 2390,860 C2380,1050 2380,1250 2360,1420 C2330,1600 2200,1700 1250,1730" stroke="url(#manor-gravel)" stroke-width="110" fill="none"/><path d="M2300,625 C2380,640 2400,720 2390,860 C2380,1050 2380,1250 2360,1420 C2330,1600 2200,1700 1250,1730" stroke="rgba(30,30,26,0.6)" stroke-width="118" fill="none" opacity="0.35"/>`);
  L.push(`<rect x="2280" y="560" width="150" height="130" fill="url(#manor-flags)" stroke="#1a1c1e" stroke-width="4"/>`); // терраса у столовой
  // Полы дома.
  L.push(`<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${YL - Y0}" fill="url(#manor-parquet)"/>`);
  L.push(`<rect x="${X0}" y="${YL}" width="${X1 - X0}" height="${Y1 - YL}" fill="url(#manor-flags)"/>`);
  L.push(`<rect x="${X1}" y="${Y0}" width="${X2 - X1}" height="${Y1 - Y0}" fill="url(#manor-checker)"/>`);
  L.push(`<rect x="${X2}" y="${Y0}" width="${X3 - X2}" height="${Y1 - Y0}" fill="url(#manor-planks)"/>`);
  L.push(`<rect x="${X0}" y="${Y0}" width="${X3 - X0}" height="${Y1 - Y0}" filter="url(#manor-dust)" opacity="0.55"/>`);
  L.push(`<rect x="${X0}" y="${Y0}" width="${X3 - X0}" height="${Y1 - Y0}" fill="#000" filter="url(#grain)" opacity="0.45"/>`);
  // проломы в полу (доски)
  L.push(`<path d="${smooth(blobPts(1900, 1250, 90, 60, 9, 0.4))}" fill="#0a0806"/>${debris(1900, 1250, 70, 6, "#5a4636")}`);

  /* --- Библиотека --- */
  L.push(rug(170, 360, 440, 330, "#2e3448", "#6a6a52"));
  L.push(bookcase(X0 + 26, Y0 + 26, 660, 46), bookcase(X0 + 26, Y0 + 80, 46, 760, true));
  L.push(stack(250, 170, 380, 60), stack(250, 760, 380, 60));
  // поваленный стеллаж и рассыпанные книги
  L.push(`<g transform="rotate(-28 520 520)">${bookcase(380, 500, 300, 50)}</g>`, books(470, 600, 110, 40), books(220, 300, 60, 14), books(650, 760, 50, 10));
  L.push(armchair(260, 470, 30), armchair(300, 620, 150));
  L.push(`<g filter="url(#soft)"><rect x="560" y="300" width="150" height="90" rx="6" fill="url(#manor-wood)" stroke="#140c08" stroke-width="4"/><rect x="580" y="316" width="50" height="36" fill="#d8d0b8" transform="rotate(-8 605 334)"/></g>`, candle(670, 330, 170));
  L.push(`<g filter="url(#soft)"><circle cx="160" cy="250" r="34" fill="#3a5a6a" stroke="#1a1a12" stroke-width="4"/><path d="M140,236 q20,10 30,-6 M150,262 q16,-4 24,10" stroke="#7a8a5a" stroke-width="6" fill="none"/><circle cx="160" cy="250" r="40" fill="none" stroke="#8a7a4a" stroke-width="4"/></g>`);
  L.push(cobweb(X0 + 74, Y0 + 74, 1, 1, 120), cobweb(X1 - 18, YL - 18, -1, -1, 100));

  /* --- Погреб (ниже уровня дома) --- */
  L.push(`<rect x="${X0}" y="${YL}" width="${X1 - X0}" height="${Y1 - YL}" fill="rgba(0,0,0,0.3)"/>`);
  // лестница вниз из холла
  { const o = [`<rect x="${X1 - 260}" y="1240" width="230" height="140" fill="#1a1a1a"/>`]; for (let i = 0; i < 8; i++) { const sh = 0.95 - i * 0.08; o.push(`<rect x="${X1 - 60 - i * 26}" y="1250" width="26" height="120" fill="rgb(${Math.round(110 * sh)},${Math.round(110 * sh)},${Math.round(112 * sh)})" stroke="#111" stroke-width="2"/>`); } o.push(`<path d="M${X1 - 50},1310 H${X1 - 230} M${X1 - 205},1288 L${X1 - 230},1310 L${X1 - 205},1332" stroke="rgba(230,235,245,0.55)" stroke-width="6" fill="none" stroke-linecap="round"/>`); L.push(`<g filter="url(#soft)">${o.join("")}</g>`); }
  L.push(wineRack(X0 + 24, YL + 40, 60, 340), wineRack(140, YL + 30, 300, 56));
  L.push(barrel(560, 990, 44), barrel(650, 1000, 40), barrel(600, 1075, 42), barrel(160, 1370, 40));
  L.push(crate(250, 1350, 76, 10), crate(330, 1330, 64, -16));
  // провал в полу погреба — в темноту
  L.push(`<path d="${smooth(blobPts(330, 1130, 120, 90, 11, 0.35))}" fill="url(#manor-pit)" stroke="#2a2c2e" stroke-width="5"/>`);
  { const o = []; for (let i = 0; i < 14; i++) { const a = R() * 6.28, x = 330 + Math.cos(a) * rr(110, 150), y = 1130 + Math.sin(a) * rr(85, 120); o.push(`<path d="${smooth(blobPts(x, y, rr(8, 18), rr(6, 14), 6, 0.5))}" fill="#5a5c5a" stroke="#1a1c1a" stroke-width="2"/>`); } L.push(`<g filter="url(#soft)">${o.join("")}</g>`); }
  L.push(`<path d="${smooth(blobPts(560, 1240, 70, 34, 9, 0.4))}" fill="#1a2a30" stroke="rgba(150,190,200,0.3)" stroke-width="3" opacity="0.85"/>`);
  L.push(shards(600, 1180, 40, 14), candle(500, 1360, 140));
  L.push(cobweb(X0 + 24, Y1 - 24, 1, -1, 90));

  /* --- Парадная лестница --- */
  {
    const sx = 900, sw = 480, top = 270, bot = YS;
    const o = [`<rect x="${sx - 24}" y="${top - 160}" width="${sw + 48}" height="${bot - top + 160}" fill="#2c2e33"/>`];
    // площадка
    o.push(`<rect x="${sx - 24}" y="${Y0 + 26}" width="${sw + 48}" height="${top - Y0 - 26}" fill="url(#manor-checker)"/>`);
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      const y = bot - (i + 1) * (bot - top) / steps, sh = 0.7 + i / steps * 0.45;
      o.push(`<rect x="${sx}" y="${f1(y)}" width="${sw}" height="${f1((bot - top) / steps)}" fill="rgb(${Math.round(150 * sh)},${Math.round(152 * sh)},${Math.round(158 * sh)})" stroke="#1a1c20" stroke-width="2.5"/>`);
    }
    o.push(`<rect x="${sx + sw / 2 - 90}" y="${top - 140}" width="180" height="${bot - top + 140}" fill="#5a2228" opacity="0.85"/><rect x="${sx + sw / 2 - 90}" y="${top - 140}" width="180" height="${bot - top + 140}" fill="none" stroke="#a08a50" stroke-width="5" opacity="0.7"/>`);
    for (let i = 0; i < steps; i++) { const y = bot - (i + 1) * (bot - top) / steps; o.push(`<path d="M${sx + sw / 2 - 90},${f1(y)} h180" stroke="#8a7a4a" stroke-width="3"/>`); }
    // рваная дорожка и провалившиеся ступени
    o.push(`<path d="M${sx + sw / 2 - 90},430 l60,22 l50,-14 l70,28 V470 H${sx + sw / 2 - 90}z" fill="#2c2e33"/><path d="M${sx + 300},380 l90,-6 l40,30 l-10,46 l-110,4z" fill="#0e0f12" stroke="#3a3c42" stroke-width="3"/>`);
    // балюстрады
    o.push(`<rect x="${sx - 26}" y="${top - 150}" width="22" height="${bot - top + 150}" fill="#3a2a20" stroke="#120a06" stroke-width="3"/><rect x="${sx + sw + 4}" y="${top - 150}" width="22" height="${bot - top + 150}" fill="#3a2a20" stroke="#120a06" stroke-width="3"/>`);
    o.push(`<rect x="${sx - 40}" y="${bot - 30}" width="50" height="50" fill="url(#manor-stone)" stroke="#1a1c20" stroke-width="3"/><rect x="${sx + sw - 10}" y="${bot - 30}" width="50" height="50" fill="url(#manor-stone)" stroke="#1a1c20" stroke-width="3"/>`);
    o.push(`<path d="M${sx + sw / 2},${bot - 30} V${top + 30} M${sx + sw / 2 - 24},${top + 56} L${sx + sw / 2},${top + 30} L${sx + sw / 2 + 24},${top + 56}" stroke="rgba(235,235,240,0.55)" stroke-width="7" fill="none" stroke-linecap="round"/>`);
    L.push(`<g filter="url(#soft)">${o.join("")}</g>`);
    // обрушенные перила
    L.push(debris(sx + sw + 70, 420, 50, 9, "#3a2a20"), debris(sx + 340, 400, 50, 6, "#5a5c60"));
    L.push(`<g filter="url(#soft)"><rect x="${sx + sw + 30}" y="300" width="18" height="220" fill="#3a2a20" stroke="#120a06" stroke-width="3" transform="rotate(24 ${sx + sw + 39} 410)"/></g>`);
    L.push(sheetFurniture(820, 470, 90, 130, 4), sheetFurniture(1450, 200, 80, 150, -6));
    L.push(`<g filter="url(#soft)"><rect x="1420" y="440" width="70" height="110" rx="6" fill="#2a1e16" stroke="#0e0906" stroke-width="4"/><circle cx="1455" cy="475" r="22" fill="#c8c0a8" stroke="#3a3428" stroke-width="3"/></g>`); // напольные часы
    L.push(candle(sx - 40, bot - 50, 150), candle(sx + sw + 40, bot - 50, 150));
  }

  /* --- Холл --- */
  L.push(rug(930, 820, 420, 300, "#3a2430", "#6a5a3e"));
  L.push(chandelier(1140, 980, 100));
  L.push(armchair(860, 760, 110), armchair(1420, 1180, -70), sheetFurniture(1420, 760, 110, 160, 0), sheetFurniture(860, 1100, 100, 90, 12));
  L.push(`<g filter="url(#soft)"><rect x="790" y="1240" width="26" height="150" fill="#8a96a6" stroke="#1a1c20" stroke-width="4"/></g>`, shards(860, 1300, 50, 18)); // разбитое зеркало
  L.push(`<g filter="url(#soft)" transform="rotate(-18 1380 1320)"><rect x="1310" y="1280" width="140" height="90" fill="#2a2620" stroke="#8a7a4a" stroke-width="10"/><rect x="1325" y="1295" width="110" height="60" fill="#3a3040"/></g>`); // упавший портрет
  L.push(debris(1250, 1290, 60, 8, "#4e3a2c"));
  L.push(candle(1100, 860, 160), candle(1300, 1350, 140));
  L.push(cobweb(X1 + 18, YS + 18, 1, 1, 90), cobweb(X2 - 18, Y1 - 18, -1, -1, 110));

  /* --- Столовая --- */
  {
    const tx = 1820, ty = 260, tw = 170, th = 860;
    for (let i = 0; i < 6; i++) { const y = ty + 80 + i * 135; L.push(i === 2 ? chair(tx - 60, y + 30, 70, true) : chair(tx - 36, y, -90), i === 4 ? chair(tx + tw + 80, y - 10, 130, true) : chair(tx + tw + 36, y, 90)); }
    L.push(chair(tx + tw / 2, ty - 40, 0), chair(tx + tw / 2, ty + th + 40, 180));
    L.push(`<g filter="url(#soft)"><rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="10" fill="url(#manor-wood)" stroke="#120a06" stroke-width="5"/><rect x="${tx + 20}" y="${ty + 20}" width="${tw - 40}" height="${th - 40}" fill="#c8c4b8" opacity="0.55"/><path d="M${tx + 20},${ty + 300} l40,30 l-20,40 l50,20" stroke="rgba(60,50,40,0.6)" stroke-width="4" fill="none"/></g>`);
    for (let i = 0; i < 6; i++) { const y = ty + 80 + i * 135; for (const dx of [26, tw - 26]) L.push(`<circle cx="${tx + dx}" cy="${y}" r="17" fill="#d8d6cc" stroke="#5a5850" stroke-width="2"/><circle cx="${tx + dx}" cy="${y}" r="9" fill="${R() < 0.5 ? "#3a2a1e" : "#cfcabb"}"/>`); }
    L.push(candelabra(tx + tw / 2, ty + 230, 320), candelabra(tx + tw / 2, ty + 630, 320));
    L.push(`<path d="${smooth(blobPts(tx + tw / 2, ty + 430, 30, 18, 8, 0.4))}" fill="#4a1a1e" opacity="0.8"/>`);
    L.push(shards(tx - 120, ty + 560, 40, 16), `<circle cx="${tx - 110}" cy="${ty + 540}" r="15" fill="#d8d6cc" stroke="#5a5850" stroke-width="2" opacity="0.8"/>`);
    // буфет и камин
    L.push(`<g filter="url(#soft)"><rect x="${X2 + 26}" y="200" width="70" height="420" fill="url(#manor-wood)" stroke="#120a06" stroke-width="4"/><path d="M${X2 + 26},340 h70 M${X2 + 26},480 h70" stroke="#120a06" stroke-width="3"/></g>`);
    L.push(`<g filter="url(#soft)"><rect x="2190" y="720" width="70" height="260" fill="url(#manor-wall)" stroke="#0c0d10" stroke-width="5"/><rect x="2200" y="780" width="40" height="140" fill="#0e0c0a"/><path d="M2210,800 l20,40 M2215,860 l14,30" stroke="#4a4038" stroke-width="5"/></g>`);
    L.push(cobweb(X3 - 18, Y0 + 18, -1, 1, 110), cobweb(X2 + 18, Y1 - 18, 1, -1, 90));
  }

  /* --- Стены дома --- */
  L.push(mwalls([
    [[X0, Y0], [X3, Y0]], [[X0, Y0], [X0, Y1]], [[X3, Y0], [X3, 560]], [[X3, 690], [X3, Y1]],
    [[X0, Y1], [1060, Y1]], [[1220, Y1], [X3, Y1]]
  ], 46));
  L.push(mwalls([
    [[X1, Y0], [X1, 380]], [[X1, 520], [X1, YL]], [[X1, YL], [X1, 1220]], [[X0, YL], [X1, YL]],
    [[X2, Y0], [X2, 820]], [[X2, 980], [X2, Y1]],
    [[X1, YS], [880, YS]], [[1400, YS], [X2, YS]]
  ], 30));
  // окна поверх стен (перерисовать стекло)
  L.push(windowAt(X0, 300, 120, "w"), windowAt(X0, 620, 120, "w"), windowAt(400, Y0, 120, "n"), windowAt(1140, Y0, 260, "n"), windowAt(1900, Y0, 160, "n"), windowAt(X3, 300, 140, "e"), windowAt(X3, 1150, 140, "e"), windowAt(900, Y1, 110, "s"), windowAt(1380, Y1, 110, "s"));
  L.push(door(X1, 380, 140, true, -40), door(X2, 820, 160, true, 50), door(1060, Y1, 80, false, -70), door(1220, Y1, 80, false, 250), door(X3, 560, 130, true, 120));

  /* --- Мёртвый сад --- */
  // ограда
  const fence = (x1, y1, x2, y2) => { const n = Math.round(Math.hypot(x2 - x1, y2 - y1) / 40), o = [`<path d="M${x1},${y1} L${x2},${y2}" stroke="#16171a" stroke-width="7"/>`]; for (let i = 0; i <= n; i++) { const x = x1 + (x2 - x1) * i / n, y = y1 + (y2 - y1) * i / n; o.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${i % 5 ? 5 : 10}" fill="#26282c" stroke="#08090a" stroke-width="2"/>`); } return `<g filter="url(#soft)">${o.join("")}</g>`; };
  L.push(fence(2960, 30, 2960, 1960), fence(30, 1960, 980, 1960), fence(1320, 1960, 2960, 1960));
  L.push(`<g filter="url(#soft)"><rect x="960" y="1940" width="40" height="40" fill="url(#manor-stone)" stroke="#111" stroke-width="3"/><rect x="1300" y="1940" width="40" height="40" fill="url(#manor-stone)" stroke="#111" stroke-width="3"/><path d="M1000,1960 l120,-90 M1300,1960 l-60,-120" stroke="#1e2024" stroke-width="9" stroke-linecap="round"/></g>`); // распахнутые ворота
  // кусты-колючки (труднопроходимо)
  L.push(bramble(2470, 250, 120, 70), bramble(2860, 860, 80, 140), bramble(380, 1650, 230, 110), bramble(1700, 1860, 200, 80), bramble(2150, 1540, 120, 70), bramble(780, 1880, 120, 60));
  // кладбище
  const graves = [[2460, 1050, 0, 0], [2560, 1060, 4, 1], [2660, 1040, -3, 0], [2770, 1070, 8, 2], [2470, 1300, -6, 1], [2580, 1320, 0, 0], [2700, 1290, 5, 0], [2820, 1330, -10, 2], [1560, 1560, 0, 1], [1680, 1580, -6, 0], [1800, 1560, 4, 0], [1920, 1600, 12, 2]];
  for (const [x, y, rot, k] of graves) L.push(grave(x, y, rot, k));
  L.push(grave(2860, 1560, 0, 0, true), grave(560, 1560, -4, 1), grave(680, 1590, 6, 0));
  // склепик
  L.push(`<g filter="url(#soft)"><rect x="2620" y="1620" width="260" height="200" fill="url(#manor-wall)" stroke="#0c0d10" stroke-width="6"/><path d="M2620,1720 H2880" stroke="#5a5e66" stroke-width="10"/><path d="M2620,1620 L2750,1720 L2880,1620 M2620,1820 L2750,1720 L2880,1820" stroke="rgba(0,0,0,0.35)" stroke-width="4"/><rect x="2580" y="1690" width="40" height="60" fill="#2a2c30" stroke="#0c0d10" stroke-width="3"/></g>`);
  // мёртвые деревья
  L.push(deadTree(2560, 420, 520, "t1"), deadTree(300, 1780, 420, "t3"), deadTree(2380, 1820, 380, "t4"), deadTree(1640, 1900, 300, "t5"), deadTree(2850, 140, 300, "t6"));
  L.push(`<g filter="url(#soft)">${Array.from({ length: 20 }, () => { const x = rr(2320, 2950), y = rr(60, 1900); return `<path d="M${f1(x)},${f1(y)} l${f1(rr(-30, 30))},${f1(rr(-10, 10))}" stroke="#2a2018" stroke-width="5" stroke-linecap="round"/>`; }).join("")}</g>`);
  // фонарь у входа
  L.push(`<g><rect x="1290" y="1460" width="24" height="24" fill="#222" stroke="#000" stroke-width="2"/><circle cx="1302" cy="1472" r="8" fill="#ffd36b" filter="url(#glow)"/></g>`);
  lights.push([1302, 1472, 240, 0.8]); glows.push(`<circle cx="1302" cy="1472" r="220" fill="url(#manor-candle)"/>`);
  // лунный свет на саду
  glows.push(`<ellipse cx="2650" cy="900" rx="520" ry="700" fill="url(#manor-moon)"/>`);
  lights.push([2650, 800, 520, 0.45], [2600, 1500, 460, 0.4], [1300, 1800, 420, 0.35]);

  /* --- Атмосфера: холодный тон, туман, свет, тьма --- */
  L.push(`<rect width="${W}" height="${H}" fill="rgba(40,60,95,0.16)"/>`);
  L.push(`<g style="mix-blend-mode:screen">${glows.join("")}</g>`);
  const mask = `<mask id="manor-dark" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${lights.map(([x, y, r, s]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="url(#manor-hole)" opacity="${s}"/>`).join("")}</mask>`;
  L.push(`<defs>${mask}</defs><rect width="${W}" height="${H}" fill="#060a14" opacity="0.55" mask="url(#manor-dark)"/>`);
  L.push(`<rect width="${W}" height="${H}" filter="url(#manor-fog)" opacity="0.16"/>`);
  L.push(`<rect x="${X3}" y="0" width="${W - X3}" height="${H}" filter="url(#manor-fog)" opacity="0.25"/><rect x="0" y="${Y1}" width="${X3}" height="${H - Y1}" filter="url(#manor-fog)" opacity="0.25"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="url(#manor-vignette)"/>`);
  return L.join("\n");
}

const ZONES = [
  { id: "library", name: "Библиотека", tags: ["cover", "dark"], poly: [[0, 0], [X1, 0], [X1, YL], [0, YL]], label: [400, 455] },
  { id: "cellar", name: "Погреб", tags: ["dark", "hazard"], poly: [[0, YL], [X1, YL], [X1, Y1], [0, Y1]], label: [430, 1290] },
  { id: "stairs", name: "Парадная лестница", tags: ["elevated", "difficult"], poly: [[X1, 0], [X2, 0], [X2, YS], [X1, YS]], label: [1140, 230], size: 52 },
  { id: "hall", name: "Холл", tags: ["dark"], poly: [[X1, YS], [X2, YS], [X2, Y1], [X1, Y1]], label: [1140, 1210] },
  { id: "dining", name: "Столовая", tags: ["cover"], poly: [[X2, 0], [X3, 0], [X3, Y1], [X2, Y1]], label: [1905, 1320] },
  { id: "garden", name: "Мёртвый сад", tags: ["difficult", "dark"], poly: [[X3, 0], [W, 0], [W, H], [0, H], [0, Y1], [X3, Y1]], label: [2000, 1800] }
];
const LINKS = [
  ["hall", "stairs", "short"], ["hall", "library", "short"], ["hall", "dining", "short"], ["hall", "cellar", "short"],
  ["hall", "garden", "short"], ["dining", "garden", "short"]
];

export default {
  key: "manor", name: "Заброшенная усадьба", folder: "Хоррор", worlds: ["monster", "modern", "weirdwar", "fantasy"],
  bgColor: "#0b0e14", extraDefs: EXTRA, draw, zones: ZONES, links: LINKS,
  style: { tint: "rgba(190,210,240,0.03)", line: "rgba(200,215,235,0.85)", text: "#e6edf7" }
};
