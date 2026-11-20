/**
 * Генерация встреч и добычи по Expanded Player's Guide (гл. II.2, «Уровни силы противников»).
 *
 * У противника три уровня силы: боевой, социальный, общий (creatures.mjs#powerOf). У группы —
 * рейтинг испытания (табл. II.2–6) по среднему опыту, полученному в игре (без стартового), и числу героев,
 * с поправками за мощное оружие, броню и атаки по нескольким целям. Сумма боевых (или социальных) уровней
 * противников встречи не должна превышать рейтинг. Противников (группа приспешников — один) не больше, чем героев.
 */
import { threatOf, NATURAL_WEAPON, powerOf, minionGroupPower } from "./creatures.mjs";

/** Сложность встречи: «обычная» — рейтинг по таблице книги, остальные — множитель системы. */
export const ENCOUNTER_DIFFICULTY = [
  { key: "easy", mult: 0.6 },
  { key: "average", mult: 1 },
  { key: "hard", mult: 1.25 },
  { key: "daunting", mult: 1.5 },
  { key: "deadly", mult: 2.0 }
];

/** Табл. II.2–6: рейтинг испытания по опыту героя (верхняя граница) и числу героев (1–6). */
export const CR_TABLE = [
  [25, [2, 2, 3, 5, 6, 6]], [50, [2, 3, 5, 7, 8, 8]], [75, [3, 3, 6, 8, 9, 10]], [100, [3, 4, 7, 10, 11, 12]],
  [150, [4, 5, 8, 11, 12, 13]], [200, [4, 6, 9, 12, 13, 14]], [250, [4, 7, 10, 14, 15, 16]], [300, [5, 8, 11, 15, 16, 18]],
  [400, [5, 9, 12, 16, 17, 19]], [500, [6, 9, 14, 18, 18, 20]], [600, [6, 10, 15, 18, 19, 21]], [750, [7, 10, 16, 19, 20, 21]],
  [1000, [7, 11, 16, 20, 20, 22]], [Infinity, [8, 12, 17, 20, 21, 22]]
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

/** Опыт, полученный героем в игре (без стартового опыта архетипа). */
export function earnedXP(actor) {
  const log = actor?.system?.experience?.log ?? [];
  return log.filter(e => e.type === "earn" && e.kind !== "archetype").reduce((s, e) => s + e.amount, 0);
}

/** Сила героя для старых оценок (оставлено для совместимости). */
export function heroPower(actor) { return Math.round(4 * (1 + Math.max(0, earnedXP(actor)) / 150) * 10) / 10; }

/**
 * Рейтинг испытания группы (табл. II.2–6) и поправки EPG.
 * @param {Actor[]} actors  персонажи игроков
 * @param {number} [sizeOverride]  число героев вручную
 */
export function partyChallenge(actors, sizeOverride = null) {
  const size = Math.max(1, sizeOverride ?? actors.length ?? 1);
  const avg = actors.length ? Math.round(actors.reduce((s, a) => s + earnedXP(a), 0) / actors.length) : 0;
  const row = CR_TABLE.find(([max]) => avg <= max)[1];
  const base = size <= 6 ? row[size - 1] : row[5] + (size - 6);
  const mods = [];
  const majority = n => actors.length && n > actors.length / 2;
  const items = (a, t) => a.itemTypes?.[t] ?? [];
  const weaponDmg = a => Math.max(0, ...items(a, "weapon").map(w => w.system.totalDamage ?? w.system.damage ?? 0));
  if (majority(actors.filter(a => weaponDmg(a) >= 8).length)) mods.push({ key: "weapons", value: 1 });
  if (majority(actors.filter(a => items(a, "armor").some(x => (x.system.soak ?? 0) >= 2 || (x.system.defense ?? 0) >= 2)).length)) mods.push({ key: "armor", value: 1 });
  const multi = a => items(a, "weapon").some(w => (w.system.qualities ?? []).some(q => /автоматическ|залпов|взрыв|auto|linked|blast/i.test(q.name)))
    || items(a, "talent").some(t => /обоерук|dual wield/i.test(t.name));
  if (actors.filter(multi).length >= 2) mods.push({ key: "multi", value: 1 });
  return { size, avgXP: avg, base, mods, cr: base + mods.reduce((s, m) => s + m.value, 0) };
}

/** Элемент встречи с уровнями силы (для приспешников — с поправкой за размер группы). */
function entry(doc, size = 1) {
  const minion = doc.system.adversaryType === "minion";
  const base = powerOf(doc);
  const power = minion ? minionGroupPower(base, size) : base;
  return { uuid: doc.uuid, name: doc.name, img: doc.img, minion, count: size, groups: 1, power, threat: threatOf(doc) };
}

/** Сумма уровней силы встречи (группа приспешников — один противник). */
export function encounterPower(entries, kind = "combat") {
  return entries.reduce((s, e) => s + (e.power?.[kind] ?? 1) * (e.minion ? (e.groups ?? 1) : e.count), 0);
}

/** Число противников в смысле EPG (группа приспешников — один). */
export function encounterSize(entries) {
  return entries.reduce((s, e) => s + (e.minion ? (e.groups ?? 1) : e.count), 0);
}

/**
 * Собрать встречу.
 * @param {object[]} candidates  противники (документы)
 * @param {{mode: "budget"|"count", budget?: number, count?: number, kinds: Set<string>, kind?: "combat"|"social", maxEntries?: number}} opts
 */
export function generateEncounter(candidates, { mode = "budget", budget = 8, count = 4, kinds = new Set(["minion", "rival", "nemesis"]), kind = "combat", maxEntries = 4 } = {}) {
  const pool = candidates.filter(d => kinds.has(d.system.adversaryType));
  if (!pool.length) return [];
  const out = [];
  const pushEntry = e => {
    const prev = out.find(x => x.uuid === e.uuid && (!x.minion || x.count === e.count));
    if (prev) { if (prev.minion) prev.groups += 1; else prev.count += 1; return; }
    out.push(e);
  };
  if (mode === "count") {
    let left = Math.max(1, count);
    let guard = 0;
    while (left > 0 && guard++ < 100) {
      const nemesisUsed = out.some(e => pool.find(d => d.uuid === e.uuid)?.system.adversaryType === "nemesis");
      const options = pool.filter(d => !(d.system.adversaryType === "nemesis" && nemesisUsed));
      const d = pick(options.length ? options : pool);
      if (d.system.adversaryType === "minion") {
        const size = Math.min(left, Math.max(1, Math.round(rand(2, 4))));
        pushEntry(entry(d, size)); left -= size;
      } else { pushEntry(entry(d)); left -= 1; }
    }
    return out;
  }
  let remaining = budget;
  let guard = 0;
  let nemesis = false;
  while (remaining >= 1 && encounterSize(out) < maxEntries && guard++ < 200) {
    const options = [];
    for (const d of pool) {
      const type = d.system.adversaryType;
      if (type === "nemesis" && nemesis) continue;
      if (type === "minion") {
        // Группа 2–5: подобрать размер, при котором уровень помещается в остаток.
        for (const size of [3, 4, 2, 5]) {
          const e = entry(d, size);
          if (e.power[kind] <= remaining) { options.push(e); break; }
        }
      } else {
        const e = entry(d);
        if (e.power[kind] <= remaining) options.push(e);
      }
    }
    if (!options.length) break;
    // Предпочтение — тем, кто заметен на фоне остатка (меньше мелочи и больше «живых» встреч).
    const weighted = options.flatMap(e => e.power[kind] >= remaining * 0.3 ? [e, e, e] : [e]);
    const e = pick(weighted);
    pushEntry(e);
    remaining -= e.power[kind];
    if (pool.find(d => d.uuid === e.uuid)?.system.adversaryType === "nemesis") nemesis = true;
  }
  return out;
}

/** Угроза собранной встречи по старой оценке системы (для справки). */
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
    const t = powerOf(doc).combat * 1.5;
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
