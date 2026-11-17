/**
 * Генерация встреч и добычи (оценки системы — в книгах Genesys нет формулы баланса боя).
 *
 * Угроза противника — creatures.mjs#threatOf (приспешник ≈ 1, соперник ≈ 3–8, главарь ≈ 8–30).
 * Сила героя ≈ 4 при создании и растёт с опытом. Бюджет встречи = сила группы × множитель сложности.
 */
import { threatOf, NATURAL_WEAPON } from "./creatures.mjs";

/** Сложность встречи: множитель силы группы. */
export const ENCOUNTER_DIFFICULTY = [
  { key: "easy", mult: 0.5 },
  { key: "average", mult: 0.8 },
  { key: "hard", mult: 1.1 },
  { key: "daunting", mult: 1.5 },
  { key: "deadly", mult: 2.0 }
];

/** Щедрость добычи: 1 — почти ничего … 5 — сокровищница. */
export const LOOT_LEVELS = [
  { level: 1, coins: 0.15, drop: 0.1, extra: 0, rarity: 2, price: 60 },
  { level: 2, coins: 0.5, drop: 0.25, extra: 0, rarity: 4, price: 250 },
  { level: 3, coins: 1, drop: 0.5, extra: 1, rarity: 6, price: 900 },
  { level: 4, coins: 2, drop: 0.75, extra: 2, rarity: 8, price: 3500 },
  { level: 5, coins: 4, drop: 1, extra: 4, rarity: 10, price: Infinity }
];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];

/** Сила одного героя: 4 при создании, +1 за каждые ~150 опыта, полученных в игре. */
export function heroPower(actor) {
  const log = actor?.system?.experience?.log ?? [];
  const start = log.filter(e => e.type === "earn" && e.kind === "archetype").reduce((s, e) => s + e.amount, 0);
  const earned = log.filter(e => e.type === "earn").reduce((s, e) => s + e.amount, 0) - start;
  return Math.round((4 * (1 + Math.max(0, earned) / 150)) * 10) / 10;
}

/**
 * Собрать встречу.
 * @param {object[]} candidates  противники (документы)
 * @param {{mode: "budget"|"count", budget?: number, count?: number, kinds: Set<string>}} opts
 * @returns {object[]} элементы встречи {uuid, name, img, minion, count, groups, threat, power}
 */
export function generateEncounter(candidates, { mode = "budget", budget = 8, count = 4, kinds = new Set(["minion", "rival", "nemesis"]) } = {}) {
  const pool = candidates.filter(d => kinds.has(d.system.adversaryType)).map(d => ({ doc: d, t: threatOf(d) }));
  if (!pool.length) return [];
  const out = [];
  const add = (c, size = 1) => {
    const minion = c.doc.system.adversaryType === "minion";
    const prev = out.find(e => e.uuid === c.doc.uuid);
    if (prev && !minion) { prev.count += 1; return; }
    if (prev && minion && prev.count === size) { prev.groups += 1; return; }
    out.push({ uuid: c.doc.uuid, name: c.doc.name, img: c.doc.img, minion, count: size, groups: 1, threat: c.t, power: null });
  };
  if (mode === "count") {
    let left = Math.max(1, count);
    let guard = 0;
    while (left > 0 && guard++ < 100) {
      const nemesisUsed = out.some(e => !e.minion && candidates.find(d => d.uuid === e.uuid)?.system.adversaryType === "nemesis");
      const options = pool.filter(c => !(c.doc.system.adversaryType === "nemesis" && (nemesisUsed || left < 2 && out.length === 0 && count > 1)));
      const c = pick(options.length ? options : pool);
      if (c.doc.system.adversaryType === "minion") {
        const size = Math.min(left, Math.max(1, Math.round(rand(2, 4))));
        add(c, size); left -= size;
      } else { add(c); left -= 1; }
    }
    return out;
  }
  let remaining = budget;
  let guard = 0;
  let nemesis = false;
  while (remaining > 0.4 && guard++ < 200) {
    const options = pool.filter(c => {
      const type = c.doc.system.adversaryType;
      if (type === "nemesis") return !nemesis && c.t <= remaining * 1.1;
      if (type === "minion") return c.t * 2 <= remaining * 1.1;
      return c.t <= remaining * 1.15;
    });
    if (!options.length) break;
    // Чуть чаще — противники, заметные на фоне остатка бюджета (меньше «мелочи»).
    const weighted = options.flatMap(c => c.t >= remaining * 0.25 ? [c, c] : [c]);
    const c = pick(weighted);
    const type = c.doc.system.adversaryType;
    if (type === "minion") {
      const max = Math.min(5, Math.floor(remaining / c.t));
      const size = Math.max(2, Math.min(max, Math.round(rand(2, max))));
      add(c, size); remaining -= c.t * size;
    } else { add(c); remaining -= c.t; if (type === "nemesis") nemesis = true; }
  }
  return out;
}

/** Угроза собранной встречи. */
export function encounterThreat(entries) {
  return Math.round(entries.reduce((s, e) => s + (e.threat ?? 0) * e.count * (e.minion ? (e.groups ?? 1) : 1), 0) * 10) / 10;
}

/* -------------------------------------------- */
/*  Добыча                                       */
/* -------------------------------------------- */

const VALUABLES = {
  old: ["Золотое кольцо", "Серебряный кубок", "Драгоценный камень", "Жемчужное ожерелье", "Старинная монета", "Резная шкатулка", "Янтарная брошь", "Серебряный браслет"],
  modern: ["Дорогие часы", "Пачка наличных", "Золотая цепочка", "Кредитная карта", "Ювелирный перстень", "Запонки с камнями"],
  future: ["Кредитный чип", "Слиток редкого металла", "Ювелирный имплант", "Кристалл данных", "Коллекционная безделушка"]
};
const PARTS = {
  beast: ["шкура", "клыки", "когти", "рога"], monster: ["чешуя", "клыки", "железа", "рог"], construct: ["детали механизма", "сердечник"],
  alien: ["образец ткани", "хитиновая пластина"], demon: ["эссенция", "рог"], undead: ["прах"], humanoid: ["трофей"]
};

/** Эпоха мира для «ценностей». */
function era(worlds = []) {
  if (worlds.some(w => ["scifi", "spaceopera"].includes(w)) && !worlds.some(w => ["fantasy", "terrinoth", "mythic"].includes(w))) return "future";
  if (worlds.some(w => ["modern", "zombie", "postapoc"].includes(w)) && !worlds.some(w => ["fantasy", "terrinoth", "mythic"].includes(w))) return "modern";
  return "old";
}

/** Категория предмета компендиума для тегов добычи. */
export function itemLootTag(doc) {
  if (doc.type === "weapon") return "weapons";
  if (doc.type === "armor") return "armor";
  const text = `${doc.name} ${doc.folder?.name ?? doc.folder ?? ""}`;
  if (/маги|зель|эликс|тоник|рун|фокус|амулет|жезл|посох|свиток|талисман|зачар|потион|potion|wand|rune/i.test(text)) return "magic";
  const w = doc.system?.worlds ?? [];
  if (/кибер|электрон|компьют|сканер|дрон|комлинк|голо|взлом|гаджет|имплант/i.test(text) || (w.length && w.every(x => ["scifi", "spaceopera"].includes(x)))) return "tech";
  return "gear";
}

/** Сгенерированный предмет снаряжения (ценность, трофей). */
function madeItem(name, price, img, description) {
  return { name, type: "gear", img, system: { price: Math.max(1, Math.round(price)), encumbrance: 1, rarity: 0, quantity: 1, description: `<p>${description}</p>` } };
}

/**
 * Добыча с противников.
 * @param {{doc: object, count: number}[]} sources  противники и сколько их (для приспешников — размер группы)
 * @param {number} level  1–5
 * @param {object[]} pool  предметы компендиума для «находок»
 * @param {string} tileRoot  путь к плашкам иконок
 * @returns {{coins: number, items: object[]}}
 */
export function generateLoot(sources, level, pool, tileRoot = "systems/genesys-rpg/assets/icons/gi/gear") {
  const L = LOOT_LEVELS[Math.min(5, Math.max(1, level)) - 1];
  let coins = 0;
  const items = new Map();
  const put = (key, data, qty = 1, origin = "") => {
    const prev = items.get(key);
    if (prev) prev.qty += qty;
    else items.set(key, { data, qty, origin });
  };
  const tags = new Set();
  for (const { doc, count = 1 } of sources) {
    const s = doc.system ?? {};
    const loot = s.loot ?? [];
    loot.forEach(t => tags.add(t));
    const t = threatOf(doc);
    const n = Math.max(1, count);
    if (loot.includes("coins")) coins += Math.round(t * 12 * L.coins * rand(0.5, 1.5) * n);
    const own = doc.items?.contents ?? doc.items ?? [];
    for (const it of own) {
      const kind = it.type === "weapon" ? "weapons" : it.type === "armor" ? "armor" : it.type === "gear" ? "gear" : null;
      if (!kind || !loot.includes(kind)) continue;
      if (it.type === "weapon" && NATURAL_WEAPON.test(it.name)) continue;
      if (it.type === "gear" && /^снаряжение$/i.test(it.name)) continue;
      if (Math.random() > L.drop) continue;
      const data = it.toObject ? it.toObject() : structuredClone(it);
      delete data._id;
      put(`own:${it.name}`, data, it.type === "weapon" || it.type === "armor" ? Math.min(n, Math.max(1, Math.round(n * L.drop))) : 1, doc.name);
    }
    if (loot.includes("valuables") && Math.random() < L.drop * 0.8) {
      const name = pick(VALUABLES[era(s.worlds)]);
      put(`val:${name}`, madeItem(name, t * 20 * L.coins * rand(0.6, 1.4), `${tileRoot}/gems.svg`, "Ценная вещь — её можно продать."), 1, doc.name);
    }
    if (loot.includes("parts") && Math.random() < L.drop) {
      const part = pick(PARTS[s.creatureType] ?? PARTS.beast);
      const name = `${part[0].toUpperCase()}${part.slice(1)}: ${doc.name}`;
      put(`part:${name}`, madeItem(name, t * 10 * L.coins * rand(0.6, 1.4), `${tileRoot}/fangs.svg`, `Трофей с существа «${doc.name}»: ценится у охотников, алхимиков и ремесленников.`), 1, doc.name);
    }
  }
  // Находки из компендиума по тегам добычи противников.
  const wanted = ["weapons", "armor", "gear", "magic", "tech"].filter(t => tags.has(t));
  const finds = pool.filter(d => wanted.includes(itemLootTag(d)) && (d.system.rarity ?? 0) <= L.rarity && (d.system.price ?? 0) <= L.price);
  const extra = L.extra + (sources.length >= 4 && L.extra ? 1 : 0);
  for (let i = 0; i < extra && finds.length; i++) {
    const d = pick(finds);
    const data = d.toObject ? d.toObject() : structuredClone(d);
    delete data._id;
    put(`find:${d.name}`, data, 1, "");
  }
  return { coins, items: [...items.values()].map(e => ({ ...e, name: e.data.name, img: e.data.img, price: e.data.system?.price ?? 0 })) };
}
