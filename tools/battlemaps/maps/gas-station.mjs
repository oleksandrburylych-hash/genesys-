import { W, H, rng, f1, poly } from "../lib.mjs";

/* ==========================================================================
   Карта: заправка в пустоши (постапокалипсис, вид сверху, пыльный полдень)
   ========================================================================== */
const K = "gas";

/* ---------- геометрия ---------- */
const HWY = { y0: 1330, y1: 1620 };                  // шоссе с запада на восток
const SHOP = { x: 130, y: 120, w: 760, h: 660 };      // магазинчик
const CANOPY = { x: 1180, y: 270, w: 760, h: 520 };   // навес над колонками
const LOT = [[1000, 120], [2020, 120], [2020, 1330], [1000, 1330]]; // асфальт площадки
const TOWER = { x: 2540, y: 360 };
const BARR = [[1560, 1230], [1590, 1400], [1640, 1560], [1680, 1720], [1700, 1890]]; // линия баррикады

/* ---------- общие примитивы ---------- */
function smooth(pts, closed = false) {
  const n = pts.length;
  const at = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return d + (closed ? "Z" : "");
}
function blob(r, cx, cy, rad, n = 10, jit = 0.25) {
  const a0 = r() * Math.PI * 2;
  return Array.from({ length: n }, (_, i) => { const a = a0 + i / n * Math.PI * 2 + (r() - 0.5) * 0.3; const rr = rad * (1 + (r() - 0.5) * 2 * jit); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
}
/** Ломаная → равномерные точки с нормалями. */
function sampleLine(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) { const t = k / n; out.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, nx: -(y2 - y1) / len, ny: (x2 - x1) / len }); }
  }
  return out;
}


/* ---------- предметы ---------- */
const CAR_COLORS = ["#6f8f8a", "#9a4a3a", "#c8b48a", "#d8d2c0", "#b8902a", "#4a5a6a", "#7a6a8a", "#5f6e45"];
/** Ржавая легковушка сверху. Длина L вдоль оси x до поворота. */
function car(r, x, y, rot, opt = {}) {
  const L = opt.L ?? 220, Wd = opt.Wd ?? 104, c = opt.color ?? CAR_COLORS[Math.floor(r() * CAR_COLORS.length)];
  const burnt = opt.burnt ?? r() < 0.25, rust = opt.rust ?? 0.35 + r() * 0.5;
  const o = [`<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})">`];
  o.push(`<g filter="url(#${K}-carShadow)">`);
  // колёса (или диски)
  for (const [wx, wy] of [[-L * 0.32, -Wd / 2], [L * 0.3, -Wd / 2], [-L * 0.32, Wd / 2], [L * 0.3, Wd / 2]]) if (!opt.noWheels || r() < 0.3) o.push(`<rect x="${f1(wx - 22)}" y="${f1(wy - 9)}" width="44" height="18" rx="5" fill="#1b1a18"/>`);
  o.push(`<rect x="${-L / 2}" y="${-Wd / 2}" width="${L}" height="${Wd}" rx="${Wd * 0.3}" fill="${burnt ? "#3a3430" : c}" stroke="#1d1a17" stroke-width="4"/>`);
  o.push(`<rect x="${-L / 2}" y="${-Wd / 2}" width="${L}" height="${Wd}" rx="${Wd * 0.3}" fill="url(#${K}-rust)" opacity="${f1(burnt ? 0.9 : rust)}"/>`);
  // кабина: лобовое и заднее стекло, крыша
  const cab0 = -L * 0.16, cab1 = L * 0.2;
  o.push(`<polygon points="${f1(cab1)},${f1(-Wd * 0.38)} ${f1(cab1 + L * 0.12)},${f1(-Wd * 0.42)} ${f1(cab1 + L * 0.12)},${f1(Wd * 0.42)} ${f1(cab1)},${f1(Wd * 0.38)}" fill="${burnt ? "#141210" : "#2a3a40"}" stroke="#141210" stroke-width="2"/>`);
  o.push(`<polygon points="${f1(cab0)},${f1(-Wd * 0.38)} ${f1(cab0 - L * 0.08)},${f1(-Wd * 0.4)} ${f1(cab0 - L * 0.08)},${f1(Wd * 0.4)} ${f1(cab0)},${f1(Wd * 0.38)}" fill="${burnt ? "#141210" : "#2a3a40"}" stroke="#141210" stroke-width="2"/>`);
  if (opt.noRoof || burnt) {
    o.push(`<rect x="${f1(cab0)}" y="${f1(-Wd * 0.38)}" width="${f1(cab1 - cab0)}" height="${f1(Wd * 0.76)}" fill="#1f1b18"/>`);
    o.push(`<rect x="${f1(cab0 + 8)}" y="${f1(-Wd * 0.32)}" width="${f1((cab1 - cab0) * 0.35)}" height="${f1(Wd * 0.26)}" rx="5" fill="#4a3a2a"/><rect x="${f1(cab0 + 8)}" y="${f1(Wd * 0.06)}" width="${f1((cab1 - cab0) * 0.35)}" height="${f1(Wd * 0.26)}" rx="5" fill="#4a3a2a"/>`);
    o.push(`<circle cx="${f1(cab1 - 16)}" cy="${f1(-Wd * 0.18)}" r="13" fill="none" stroke="#3a3530" stroke-width="5"/>`);
  } else {
    o.push(`<rect x="${f1(cab0)}" y="${f1(-Wd * 0.38)}" width="${f1(cab1 - cab0)}" height="${f1(Wd * 0.76)}" rx="10" fill="${c}" stroke="rgba(0,0,0,0.35)" stroke-width="3"/>`);
    o.push(`<rect x="${f1(cab0)}" y="${f1(-Wd * 0.38)}" width="${f1(cab1 - cab0)}" height="${f1(Wd * 0.76)}" rx="10" fill="url(#${K}-rust)" opacity="${f1(rust * 0.8)}"/>`);
    o.push(`<rect x="${f1(cab0 + 6)}" y="${f1(-Wd * 0.3)}" width="${f1((cab1 - cab0) * 0.5)}" height="${f1(Wd * 0.12)}" fill="rgba(255,255,255,0.15)"/>`);
  }
  // капот и багажник
  o.push(`<path d="M${f1(cab1 + L * 0.14)},${f1(-Wd * 0.3)} Q${f1(L * 0.48)},0 ${f1(cab1 + L * 0.14)},${f1(Wd * 0.3)} M${f1(-L * 0.36)},${f1(-Wd * 0.34)} V${f1(Wd * 0.34)}" stroke="rgba(0,0,0,0.35)" stroke-width="3" fill="none"/>`);
  o.push(`<rect x="${f1(L / 2 - 10)}" y="${f1(-Wd * 0.4)}" width="8" height="16" fill="#e8e0b0" opacity="0.7"/><rect x="${f1(L / 2 - 10)}" y="${f1(Wd * 0.4 - 16)}" width="8" height="16" fill="#e8e0b0" opacity="0.7"/>`);
  if (opt.openHood) o.push(`<rect x="${f1(cab1 + L * 0.13)}" y="${f1(-Wd * 0.46)}" width="${f1(L * 0.2)}" height="${f1(Wd * 0.92)}" rx="6" fill="${c}" stroke="#1d1a17" stroke-width="3" transform="rotate(-12 ${f1(cab1 + L * 0.13)} 0)"/>`);
  o.push(`</g>`);
  // песок намело с наветренной стороны
  if (opt.sand) o.push(`<ellipse cx="${f1(-L * 0.1)}" cy="${f1(-Wd * 0.45)}" rx="${f1(L * 0.45)}" ry="${f1(Wd * 0.28)}" fill="#d2b07a" opacity="0.85" filter="url(#${K}-blur6)"/>`);
  o.push(`</g>`);
  return o.join("");
}
function tire(x, y, R = 36) {
  return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${R}" fill="#1f1d1b" stroke="#0c0b0a" stroke-width="3"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${R * 0.82}" fill="none" stroke="#3a3632" stroke-width="${R * 0.18}" stroke-dasharray="5 4"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${R * 0.48}" fill="#7a6248"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${R * 0.48}" fill="none" stroke="#000" stroke-width="3" opacity="0.6"/>`;
}
function tireStack(x, y, n = 3) {
  let o = "";
  for (let i = n - 1; i >= 0; i--) o += tire(x + i * 3, y + i * 4, 38);
  return `<g filter="url(#soft)">${o}</g>`;
}
function tirePile(r, x, y, n) {
  let o = "";
  for (let i = 0; i < n; i++) { const a = r() * 6.28, d = r() * 70; o += tire(x + Math.cos(a) * d, y + Math.sin(a) * d, 30 + r() * 10); }
  return `<g filter="url(#soft)">${o}</g>`;
}
const DRUM = ["#9a4a22", "#7a3a1c", "#4a6a7a", "#b8902a", "#5a6a3a"];
function drum(r, x, y, R = 34, c) {
  c = c ?? DRUM[Math.floor(r() * DRUM.length)];
  return `<g filter="url(#soft)"><circle cx="${f1(x)}" cy="${f1(y)}" r="${R}" fill="${c}" stroke="#1d1a17" stroke-width="4"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${R}" fill="url(#${K}-rust)" opacity="0.6"/>
    <circle cx="${f1(x)}" cy="${f1(y)}" r="${R * 0.84}" fill="none" stroke="rgba(0,0,0,0.45)" stroke-width="4"/><circle cx="${f1(x - R * 0.42)}" cy="${f1(y - R * 0.2)}" r="${R * 0.13}" fill="#1d1a17"/><circle cx="${f1(x + R * 0.45)}" cy="${f1(y + R * 0.1)}" r="${R * 0.09}" fill="#1d1a17"/></g>`;
}
function fireDrum(x, y) {
  return `<circle cx="${x}" cy="${y}" r="210" fill="url(#fireglow)" opacity="0.7"/><g filter="url(#soft)"><circle cx="${x}" cy="${y}" r="36" fill="#3a2a20" stroke="#120d0a" stroke-width="5"/><circle cx="${x}" cy="${y}" r="28" fill="#ff8a2a" filter="url(#glow)"/><circle cx="${x}" cy="${y}" r="15" fill="#ffd56a"/></g>`;
}
function sandbags(x1, y1, x2, y2, rows = 2) {
  const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1) * 57.3, n = Math.floor(len / 56);
  let o = "";
  for (let j = 0; j < rows; j++) for (let i = 0; i < n; i++) o += `<rect x="${f1(i * 56 + (j % 2) * 28)}" y="${f1(j * 36 - rows * 18)}" width="54" height="34" rx="14" fill="${(i + j) % 3 ? "#a8915e" : "#9a8450"}" stroke="#4a3e24" stroke-width="3"/>`;
  return `<g filter="url(#soft)" transform="translate(${f1(x1)} ${f1(y1)}) rotate(${f1(ang)})">${o}</g>`;
}
function sheet(x, y, w, h, rot, c = "#8a8070") {
  return `<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="${c}" stroke="#2a2622" stroke-width="3"/><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="url(#${K}-corr)"/><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="url(#${K}-rust)" opacity="0.6"/></g>`;
}
function crushed(r, x, y, rot) {
  // спрессованные кузова штабелем
  let o = "";
  for (let i = 0; i < 3; i++) { const c = CAR_COLORS[Math.floor(r() * CAR_COLORS.length)]; o += `<rect x="${-100 + i * 5}" y="${-40 + i * 6}" width="200" height="70" rx="6" fill="${c}" stroke="#1d1a17" stroke-width="4"/><rect x="${-100 + i * 5}" y="${-40 + i * 6}" width="200" height="70" rx="6" fill="url(#${K}-rust)" opacity="0.8"/><path d="M${-90 + i * 5},${-20 + i * 6} h180 M${-90 + i * 5},${5 + i * 6} h180" stroke="rgba(0,0,0,0.35)" stroke-width="3"/>`; }
  return `<g filter="url(#${K}-carShadow)" transform="translate(${x} ${y}) rotate(${rot})">${o}</g>`;
}
function cracks(r, x0, y0, w, h, n, col = "rgba(20,18,16,0.75)") {
  let d = "";
  for (let i = 0; i < n; i++) {
    let x = x0 + r() * w, y = y0 + r() * h, a = r() * 6.28;
    d += `M${f1(x)},${f1(y)} `;
    const segs = 4 + Math.floor(r() * 8);
    for (let k = 0; k < segs; k++) { a += (r() - 0.5) * 1.4; const l = 14 + r() * 34; x += Math.cos(a) * l; y += Math.sin(a) * l; d += `L${f1(x)},${f1(y)} `; if (r() < 0.25) d += `M${f1(x)},${f1(y)} l${f1((r() - 0.5) * 50)},${f1((r() - 0.5) * 50)} M${f1(x)},${f1(y)} `; }
  }
  return `<path d="${d}" stroke="${col}" stroke-width="3" fill="none" stroke-linejoin="round"/><path d="${d}" stroke="rgba(200,170,120,0.25)" stroke-width="1.5" fill="none" transform="translate(2 2)"/>`;
}
function pump(x, y, rot) {
  return `<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})"><rect x="${x - 40}" y="${y - 30}" width="80" height="60" rx="6" fill="#b8392a" stroke="#1d1a17" stroke-width="4"/><rect x="${x - 40}" y="${y - 30}" width="80" height="60" rx="6" fill="url(#${K}-rust)" opacity="0.55"/>
    <rect x="${x - 26}" y="${y - 20}" width="52" height="18" fill="#2a2a26" stroke="#111" stroke-width="2"/><rect x="${x - 26}" y="${y + 4}" width="52" height="14" fill="#d8d0b8" opacity="0.8"/>
    <path d="M${x + 40},${y + 10} q40,10 30,50 q-6,20 -30,26" stroke="#141414" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="${x - 2}" y="${y + 80}" width="26" height="12" rx="4" fill="#3a3a3a" transform="rotate(25 ${x + 10} ${y + 86})"/></g>`;
}
function bollard(x, y) { return `<circle cx="${x}" cy="${y}" r="13" fill="#d8b02a" stroke="#1d1a17" stroke-width="3" filter="url(#soft)"/><circle cx="${x}" cy="${y}" r="5" fill="#1d1a17"/>`; }
function jerrycan(x, y, rot, c = "#6a7a3a") {
  return `<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})"><rect x="${x - 22}" y="${y - 30}" width="44" height="60" rx="5" fill="${c}" stroke="#1d1a17" stroke-width="3"/><path d="M${x - 22},${y - 30} L${x + 22},${y + 30} M${x + 22},${y - 30} L${x - 22},${y + 30}" stroke="rgba(0,0,0,0.3)" stroke-width="3"/><rect x="${x + 6}" y="${y - 36}" width="12" height="10" fill="#2a2a2a"/></g>`;
}
function oilSpill(r, x, y, R) {
  const pts = blob(r, x, y, R, 10, 0.35);
  return `<path d="${smooth(pts, true)}" fill="#1b1714" opacity="0.8"/><path d="${smooth(pts.map(([a, b]) => [x + (a - x) * 0.7, y + (b - y) * 0.7]), true)}" fill="url(#${K}-sheen)" opacity="0.55"/>`;
}
function shelfUnit(r, x, y, w, h) {
  const o = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#6a6a66" stroke="#1d1d1b" stroke-width="4"/><path d="M${x + w / 2},${y + 4} V${y + h - 4}" stroke="#3a3a38" stroke-width="4"/>`];
  const cols = ["#c0392b", "#d8b02a", "#2a6a9a", "#e8e0d0", "#3a7a3a", "#a05a2a"];
  for (let yy = y + 10; yy < y + h - 14; yy += 22) for (const side of [0, 1]) { if (r() < 0.45) continue; const xx = x + 6 + side * (w / 2); o.push(`<rect x="${f1(xx)}" y="${f1(yy)}" width="${f1(w / 2 - 12)}" height="16" rx="3" fill="${cols[Math.floor(r() * cols.length)]}" stroke="#1d1a17" stroke-width="1.5"/>`); }
  return `<g filter="url(#soft)">${o.join("")}</g>`;
}
function litter(r, x0, y0, w, h, n) {
  let o = "";
  const cols = ["#c0392b", "#d8b02a", "#2a6a9a", "#e8e0d0", "#3a7a3a", "#8a8a88"];
  for (let i = 0; i < n; i++) { const x = x0 + r() * w, y = y0 + r() * h; o += r() < 0.6 ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(5 + r() * 4)}" fill="${cols[Math.floor(r() * 6)]}" stroke="#1d1a17" stroke-width="1.5"/>` : `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(12 + r() * 14)}" height="${f1(8 + r() * 8)}" fill="${cols[Math.floor(r() * 6)]}" stroke="#1d1a17" stroke-width="1.5" transform="rotate(${f1(r() * 90)} ${f1(x)} ${f1(y)})"/>`; }
  return o;
}
function glass(r, x0, y0, w, h, n) {
  let o = "";
  for (let i = 0; i < n; i++) { const x = x0 + r() * w, y = y0 + r() * h, s = 4 + r() * 9; o += `<polygon points="${f1(x)},${f1(y)} ${f1(x + s)},${f1(y + s * 0.3)} ${f1(x + s * 0.3)},${f1(y + s)}" fill="rgba(200,235,240,0.7)" stroke="rgba(255,255,255,0.8)" stroke-width="1"/>`; }
  return o;
}
function shrub(r, x, y, R) {
  let d = "";
  for (let i = 0; i < 14; i++) { const a = r() * 6.28, l = R * (0.5 + r() * 0.5); d += `M${f1(x)},${f1(y)} q${f1(Math.cos(a + 0.5) * l * 0.5)},${f1(Math.sin(a + 0.5) * l * 0.5)} ${f1(Math.cos(a) * l)},${f1(Math.sin(a) * l)} `; }
  return `<path d="${d}" stroke="rgba(0,0,0,0.25)" stroke-width="4" fill="none" transform="translate(8 10)"/><path d="${d}" stroke="#5a4a30" stroke-width="3" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#7a7a42" stroke-width="2" fill="none" stroke-dasharray="3 9"/>`;
}
/** Гребень бархана: светлый наветренный склон, резкая кромка, тень подветренного склона. */
function duneRidge(r, pts) {
  const d = smooth(pts);
  let rip = "";
  for (let k = 1; k <= 5; k++) rip += `<path d="${smooth(pts.map(([x, y], i) => [x - k * 34 + Math.sin(i + k) * 6, y - k * 30]))}" stroke="rgba(130,85,40,${f1(0.42 - k * 0.05)})" stroke-width="3" fill="none"/>`;
  return `<path d="${d}" transform="translate(-40 -46)" stroke="#f2d49c" stroke-width="110" fill="none" opacity="0.55" filter="url(#${K}-blur12)" stroke-linecap="round"/>
    <path d="${d}" transform="translate(30 40)" stroke="#7a4a22" stroke-width="80" fill="none" opacity="0.45" filter="url(#${K}-blur12)" stroke-linecap="round"/>
    <path d="${d}" transform="translate(12 16)" stroke="#a87442" stroke-width="30" fill="none" opacity="0.55" filter="url(#${K}-blur6)" stroke-linecap="round"/>
    ${rip}<path d="${d}" stroke="#fae4b4" stroke-width="6" fill="none" stroke-linecap="round"/>`;
}
function skull(x, y, rot) {
  return `<g transform="rotate(${rot} ${x} ${y})" filter="url(#soft)"><ellipse cx="${x}" cy="${y}" rx="26" ry="18" fill="#e8dfc8" stroke="#6a5e48" stroke-width="2"/><path d="M${x - 22},${y - 10} q-40,-30 -50,-6 M${x - 22},${y + 10} q-40,30 -50,6" stroke="#e8dfc8" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="${x + 8}" cy="${y - 7}" r="5" fill="#3a3020"/><circle cx="${x + 8}" cy="${y + 7}" r="5" fill="#3a3020"/></g>`;
}

/* ==========================================================================
   Рисунок
   ========================================================================== */
function draw() {
  const r = rng("gas-station");
  const L = [];
  const S = SHOP, sx2 = S.x + S.w, sy2 = S.y + S.h;

  // Песок и пыль по всей карте.
  L.push(`<rect width="${W}" height="${H}" fill="#c49a62"/>`);
  L.push(`<rect width="${W}" height="${H}" filter="url(#${K}-sandD)"/>`);
  L.push(`<rect width="${W}" height="${H}" filter="url(#${K}-sandL)"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="#000" filter="url(#grain)" opacity="0.35"/>`);
  // Рябь песка (рисуется везде, асфальт перекроет).
  let rip = "";
  for (let i = 0; i < 260; i++) {
    const x = r() * W, y = r() * H, l = 60 + r() * 120;
    rip += `M${f1(x)},${f1(y)} q${f1(l / 2)},${f1(-10 - r() * 8)} ${f1(l)},${f1(r() * 10 - 5)} `;
  }
  L.push(`<path d="${rip}" stroke="rgba(120,80,40,0.35)" stroke-width="3" fill="none"/><path d="${rip}" transform="translate(0 5)" stroke="rgba(255,230,180,0.3)" stroke-width="2" fill="none"/>`);

  /* --- Шоссе --- */
  L.push(`<rect x="-20" y="${HWY.y0}" width="${W + 40}" height="${HWY.y1 - HWY.y0}" fill="#56504a"/>`);
  L.push(`<rect x="-20" y="${HWY.y0}" width="${W + 40}" height="${HWY.y1 - HWY.y0}" fill="#000" filter="url(#${K}-asphalt)"/>`);
  L.push(`<path d="M0,${HWY.y0 + 18} H${W} M0,${HWY.y1 - 18} H${W}" stroke="#d8d0b8" stroke-width="8" opacity="0.45" stroke-dasharray="300 40 120 60"/>`);
  L.push(`<path d="M0,${(HWY.y0 + HWY.y1) / 2} H${W}" stroke="#c8a030" stroke-width="10" stroke-dasharray="90 70" opacity="0.6"/>`);
  L.push(cracks(r, 0, HWY.y0, W, HWY.y1 - HWY.y0, 55));
  for (let i = 0; i < 9; i++) { const x = r() * W, y = HWY.y0 + 30 + r() * 230; L.push(`<path d="${smooth(blob(r, x, y, 26 + r() * 30, 8, 0.35), true)}" fill="#2a2622" stroke="#6a6258" stroke-width="4"/><path d="${smooth(blob(r, x + 4, y + 4, 14 + r() * 10, 7, 0.3), true)}" fill="#a88a5c" opacity="0.8"/>`); }
  // Обочины: рваный край асфальта
  for (const yy of [HWY.y0, HWY.y1]) { let d = `M-20,${yy}`; for (let x = 0; x <= W + 20; x += 30) d += ` L${x},${f1(yy + (r() - 0.5) * 18)}`; L.push(`<path d="${d}" stroke="#a4804e" stroke-width="16" fill="none" stroke-linejoin="round"/>`); }

  /* --- Площадка заправки (асфальт) --- */
  L.push(`<polygon points="${poly(LOT)}" fill="#615a52"/>`);
  L.push(`<polygon points="${poly(LOT)}" fill="#000" filter="url(#${K}-asphalt)"/>`);
  L.push(cracks(r, 1000, 120, 1020, 1210, 70));
  // плиты вокруг навеса
  let slabs = "";
  for (let x = CANOPY.x - 60; x < CANOPY.x + CANOPY.w + 60; x += 120) slabs += `M${x},${CANOPY.y - 60} V${CANOPY.y + CANOPY.h + 60} `;
  for (let y = CANOPY.y - 60; y <= CANOPY.y + CANOPY.h + 60; y += 120) slabs += `M${CANOPY.x - 60},${y} H${CANOPY.x + CANOPY.w + 60} `;
  L.push(`<rect x="${CANOPY.x - 60}" y="${CANOPY.y - 60}" width="${CANOPY.w + 120}" height="${CANOPY.h + 120}" fill="#8a8274" opacity="0.6"/><path d="${slabs}" stroke="#3a3530" stroke-width="4" opacity="0.6"/>`);
  L.push(cracks(r, CANOPY.x - 60, CANOPY.y - 60, CANOPY.w + 120, CANOPY.h + 120, 26));
  // разметка парковки у магазина
  for (let i = 0; i < 4; i++) L.push(`<path d="M${1060},${880 + i * 110} h170" stroke="#d8d0b8" stroke-width="7" opacity="0.4"/>`);
  // наметённый песок по краям площадки
  for (const [x, y, R] of [[1010, 300, 90], [1030, 1100, 120], [2000, 200, 140], [2010, 700, 110], [1500, 140, 120], [2000, 1200, 160], [1700, 1300, 100]]) L.push(`<path d="${smooth(blob(r, x, y, R, 10, 0.3), true)}" fill="#cfa86e" opacity="0.9" filter="url(#${K}-blur6)"/>`);
  // пятна топлива
  L.push(oilSpill(r, 1400, 600, 70), oilSpill(r, 1720, 470, 55), oilSpill(r, 1560, 900, 90), oilSpill(r, 1250, 1000, 45));

  // Островки с колонками
  for (const iy of [CANOPY.y + 150, CANOPY.y + CANOPY.h - 150]) {
    L.push(`<rect x="${CANOPY.x + 120}" y="${iy - 45}" width="${CANOPY.w - 240}" height="90" rx="40" fill="#a49c8c" stroke="#3a3530" stroke-width="5" filter="url(#soft)"/><rect x="${CANOPY.x + 130}" y="${iy - 35}" width="${CANOPY.w - 260}" height="70" rx="32" fill="url(#${K}-hazard)" opacity="0.25"/>`);
    for (const px of [CANOPY.x + 260, CANOPY.x + CANOPY.w - 260]) L.push(pump(px, iy, 0));
    L.push(bollard(CANOPY.x + 150, iy), bollard(CANOPY.x + CANOPY.w - 150, iy));
  }
  // люки подземных цистерн (один открыт)
  L.push(`<g filter="url(#soft)"><circle cx="1290" cy="1080" r="38" fill="#4a4540" stroke="#1d1a17" stroke-width="4"/><path d="M1260,1080 h60 M1290,1050 v60" stroke="#2a2622" stroke-width="4"/><circle cx="1400" cy="1090" r="38" fill="#0c0a08" stroke="#1d1a17" stroke-width="5"/><circle cx="1440" cy="1050" r="38" fill="#5a544c" stroke="#1d1a17" stroke-width="4" transform="rotate(20 1440 1050)"/></g>`);
  // брошенная машина у колонки и канистры
  L.push(car(r, CANOPY.x + CANOPY.w / 2, CANOPY.y + 290, 4, { color: "#6f8f8a", rust: 0.5, openHood: true }));
  L.push(jerrycan(CANOPY.x + 330, CANOPY.y + 240, 15, "#9a2a20"), jerrycan(CANOPY.x + 380, CANOPY.y + 250, -20), jerrycan(CANOPY.x + 470, CANOPY.y + 420, 70, "#9a2a20"));
  L.push(drum(r, 1880, 1000, 34, "#b8902a"), drum(r, 1940, 1050, 32), drum(r, 1870, 1080, 30, "#9a4a22"));
  L.push(car(r, 1750, 1150, -78, { burnt: true, noWheels: true }));

  // Навес: опоры, балки, уцелевшие листы кровли, фриз по краю.
  const C = CANOPY, cx2 = C.x + C.w, cy2 = C.y + C.h;
  L.push(`<rect x="${C.x + 30}" y="${C.y + 40}" width="${C.w}" height="${C.h}" fill="#000" opacity="0.18" filter="url(#${K}-blur12)"/>`);
  for (const px of [C.x + 40, C.x + C.w / 2, cx2 - 40]) for (const py of [C.y + 40, cy2 - 40]) L.push(`<rect x="${px - 22}" y="${py - 22}" width="44" height="44" fill="#9a958a" stroke="#2a2622" stroke-width="4" filter="url(#soft)"/>`);
  let beams = "";
  for (let x = C.x + 40; x <= cx2 - 30; x += (C.w - 80) / 6) beams += `M${f1(x)},${C.y} V${cy2} `;
  beams += `M${C.x},${C.y + 40} H${cx2} M${C.x},${cy2 - 40} H${cx2} M${C.x},${C.y + C.h / 2} H${cx2}`;
  L.push(`<g filter="url(#soft)"><path d="${beams}" stroke="#2a2420" stroke-width="18"/><path d="${beams}" stroke="#7a6a5a" stroke-width="10"/><path d="${beams}" stroke="url(#${K}-rustStroke)" stroke-width="10" opacity="0.6"/></g>`);
  // уцелевшие листы кровли (над пустыми участками)
  L.push(sheet(C.x + 110, C.y + 260, 150, 380, 0, "#9a948a"), sheet(cx2 - 110, C.y + 230, 150, 300, 2, "#a29a8c"), sheet(cx2 - 300, cy2 - 60, 220, 110, -4, "#9a948a"));
  L.push(sheet(1110, 860, 120, 90, 33), sheet(1960, 860, 140, 80, -60));
  // фриз навеса: выцветшие красно-белые полосы
  L.push(`<g filter="url(#soft)"><rect x="${C.x - 14}" y="${C.y - 14}" width="${C.w + 28}" height="${C.h + 28}" fill="none" stroke="#2a2420" stroke-width="40"/><rect x="${C.x - 14}" y="${C.y - 14}" width="${C.w + 28}" height="${C.h + 28}" fill="none" stroke="#d8d0c0" stroke-width="30"/>
    <rect x="${C.x - 14}" y="${C.y - 14}" width="${C.w + 28}" height="${C.h + 28}" fill="none" stroke="#a83a2a" stroke-width="30" stroke-dasharray="80 50"/><rect x="${C.x - 14}" y="${C.y - 14}" width="${C.w + 28}" height="${C.h + 28}" fill="none" stroke="url(#${K}-rustStroke)" stroke-width="30" opacity="0.55"/></g>`);
  // провал фриза (обломок упал)
  L.push(`<rect x="${C.x + 470}" y="${cy2 - 10}" width="140" height="48" fill="#615a52"/><g filter="url(#soft)" transform="rotate(14 ${C.x + 560} ${cy2 + 70})"><rect x="${C.x + 480}" y="${cy2 + 52}" width="170" height="30" fill="#d8d0c0" stroke="#2a2420" stroke-width="5"/><rect x="${C.x + 480}" y="${cy2 + 52}" width="60" height="30" fill="#a83a2a"/></g>`);
  // стела с ценами
  L.push(`<g filter="url(#soft)"><rect x="1080" y="1180" width="40" height="40" fill="#5a544c" stroke="#1d1a17" stroke-width="3"/><rect x="1020" y="1150" width="160" height="40" fill="#d8d0c0" stroke="#1d1a17" stroke-width="4"/><rect x="1020" y="1150" width="160" height="40" fill="url(#${K}-rust)" opacity="0.5"/><rect x="1030" y="1158" width="60" height="24" fill="#a83a2a"/></g>`);

  /* --- Магазинчик (интерьер, крыши нет) --- */
  L.push(`<rect x="${S.x}" y="${S.y}" width="${S.w}" height="${S.h}" fill="url(#${K}-lino)"/>`);
  L.push(`<rect x="${S.x}" y="${S.y}" width="${S.w}" height="${S.h}" fill="#000" filter="url(#${K}-dirt)" opacity="0.9"/>`);
  const back = S.x + 230; // подсобка у западной стены
  L.push(`<rect x="${S.x}" y="${S.y}" width="${back - S.x}" height="${S.h}" fill="url(#${K}-concrete)"/><rect x="${S.x}" y="${S.y}" width="${back - S.x}" height="${S.h}" fill="#000" filter="url(#${K}-dirt)" opacity="0.7"/>`);
  // песок нанесло через выбитую дверь
  L.push(`<path d="${smooth([[sx2 + 30, S.y + 380], [sx2 - 90, S.y + 400], [sx2 - 180, S.y + 470], [sx2 - 120, S.y + 560], [sx2 + 30, S.y + 560]], true)}" fill="#cfa86e" opacity="0.9" filter="url(#${K}-blur12)"/>`);
  // холодильники вдоль северной стены
  for (let i = 0; i < 4; i++) L.push(`<g filter="url(#soft)"><rect x="${back + 40 + i * 120}" y="${S.y + 24}" width="110" height="70" fill="#cfd4d0" stroke="#1d1d1b" stroke-width="4"/><rect x="${back + 48 + i * 120}" y="${S.y + 60}" width="94" height="28" fill="#7aa0a8" opacity="${i === 2 ? 0.2 : 0.7}"/>${litter(r, back + 48 + i * 120, S.y + 32, 90, 24, 4)}</g>`);
  // стеллажи (один опрокинут)
  L.push(shelfUnit(r, back + 70, S.y + 170, 70, 300), shelfUnit(r, back + 230, S.y + 170, 70, 300));
  L.push(`<g transform="rotate(-28 ${back + 420} ${S.y + 300})">${shelfUnit(r, back + 385, S.y + 160, 70, 290)}</g>`);
  // прилавок с кассой у двери
  L.push(`<g filter="url(#soft)"><path d="M${sx2 - 200},${S.y + 160} H${sx2 - 80} V${S.y + 330}" stroke="#2a2420" stroke-width="64" fill="none"/><path d="M${sx2 - 200},${S.y + 160} H${sx2 - 80} V${S.y + 330}" stroke="#8a6a4a" stroke-width="54" fill="none"/><rect x="${sx2 - 108}" y="${S.y + 176}" width="56" height="40" fill="#3a3a38" stroke="#111" stroke-width="3"/><rect x="${sx2 - 100}" y="${S.y + 182}" width="22" height="14" fill="#5a8a6a"/></g>`);
  L.push(litter(r, back + 20, S.y + 120, S.w - 250, S.h - 160, 70), glass(r, sx2 - 80, S.y + 380, 70, 200, 40), glass(r, S.x + 300, sy2 - 60, 300, 50, 25));
  // подсобка: стол, ящики, матрас, бочка с водой
  L.push(`<g filter="url(#soft)"><rect x="${S.x + 30}" y="${S.y + 40}" width="150" height="70" fill="#7a6a5a" stroke="#1d1a17" stroke-width="4"/><rect x="${S.x + 40}" y="${S.y + 380}" width="110" height="200" rx="10" fill="#8a7a6a" stroke="#1d1a17" stroke-width="4"/><rect x="${S.x + 40}" y="${S.y + 380}" width="110" height="50" rx="10" fill="#a89a88"/></g>`);
  L.push(drum(r, S.x + 70, S.y + 220, 32, "#4a6a7a"), drum(r, S.x + 150, S.y + 250, 30), jerrycan(S.x + 160, S.y + 160, 10));
  // стены (бетонные блоки) с дверью и выбитыми витринами
  const wall = (pts) => `<g filter="url(#wallshadow)"><path d="${pts}" stroke="#1d1a17" stroke-width="44" stroke-linecap="square" fill="none"/><path d="${pts}" stroke="url(#${K}-block)" stroke-width="34" stroke-linecap="square" fill="none"/></g>`;
  L.push(wall(`M${S.x},${S.y} H${sx2} V${S.y + 380} M${sx2},${S.y + 560} V${sy2} H${S.x} V${S.y} M${back},${S.y} V${S.y + 280} M${back},${S.y + 400} V${sy2}`));
  // витрины на южной и восточной стене (рамы и осколки)
  for (const [x1, y1, x2, y2] of [[S.x + 280, sy2, S.x + 420, sy2], [S.x + 480, sy2, S.x + 620, sy2], [sx2, S.y + 60, sx2, S.y + 140]]) L.push(`<path d="M${x1},${y1} L${x2},${y2}" stroke="#2a2622" stroke-width="20"/><path d="M${x1},${y1} L${x2},${y2}" stroke="#9ac4cc" stroke-width="8" stroke-dasharray="20 14 6 30"/>`);
  L.push(`<g filter="url(#soft)" transform="rotate(64 ${sx2 + 50} ${S.y + 420})"><rect x="${sx2 + 10}" y="${S.y + 405}" width="120" height="26" fill="#7a7a74" stroke="#1d1a17" stroke-width="3"/></g>`);
  // обрушенный угол крыши: балки и листы в юго-западном углу
  L.push(sheet(S.x + 150, sy2 - 60, 170, 110, 18, "#8a8478"), sheet(S.x + 170, sy2 - 190, 140, 90, -25, "#7a756a"));
  L.push(`<path d="M${S.x + 40},${sy2 - 200} L${S.x + 330},${sy2 - 10}" stroke="#4a3a2a" stroke-width="18" filter="url(#soft)"/>`);
  // вывеска упала перед магазином
  L.push(`<g filter="url(#soft)" transform="rotate(-6 ${S.x + 420} ${sy2 + 100})"><rect x="${S.x + 250}" y="${sy2 + 70}" width="340" height="66" fill="#d8d0c0" stroke="#1d1a17" stroke-width="5"/><rect x="${S.x + 250}" y="${sy2 + 70}" width="340" height="66" fill="url(#${K}-rust)" opacity="0.6"/><rect x="${S.x + 262}" y="${sy2 + 82}" width="120" height="42" fill="#a83a2a"/></g>`);

  /* --- Водонапорная башня --- */
  const T = TOWER, TR = 190;
  // бетонная площадка и тень башни
  L.push(`<rect x="${T.x - 300}" y="${T.y - 300}" width="600" height="600" rx="30" fill="#9a9080" opacity="0.55"/>`);
  L.push(`<g opacity="0.45" filter="url(#${K}-blur12)" fill="#2a1a0a"><ellipse cx="${T.x + 220}" cy="${T.y + 300}" rx="${TR + 10}" ry="${TR - 10}"/>${[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => `<path d="M${T.x + a * 120 + 220},${T.y + b * 120 + 300} L${T.x + a * 270},${T.y + b * 270}" stroke="#2a1a0a" stroke-width="22"/>`).join("")}</g>`);
  // опоры с раскосами (уходят вниз к земле — видны за баком)
  const feet = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [T.x + a * 270, T.y + b * 270]);
  let legs = "";
  for (const [fx, fy] of feet) legs += `M${f1(T.x + (fx - T.x) * 0.5)},${f1(T.y + (fy - T.y) * 0.5)} L${fx},${fy} `;
  for (let i = 0; i < 4; i++) { const a = feet[i], b = feet[[1, 3, 0, 2][i]]; legs += `M${a[0]},${a[1]} L${f1((a[0] + b[0]) / 2 + (T.x - (a[0] + b[0]) / 2) * 0.15)},${f1((a[1] + b[1]) / 2 + (T.y - (a[1] + b[1]) / 2) * 0.15)} L${b[0]},${b[1]} `; }
  L.push(`<g filter="url(#soft)"><path d="${legs}" stroke="#2a1a10" stroke-width="22" fill="none"/><path d="${legs}" stroke="#7a4a2a" stroke-width="13" fill="none"/>${feet.map(([x, y]) => `<rect x="${x - 34}" y="${y - 34}" width="68" height="68" fill="#a49c8c" stroke="#2a2622" stroke-width="4"/>`).join("")}</g>`);
  // лестница к земле
  const ld = [T.x - 30, T.y + TR + 30, T.x - 30, T.y + 330];
  L.push(`<g filter="url(#soft)"><path d="M${ld[0] - 14},${ld[1]} V${ld[3]} M${ld[0] + 14},${ld[1]} V${ld[3]}" stroke="#3a2a1a" stroke-width="6"/>${Array.from({ length: 8 }, (_, i) => `<path d="M${ld[0] - 14},${ld[1] + i * 15} h28" stroke="#5a4a3a" stroke-width="4"/>`).join("")}</g>`);
  // бак: галерея с перилами, коническая крыша из сегментов
  L.push(`<g filter="url(#${K}-towerShadow)"><circle cx="${T.x}" cy="${T.y}" r="${TR + 36}" fill="#5a4a3a" stroke="#1d1a17" stroke-width="5"/><circle cx="${T.x}" cy="${T.y}" r="${TR + 36}" fill="url(#${K}-grate)"/>
    <circle cx="${T.x}" cy="${T.y}" r="${TR + 30}" fill="none" stroke="#2a1a10" stroke-width="5" stroke-dasharray="4 26"/>
    <circle cx="${T.x}" cy="${T.y}" r="${TR}" fill="url(#${K}-tank)" stroke="#1d1a17" stroke-width="6"/>
    ${Array.from({ length: 16 }, (_, i) => { const a = i / 16 * 6.283; return `<path d="M${T.x},${T.y} L${f1(T.x + Math.cos(a) * TR)},${f1(T.y + Math.sin(a) * TR)}" stroke="rgba(30,15,5,0.55)" stroke-width="4"/>`; }).join("")}
    <circle cx="${T.x}" cy="${T.y}" r="${TR}" fill="url(#${K}-rust)" opacity="0.65"/>
    <circle cx="${T.x}" cy="${T.y}" r="${TR * 0.62}" fill="none" stroke="rgba(30,15,5,0.4)" stroke-width="3"/>
    <circle cx="${T.x}" cy="${T.y}" r="34" fill="#6a5a4a" stroke="#1d1a17" stroke-width="5"/><circle cx="${T.x}" cy="${T.y}" r="16" fill="#2a2420"/>
    <rect x="${T.x + 60}" y="${T.y - 110}" width="56" height="44" fill="#3a2a1a" stroke="#111" stroke-width="3" transform="rotate(30 ${T.x + 88} ${T.y - 88})"/></g>`);
  // насосная будка, трубы, бочки, корыто
  L.push(`<g filter="url(#soft)"><rect x="2140" y="560" width="180" height="150" fill="#8a7a66" stroke="#1d1a17" stroke-width="5"/><rect x="2140" y="560" width="180" height="150" fill="url(#${K}-corr)"/><rect x="2140" y="560" width="180" height="150" fill="url(#${K}-rust)" opacity="0.7"/></g>`);
  L.push(`<g filter="url(#soft)"><path d="M2320,640 H${T.x - 80} V${T.y + 270} M2140,640 H2040" stroke="#2a1a10" stroke-width="22" fill="none"/><path d="M2320,640 H${T.x - 80} V${T.y + 270} M2140,640 H2040" stroke="#7a5a3a" stroke-width="13" fill="none"/></g>`);
  L.push(drum(r, 2900, 720, 34, "#4a6a7a"), drum(r, 2950, 780, 32), drum(r, 2850, 790, 30, "#9a4a22"), tirePile(r, 2200, 160, 4));
  L.push(`<g filter="url(#soft)"><rect x="2760" y="80" width="200" height="60" rx="8" fill="#6a6a62" stroke="#1d1a17" stroke-width="4"/><rect x="2772" y="92" width="176" height="36" rx="5" fill="#6a7a6a"/></g>`);

  /* --- Барханы --- */
  L.push(`<path d="${smooth([[2060, 920], [2400, 880], [2700, 920], [3050, 870], [3050, 2050], [2260, 2050], [2200, 1640], [2140, 1330], [2050, 1200]], true)}" fill="#dcb47a" opacity="0.55" filter="url(#${K}-blur40)"/>`);
  const ridges = [
    [[2120, 1010], [2350, 950], [2600, 1040], [2850, 975], [3060, 1010]],
    [[2230, 1230], [2450, 1170], [2650, 1215], [2800, 1160], [3060, 1220]],
    [[2300, 1740], [2520, 1650], [2780, 1720], [3060, 1650]],
    [[2330, 1960], [2600, 1880], [2850, 1940], [3060, 1880]]
  ];
  for (const pts of ridges) L.push(duneRidge(r, pts));
  // песок наползает на шоссе с востока
  L.push(`<path d="${smooth([[2250, 1340], [2500, 1390], [2700, 1460], [2900, 1430], [3060, 1400], [3060, 1640], [2800, 1610], [2550, 1650], [2350, 1600], [2240, 1500]], true)}" fill="#cca46a" opacity="0.9" filter="url(#${K}-blur12)"/>`);
  L.push(car(r, 2620, 1250, 22, { sand: true, rust: 0.9, noRoof: true, noWheels: true, color: "#c8b48a" }));
  L.push(skull(2840, 1120, -40));
  for (const [x, y] of [[2240, 1250], [2700, 1650], [2950, 1100], [2450, 1360], [2250, 1950], [2800, 1950]]) L.push(shrub(r, x, y, 34 + r() * 16));
  let bones = "";
  for (let i = 0; i < 12; i++) { const x = 2300 + r() * 650, y = 1100 + r() * 850; bones += `<path d="M${f1(x)},${f1(y)} l${f1((r() - 0.5) * 50)},${f1((r() - 0.5) * 30)}" stroke="#e8dfc8" stroke-width="6" stroke-linecap="round"/>`; }
  L.push(`<g filter="url(#soft)">${bones}</g>`);

  /* --- Кладбище машин (ЮЗ) --- */
  // сетчатый забор с дырами вдоль севера и запада
  let fenceD = "", posts = "";
  const fpts = [[40, 1990], [40, 1040], [940, 1040]];
  for (const p of sampleLine(fpts, 110)) posts += `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="9" fill="#5a5a56" stroke="#1d1a17" stroke-width="3"/>`;
  fenceD = `M40,1990 V1500 M40,1440 V1040 H500 M620,1040 H940`;
  L.push(`<path d="${fenceD}" stroke="rgba(40,40,38,0.9)" stroke-width="10" fill="none" stroke-dasharray="3 5"/><path d="${fenceD}" stroke="#7a7a74" stroke-width="3" fill="none"/>${posts}`);
  L.push(`<path d="M500,1040 L520,1090 L560,1070 L590,1100 L620,1040" stroke="#7a7a74" stroke-width="3" fill="none"/>`);
  // пробка из брошенных машин на шоссе и вокруг
  const junk = [
    [180, 1170, 12], [370, 1120, -8], [900, 1110, 30],
    [130, 1420, 2], [380, 1450, -14], [700, 1400, 6], [980, 1500, -22], [560, 1560, 172],
    [160, 1700, 80], [420, 1760, 110], [700, 1720, 35], [960, 1800, -60], [260, 1930, 4], [620, 1920, -10], [880, 1960, 18]
  ];
  for (const [x, y, rot] of junk) L.push(car(r, x, y, rot, { noWheels: r() < 0.6, noRoof: r() < 0.3, openHood: r() < 0.2 }));
  L.push(crushed(r, 120, 1560, 90), crushed(r, 1060, 1720, 80));
  L.push(tirePile(r, 640, 1130, 4), tirePile(r, 280, 1590, 4), tireStack(1050, 1950, 3), tireStack(800, 1600, 2));
  L.push(sheet(520, 1840, 150, 90, 25), sheet(1080, 1410, 120, 80, -40), sheet(300, 1080, 130, 70, 10));
  L.push(`<g filter="url(#soft)"><rect x="820" y="1560" width="90" height="70" rx="8" fill="#4a4540" stroke="#1d1a17" stroke-width="4"/><circle cx="845" cy="1595" r="12" fill="#2a2622"/><circle cx="885" cy="1595" r="12" fill="#2a2622"/></g>`);

  /* --- Баррикада поперёк шоссе --- */
  L.push(`<path d="${smooth(BARR)}" stroke="#3a2a1a" stroke-width="150" fill="none" opacity="0.3" filter="url(#${K}-blur12)"/>`);
  // остов автобуса поперёк дороги
  L.push(`<g filter="url(#${K}-carShadow)" transform="translate(1620 1470) rotate(76)"><rect x="-230" y="-62" width="460" height="124" rx="16" fill="#c8a030" stroke="#1d1a17" stroke-width="5"/><rect x="-230" y="-62" width="460" height="124" rx="16" fill="url(#${K}-rust)" opacity="0.85"/>
    ${Array.from({ length: 7 }, (_, i) => `<rect x="${-200 + i * 60}" y="-50" width="44" height="100" fill="#1f1b18" opacity="${i % 3 === 1 ? 0.95 : 0.5}"/>`).join("")}<rect x="-225" y="-56" width="30" height="112" fill="#2a3a40"/></g>`);
  // покрышки, бочки, мешки с песком, листы железа
  for (let i = 0; i < 9; i++) L.push(tireStack(1560 + Math.sin(i) * 20 + i * 4, 1220 + i * 13 - (i > 4 ? 0 : 0), 2 + (i % 2)));
  L.push(tireStack(1700, 1700, 3), tireStack(1730, 1770, 2), tireStack(1680, 1830, 3), tireStack(1750, 1880, 2), tireStack(1640, 1760, 2));
  L.push(drum(r, 1610, 1330, 34), drum(r, 1660, 1630, 32, "#4a6a7a"), drum(r, 1610, 1660, 32), drum(r, 1720, 1620, 30, "#9a4a22"));
  L.push(sandbags(1500, 1260, 1520, 1360, 2), sandbags(1560, 1600, 1600, 1760, 2), sandbags(1640, 1880, 1820, 1940, 2));
  L.push(sheet(1700, 1290, 160, 70, 80), sheet(1740, 1540, 140, 80, 70));
  // наблюдательный помост из досок на бочках
  L.push(`<g filter="url(#soft)"><rect x="1390" y="1180" width="200" height="150" fill="url(#planks)" stroke="#2a170a" stroke-width="5"/><rect x="1390" y="1180" width="200" height="150" fill="url(#${K}-rust)" opacity="0.25"/>
    <path d="M1390,1180 H1590 V1330 M1390,1180 V1330" stroke="#4a3018" stroke-width="10" fill="none"/>${[[1395, 1185], [1585, 1185], [1395, 1325], [1585, 1325]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="#3a2a1a"/>`).join("")}</g>`);
  L.push(`<g filter="url(#soft)"><path d="M1440,1330 V1420 M1480,1330 V1420" stroke="#4a3018" stroke-width="7"/>${[0, 1, 2, 3].map(i => `<path d="M1440,${1345 + i * 20} h40" stroke="#7a5a32" stroke-width="5"/>`).join("")}</g>`);
  L.push(sandbags(1400, 1200, 1580, 1200, 1), drum(r, 1530, 1280, 26, "#9a4a22"), jerrycan(1430, 1270, 30));
  // «ёж» из заострённых брёвен у проезда
  L.push(`<g filter="url(#soft)">${[[1800, 1380], [1880, 1470], [1820, 1560]].map(([x, y]) => `<path d="M${x - 50},${y - 50} L${x + 50},${y + 50} M${x + 50},${y - 50} L${x - 50},${y + 50} M${x},${y - 60} V${y + 60}" stroke="#2a1a0a" stroke-width="16" stroke-linecap="round"/><path d="M${x - 50},${y - 50} L${x + 50},${y + 50} M${x + 50},${y - 50} L${x - 50},${y + 50} M${x},${y - 60} V${y + 60}" stroke="#8a5a2a" stroke-width="9" stroke-linecap="round"/>`).join("")}</g>`);
  L.push(fireDrum(1460, 1700), fireDrum(1880, 1270));
  L.push(car(r, 1980, 1910, 100, { burnt: true, noWheels: true }));
  L.push(sheet(1420, 1880, 160, 80, -15, "#7a756a"));

  // Пыльная дымка и палящий свет.
  L.push(`<rect width="${W}" height="${H}" fill="url(#${K}-haze)"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="#e09040" opacity="0.08"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="url(#${K}-vignette)"/>`);
  return L.join("\n");
}

/* ==========================================================================
   Зоны
   ========================================================================== */
const ZONES = [
  { id: "shop", name: "Магазинчик", tags: ["cover"], label: [600, 690], size: 56,
    poly: [[0, 0], [1000, 0], [1000, 960], [0, 960]] },
  { id: "pumps", name: "Колонки", tags: ["cover", "hazard"], label: [1560, 1010],
    poly: [[1000, 0], [2050, 0], [2050, 900], [2050, 1180], [1000, 1180], [1000, 960]] },
  { id: "tower", name: "Водонапорная башня", tags: ["elevated"], label: [2540, 780], size: 52,
    poly: [[2050, 0], [3000, 0], [3000, 860], [2700, 910], [2400, 870], [2050, 900]] },
  { id: "dunes", name: "Барханы", tags: ["difficult"], label: [2560, 1790],
    poly: [[2050, 900], [2400, 870], [2700, 910], [3000, 860], [3000, 2000], [2250, 2000], [2200, 1640], [2150, 1330], [2050, 1180]] },
  { id: "barricade", name: "Баррикада", tags: ["cover", "elevated"], label: [1960, 1700], size: 56,
    poly: [[1150, 1180], [2050, 1180], [2150, 1330], [2200, 1640], [2250, 2000], [1150, 2000]] },
  { id: "junkyard", name: "Кладбище машин", tags: ["cover", "difficult"], label: [560, 1290], size: 56,
    poly: [[0, 960], [1000, 960], [1000, 1180], [1150, 1180], [1150, 2000], [0, 2000]] }
];
const LINKS = [
  ["shop", "pumps", "short"], ["shop", "junkyard", "short"], ["pumps", "tower", "short"], ["pumps", "dunes", "short"],
  ["pumps", "barricade", "short"], ["pumps", "junkyard", "short"], ["tower", "dunes", "short"],
  ["barricade", "junkyard", "short"], ["barricade", "dunes", "short"]
];

const EXTRA = `<defs>
  <pattern id="${K}-rust" width="220" height="220" patternUnits="userSpaceOnUse">${(() => { const r = rng("gas-rust"); let o = ""; for (let i = 0; i < 70; i++) o += `<ellipse cx="${f1(r() * 220)}" cy="${f1(r() * 220)}" rx="${f1(6 + r() * 26)}" ry="${f1(4 + r() * 16)}" fill="${["#7a3a14", "#9a5022", "#5a2a10", "#b0642a"][Math.floor(r() * 4)]}" opacity="${f1(0.35 + r() * 0.5)}" transform="rotate(${f1(r() * 180)} 110 110)"/>`; for (let i = 0; i < 90; i++) o += `<circle cx="${f1(r() * 220)}" cy="${f1(r() * 220)}" r="${f1(1 + r() * 3)}" fill="#3a1a08" opacity="0.6"/>`; return o; })()}</pattern>
  <linearGradient id="${K}-rustStroke" x1="0" y1="0" x2="1" y2="1" spreadMethod="reflect"><stop offset="0" stop-color="#7a3a14" stop-opacity="0"/><stop offset="0.3" stop-color="#8a4418" stop-opacity="0.9"/><stop offset="0.55" stop-color="#7a3a14" stop-opacity="0.1"/><stop offset="0.8" stop-color="#9a5022" stop-opacity="0.8"/><stop offset="1" stop-color="#7a3a14" stop-opacity="0"/></linearGradient>
  <pattern id="${K}-corr" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="8" height="16" fill="rgba(255,255,255,0.12)"/><rect x="8" width="8" height="16" fill="rgba(0,0,0,0.18)"/></pattern>
  <pattern id="${K}-grate" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0,0 L14,14 M14,0 L0,14" stroke="rgba(20,12,6,0.6)" stroke-width="2"/></pattern>
  <pattern id="${K}-hazard" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="20" height="40" fill="#d8b02a"/><rect x="20" width="20" height="40" fill="#1d1a17"/></pattern>
  <pattern id="${K}-lino" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="#cfc6b0"/><rect x="50" y="50" width="50" height="50" fill="#cfc6b0"/><rect x="50" width="50" height="50" fill="#5a5048"/><rect y="50" width="50" height="50" fill="#5a5048"/><path d="M0,0 H100 V100" stroke="rgba(0,0,0,0.25)" stroke-width="2" fill="none"/></pattern>
  <pattern id="${K}-concrete" width="200" height="200" patternUnits="userSpaceOnUse"><rect width="200" height="200" fill="#8a8478"/><path d="M0,100 H200 M100,0 V200" stroke="rgba(0,0,0,0.2)" stroke-width="3"/></pattern>
  <pattern id="${K}-block" width="60" height="34" patternUnits="userSpaceOnUse"><rect width="60" height="34" fill="#9a9488"/><path d="M0,17 H60 M30,0 V17 M0,17 V34 M60,17 V34" stroke="#4a463e" stroke-width="3"/></pattern>
  <radialGradient id="${K}-tank" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#c8b8a0"/><stop offset="0.55" stop-color="#9a8a76"/><stop offset="1" stop-color="#5a4a3a"/></radialGradient>
  <linearGradient id="${K}-duneG" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stop-color="#cfa468"/><stop offset="0.55" stop-color="#e8c68c"/><stop offset="1" stop-color="#f0d29c"/></linearGradient>
  <linearGradient id="${K}-slip" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5a2c"/><stop offset="1" stop-color="#b8864e"/></linearGradient>
  <linearGradient id="${K}-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6a3a8a"/><stop offset="0.3" stop-color="#2a6a8a"/><stop offset="0.55" stop-color="#4a8a3a"/><stop offset="0.8" stop-color="#a08a2a"/><stop offset="1" stop-color="#8a3a5a"/></linearGradient>
  <filter id="${K}-sandD" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.003" numOctaves="4" seed="31"/><feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.28  0 0 0 0 0.12  0 0 0 1.3 -0.55"/></filter>
  <filter id="${K}-sandL" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.009" numOctaves="3" seed="8"/><feColorMatrix type="matrix" values="0 0 0 0 0.95  0 0 0 0 0.82  0 0 0 0 0.6  0 0 0 1.2 -0.62"/></filter>
  <filter id="${K}-asphalt" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="2"/><feColorMatrix type="matrix" values="0 0 0 0 0.12  0 0 0 0 0.11  0 0 0 0 0.1  0 0 0 1.1 -0.4"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <filter id="${K}-dirt" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="4" seed="17"/><feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 1.2 -0.4"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <filter id="${K}-carShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="14" dy="18" stdDeviation="8" flood-color="rgba(40,20,5,0.6)"/></filter>
  <filter id="${K}-towerShadow" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="22" dy="28" stdDeviation="12" flood-color="rgba(40,20,5,0.6)"/></filter>
  <filter id="${K}-blur6" filterUnits="userSpaceOnUse" x="-200" y="-200" width="3400" height="2400"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="${K}-blur12" filterUnits="userSpaceOnUse" x="-200" y="-200" width="3400" height="2400"><feGaussianBlur stdDeviation="12"/></filter>
  <filter id="${K}-blur40" filterUnits="userSpaceOnUse" x="-200" y="-200" width="3400" height="2400"><feGaussianBlur stdDeviation="40"/></filter>
  <radialGradient id="${K}-haze" cx="35%" cy="25%" r="80%"><stop offset="0" stop-color="rgba(255,220,150,0.18)"/><stop offset="1" stop-color="rgba(255,200,120,0)"/></radialGradient>
  <radialGradient id="${K}-vignette" cx="50%" cy="50%" r="72%"><stop offset="0.55" stop-color="rgba(60,25,5,0)"/><stop offset="1" stop-color="rgba(60,25,5,0.6)"/></radialGradient>
</defs>`;

export default {
  key: "gas-station", name: "Заправка в пустоши", folder: "Пустошь", worlds: ["postapoc", "zombie"],
  bgColor: "#3a2414",
  extraDefs: EXTRA,
  draw, zones: ZONES, links: LINKS,
  style: { tint: "rgba(255,210,150,0.04)", line: "rgba(255,214,150,0.9)", text: "#ffe2b0" }
};
