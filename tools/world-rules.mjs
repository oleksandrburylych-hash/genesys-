/**
 * Теги миров для документов компендиумов (system.worlds), проставляются при сборке.
 * Правила: явный worlds в исходнике → правило по названию → правило по папке.
 */
import { WORLD_KEYS, NOT_TERRINOTH, FIREARM_WORLDS, MAGIC_WORLDS, ADVENTURES } from "../module/worlds.mjs";
import { GENESYS } from "../module/config.mjs";

const ALL = WORLD_KEYS;
const MODERNISH = ["modern", "monster", "postapoc", "zombie"];
const SPACE = ["scifi", "spaceopera"];

/** Папка → миры. Папки «Терринот: …» относятся к Терриноту. */
const FOLDERS = {
  "Фэнтези": ["fantasy"], "Стимпанк": ["steampunk"], "Моровая война": ["weirdwar"], "Современность": ["modern"],
  "Научная фантастика": ["scifi"], "Космоопера": ["spaceopera"], "Эпоха мифов": ["mythic"], "Мир чудовищ": ["monster"],
  "Постапокалипсис": ["postapoc"], "Зомби-апокалипсис": ["zombie"], "Терринот": ["terrinoth"],
  "Магия": MAGIC_WORLDS, "Взлом": ["modern", "monster", "postapoc", "scifi", "spaceopera"],
  "Руководство Зиннитрикса": [...MAGIC_WORLDS, "terrinoth"],
  "Таланты противников": ALL
};

/** Правила по английскому/русскому названию для отдельных типов: [regex, миры]. */
const BY_NAME = {
  vehicle: [
    [/Frigate$|Ship of the Line/i, ["fantasy", "steampunk", "terrinoth"]],
    [/Three-Masted/i, ["fantasy", "steampunk", "terrinoth"]],
    [/Chariot|Trireme/i, ["mythic", "fantasy"]],
    [/Longship/i, ["fantasy", "mythic", "terrinoth"]],
    [/Coach/i, ["fantasy", "steampunk", "terrinoth", "monster"]],
    [/Modern Frigate|Guided Missile|Air Superiority|Helicopter|Small Cargo/i, ["modern"]],
    [/Sedan|Motorcycle|Sports Car|Bus|Truck|Motorboat/i, [...MODERNISH]],
    [/Locomotive/i, ["steampunk", "weirdwar", "modern", "monster"]],
    [/Wasteland/i, ["postapoc", "zombie"]],
    [/Armored Personnel|Tank/i, ["modern", "weirdwar", "postapoc", "zombie"]],
    [/Strider|Mecha/i, SPACE],
    [/World War II/i, ["weirdwar"]],
    [/Submarine/i, ["weirdwar", "modern"]],
    [/Zeppelin/i, ["steampunk", "weirdwar"]],
    [/Cargo Plane/i, ["modern", "weirdwar"]],
    [/Orbital|Interstellar|Space Cruiser|Exploration Cruiser/i, SPACE]
  ],
  weapon: [
    [/^Knife$/i, NOT_TERRINOTH],
    [/^Revolver$/i, ["steampunk", "weirdwar", ...MODERNISH]],
    [/Ballista/i, ["fantasy", "mythic", "terrinoth"]],
    [/Pounder|Long Nine/i, ["fantasy", "steampunk", "weirdwar"]],
    [/^Многоствольная пушка$/i, ["steampunk", "weirdwar"]],
    [/Maxim/i, ["steampunk", "weirdwar"]],
    [/Scrap-Shooter|Grille-Mounted|Harpoon|Spike-Shooter/i, ["postapoc", "zombie"]],
    [/Strider|Mech-Fist|Hullbreaker|Giga Cannon|Shoulder-Mounted/i, SPACE],
    [/Laser Projector|Railgun|Fusion Missile|Ship-Hunter/i, SPACE],
    [/Inch Gun|40mm|Torpedo|Wing-Mounted|Ground-Attack|Nose-Mounted|Tail-Mounted|Twin Heavy/i, ["weirdwar", "modern"]],
    [/Main Tank Gun/i, ["weirdwar", "modern", "postapoc", "zombie"]],
    [/Missile|CIWS|Chain Gun|Anti-Tank|Anti-Personnel Rocket/i, ["modern"]],
    [/Machine Gun|Grenade Launcher/i, ["weirdwar", ...MODERNISH]]
  ],
  attachment: [
    [/Optical Sight|Bipod|Tripod|Hair Trigger|Оружейный подвес|Удлинённый ствол/i, FIREARM_WORLDS],
    [/Underbarrel/i, ["weirdwar", ...MODERNISH, ...SPACE]],
    [/Recursive|Рекурсивные плечи/i, ["fantasy", "mythic", ...MODERNISH]],
    [/Герметичность|Улучшенные сервоприводы/i, [...SPACE, "postapoc"]],
    [/Duelist|Гарда дуэлянта|Balanced Hilt|Сбалансированная рукоять|Rare Metals|Редкие металлы/i, ["fantasy", "mythic", "steampunk", "weirdwar", "monster"]]
  ],
  quality: [
    [/Scavenged|Трофейное/i, ["postapoc", "zombie"]]
  ],
  gear: [
    [/Vehicle Creation|Vulnerable|Resilient|All-Terrain|Massive|Spikey|Ram$|Bombing|Crashing/i, ALL],
    [/Painkillers/i, NOT_TERRINOTH],
    [/Creating Custom Implements/i, [...MAGIC_WORLDS, "terrinoth"]]
  ]
};

/** Типы, общие для всех миров независимо от папки. */
const UNIVERSAL_TYPES = new Set(["injury", "quality"]);

/** Навыки: миры, в наборы навыков которых входит навык. */
function skillWorlds(key) {
  const out = new Set();
  for (const [world, preset] of Object.entries({
    fantasy: "fantasy", mythic: "fantasy", steampunk: "steampunk", weirdwar: "weirdwar", modern: "modern",
    monster: "modern", postapoc: "modern", zombie: "modern", scifi: "scifi", spaceopera: "spaceopera"
  })) {
    const def = GENESYS.defaultSkills.find(s => s.key === key);
    if (def && (def.settings.includes("all") || def.settings.includes(preset))) out.add(world);
  }
  if (GENESYS.presetSkills.terrinoth.includes(key)) out.add("terrinoth");
  for (const a of Object.values(ADVENTURES)) if (a.extraSkills?.includes(key)) a.worlds.forEach(w => out.add(w));
  if (key === "knowledgeScience") ["monster", "modern", ...SPACE].forEach(w => out.add(w));
  if (key === "psychic") ["monster", "modern", ...SPACE].forEach(w => out.add(w));
  return [...out];
}

/**
 * Теги документа.
 * @param {object} doc     исходный документ (name, nameEn, type, folder, system)
 * @param {string} pack    имя компендиума
 */
export function worldsFor(doc, pack) {
  if (Array.isArray(doc.system?.worlds) && doc.system.worlds.length) return doc.system.worlds;
  const type = doc.type ?? (pack === "vehicles" ? "vehicle" : pack === "adversaries" ? "adversary" : null);
  if (type === "skill" && doc.system?.key) {
    const w = skillWorlds(doc.system.key);
    if (w.length) return w;
  }
  for (const [re, worlds] of BY_NAME[type] ?? []) {
    if (re.test(doc.nameEn ?? "") || re.test(doc.name)) return worlds;
  }
  if (UNIVERSAL_TYPES.has(type) || pack === "vehicle-crits") return ALL;
  const folder = doc.folder ?? "";
  if (folder.startsWith("Терринот")) return ["terrinoth"];
  if (FOLDERS[folder]) return FOLDERS[folder];

  // «Общие» и разделы Expanded Player's Guide.
  const generic = folder === "Общие" || folder === "Расширенное руководство" || folder === "Транспорт" || !folder;
  if (generic) {
    // Таланты Core, разрешённые в Терриноте (табл. 2–4 Realms of Terrinoth), — во всех мирах.
    if (type === "talent") return GENESYS.terrinothCoreTalents.includes(doc.name) ? ALL : NOT_TERRINOTH;
    if (type === "spell") return MAGIC_WORLDS;
    if (type === "adversary") return ALL;
    if (type === "attachment" || type === "weapon" || type === "armor" || type === "gear") return NOT_TERRINOTH;
    return NOT_TERRINOTH;
  }
  return ALL;
}
