import { SYSTEM_ID } from "./config.mjs";

/**
 * Зоны боя Genesys на сцене.
 * Источники зон: (1) регионы сцены с флагом genesys-rpg.zone (их создаёт система для карт «Боевые зоны»,
 * или ведущий отмечает свои регионы как зоны), (2) иначе — разметка во флагах сцены (genesys-rpg.zones).
 * Дистанция между зонами: явная связь (links) или по числу переходов: соседние — короткая, через одну — средняя, дальше — длинная, ещё дальше — экстремальная.
 * Свойства зон: cover (укрытие: дальняя защита не ниже 1), dark (плохая видимость: +1 кость штрафа к дальним атакам),
 * elevated (возвышенность: стрелку сверху вниз — кость бонуса), difficult (перемещение ×2), hazard (опасность — подсказка).
 */

export const ZONE_TAGS = ["cover", "difficult", "elevated", "hazard", "dark"];
export const RANGE_STEPS = ["engaged", "short", "medium", "long", "extreme"];

/** Точка внутри многоугольника (метод лучей). */
export function pointInPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi)) inside = !inside;
  }
  return inside;
}

/** Соседние ли зоны: вершины одной лежат на границе/внутри другой с допуском (для зон без явных связей). */
export function zonesTouch(a, b, tol = 30) {
  const near = (p, poly) => pointInPolygon(p[0], p[1], poly) || poly.some((q, i) => {
    const r = poly[(i + 1) % poly.length];
    const dx = r[0] - q[0], dy = r[1] - q[1], len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - q[0]) * dx + (p[1] - q[1]) * dy) / len2));
    return Math.hypot(p[0] - (q[0] + t * dx), p[1] - (q[1] + t * dy)) <= tol;
  });
  return a.poly.some(p => near(p, b.poly)) || b.poly.some(p => near(p, a.poly));
}

/** Многоугольник региона (первая фигура-многоугольник или прямоугольник). */
function regionPoly(region) {
  for (const s of region.shapes ?? []) {
    if (s.type === "polygon" && s.points?.length >= 6) {
      const pts = [];
      for (let i = 0; i < s.points.length; i += 2) pts.push([s.points[i], s.points[i + 1]]);
      return pts;
    }
    if (s.type === "rectangle") return [[s.x, s.y], [s.x + s.width, s.y], [s.x + s.width, s.y + s.height], [s.x, s.y + s.height]];
  }
  return null;
}

/**
 * Зоны сцены и связи между ними.
 * @returns {{zones: {id, name, tags: string[], poly: number[][]}[], links: [string,string,string][]} | null}
 */
export function sceneZones(scene = globalThis.canvas?.scene) {
  if (!scene) return null;
  const f = scene.flags?.[SYSTEM_ID] ?? {};
  const fromRegions = (scene.regions?.contents ?? [...(scene.regions ?? [])])
    .filter(r => r.flags?.[SYSTEM_ID]?.zone)
    .map(r => ({ id: r.flags[SYSTEM_ID].zone.id ?? r.id, name: r.name, tags: r.flags[SYSTEM_ID].zone.tags ?? [], poly: regionPoly(r) }))
    .filter(z => z.poly);
  const zones = fromRegions.length ? fromRegions : (f.zones ?? []);
  if (!zones.length) return null;
  return { zones, links: f.links ?? [] };
}

/** Зона, в которой стоит токен (по центру). */
export function zoneAt(x, y, data = sceneZones()) {
  return data?.zones.find(z => pointInPolygon(x, y, z.poly)) ?? null;
}
export function tokenZone(token, data = sceneZones(token?.scene ?? token?.document?.parent)) {
  const c = token?.center ?? (token?.document ? token.center : null);
  return c ? zoneAt(c.x, c.y, data) : null;
}

/** Дистанция между зонами: явная связь, иначе по графу переходов. */
export function zoneRange(a, b, data) {
  if (!a || !b) return null;
  if (a.id === b.id) return "short";
  const links = data.links ?? [];
  const direct = links.find(l => (l[0] === a.id && l[1] === b.id) || (l[0] === b.id && l[1] === a.id));
  if (direct) return direct[2];
  // Граф: явные связи, а если их нет — соседство по геометрии.
  const adj = new Map(data.zones.map(z => [z.id, []]));
  if (links.length) for (const [x, y, r] of links) { adj.get(x)?.push([y, r]); adj.get(y)?.push([x, r]); }
  else for (const z of data.zones) for (const w of data.zones) if (z.id !== w.id && zonesTouch(z, w)) adj.get(z.id).push([w.id, "short"]);
  // Поиск в ширину: ступень = максимальная дистанция связи на пути + (переходов − 1).
  const best = new Map([[a.id, { hops: 0, step: 1 }]]);
  const queue = [a.id];
  while (queue.length) {
    const cur = queue.shift();
    const { hops, step } = best.get(cur);
    for (const [next, r] of adj.get(cur) ?? []) {
      if (best.has(next)) continue;
      best.set(next, { hops: hops + 1, step: Math.max(step, RANGE_STEPS.indexOf(r)) });
      queue.push(next);
    }
  }
  const res = best.get(b.id);
  if (!res) return "extreme";
  return RANGE_STEPS[Math.min(RANGE_STEPS.length - 1, res.step + res.hops - 1)];
}

/**
 * Дистанция между токенами по зонам (null — на сцене нет зон или токен вне зон).
 * «Вплотную» определяет расстояние (токены рядом), остальное — зоны.
 */
export function tokenZoneRange(a, b) {
  const data = sceneZones(a?.scene ?? a?.document?.parent);
  if (!data) return null;
  const za = tokenZone(a, data), zb = tokenZone(b, data);
  if (!za || !zb) return null;
  return { range: zoneRange(za, zb, data), from: za, to: zb };
}

/**
 * Модификаторы атаки от зон: укрытие и плохая видимость у цели, возвышенность у стрелка.
 * @returns {{defense: number, setback: number, boost: number, notes: string[]}}
 */
export function zoneAttackMods(attackerToken, targetToken, melee) {
  const out = { defense: 0, setback: 0, boost: 0, notes: [] };
  const data = sceneZones(targetToken?.scene ?? targetToken?.document?.parent);
  if (!data || melee) return out;
  const zt = tokenZone(targetToken, data), za = tokenZone(attackerToken, data);
  const L = (k, d) => game.i18n.format(k, d);
  if (zt?.tags?.includes("cover")) { out.defense = 1; out.notes.push(L("GENESYS.Zone.NoteCover", { zone: zt.name })); }
  if (zt?.tags?.includes("dark")) { out.setback += 1; out.notes.push(L("GENESYS.Zone.NoteDark", { zone: zt.name })); }
  if (za?.tags?.includes("elevated") && !zt?.tags?.includes("elevated") && za.id !== zt?.id) { out.boost += 1; out.notes.push(L("GENESYS.Zone.NoteElevated", { zone: za.name })); }
  return out;
}

/** Сколько манёвров стоит переход между зонами (Core: дистанция; труднопроходимая зона — вдвое). */
export function moveCost(from, to, data) {
  const r = zoneRange(from, to, data);
  const base = { engaged: 1, short: 1, medium: 2, long: 4, extreme: 6 }[r] ?? 1;
  return to?.tags?.includes("difficult") || from?.tags?.includes("difficult") ? base * 2 : base;
}

/** Создать регионы сцены из разметки зон во флагах (для карт «Боевые зоны»), если их ещё нет. */
export async function ensureZoneRegions(scene) {
  const f = scene?.flags?.[SYSTEM_ID];
  if (!f?.zones?.length || !game.user.isActiveGM) return;
  const have = (scene.regions?.contents ?? []).some(r => r.flags?.[SYSTEM_ID]?.zone);
  if (have) return;
  const colors = ["#e9c46a", "#6fcf74", "#4fb3e3", "#e2582a", "#b58ce8", "#f2a531", "#7dd3c0"];
  const data = f.zones.map((z, i) => ({
    name: z.name, color: colors[i % colors.length],
    shapes: [{ type: "polygon", points: z.poly.flat() }],
    flags: { [SYSTEM_ID]: { zone: { id: z.id, tags: z.tags ?? [] } } }
  }));
  try { await scene.createEmbeddedDocuments("Region", data); }
  catch (err) { console.warn(`${SYSTEM_ID} | регионы зон не созданы (зоны работают по разметке сцены)`, err); }
}
