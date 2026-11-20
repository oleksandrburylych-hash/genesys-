import { W, H, rng, f1, poly, P, walls } from "../lib.mjs";

/* ==========================================================================
   Карта: переправа у старой мельницы (река с севера на юг, мост, брод, мельница)
   ========================================================================== */
const K = "river";

/* ---------- геометрия реки ---------- */
const cx = y => 1440 + 50 * Math.sin(2 * Math.PI * y / 2000) + 25 * Math.sin(2 * Math.PI * y / 700 + 1);
const hw = y => 175 + 15 * Math.sin(y / 260) + 75 * Math.exp(-(((y - 1320) / 250) ** 2)); // ниже мельницы — плёс
const bankW = y => Math.round(cx(y) - hw(y));
const bankE = y => Math.round(cx(y) + hw(y));
const YS = Array.from({ length: 51 }, (_, i) => i * 40);
const span = (a, b) => YS.filter(y => y >= a && y <= b);
const Y_BRIDGE = 400, Y_RIVER0 = 560, Y_RIVER1 = 1480, Y_FORD = 1690;
const MILL = { x: 1690, y: 600, w: 600, h: 560 };

// Дороги: тракт с запада к мосту, за мостом через двор к воротам; тропа к броду.
const ROAD_W = [[-60, 1060], [300, 990], [640, 820], [930, 590], [1130, 450], [1260, 405]];
const ROAD_E = [[1700, 405], [1900, 420], [2150, 470], [2450, 530], [2750, 560], [3060, 570]];
const TRAIL_W = [[560, 900], [700, 1150], [900, 1420], [1080, 1620], [1230, 1700]];
const TRAIL_E = [[1560, 1690], [1720, 1700], [1950, 1740], [2200, 1800], [2380, 1880], [2440, 2060]];

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

/** Полоса склона/обрыва: грани от кромки (точки с нормалью) в сторону dir·нормаль, длина len(i). */
function cliffBand(r, edge, dir, len, cols) {
  const o = [], foot = edge.map((p, i) => [p.x + p.nx * dir * len(i), p.y + p.ny * dir * len(i)]);
  for (let i = 0; i < edge.length - 1; i++) {
    const a = edge[i], b = edge[i + 1];
    o.push(`<polygon points="${f1(a.x)},${f1(a.y)} ${f1(b.x)},${f1(b.y)} ${f1(foot[i + 1][0])},${f1(foot[i + 1][1])} ${f1(foot[i][0])},${f1(foot[i][1])}" fill="${cols[Math.floor(r() * cols.length)]}" stroke="${cols[0]}" stroke-width="1"/>`);
    if (r() < 0.45) { const t = 0.3 + r() * 0.4; o.push(`<path d="M${f1(a.x)},${f1(a.y)} L${f1(a.x + (foot[i][0] - a.x) * t + (r() - 0.5) * 10)},${f1(a.y + (foot[i][1] - a.y) * t)}" stroke="rgba(20,16,10,0.55)" stroke-width="3"/>`); }
  }
  o.push(`<path d="${smooth(foot)}" stroke="rgba(0,0,0,0.4)" stroke-width="22" fill="none" filter="url(#${K}-blur8)"/>`);
  o.push(`<path d="M${edge.map(p => `${f1(p.x)},${f1(p.y)}`).join(" L")}" stroke="rgba(0,0,0,0.25)" stroke-width="3" fill="none"/>`);
  return `<g>${o.join("")}</g>`;
}

/* Деревья: тени копятся отдельно (рисуются одним размытым слоем под кронами). */
function makeFlora(r) {
  const shadows = [], tops = [];
  return {
    shadows, tops,
    tree(x, y, R, g = Math.floor(r() * 4)) {
      const lobes = [[x, y, R * 0.62]];
      const k = 6 + Math.floor(r() * 4);
      for (let i = 0; i < k; i++) {
        const a = i / k * Math.PI * 2 + r() * 0.6, d = R * (0.4 + r() * 0.18);
        lobes.push([x + Math.cos(a) * d, y + Math.sin(a) * d, R * (0.34 + r() * 0.16)]);
      }
      shadows.push(lobes.map(([cx, cy, rr]) => `<circle cx="${f1(cx + R * 0.38)}" cy="${f1(cy + R * 0.55)}" r="${f1(rr)}"/>`).join(""));
      const o = [];
      o.push(lobes.map(([cx, cy, rr]) => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(rr + 5)}" fill="#11200c"/>`).join(""));
      o.push(lobes.map(([cx, cy, rr]) => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(rr)}" fill="url(#${K}-lobe${g})"/>`).join(""));
      for (let i = 0; i < 4; i++) {
        const a = r() * Math.PI * 2, d = R * r() * 0.35;
        o.push(`<circle cx="${f1(x + Math.cos(a) * d - R * 0.12)}" cy="${f1(y + Math.sin(a) * d - R * 0.15)}" r="${f1(R * (0.2 + r() * 0.14))}" fill="url(#${K}-lobe${(g + 1) % 4})" opacity="0.9"/>`);
      }
      o.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(R * 1.02)}" fill="url(#${K}-leaves)" opacity="0.55"/>`);
      tops.push(`<g>${o.join("")}</g>`);
    },
    pine(x, y, R) {
      const rot = r() * 30;
      const star = (rad, n) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2; const rr = i % 2 ? rad * 0.62 : rad * (0.92 + r() * 0.16); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } return pts; };
      shadows.push(`<polygon points="${poly(star(R, 11).map(([a, b]) => [a + R * 0.5, b + R * 0.7]))}"/>`);
      const cols = ["#16301a", "#1f4224", "#2b562d", "#3a6c38", "#4d8244"];
      const o = [];
      for (let L = 0; L < 5; L++) o.push(`<polygon points="${poly(star(R * (1 - L * 0.18), 11 - L))}" transform="rotate(${f1(rot + L * 13)} ${f1(x)} ${f1(y)})" fill="${cols[L]}" stroke="#0e1c0e" stroke-width="${L ? 1.5 : 3}"/>`);
      o.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(R * 0.08)}" fill="#5a3a1c"/>`);
      tops.push(o.join(""));
    },
    bush(x, y, R, berries = false) {
      const lobes = Array.from({ length: 4 + Math.floor(r() * 3) }, () => { const a = r() * Math.PI * 2, d = R * 0.45 * r(); return [x + Math.cos(a) * d, y + Math.sin(a) * d, R * (0.45 + r() * 0.25)]; });
      shadows.push(lobes.map(([cx, cy, rr]) => `<circle cx="${f1(cx + R * 0.3)}" cy="${f1(cy + R * 0.42)}" r="${f1(rr)}"/>`).join(""));
      const o = [lobes.map(([cx, cy, rr]) => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(rr + 3)}" fill="#13240e"/>`).join(""), lobes.map(([cx, cy, rr]) => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(rr)}" fill="url(#${K}-bush)"/>`).join("")];
      if (berries) for (let i = 0; i < 5; i++) o.push(`<circle cx="${f1(x + (r() - 0.5) * R)}" cy="${f1(y + (r() - 0.5) * R)}" r="3.5" fill="#b0243a"/>`);
      tops.push(o.join(""));
    },
    fern(x, y, R) {
      const n = 6 + Math.floor(r() * 3), a0 = r() * 6.28; let d = "";
      for (let i = 0; i < n; i++) { const a = a0 + i / n * 6.28, l = R * (0.7 + r() * 0.3); const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l; d += `M${f1(x)},${f1(y)} Q${f1(x + Math.cos(a + 0.3) * l * 0.6)},${f1(y + Math.sin(a + 0.3) * l * 0.6)} ${f1(ex)},${f1(ey)} `; }
      tops.push(`<path d="${d}" stroke="#2f5a22" stroke-width="9" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#6a9a3c" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="6 5"/>`);
    },
    rock(x, y, R, tone = 0) {
      const pts = blob(r, x, y, R, 7 + Math.floor(r() * 3), 0.28);
      shadows.push(`<polygon points="${poly(pts.map(([a, b]) => [a + R * 0.3, b + R * 0.4]))}"/>`);
      const face = pts.slice(0, 4).map(([a, b]) => [x + (a - x) * 0.55 - R * 0.15, y + (b - y) * 0.55 - R * 0.2]);
      tops.push(`<polygon points="${poly(pts)}" fill="url(#${K}-rock${tone})" stroke="#24221e" stroke-width="4" stroke-linejoin="round"/><polygon points="${poly(face)}" fill="rgba(255,250,235,0.16)"/>
        <path d="M${f1(x - R * (0.2 + r() * 0.4))},${f1(y + R * (r() - 0.3) * 0.6)} l${f1(R * (0.2 + r() * 0.2))},${f1(-R * r() * 0.3)} l${f1(R * (0.1 + r() * 0.3))},${f1(R * (r() - 0.2) * 0.4)}" stroke="rgba(20,18,15,0.6)" stroke-width="2.5" fill="none"/>
        ${r() < 0.5 ? `<circle cx="${f1(x + R * 0.2)}" cy="${f1(y - R * 0.25)}" r="${f1(R * 0.22)}" fill="#6f8f3a" opacity="0.55"/>` : ""}`);
    }
  };
}


const distTo = (pts, x, y) => Math.min(...sampleLine(pts, 30).map(p => Math.hypot(p.x - x, p.y - y)));

/** Струи течения: длинные изогнутые блики вдоль русла. */
function currents(r) {
  let d = "", d2 = "";
  for (let i = 0; i < 110; i++) {
    const y0 = -80 + r() * 2100, len = 120 + r() * 220, y1 = y0 + len;
    const t = (r() - 0.5) * 1.6, x0 = cx(y0) + t * hw(y0), x1 = cx(y1) + t * hw(y1) + (r() - 0.5) * 20;
    const seg = `M${f1(x0)},${f1(y0)} Q${f1((x0 + x1) / 2 + (r() - 0.5) * 40)},${f1((y0 + y1) / 2)} ${f1(x1)},${f1(y1)} `;
    if (Math.abs(t) < 0.5) d += seg; else d2 += seg;
  }
  return `<path d="${d}" stroke="rgba(225,248,248,0.42)" stroke-width="4" fill="none" stroke-linecap="round"/><path d="${d2}" stroke="rgba(225,248,248,0.25)" stroke-width="3" fill="none" stroke-linecap="round"/>`;
}

/* ---------- предметы ---------- */
function fence(pts, gapAt = []) {
  const o = [];
  for (const p of sampleLine(pts, 70).concat([{ x: pts.at(-1)[0], y: pts.at(-1)[1] }])) if (!gapAt.some(([gx, gy, gr]) => Math.hypot(gx - p.x, gy - p.y) < gr)) o.push(p);
  let rails = "", posts = "";
  for (let i = 0; i < o.length - 1; i++) {
    const a = o[i], b = o[i + 1];
    if (Math.hypot(a.x - b.x, a.y - b.y) > 90) continue;
    rails += `M${f1(a.x)},${f1(a.y)} L${f1(b.x)},${f1(b.y)} `;
  }
  for (const p of o) posts += `<rect x="${f1(p.x - 9)}" y="${f1(p.y - 9)}" width="18" height="18" rx="3" fill="#6b4a28" stroke="#24160a" stroke-width="3"/>`;
  return `<g filter="url(#soft)"><path d="${rails}" stroke="#24160a" stroke-width="15" fill="none"/><path d="${rails}" stroke="#8a6438" stroke-width="9" fill="none"/>${posts}</g>`;
}
function rowboat(x, y, rot) {
  return `<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})"><path d="M${x - 120},${y} Q${x - 80},${y - 46} ${x + 60},${y - 40} Q${x + 120},${y - 30} ${x + 125},${y} Q${x + 120},${y + 30} ${x + 60},${y + 40} Q${x - 80},${y + 46} ${x - 120},${y}Z" fill="#7a5530" stroke="#2a170a" stroke-width="5"/>
    <path d="M${x - 105},${y} Q${x - 70},${y - 32} ${x + 55},${y - 28} Q${x + 105},${y - 20} ${x + 108},${y} Q${x + 105},${y + 20} ${x + 55},${y + 28} Q${x - 70},${y + 32} ${x - 105},${y}Z" fill="#5a3d20"/>
    ${[-50, 10, 70].map(dx => `<rect x="${x + dx - 9}" y="${y - 32}" width="18" height="64" fill="#9a6e40" stroke="#2a170a" stroke-width="2"/>`).join("")}
    <path d="M${x - 10},${y - 34} L${x + 30},${y - 120} M${x - 10},${y + 34} L${x + 40},${y + 110}" stroke="#a07a48" stroke-width="7" stroke-linecap="round"/></g>`;
}
function gear(x, y, R, teeth = 20) {
  let pts = [];
  for (let i = 0; i < teeth * 2; i++) { const a = i / (teeth * 2) * Math.PI * 2; const rr = i % 2 ? R : R * 0.86; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  return `<g filter="url(#soft)"><polygon points="${poly(pts)}" fill="#6e4a26" stroke="#24160a" stroke-width="4" stroke-linejoin="round"/><circle cx="${x}" cy="${y}" r="${R * 0.72}" fill="#8a5e32" stroke="#3a2412" stroke-width="3"/>
    ${[0, 45, 90, 135].map(a => `<rect x="${x - R * 0.7}" y="${y - 7}" width="${R * 1.4}" height="14" fill="#5a3a1c" transform="rotate(${a} ${x} ${y})"/>`).join("")}<circle cx="${x}" cy="${y}" r="${R * 0.16}" fill="#3a3530" stroke="#111" stroke-width="3"/></g>`;
}
function millstone(x, y, R) {
  let grooves = "";
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; grooves += `M${f1(x + Math.cos(a) * R * 0.25)},${f1(y + Math.sin(a) * R * 0.25)} L${f1(x + Math.cos(a + 0.35) * R * 0.95)},${f1(y + Math.sin(a + 0.35) * R * 0.95)} `; }
  return `<circle cx="${x}" cy="${y}" r="${R}" fill="url(#${K}-stone)" stroke="#2a2723" stroke-width="5"/><path d="${grooves}" stroke="rgba(40,36,30,0.6)" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${R * 0.18}" fill="#2a2723"/>`;
}
function sackPile(x, y, n, r) {
  const o = [];
  for (let i = 0; i < n; i++) { const sx = x + (i % 3) * 58 + (Math.floor(i / 3) % 2) * 28, sy = y + Math.floor(i / 3) * 50; o.push(`<g transform="rotate(${f1((r() - 0.5) * 40)} ${sx} ${sy})"><ellipse cx="${sx}" cy="${sy}" rx="34" ry="26" fill="${r() < 0.7 ? "#cdb88a" : "#b89a68"}" stroke="#5e4a2a" stroke-width="3"/><path d="M${sx + 22},${sy - 12} q8,12 0,24" stroke="#5e4a2a" stroke-width="3" fill="none"/></g>`); }
  return `<g filter="url(#soft)">${o.join("")}</g>`;
}
function crateBox(x, y, s, rot) {
  return `<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})"><rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" fill="#9a6a38" stroke="#3b2412" stroke-width="5"/>
    <path d="M${x - s / 2},${y - s / 6} H${x + s / 2} M${x - s / 2},${y + s / 6} H${x + s / 2}" stroke="#5a3a1a" stroke-width="4"/><rect x="${x - s / 2 + 5}" y="${y - s / 2 + 5}" width="${s - 10}" height="${s - 10}" fill="none" stroke="#c08a50" stroke-width="2" opacity="0.5"/></g>`;
}
function woodpile(x, y, w, rows = 3) {
  const o = [`<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${rows * 34 + 12}" fill="#3a2614" rx="4"/>`];
  for (let j = 0; j < rows; j++) for (let i = 0; i < Math.floor(w / 34); i++) o.push(`<circle cx="${x + 17 + i * 34 + (j % 2) * 8}" cy="${y + 17 + j * 34}" r="15" fill="#c79a62" stroke="#5a3a1c" stroke-width="3"/><circle cx="${x + 17 + i * 34 + (j % 2) * 8}" cy="${y + 17 + j * 34}" r="6" fill="none" stroke="#8a6034" stroke-width="2"/>`);
  return `<g filter="url(#soft)">${o.join("")}</g>`;
}
function trough(x, y, rot) {
  return `<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})"><rect x="${x - 90}" y="${y - 28}" width="180" height="56" rx="8" fill="#6b4a28" stroke="#24160a" stroke-width="4"/><rect x="${x - 78}" y="${y - 17}" width="156" height="34" rx="5" fill="#3f7383"/><path d="M${x - 60},${y - 6} h40 M${x + 10},${y + 5} h36" stroke="rgba(220,240,240,0.5)" stroke-width="3"/></g>`;
}
function garden(x, y, w, h, r) {
  const o = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#5a4026" stroke="#3a2614" stroke-width="4"/>`];
  for (let yy = y + 30; yy < y + h - 10; yy += 46) {
    o.push(`<path d="M${x + 14},${yy} H${x + w - 14}" stroke="#4a321c" stroke-width="20" stroke-linecap="round"/>`);
    for (let xx = x + 30; xx < x + w - 20; xx += 34 + r() * 10) o.push(`<circle cx="${f1(xx)}" cy="${f1(yy + (r() - 0.5) * 6)}" r="${f1(9 + r() * 5)}" fill="${r() < 0.5 ? "#5f8f34" : "#79a440"}" stroke="#2f4a1a" stroke-width="2"/>`);
  }
  return o.join("");
}
function coop(x, y) {
  return `<g filter="url(#soft)"><rect x="${x - 80}" y="${y - 60}" width="160" height="120" fill="#8a5a34" stroke="#2a170a" stroke-width="5"/><path d="M${x - 80},${y} H${x + 80}" stroke="#2a170a" stroke-width="6"/>
    ${[-50, -20, 10, 40].map(d => `<path d="M${x + d},${y - 60} V${y + 60}" stroke="rgba(0,0,0,0.2)" stroke-width="3"/>`).join("")}<rect x="${x - 70}" y="${y - 52}" width="140" height="48" fill="rgba(255,255,255,0.08)"/></g>`;
}
function chicken(x, y, rot) {
  return `<g transform="rotate(${rot} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="13" ry="10" fill="#f2ead8" stroke="#6a5a40" stroke-width="2"/><circle cx="${x + 12}" cy="${y}" r="6" fill="#f2ead8" stroke="#6a5a40" stroke-width="2"/><path d="M${x + 17},${y} l6,0" stroke="#e0a030" stroke-width="3"/><circle cx="${x + 12}" cy="${y - 5}" r="3" fill="#c0302a"/></g>`;
}

/* ==========================================================================
   Рисунок
   ========================================================================== */
function draw() {
  const r = rng("river-crossing");
  const F = makeFlora(r);
  const L = [];
  const m = MILL, mx2 = m.x + m.w, my2 = m.y + m.h;

  // Земля: трава по всей карте, двор — утоптанная земля.
  L.push(`<rect width="${W}" height="${H}" fill="#5b7631"/>`);
  L.push(`<rect width="${W}" height="${H}" filter="url(#${K}-mottleD)"/>`);
  L.push(`<rect width="${W}" height="${H}" filter="url(#${K}-mottleL)"/>`);
  const yard = [[1700, 160], [2900, 150], [2910, 1860], [1640, 1860], [1600, 1300], [1690, 1160], [1690, 560], [1720, 200]];
  L.push(`<path d="${smooth(yard, true)}" fill="#8a7350" opacity="0.75" filter="url(#${K}-blur12)"/>`);
  L.push(`<path d="${smooth(yard, true)}" fill="#000" filter="url(#${K}-dirtTex)" opacity="0.6"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="#000" filter="url(#grain)" opacity="0.3"/>`);
  let tufts = "";
  for (let i = 0; i < 1300; i++) {
    const x = r() * W, y = r() * H;
    if (x > 1750 && x < 2880 && y > 180 && y < 1840) continue;
    tufts += `<path d="M${f1(x)},${f1(y)} l-5,-11 M${f1(x)},${f1(y)} l1,-14 M${f1(x)},${f1(y)} l6,-10" stroke="${r() < 0.5 ? "#86a44a" : "#3f5a24"}" stroke-width="2.4" stroke-linecap="round"/>`;
    if (r() < 0.07) tufts += `<circle cx="${f1(x + 8)}" cy="${f1(y - 4)}" r="3.5" fill="${["#f1e7a0", "#e8e4f4", "#d6a0e0"][Math.floor(r() * 3)]}"/>`;
  }
  L.push(`<g>${tufts}</g>`);

  // Дороги и тропы.
  const road = (pts, w, c) => { const d = smooth(pts); return `<path d="${d}" stroke="#3a2c18" stroke-width="${w + 30}" fill="none" opacity="0.4" filter="url(#${K}-blur12)"/><path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#000" stroke-width="${w}" fill="none" filter="url(#${K}-roadTex)" opacity="0.7" stroke-linecap="round"/>`; };
  L.push(road(ROAD_W, 190, "#8c6e46"), road(ROAD_E, 180, "#8c6e46"), road([[1990, 440], [2000, 520], [2010, 600]], 120, "#8a6c44"));
  L.push(road(TRAIL_W, 70, "#7d6440"), road(TRAIL_E, 70, "#7d6440"));
  for (const pts of [ROAD_W, ROAD_E]) for (const dy of [-40, 40]) L.push(`<path d="${smooth(pts)}" transform="translate(0 ${dy})" stroke="#5c4428" stroke-width="14" fill="none" opacity="0.45"/>`);

  /* --- Река --- */
  const water = [...YS.map(y => [bankW(y), y]), [bankW(2000), 2060], [bankE(2000), 2060], ...YS.slice().reverse().map(y => [bankE(y), y]), [bankE(0), -60], [bankW(0), -60]];
  const wpath = `M${water.map(p => `${f1(p[0])},${f1(p[1])}`).join(" L")}Z`;
  const center = YS.map(y => [cx(y), y]);
  L.push(`<clipPath id="${K}-water"><path d="${wpath}"/></clipPath>`);
  // берег: илистая кромка
  L.push(`<path d="${wpath}" fill="none" stroke="#4e3f28" stroke-width="56" stroke-linejoin="round"/>`);
  L.push(`<path d="${wpath}" fill="none" stroke="#6e5a38" stroke-width="30" stroke-linejoin="round"/>`);
  L.push(`<path d="${wpath}" fill="#3e7f86"/>`);
  L.push(`<g clip-path="url(#${K}-water)">
    <path d="${smooth(center)}" stroke="#2f6774" stroke-width="250" fill="none" filter="url(#${K}-blur40)"/>
    <path d="${smooth(center)}" stroke="#1f4b5e" stroke-width="140" fill="none" filter="url(#${K}-blur40)"/>
    <path d="${wpath}" fill="#000" filter="url(#${K}-waterTex)" opacity="0.7"/>
    <ellipse cx="${f1(cx(Y_FORD))}" cy="${Y_FORD}" rx="300" ry="190" fill="#b09a62" opacity="0.75" filter="url(#${K}-blur40)"/>
    ${currents(r)}
    <path d="${wpath}" fill="none" stroke="rgba(230,250,250,0.45)" stroke-width="10" stroke-dasharray="6 18"/>
  </g>`);
  // камыш и камни у берегов
  let reeds = "";
  for (let i = 0; i < 140; i++) {
    const y = r() * H, side = r() < 0.5 ? -1 : 1;
    if (Math.abs(y - Y_BRIDGE) < 120 || Math.abs(y - Y_FORD) < 90 || (side > 0 && y > 560 && y < 1180)) continue;
    const x = cx(y) + side * (hw(y) + (r() - 0.6) * 30);
    reeds += `<path d="M${f1(x)},${f1(y)} l-8,-26 M${f1(x)},${f1(y)} l2,-32 M${f1(x)},${f1(y)} l11,-24 M${f1(x)},${f1(y)} l-14,-14" stroke="${r() < 0.5 ? "#6f8a34" : "#8aa040"}" stroke-width="3.5" stroke-linecap="round"/>`;
    if (r() < 0.15) reeds += `<ellipse cx="${f1(x + 2)}" cy="${f1(y - 30)}" rx="3.5" ry="9" fill="#5a3a1c"/>`;
  }
  L.push(`<g>${reeds}</g>`);
  for (let i = 0; i < 22; i++) { const y = 40 + r() * 1920; if (Math.abs(y - Y_BRIDGE) < 110 || Math.abs(y - Y_FORD) < 120 || (y > 560 && y < 1180)) continue; const side = r() < 0.5 ? -1 : 1; F.rock(cx(y) + side * (hw(y) - 10 - r() * 40), y, 16 + r() * 18, 1); }
  // брод: камни-ступени и рябь вокруг
  const fordStones = [];
  for (let i = 0; i < 6; i++) { const t = (i + 0.5) / 6; const y = Y_FORD + Math.sin(i * 1.7) * 22; const x = bankW(y) + 10 + t * (bankE(y) - bankW(y) - 20); fordStones.push([x, y]); }
  L.push(fordStones.map(([x, y]) => `<ellipse cx="${f1(x - 6)}" cy="${f1(y - 4)}" rx="56" ry="40" fill="none" stroke="rgba(230,250,250,0.55)" stroke-width="4" stroke-dasharray="18 10"/><path d="M${f1(x - 30)},${f1(y + 40)} q30,22 60,0" stroke="rgba(230,250,250,0.6)" stroke-width="4" fill="none"/>`).join(""));
  for (const [x, y] of fordStones) F.rock(x, y, 30 + r() * 8, 0);
  for (let i = 0; i < 8; i++) F.rock(cx(Y_FORD) + (r() - 0.5) * 300, Y_FORD - 70 - r() * 90, 8 + r() * 8, 1);

  /* --- Мельница (интерьер без крыши) --- */
  // фундамент и набережная между стеной и водой
  const quay = [...span(m.y - 20, my2 + 20).map(y => [bankE(y) - 14, y]), [m.x + 20, my2 + 20], [m.x + 20, m.y - 20]];
  L.push(`<polygon points="${poly(quay)}" fill="url(#cobbles)" stroke="#2c2a27" stroke-width="6"/>`);
  L.push(`<polygon points="${poly(quay)}" fill="#000" opacity="0.15"/>`);
  L.push(`<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" fill="url(#planks)"/>`);
  L.push(`<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" fill="#000" filter="url(#grain)" opacity="0.5"/>`);
  // мука на полу
  for (let i = 0; i < 10; i++) L.push(`<ellipse cx="${f1(m.x + 140 + r() * 340)}" cy="${f1(m.y + 80 + r() * 400)}" rx="${f1(30 + r() * 50)}" ry="${f1(20 + r() * 30)}" fill="#efe6d0" opacity="0.28" filter="url(#${K}-blur8)"/>`);
  // антресоль (второй ярус) в юго-восточной части
  const loft = { x: m.x + 360, y: m.y + 300, w: m.w - 380, h: m.h - 320 };
  L.push(`<rect x="${loft.x}" y="${loft.y}" width="${loft.w}" height="${loft.h}" fill="url(#planks)" filter="url(#${K}-loftShadow)"/><rect x="${loft.x}" y="${loft.y}" width="${loft.w}" height="${loft.h}" fill="rgba(255,225,170,0.2)"/>`);
  L.push(`<path d="M${loft.x},${loft.y + loft.h} V${loft.y} H${loft.x + loft.w - 130}" stroke="#2a170a" stroke-width="16" fill="none"/><path d="M${loft.x},${loft.y + loft.h} V${loft.y} H${loft.x + loft.w - 130}" stroke="#8a5e32" stroke-width="9" fill="none"/>`);
  for (let i = 0; i <= 5; i++) L.push(`<rect x="${loft.x - 10}" y="${loft.y + i * loft.h / 5 - 10}" width="20" height="20" fill="#5a3517" stroke="#24160a" stroke-width="3"/>`);
  L.push(`<g transform="rotate(180 ${mx2 - 85} ${m.y + 165})">${P.stairs(mx2 - 140, m.y + 30, 110, 270, 9)}</g>`);
  // вал от колеса, шестерня, жернов, ковш
  L.push(`<rect x="${m.x - 110}" y="${m.y + 150}" width="250" height="22" fill="#3a2a1a" stroke="#111" stroke-width="3"/>`);
  L.push(gear(m.x + 130, m.y + 161, 82, 22));
  L.push(`<g filter="url(#soft)"><polygon points="${poly(Array.from({ length: 8 }, (_, i) => [m.x + 290 + Math.cos(i / 8 * 6.283 + 0.39) * 135, m.y + 190 + Math.sin(i / 8 * 6.283 + 0.39) * 135]))}" fill="#7a5230" stroke="#2a170a" stroke-width="6"/>${millstone(m.x + 290, m.y + 190, 108)}
    <polygon points="${m.x + 250},${m.y + 150} ${m.x + 330},${m.y + 150} ${m.x + 310},${m.y + 205} ${m.x + 270},${m.y + 205}" fill="#9a6e40" stroke="#2a170a" stroke-width="4"/><rect x="${m.x + 278}" y="${m.y + 168}" width="24" height="24" fill="#e8dcc0"/></g>`);
  L.push(sackPile(m.x + 60, m.y + 300, 6, r), sackPile(loft.x + 30, loft.y + 60, 5, r), crateBox(loft.x + 160, loft.y + 170, 74, 6), P.barrel(m.x + 70, m.y + 60, 38), P.barrel(m.x + 160, m.y + 50, 34));
  L.push(P.lantern(m.x + 470, m.y + 60));
  L.push(P.lantern(m.x + 300, m.y + 390), P.lantern(loft.x + 120, loft.y + 120));
  // стены с дверями (север — к двору, восток — во двор, юг — к огороду)
  L.push(walls([
    [[m.x, m.y], [m.x + 260, m.y]], [[m.x + 380, m.y], [mx2, m.y]],
    [[mx2, m.y], [mx2, m.y + 300]], [[mx2, m.y + 410], [mx2, my2]],
    [[m.x, my2], [m.x + 200, my2]], [[m.x + 300, my2], [mx2, my2]],
    [[m.x, m.y], [m.x, my2]]
  ], 40));
  L.push(P.door(m.x + 260, m.y, 120), P.door(mx2, m.y + 300, 110, false), P.door(m.x + 200, my2, 100));
  // окна-бойницы со светом
  for (const [x, y, w, h] of [[m.x - 8, m.y + 330, 16, 70], [m.x + 470, my2 - 8, 70, 16], [m.x + 120, m.y - 8, 70, 16]]) L.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#bfe0ea" stroke="#1c1814" stroke-width="3"/>`);
  // водяное колесо в реке
  const wx = m.x - 50, wy = m.y + 161;
  L.push(`<g filter="url(#soft)"><rect x="${wx - 40}" y="${wy - 150}" width="80" height="300" rx="8" fill="#4a3018" stroke="#1c1006" stroke-width="5"/>
    ${Array.from({ length: 13 }, (_, i) => `<rect x="${wx - 44}" y="${f1(wy - 146 + i * 23.5)}" width="88" height="11" fill="#8a6036" stroke="#2a170a" stroke-width="2"/>`).join("")}
    <rect x="${wx - 6}" y="${wy - 150}" width="12" height="300" fill="#2f1d0c"/><circle cx="${wx}" cy="${wy}" r="18" fill="#3a3530" stroke="#111" stroke-width="3"/></g>`);
  L.push(`<g opacity="0.85">${Array.from({ length: 14 }, (_, i) => `<circle cx="${f1(wx - 60 + r() * 120)}" cy="${f1(wy + 150 + r() * 70)}" r="${f1(8 + r() * 16)}" fill="#e8f6f4" opacity="${f1(0.3 + r() * 0.4)}"/>`).join("")}</g>`);
  // причал у южной части мельницы и лодка
  const py = my2 - 70;
  L.push(`<g filter="url(#soft)"><rect x="${bankE(py) - 200}" y="${py - 50}" width="${m.x - bankE(py) + 210}" height="100" fill="#7a5530" stroke="#2a170a" stroke-width="5"/>
    ${Array.from({ length: Math.ceil((m.x - bankE(py) + 210) / 26) }, (_, i) => `<path d="M${bankE(py) - 200 + i * 26},${py - 50} V${py + 50}" stroke="#3b2412" stroke-width="3"/>`).join("")}
    ${[[-190, -46], [-190, 46], [-80, -46], [-80, 46]].map(([dx, dy]) => `<circle cx="${bankE(py) + dx}" cy="${py + dy}" r="11" fill="#4a3018" stroke="#1c1006" stroke-width="3"/>`).join("")}</g>`);
  L.push(rowboat(bankE(py) - 120, py + 120, -8));
  L.push(`<path d="M${bankE(py) - 190},${py + 46} Q${bankE(py) - 200},${py + 90} ${bankE(py) - 220},${py + 110}" stroke="#d8c8a0" stroke-width="3" fill="none"/>`);

  /* --- Мост --- */
  const bx0 = bankW(Y_BRIDGE) - 90, bx1 = bankE(Y_BRIDGE) + 90, by = Y_BRIDGE, bh = 130;
  L.push(`<rect x="${bx0 + 60}" y="${by - bh / 2 + 30}" width="${bx1 - bx0 - 60}" height="${bh}" fill="#0c2028" opacity="0.55" filter="url(#${K}-blur12)"/>`);
  for (const x of [bx0 - 20, bx1 - 100]) L.push(`<rect x="${x}" y="${by - bh / 2 - 34}" width="120" height="${bh + 68}" rx="10" fill="url(#stonewall)" stroke="#1c1814" stroke-width="6" filter="url(#soft)"/>`);
  let deck = "", sh = 1;
  for (let x = bx0; x < bx1; x += 24) deck += `<rect x="${x}" y="${by - bh / 2}" width="${Math.min(24, bx1 - x)}" height="${bh}" fill="rgb(${Math.round(140 * (sh = 0.85 + r() * 0.25))},${Math.round(98 * sh)},${Math.round(58 * sh)})" stroke="#3b2412" stroke-width="2.5"/>`;
  L.push(`<g filter="url(#soft)">${deck}</g>`);
  for (const s of [-1, 1]) {
    const yy = by + s * (bh / 2 - 6);
    L.push(`<path d="M${bx0},${yy} H${bx1}" stroke="#24160a" stroke-width="18"/><path d="M${bx0},${yy} H${bx1}" stroke="#7a5530" stroke-width="10"/>`);
    for (let x = bx0 + 10; x < bx1; x += 90) L.push(`<rect x="${x - 10}" y="${yy - 10}" width="20" height="20" fill="#5a3a1c" stroke="#1c1006" stroke-width="3"/>`);
  }
  L.push(`<path d="M${bx0 + 30},${by - 20} H${bx1 - 30} M${bx0 + 30},${by + 22} H${bx1 - 30}" stroke="rgba(60,35,15,0.35)" stroke-width="10"/>`);
  // сваи сбоку моста с водоворотами
  for (let x = bankW(by) + 70; x < bankE(by) - 40; x += 110) for (const s of [-1, 1]) L.push(`<circle cx="${x}" cy="${by + s * (bh / 2 + 14)}" r="15" fill="#3a2614" stroke="#120a04" stroke-width="3"/>${s > 0 ? `<path d="M${x - 18},${by + bh / 2 + 34} q18,16 36,0" stroke="rgba(230,250,250,0.6)" stroke-width="4" fill="none"/>` : ""}`);

  /* --- Западный берег: телега, ящики, бревна; лес --- */
  L.push(P.wagon(660, 790, -33));
  L.push(crateBox(830, 930, 64, 20), crateBox(790, 990, 56, -14), P.barrel(900, 990, 32), sackPile(470, 700, 3, r));
  L.push(`<g filter="url(#soft)"><circle cx="560" cy="960" r="44" fill="#2a1a0c" stroke="#120a04" stroke-width="4"/><circle cx="560" cy="960" r="34" fill="none" stroke="#7a5530" stroke-width="9"/>${[0, 45, 90, 135].map(a => `<rect x="526" y="957" width="68" height="6" fill="#7a5530" transform="rotate(${a} 560 960)"/>`).join("")}</g>`);
  L.push(woodpile(260, 1320, 170, 3));
  L.push(rowboat(1120, 1040, 75));

  // Деревья
  const keep = (x, y, d = 160) => distTo(ROAD_W, x, y) > d && distTo(TRAIL_W, x, y) > d * 0.6 && x < bankW(y) - 70;
  for (let i = 0; i < 260; i++) {
    const x = r() * 1300, y = r() * 2000;
    if (!keep(x, y)) continue;
    if (x > 300 && x < 950 && y > 1020 && y < 1300) continue; // поляна у подписи
    if (x > 200 && x < 470 && y > 1280 && y < 1460) continue; // поленница
    const edge = Math.min(x, y, 2000 - y);
    if (edge > 260 && r() < 0.55) continue;
    if (r() < 0.2) F.pine(x, y, 55 + r() * 25); else F.tree(x, y, 65 + r() * 35);
  }
  for (let i = 0; i < 40; i++) { const x = r() * 1250, y = r() * 2000; if (keep(x, y, 120)) F.bush(x, y, 22 + r() * 14, r() < 0.2); }
  // Восточный берег: деревья за забором и пара яблонь во дворе.
  for (let i = 0; i < 70; i++) {
    const x = 1650 + r() * 1400, y = r() * 2000;
    const out = x > 2950 || y < 110 || y > 1900;
    if (!out || distTo(ROAD_E, x, y) < 140 || distTo(TRAIL_E, x, y) < 90 || x < bankE(y) + 60) continue;
    F.tree(x, y, 55 + r() * 30);
  }
  for (const [x, y] of [[2750, 1250], [2820, 1450]]) F.tree(x, y, 80, 2);
  for (let i = 0; i < 8; i++) L.push(`<circle cx="${f1(2750 + (r() - 0.5) * 150)}" cy="${f1(1350 + (r() - 0.5) * 220)}" r="6" fill="#c0302a" stroke="#4a0a0a" stroke-width="2"/>`);

  // Двор мельницы
  L.push(garden(2180, 1500, 440, 290, r));
  L.push(P.well(2480, 1150), trough(2290, 1270, 0));
  L.push(P.wagon(2560, 780, 90), P.hay(2760, 900), P.hay(2700, 1000));
  L.push(sackPile(2340, 760, 6, r), sackPile(2050, 1300, 4, r), crateBox(2400, 990, 70, 8), crateBox(2470, 1010, 60, -10), P.barrel(1860, 1260, 36), P.barrel(1930, 1240, 34));
  L.push(`<g filter="url(#soft)">${millstone(2120, 260, 80)}${millstone(2240, 280, 66)}</g>`);
  L.push(woodpile(2420, 210, 200, 2), coop(2780, 300));
  for (let i = 0; i < 7; i++) L.push(chicken(2620 + r() * 260, 400 + r() * 160, r() * 360));
  L.push(fence([[1760, 150], [2900, 150], [2900, 1860], [1660, 1860]], [[2900, 560, 120], [2380, 1860, 90]]));

  L.push(`<g fill="#0a1606" opacity="0.5" filter="url(#${K}-blur8)">${F.shadows.join("")}</g>`);
  L.push(F.tops.join(""));
  L.push(`<rect width="${W}" height="${H}" fill="url(#${K}-sun)"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="url(#${K}-vignette)"/>`);
  return L.join("\n");
}

/* ==========================================================================
   Зоны
   ========================================================================== */
const Wb = ys => ys.map(y => [bankW(y), y]), Eb = ys => ys.map(y => [bankE(y), y]);
const ZONES = [
  { id: "west", name: "Западный берег", tags: [], label: [620, 1130],
    poly: [[0, 0], ...Wb(span(0, 2000)), [0, 2000]] },
  { id: "bridge", name: "Мост", tags: [], label: [Math.round(cx(200)), 200], size: 54,
    poly: [...Wb(span(0, Y_RIVER0)), ...Eb(span(0, Y_RIVER0)).reverse()] },
  { id: "river", name: "Река", tags: ["hazard", "difficult"], label: [Math.round(cx(1330)), 1330], size: 54,
    poly: [...Wb(span(Y_RIVER0, Y_RIVER1)), ...Eb(span(Y_RIVER0, Y_RIVER1)).reverse()] },
  { id: "ford", name: "Брод", tags: ["difficult"], label: [Math.round(cx(1880)), 1880], size: 54,
    poly: [...Wb(span(Y_RIVER1, 2000)), ...Eb(span(Y_RIVER1, 2000)).reverse()] },
  { id: "mill", name: "Мельница", tags: ["cover", "elevated"], label: [1960, 1060], size: 54,
    poly: [...Eb(span(MILL.y, MILL.y + MILL.h)), [MILL.x + MILL.w, MILL.y + MILL.h], [MILL.x + MILL.w, MILL.y]] },
  { id: "yard", name: "Мельничный двор", tags: [], label: [2470, 1420], size: 56,
    poly: [...Eb(span(0, MILL.y)), [MILL.x + MILL.w, MILL.y], [MILL.x + MILL.w, MILL.y + MILL.h], ...Eb(span(MILL.y + MILL.h, 2000)), [3000, 2000], [3000, 0]] }
];
const LINKS = [
  ["west", "bridge", "short"], ["bridge", "yard", "short"], ["west", "river", "short"], ["river", "mill", "short"], ["river", "yard", "short"],
  ["bridge", "river", "short"], ["river", "ford", "short"], ["west", "ford", "short"], ["ford", "yard", "short"], ["mill", "yard", "short"]
];

const EXTRA = `<defs>
  ${[["#9ccf5a", "#4f8a2c", "#24481a"], ["#8fc04e", "#3f7a2a", "#1d3d16"], ["#b0c95a", "#6a8a2e", "#33461a"], ["#7fb84e", "#35702a", "#163414"]].map((c, i) => `<radialGradient id="${K}-lobe${i}" cx="36%" cy="30%" r="72%"><stop offset="0" stop-color="${c[0]}"/><stop offset="0.55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></radialGradient>`).join("")}
  <radialGradient id="${K}-bush" cx="36%" cy="30%" r="72%"><stop offset="0" stop-color="#8ab54c"/><stop offset="0.6" stop-color="#456e26"/><stop offset="1" stop-color="#1f3a12"/></radialGradient>
  <radialGradient id="${K}-rock0" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#b3ad9c"/><stop offset="0.6" stop-color="#857f70"/><stop offset="1" stop-color="#4f4a40"/></radialGradient>
  <radialGradient id="${K}-rock1" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#9c9a8c"/><stop offset="0.6" stop-color="#6f6d62"/><stop offset="1" stop-color="#3c3b35"/></radialGradient>
  <radialGradient id="${K}-stone" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#bdb6a6"/><stop offset="1" stop-color="#7a7466"/></radialGradient>
  <pattern id="${K}-leaves" width="46" height="46" patternUnits="userSpaceOnUse"><path d="M6,8 q6,-6 12,0 M28,4 q5,6 0,12 M14,30 q6,-5 12,1 M34,26 q-6,5 -1,11 M4,40 q5,-4 10,0" stroke="rgba(10,30,6,0.55)" stroke-width="2.4" fill="none"/><path d="M8,6 q5,-4 9,0 M30,30 q4,-4 8,0" stroke="rgba(220,255,160,0.25)" stroke-width="2" fill="none"/></pattern>
  <filter id="${K}-mottleD" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.0035" numOctaves="4" seed="21"/><feColorMatrix type="matrix" values="0 0 0 0 0.12  0 0 0 0 0.16  0 0 0 0 0.05  0 0 0 1.4 -0.55"/></filter>
  <filter id="${K}-mottleL" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="3" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 0.62  0 0 0 0 0.66  0 0 0 0 0.3  0 0 0 1.2 -0.6"/></filter>
  <filter id="${K}-roadTex" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" seed="4"/><feColorMatrix type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.17  0 0 0 0 0.08  0 0 0 1.1 -0.45"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <filter id="${K}-dirtTex" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="4" seed="12"/><feColorMatrix type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0 0.12  0 0 0 1.1 -0.45"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <filter id="${K}-waterTex" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.014 0.004" numOctaves="3" seed="5"/><feColorMatrix type="matrix" values="0 0 0 0 0.75  0 0 0 0 0.92  0 0 0 0 0.95  0 0 0 1.2 -0.62"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <filter id="${K}-loftShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="-14" dy="-14" stdDeviation="10" flood-color="rgba(0,0,0,0.7)"/></filter>
  <filter id="${K}-blur8" filterUnits="userSpaceOnUse" x="-200" y="-200" width="3400" height="2400"><feGaussianBlur stdDeviation="8"/></filter>
  <filter id="${K}-blur12" filterUnits="userSpaceOnUse" x="-200" y="-200" width="3400" height="2400"><feGaussianBlur stdDeviation="12"/></filter>
  <filter id="${K}-blur40" filterUnits="userSpaceOnUse" x="-200" y="-200" width="3400" height="2400"><feGaussianBlur stdDeviation="40"/></filter>
  <radialGradient id="${K}-sun" cx="62%" cy="40%" r="60%"><stop offset="0" stop-color="rgba(255,236,170,0.16)"/><stop offset="1" stop-color="rgba(255,236,170,0)"/></radialGradient>
  <radialGradient id="${K}-vignette" cx="50%" cy="50%" r="72%"><stop offset="0.6" stop-color="rgba(8,16,4,0)"/><stop offset="1" stop-color="rgba(8,16,4,0.5)"/></radialGradient>
</defs>`;

export default {
  key: "river-crossing", name: "Переправа у старой мельницы", folder: "Фэнтези", worlds: ["fantasy", "terrinoth", "mythic"],
  bgColor: "#1f2c16",
  extraDefs: EXTRA,
  draw, zones: ZONES, links: LINKS,
  style: { tint: "rgba(255,240,190,0.04)", line: "rgba(255,236,170,0.85)", text: "#fff1c4" }
};
