/**
 * Игровые миры (теги контента) и типы приключений.
 *
 * Каждый предмет, противник и транспорт несёт теги `system.worlds` — в каких мирах он уместен.
 * Пустой список означает «любой мир» (так удобно для самодельных предметов).
 * Тип приключения — набор миров плюс список навыков: по нему мастер настройки мира
 * импортирует контент, а мастер создания персонажа показывает расы, карьеры и таланты.
 *
 * Модуль без зависимостей от Foundry: его использует и сборка компендиумов (tools/build-packs.mjs).
 */

/** Теги миров: ключ → подпись и цвет плашки. */
export const WORLDS = {
  fantasy: { label: "Фэнтези", color: "#5b7a2e" },
  mythic: { label: "Эпоха мифов", color: "#a8742a" },
  terrinoth: { label: "Терринот", color: "#7a2a2a" },
  steampunk: { label: "Стимпанк", color: "#8a5a2b" },
  weirdwar: { label: "Моровая война", color: "#4f5a3a" },
  modern: { label: "Современность", color: "#2f5f8a" },
  monster: { label: "Мир чудовищ", color: "#4b2f5f" },
  postapoc: { label: "Постапокалипсис", color: "#8a6a2b" },
  zombie: { label: "Зомби-апокалипсис", color: "#3f6a3a" },
  scifi: { label: "Научная фантастика", color: "#2a6f78" },
  spaceopera: { label: "Космоопера", color: "#3a3f8a" }
};

export const WORLD_KEYS = Object.keys(WORLDS);

/** Все миры, кроме Терринота: Realms of Terrinoth заменяет общие расы, карьеры и снаряжение Core своими. */
export const NOT_TERRINOTH = WORLD_KEYS.filter(w => w !== "terrinoth");

/** Миры с огнестрельным оружием. */
export const FIREARM_WORLDS = ["steampunk", "weirdwar", "modern", "monster", "postapoc", "zombie", "scifi", "spaceopera"];

/** Миры, где по Core Rulebook уместна магия (Терринот использует свою версию правил). */
export const MAGIC_WORLDS = ["fantasy", "mythic", "steampunk", "weirdwar", "monster"];

/**
 * Типы приключений.
 *   worlds  — миры по убыванию приоритета: при одинаковых названиях побеждает предмет более раннего мира;
 *   skills  — набор навыков персонажа (ключ GENESYS.skillPresets);
 *   borrow  — дополнительные миры для отдельных типов документов (например, огнестрел Современности в Пустошах);
 *   icon    — плашка карточки.
 */
export const ADVENTURES = {
  fantasy: {
    label: "Фэнтези", worlds: ["fantasy"], skills: "fantasy", icon: "castle",
    hint: "Мечи, магия и чудовища: эльфы, дварфы, орки, рыцари и волшебники (Core Rulebook)."
  },
  terrinoth: {
    label: "Терринот", worlds: ["terrinoth"], skills: "terrinoth", icon: "dragon-head",
    hint: "Realms of Terrinoth: свои расы, карьеры, руны, героические способности и только разрешённые таланты Core."
  },
  mythic: {
    label: "Эпоха мифов", worlds: ["mythic", "fantasy"], skills: "fantasy", icon: "greek-temple",
    hint: "Полубоги, герои и чародеи древних легенд (Expanded Player's Guide) поверх фэнтези Core."
  },
  steampunk: {
    label: "Стимпанк", worlds: ["steampunk"], skills: "steampunk", icon: "cog",
    hint: "Пар, шестерни, дирижабли и безумные учёные."
  },
  weirdwar: {
    label: "Моровая война", worlds: ["weirdwar"], skills: "weirdwar", icon: "rifle",
    hint: "Мировая война, где по окопам бродит оккультная жуть."
  },
  modern: {
    label: "Современность", worlds: ["modern"], skills: "modern", icon: "pistol-gun",
    hint: "Шпионы, боевики и детективы нашего времени."
  },
  horror: {
    label: "Мир чудовищ", worlds: ["monster", "modern"], skills: "modern", extraSkills: ["knowledgeSupernatural"], icon: "vampire-dracula",
    hint: "Готический хоррор: вампиры, оборотни, мумии и охотники на них (Expanded Player's Guide)."
  },
  wasteland: {
    label: "Пустоши", worlds: ["postapoc"], skills: "modern", icon: "radioactive",
    borrow: { weapon: ["modern"], armor: ["modern"], gear: ["modern"], vehicle: ["modern"] },
    hint: "Постапокалипсис: мутанты, налётчики и оружие из хлама (Expanded Player's Guide) и огнестрел Современности."
  },
  zombie: {
    label: "Зомби-апокалипсис", worlds: ["zombie", "modern", "postapoc"], skills: "modern", icon: "shambling-zombie",
    hint: "Наш мир, рухнувший за одну ночь: огнестрел и машины Современности, самоделки Пустошей и орды мертвецов."
  },
  scifi: {
    label: "Научная фантастика", worlds: ["scifi"], skills: "scifi", icon: "robot-golem",
    hint: "Ближнее будущее: клоны, биороиды, хакеры и мехи."
  },
  spaceopera: {
    label: "Космоопера", worlds: ["spaceopera", "scifi"], skills: "spaceopera", icon: "ringed-planet",
    hint: "Звездолёты, пришельцы, бластеры и галактические империи."
  },
  all: {
    label: "Все книги", worlds: WORLD_KEYS, skills: "all", icon: "book-cover", keepDuplicates: true,
    hint: "Весь контент всех книг без фильтра — для своего мира-солянки."
  }
};

/** Набор навыков для мира (для тегов навыков и своих сочетаний миров). */
export const WORLD_SKILLS = {
  fantasy: "fantasy", mythic: "fantasy", terrinoth: "terrinoth", steampunk: "steampunk", weirdwar: "weirdwar",
  modern: "modern", monster: "modern", postapoc: "modern", zombie: "modern", scifi: "scifi", spaceopera: "spaceopera"
};

/** Описание приключения по ключу; ключ вида "custom:fantasy,modern" — своё сочетание миров. */
export function getAdventure(key) {
  if (!key) return ADVENTURES.all;
  if (ADVENTURES[key]) return { key, ...ADVENTURES[key] };
  if (key.startsWith("custom:")) {
    const worlds = key.slice(7).split(",").filter(w => WORLDS[w]);
    if (!worlds.length) return { key: "all", ...ADVENTURES.all };
    // Имя и набор навыков своего приключения задаёт ведущий в мастере настройки мира.
    let saved = {};
    try { saved = globalThis.game?.settings?.get("genesys-rpg", "customAdventure") ?? {}; } catch { /* нет настройки */ }
    return {
      key, custom: true, worlds, skills: saved.skills || WORLD_SKILLS[worlds[0]] || "all", icon: "scroll-unfurled",
      label: saved.name || worlds.map(w => WORLDS[w].label).join(" + "),
      hint: "Своё сочетание миров."
    };
  }
  return { key: "all", ...ADVENTURES.all };
}

/** Теги документа (данные или документ Foundry). */
export function worldsOf(doc) {
  // Сцены (боевые карты) хранят миры во флаге.
  const w = doc?.system?.worlds ?? doc?.flags?.["genesys-rpg"]?.worlds;
  if (!w) return [];
  return Array.isArray(w) ? w : [...w];
}

/** Подходит ли документ приключению. */
export function fitsAdventure(doc, adventure) {
  const tags = worldsOf(doc);
  if (!tags.length) return true;
  const allowed = new Set([...adventure.worlds, ...(adventure.borrow?.[doc.type] ?? [])]);
  return tags.some(t => allowed.has(t));
}

/** Насколько документ «родной» для приключения: меньше — лучше. */
function score(doc, adventure) {
  const tags = worldsOf(doc);
  if (!tags.length) return [999, 999];
  const order = [...adventure.worlds, ...(adventure.borrow?.[doc.type] ?? [])];
  let best = 999;
  for (const t of tags) { const i = order.indexOf(t); if (i >= 0 && i < best) best = i; }
  return [best, tags.length];
}

/**
 * Отобрать документы для приключения и убрать дубли: из одноимённых документов одного типа
 * остаётся самый «родной» миру (при равенстве — более узкий по тегам, затем первый по порядку).
 */
export function filterForAdventure(docs, adventure) {
  if (adventure.keepDuplicates) return docs.filter(d => fitsAdventure(d, adventure));
  const best = new Map();
  const order = [];
  for (const doc of docs) {
    if (!fitsAdventure(doc, adventure)) continue;
    const key = `${doc.type}:${String(doc.name).trim().toLowerCase()}`;
    const prev = best.get(key);
    if (!prev) { best.set(key, doc); order.push(key); continue; }
    const [a1, a2] = score(doc, adventure);
    const [b1, b2] = score(prev, adventure);
    if (a1 < b1 || (a1 === b1 && a2 < b2)) best.set(key, doc);
  }
  return order.map(k => best.get(k));
}
