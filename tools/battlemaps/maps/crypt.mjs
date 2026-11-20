import { W, H, rng, f1, poly } from "../lib.mjs";

/* ==========================================================================
   Карта: склеп под часовней (вид сверху, каменные залы в толще скалы)
   ========================================================================== */
const R = rng("crypt-detail");
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
/** Разбить контур на мелкие отрезки с дрожанием — «рваный» край скалы. */
function roughen(pts, step = 40, amp = 14) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) { const t = k / n; out.push([p[0] + (q[0] - p[0]) * t + (R() - 0.5) * amp * 2, p[1] + (q[1] - p[1]) * t + (R() - 0.5) * amp * 2]); }
  }
  return out;
}

/* ---------- текстуры ---------- */
function flagstones() {
  const r = rng("crypt-flags"), out = [], S = 480;
  for (let row = 0; row < 4; row++) {
    const y = row * 120;
    let x = -r() * 120;
    while (x < S) {
      const w = 100 + r() * 110, s = 0.78 + r() * 0.3, tint = r() * 10;
      const j = () => (r() - 0.5) * 6;
      const pts = [[x + 4 + j(), y + 4 + j()], [x + w - 4 + j(), y + 4 + j()], [x + w - 4 + j(), y + 116 + j()], [x + 4 + j(), y + 116 + j()]];
      out.push(`<polygon points="${poly(pts)}" fill="rgb(${Math.round(138 * s + tint)},${Math.round(122 * s + tint / 2)},${Math.round(100 * s)})" stroke="#1d1a17" stroke-width="3" stroke-linejoin="round"/>`);
      out.push(`<path d="M${f1(x + 8)},${f1(y + 8)} H${f1(x + w - 10)}" stroke="rgba(255,250,235,0.08)" stroke-width="3"/>`);
      if (r() < 0.35) { const cx = x + w * r(), cy = y + 20 + r() * 80; out.push(`<path d="M${f1(cx)},${f1(cy)} l${f1((r() - 0.5) * 50)},${f1((r() - 0.5) * 40)} l${f1((r() - 0.5) * 40)},${f1((r() - 0.5) * 40)}" stroke="rgba(15,12,10,0.55)" stroke-width="2" fill="none"/>`); }
      if (r() < 0.25) out.push(`<ellipse cx="${f1(x + w * r())}" cy="${f1(y + 30 + r() * 60)}" rx="${f1(10 + r() * 22)}" ry="${f1(6 + r() * 12)}" fill="rgba(70,85,50,0.25)"/>`);
      x += w;
    }
  }
  return `<pattern id="crypt-flags" width="${S}" height="${S}" patternUnits="userSpaceOnUse"><rect width="${S}" height="${S}" fill="#26221e"/>${out.join("")}</pattern>`;
}
function blocks() {
  const r = rng("crypt-blocks"), out = [];
  for (let row = 0; row < 6; row++) for (let x = -(row % 2) * 30; x < 180; x += 60) {
    const s = 0.75 + r() * 0.35;
    out.push(`<rect x="${x + 2}" y="${row * 30 + 2}" width="56" height="26" rx="4" fill="rgb(${Math.round(78 * s)},${Math.round(72 * s)},${Math.round(68 * s)})" stroke="#0e0c0b" stroke-width="2.5"/><path d="M${x + 5},${row * 30 + 5} h48" stroke="rgba(255,240,220,0.12)" stroke-width="2"/>`);
  }
  return `<pattern id="crypt-blocks" width="180" height="180" patternUnits="userSpaceOnUse"><rect width="180" height="180" fill="#121010"/>${out.join("")}</pattern>`;
}

const EXTRA = `<defs>
  ${flagstones()}${blocks()}
  <filter id="crypt-rock" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="6" seed="17" result="n"/>
    <feDiffuseLighting in="n" surfaceScale="5" lighting-color="#ffffff" result="l"><feDistantLight azimuth="225" elevation="38"/></feDiffuseLighting>
    <feComposite in="l" in2="SourceGraphic" operator="arithmetic" k1="1" k2="0" k3="0" k4="0"/></filter>
  <filter id="crypt-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="crypt-blur4" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
  <radialGradient id="crypt-stone" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#a39b8e"/><stop offset="1" stop-color="#57514a"/></radialGradient>
  <radialGradient id="crypt-darkstone" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#7b746a"/><stop offset="1" stop-color="#3a3530"/></radialGradient>
  <linearGradient id="crypt-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a5232"/><stop offset="1" stop-color="#3d2614"/></linearGradient>
  <radialGradient id="crypt-abyss" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000"/><stop offset="0.6" stop-color="#05070a"/><stop offset="0.9" stop-color="#151a1e"/><stop offset="1" stop-color="#22272a"/></radialGradient>
  <radialGradient id="crypt-torch" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(255,190,90,0.55)"/><stop offset="0.45" stop-color="rgba(255,140,50,0.2)"/><stop offset="1" stop-color="rgba(255,110,30,0)"/></radialGradient>
  <radialGradient id="crypt-rune" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(220,40,60,0.35)"/><stop offset="0.6" stop-color="rgba(170,20,60,0.18)"/><stop offset="1" stop-color="rgba(120,0,40,0)"/></radialGradient>
  <radialGradient id="crypt-day" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(200,215,235,0.4)"/><stop offset="1" stop-color="rgba(160,180,210,0)"/></radialGradient>
  <radialGradient id="crypt-ghost" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(120,200,210,0.28)"/><stop offset="1" stop-color="rgba(80,160,180,0)"/></radialGradient>
  <radialGradient id="crypt-hole" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity="1"/><stop offset="0.55" stop-color="#000" stop-opacity="0.7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <radialGradient id="crypt-vignette" cx="50%" cy="50%" r="72%"><stop offset="0.55" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,0,0,0.7)"/></radialGradient>
  <g id="crypt-skull"><ellipse cx="0" cy="-2" rx="11" ry="12" fill="#ddd5c2" stroke="#3a3328" stroke-width="2"/><rect x="-6" y="7" width="12" height="7" rx="2" fill="#cfc6b1" stroke="#3a3328" stroke-width="1.5"/><circle cx="-4.5" cy="-1" r="3.2" fill="#1b1612"/><circle cx="4.5" cy="-1" r="3.2" fill="#1b1612"/><path d="M0,3 l-1.6,3 h3.2z" fill="#1b1612"/></g>
  <g id="crypt-bone"><path d="M-14,0 H14" stroke="#d6cdb8" stroke-width="5" stroke-linecap="round"/><circle cx="-15" cy="-3" r="3.6" fill="#d6cdb8"/><circle cx="-15" cy="3" r="3.6" fill="#d6cdb8"/><circle cx="15" cy="-3" r="3.6" fill="#d6cdb8"/><circle cx="15" cy="3" r="3.6" fill="#d6cdb8"/></g>
  <g id="crypt-candle"><circle r="7" fill="#e9e0c4" stroke="#6b5f45" stroke-width="2"/><circle r="4" fill="#ffd36b" filter="url(#glow)"/><circle r="1.8" fill="#fff6d0"/></g>
</defs>`;

/* ---------- предметы ---------- */
const lights = []; // [x, y, радиус, сила] — дыры во тьме
const glows = [];  // цветные ореолы

function skull(x, y, s = 1, rot = 0) { return `<use href="#crypt-skull" transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s})"/>`; }
function bone(x, y, s = 1, rot = 0) { return `<use href="#crypt-bone" transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s})"/>`; }
function candle(x, y, light = 90) { lights.push([x, y, light, 0.6]); return `<use href="#crypt-candle" transform="translate(${f1(x)} ${f1(y)})"/>`; }
function scatterBones(cx, cy, rad, n) {
  const o = [];
  for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, d = R() * rad; o.push(R() < 0.2 ? skull(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr(0.8, 1.1), rr(-60, 60)) : bone(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr(0.6, 1.1), rr(0, 180))); }
  return o.join("");
}
function rubble(cx, cy, rad, n, big = 22) {
  const o = [];
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * rad, s = rr(0.35, 1) * big;
    const c = Math.round(rr(70, 115));
    o.push(`<path d="${smooth(blobPts(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, s * rr(0.6, 1), 6, 0.5, R() * 3))}" fill="rgb(${c},${c - 5},${c - 12})" stroke="#1a1714" stroke-width="2.5"/>`);
  }
  return `<g filter="url(#soft)">${o.join("")}</g>`;
}
function cobweb(x, y, sx, sy, size = 120) {
  const o = [], n = 6;
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2; o.push(`M${x},${y} l${f1(Math.cos(a) * size * sx)},${f1(Math.sin(a) * size * sy)}`); }
  for (let k = 1; k <= 4; k++) {
    const rad = size * k / 4.3; let d = "";
    for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2, rad2 = rad * (i % 2 ? 0.9 : 1); d += `${i ? "L" : "M"}${f1(x + Math.cos(a) * rad2 * sx)},${f1(y + Math.sin(a) * rad2 * sy)} `; }
    o.push(d);
  }
  return `<path d="${o.join(" ")}" stroke="rgba(230,230,225,0.35)" stroke-width="1.6" fill="none"/>`;
}
function torch(x, y, rot) {
  lights.push([x, y, 340, 0.95]); glows.push(`<circle cx="${x}" cy="${y}" r="300" fill="url(#crypt-torch)"/>`);
  return `<g transform="rotate(${rot} ${x} ${y})"><rect x="${x - 7}" y="${y - 30}" width="14" height="34" rx="3" fill="#3a2a1a" stroke="#120c07" stroke-width="2"/><rect x="${x - 11}" y="${y - 30}" width="22" height="8" fill="#2a2a2a"/>
    <ellipse cx="${x}" cy="${y + 8}" rx="12" ry="16" fill="#ff8a2a" filter="url(#glow)"/><ellipse cx="${x}" cy="${y + 6}" rx="6" ry="9" fill="#ffe08a"/></g>`;
}
function brazier(x, y, r = 34) {
  lights.push([x, y, 360, 1]); glows.push(`<circle cx="${x}" cy="${y}" r="330" fill="url(#crypt-torch)"/>`);
  return `<g filter="url(#soft)"><circle cx="${x}" cy="${y}" r="${r}" fill="#2a2724" stroke="#0c0b0a" stroke-width="5"/>${[0, 1, 2].map(i => { const a = i * 2.094 + 0.5; return `<circle cx="${f1(x + Math.cos(a) * r)}" cy="${f1(y + Math.sin(a) * r)}" r="7" fill="#1c1a18"/>`; }).join("")}</g>
    <circle cx="${x}" cy="${y}" r="${r * 0.75}" fill="#5a1a08"/><circle cx="${x}" cy="${y}" r="${r * 0.6}" fill="#ff7a1e" filter="url(#glow)"/><circle cx="${x - 4}" cy="${y - 3}" r="${r * 0.3}" fill="#ffe08a"/>`;
}
function pillar(x, y, s = 74, round = false) {
  if (round) return `<g filter="url(#soft)"><circle cx="${x}" cy="${y}" r="${s * 0.62}" fill="#3a3530" stroke="#14110f" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${s * 0.48}" fill="url(#crypt-stone)" stroke="#2a2622" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${s * 0.3}" fill="none" stroke="rgba(255,255,240,0.12)" stroke-width="3"/></g>`;
  const h = s / 2;
  return `<g filter="url(#soft)"><rect x="${x - h - 8}" y="${y - h - 8}" width="${s + 16}" height="${s + 16}" fill="#2e2a26" stroke="#121010" stroke-width="4"/><rect x="${x - h}" y="${y - h}" width="${s}" height="${s}" fill="url(#crypt-stone)" stroke="#2a2622" stroke-width="3"/><path d="M${x - h},${y - h} L${x + h},${y + h} M${x + h},${y - h} L${x - h},${y + h}" stroke="rgba(0,0,0,0.18)" stroke-width="2"/></g>`;
}
/** Гроб сверху: шестигранный, крышка закрыта/сдвинута (внутри скелет). */
function coffin(x, y, L, Wd, rot, open = false) {
  const shape = (l, w) => [[-w * 0.32, -l / 2], [w * 0.32, -l / 2], [w / 2, -l / 2 + l * 0.27], [w * 0.3, l / 2], [-w * 0.3, l / 2], [-w / 2, -l / 2 + l * 0.27]];
  const o = [`<polygon points="${poly(shape(L, Wd))}" fill="url(#crypt-wood)" stroke="#1a0f07" stroke-width="5" stroke-linejoin="round"/>`];
  if (open) {
    o.push(`<polygon points="${poly(shape(L - 18, Wd - 18))}" fill="#140d08"/>`);
    o.push(skull(0, -L / 2 + 34, 1.1, 0), `<path d="M0,${-L / 2 + 50} V${L * 0.15}" stroke="#cfc6b1" stroke-width="4"/>`);
    for (let i = 0; i < 5; i++) { const yy = -L / 2 + 60 + i * 9, w = 22 - i * 2; o.push(`<path d="M${-w},${yy} Q0,${yy - 6} ${w},${yy}" stroke="#cfc6b1" stroke-width="3" fill="none"/>`); }
    o.push(`<path d="M-26,${-L / 2 + 58} L-30,${L * 0.12} M26,${-L / 2 + 58} L30,${L * 0.12} M-8,${L * 0.16} L-12,${L / 2 - 16} M8,${L * 0.16} L12,${L / 2 - 16}" stroke="#cfc6b1" stroke-width="4" stroke-linecap="round"/>`);
    o.push(`<g transform="translate(${f1(Wd * 0.55)} 18) rotate(14)"><polygon points="${poly(shape(L, Wd))}" fill="url(#crypt-wood)" stroke="#1a0f07" stroke-width="5" stroke-linejoin="round" opacity="0.97"/><path d="M0,${-L / 2 + 20} V${L / 2 - 20} M${-Wd * 0.2},${-L / 2 + L * 0.27} H${Wd * 0.2}" stroke="#2a1a0c" stroke-width="5"/></g>`);
  } else {
    o.push(`<polygon points="${poly(shape(L - 22, Wd - 22))}" fill="none" stroke="rgba(255,220,170,0.12)" stroke-width="3"/>`);
    o.push(`<path d="M0,${-L / 2 + 20} V${L / 2 - 20} M${-Wd * 0.2},${-L / 2 + L * 0.27} H${Wd * 0.2}" stroke="#2a1a0c" stroke-width="5"/>`);
  }
  return `<g filter="url(#soft)" transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})">${o.join("")}</g>`;
}
function stoneCoffin(x, y, L, Wd, rot = 0) {
  return `<g filter="url(#soft)" transform="translate(${x} ${y}) rotate(${rot})"><rect x="${-Wd / 2}" y="${-L / 2}" width="${Wd}" height="${L}" rx="8" fill="url(#crypt-darkstone)" stroke="#14110f" stroke-width="4"/>
    <rect x="${-Wd / 2 + 10}" y="${-L / 2 + 10}" width="${Wd - 20}" height="${L - 20}" rx="5" fill="none" stroke="rgba(255,255,240,0.1)" stroke-width="3"/><path d="M${-Wd / 2 + 12},${-L / 2 + 12} L${Wd / 2 - 12},${L / 2 - 12}" stroke="rgba(0,0,0,0.35)" stroke-width="2"/></g>`;
}
function chest(x, y, rot = 0, open = false) {
  const o = [`<rect x="-60" y="-38" width="120" height="76" rx="6" fill="#6b4220" stroke="#1d1007" stroke-width="5"/>`];
  if (open) {
    o.push(`<rect x="-52" y="-30" width="104" height="60" rx="3" fill="#2a1a0a"/>`);
    for (let i = 0; i < 26; i++) o.push(`<circle cx="${f1(rr(-46, 46))}" cy="${f1(rr(-24, 24))}" r="${f1(rr(5, 8))}" fill="#e2b13c" stroke="#7a5512" stroke-width="1.5"/>`);
    o.push(`<rect x="-60" y="-70" width="120" height="30" rx="6" fill="#5a3517" stroke="#1d1007" stroke-width="4"/>`);
    for (let i = 0; i < 9; i++) o.push(`<circle cx="${f1(rr(-60, 80))}" cy="${f1(rr(44, 80))}" r="${f1(rr(5, 7))}" fill="#e2b13c" stroke="#7a5512" stroke-width="1.5"/>`);
    o.push(`<path d="M-10,-6 l10,-10 l10,10 l-10,10z" fill="#c2304a" stroke="#4a0a14" stroke-width="2"/><circle cx="22" cy="10" r="6" fill="#3aa0c8" stroke="#0a3a4a" stroke-width="2"/>`);
  } else {
    o.push(`<path d="M-60,-10 H60" stroke="#2a1708" stroke-width="3"/><rect x="-34" y="-38" width="12" height="76" fill="#8a8a8a" stroke="#222" stroke-width="2"/><rect x="22" y="-38" width="12" height="76" fill="#8a8a8a" stroke="#222" stroke-width="2"/><rect x="-8" y="28" width="16" height="14" fill="#c9a24a" stroke="#4a3010" stroke-width="2"/>`);
  }
  return `<g filter="url(#soft)" transform="translate(${x} ${y}) rotate(${rot})">${o.join("")}</g>`;
}
function urn(x, y, r = 22) {
  return `<g filter="url(#soft)"><circle cx="${x}" cy="${y}" r="${r}" fill="#6a4a36" stroke="#22150c" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${r * 0.5}" fill="#1c120a"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.18}" fill="rgba(255,230,200,0.25)"/></g>`;
}
function statue(x, y, rot = 0) {
  return `<g filter="url(#soft)" transform="translate(${x} ${y}) rotate(${rot})"><rect x="-50" y="-50" width="100" height="100" fill="url(#crypt-darkstone)" stroke="#14110f" stroke-width="4"/>
    <ellipse cx="0" cy="4" rx="36" ry="22" fill="url(#crypt-stone)" stroke="#2a2622" stroke-width="3"/><circle cx="0" cy="2" r="15" fill="#9d968a" stroke="#2a2622" stroke-width="3"/>
    <path d="M0,22 V60 M-12,30 H12" stroke="#8f887c" stroke-width="7" stroke-linecap="round"/><path d="M-30,-6 q-8,-18 4,-30 M30,-6 q8,-18 -4,-30" stroke="#7d766b" stroke-width="8" fill="none" stroke-linecap="round"/></g>`;
}
function niche(x, y, w, h, n = 5) {
  const o = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0f0d0b" stroke="#2c2722" stroke-width="3"/>`];
  for (let i = 0; i < n; i++) o.push(skull(x + 16 + (i + 0.5) * (w - 32) / n + rr(-3, 3), y + h * 0.5 + rr(-6, 6), rr(0.85, 1.05), rr(-15, 15)));
  if (R() < 0.6) o.push(bone(x + w / 2, y + h - 12, 0.8, rr(-8, 8)));
  return o.join("");
}
function blood(x, y, s = 1) {
  return `<path d="${smooth(blobPts(x, y, 40 * s, 28 * s, 10, 0.6, R()))}" fill="rgba(90,8,10,0.55)"/>${Array.from({ length: 5 }, () => `<circle cx="${f1(x + rr(-70, 70) * s)}" cy="${f1(y + rr(-50, 50) * s)}" r="${f1(rr(3, 9) * s)}" fill="rgba(90,8,10,0.5)"/>`).join("")}`;
}
function cracks(x0, y0, w, h, n) {
  const o = [];
  for (let i = 0; i < n; i++) {
    let x = x0 + R() * w, y = y0 + R() * h, d = `M${f1(x)},${f1(y)}`; const a0 = R() * 6.28;
    for (let k = 0; k < 5; k++) { x += Math.cos(a0 + rr(-0.8, 0.8)) * rr(15, 40); y += Math.sin(a0 + rr(-0.8, 0.8)) * rr(15, 40); d += ` L${f1(x)},${f1(y)}`; }
    o.push(d);
  }
  return `<path d="${o.join(" ")}" stroke="rgba(10,8,6,0.6)" stroke-width="2.5" fill="none"/>`;
}

/** Толстые каменные стены (кладка крупными блоками). */
function cwalls(segs, thick = 56) {
  const d = segs.map(s => `M${s[0][0]},${s[0][1]} L${s[1][0]},${s[1][1]}`).join(" ");
  return `<g filter="url(#wallshadow)"><path d="${d}" stroke="#0d0b0a" stroke-width="${thick + 12}" stroke-linecap="square" fill="none"/><path d="${d}" stroke="url(#crypt-blocks)" stroke-width="${thick}" stroke-linecap="square" fill="none"/><path d="${d}" stroke="rgba(0,0,0,0.25)" stroke-width="${thick * 0.4}" stroke-linecap="square" fill="none"/></g>`;
}
function stairsDown(x, y, w, h, steps) {
  const o = [`<rect x="${x - 26}" y="${y}" width="${w + 52}" height="${h}" fill="url(#crypt-blocks)" stroke="#0d0b0a" stroke-width="5"/>`];
  for (let i = 0; i < steps; i++) {
    const sy = y + i * h / steps, sh = 0.95 - (i / steps) * 0.6;
    o.push(`<rect x="${x}" y="${f1(sy)}" width="${w}" height="${f1(h / steps)}" fill="rgb(${Math.round(140 * sh)},${Math.round(132 * sh)},${Math.round(120 * sh)})" stroke="#15120f" stroke-width="3"/>`);
    o.push(`<path d="M${x + 4},${f1(sy + h / steps - 4)} H${x + w - 4}" stroke="rgba(0,0,0,0.45)" stroke-width="6"/>`);
    if (R() < 0.35) o.push(`<path d="M${f1(x + rr(20, w - 60))},${f1(sy + 4)} l${f1(rr(10, 40))},${f1(h / steps - 10)}" stroke="rgba(10,8,6,0.6)" stroke-width="2.5"/>`);
  }
  // сколотые ступени
  o.push(`<path d="M${x + w - 70},${f1(y + h * 0.62)} l40,-8 l30,22 l0,30 l-55,6z" fill="#1c1916"/>`);
  o.push(`<path d="M${x + w / 2},${y + 50} V${y + h - 60} M${x + w / 2 - 26},${y + h - 90} L${x + w / 2},${y + h - 60} L${x + w / 2 + 26},${y + h - 90}" stroke="rgba(230,235,245,0.55)" stroke-width="7" fill="none" stroke-linecap="round"/>`);
  return `<g filter="url(#soft)">${o.join("")}</g>`;
}
function runeCircle(cx, cy, r) {
  const o = [];
  glows.push(`<circle cx="${cx}" cy="${cy}" r="${r * 1.7}" fill="url(#crypt-rune)"/>`);
  lights.push([cx, cy, r * 1.6, 0.8]);
  o.push(`<circle cx="${cx}" cy="${cy}" r="${r + 30}" fill="rgba(20,4,8,0.35)"/>`);
  const ring = (rad, wdt, c) => `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${c}" stroke-width="${wdt}"/>`;
  const rn = [];
  rn.push(ring(r, 6, "#ff4a5a"), ring(r - 60, 4, "#ff4a5a"), ring(r * 0.36, 4, "#ff6a6a"));
  // руны между кругами
  const n = 22;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, rx = cx + Math.cos(a) * (r - 30), ry = cy + Math.sin(a) * (r - 30);
    const g = [`M0,-14 V14`, pick([`M0,-14 L10,-4`, `M0,-6 L-10,4`, `M-9,-14 L9,0`, `M0,0 L10,10`]), pick([`M0,4 L-10,14`, `M0,-14 L-10,-4`, `M-8,6 H8`, ``])].join(" ");
    rn.push(`<path transform="translate(${f1(rx)} ${f1(ry)}) rotate(${f1(a * 180 / Math.PI + 90)})" d="${g}" stroke="#ff7a7a" stroke-width="4" fill="none" stroke-linecap="round"/>`);
  }
  // пентаграмма-звезда
  const st = Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; return [cx + Math.cos(a) * (r - 60), cy + Math.sin(a) * (r - 60)]; });
  rn.push(`<polygon points="${poly(st)}" fill="none" stroke="#ff4a5a" stroke-width="4" stroke-linejoin="round"/>`);
  o.push(`<g filter="url(#glow)" opacity="0.92">${rn.join("")}</g>`);
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 7; o.push(candle(cx + Math.cos(a) * (r + 22), cy + Math.sin(a) * (r + 22), 90)); }
  return o.join("");
}

/* ---------- сборка ---------- */
function draw() {
  lights.length = 0; glows.length = 0;
  const L = [];
  // Толща скалы.
  L.push(`<rect width="${W}" height="${H}" fill="#4a423a" filter="url(#crypt-rock)"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="rgba(12,10,8,0.35)"/>`);

  // Полы залов (плиты).
  const floors = [
    [60, 0, 640, 850], [700, 60, 1150, 940], [1850, 60, 1090, 940],
    [270, 850, 170, 420], [270, 1080, 1610, 190], [1190, 1000, 170, 80], [2580, 1000, 160, 80],
    [1880, 1080, 1060, 860], [1180, 1440, 700, 500]
  ];
  // Пещера колодца — обрушенный природный провал.
  const cave = roughen([[480, 1250], [700, 1250], [730, 1380], [870, 1420], [1010, 1480], [1080, 1600], [1210, 1630], [1210, 1800], [1060, 1810], [1030, 1900], [880, 1950], [640, 1960], [420, 1935], [220, 1885], [110, 1765], [90, 1600], [150, 1480], [300, 1415], [450, 1380]], 38, 12);
  L.push(`<path d="${smooth(cave)}" fill="#3a332c"/>`);
  L.push(`<path d="${smooth(cave)}" fill="#6a5f52" filter="url(#crypt-rock)" opacity="0.8"/>`);
  L.push(`<g clip-path="url(#crypt-caveclip)"><defs><clipPath id="crypt-caveclip"><path d="${smooth(cave)}"/></clipPath></defs>
    <path d="${smooth(roughen([[480, 1250], [700, 1250], [760, 1440], [900, 1500], [880, 1640], [640, 1520], [430, 1450]], 30, 18))}" fill="url(#crypt-flags)" opacity="0.85"/>
    <path d="${smooth(cave)}" fill="none" stroke="rgba(0,0,0,0.85)" stroke-width="70" filter="url(#crypt-blur)"/></g>`);
  for (const [x, y, w, h] of floors) L.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#crypt-flags)"/>`);
  L.push(`<g opacity="0.55">${floors.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#000" filter="url(#grain)"/>`).join("")}</g>`);
  L.push(`<rect width="${W}" height="${H}" filter="url(#dirt)" opacity="0.6"/>`);
  L.push(cracks(720, 80, 1100, 900, 18), cracks(1900, 1100, 1000, 800, 14), cracks(300, 1100, 1500, 150, 6));

  /* --- Лестница вниз --- */
  L.push(stairsDown(180, 0, 300, 600, 12));
  L.push(rubble(560, 700, 70, 14, 24), rubble(420, 650, 40, 6, 16));
  L.push(urn(130, 690, 26), urn(130, 770, 22), urn(620, 130, 24));
  L.push(cobweb(88, 88, 1, 1, 110));
  glows.push(`<ellipse cx="330" cy="140" rx="320" ry="260" fill="url(#crypt-day)"/>`);
  lights.push([330, 120, 460, 0.95], [330, 420, 300, 0.6]);

  /* --- Костница --- */
  // ниши с черепами в северной и южной стенах
  for (let x = 760; x < 1800; x += 175) L.push(niche(x, 72, 140, 58, 5));
  for (const x of [740, 1400, 1580]) L.push(niche(x, 930, 140, 58, 5));
  for (const [x, y] of [[960, 330], [1590, 330], [960, 720], [1590, 720]]) L.push(pillar(x, y, 78));
  L.push(coffin(820, 330, 180, 84, 0, false), coffin(1100, 300, 180, 84, 8, true), coffin(1460, 310, 180, 84, -5, false), coffin(1740, 360, 170, 80, 3, false));
  L.push(coffin(830, 730, 180, 84, 172, true), coffin(1120, 770, 180, 84, -80, false), coffin(1440, 770, 170, 80, 95, false), coffin(1730, 700, 180, 84, 180, false));
  L.push(stoneCoffin(1590, 525, 170, 84, 0));
  L.push(`<g filter="url(#soft)">${scatterBones(1700, 880, 70, 24)}${scatterBones(800, 900, 50, 12)}${scatterBones(1280, 420, 60, 10)}</g>`);
  // курган черепов
  { const o = []; for (let i = 0; i < 40; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * 60; o.push(skull(1795 + Math.cos(a) * d * 0.6, 560 + Math.sin(a) * d, rr(0.9, 1.2), rr(-40, 40))); } L.push(`<g filter="url(#soft)">${o.join("")}</g>`); }
  L.push(candle(1690, 560, 120), candle(1530, 450, 70), candle(1650, 600, 70));
  L.push(cobweb(728, 158, 1, 1, 120), cobweb(1822, 900, -1, -1, 110), cobweb(1822, 158, -1, 1, 90));

  /* --- Алтарь --- */
  for (const [x0, x1] of [[1880, 1925], [2495, 2600]]) L.push(`<rect x="${x0}" y="470" width="${x1 - x0}" height="90" fill="rgba(60,15,40,0.75)" stroke="#2a0818" stroke-width="3"/>`); // истлевшая дорожка
  L.push(runeCircle(2210, 515, 270));
  // помост и алтарь
  L.push(`<g filter="url(#soft)"><rect x="2600" y="200" width="300" height="630" fill="#57514a" stroke="#14110f" stroke-width="5"/><rect x="2640" y="240" width="260" height="550" fill="#6f685e" stroke="#2a2622" stroke-width="3"/><rect x="2680" y="280" width="220" height="470" fill="url(#crypt-stone)" stroke="#2a2622" stroke-width="3"/></g>`);
  L.push(`<g filter="url(#soft)"><rect x="2730" y="400" width="120" height="230" rx="6" fill="#3e3934" stroke="#0e0c0b" stroke-width="5"/><rect x="2742" y="412" width="96" height="206" rx="4" fill="url(#crypt-darkstone)"/></g>`);
  L.push(blood(2790, 520, 0.8), skull(2790, 470, 1.4, -90));
  L.push(candle(2752, 425, 70), candle(2828, 425, 70), candle(2752, 605, 70), candle(2828, 605, 70));
  L.push(brazier(2700, 180), brazier(2700, 850));
  for (const [x, y] of [[1990, 200], [2380, 200], [1990, 840], [2380, 840]]) L.push(pillar(x, y, 74, true));
  L.push(blood(2120, 760, 0.7), blood(2420, 380, 0.5));
  L.push(cobweb(2912, 88, -1, 1, 100), cobweb(1878, 972, 1, -1, 100));
  L.push(`<g filter="url(#soft)">${scatterBones(2500, 900, 50, 8)}</g>`);

  /* --- Узкий коридор --- */
  L.push(rubble(360, 960, 45, 10, 18), rubble(820, 1200, 60, 16, 20), rubble(1500, 1130, 55, 12, 18), rubble(1100, 1215, 40, 8, 15));
  L.push(`<g filter="url(#soft)">${scatterBones(640, 1150, 40, 6)}${scatterBones(1700, 1210, 30, 4)}</g>`);
  L.push(cobweb(298, 1108, 1, 1, 90), cobweb(1360, 1108, -1, 1, 70), cobweb(412, 1242, -1, -1, 60));
  // корни сквозь свод
  L.push(`<path d="M960,1108 q20,40 -10,80 M975,1108 q30,30 30,60 M1260,1242 q-20,-40 10,-70" stroke="#3a2a18" stroke-width="6" fill="none" stroke-linecap="round" filter="url(#soft)"/>`);

  /* --- Колодец во тьму --- */
  {
    const cx = 540, cy = 1650;
    L.push(rubble(800, 1550, 90, 18, 26), rubble(270, 1820, 90, 16, 26), rubble(1100, 1700, 80, 22, 24), rubble(950, 1880, 60, 10, 20));
    L.push(`<circle cx="${cx}" cy="${cy}" r="215" fill="rgba(0,0,0,0.55)" filter="url(#crypt-blur)"/>`);
    L.push(`<path d="${smooth(blobPts(cx, cy, 175, 165, 16, 0.12))}" fill="url(#crypt-abyss)"/>`);
    // разбитое кольцо кладки
    const ring = [];
    for (let i = 0; i < 18; i++) {
      if (i === 4 || i === 5 || i === 12) continue;
      const a0 = i / 18 * Math.PI * 2 + 0.02, a1 = (i + 1) / 18 * Math.PI * 2 - 0.02, r0 = 170, r1 = 215;
      const p = (a, r) => `${f1(cx + Math.cos(a) * r)},${f1(cy + Math.sin(a) * r)}`;
      const c = Math.round(rr(85, 120));
      ring.push(`<path d="M${p(a0, r0)} A${r0},${r0} 0 0 1 ${p(a1, r0)} L${p(a1, r1)} A${r1},${r1} 0 0 0 ${p(a0, r1)}Z" fill="rgb(${c},${c - 6},${c - 14})" stroke="#15120f" stroke-width="3"/>`);
    }
    L.push(`<g filter="url(#soft)">${ring.join("")}</g>`);
    L.push(rubble(cx + 150, cy - 175, 40, 6, 20), rubble(cx - 90, cy + 215, 40, 6, 20));
    // сломанный ворот и цепь в бездну
    L.push(`<g filter="url(#soft)"><rect x="${cx - 250}" y="${cy - 12}" width="140" height="24" fill="#4a2e15" stroke="#1d1007" stroke-width="3" transform="rotate(-8 ${cx - 180} ${cy})"/><rect x="${cx + 200}" y="${cy - 40}" width="90" height="22" fill="#4a2e15" stroke="#1d1007" stroke-width="3" transform="rotate(22 ${cx + 240} ${cy - 30})"/></g>`);
    L.push(`<path d="M${cx - 120},${cy - 6} q60,30 100,10" stroke="#777" stroke-width="5" stroke-dasharray="8 4" fill="none"/>`);
    L.push(`<circle cx="${cx}" cy="${cy}" r="120" fill="rgba(60,90,110,0.08)" filter="url(#crypt-blur)"/>`);
    L.push(`<g filter="url(#soft)">${scatterBones(860, 1760, 70, 12)}${scatterBones(260, 1560, 50, 8)}</g>`);
    L.push(cobweb(130, 1640, 1, -1, 80));
  }

  /* --- Гробница основателя --- */
  {
    const cx = 2420, cy = 1470;
    L.push(`<g filter="url(#soft)"><rect x="${cx - 270}" y="${cy - 230}" width="540" height="460" fill="#4f4943" stroke="#14110f" stroke-width="5"/><rect x="${cx - 220}" y="${cy - 180}" width="440" height="360" fill="#625b52" stroke="#2a2622" stroke-width="3"/></g>`);
    L.push(`<rect x="${cx - 200}" y="${cy - 160}" width="400" height="320" fill="url(#crypt-flags)" opacity="0.4"/>`);
    // саркофаг с изваянием
    L.push(`<g filter="url(#soft)"><rect x="${cx - 80}" y="${cy - 150}" width="160" height="300" rx="10" fill="#3a3530" stroke="#0e0c0b" stroke-width="6"/><rect x="${cx - 68}" y="${cy - 138}" width="136" height="276" rx="8" fill="url(#crypt-stone)"/></g>`);
    L.push(`<g><circle cx="${cx}" cy="${cy - 100}" r="22" fill="#b0a898" stroke="#4a443c" stroke-width="3"/><path d="M${cx - 44},${cy - 72} Q${cx},${cy - 84} ${cx + 44},${cy - 72} L${cx + 30},${cy + 110} L${cx - 30},${cy + 110}Z" fill="#a39b8c" stroke="#4a443c" stroke-width="3"/>
      <path d="M${cx},${cy - 60} V${cy + 120}" stroke="#d8d2c4" stroke-width="10" stroke-linecap="round"/><path d="M${cx - 26},${cy - 50} H${cx + 26}" stroke="#d8d2c4" stroke-width="9" stroke-linecap="round"/><circle cx="${cx}" cy="${cy - 64}" r="7" fill="#c9a24a"/>
      <path d="M${cx - 34},${cy - 40} Q${cx - 20},${cy - 46} ${cx - 6},${cy - 52} M${cx + 34},${cy - 40} Q${cx + 20},${cy - 46} ${cx + 6},${cy - 52}" stroke="#8f887a" stroke-width="7" fill="none" stroke-linecap="round"/></g>`);
    glows.push(`<circle cx="${cx}" cy="${cy}" r="300" fill="url(#crypt-ghost)"/>`);
    L.push(candle(cx - 120, cy - 170, 100), candle(cx + 120, cy - 170, 100), candle(cx - 120, cy + 170, 100), candle(cx + 120, cy + 170, 100));
    L.push(chest(cx + 190, cy + 110, -10, true), chest(cx - 200, cy + 120, 6, false));
    L.push(urn(cx - 230, cy - 200, 24), urn(cx + 235, cy - 195, 22), urn(cx + 240, cy - 20, 20));
    for (const y of [1180, 1820]) for (const x of [2000, 2840]) L.push(pillar(x, y, 78, true));
    L.push(statue(2860, 1340, -90), statue(2860, 1600, -90), statue(2000, 1440, 90));
    L.push(cobweb(2912, 1108, -1, 1, 110), cobweb(2912, 1912, -1, -1, 100));
    // преддверие: ниши с гробами, обвал у пролома
    L.push(stoneCoffin(1300, 1530, 200, 90, 0), stoneCoffin(1440, 1530, 200, 90, 0), stoneCoffin(1580, 1540, 200, 90, 4));
    L.push(coffin(1450, 1820, 180, 84, 96, true), stoneCoffin(1720, 1830, 90, 190, 0));
    L.push(rubble(1250, 1720, 70, 18, 24), rubble(1800, 1650, 50, 8, 20));
    L.push(`<g filter="url(#soft)"><rect x="1560" y="1650" width="220" height="62" rx="28" fill="url(#crypt-stone)" stroke="#14110f" stroke-width="4" transform="rotate(-24 1670 1680)"/></g>`); // упавшая колонна
    L.push(`<g filter="url(#soft)">${scatterBones(1620, 1780, 40, 6)}</g>`);
    L.push(cobweb(1208, 1468, 1, 1, 90));
  }

  /* --- Стены --- */
  L.push(cwalls([
    // лестница
    [[60, 0], [60, 850]], [[60, 850], [270, 850]], [[440, 850], [700, 850]], [[480, 60], [700, 60]], [[60, 60], [180, 60]],
    [[700, 60], [700, 380]], [[700, 540], [700, 1000]],
    // костница
    [[700, 60], [1850, 60]], [[700, 1000], [1190, 1000]], [[1360, 1000], [1850, 1000]], [[1850, 60], [1850, 420]], [[1850, 640], [1850, 1000]],
    // алтарь
    [[1850, 60], [2940, 60]], [[2940, 60], [2940, 1000]], [[1850, 1000], [2580, 1000]], [[2740, 1000], [2940, 1000]],
    // проходы
    [[270, 850], [270, 1270]], [[440, 850], [440, 1080]], [[1190, 1000], [1190, 1080]], [[1360, 1000], [1360, 1080]], [[2580, 1000], [2580, 1080]], [[2740, 1000], [2740, 1080]],
    // коридор
    [[440, 1080], [1190, 1080]], [[1360, 1080], [1880, 1080]], [[270, 1270], [500, 1270]], [[690, 1270], [1880, 1270]],
    // гробница и преддверие
    [[1880, 1080], [2580, 1080]], [[2740, 1080], [2940, 1080]], [[2940, 1080], [2940, 1940]], [[1180, 1940], [2940, 1940]],
    [[1880, 1270], [1880, 1520]], [[1880, 1820], [1880, 1940]], [[1180, 1440], [1880, 1440]], [[1180, 1440], [1180, 1630]], [[1180, 1800], [1180, 1940]]
  ]));
  // двери (окованные)
  const door = (x, y, w, vert, open = 0) => `<g filter="url(#soft)" transform="rotate(${open} ${x} ${y})">${vert
    ? `<rect x="${x - 12}" y="${y}" width="24" height="${w}" fill="#5a3a1c" stroke="#1d1007" stroke-width="3"/><path d="M${x - 12},${y + w * 0.25} h24 M${x - 12},${y + w * 0.75} h24" stroke="#555" stroke-width="5"/>`
    : `<rect x="${x}" y="${y - 12}" width="${w}" height="24" fill="#5a3a1c" stroke="#1d1007" stroke-width="3"/><path d="M${x + w * 0.25},${y - 12} v24 M${x + w * 0.75},${y - 12} v24" stroke="#555" stroke-width="5"/>`}</g>`;
  L.push(door(700, 380, 160, true, -55), door(1190, 1000, 170, false, -60), door(2580, 1000, 160, false, -30));
  // решётка-арка между костницей и алтарём (поднята)
  L.push(`<g opacity="0.85">${Array.from({ length: 6 }, (_, i) => `<rect x="1838" y="${430 + i * 36}" width="24" height="10" fill="#333" stroke="#111" stroke-width="2"/>`).join("")}</g>`);
  // проломы с обломками
  L.push(rubble(1180, 1715, 60, 14, 24), rubble(595, 1290, 50, 10, 20));

  /* --- Факелы на стенах --- */
  L.push(torch(88, 480, -90), torch(672, 700, 90), torch(1275, 1108, 0), torch(700, 1108, 0), torch(1700, 1242, 180), torch(1960, 88, 0), torch(1960, 972, 180), torch(2912, 1480, 90), torch(1300, 88, 0));

  /* --- Свет и тьма --- */
  L.push(`<g style="mix-blend-mode:screen">${glows.join("")}</g>`);
  const mask = `<mask id="crypt-dark" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${lights.map(([x, y, r, s]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="url(#crypt-hole)" opacity="${s}"/>`).join("")}</mask>`;
  L.push(`<defs>${mask}</defs><rect width="${W}" height="${H}" fill="#06040a" opacity="0.8" mask="url(#crypt-dark)"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="url(#crypt-vignette)"/>`);
  return L.join("\n");
}

const ZONES = [
  { id: "stairs", name: "Лестница вниз", tags: ["difficult", "elevated"], poly: [[0, 0], [700, 0], [700, 850], [0, 850]], label: [370, 730], size: 50 },
  { id: "ossuary", name: "Костница", tags: ["cover", "dark"], poly: [[700, 0], [1850, 0], [1850, 1000], [700, 1000]], label: [1275, 560] },
  { id: "altar", name: "Алтарь", tags: ["hazard"], poly: [[1850, 0], [3000, 0], [3000, 1040], [1850, 1040]], label: [2210, 920] },
  { id: "corridor", name: "Узкий коридор", tags: ["difficult"], poly: [[0, 850], [700, 850], [700, 1000], [1850, 1000], [1850, 1380], [0, 1380]], label: [960, 1186], size: 46 },
  { id: "well", name: "Колодец во тьму", tags: ["hazard", "dark"], poly: [[0, 1380], [1100, 1380], [1100, 2000], [0, 2000]], label: [560, 1920], size: 52 },
  { id: "tomb", name: "Гробница основателя", tags: ["cover", "dark"], poly: [[1850, 1040], [3000, 1040], [3000, 2000], [1100, 2000], [1100, 1380], [1850, 1380]], label: [2420, 1810], size: 54 }
];
const LINKS = [
  ["stairs", "ossuary", "short"], ["stairs", "corridor", "short"], ["ossuary", "altar", "short"], ["ossuary", "corridor", "short"],
  ["altar", "tomb", "short"], ["corridor", "tomb", "short"], ["corridor", "well", "short"], ["well", "tomb", "short"]
];

export default {
  key: "crypt", name: "Склеп под часовней", folder: "Подземелья", worlds: ["fantasy", "terrinoth", "mythic", "monster"],
  bgColor: "#0d0b0a", extraDefs: EXTRA, draw, zones: ZONES, links: LINKS,
  style: { tint: "rgba(255,220,170,0.03)", line: "rgba(255,214,150,0.85)", text: "#ffe2b0" }
};
