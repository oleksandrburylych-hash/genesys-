import { W, H, rng, f1, poly } from "../lib.mjs";

/* ==========================================================================
   Карта: склад в порту (современность, ночь, вид сверху)
   Слева — погрузочный двор с фурой; в центре — склад без крыши (стеллажи, контора на антресоли);
   снизу — лабиринт морских контейнеров; справа — причал с козловым краном, вода и борт судна.
   ========================================================================== */
const K = "harbor-warehouse";
const WH = { x: 930, y: 40, x2: 2230, y2: 1130 };   // стены склада (оси)
const QUAY = 2640;                                   // кромка причала
const MEZ = { x: 1580, y: 58, x2: 2212, y2: 540 };   // антресоль

function extraDefs() {
  const r = rng(K + "-defs");
  // Бетонные плиты с швами, пятнами и трещинами.
  const slabs = (id, base, tone) => {
    const o = [`<rect width="500" height="500" fill="${base}"/>`];
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const s = 0.9 + r() * 0.16;
      o.push(`<rect x="${i * 250}" y="${j * 250}" width="250" height="250" fill="rgba(${tone},${f1(0.06 + (s - 0.9) * 0.6)})" stroke="rgba(10,12,16,0.65)" stroke-width="3"/>`);
    }
    for (let k = 0; k < 7; k++) o.push(`<ellipse cx="${f1(r() * 500)}" cy="${f1(r() * 500)}" rx="${f1(10 + r() * 50)}" ry="${f1(8 + r() * 30)}" fill="rgba(15,15,18,${f1(0.08 + r() * 0.15)})"/>`);
    for (let k = 0; k < 3; k++) { let x = r() * 500, y = r() * 500, d = `M${f1(x)},${f1(y)}`; for (let s = 0; s < 5; s++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; d += ` L${f1(x)},${f1(y)}`; } o.push(`<path d="${d}" stroke="rgba(10,10,12,0.5)" stroke-width="1.6" fill="none"/>`); }
    for (let k = 0; k < 120; k++) o.push(`<circle cx="${f1(r() * 500)}" cy="${f1(r() * 500)}" r="${f1(0.8 + r() * 1.6)}" fill="rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},0.18)"/>`);
    return `<pattern id="${K}-${id}" width="500" height="500" patternUnits="userSpaceOnUse">${o.join("")}</pattern>`;
  };
  // Асфальт контейнерной площадки.
  const asph = [`<rect width="300" height="300" fill="#3b3d42"/>`];
  for (let k = 0; k < 260; k++) { const g = Math.round(40 + r() * 70); asph.push(`<circle cx="${f1(r() * 300)}" cy="${f1(r() * 300)}" r="${f1(0.8 + r() * 1.8)}" fill="rgb(${g},${g},${g + 4})"/>`); }
  // Вода: короткие гребни волн.
  const water = [`<rect width="360" height="360" fill="#0d2a33"/>`];
  for (let k = 0; k < 60; k++) { const x = r() * 360, y = r() * 360, l = 14 + r() * 40; water.push(`<path d="M${f1(x)},${f1(y)} q${f1(l / 2)},${f1(-4 - r() * 4)} ${f1(l)},0" stroke="rgba(150,200,210,${f1(0.08 + r() * 0.14)})" stroke-width="${f1(1.5 + r() * 2)}" fill="none" stroke-linecap="round"/>`); }
  return `<defs>
    ${slabs("concrete", "#6a6a66", "255,250,240")}
    ${slabs("floor", "#4c4f53", "200,210,220")}
    ${slabs("quay", "#77756f", "255,248,236")}
    <pattern id="${K}-asphalt" width="300" height="300" patternUnits="userSpaceOnUse">${asph.join("")}</pattern>
    <pattern id="${K}-water" width="360" height="360" patternUnits="userSpaceOnUse">${water.join("")}</pattern>
    <pattern id="${K}-diamond" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#5d6166"/><path d="M4,8 l6,-4 M14,20 l6,-4 M14,4 l6,4 M4,16 l6,4" stroke="#81868c" stroke-width="3" stroke-linecap="round"/></pattern>
    <pattern id="${K}-hatch" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="36" height="36" fill="rgba(0,0,0,0)"/><rect width="14" height="36" fill="rgba(230,180,40,0.75)"/></pattern>
    <pattern id="${K}-stripes" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="40" height="40" fill="#1c1c1c"/><rect width="20" height="40" fill="#e0b22c"/></pattern>
    <pattern id="${K}-wall" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#6c727a"/><rect width="12" height="24" fill="#5a6068"/></pattern>
    <radialGradient id="${K}-hole"><stop offset="0" stop-color="#000" stop-opacity="1"/><stop offset="0.55" stop-color="#000" stop-opacity="0.6"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <radialGradient id="${K}-sodium"><stop offset="0" stop-color="rgba(255,190,110,0.42)"/><stop offset="0.5" stop-color="rgba(255,160,80,0.14)"/><stop offset="1" stop-color="rgba(255,140,60,0)"/></radialGradient>
    <radialGradient id="${K}-led"><stop offset="0" stop-color="rgba(190,220,255,0.36)"/><stop offset="0.5" stop-color="rgba(160,200,255,0.12)"/><stop offset="1" stop-color="rgba(150,190,255,0)"/></radialGradient>
    <radialGradient id="${K}-screen"><stop offset="0" stop-color="rgba(120,200,255,0.45)"/><stop offset="1" stop-color="rgba(120,200,255,0)"/></radialGradient>
    <radialGradient id="${K}-vig" cx="50%" cy="50%" r="72%"><stop offset="0.55" stop-color="rgba(4,8,20,0)"/><stop offset="1" stop-color="rgba(2,5,14,0.7)"/></radialGradient>
    <linearGradient id="${K}-reflect" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgba(255,180,90,0)"/><stop offset="0.5" stop-color="rgba(255,180,90,0.5)"/><stop offset="1" stop-color="rgba(255,180,90,0)"/></linearGradient>
    <filter id="${K}-high" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="14" dy="22" stdDeviation="14" flood-color="rgba(0,0,0,0.7)"/></filter>
    <filter id="${K}-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
    ${darkMask()}
  </defs>`;
}

/* ---------- Источники света (маска темноты + цветные пятна) ---------- */
const LIGHTS = [ // x, y, радиус, тип
  [470, 640, 520, "sodium"], [420, 1500, 520, "sodium"], [1580, 1600, 480, "sodium"], [2440, 330, 520, "sodium"], [2440, 1520, 540, "sodium"],
  [1080, 330, 190, "led"], [1600, 900, 200, "led"], [2160, 820, 180, "led"], [1960, 220, 330, "led"]
];
function darkMask() {
  return `<mask id="${K}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${LIGHTS.map(([x, y, rr, t]) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="url(#${K}-hole)" opacity="${t === "led" ? 0.75 : 1}"/>`).join("")}</mask>`;
}

/* ---------- Примитивы ---------- */
const S = `filter="url(#soft)"`;
function box(x, y, w, h, rot = 0, col = "#a4784a") {
  return `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}" stroke="#3a2814" stroke-width="2"/><path d="M${x + w / 2},${y + 1} V${y + h - 1}" stroke="rgba(220,200,150,0.7)" stroke-width="${f1(Math.min(w, h) * 0.18)}"/></g>`;
}
function pallet(x, y, w = 100, h = 100, load = "boxes", r = Math.random, rot = 0) {
  let o = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#3a2a1a"/>`;
  for (let i = 0; i < 5; i++) o += `<rect x="${f1(x + 2 + i * (w - 4) / 5)}" y="${y + 2}" width="${f1((w - 4) / 5 - 6)}" height="${h - 4}" fill="#b8955e" stroke="#5a4020" stroke-width="1.5"/>`;
  if (load === "boxes") {
    const n = 2 + Math.floor(r() * 2), m = 2 + Math.floor(r() * 2), bw = (w - 8) / n, bh = (h - 8) / m;
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) if (r() > 0.08) o += box(x + 4 + i * bw + 1, y + 4 + j * bh + 1, bw - 2, bh - 2, 0, ["#a4784a", "#b08552", "#957046"][Math.floor(r() * 3)]);
  } else if (load === "wrap") {
    o += `<rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" rx="6" fill="#8e9aa4" stroke="#4a545c" stroke-width="2"/><path d="M${x + 8},${y + 12} L${x + w - 12},${y + h - 8} M${x + 10},${y + h * 0.6} L${x + w * 0.5},${y + h - 6}" stroke="rgba(255,255,255,0.35)" stroke-width="4"/>`;
  } else if (load === "drums") {
    for (const [dx, dy] of [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]]) o += drumTop(x + w * dx, y + h * dy, w * 0.22, r() < 0.5 ? "#2f5d8a" : "#8a2f2a");
  } else if (load === "sacks") {
    for (const [dx, dy] of [[0.3, 0.3], [0.7, 0.32], [0.32, 0.72], [0.7, 0.7]]) o += `<ellipse cx="${f1(x + w * dx)}" cy="${f1(y + h * dy)}" rx="${f1(w * 0.24)}" ry="${f1(h * 0.2)}" fill="#c6b38a" stroke="#6a5a3a" stroke-width="2"/>`;
  }
  return `<g ${S} transform="rotate(${rot} ${x + w / 2} ${y + h / 2})">${o}</g>`;
}
function drumTop(x, y, rr, col = "#2f5d8a") {
  return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr)}" fill="${col}" stroke="#111" stroke-width="2.5"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr * 0.78)}" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2"/><circle cx="${f1(x - rr * 0.4)}" cy="${f1(y - rr * 0.3)}" r="${f1(rr * 0.14)}" fill="#222"/>`;
}
function drum(x, y, rr = 30, col = "#2f5d8a") { return `<g ${S}>${drumTop(x, y, rr, col)}</g>`; }

function container(x, y, w, h, col, opt = {}) {
  const vertical = h > w, L = [];
  const dark = `rgba(0,0,0,0.35)`, lite = `rgba(255,255,255,0.13)`;
  L.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}" stroke="#15171a" stroke-width="5"/>`);
  if (vertical) for (let yy = y + 14; yy < y + h - 10; yy += 14) L.push(`<path d="M${x + 6},${yy} H${x + w - 6}" stroke="${(yy / 14) % 2 < 1 ? dark : lite}" stroke-width="5"/>`);
  else for (let xx = x + 14; xx < x + w - 10; xx += 14) L.push(`<path d="M${xx},${y + 6} V${y + h - 6}" stroke="${(xx / 14) % 2 < 1 ? dark : lite}" stroke-width="5"/>`);
  L.push(`<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="4"/>`);
  for (const [cx, cy] of [[x, y], [x + w - 16, y], [x, y + h - 16], [x + w - 16, y + h - 16]]) L.push(`<rect x="${cx}" y="${cy}" width="16" height="16" fill="#1d1f22"/>`);
  if (opt.rust) L.push(`<ellipse cx="${x + w * 0.6}" cy="${y + h * 0.4}" rx="${w * 0.12}" ry="${h * 0.16}" fill="rgba(120,60,20,0.35)"/>`);
  if (opt.stripe) L.push(vertical ? `<rect x="${x + 10}" y="${y + h * 0.35}" width="${w - 20}" height="30" fill="rgba(255,255,255,0.35)"/>` : `<rect x="${x + w * 0.35}" y="${y + 10}" width="30" height="${h - 20}" fill="rgba(255,255,255,0.35)"/>`);
  if (opt.open) { // распахнутые двери на торце
    const ex = opt.open === "right" ? x + w : x, s = opt.open === "right" ? 1 : -1;
    L.push(`<path d="M${ex},${y + 4} l${s * 54},-40 M${ex},${y + h - 4} l${s * 54},40" stroke="${col}" stroke-width="10" stroke-linecap="round"/><path d="M${ex},${y + 4} l${s * 54},-40 M${ex},${y + h - 4} l${s * 54},40" stroke="rgba(0,0,0,0.35)" stroke-width="10" stroke-linecap="round"/><rect x="${opt.open === "right" ? ex - 40 : ex}" y="${y + 6}" width="40" height="${h - 12}" fill="#121315"/>`);
  }
  return `<g filter="url(#${opt.stack ? `${K}-high` : "soft"})" transform="rotate(${opt.rot ?? 0} ${x + w / 2} ${y + h / 2})">${L.join("")}${opt.stack ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(255,255,255,0.06)"/>` : ""}</g>`;
}

function semiTruck(x, y) { // задом к доку, кабина слева; (x,y) — задний левый угол прицепа
  const tw = 560, th = 136, L = [];
  for (const ax of [x - 90, x - 50, x - 470]) for (const s of [-1, 1]) L.push(`<rect x="${ax - 34}" y="${s < 0 ? y - 8 : y + th - 6}" width="68" height="14" rx="4" fill="#111"/>`);
  L.push(`<rect x="${x - tw}" y="${y}" width="${tw}" height="${th}" rx="4" fill="#cfd2d6" stroke="#2a2d31" stroke-width="5"/>`);
  for (let xx = x - tw + 22; xx < x - 8; xx += 26) L.push(`<path d="M${xx},${y + 4} V${y + th - 4}" stroke="rgba(60,64,70,0.35)" stroke-width="3"/>`);
  L.push(`<rect x="${x - tw + 140}" y="${y + 6}" width="260" height="${th - 12}" fill="rgba(30,80,140,0.55)"/><path d="M${x - tw + 160},${y + th / 2} H${x - tw + 380}" stroke="rgba(255,255,255,0.5)" stroke-width="8" stroke-dasharray="40 14"/>`);
  // Кабина.
  const cx = x - tw - 30, cw = 175;
  L.push(`<rect x="${cx - cw}" y="${y + 2}" width="${cw}" height="${th - 4}" rx="22" fill="#a32a24" stroke="#2a0d0b" stroke-width="5"/>`);
  L.push(`<rect x="${cx - cw + 40}" y="${y + 14}" width="${cw - 70}" height="${th - 28}" rx="12" fill="#c43a30"/><rect x="${cx - cw + 18}" y="${y + 14}" width="26" height="${th - 28}" rx="8" fill="#1a2a3a"/><path d="M${cx - cw + 22},${y + 22} l14,40" stroke="rgba(255,255,255,0.3)" stroke-width="4"/>`);
  L.push(`<rect x="${cx - cw + 26}" y="${y - 16}" width="12" height="20" fill="#222"/><rect x="${cx - cw + 26}" y="${y + th - 4}" width="12" height="20" fill="#222"/>`);
  L.push(`<rect x="${cx}" y="${y + th / 2 - 10}" width="34" height="20" fill="#222"/>`);
  // Фары (свет на бетоне).
  L.push(`<path d="M${cx - cw},${y + 20} L${cx - cw - 300},${y - 50} L${cx - cw - 300},${y + th + 50} L${cx - cw},${y + th - 20} Z" fill="url(#${K}-reflect)" opacity="0.0"/>`);
  return `<g ${S}>${L.join("")}</g>`;
}

function forklift(x, y, rot = 0, load = "") {
  const L = [];
  L.push(`<rect x="${x - 40}" y="${y - 52}" width="14" height="26" rx="3" fill="#111"/><rect x="${x + 26}" y="${y - 52}" width="14" height="26" rx="3" fill="#111"/><rect x="${x - 38}" y="${y + 30}" width="12" height="22" rx="3" fill="#111"/><rect x="${x + 26}" y="${y + 30}" width="12" height="22" rx="3" fill="#111"/>`);
  L.push(`<rect x="${x - 34}" y="${y - 60}" width="68" height="120" rx="12" fill="#e2a92a" stroke="#3a2a08" stroke-width="4"/>`);
  L.push(`<rect x="${x - 34}" y="${y + 30}" width="68" height="34" rx="14" fill="#3a3a3a" stroke="#111" stroke-width="3"/>`);
  L.push(`<rect x="${x - 26}" y="${y - 40}" width="52" height="64" fill="none" stroke="#222" stroke-width="6"/><path d="M${x - 26},${y - 20} H${x + 26} M${x - 26},${y} H${x + 26}" stroke="#222" stroke-width="4"/><circle cx="${x}" cy="${y + 8}" r="12" fill="#222"/>`);
  L.push(`<rect x="${x - 36}" y="${y - 72}" width="72" height="12" fill="#2a2a2a"/><rect x="${x - 26}" y="${y - 150}" width="12" height="80" fill="#9a9a9a" stroke="#333" stroke-width="2"/><rect x="${x + 14}" y="${y - 150}" width="12" height="80" fill="#9a9a9a" stroke="#333" stroke-width="2"/>`);
  if (load) L.push(pallet(x - 48, y - 168, 96, 96, load, rng(K + x + y)).replace(S, ""));
  return `<g ${S} transform="rotate(${rot} ${x} ${y})">${L.join("")}</g>`;
}

function rackRow(x, y, w, h, r) { // ряд стеллажей; длинная сторона по вертикали
  const L = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1b1d20"/>`];
  const bay = 150;
  for (let yy = y; yy < y + h - 10; yy += bay) {
    const bh = Math.min(bay, y + h - yy);
    for (const half of [0, 1]) {
      if (r() < 0.14) continue;
      const kinds = ["boxes", "boxes", "wrap", "drums", "sacks", "boxes"];
      L.push(pallet(x + 8 + half * (w / 2 - 4), yy + 14, w / 2 - 12, bh - 28, kinds[Math.floor(r() * kinds.length)], r).replace(S, ""));
    }
    L.push(`<rect x="${x - 4}" y="${yy - 5}" width="${w + 8}" height="10" fill="#2f5aa0" stroke="#10203a" stroke-width="2"/>`);
  }
  L.push(`<rect x="${x - 4}" y="${y + h - 5}" width="${w + 8}" height="10" fill="#2f5aa0" stroke="#10203a" stroke-width="2"/>`);
  L.push(`<path d="M${x},${y} V${y + h} M${x + w},${y} V${y + h} M${x + w / 2},${y} V${y + h}" stroke="#e0742a" stroke-width="7"/>`);
  return `<g filter="url(#${K}-high)">${L.join("")}</g>`;
}

function lightPole(x, y, dir = 0) {
  return `<g ${S}><circle cx="${x}" cy="${y}" r="20" fill="#3a3d42" stroke="#111" stroke-width="3"/><g transform="rotate(${dir} ${x} ${y})"><rect x="${x}" y="${y - 6}" width="70" height="12" fill="#2a2d31"/><rect x="${x + 60}" y="${y - 26}" width="46" height="52" rx="6" fill="#2a2d31" stroke="#111" stroke-width="3"/><rect x="${x + 66}" y="${y - 20}" width="34" height="40" rx="4" fill="#fff1c8" filter="url(#glow)"/></g></g>`;
}
function bollard(x, y) { return `<g ${S}><circle cx="${x}" cy="${y}" r="26" fill="#24272b" stroke="#0d0e10" stroke-width="4"/><circle cx="${x}" cy="${y}" r="17" fill="#3e434a"/><circle cx="${x - 5}" cy="${y - 5}" r="5" fill="rgba(255,255,255,0.2)"/></g>`; }
function mooring(x1, y1, x2, y2, sag = 20) {
  const d = `M${x1},${y1} Q${(x1 + x2) / 2},${(y1 + y2) / 2 + sag} ${x2},${y2}`;
  return `<path d="${d}" stroke="#1a1612" stroke-width="10" fill="none"/><path d="${d}" stroke="#c9b48a" stroke-width="6" fill="none"/><path d="${d}" stroke="rgba(80,60,30,0.6)" stroke-width="5" stroke-dasharray="3 5" fill="none"/>`;
}
function wallLine(segs, th = 34) {
  const d = segs.map(s => `M${s[0][0]},${s[0][1]} L${s[1][0]},${s[1][1]}`).join(" ");
  return `<g filter="url(#wallshadow)"><path d="${d}" stroke="#14161a" stroke-width="${th + 10}" stroke-linecap="square"/><path d="${d}" stroke="url(#${K}-wall)" stroke-width="${th}" stroke-linecap="square"/><path d="${d}" stroke="rgba(255,255,255,0.12)" stroke-width="3" stroke-linecap="square"/></g>`;
}
function rollDoor(x, y, len, vertical) {
  return vertical
    ? `<rect x="${x - 22}" y="${y}" width="44" height="${len}" fill="#202226"/><path d="M${x - 22},${y} V${y + len} M${x + 22},${y} V${y + len}" stroke="#e0b22c" stroke-width="6"/><rect x="${x - 26}" y="${y - 8}" width="52" height="8" fill="#888"/><rect x="${x - 26}" y="${y + len}" width="52" height="8" fill="#888"/>`
    : `<rect x="${x}" y="${y - 22}" width="${len}" height="44" fill="#202226"/><path d="M${x},${y - 22} H${x + len} M${x},${y + 22} H${x + len}" stroke="#e0b22c" stroke-width="6"/><rect x="${x - 8}" y="${y - 26}" width="8" height="52" fill="#888"/><rect x="${x + len}" y="${y - 26}" width="8" height="52" fill="#888"/>`;
}

function car(x, y, rot, col) { // легковой седан, (x,y) — центр, капот вправо
  return `<g ${S} transform="rotate(${rot} ${x} ${y})"><rect x="${x - 120}" y="${y - 52}" width="240" height="104" rx="34" fill="${col}" stroke="#0c0e12" stroke-width="4"/>
    <rect x="${x - 60}" y="${y - 44}" width="120" height="88" rx="18" fill="rgba(0,0,0,0.25)"/><path d="M${x + 30},${y - 42} q22,42 0,84 l26,0 q18,-42 0,-84 Z" fill="#16202c"/><path d="M${x - 64},${y - 40} q-14,40 0,80 l-22,0 q-12,-40 0,-80 Z" fill="#16202c"/>
    <rect x="${x - 34}" y="${y - 40}" width="62" height="80" rx="10" fill="${col}"/><path d="M${x + 36},${y - 30} l10,24" stroke="rgba(255,255,255,0.25)" stroke-width="4"/>
    <rect x="${x + 108}" y="${y - 40}" width="10" height="20" rx="3" fill="#fff6d8"/><rect x="${x + 108}" y="${y + 20}" width="10" height="20" rx="3" fill="#fff6d8"/><rect x="${x - 120}" y="${y - 40}" width="8" height="18" rx="3" fill="#b0201a"/><rect x="${x - 120}" y="${y + 22}" width="8" height="18" rx="3" fill="#b0201a"/>
    <rect x="${x + 22}" y="${y - 62}" width="14" height="10" rx="3" fill="${col}"/><rect x="${x + 22}" y="${y + 52}" width="14" height="10" rx="3" fill="${col}"/></g>`;
}

/* ---------- Слои ---------- */
function ground() {
  const L = [];
  L.push(`<rect width="${W}" height="${H}" fill="url(#${K}-concrete)"/>`);
  L.push(`<rect x="${WH.x}" y="${WH.y2}" width="${QUAY - WH.x}" height="${H - WH.y2}" fill="url(#${K}-asphalt)"/>`);
  L.push(`<rect x="${WH.x2}" y="0" width="${QUAY - WH.x2}" height="${H}" fill="url(#${K}-quay)"/>`);
  L.push(`<rect x="${WH.x}" y="${WH.y}" width="${WH.x2 - WH.x}" height="${WH.y2 - WH.y}" fill="url(#${K}-floor)"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="#000" filter="url(#grain)" opacity="0.45"/>`);
  L.push(`<rect width="${W}" height="${H}" filter="url(#dirt)" opacity="0.6"/>`);
  return L.join("\n");
}

function yard() {
  const r = rng(K + "-yard"), L = [];
  // Разметка: жёлтая полоса вдоль склада, места для фур, стрелки.
  L.push(`<rect x="${WH.x - 120}" y="60" width="90" height="${WH.y2 - 60}" fill="url(#${K}-hatch)" opacity="0.55"/>`);
  for (const y of [180, 480, 840]) L.push(`<path d="M${WH.x - 120},${y} H120" stroke="rgba(235,235,225,0.55)" stroke-width="8" stroke-dasharray="60 30"/>`);
  for (const [x, y, a] of [[300, 1130, 0], [620, 1680, 180], [300, 1820, 180]]) L.push(`<path d="M${x - 70},${y} H${x + 40} M${x + 10},${y - 30} L${x + 60},${y} L${x + 10},${y + 30}" stroke="rgba(235,235,225,0.5)" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="rotate(${a} ${x} ${y})"/>`);
  L.push(`<path d="M120,1300 H900 M120,1950 H900" stroke="rgba(230,190,60,0.7)" stroke-width="10"/>`);
  // Забор-сетка по левому краю с воротами.
  L.push(`<path d="M40,0 V1380 M40,1880 V2000" stroke="rgba(180,190,200,0.55)" stroke-width="5" stroke-dasharray="3 4"/>`);
  for (let y = 20; y < 2000; y += 120) if (y < 1380 || y > 1880) L.push(`<circle cx="40" cy="${y}" r="7" fill="#6a7078" stroke="#111" stroke-width="2"/>`);
  L.push(`<g ${S}><rect x="52" y="1388" width="22" height="22" fill="#333"/><rect x="58" y="1400" width="10" height="440" fill="#e8e8e8"/>${Array.from({ length: 6 }, (_, i) => `<rect x="58" y="${1420 + i * 70}" width="10" height="35" fill="#c42a24"/>`).join("")}</g>`);
  L.push(`<g ${S}><rect x="90" y="1220" width="120" height="120" fill="#c8c4b8" stroke="#2a2a2a" stroke-width="5"/><rect x="100" y="1230" width="100" height="100" fill="#4a5058"/><rect x="104" y="1234" width="92" height="20" fill="#9fd0ff" opacity="0.6"/></g>`);
  // Фура у дока №1 и пустой полуприцеп.
  L.push(semiTruck(WH.x - 18, 262));
  L.push(`<g ${S}><rect x="250" y="1500" width="560" height="136" rx="4" fill="#5a6f4a" stroke="#1d2418" stroke-width="5"/>${Array.from({ length: 21 }, (_, i) => `<path d="M${272 + i * 26},1504 V1632" stroke="rgba(0,0,0,0.25)" stroke-width="3"/>`).join("")}<rect x="180" y="1555" width="72" height="26" fill="#2a2a2a"/><rect x="216" y="1530" width="14" height="76" fill="#444"/></g>`);
  // Погрузчик у дока №2 с поддоном, поддоны на площадке.
  L.push(forklift(760, 700, -90, "boxes"));
  L.push(pallet(560, 860, 100, 100, "boxes", r, 4), pallet(450, 870, 100, 100, "wrap", r, -3), pallet(560, 970, 100, 100, "boxes", r, 2));
  L.push(pallet(140, 650, 100, 100, "sacks", r, 0), `<g ${S}>${[0, 1, 2, 3, 4].map(i => `<rect x="130" y="${520 - i * 6}" width="110" height="100" fill="#b8955e" stroke="#5a4020" stroke-width="2"/>`).join("")}</g>`);
  // Мусорный контейнер, бочки.
  L.push(`<g ${S}><rect x="760" y="1760" width="150" height="96" rx="6" fill="#1f5a3a" stroke="#0a1a10" stroke-width="5"/><path d="M770,1808 H900" stroke="#0a1a10" stroke-width="4"/></g>`, drum(820, 1180, 28, "#8a2f2a"), drum(870, 1210, 28, "#2f5d8a"), drum(845, 1255, 28, "#8a2f2a"));
  // Легковушка охраны, следы шин, масляные пятна, лужи.
  L.push(car(330, 1200, 0, "#2b3c55"));
  L.push(`<path d="M120,1560 C400,1560 600,1700 900,1700 M120,1620 C400,1620 600,1760 900,1760" stroke="rgba(10,10,10,0.35)" stroke-width="22" fill="none" stroke-dasharray="6 5"/>`);
  for (let i = 0; i < 8; i++) L.push(`<ellipse cx="${f1(150 + r() * 700)}" cy="${f1(150 + r() * 1700)}" rx="${f1(20 + r() * 50)}" ry="${f1(14 + r() * 26)}" fill="rgba(5,5,8,${f1(0.25 + r() * 0.2)})"/>`);
  for (const [x, y, rx, ry] of [[640, 420, 110, 34], [300, 1440, 80, 26], [520, 1880, 120, 30]]) L.push(`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="rgba(20,40,60,0.55)"/><ellipse cx="${x - rx * 0.2}" cy="${y - ry * 0.2}" rx="${rx * 0.5}" ry="${ry * 0.3}" fill="rgba(255,190,120,0.2)"/>`);
  // Фонарные мачты.
  L.push(lightPole(140, 960, -40), lightPole(130, 1700, 10));
  return L.join("\n");
}

function warehouse() {
  const r = rng(K + "-wh"), L = [];
  // Разметка проходов.
  L.push(`<path d="M1040,${WH.y + 60} V${WH.y2 - 40} M2190,${MEZ.y2 + 40} V${WH.y2 - 40}" stroke="rgba(230,190,60,0.65)" stroke-width="8"/>`);
  L.push(`<rect x="1570" y="${WH.y2 - 120}" width="140" height="100" fill="url(#${K}-hatch)" opacity="0.6"/>`);
  // Стеллажи (ряды север–юг), поперечный проход посередине.
  L.push(rackRow(1160, 110, 110, 400, r), rackRow(1160, 700, 110, 380, r), rackRow(1400, 110, 110, 400, r), rackRow(1400, 700, 110, 380, r));
  L.push(rackRow(1760, 720, 110, 360, r), rackRow(2000, 720, 110, 360, r));
  // Зона приёмки у доков.
  L.push(pallet(980, 470, 90, 90, "wrap", r, 3), pallet(985, 830, 90, 90, "boxes", r, -5), pallet(985, 940, 90, 90, "boxes", r, 8));
  // Погрузчик и ручная тележка в проходах.
  L.push(forklift(1630, 980, 180, ""), `<g ${S} transform="rotate(20 1330 300)"><rect x="1310" y="250" width="40" height="110" fill="#c42a24" stroke="#300" stroke-width="3"/><rect x="1300" y="360" width="60" height="16" rx="6" fill="#222"/></g>`);
  // Рассыпанные коробки.
  L.push(`<g ${S}>${box(1300, 640, 40, 34, 18)}${box(1345, 662, 36, 30, -25)}${box(1320, 690, 30, 30, 40, "#957046")}</g>`);
  // Антресоль: настил из рифлёного листа, контора за стеклом.
  L.push(`<g filter="url(#${K}-high)"><rect x="${MEZ.x}" y="${MEZ.y}" width="${MEZ.x2 - MEZ.x}" height="${MEZ.y2 - MEZ.y}" fill="url(#${K}-diamond)" stroke="#1a1c1f" stroke-width="6"/></g>`);
  L.push(`<rect x="${MEZ.x}" y="${MEZ.y}" width="${MEZ.x2 - MEZ.x}" height="${MEZ.y2 - MEZ.y}" fill="rgba(0,0,0,0.2)"/>`);
  const ox = 1740, oy2 = 390;
  L.push(`<rect x="${ox}" y="${MEZ.y}" width="${MEZ.x2 - ox}" height="${oy2 - MEZ.y}" fill="#6e6458"/><rect x="${ox}" y="${MEZ.y}" width="${MEZ.x2 - ox}" height="${oy2 - MEZ.y}" fill="#000" filter="url(#grain)" opacity="0.4"/>`);
  L.push(`<rect x="1930" y="120" width="200" height="140" fill="#7a2a28" opacity="0.65"/>`); // ковёр
  // Мебель конторы.
  const desk = (x, y, rot) => `<g ${S} transform="rotate(${rot} ${x} ${y})"><rect x="${x - 70}" y="${y - 38}" width="140" height="76" rx="4" fill="#8a7a64" stroke="#2a2218" stroke-width="3"/><rect x="${x - 30}" y="${y - 34}" width="60" height="10" fill="#111"/><rect x="${x - 26}" y="${y - 24}" width="52" height="5" fill="#7fd0ff" filter="url(#glow)"/><rect x="${x - 24}" y="${y - 6}" width="48" height="14" fill="#333"/><rect x="${x + 30}" y="${y - 10}" width="28" height="36" fill="#eee" transform="rotate(12 ${x + 44} ${y + 8})"/><circle cx="${x}" cy="${y + 66}" r="24" fill="#2a2a2e" stroke="#000" stroke-width="3"/><rect x="${x - 22}" y="${y + 80}" width="44" height="12" rx="5" fill="#1a1a1e"/></g>`;
  L.push(desk(1830, 170, 0), desk(2040, 170, 0), desk(1830, 310, 180));
  L.push(`<g ${S}>${[0, 1, 2].map(i => `<rect x="${2140}" y="${110 + i * 70}" width="56" height="64" fill="#7c8288" stroke="#22262a" stroke-width="3"/><path d="M2146,${130 + i * 70} H2190 M2146,${150 + i * 70} H2190" stroke="#3a3f44" stroke-width="3"/>`).join("")}<rect x="2120" y="300" width="70" height="70" fill="#3a3d40" stroke="#111" stroke-width="4"/><circle cx="2155" cy="335" r="14" fill="#9a9a9a" stroke="#222" stroke-width="3"/></g>`);
  L.push(`<g ${S}><rect x="1960" y="320" width="110" height="52" rx="10" fill="#4a3a2e" stroke="#1a120a" stroke-width="3"/><circle cx="1765" cy="85" r="18" fill="#3e8a4a" stroke="#1a3a20" stroke-width="3"/><rect x="1755" y="100" width="20" height="10" fill="#5a3a2a"/></g>`);
  for (let i = 0; i < 9; i++) L.push(`<rect x="${f1(1880 + r() * 200)}" y="${f1(230 + r() * 70)}" width="26" height="34" fill="rgba(240,240,232,0.85)" transform="rotate(${f1(r() * 90)} ${f1(1890 + r() * 200)} ${f1(250 + r() * 70)})"/>`);
  // Стеклянные стены конторы и дверь.
  L.push(`<path d="M${ox},${MEZ.y} V${oy2} H${MEZ.x2}" stroke="#1b1e22" stroke-width="16" fill="none"/><path d="M${ox},${MEZ.y + 20} V${oy2 - 8} H${MEZ.x2 - 20}" stroke="rgba(150,210,240,0.7)" stroke-width="6" fill="none" stroke-dasharray="90 14"/>`);
  L.push(`<rect x="${ox - 9}" y="250" width="18" height="80" fill="#6e6458"/><path d="M${ox},250 l-70,24" stroke="#c8ccd0" stroke-width="7"/>`);
  // Перила антресоли и лестница вниз.
  L.push(`<path d="M${MEZ.x + 8},${MEZ.y + 10} V${MEZ.y2 - 8} H${MEZ.x + 10} M${MEZ.x + 120},${MEZ.y2 - 8} H${MEZ.x2 - 10}" stroke="#14161a" stroke-width="14" fill="none"/><path d="M${MEZ.x + 8},${MEZ.y + 10} V${MEZ.y2 - 8} M${MEZ.x + 120},${MEZ.y2 - 8} H${MEZ.x2 - 10}" stroke="#e0b22c" stroke-width="8" fill="none"/>`);
  let st = `<rect x="${MEZ.x + 10}" y="${MEZ.y2}" width="104" height="200" fill="#1a1c1f"/>`;
  for (let i = 0; i < 9; i++) st += `<rect x="${MEZ.x + 16}" y="${MEZ.y2 + 4 + i * 22}" width="92" height="17" fill="rgb(${110 - i * 6},${114 - i * 6},${120 - i * 6})" stroke="#111" stroke-width="2"/>`;
  L.push(`<g ${S}>${st}<path d="M${MEZ.x + 12},${MEZ.y2} V${MEZ.y2 + 200} M${MEZ.x + 112},${MEZ.y2} V${MEZ.y2 + 200}" stroke="#e0b22c" stroke-width="6"/></g>`);
  // Опорные колонны антресоли.
  for (const [x, y] of [[MEZ.x, MEZ.y2], [1900, MEZ.y2], [MEZ.x2 - 10, MEZ.y2]]) L.push(`<rect x="${x - 14}" y="${y - 14}" width="28" height="28" fill="#30343a" stroke="#0d0e10" stroke-width="3"/>`);
  // Подвесные лампы (видны сверху как плафоны).
  for (const [x, y] of [[1080, 330], [1600, 900], [2160, 820]]) L.push(`<circle cx="${x}" cy="${y}" r="20" fill="#dfe9ff" stroke="#30343a" stroke-width="5" filter="url(#glow)"/>`);
  // Стены склада с воротами.
  const { x, y, x2, y2 } = WH;
  L.push(wallLine([[[x, y], [x2, y]], [[x, y], [x, 240]], [[x, 420], [x, 600]], [[x, 780], [x, y2]], [[x, y2], [1520, y2]], [[1760, y2], [2060, y2]], [[2140, y2], [x2, y2]], [[x2, y], [x2, 620]], [[x2, 900], [x2, y2]]]));
  L.push(rollDoor(x, 240, 180, true), rollDoor(x, 600, 180, true), rollDoor(1520, y2, 240, false), rollDoor(x2, 620, 280, true));
  L.push(`<rect x="2064" y="${y2 - 14}" width="72" height="28" fill="#3a3f46" stroke="#111" stroke-width="3"/><path d="M2064,${y2 + 14} A72,72 0 0 0 2136,${y2 + 86}" stroke="rgba(255,255,255,0.3)" stroke-width="3" fill="none" stroke-dasharray="8 6"/>`);
  // Доковые аппарели (жёлто-чёрные кромки).
  L.push(`<rect x="${x - 70}" y="250" width="40" height="160" fill="url(#${K}-stripes)"/><rect x="${x - 70}" y="610" width="40" height="160" fill="url(#${K}-stripes)"/>`);
  for (const yy of [230, 410, 590, 770]) L.push(`<rect x="${x - 50}" y="${yy - 10}" width="30" height="20" fill="#111"/>`);
  return L.join("\n");
}

function containers() {
  const r = rng(K + "-cont"), L = [];
  L.push(`<path d="M960,1345 H2200 M960,1600 H2200 M960,1880 H2200" stroke="rgba(235,235,225,0.25)" stroke-width="6" stroke-dasharray="50 30"/>`);
  L.push(container(990, 1190, 540, 118, "#9a3a2a", { rust: true }));
  L.push(container(1660, 1190, 280, 118, "#2c5a8a", { stripe: true }));
  L.push(container(2060, 1200, 118, 540, "#3a6a3a", { stack: true, rust: true }));
  L.push(container(970, 1460, 280, 118, "#c46a1e", { open: "right" }));
  L.push(container(1380, 1440, 540, 118, "#5a5e66", {}), container(1390, 1452, 520, 110, "#2c5a8a", { stack: true, stripe: true }));
  L.push(container(1050, 1720, 540, 118, "#2a7a7a", { stack: true }));
  L.push(container(1720, 1690, 280, 118, "#8a3a22", { rot: 8, rust: true }));
  L.push(container(1100, 1900, 540, 118, "#6a2a5a", {}), container(1880, 1890, 280, 118, "#c49a2a", { open: "left" }));
  // Бочки, поддоны, мусор между контейнерами.
  L.push(drum(1590, 1290, 26, "#8a2f2a"), drum(1625, 1320, 26, "#2f5d8a"), drum(1300, 1650, 26, "#2f5d8a"), drum(1335, 1630, 26, "#8a2f2a"), drum(2000, 1820, 26, "#2f5d8a"));
  L.push(pallet(1290, 1520, 80, 80, "boxes", r, 12), pallet(1960, 1560, 90, 90, "wrap", r, -8), pallet(2120, 1820, 80, 80, "sacks", r, 0));
  L.push(`<g ${S}>${box(1655, 1560, 46, 40, 15)}${box(1700, 1590, 40, 40, -12)}${box(1215, 1395, 44, 38, 30)}</g>`);
  // Лужи.
  for (const [x, y, rx, ry] of [[1580, 1400, 90, 30], [1250, 1640, 70, 24], [2000, 1660, 60, 20]]) L.push(`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="rgba(20,40,60,0.55)"/><ellipse cx="${x - rx * 0.2}" cy="${y - ry * 0.2}" rx="${rx * 0.5}" ry="${ry * 0.3}" fill="rgba(255,190,120,0.18)"/>`);
  L.push(lightPole(1560, 1600, -90));
  return L.join("\n");
}

function pier() {
  const r = rng(K + "-pier"), L = [];
  // Вода и борт судна.
  L.push(`<rect x="${QUAY}" y="0" width="${W - QUAY}" height="${H}" fill="url(#${K}-water)"/>`);
  L.push(`<rect x="${QUAY}" y="0" width="${W - QUAY}" height="${H}" fill="rgba(0,10,20,0.25)"/>`);
  for (const y of [330, 1520]) L.push(`<rect x="${QUAY + 10}" y="${y - 240}" width="120" height="480" fill="url(#${K}-reflect)" filter="url(#${K}-blur)" opacity="0.6"/>`);
  const sx = 2800;
  L.push(`<g filter="url(#${K}-high)"><path d="M${sx + 60},-40 Q${sx},200 ${sx},500 V1700 Q${sx},1900 ${sx + 60},2040 H3100 V-40 Z" fill="#2a2f36" stroke="#0b0d10" stroke-width="8"/></g>`);
  L.push(`<path d="M${sx + 22},40 Q${sx + 14},200 ${sx + 14},500 V1700 Q${sx + 14},1880 ${sx + 40},1980" stroke="#8a2a24" stroke-width="16" fill="none"/>`);
  const cols = ["#9a3a2a", "#2c5a8a", "#3a6a3a", "#c46a1e", "#5a5e66", "#2a7a7a", "#c49a2a"];
  for (let y = 150; y < 1800; y += 300) { L.push(`<rect x="${sx + 40}" y="${y - 8}" width="${W - sx}" height="296" fill="#1e2228"/>`); for (let x = sx + 50; x < W; x += 124) { const lng = r() < 0.3; L.push(container(x, y, 118, lng ? 280 : 136, cols[Math.floor(r() * cols.length)], { stack: r() < 0.4 }).replace(/filter="url\(#[^)]+\)"/, "")); if (!lng) L.push(container(x, y + 144, 118, 136, cols[Math.floor(r() * cols.length)], {}).replace(/filter="url\(#[^)]+\)"/, "")); } }
  L.push(`<g filter="url(#${K}-blur)">${Array.from({ length: 10 }, () => `<ellipse cx="${f1(QUAY + r() * 400)}" cy="${f1(r() * H)}" rx="${f1(80 + r() * 120)}" ry="${f1(40 + r() * 60)}" fill="rgba(180,200,215,0.08)"/>`).join("")}</g>`);
  // Кромка причала: отбойники, жёлто-чёрная полоса, тумбы.
  L.push(`<rect x="${QUAY - 6}" y="0" width="22" height="${H}" fill="#1a1c1f"/><rect x="${QUAY - 40}" y="0" width="34" height="${H}" fill="url(#${K}-stripes)" opacity="0.85"/>`);
  for (let y = 80; y < H; y += 240) L.push(`<g ${S}><rect x="${QUAY + 4}" y="${y}" width="34" height="90" rx="14" fill="#161616" stroke="#000" stroke-width="3"/></g>`);
  for (const y of [180, 620, 1180, 1660]) L.push(bollard(QUAY - 80, y));
  L.push(mooring(QUAY - 80, 180, sx + 10, 120, 30), mooring(QUAY - 80, 620, sx + 4, 700, 20), mooring(QUAY - 80, 1180, sx + 4, 1120, 20), mooring(QUAY - 80, 1660, sx + 10, 1800, 30));
  L.push(`<g ${S}><rect x="${QUAY - 20}" y="1390" width="50" height="120" fill="#555" stroke="#222" stroke-width="3"/>${[0, 1, 2, 3, 4].map(i => `<path d="M${QUAY - 18},${1402 + i * 24} H${QUAY + 28}" stroke="#aaa" stroke-width="5"/>`).join("")}</g>`);
  // Спасательный круг.
  L.push(`<g ${S}><circle cx="2520" cy="1200" r="34" fill="none" stroke="#e8e8e8" stroke-width="18"/><circle cx="2520" cy="1200" r="34" fill="none" stroke="#d2402a" stroke-width="18" stroke-dasharray="26.7 26.7"/></g>`);
  // Рельсы козлового крана.
  for (const x of [2300, 2580]) L.push(`<path d="M${x - 8},0 V${H} M${x + 8},0 V${H}" stroke="#9aa0a6" stroke-width="5"/><path d="M${x},0 V${H}" stroke="rgba(0,0,0,0.5)" stroke-width="10" stroke-dasharray="4 28"/>`);
  // Поддоны и ящики на причале.
  L.push(pallet(2380, 1780, 100, 100, "boxes", r, 4), pallet(2400, 1890, 100, 100, "drums", r, -6), pallet(2340, 120, 100, 100, "sacks", r, 0));
  L.push(lightPole(2280, 330, 0), lightPole(2280, 1520, 0));
  return L.join("\n");
}

function gantry() { // козловой кран над причалом и судном
  const L = [], y1 = 760, y2 = 1010, xb = 2180, xe = 3040;
  const beam = (y) => `<rect x="${xb}" y="${y - 26}" width="${xe - xb}" height="52" fill="#d29a1e" stroke="#2a1c04" stroke-width="5"/>${Array.from({ length: 22 }, (_, i) => `<path d="M${xb + 20 + i * 40},${y - 22} l20,44" stroke="rgba(60,40,0,0.45)" stroke-width="4"/>`).join("")}`;
  L.push(`<g filter="url(#${K}-high)">`);
  for (const x of [2300, 2580]) for (const y of [y1, y2]) L.push(`<rect x="${x - 34}" y="${y - 34}" width="68" height="68" fill="#b8841a" stroke="#2a1c04" stroke-width="5"/>`);
  L.push(beam(y1), beam(y2));
  for (const x of [2300, 2580, 2860]) L.push(`<rect x="${x - 18}" y="${y1}" width="36" height="${y2 - y1}" fill="#c08a1a" stroke="#2a1c04" stroke-width="4"/>`);
  L.push(`<rect x="2370" y="${y1 + 30}" width="150" height="${y2 - y1 - 60}" fill="#3a3f46" stroke="#111" stroke-width="5"/><rect x="2390" y="${y1 + 50}" width="110" height="20" fill="#9fd0ff" opacity="0.5"/>`);
  // Тележка со спредером и контейнер на тросах над судном.
  L.push(`<rect x="2700" y="${y1 - 40}" width="120" height="${y2 - y1 + 80}" fill="#5a5e66" stroke="#111" stroke-width="5"/></g>`);
  L.push(container(2700, 800, 118, 170, "#c46a1e", { stack: true }));
  L.push(`<path d="M2712,812 L2760,${(y1 + y2) / 2} L2806,812 M2712,958 L2760,${(y1 + y2) / 2} L2806,958" stroke="#111" stroke-width="4" fill="none"/>`);
  return L.join("\n");
}

function lighting() {
  const L = [];
  L.push(`<rect width="${W}" height="${H}" fill="rgba(4,9,24,0.62)" mask="url(#${K}-mask)"/>`);
  L.push(`<rect x="${WH.x}" y="${WH.y}" width="${WH.x2 - WH.x}" height="${WH.y2 - WH.y}" fill="rgba(2,4,14,0.42)" mask="url(#${K}-mask)"/>`);
  for (const [x, y, rr, t] of LIGHTS) L.push(`<circle cx="${x}" cy="${y}" r="${rr}" fill="url(#${K}-${t})"/>`);
  L.push(`<circle cx="1940" cy="200" r="180" fill="url(#${K}-screen)"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="url(#${K}-vig)"/>`);
  return L.join("\n");
}

function draw() {
  return [ground(), yard(), containers(), pier(), warehouse(), gantry(), lighting()].join("\n");
}

const ZONES = [
  { id: "yard", name: "Погрузочный двор", tags: [], poly: [[0, 0], [WH.x, 0], [WH.x, H], [0, H]], label: [470, 1060], size: 56 },
  { id: "racks", name: "Склад: стеллажи", tags: ["cover", "dark"], poly: [[WH.x, 0], [1560, 0], [1560, 560], [WH.x2, 560], [WH.x2, WH.y2], [WH.x, WH.y2]], label: [1290, 600], size: 52 },
  { id: "office", name: "Контора на антресоли", tags: ["elevated", "cover"], poly: [[1560, 0], [WH.x2, 0], [WH.x2, 560], [1560, 560]], label: [1895, 470], size: 40 },
  { id: "containers", name: "Контейнерный лабиринт", tags: ["cover", "difficult"], poly: [[WH.x, WH.y2], [WH.x2, WH.y2], [WH.x2, H], [WH.x, H]], label: [1560, 1395], size: 48 },
  { id: "pier", name: "Причал", tags: ["hazard"], poly: [[WH.x2, 0], [W, 0], [W, H], [WH.x2, H]], label: [2440, 1420], size: 60 }
];
const LINKS = [["yard", "racks", "short"], ["yard", "containers", "short"], ["racks", "office", "short"], ["racks", "containers", "short"],
  ["racks", "pier", "short"], ["office", "pier", "short"], ["containers", "pier", "short"]];

export default {
  key: K, name: "Склад в порту", folder: "Современность", worlds: ["modern", "weirdwar", "monster", "zombie"],
  bgColor: "#0d1118",
  extraDefs: extraDefs(),
  draw, zones: ZONES, links: LINKS,
  style: { tint: "rgba(140,190,255,0.03)", line: "rgba(255,206,90,0.9)", text: "#ffe7a8" }
};
