import { W, H, rng, f1, poly } from "../lib.mjs";

/* ==========================================================================
   Карта: засада на лесной дороге (лес сверху, день, тени крон)
   ========================================================================== */
const K = "forest";

/* ---------- геометрия ---------- */
const roadY = x => 1050 + 120 * Math.sin(2 * Math.PI * x / 3000 + 0.6); // ось тракта
const BAND = 200;                                                       // полуширина зоны «Тракт»
const ROAD_HALF = 118;                                                  // полуширина колеи
const XS = [0, 250, 500, 750, 1000, 1100, 1250, 1500, 1800, 2000, 2250, 2500, 2750, 3000];
const north = x => [x, Math.round(roadY(x) - BAND)];
const south = x => [x, Math.round(roadY(x) + BAND)];
const between = (a, b) => XS.filter(x => x >= a && x <= b);

// Русло оврага (ось), снизу карты к восточному краю.
const RAVINE = [[1330, 2120], [1430, 1940], [1600, 1810], [1840, 1760], [2080, 1700], [2330, 1610], [2580, 1580], [2820, 1520], [3120, 1500]];

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
const inLabel = (x, y) => x > 1840 && x < 2480 && y > 1250 && y < 1560; // место подписи оврага
const near = (x, y, pts, d) => pts.some(p => Math.hypot(p[0] - x, p[1] - y) < d);
const ravineDist = (x, y) => Math.min(...sampleLine(RAVINE, 40).map(p => Math.hypot(p.x - x, p.y - y)));

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

/* ---------- особые предметы ---------- */
function fallenTree(x0, y0, ang, L) {
  // Вывороченный ствол: корневой диск у (x0,y0), крона в сторону угла ang.
  const o = [];
  o.push(`<g transform="translate(${x0} ${y0}) rotate(${ang})">`);
  // яма от корней
  o.push(`<ellipse cx="-60" cy="0" rx="70" ry="125" fill="#2a1d10"/><ellipse cx="-55" cy="6" rx="52" ry="100" fill="#1d140a"/>`);
  // ветви у вершины
  const br = [[0.72, -50, 165], [0.78, 40, 185], [0.86, -35, 145], [0.9, 30, 140], [0.95, -12, 120], [0.62, 60, 125], [0.58, -65, 115]];
  for (const [t, a, l] of br) {
    const bx = L * t, rad = a * Math.PI / 180;
    const ex = bx + Math.cos(rad) * l, ey = Math.sin(rad) * l;
    o.push(`<path d="M${bx},0 Q${f1(bx + Math.cos(rad) * l * 0.5 + 20)},${f1(ey * 0.4)} ${f1(ex)},${f1(ey)}" stroke="#2a1a0c" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M${bx},0 Q${f1(bx + Math.cos(rad) * l * 0.5 + 20)},${f1(ey * 0.4)} ${f1(ex)},${f1(ey)}" stroke="#6e5434" stroke-width="13" fill="none" stroke-linecap="round"/>`);
    o.push(`<path d="M${f1(bx + (ex - bx) * 0.6)},${f1(ey * 0.6)} l${f1(40)},${f1(a > 0 ? 40 : -40)} M${f1(bx + (ex - bx) * 0.8)},${f1(ey * 0.8)} l${f1(50)},${f1(a > 0 ? -20 : 20)}" stroke="#5a4428" stroke-width="7" stroke-linecap="round"/>`);
    // засохшая листва
    for (let k = 0; k < 9; k++) { const t2 = 0.45 + k * 0.07, jx = Math.sin(k * 7.1 + a) * 24, jy = Math.cos(k * 5.3 + l) * 24; o.push(`<ellipse cx="${f1(bx + (ex - bx) * t2 + jx)}" cy="${f1(ey * t2 + jy)}" rx="${11 + (k % 3) * 3}" ry="7" transform="rotate(${k * 41} ${f1(bx + (ex - bx) * t2 + jx)} ${f1(ey * t2 + jy)})" fill="${["#7d7a34", "#9a6a2c", "#6f7a36", "#8a8a3a"][k % 4]}" stroke="#3a3416" stroke-width="1.5"/>`); }
  }
  // ствол (сужается)
  o.push(`<polygon points="0,-58 ${L},-22 ${L + 18},0 ${L},22 0,58" fill="#1f1308"/>`);
  o.push(`<polygon points="4,-50 ${L},-17 ${L + 10},0 ${L},17 4,50" fill="url(#${K}-bark)"/>`);
  for (let i = 0; i < 9; i++) { const yy = -40 + i * 10; o.push(`<path d="M${20 + (i % 3) * 30},${yy} q${L * 0.3},${(i % 2 ? 4 : -4)} ${L * 0.85},${f1(-yy * 0.55)}" stroke="rgba(30,18,6,0.55)" stroke-width="2.5" fill="none"/>`); }
  o.push(`<ellipse cx="${L * 0.35}" cy="-18" rx="30" ry="9" fill="#4b6a2a" opacity="0.8"/><ellipse cx="${L * 0.5}" cy="14" rx="22" ry="7" fill="#5c7a30" opacity="0.7"/>`);
  // корневой диск
  o.push(`<ellipse cx="0" cy="0" rx="34" ry="150" fill="#3b2a18" stroke="#1d130a" stroke-width="5"/>`);
  for (let i = 0; i < 11; i++) { const yy = -130 + i * 26; o.push(`<path d="M0,${yy * 0.55} q-40,${yy * 0.2} -${70 + (i % 3) * 25},${f1(yy * 1.05)}" stroke="#4e3820" stroke-width="${6 + (i % 2) * 4}" fill="none" stroke-linecap="round"/>`); }
  o.push(`<ellipse cx="6" cy="0" rx="18" ry="100" fill="#5b4227"/>`);
  o.push(`</g>`);
  return `<g filter="url(#soft)">${o.join("")}</g>`;
}
function stump(x, y, R) {
  let rings = "";
  for (let i = 1; i < 5; i++) rings += `<circle cx="${x}" cy="${y}" r="${f1(R * (1 - i * 0.2))}" fill="none" stroke="rgba(110,70,30,0.6)" stroke-width="2"/>`;
  return `<g filter="url(#soft)"><circle cx="${x}" cy="${y}" r="${R + 8}" fill="#3b2614"/><circle cx="${x}" cy="${y}" r="${R}" fill="#c9a06a"/>${rings}<path d="M${x},${y} l${R * 0.8},${-R * 0.3}" stroke="#5a3a1c" stroke-width="3"/></g>`;
}
function log(x, y, len, rot, R = 22) {
  return `<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})"><rect x="${x - len / 2}" y="${y - R}" width="${len}" height="${R * 2}" rx="${R}" fill="url(#${K}-bark)" stroke="#1f1308" stroke-width="4"/>
    <ellipse cx="${x + len / 2 - R * 0.3}" cy="${y}" rx="${R * 0.55}" ry="${R * 0.9}" fill="#c9a06a" stroke="#5a3a1c" stroke-width="2"/></g>`;
}
function tent(x, y, w, h, rot, cA, cB) {
  // Палатка: двускатная крыша сверху, светлый и теневой скаты, растяжки, полог входа.
  const o = [`<g transform="rotate(${rot} ${x} ${y})">`];
  const pegs = [[-w / 2 - 50, -h / 2 - 30], [w / 2 + 50, -h / 2 - 30], [-w / 2 - 50, h / 2 + 30], [w / 2 + 50, h / 2 + 30], [0, -h / 2 - 60], [0, h / 2 + 60]];
  for (const [px, py] of pegs) o.push(`<path d="M${x + Math.sign(px) * w * 0.35},${y + Math.sign(py) * h / 2} L${x + px},${y + py}" stroke="rgba(230,215,180,0.7)" stroke-width="2.5"/><circle cx="${x + px}" cy="${y + py}" r="5" fill="#3b2614"/>`);
  o.push(`<g filter="url(#soft)"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h / 2}" fill="${cA}" stroke="#2a1c0e" stroke-width="4"/>
    <rect x="${x - w / 2}" y="${y}" width="${w}" height="${h / 2}" fill="${cB}" stroke="#2a1c0e" stroke-width="4"/>
    <path d="M${x - w / 2},${y} H${x + w / 2}" stroke="#2a1c0e" stroke-width="7"/>
    ${[0.25, 0.5, 0.75].map(t => `<path d="M${x - w / 2 + w * t},${y - h / 2} V${y + h / 2}" stroke="rgba(0,0,0,0.18)" stroke-width="3"/>`).join("")}
    <rect x="${x - w * 0.3}" y="${y - h * 0.38}" width="${w * 0.18}" height="${h * 0.22}" fill="rgba(0,0,0,0.12)"/>
    <polygon points="${x + w / 2},${y - h / 2} ${x + w / 2 + 46},${y} ${x + w / 2},${y + h / 2}" fill="#1d140b"/>
    <polygon points="${x + w / 2},${y - h / 2} ${x + w / 2 + 30},${y - 8} ${x + w / 2},${y}" fill="${cA}" opacity="0.85" stroke="#2a1c0e" stroke-width="2"/></g>`);
  o.push(`</g>`);
  return o.join("");
}
function campfire(x, y) {
  const o = [];
  o.push(`<circle cx="${x}" cy="${y}" r="250" fill="url(#fireglow)" opacity="0.6"/>`);
  o.push(`<circle cx="${x}" cy="${y}" r="78" fill="#2a2018" opacity="0.8"/>`);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; o.push(`<ellipse cx="${f1(x + Math.cos(a) * 62)}" cy="${f1(y + Math.sin(a) * 62)}" rx="17" ry="13" transform="rotate(${f1(a * 57.3)} ${f1(x + Math.cos(a) * 62)} ${f1(y + Math.sin(a) * 62)})" fill="${i % 2 ? "#77736a" : "#8d887c"}" stroke="#2a2723" stroke-width="3"/>`); }
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI + 0.3; o.push(`<path d="M${f1(x - Math.cos(a) * 44)},${f1(y - Math.sin(a) * 44)} L${f1(x + Math.cos(a) * 44)},${f1(y + Math.sin(a) * 44)}" stroke="#2a170a" stroke-width="15" stroke-linecap="round"/>`); }
  o.push(`<circle cx="${x}" cy="${y}" r="36" fill="#ff7a1e" filter="url(#glow)"/><circle cx="${x}" cy="${y}" r="22" fill="#ffc04a"/><circle cx="${x - 4}" cy="${y - 3}" r="10" fill="#fff0a8"/>`);
  // вертел над огнём и котелок рядом
  o.push(`<g filter="url(#soft)"><path d="M${x - 70},${y - 46} L${x + 70},${y + 46}" stroke="#3a2a1a" stroke-width="7" stroke-linecap="round"/>${[[-70, -46], [70, 46]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="9" fill="#5a3a1c" stroke="#24160a" stroke-width="3"/>`).join("")}
    <ellipse cx="${x + 8}" cy="${y + 5}" rx="22" ry="12" transform="rotate(33 ${x + 8} ${y + 5})" fill="#8a4a2a" stroke="#3a1a0a" stroke-width="3"/>
    <circle cx="${x + 105}" cy="${y - 40}" r="24" fill="#252525" stroke="#0d0d0d" stroke-width="4"/><circle cx="${x + 105}" cy="${y - 40}" r="16" fill="#6b5a32"/></g>`);
  return o.join("");
}
function bedroll(x, y, rot, c) {
  return `<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})"><rect x="${x - 34}" y="${y - 85}" width="68" height="170" rx="22" fill="${c}" stroke="#2a1c0e" stroke-width="3"/><rect x="${x - 34}" y="${y - 85}" width="68" height="50" rx="20" fill="rgba(255,255,255,0.18)"/><rect x="${x - 30}" y="${y + 50}" width="60" height="38" rx="18" fill="#6e5a3a" stroke="#2a1c0e" stroke-width="3"/></g>`;
}
function rack(x, y, rot) {
  return `<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})"><rect x="${x - 80}" y="${y - 8}" width="160" height="16" fill="#5a3a1c" stroke="#24160a" stroke-width="3"/>
    ${[-55, -18, 18, 55].map((dx, i) => `<path d="M${x + dx},${y - 50} L${x + dx + (i % 2 ? 6 : -6)},${y + 55}" stroke="#7a5a32" stroke-width="7" stroke-linecap="round"/><path d="M${x + dx},${y - 50} l${i % 2 ? 4 : -4},-26" stroke="#b9bcc0" stroke-width="10" stroke-linecap="round"/>`).join("")}</g>`;
}
function chest(x, y, rot) {
  return `<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})"><rect x="${x - 45}" y="${y - 30}" width="90" height="60" rx="8" fill="#7a4a22" stroke="#2a170a" stroke-width="4"/><path d="M${x - 45},${y - 8} H${x + 45} M${x - 25},${y - 30} V${y + 30} M${x + 25},${y - 30} V${y + 30}" stroke="#3a3530" stroke-width="6"/><rect x="${x - 7}" y="${y - 12}" width="14" height="16" fill="#d6b14a"/></g>`;
}
function crateBox(x, y, s, rot) {
  return `<g filter="url(#soft)" transform="rotate(${rot} ${x} ${y})"><rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" fill="#9a6a38" stroke="#3b2412" stroke-width="5"/>
    <path d="M${x - s / 2},${y - s / 6} H${x + s / 2} M${x - s / 2},${y + s / 6} H${x + s / 2}" stroke="#5a3a1a" stroke-width="4"/><rect x="${x - s / 2 + 5}" y="${y - s / 2 + 5}" width="${s - 10}" height="${s - 10}" fill="none" stroke="#c08a50" stroke-width="2" opacity="0.5"/></g>`;
}
function barrel(x, y, R = 40) {
  return `<g filter="url(#soft)"><circle cx="${x}" cy="${y}" r="${R}" fill="url(#barrelTop)" stroke="#2a170a" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${R * 0.86}" fill="none" stroke="#3b3b3b" stroke-width="5"/><path d="M${x - R * 0.6},${y} H${x + R * 0.6}" stroke="rgba(40,20,8,0.5)" stroke-width="2"/></g>`;
}

/* ==========================================================================
   Рисунок
   ========================================================================== */
function draw() {
  const r = rng("forest-road");
  const F = makeFlora(r);
  const L = [];

  // Земля: трава, пятна, мелкое зерно.
  L.push(`<rect width="${W}" height="${H}" fill="#55722f"/>`);
  L.push(`<rect width="${W}" height="${H}" filter="url(#${K}-mottleD)"/>`);
  L.push(`<rect width="${W}" height="${H}" filter="url(#${K}-mottleL)"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="#000" filter="url(#grain)" opacity="0.35"/>`);
  // Подстилка в чаще: темнее, бурая хвоя.
  L.push(`<path d="${smooth([[0, 0], [1880, 0], [1840, 200], [1500, 250], [1080, 290], [1040, 700], [900, 860], [500, 900], [0, 960]], true)}" fill="#2f3a1c" opacity="0.55" filter="url(#${K}-blur40)"/>`);
  // Пучки травы и цветы (под дорогой и обрывами — их закроют).
  let tufts = "", flowers = "";
  for (let i = 0; i < 1500; i++) {
    const x = r() * W, y = r() * H;
    const c = r() < 0.5 ? "#7f9c46" : "#3f5a24";
    tufts += `<path d="M${f1(x)},${f1(y)} l-5,-11 M${f1(x)},${f1(y)} l1,-14 M${f1(x)},${f1(y)} l6,-10" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`;
    if (r() < 0.08) flowers += `<circle cx="${f1(x + 8)}" cy="${f1(y - 4)}" r="3.5" fill="${["#f1e7a0", "#e8e4f4", "#c88ad8"][Math.floor(r() * 3)]}"/>`;
  }
  L.push(`<g>${tufts}</g><g>${flowers}</g>`);

  /* --- Скалистый гребень (СВ) --- */
  const ridgeEdge = [[1840, -20], [1880, 160], [1960, 330], [2050, 520], [2200, 640], [2400, 670], [2620, 700], [2820, 760], [3040, 790]];
  const ridgeTop = [...ridgeEdge, [3040, -40]];
  L.push(`<clipPath id="${K}-plateauClip"><path d="${smooth(ridgeTop, true)}"/></clipPath>`);
  // плато
  L.push(`<path d="${smooth(ridgeTop, true)}" fill="#8c8674"/>`);
  L.push(`<path d="${smooth(ridgeTop, true)}" fill="#000" filter="url(#${K}-rockTex)" opacity="0.55"/>`);
  // обрыв: полоса скальных граней от кромки вниз к тракту
  const cliff = sampleLine(ridgeEdge, 14);
  L.push(cliffBand(r, cliff, 1, i => 70 + 26 * Math.sin(i * 0.37) + 14 * Math.sin(i * 1.3), ["#4d483f", "#5c564b", "#423e36", "#6a6457", "#575247"]));
  let scree = "";
  for (const [i, p] of cliff.entries()) if (r() < 0.55) { const l = 90 + 26 * Math.sin(i * 0.37) + r() * 50; scree += `<circle cx="${f1(p.x + p.nx * l)}" cy="${f1(p.y + p.ny * l)}" r="${f1(4 + r() * 9)}" fill="${r() < 0.5 ? "#8a8474" : "#6a6558"}" stroke="#2b2925" stroke-width="2"/>`; }
  L.push(`<path d="${smooth(ridgeEdge)}" stroke="#b4ad97" stroke-width="6" fill="none" stroke-linecap="round"/>`);
  L.push(`<g>${scree}</g>`);
  // мох и трава на плато
  for (let i = 0; i < 12; i++) { const x = 1980 + r() * 1020, y = r() * 600; L.push(`<path d="${smooth(blob(r, x, y, 40 + r() * 50, 8, 0.35), true)}" fill="${r() < 0.5 ? "#5f7034" : "#6f7a3e"}" opacity="0.45" filter="url(#${K}-blur8)"/>`); }
  // трещины и террасы на плато
  for (let i = 0; i < 9; i++) {
    const x = 2000 + r() * 950, y = 40 + r() * 520;
    L.push(`<path d="M${f1(x)},${f1(y)} l${f1(30 + r() * 60)},${f1(r() * 40 - 10)} l${f1(30 + r() * 50)},${f1(r() * 40 - 30)} l${f1(20 + r() * 40)},${f1(r() * 30)}" stroke="rgba(30,28,24,0.55)" stroke-width="4" fill="none"/>`);
  }
  // уступ внутри плато (вторая ступень)
  const ledge = [[2280, -20], [2300, 140], [2420, 260], [2640, 300], [2860, 350], [3040, 380]];
  L.push(`<path d="${smooth([...ledge, [3040, -30]], true)}" fill="#9a947f" opacity="0.6"/>`);
  L.push(cliffBand(r, sampleLine(ledge, 14), 1, i => 34 + 10 * Math.sin(i * 0.5), ["#5a554a", "#6b655a", "#4e4a41", "#77715f"]));
  L.push(`<path d="${smooth(ledge)}" stroke="#b9b29b" stroke-width="5" fill="none"/>`);
  // щебень и лишайник
  let grav = "";
  for (let i = 0; i < 420; i++) { const x = 1900 + r() * 1100, y = r() * 800; if (y > 800 - (x - 1900) * 0.2 && x < 2100) continue; grav += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(2 + r() * 5)}" fill="${["#a39d88", "#6e6858", "#b8b296", "#9aa25a"][Math.floor(r() * 4)]}" opacity="0.8"/>`; }
  L.push(`<g clip-path="url(#${K}-plateauClip)">${grav}</g>`);

  /* --- Овраг с ручьём (ЮВ) --- */
  const rv = smooth(RAVINE);
  L.push(`<path d="${rv}" stroke="#2c2416" stroke-width="470" fill="none" stroke-linecap="round" opacity="0.35" filter="url(#${K}-blur12)"/>`);
  L.push(`<path d="${rv}" stroke="#5a4a30" stroke-width="420" fill="none" stroke-linecap="round"/>`);
  L.push(`<path d="${rv}" stroke="#4a3c25" stroke-width="330" fill="none" stroke-linecap="round"/>`);
  L.push(`<path d="${rv}" stroke="#3a2f1d" stroke-width="230" fill="none" stroke-linecap="round"/>`);
  L.push(`<path d="${rv}" stroke="#000" stroke-width="420" fill="none" filter="url(#${K}-rockTex)" opacity="0.5"/>`);
  const rvS = sampleLine(RAVINE, 14), rocksR = [];
  for (const sg of [1, -1]) {
    const rim = rvS.map(p => ({ x: p.x + p.nx * 212 * sg, y: p.y + p.ny * 212 * sg, nx: p.nx * sg, ny: p.ny * sg }));
    L.push(cliffBand(r, rim, -1, i => 70 + 22 * Math.sin(i * 0.41 + sg) + 12 * Math.sin(i * 1.7), ["#5e4c30", "#6a5636", "#4e3f27", "#73603e", "#584729"]));
    L.push(`<path d="${smooth(rim.filter((_, i) => i % 4 === 0).map(p => [p.x, p.y]))}" stroke="#6e7f3c" stroke-width="12" fill="none" stroke-dasharray="16 7" stroke-linecap="round"/>`);
    for (const p of rim) if (r() < 0.07) rocksR.push([p.x - p.nx * (110 + r() * 40), p.y - p.ny * (110 + r() * 40)]);
  }
  // ручей: меандрирующая линия по дну
  const stream = sampleLine(RAVINE, 70).map((p, i) => [p.x + p.nx * Math.sin(i * 0.9) * 32, p.y + p.ny * Math.sin(i * 0.9) * 32]);
  const sd = smooth(stream);
  L.push(`<path d="${sd}" stroke="#3c3322" stroke-width="120" fill="none" stroke-linecap="round"/>`);
  L.push(`<path d="${sd}" stroke="#2b5560" stroke-width="88" fill="none" stroke-linecap="round"/>`);
  L.push(`<path d="${sd}" stroke="#3f7a86" stroke-width="54" fill="none" stroke-linecap="round"/>`);
  L.push(`<path d="${sd}" stroke="#7fb6bd" stroke-width="3" fill="none" stroke-dasharray="26 40" opacity="0.8" transform="translate(0 -14)"/><path d="${sd}" stroke="#a9d4d6" stroke-width="2.5" fill="none" stroke-dasharray="14 55" opacity="0.7" transform="translate(6 12)"/>`);
  for (let i = 3; i < stream.length - 1; i += 3) { const [x, y] = stream[i]; F.rock(x + (r() - 0.5) * 50, y + (r() - 0.5) * 30, 16 + r() * 14, 1); }
  for (const [x, y] of rocksR) F.rock(x, y, 18 + r() * 22, r() < 0.5 ? 0 : 1);
  // упавшая через овраг жердь и камыши
  for (let i = 0; i < 26; i++) { const p = stream[Math.floor(r() * stream.length)]; const x = p[0] + (r() - 0.5) * 120, y = p[1] + (r() - 0.5) * 80; L.push(`<path d="M${f1(x)},${f1(y)} l-6,-24 M${f1(x)},${f1(y)} l2,-28 M${f1(x)},${f1(y)} l9,-22" stroke="#6f7e36" stroke-width="4" stroke-linecap="round"/>`); }

  /* --- Тракт --- */
  const roadPts = []; for (let x = -100; x <= 3100; x += 100) roadPts.push([x, roadY(x)]);
  const rd = smooth(roadPts);
  L.push(`<path d="${rd}" stroke="#3a2c18" stroke-width="${ROAD_HALF * 2 + 40}" fill="none" opacity="0.45" filter="url(#${K}-blur12)"/>`);
  L.push(`<path d="${rd}" stroke="#8a6c44" stroke-width="${ROAD_HALF * 2}" fill="none"/>`);
  L.push(`<path d="${rd}" stroke="#000" stroke-width="${ROAD_HALF * 2}" fill="none" filter="url(#${K}-roadTex)" opacity="0.8"/>`);
  for (const dy of [-52, 48]) L.push(`<path d="${rd}" transform="translate(0 ${dy})" stroke="#5c4428" stroke-width="20" fill="none" opacity="0.55"/><path d="${rd}" transform="translate(0 ${dy + 4})" stroke="#a88a5c" stroke-width="5" fill="none" opacity="0.4"/>`);
  L.push(`<path d="${rd}" stroke="#6f8a3a" stroke-width="16" fill="none" stroke-dasharray="40 26" opacity="0.55"/>`);
  for (const s of [-1, 1]) L.push(`<path d="${rd}" transform="translate(0 ${s * ROAD_HALF})" stroke="#6b8a36" stroke-width="12" fill="none" stroke-dasharray="10 14" opacity="0.8"/>`);
  // лужи, камни, следы
  for (const x of [380, 1350, 2150, 2700]) {
    const y = roadY(x) + (r() - 0.5) * 60;
    L.push(`<ellipse cx="${x}" cy="${f1(y)}" rx="${f1(50 + r() * 30)}" ry="${f1(20 + r() * 10)}" fill="#4d5a5a" stroke="#5a4428" stroke-width="5" opacity="0.9"/><ellipse cx="${x - 10}" cy="${f1(y - 5)}" rx="22" ry="5" fill="#9fb3b0" opacity="0.6"/>`);
  }
  let pebbles = "";
  for (let i = 0; i < 260; i++) { const x = r() * W, y = roadY(x) + (r() - 0.5) * ROAD_HALF * 2; pebbles += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(2 + r() * 4)}" fill="${r() < 0.5 ? "#a99a7e" : "#6a5a44"}"/>`; }
  L.push(pebbles);
  let hooves = "";
  for (let x = 40; x < W; x += 34 + r() * 12) { const y = roadY(x) + 4 + Math.sin(x / 70) * 10; hooves += `<path d="M${f1(x)},${f1(y)} a7,7 0 1 1 10,0" stroke="#4a361e" stroke-width="3" fill="none" opacity="0.6"/>`; }
  L.push(hooves);

  /* --- Лагерь разбойников (ЮЗ): вытоптанная поляна --- */
  L.push(`<path d="${smooth(blob(r, 620, 1690, 430, 12, 0.18), true)}" fill="#7c6440" opacity="0.85" filter="url(#${K}-blur12)"/>`);
  L.push(`<path d="${smooth(blob(r, 620, 1700, 330, 10, 0.15), true)}" fill="#8a6f48" opacity="0.6"/>`);
  L.push(`<path d="M300,1365 C380,1450 470,1520 560,1560" stroke="#7f6644" stroke-width="46" fill="none" stroke-linecap="round" opacity="0.8"/>`);

  /* ===== Растительность и камни (тени отдельно) ===== */
  // Скалы на гребне
  for (const [x, y, R] of [[2110, 470, 62], [2330, 480, 55], [2560, 520, 80], [2760, 560, 60], [2930, 640, 50], [2080, 200, 45], [2480, 130, 95], [2700, 160, 60], [2900, 250, 85], [2380, 560, 34], [2650, 620, 40], [2230, 90, 40]]) F.rock(x, y, R, Math.floor(r() * 2));
  for (const [x, y, R] of [[1980, 60, 70], [2800, 420, 58], [2900, 560, 50], [2960, 80, 66], [2300, 300, 52]]) F.pine(x, y, R);
  for (const [x, y] of [[2050, 420], [2440, 560], [2700, 300], [2200, 520], [2950, 700]]) F.bush(x, y, 34 + r() * 14);

  // Чаща (СЗ + полоса по верху): плотные кроны.
  const thicket = [];
  for (let y = 30; y < 900; y += 95) for (let x = 20; x < 1900; x += 105) {
    const jx = x + (r() - 0.5) * 70, jy = y + (r() - 0.5) * 60;
    const edge = roadY(jx) - 210;
    if (jy > edge) continue;
    if (jx > 1030 && jy > 300) continue;                // поляна поваленного дерева
    if (jx > 1820) continue;
    if (jx > 1700 && jy > 200) continue;
    thicket.push([jx, jy]);
  }
  for (const [x, y] of thicket) { if (r() < 0.22) F.pine(x, y, 60 + r() * 25); else F.tree(x, y, 70 + r() * 35, Math.floor(r() * 3)); }
  for (let i = 0; i < 70; i++) { const x = r() * 1150, y = r() * 860; if (y < roadY(x) - 190) F.bush(x, y, 28 + r() * 18, r() < 0.15); }
  for (let i = 0; i < 18; i++) { const x = 1150 + r() * 650, y = 20 + r() * 230; F.bush(x, y, 26 + r() * 14); }

  // Поляна поваленного дерева: редкие деревья, пень, папоротник.
  F.tree(1790, 330, 66, 2);
  for (const [x, y] of [[1170, 560], [1420, 580], [1730, 720]]) F.fern(x, y, 40 + r() * 15);
  for (const [x, y] of [[1220, 470], [1760, 600], [1350, 560], [1130, 830]]) F.bush(x, y, 28);

  // Опушка у тракта (южная сторона): деревья вдоль кромки, но не на поляне лагеря.
  for (let x = 1260; x < 3000; x += 120 + r() * 80) {
    const y = roadY(x) + 230 + r() * 70;
    if (ravineDist(x, y) < 300 || inLabel(x, y)) continue;
    F.tree(x, y, 70 + r() * 30);
  }
  // Деревья вокруг оврага и у нижнего края.
  for (let i = 0; i < 70; i++) {
    const x = 1250 + r() * 1800, y = 1200 + r() * 850;
    if (y < roadY(x) + 230 || ravineDist(x, y) < 280 || inLabel(x, y)) continue;
    if (r() < 0.25) F.pine(x, y, 55 + r() * 20); else F.tree(x, y, 60 + r() * 35);
  }
  for (let i = 0; i < 40; i++) { const x = 1250 + r() * 1750, y = 1200 + r() * 800; const d = ravineDist(x, y); if (d > 225 && d < 330 && y > roadY(x) + 200) F.bush(x, y, 24 + r() * 14, r() < 0.2); }
  for (let i = 0; i < 18; i++) { const x = 1300 + r() * 1700, y = 1250 + r() * 750; const d = ravineDist(x, y); if (d > 230 && y > roadY(x) + 180) F.fern(x, y, 34 + r() * 12); }
  // Лес вокруг лагеря.
  const campRing = [];
  for (let i = 0; i < 95; i++) {
    const x = -40 + r() * 1320, y = 1260 + r() * 800;
    if (y < roadY(x) + 220) continue;
    const dc = Math.hypot((x - 620) / 1.25, y - 1700);
    if (dc < 440) continue;
    if (x > 230 && x < 430 && y < 1600) continue;  // тропа к лагерю
    campRing.push([x, y]);
  }
  for (const [x, y] of campRing) { if (r() < 0.25) F.pine(x, y, 55 + r() * 20); else F.tree(x, y, 62 + r() * 30); }
  // Обочина северная: кусты вдоль тракта у гребня и чащи.
  for (let x = 30; x < 3000; x += 90 + r() * 120) { const y = roadY(x) - 175 - r() * 30; if (x > 1100 && x < 1800) continue; F.bush(x, y, 22 + r() * 12); }

  // Тени — одним размытым слоем, затем всё сверху.
  L.push(`<g fill="#0a1606" opacity="0.5" filter="url(#${K}-blur8)">${F.shadows.join("")}</g>`);
  // Поваленное дерево и лагерь — до крон, чтобы кроны их не закрывали некстати: рисуем объекты, затем кроны.
  L.push(fallenTree(1265, 745, -25, 420));
  L.push(stump(1560, 820, 34), log(1430, 870, 150, 12, 20));

  // Лагерь
  L.push(campfire(640, 1720));
  L.push(log(470, 1700, 170, 80), log(820, 1740, 170, 95), log(650, 1880, 180, 4));
  L.push(tent(330, 1600, 210, 160, -12, "#a48b62", "#7c6648"));
  L.push(tent(860, 1560, 200, 150, 14, "#6a7344", "#4c5532"));
  L.push(tent(300, 1880, 190, 150, -2, "#9a5a3a", "#73402a"));
  L.push(bedroll(560, 1560, 80, "#6a4a6a"), bedroll(980, 1800, -20, "#4a5a7a"));
  L.push(crateBox(1080, 1600, 80, 10), crateBox(1150, 1680, 70, -8), crateBox(1090, 1690, 64, 28), barrel(1170, 1590, 36), barrel(1010, 1920, 38), barrel(1075, 1950, 34));
  L.push(chest(880, 1880, -10), rack(190, 1470, -8));
  L.push(`<g filter="url(#soft)">${[[760, 1910], [800, 1930]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="34" ry="28" fill="#b89a68" stroke="#5e4a2a" stroke-width="3"/>`).join("")}</g>`);

  L.push(F.tops.join(""));

  // Чаща в тени: затемнение под пологом.
  L.push(`<path d="${smooth([[-40, -40], [1900, -40], [1860, 200], [1500, 250], [1080, 290], [1060, 720], [900, 840], [500, 870], [-40, 920]], true)}" fill="#06100a" opacity="0.42" filter="url(#${K}-blur40)"/>`);
  // Солнечные пятна и общий свет: тёплый день, края слегка затемнены.
  L.push(`<rect width="${W}" height="${H}" fill="url(#${K}-sun)"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="url(#${K}-vignette)"/>`);
  return L.join("\n");
}

/* ==========================================================================
   Зоны
   ========================================================================== */
const ZONES = [
  { id: "road", name: "Тракт", tags: [], label: [2330, 990],
    poly: [...XS.map(north), ...XS.slice().reverse().map(south)] },
  { id: "thicket", name: "Чаща", tags: ["cover", "difficult", "dark"], label: [560, 520],
    poly: [[0, 0], [1820, 0], [1820, 260], [1500, 270], [1100, 300], ...between(0, 1100).reverse().map(north)] },
  { id: "fallen", name: "Поваленное дерево", tags: ["cover"], label: [1400, 410], size: 46,
    poly: [[1100, 300], [1500, 270], [1820, 260], [1800, north(1800)[1]], ...between(1100, 1800).reverse().map(north)] },
  { id: "ridge", name: "Скалистый гребень", tags: ["elevated", "cover"], label: [2470, 330], size: 56,
    poly: [[1820, 0], [3000, 0], ...between(1800, 3000).reverse().map(north), [1820, 260]] },
  { id: "camp", name: "Лагерь разбойников", tags: ["cover"], label: [640, 1440], size: 52,
    poly: [...between(0, 1250).map(south), [1250, 2000], [0, 2000]] },
  { id: "ravine", name: "Овраг", tags: ["difficult", "hazard"], label: [2160, 1410],
    poly: [...between(1250, 3000).map(south), [3000, 2000], [1250, 2000]] }
];
// Восточная кромка «Поваленного дерева» идёт по x=1800 до тракта; гребень начинается от той же точки.
const LINKS = [
  ["road", "thicket", "short"], ["road", "fallen", "short"], ["road", "ridge", "short"], ["road", "camp", "short"], ["road", "ravine", "short"],
  ["thicket", "fallen", "short"], ["fallen", "ridge", "short"], ["thicket", "ridge", "medium"], ["camp", "ravine", "short"]
];

const EXTRA = `<defs>
  ${[["#9ccf5a", "#4f8a2c", "#24481a"], ["#8fc04e", "#3f7a2a", "#1d3d16"], ["#b0c95a", "#6a8a2e", "#33461a"], ["#7fb84e", "#35702a", "#163414"]].map((c, i) => `<radialGradient id="${K}-lobe${i}" cx="36%" cy="30%" r="72%"><stop offset="0" stop-color="${c[0]}"/><stop offset="0.55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></radialGradient>`).join("")}
  <radialGradient id="${K}-bush" cx="36%" cy="30%" r="72%"><stop offset="0" stop-color="#8ab54c"/><stop offset="0.6" stop-color="#456e26"/><stop offset="1" stop-color="#1f3a12"/></radialGradient>
  <radialGradient id="${K}-rock0" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#b3ad9c"/><stop offset="0.6" stop-color="#857f70"/><stop offset="1" stop-color="#4f4a40"/></radialGradient>
  <radialGradient id="${K}-rock1" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#9c9a8c"/><stop offset="0.6" stop-color="#6f6d62"/><stop offset="1" stop-color="#3c3b35"/></radialGradient>
  <linearGradient id="${K}-bark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2614"/><stop offset="0.35" stop-color="#7a5a36"/><stop offset="0.6" stop-color="#5e4226"/><stop offset="1" stop-color="#2a1a0c"/></linearGradient>
  <pattern id="${K}-leaves" width="46" height="46" patternUnits="userSpaceOnUse"><path d="M6,8 q6,-6 12,0 M28,4 q5,6 0,12 M14,30 q6,-5 12,1 M34,26 q-6,5 -1,11 M4,40 q5,-4 10,0" stroke="rgba(10,30,6,0.55)" stroke-width="2.4" fill="none"/><path d="M8,6 q5,-4 9,0 M30,30 q4,-4 8,0" stroke="rgba(220,255,160,0.25)" stroke-width="2" fill="none"/></pattern>
  <filter id="${K}-mottleD" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.0035" numOctaves="4" seed="21"/><feColorMatrix type="matrix" values="0 0 0 0 0.12  0 0 0 0 0.16  0 0 0 0 0.05  0 0 0 1.4 -0.55"/></filter>
  <filter id="${K}-mottleL" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="3" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 0.62  0 0 0 0 0.66  0 0 0 0 0.3  0 0 0 1.2 -0.6"/></filter>
  <filter id="${K}-roadTex" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" seed="4"/><feColorMatrix type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.17  0 0 0 0 0.08  0 0 0 1.1 -0.45"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <filter id="${K}-rockTex" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="5" seed="9"/><feColorMatrix type="matrix" values="0 0 0 0 0.18  0 0 0 0 0.17  0 0 0 0 0.14  0 0 0 1.3 -0.5"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <filter id="${K}-blur8" filterUnits="userSpaceOnUse" x="-200" y="-200" width="3400" height="2400"><feGaussianBlur stdDeviation="8"/></filter>
  <filter id="${K}-blur12" filterUnits="userSpaceOnUse" x="-200" y="-200" width="3400" height="2400"><feGaussianBlur stdDeviation="12"/></filter>
  <filter id="${K}-blur40" filterUnits="userSpaceOnUse" x="-200" y="-200" width="3400" height="2400"><feGaussianBlur stdDeviation="40"/></filter>
  <radialGradient id="${K}-sun" cx="62%" cy="40%" r="60%"><stop offset="0" stop-color="rgba(255,236,170,0.16)"/><stop offset="1" stop-color="rgba(255,236,170,0)"/></radialGradient>
  <radialGradient id="${K}-vignette" cx="50%" cy="50%" r="72%"><stop offset="0.6" stop-color="rgba(8,16,4,0)"/><stop offset="1" stop-color="rgba(8,16,4,0.55)"/></radialGradient>
</defs>`;

export default {
  key: "forest-road", name: "Засада на лесной дороге", folder: "Фэнтези", worlds: ["fantasy", "terrinoth", "mythic"],
  bgColor: "#1d2a12",
  extraDefs: EXTRA,
  draw, zones: ZONES, links: LINKS,
  style: { tint: "rgba(255,240,190,0.04)", line: "rgba(255,236,170,0.85)", text: "#fff1c4" }
};
