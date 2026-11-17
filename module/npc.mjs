import { GENESYS, SYSTEM_ID } from "./config.mjs";
import { getAdventure, filterForAdventure } from "./worlds.mjs";
import { adventureSkillKeys, docAllowed } from "./helpers/adventure.mjs";

/**
 * Генератор NPC: роль × тип противника × сила (1 — слабый, 2 — опытный, 3 — грозный) × приключение.
 * Характеристики, навыки, оружие и броня из компендиума мира, таланты, мотивация, имя.
 * Ориентиры — профили противников Core Rulebook; это заготовка, которую ведущий легко поправит.
 */
export const NPC_ROLES = {
  fighter: { label: "Боец", title: ["Наёмник", "Головорез", "Страж", "Ветеран"], chars: ["brawn", "agility"], skills: ["@melee", "brawl", "athletics", "resilience", "vigilance", "coercion"], weapon: "melee", armor: true, icon: "swordman" },
  shooter: { label: "Стрелок", title: ["Стрелок", "Охотник", "Снайпер", "Следопыт"], chars: ["agility", "cunning"], skills: ["@ranged", "perception", "vigilance", "stealth", "cool", "coordination"], weapon: "ranged", armor: true, icon: "bowman" },
  leader: { label: "Лидер", title: ["Капитан", "Главарь", "Командир", "Атаман"], chars: ["presence", "willpower"], skills: ["leadership", "cool", "discipline", "@melee", "negotiation", "perception"], weapon: "melee", armor: true, icon: "rally-the-troops" },
  face: { label: "Дипломат", title: ["Посредник", "Интриган", "Советник", "Торговец"], chars: ["presence", "cunning"], skills: ["charm", "deception", "negotiation", "streetwise", "cool", "perception"], weapon: "light", armor: false, icon: "shaking-hands" },
  sneak: { label: "Лазутчик", title: ["Вор", "Шпион", "Убийца", "Контрабандист"], chars: ["agility", "cunning"], skills: ["stealth", "skulduggery", "coordination", "@melee", "perception", "streetwise"], weapon: "light", armor: false, icon: "hood" },
  scholar: { label: "Учёный", title: ["Учёный", "Лекарь", "Знаток", "Изобретатель"], chars: ["intellect", "willpower"], skills: ["@knowledge", "medicine", "mechanics", "computers", "perception", "discipline"], weapon: "light", armor: false, icon: "book-pile" },
  caster: { label: "Заклинатель", title: ["Колдун", "Жрец", "Мистик", "Чародей"], chars: ["willpower", "intellect"], skills: ["@magic", "discipline", "@knowledge", "cool", "vigilance"], weapon: "light", armor: false, icon: "wizard-face" }
};

const NAMES = {
  old: { first: ["Альрик", "Бранд", "Вейла", "Гаррет", "Дорин", "Эльза", "Йорген", "Кассия", "Лорен", "Мира", "Нестор", "Ольга", "Ровена", "Сигрид", "Торвальд", "Ульрих", "Фрея", "Хальдор", "Ингрид", "Ярвин"], last: ["из Вольных городов", "Сломанный Клинок", "Ворон", "Седой", "Чёрная Рука", "Тихий", "Беспалый", "Одноглазый", "Лунный", "Кривой Нож"] },
  modern: { first: ["Алекс", "Марк", "Ирина", "Дэн", "Лиза", "Виктор", "Сара", "Олег", "Мария", "Тони", "Кира", "Рауль", "Анна", "Борис", "Джек", "Нина"], last: ["Морозов", "Каллахан", "Петрова", "Рейес", "Штайн", "Волков", "Мерсер", "Новак", "Гаррисон", "Ким", "Соколова", "Дюваль"] },
  future: { first: ["Кай", "Нова", "Рекс", "Айла", "Зейн", "Ли", "Орион", "Вега", "Тесс", "Джин", "Ксандер", "Мика"], last: ["‑7", "Варгас", "из Кольца", "Синтия", "Окафор", "Тэнака", "Хольц", "Кросс", "Ремейн", "Арк"] }
};

const pick = list => list[Math.floor(Math.random() * list.length)];

function era(adv) {
  const w = adv.worlds ?? [];
  if (w.some(x => ["fantasy", "terrinoth", "mythic"].includes(x))) return "old";
  if (w.some(x => ["scifi", "spaceopera"].includes(x)) && !w.includes("modern")) return "future";
  return w.some(x => ["steampunk", "weirdwar"].includes(x)) ? "old" : "modern";
}

/** Выбрать конкретный навык с учётом набора навыков приключения. */
function resolveSkill(token, keys) {
  const has = k => !keys || keys.includes(k);
  switch (token) {
    case "@melee": return ["meleeLight", "meleeHeavy", "melee"].filter(has)[0] ?? "melee";
    case "@ranged": return ["ranged", "rangedLight", "rangedHeavy"].filter(has)[Math.floor(Math.random() * 2) % Math.max(1, ["ranged", "rangedLight", "rangedHeavy"].filter(has).length)] ?? "rangedLight";
    case "@knowledge": return ["knowledge", "knowledgeLore", "knowledgeForbidden", "knowledgeSupernatural"].filter(has)[0] ?? "knowledge";
    case "@magic": return ["arcana", "divine", "primal", "runes", "verse"].filter(k => keys?.includes(k))[0] ?? (keys ? null : "arcana");
    default: return has(token) ? token : null;
  }
}

function skillItem(key, rank, minion) {
  const def = GENESYS.defaultSkills.find(s => s.key === key) ?? GENESYS.extraSkills[key] ?? { characteristic: GENESYS.magicSkills[key] ?? "intellect", category: "general" };
  return {
    name: game.i18n.localize(`GENESYS.Skill.${key}`), type: "skill", img: GENESYS.icons?.skills?.[key] ?? GENESYS.icons?.defaults?.skill,
    system: { key, characteristic: def.characteristic, category: def.category ?? "general", rank: minion ? 0 : rank, career: !!minion }
  };
}

/**
 * Создать NPC.
 * @param {{role: string, kind: "minion"|"rival"|"nemesis", power: number, adventure: string}} opts
 */
export async function generateNPC({ role = "fighter", kind = "rival", power = 2, adventure = "all" } = {}) {
  const R = NPC_ROLES[role] ?? NPC_ROLES.fighter;
  const adv = getAdventure(adventure);
  const keys = adv.skills === "all" ? null : adventureSkillKeys(adv);
  const p = Math.min(3, Math.max(1, power));

  // Характеристики: 2, ведущие — выше.
  const ch = Object.fromEntries(Object.keys(GENESYS.characteristics).map(k => [k, 2]));
  const top = { minion: [3, 2], rival: [2 + p > 4 ? 4 : 2 + Math.ceil(p / 2), 3], nemesis: [3 + Math.ceil(p / 2), 3 + (p >= 2 ? 1 : 0)] }[kind];
  ch[R.chars[0]] = Math.min(5, top[0]);
  ch[R.chars[1]] = Math.max(ch[R.chars[1]], Math.min(5, top[1]));
  const weak = pick(Object.keys(ch).filter(k => !R.chars.includes(k)));
  if (kind !== "nemesis") ch[weak] = 1;

  // Навыки.
  const items = [];
  const skillKeys = [...new Set(R.skills.map(t => resolveSkill(t, keys)).filter(Boolean))];
  const maxRank = { minion: 0, rival: 1 + p, nemesis: 2 + p }[kind];
  skillKeys.forEach((k, i) => items.push(skillItem(k, Math.max(1, maxRank - Math.floor(i / 2)), kind === "minion")));

  // Оружие и броня из компендиума мира.
  const docs = [];
  for (const key of ["weapons", "armor"]) {
    const pack = game.packs.get(`${SYSTEM_ID}.${key}`);
    if (pack) docs.push(...(await pack.getDocuments()));
  }
  const pool = filterForAdventure(docs.filter(d => docAllowed(d) && (d.system.price ?? 0) > 0 && !/транспорт/i.test(d.folder?.name ?? "")), adv);
  const budget = [200, 800, 3000][p - 1] * (kind === "nemesis" ? 2 : 1);
  const weaponKeys = R.weapon === "ranged" ? ["ranged", "rangedLight", "rangedHeavy"] : R.weapon === "melee" ? ["melee", "meleeLight", "meleeHeavy"] : ["meleeLight", "melee", "rangedLight", "ranged"];
  const weapons = pool.filter(d => d.type === "weapon" && weaponKeys.includes(d.system.skill) && d.system.price <= budget);
  const weapon = weapons.length ? pick(weapons) : null;
  if (weapon) {
    const data = weapon.toObject(); delete data._id; data.system.equipped = true; items.push(data);
    if (!items.some(i => i.type === "skill" && i.system.key === data.system.skill)) items.push(skillItem(data.system.skill, Math.max(1, maxRank - 1), kind === "minion"));
  }
  let soak = ch.brawn;
  let defense = 0;
  if (R.armor) {
    const armors = pool.filter(d => d.type === "armor" && d.system.price <= budget);
    if (armors.length) {
      const a = pick(armors);
      const data = a.toObject(); delete data._id; data.system.equipped = true; items.push(data);
      soak += a.system.soak ?? 0; defense = a.system.defense ?? 0;
    }
  }

  // Таланты: «Противник» у соперников и главарей.
  const adversaryRank = kind === "nemesis" ? p : (kind === "rival" ? p - 1 : 0);
  if (adversaryRank > 0) items.push({ name: "Противник", type: "talent", img: GENESYS.icons?.defaults?.talent, flags: { [SYSTEM_ID]: { nameEn: "Adversary" } },
    system: { tier: 1, ranked: true, rank: adversaryRank, activation: "passive", description: "<p>Усильте сложность всех боевых проверок против этого противника на ранг таланта.</p>" } });

  // Мотивация.
  const mot = {};
  for (const k of ["desire", "fear", "strength", "flaw"]) {
    const o = pick(GENESYS.creation?.motivations?.[k] ?? [{ name: "", text: "" }]);
    mot[k] = { name: o.name ?? "", description: o.text ?? "" };
  }

  const n = NAMES[era(adv)];
  const title = pick(R.title);
  const plural = t => t.endsWith("а") ? `${t.slice(0, -1)}ы` : (/[кжчшщгх]$/.test(t) ? `${t}и` : `${t}ы`);
  const name = kind === "minion" ? plural(title) : `${pick(n.first)} ${pick(n.last)}`;
  const wounds = { minion: 3 + ch.brawn, rival: 8 + ch.brawn + p * 2, nemesis: 12 + ch.brawn + p * 3 }[kind];
  const strain = kind === "nemesis" ? 10 + ch.willpower + p * 2 : 0;
  const L = k => game.i18n.localize(k);
  const description = `<p><strong>${title}</strong> (${L(GENESYS.adversaryTypes[kind])}, ${R.label.toLowerCase()}, ${L(`GENESYS.NPC.Power.${p}`)}). ${L("GENESYS.NPC.Generated")}</p>
    <p>${["desire", "fear", "strength", "flaw"].map(k => `<strong>${L(GENESYS.motivations[k])}:</strong> ${mot[k].name}`).join(" · ")}</p>`;

  const folder = game.folders.find(f => f.type === "Actor" && f.name === L("GENESYS.NPC.Folder"))
    ?? await Folder.implementation.create({ name: L("GENESYS.NPC.Folder"), type: "Actor", color: "#1f3557" });
  return Actor.implementation.create({
    name, type: "adversary", folder: folder.id,
    img: `systems/genesys-rpg/assets/icons/gi/adversary/${R.icon}.svg`,
    system: {
      adversaryType: kind, characteristics: Object.fromEntries(Object.entries(ch).map(([k, v]) => [k, { value: v }])),
      wounds: { value: 0, max: wounds }, strain: { value: 0, max: strain }, soak: { value: soak },
      defense: { melee: { value: defense }, ranged: { value: defense } }, groupSize: kind === "minion" ? 3 : 1,
      description, worlds: adv.key === "all" ? [] : adv.worlds, creatureType: "humanoid",
      loot: ["coins", "gear", ...(weapon ? ["weapons"] : []), ...(R.armor ? ["armor"] : [])], motivations: mot
    },
    items
  });
}
