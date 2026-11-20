import { W, H, rng, f1, poly } from "../lib.mjs";

/* ==========================================================================
   Карта: логово в пещере (вид сверху: скала, ходы, озеро, карниз, логово)
   ========================================================================== */
const R = rng("cave-lair-detail");
const rr = (a, b) => a + R() * (b - a);

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
function roughen(pts, step = 40, amp = 14) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) { const t = k / n; out.push([p[0] + (q[0] - p[0]) * t + (R() - 0.5) * amp * 2, p[1] + (q[1] - p[1]) * t + (R() - 0.5) * amp * 2]); }
  }
  return out;
}
/** Точки вдоль ломаной с шагом step. */
function along(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / step));
    for (let k = 0; k < n; k++) out.push([p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/* ---------- текстуры ---------- */
function floorPattern() {
  const r = rng("cave-floor"), out = [], S = 400;
  for (let i = 0; i < 26; i++) out.push(`<ellipse cx="${f1(r() * S)}" cy="${f1(r() * S)}" rx="${f1(30 + r() * 60)}" ry="${f1(20 + r() * 40)}" fill="rgba(${r() < 0.5 ? "40,32,24" : "150,135,110"},${f1(0.05 + r() * 0.08)})"/>`);
  for (let i = 0; i < 150; i++) {
    const x = r() * S, y = r() * S, s = 3 + r() * (r() < 0.15 ? 14 : 6), c = Math.round(70 + r() * 60);
    const pts = Array.from({ length: 6 }, (_, k) => { const a = k / 6 * Math.PI * 2, kk = 0.7 + r() * 0.5; return [x + Math.cos(a) * s * kk, y + Math.sin(a) * s * kk * 0.8]; });
    out.push(`<polygon points="${poly(pts)}" fill="rgb(${c},${c - 6},${c - 16})" stroke="rgba(20,15,10,0.7)" stroke-width="1.5"/>`);
  }
  return `<pattern id="cave-floor" width="${S}" height="${S}" patternUnits="userSpaceOnUse"><rect width="${S}" height="${S}" fill="#5e5245"/>${out.join("")}</pattern>`;
}

const EXTRA = `<defs>
  ${floorPattern()}
  <filter id="cave-rock" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="6" seed="5" result="n"/>
    <feDiffuseLighting in="n" surfaceScale="7" lighting-color="#ffffff" result="l"><feDistantLight azimuth="225" elevation="40"/></feDiffuseLighting>
    <feComposite in="l" in2="SourceGraphic" operator="arithmetic" k1="1" k2="0" k3="0" k4="0"/></filter>
  <filter id="cave-slab" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="9" result="n"/>
    <feDiffuseLighting in="n" surfaceScale="2.5" lighting-color="#ffffff" result="l"><feDistantLight azimuth="225" elevation="50"/></feDiffuseLighting>
    <feComposite in="l" in2="SourceGraphic" operator="arithmetic" k1="1" k2="0" k3="0" k4="0"/></filter>
  <filter id="cave-inner" x="-5%" y="-5%" width="110%" height="110%">
    <feMorphology in="SourceAlpha" operator="dilate" radius="9" result="d"/><feComposite in="d" in2="SourceAlpha" operator="out" result="ring"/>
    <feFlood flood-color="#120d09"/><feComposite in2="ring" operator="in" result="ringc"/>
    <feGaussianBlur in="SourceAlpha" stdDeviation="22" result="b"/><feComponentTransfer in="b" result="inv"><feFuncA type="linear" slope="-1" intercept="1"/></feComponentTransfer>
    <feFlood flood-color="#000" flood-opacity="0.85"/><feComposite in2="inv" operator="in" result="sh"/><feComposite in="sh" in2="SourceAlpha" operator="in" result="ish"/>
    <feMerge><feMergeNode in="ringc"/><feMergeNode in="SourceGraphic"/><feMergeNode in="ish"/></feMerge></filter>
  <filter id="cave-cliff" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="22" dy="34" stdDeviation="18" flood-color="rgba(0,0,0,0.85)"/></filter>
  <filter id="cave-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="12"/></filter>
  <filter id="cave-caustic" x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency="0.012 0.02" numOctaves="2" seed="4"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.95  0 0 0 0 1  0 0 0 -2.2 1.05"/></filter>
  <radialGradient id="cave-water" cx="48%" cy="45%" r="55%"><stop offset="0" stop-color="#031820"/><stop offset="0.55" stop-color="#0a3440"/><stop offset="0.88" stop-color="#1a5a60"/><stop offset="1" stop-color="#3b7f7a"/></radialGradient>
  <radialGradient id="cave-stal" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#b8aa94"/><stop offset="0.45" stop-color="#7a6c5a"/><stop offset="1" stop-color="#3a3026"/></radialGradient>
  <radialGradient id="cave-boulder" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#9a8c78"/><stop offset="1" stop-color="#3e352b"/></radialGradient>
  <radialGradient id="cave-gold" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#ffe07a"/><stop offset="0.6" stop-color="#d49a2a"/><stop offset="1" stop-color="#7a5212"/></radialGradient>
  <linearGradient id="cave-shardC" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a7a9a"/><stop offset="0.5" stop-color="#9af4ff"/><stop offset="1" stop-color="#2aa0c0"/></linearGradient>
  <linearGradient id="cave-shardV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a2a9a"/><stop offset="0.5" stop-color="#e2b4ff"/><stop offset="1" stop-color="#7a3ac0"/></linearGradient>
  <radialGradient id="cave-glowC" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(90,230,255,0.45)"/><stop offset="0.5" stop-color="rgba(60,180,230,0.15)"/><stop offset="1" stop-color="rgba(40,140,200,0)"/></radialGradient>
  <radialGradient id="cave-glowV" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(200,120,255,0.45)"/><stop offset="0.5" stop-color="rgba(150,80,230,0.15)"/><stop offset="1" stop-color="rgba(110,50,200,0)"/></radialGradient>
  <radialGradient id="cave-day" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(230,240,255,0.5)"/><stop offset="0.5" stop-color="rgba(200,220,240,0.18)"/><stop offset="1" stop-color="rgba(180,200,230,0)"/></radialGradient>
  <radialGradient id="cave-ember" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(255,150,60,0.5)"/><stop offset="0.5" stop-color="rgba(255,100,30,0.16)"/><stop offset="1" stop-color="rgba(255,80,20,0)"/></radialGradient>
  <radialGradient id="cave-hole" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity="1"/><stop offset="0.55" stop-color="#000" stop-opacity="0.7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <radialGradient id="cave-vignette" cx="45%" cy="50%" r="75%"><stop offset="0.55" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,0,0,0.65)"/></radialGradient>
  <g id="cave-skull"><ellipse cx="0" cy="-2" rx="11" ry="12" fill="#ddd5c2" stroke="#3a3328" stroke-width="2"/><rect x="-6" y="7" width="12" height="7" rx="2" fill="#cfc6b1" stroke="#3a3328" stroke-width="1.5"/><circle cx="-4.5" cy="-1" r="3.2" fill="#1b1612"/><circle cx="4.5" cy="-1" r="3.2" fill="#1b1612"/></g>
  <g id="cave-bone"><path d="M-14,0 H14" stroke="#d6cdb8" stroke-width="5" stroke-linecap="round"/><circle cx="-15" cy="-3" r="3.6" fill="#d6cdb8"/><circle cx="-15" cy="3" r="3.6" fill="#d6cdb8"/><circle cx="15" cy="-3" r="3.6" fill="#d6cdb8"/><circle cx="15" cy="3" r="3.6" fill="#d6cdb8"/></g>
</defs>`;

/* ---------- предметы ---------- */
const lights = [], glows = [];
const skull = (x, y, s = 1, rot = 0) => `<use href="#cave-skull" transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${f1(s)})"/>`;
const bone = (x, y, s = 1, rot = 0) => `<use href="#cave-bone" transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${f1(s)})"/>`;
function scatterBones(cx, cy, rad, n) {
  const o = [];
  for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, d = Math.sqrt(R()) * rad; o.push(R() < 0.18 ? skull(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr(0.8, 1.2), rr(-60, 60)) : bone(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr(0.6, 1.4), rr(0, 180))); }
  return `<g filter="url(#soft)">${o.join("")}</g>`;
}
function stalagmite(x, y, r) {
  return `<g filter="url(#soft)"><path d="${smooth(blobPts(x, y, r, r * rr(0.85, 1.1), 8, 0.25, R() * 3))}" fill="url(#cave-stal)" stroke="#231c15" stroke-width="3"/><circle cx="${f1(x - r * 0.18)}" cy="${f1(y - r * 0.2)}" r="${f1(r * 0.28)}" fill="#cfc2aa" opacity="0.8"/><circle cx="${f1(x - r * 0.18)}" cy="${f1(y - r * 0.2)}" r="${f1(r * 0.55)}" fill="none" stroke="rgba(40,30,20,0.35)" stroke-width="2"/></g>`;
}
function stalCluster(cx, cy, n, rad, big = 40) {
  const o = [];
  for (let i = 0; i < n; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * rad; o.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr(0.4, 1) * big]); }
  return o.sort((a, b) => b[2] - a[2]).map(([x, y, r]) => stalagmite(x, y, r)).join("");
}
function boulder(x, y, rx, ry = rx * 0.8, rot = 0) {
  const pts = blobPts(x, y, rx, ry, 9, 0.3, rot);
  return `<g filter="url(#soft)"><path d="${smooth(pts)}" fill="url(#cave-boulder)" stroke="#1c160f" stroke-width="4"/><path d="${smooth(blobPts(x - rx * 0.2, y - ry * 0.25, rx * 0.45, ry * 0.35, 7, 0.3))}" fill="rgba(220,205,180,0.18)"/>
    <path d="M${f1(x - rx * 0.3)},${f1(y + ry * 0.1)} l${f1(rx * 0.25)},${f1(ry * 0.2)} l${f1(rx * 0.3)},${f1(-ry * 0.05)}" stroke="rgba(20,15,10,0.5)" stroke-width="3" fill="none"/></g>`;
}
function rubble(cx, cy, rad, n, big = 20) {
  const o = [];
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * rad, s = rr(0.35, 1) * big, c = Math.round(rr(75, 120));
    o.push(`<path d="${smooth(blobPts(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, s * rr(0.6, 1), 6, 0.5, R() * 3))}" fill="rgb(${c},${c - 8},${c - 20})" stroke="#1a140e" stroke-width="2.5"/>`);
  }
  return `<g filter="url(#soft)">${o.join("")}</g>`;
}
function crystals(x, y, n, kind, size, dir, spread = 1.2, light = 380) {
  const fillG = kind === "V" ? "url(#cave-shardV)" : "url(#cave-shardC)", edge = kind === "V" ? "#2a0a4a" : "#06303f";
  const o = [`<path d="${smooth(blobPts(x, y, size * 0.45, size * 0.38, 7, 0.4))}" fill="#2a241e" stroke="#120d09" stroke-width="3"/>`];
  const shards = Array.from({ length: n }, () => [dir + rr(-spread, spread) / 2, size * rr(0.5, 1.15), size * rr(0.12, 0.2)]).sort((a, b) => a[1] - b[1]);
  for (const [a, l, w] of shards) {
    const c = Math.cos(a), s = Math.sin(a), px = -s, py = c, bx = x + c * size * 0.1, by = y + s * size * 0.1;
    const pts = [[bx + px * w, by + py * w], [bx + c * l * 0.82 + px * w * 0.9, by + s * l * 0.82 + py * w * 0.9], [bx + c * l, by + s * l], [bx + c * l * 0.82 - px * w * 0.9, by + s * l * 0.82 - py * w * 0.9], [bx - px * w, by - py * w]];
    o.push(`<polygon points="${poly(pts)}" fill="${fillG}" stroke="${edge}" stroke-width="2.5" stroke-linejoin="round"/><path d="M${f1(bx)},${f1(by)} L${f1(bx + c * l)},${f1(by + s * l)}" stroke="rgba(255,255,255,0.55)" stroke-width="2"/>`);
  }
  const gx = x + Math.cos(dir) * size * 0.5, gy = y + Math.sin(dir) * size * 0.5;
  glows.push(`<circle cx="${f1(gx)}" cy="${f1(gy)}" r="${light}" fill="url(#cave-glow${kind})"/>`);
  lights.push([gx, gy, light * 1.05, 0.85]);
  return `<g filter="url(#glow)">${o.join("")}</g>`;
}
function mushrooms(cx, cy, n, rad) {
  const o = [];
  for (let i = 0; i < n; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * rad, r = rr(5, 13); o.push(`<circle cx="${f1(cx + Math.cos(a) * d)}" cy="${f1(cy + Math.sin(a) * d)}" r="${f1(r)}" fill="#5fd6b0" stroke="#0f4a3a" stroke-width="2"/><circle cx="${f1(cx + Math.cos(a) * d - r * 0.3)}" cy="${f1(cy + Math.sin(a) * d - r * 0.3)}" r="${f1(r * 0.3)}" fill="#d8fff0"/>`); }
  glows.push(`<circle cx="${cx}" cy="${cy}" r="${rad * 2.6}" fill="url(#cave-glowC)" opacity="0.6"/>`);
  lights.push([cx, cy, rad * 2.2, 0.5]);
  return `<g filter="url(#glow)">${o.join("")}</g>`;
}
function puddle(x, y, rx, ry) {
  return `<path d="${smooth(blobPts(x, y, rx, ry, 9, 0.35))}" fill="#163238" stroke="rgba(150,210,210,0.35)" stroke-width="4" opacity="0.9"/><ellipse cx="${x - rx * 0.2}" cy="${y - ry * 0.2}" rx="${rx * 0.3}" ry="${ry * 0.15}" fill="rgba(200,240,240,0.15)"/>`;
}
function claws(x, y, rot, len = 120) {
  return `<g transform="rotate(${rot} ${x} ${y})" stroke="rgba(15,10,6,0.7)" stroke-width="5" fill="none" stroke-linecap="round">${[-22, 0, 22].map(d => `<path d="M${x + d},${y} q${f1(len * 0.1)},${f1(len * 0.5)} ${f1(d * 0.3)},${len}"/>`).join("")}</g>`;
}
function chest(x, y, rot = 0) {
  const o = [`<rect x="-62" y="-40" width="124" height="80" rx="6" fill="#6b4220" stroke="#1d1007" stroke-width="5"/><rect x="-54" y="-32" width="108" height="64" rx="3" fill="#2a1a0a"/>`];
  for (let i = 0; i < 28; i++) o.push(`<circle cx="${f1(rr(-48, 48))}" cy="${f1(rr(-26, 26))}" r="${f1(rr(5, 8))}" fill="#e8b83e" stroke="#7a5512" stroke-width="1.5"/>`);
  o.push(`<rect x="-62" y="-74" width="124" height="30" rx="6" fill="#5a3517" stroke="#1d1007" stroke-width="4"/><rect x="-40" y="-74" width="12" height="30" fill="#8a8a8a"/><rect x="28" y="-74" width="12" height="30" fill="#8a8a8a"/>`);
  return `<g filter="url(#soft)" transform="translate(${x} ${y}) rotate(${rot})">${o.join("")}</g>`;
}
function hoard(cx, cy) {
  const o = [`<path d="${smooth(blobPts(cx, cy, 230, 150, 12, 0.3))}" fill="url(#cave-gold)" stroke="#5a3a0a" stroke-width="4"/>`];
  for (let i = 0; i < 260; i++) {
    const a = R() * 6.28, d = Math.sqrt(R()), x = cx + Math.cos(a) * d * 225, y = cy + Math.sin(a) * d * 145;
    o.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr(5, 9))}" fill="${R() < 0.5 ? "#f2c64c" : "#d9a234"}" stroke="#7a5512" stroke-width="1.4"/>`);
  }
  for (let i = 0; i < 30; i++) { const a = R() * 6.28, d = rr(1, 1.35), x = cx + Math.cos(a) * d * 230, y = cy + Math.sin(a) * d * 150; o.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr(5, 8))}" fill="#e8b83e" stroke="#7a5512" stroke-width="1.4"/>`); }
  const gems = ["#d0304a", "#3aa0d8", "#3ac070", "#b050d0"];
  for (let i = 0; i < 14; i++) { const x = cx + rr(-180, 180), y = cy + rr(-100, 100), s = rr(7, 12); o.push(`<path d="M${f1(x)},${f1(y - s)} L${f1(x + s)},${f1(y)} L${f1(x)},${f1(y + s)} L${f1(x - s)},${f1(y)}Z" fill="${gems[i % 4]}" stroke="#111" stroke-width="2"/><circle cx="${f1(x - s * 0.3)}" cy="${f1(y - s * 0.3)}" r="${f1(s * 0.25)}" fill="#fff" opacity="0.7"/>`); }
  // кубки, корона, меч, щит
  o.push(`<circle cx="${cx - 90}" cy="${cy - 40}" r="20" fill="#e8c050" stroke="#6a4a10" stroke-width="3"/><circle cx="${cx - 90}" cy="${cy - 40}" r="11" fill="#7a1a1a"/>`);
  o.push(`<circle cx="${cx + 70}" cy="${cy + 30}" r="30" fill="none" stroke="#f0d060" stroke-width="10"/>${Array.from({ length: 6 }, (_, i) => { const a = i / 6 * 6.28; return `<circle cx="${f1(cx + 70 + Math.cos(a) * 30)}" cy="${f1(cy + 30 + Math.sin(a) * 30)}" r="6" fill="#d0304a" stroke="#4a0a14" stroke-width="1.5"/>`; }).join("")}`);
  o.push(`<g transform="rotate(-28 ${cx} ${cy})"><rect x="${cx - 160}" y="${cy - 8}" width="230" height="16" rx="4" fill="#cfd6dc" stroke="#2a2e32" stroke-width="3"/><rect x="${cx + 66}" y="${cy - 30}" width="14" height="60" rx="4" fill="#c9a24a" stroke="#4a3010" stroke-width="3"/><rect x="${cx + 80}" y="${cy - 7}" width="44" height="14" rx="4" fill="#5a3517"/></g>`);
  o.push(`<circle cx="${cx + 150}" cy="${cy - 80}" r="44" fill="#7a2a22" stroke="#2a0a08" stroke-width="5"/><circle cx="${cx + 150}" cy="${cy - 80}" r="30" fill="none" stroke="#c9a24a" stroke-width="5"/><circle cx="${cx + 150}" cy="${cy - 80}" r="9" fill="#c9a24a"/>`);
  glows.push(`<ellipse cx="${cx}" cy="${cy}" rx="320" ry="240" fill="url(#cave-ember)" opacity="0.6"/>`);
  return `<g filter="url(#soft)">${o.join("")}</g>`;
}
function nest(cx, cy, r) {
  const o = [`<path d="${smooth(blobPts(cx, cy, r, r * 0.8, 12, 0.2))}" fill="#4a3a22" stroke="#20170c" stroke-width="4"/>`];
  for (let i = 0; i < 140; i++) {
    const a = R() * 6.28, d = rr(0.6, 1.05), x = cx + Math.cos(a) * r * d, y = cy + Math.sin(a) * r * 0.8 * d, t = a + Math.PI / 2 + rr(-0.5, 0.5), l = rr(30, 70);
    o.push(`<path d="M${f1(x - Math.cos(t) * l / 2)},${f1(y - Math.sin(t) * l / 2)} L${f1(x + Math.cos(t) * l / 2)},${f1(y + Math.sin(t) * l / 2)}" stroke="${R() < 0.3 ? "#d6cdb8" : pickC()}" stroke-width="${f1(rr(4, 8))}" stroke-linecap="round"/>`);
  }
  o.push(`<path d="${smooth(blobPts(cx, cy, r * 0.55, r * 0.42, 10, 0.2))}" fill="#a88a4a" opacity="0.85"/>`);
  for (let i = 0; i < 60; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * r * 0.5; o.push(`<path d="M${f1(cx + Math.cos(a) * d)},${f1(cy + Math.sin(a) * d * 0.8)} l${f1(rr(-20, 20))},${f1(rr(-12, 12))}" stroke="#d8b660" stroke-width="2.5"/>`); }
  for (const [dx, dy] of [[-30, -10], [20, 6], [-4, 30]]) o.push(`<ellipse cx="${cx + dx}" cy="${cy + dy}" rx="30" ry="24" fill="#6a7a5a" stroke="#1e2618" stroke-width="3"/><ellipse cx="${cx + dx - 8}" cy="${cy + dy - 8}" rx="9" ry="6" fill="rgba(255,255,255,0.25)"/>`);
  return `<g filter="url(#soft)">${o.join("")}</g>`;
}
function pickC() { return ["#5a4428", "#6b5230", "#3e2e18"][Math.floor(R() * 3)]; }
function carcass(x, y, rot) {
  const o = [`<path d="M-120,0 Q-60,-20 0,0 T120,0" stroke="#d6cdb8" stroke-width="12" fill="none" stroke-linecap="round"/>`];
  for (let i = 0; i < 9; i++) { const xx = -90 + i * 20; o.push(`<path d="M${xx},-4 q14,-40 34,-52 M${xx},4 q14,40 34,52" stroke="#cfc6b1" stroke-width="7" fill="none" stroke-linecap="round"/>`); }
  o.push(`<path d="M120,0 l50,-20 l26,14 l-24,22z" fill="#ddd5c2" stroke="#3a3328" stroke-width="3"/><path d="M180,-14 q24,-20 40,-36 M180,10 q24,16 40,34" stroke="#cfc6b1" stroke-width="6" fill="none" stroke-linecap="round"/>`);
  return `<g filter="url(#soft)" transform="translate(${x} ${y}) rotate(${rot})">${o.join("")}</g>`;
}

/* ---------- сборка ---------- */
function draw() {
  lights.length = 0; glows.length = 0;
  const L = [];
  // Толща скалы.
  L.push(`<rect width="${W}" height="${H}" fill="#8a7a66" filter="url(#cave-rock)"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="rgba(20,14,10,0.25)"/>`);

  // Пол пещеры: залы и извилистый ход (одна сплошная фигура с внутренней тенью по краю).
  const rooms = [
    roughen([[-60, 640], [180, 560], [430, 560], [700, 600], [840, 700], [800, 900], [700, 1150], [720, 1330], [560, 1420], [330, 1430], [120, 1360], [-60, 1300]], 45, 16), // вход
    roughen([[760, 640], [900, 300], [1150, 140], [1500, 120], [1850, 130], [2120, 200], [2200, 480], [2160, 760], [2000, 980], [1700, 1080], [1300, 1100], [980, 1020], [800, 900]], 45, 18), // озеро
    roughen([[1850, 820], [2200, 720], [2700, 780], [2950, 900], [2960, 1300], [2900, 1700], [2700, 1920], [2300, 1940], [1960, 1860], [1800, 1600], [1780, 1250]], 45, 18) // логово
  ];
  const tunnel = [[620, 1300], [800, 1520], [1040, 1640], [1250, 1580], [1430, 1720], [1620, 1650], [1780, 1480], [1900, 1350]];
  const tunnelBlobs = along(tunnel, 34).map(([x, y], i) => smooth(blobPts(x, y, rr(62, 88), rr(62, 88), 8, 0.35, i)));
  const grotto = smooth(blobPts(1140, 1640, 190, 150, 10, 0.25));
  const floorShapes = [...rooms.map(smooth), ...tunnelBlobs, grotto, smooth(blobPts(1990, 1000, 160, 130, 8, 0.3))];
  L.push(`<g filter="url(#cave-inner)">${floorShapes.map(d => `<path d="${d}" fill="url(#cave-floor)"/>`).join("")}</g>`);
  L.push(`<g opacity="0.35">${floorShapes.slice(0, 3).map(d => `<path d="${d}" fill="#000" filter="url(#grain)"/>`).join("")}</g>`);

  /* --- Вход: дневной свет, мох и трава у устья --- */
  L.push(`<path d="${smooth(roughen([[-60, 660], [160, 640], [260, 760], [240, 1000], [300, 1200], [140, 1340], [-60, 1290]], 40, 22))}" fill="#4e5a2e" opacity="0.75" filter="url(#cave-blur)"/>`);
  for (let i = 0; i < 420; i++) { const x = rr(0, 260), y = rr(680, 1300), l = rr(10, 22), a = rr(-2.4, -0.7); L.push(`<path d="M${f1(x)},${f1(y)} l${f1(Math.cos(a) * l)},${f1(Math.sin(a) * l)}" stroke="${R() < 0.5 ? "#7c8f3c" : "#5a6e2a"}" stroke-width="3" stroke-linecap="round"/>`); }
  L.push(`<path d="M80,560 q40,120 10,220 M150,570 q-20,90 30,180 M60,1420 q50,-80 20,-160" stroke="#3a5a22" stroke-width="7" fill="none" stroke-linecap="round" filter="url(#soft)"/>`);
  glows.push(`<ellipse cx="80" cy="980" rx="520" ry="460" fill="url(#cave-day)"/>`);
  lights.push([60, 980, 760, 1], [400, 1000, 380, 0.6]);
  L.push(stalCluster(560, 700, 5, 70, 46), stalCluster(620, 1250, 4, 60, 40), stalagmite(330, 1350, 36));
  // брошенный лагерь искателей приключений
  L.push(`<circle cx="430" cy="1020" r="58" fill="#1e1712"/>${Array.from({ length: 9 }, (_, i) => { const a = i / 9 * 6.28; return `<path d="${smooth(blobPts(430 + Math.cos(a) * 62, 1020 + Math.sin(a) * 62, 14, 11, 6, 0.4))}" fill="#7a7062" stroke="#2a241e" stroke-width="2"/>`; }).join("")}<path d="M405,1000 L455,1040 M455,1000 L405,1040" stroke="#2a1a0c" stroke-width="9" stroke-linecap="round"/>`);
  L.push(`<g filter="url(#soft)"><rect x="520" y="900" width="64" height="80" rx="16" fill="#6a5232" stroke="#2a1d0e" stroke-width="3" transform="rotate(18 552 940)"/><rect x="300" y="880" width="120" height="44" rx="14" fill="#5a3c2a" stroke="#1d1007" stroke-width="3" transform="rotate(-12 360 902)"/></g>`);
  L.push(scatterBones(560, 1120, 40, 5));

  /* --- Подземное озеро --- */
  const lakePts = roughen([[900, 420], [1080, 270], [1400, 230], [1720, 260], [2080, 300], [2140, 560], [2060, 760], [1800, 860], [1480, 900], [1180, 870], [960, 760], [870, 600]], 40, 14);
  const lake = smooth(lakePts);
  L.push(`<path d="${lake}" fill="rgba(0,0,0,0.5)" transform="translate(6 10)" filter="url(#cave-blur)"/>`);
  L.push(`<path d="${lake}" fill="url(#cave-water)"/>`);
  L.push(`<defs><clipPath id="cave-lakeclip"><path d="${lake}"/></clipPath></defs><g clip-path="url(#cave-lakeclip)"><rect x="800" y="200" width="1400" height="760" filter="url(#cave-caustic)" opacity="0.22"/>
    ${Array.from({ length: 16 }, () => { const x = rr(1000, 1950), y = rr(330, 820), w = rr(40, 120); return `<path d="M${f1(x)},${f1(y)} q${f1(w / 2)},-10 ${f1(w)},0" stroke="rgba(170,230,235,0.22)" stroke-width="3" fill="none"/>`; }).join("")}
    <path d="${lake}" fill="none" stroke="rgba(0,10,15,0.6)" stroke-width="60" filter="url(#cave-blur)"/></g>`);
  L.push(`<path d="${lake}" fill="none" stroke="rgba(170,230,230,0.35)" stroke-width="6"/><path d="${lake}" fill="none" stroke="rgba(170,230,230,0.15)" stroke-width="22" filter="url(#cave-blur)"/>`);
  // камни в воде и островок со сталагмитом
  for (const [x, y, r] of [[1150, 480, 34], [1270, 560, 28], [1390, 620, 30], [1560, 700, 26], [1880, 660, 40], [1010, 700, 30]]) L.push(`<ellipse cx="${x + 4}" cy="${y + 8}" rx="${r + 8}" ry="${r * 0.8 + 6}" fill="rgba(150,210,210,0.18)"/>`, boulder(x, y, r, r * 0.8, R()));
  L.push(`<path d="${smooth(blobPts(1640, 470, 110, 80, 10, 0.3))}" fill="#4a4034" stroke="#1a140e" stroke-width="4" filter="url(#soft)"/>`, stalCluster(1640, 470, 4, 40, 34));
  L.push(skull(1690, 520, 1.1, 30), bone(1600, 520, 1, 70));
  // берега: кристаллы и сталагмиты
  L.push(crystals(980, 240, 7, "C", 110, 0.9, 1.4, 420), crystals(2110, 830, 6, "V", 90, -2.4, 1.3, 360), crystals(1420, 1030, 5, "C", 80, -1.5, 1.2, 320));
  L.push(stalCluster(1200, 960, 4, 60, 34), stalCluster(1850, 980, 3, 40, 30), stalCluster(1830, 180, 5, 70, 34), stalagmite(900, 860, 30));
  L.push(scatterBones(1010, 920, 40, 6));

  /* --- Карниз над озером (возвышенность) --- */
  const ledge = roughen([[2060, 120], [2360, 60], [2720, 70], [2940, 190], [2960, 460], [2920, 700], [2900, 920], [2760, 920], [2720, 720], [2520, 690], [2290, 650], [2130, 560], [2080, 360]], 36, 10);
  L.push(`<path d="${smooth(ledge)}" fill="#2c241c" transform="translate(16 26)" filter="url(#cave-cliff)"/>`);
  L.push(`<path d="${smooth(ledge)}" fill="#8a7c68" filter="url(#cave-slab)"/>`);
  L.push(`<path d="${smooth(ledge)}" fill="none" stroke="rgba(235,220,190,0.35)" stroke-width="5"/>`);
  { const o = []; for (let i = 0; i < 16; i++) { let x = rr(2150, 2880), y = rr(120, 640), d = `M${f1(x)},${f1(y)}`; const a0 = R() * 6.28; for (let k = 0; k < 5; k++) { x += Math.cos(a0 + rr(-0.7, 0.7)) * rr(20, 45); y += Math.sin(a0 + rr(-0.7, 0.7)) * rr(20, 45); d += ` L${f1(x)},${f1(y)}`; } o.push(d); } L.push(`<path d="${o.join(" ")}" stroke="rgba(30,22,14,0.55)" stroke-width="3" fill="none"/>`); }
  // пандус вниз к логову
  for (let i = 0; i < 8; i++) { const y = 720 + i * 26; L.push(`<path d="M${2770 + i * 2},${y} L${2905 - i},${y + 4}" stroke="rgba(30,22,14,0.55)" stroke-width="4"/>`); }
  L.push(boulder(2240, 470, 70, 52, 0.4), boulder(2330, 540, 46, 38, 1), boulder(2560, 560, 64, 48, 2), boulder(2440, 180, 56, 44, 0.3), boulder(2860, 300, 60, 50, 1.2));
  L.push(stalCluster(2780, 130, 4, 40, 30), stalagmite(2160, 220, 30));
  L.push(crystals(2660, 120, 6, "V", 100, 1.6, 1.3, 400), crystals(2930, 560, 4, "C", 70, 3.1, 1.1, 300));
  L.push(rubble(2420, 620, 50, 8, 14), scatterBones(2650, 380, 40, 5));
  // лестничные выбоины и верёвка по краю
  L.push(`<path d="M2130,560 q-40,30 -60,90" stroke="#a88a54" stroke-width="5" fill="none" stroke-dasharray="10 5"/><circle cx="2135" cy="556" r="8" fill="#555" stroke="#111" stroke-width="2"/>`);

  /* --- Извилистый проход --- */
  L.push(stalCluster(860, 1440, 4, 50, 30), stalCluster(1260, 1500, 3, 30, 28), stalCluster(1500, 1760, 3, 40, 30), stalCluster(1700, 1540, 3, 30, 26), stalagmite(980, 1720, 26));
  L.push(rubble(1050, 1590, 60, 14, 18), rubble(1390, 1660, 50, 12, 18), rubble(740, 1380, 40, 8, 16), rubble(1820, 1420, 50, 10, 18));
  L.push(puddle(1210, 1700, 70, 40), puddle(1580, 1700, 50, 30));
  L.push(mushrooms(900, 1580, 9, 40), mushrooms(1330, 1580, 7, 32), mushrooms(1680, 1600, 6, 28));
  L.push(scatterBones(1460, 1690, 40, 5));

  /* --- Логово --- */
  L.push(`<path d="${smooth(blobPts(2350, 1420, 420, 300, 12, 0.2))}" fill="rgba(30,18,10,0.35)" filter="url(#cave-blur)"/>`); // вытоптанная земля
  L.push(nest(2180, 1330, 170));
  L.push(hoard(2560, 1560));
  L.push(chest(2790, 1380, -14));
  L.push(carcass(2160, 1690, -16));
  L.push(scatterBones(2400, 1150, 90, 18), scatterBones(1990, 1500, 70, 12), scatterBones(2750, 1780, 60, 10), scatterBones(2420, 1820, 50, 8));
  L.push(boulder(2000, 1120, 80, 60, 0.3), boulder(2700, 1040, 90, 66, 1.1), boulder(2880, 1580, 70, 90, 2), boulder(2280, 1880, 60, 44, 0.6), boulder(1900, 1720, 66, 50, 2.3));
  L.push(stalCluster(2500, 960, 4, 50, 36), stalCluster(2900, 1200, 3, 40, 30));
  L.push(claws(2350, 1080, -20), claws(2830, 1250, 40, 100), claws(1950, 1300, 100, 110));
  L.push(crystals(2470, 1900, 6, "V", 100, -1.6, 1.3, 420), crystals(1870, 900, 4, "C", 70, 0.3, 1.1, 280));
  // тлеющий костёр-лежбище
  L.push(`<circle cx="2420" cy="1380" r="46" fill="#1a120c"/><circle cx="2420" cy="1380" r="30" fill="#7a2a0a" filter="url(#glow)"/><circle cx="2416" cy="1376" r="14" fill="#ffb04a" filter="url(#glow)"/>`);
  glows.push(`<circle cx="2420" cy="1380" r="380" fill="url(#cave-ember)"/>`);
  lights.push([2420, 1380, 520, 1], [2560, 1560, 380, 0.7]);

  /* --- Свет и тьма --- */
  L.push(`<g style="mix-blend-mode:screen">${glows.join("")}</g>`);
  const mask = `<mask id="cave-dark" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${lights.map(([x, y, r, s]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="url(#cave-hole)" opacity="${s}"/>`).join("")}</mask>`;
  L.push(`<defs>${mask}</defs><rect width="${W}" height="${H}" fill="#04060a" opacity="0.72" mask="url(#cave-dark)"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="url(#cave-vignette)"/>`);
  return L.join("\n");
}

const ZONES = [
  { id: "entrance", name: "Вход в пещеру", tags: [], poly: [[0, 0], [780, 0], [820, 620], [760, 1150], [660, 2000], [0, 2000]], label: [400, 1240], size: 56 },
  { id: "lake", name: "Подземное озеро", tags: ["hazard", "difficult"], poly: [[780, 0], [2060, 0], [2050, 400], [2120, 640], [2000, 860], [1760, 1150], [760, 1150], [820, 620]], label: [1420, 1080], size: 56 },
  { id: "ledge", name: "Карниз", tags: ["elevated", "cover"], poly: [[2060, 0], [3000, 0], [3000, 940], [2700, 940], [2700, 720], [2120, 640], [2050, 400]], label: [2520, 340] },
  { id: "passage", name: "Извилистый проход", tags: ["difficult", "dark"], poly: [[760, 1150], [1760, 1150], [1720, 2000], [660, 2000]], label: [1180, 1880], size: 50 },
  { id: "lair", name: "Логово", tags: ["cover"], poly: [[1760, 1150], [2000, 860], [2120, 640], [2700, 720], [2700, 940], [3000, 940], [3000, 2000], [1720, 2000]], label: [2440, 1250] }
];
const LINKS = [
  ["entrance", "lake", "short"], ["entrance", "passage", "short"], ["passage", "lair", "short"],
  ["lake", "lair", "short"], ["lake", "ledge", "medium"], ["ledge", "lair", "short"]
];

export default {
  key: "cave-lair", name: "Логово в пещере", folder: "Подземелья", worlds: ["fantasy", "terrinoth", "mythic", "monster"],
  bgColor: "#120e0b", extraDefs: EXTRA, draw, zones: ZONES, links: LINKS,
  style: { tint: "rgba(200,230,255,0.03)", line: "rgba(220,235,240,0.85)", text: "#eaf4f6" }
};
