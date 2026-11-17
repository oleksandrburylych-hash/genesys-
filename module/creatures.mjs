/**
 * Типы существ и теги добычи противников, оценка угрозы.
 * Без зависимостей от Foundry: используется и сборкой компендиумов, и генераторами в игре.
 */

/** Типы существ. */
export const CREATURE_TYPES = {
  humanoid: { label: "Люди и гуманоиды", icon: "person" },
  beast: { label: "Звери", icon: "wolf-head" },
  monster: { label: "Чудовища", icon: "dragon-head" },
  undead: { label: "Нежить", icon: "raise-zombie" },
  demon: { label: "Демоны и духи", icon: "horned-reptile" },
  construct: { label: "Конструкты и роботы", icon: "robot-golem" },
  alien: { label: "Пришельцы и мутанты", icon: "alien-stare" }
};

/** Теги добычи: что может выпасть с противника. */
export const LOOT_TAGS = {
  coins: { label: "Деньги", icon: "two-coins" },
  weapons: { label: "Оружие", icon: "crossed-swords" },
  armor: { label: "Броня", icon: "chest-armor" },
  gear: { label: "Снаряжение", icon: "swap-bag" },
  valuables: { label: "Ценности", icon: "gems" },
  magic: { label: "Магия и зелья", icon: "magic-potion" },
  tech: { label: "Техника", icon: "processor" },
  parts: { label: "Трофеи (шкуры, клыки)", icon: "fangs" }
};

/** Естественное оружие (не выпадает как предмет). */
export const NATURAL_WEAPON = /когт|клык|укус|копыт|рог|хвост|жал|пасть|кулак|удар|щупал|лап|бивн|клюв|тело|дыхани|взгляд|натиск|топот|таран|растопт|хват|сокруш|разряд|касани|natural|claw|bite|fang|horn|hoof|tail|slam|fist|gore|trample/i;

const TYPE_RULES = [
  [/голем|робот|андроид|дрон|механическ|нанорой|железный страж/i, "construct"],
  [/зомби|мертвец|(^|[^а-яё])скелет|вампир|призрак|привидени|лич|мумия|мумий|упыр|вурдалак|гаст|нежит|умертвие|рыцарь смерти|восставш|баргест|халлатоин|отродье|некромантическ|оживл[её]нная|блуждающий огон|тень$|^тень|раздутый|бегун|громила-мутант/i, "undead"],
  [/демон|бес|адск|погибшие души|дух |дух$|фейри|джинн|элементаль|димора|вендиго|сирена|корриган|саламандр/i, "demon"],
  [/пришел|ксеноморф|мутант|атавист|неудачный эксперимент|радиогатор/i, "alien"],
  [/дракон|змий|тролль|огр|великан|циклоп|эттин|гигант|мантикор|гидр|химер|грифон|василиск|горгон|минотавр|гаргуль|слизь|удильщик|жук|паук|ужасоглаз|дурной глаз|кракен|бритвокрыл|скорпион|растени|плотедёр|гротеск|молотильщик|мерриод|махим|кёрл|карнозавр|чудовищ|ликантроп|оборот|леонкс|феррокс|гурак|адский пёс|земляная акула/i, "monster"],
  [/медвед|волк|кошк|тигр|собак|лошад|конь|скакун|животн|(^|[^а-яё])бык|(^|[^а-яё])тур([^а-яё]|$)|(^|[^а-яё])лось|носорог|слон|мамонт|верблюд|крокодил|акула|змея|сокол|орёл|летучая мышь|нетопыр/i, "beast"]
];

/** Тип существа по папке и имени. */
export function creatureTypeFor(doc) {
  const folder = doc.folder ?? doc.folder?.name ?? "";
  const f = typeof folder === "string" ? folder : folder?.name ?? "";
  if (/Звери|скакуны/.test(f)) return "beast";
  if (/Демоны/.test(f)) return "demon";
  if (/Големы/.test(f)) return "construct";
  if (/Нежить|Зомби/.test(f)) return "undead";
  if (/Великаны|Чудовища/.test(f) && !/Гуманоиды/.test(f)) return "monster";
  const text = `${doc.name} ${doc.nameEn ?? ""}`;
  for (const [re, type] of TYPE_RULES) if (re.test(text)) return type;
  return "humanoid";
}

/** Теги добычи по типу существа, его предметам и навыкам. */
export function lootTagsFor(doc, type = creatureTypeFor(doc)) {
  const items = doc.items ?? [];
  const tags = new Set();
  const manufactured = items.filter(i => i.type === "weapon" && !NATURAL_WEAPON.test(i.name));
  const magicSkill = items.some(i => i.type === "skill" && /^(arcana|divine|primal|runes|verse)$/.test(i.system?.key ?? ""));
  const worlds = doc.system?.worlds ?? [];
  const techWorld = worlds.some(w => ["scifi", "spaceopera"].includes(w)) && !worlds.some(w => ["fantasy", "terrinoth", "mythic"].includes(w));
  switch (type) {
    case "humanoid":
      tags.add("coins").add("gear");
      if (manufactured.length) tags.add("weapons");
      if (items.some(i => i.type === "armor") || (doc.system?.soak?.value ?? 0) > (doc.system?.characteristics?.brawn?.value ?? 2)) tags.add("armor");
      if (doc.system?.adversaryType === "nemesis") tags.add("valuables");
      break;
    case "beast": tags.add("parts"); break;
    case "monster": tags.add("parts"); if (/дракон|змий|великан/i.test(doc.name)) tags.add("valuables").add("coins"); break;
    case "undead": tags.add("valuables"); if (manufactured.length) tags.add("weapons"); if (doc.system?.adversaryType === "nemesis") tags.add("magic"); break;
    case "demon": tags.add("magic").add("valuables"); break;
    case "construct": tags.add(techWorld ? "tech" : "parts"); if (/голем|страж/i.test(doc.name)) tags.add("magic"); break;
    case "alien": tags.add("tech").add("parts"); break;
  }
  if (magicSkill) tags.add("magic");
  if (techWorld && type === "humanoid") tags.add("tech");
  return [...tags];
}

/**
 * Оценка угрозы одного противника (оценка системы, не правило книги).
 * Приспешник ≈ 1, обычный соперник ≈ 3–5, главарь ≈ 8+.
 * @param {object} doc  данные противника (документ или исходник)
 */
export function threatOf(doc) {
  const s = doc.system ?? {};
  const base = { minion: 1, rival: 3, nemesis: 8 }[s.adversaryType] ?? 3;
  const items = doc.items?.contents ?? doc.items ?? [];
  const dmg = Math.max(0, ...items.filter(i => i.type === "weapon").map(i => (i.system?.damage ?? 0) + (i.system?.brawnDamage ? (s.characteristics?.brawn?.value ?? 2) : 0)));
  const combatRank = Math.max(0, ...items.filter(i => i.type === "skill" && ["melee", "meleeLight", "meleeHeavy", "brawl", "ranged", "rangedLight", "rangedHeavy", "gunnery", "arcana", "divine", "primal"].includes(i.system?.key)).map(i => i.system?.rank ?? 0));
  const adversary = items.filter(i => i.type === "talent" && /^(Противник|Adversary)/.test(i.name)).reduce((m, t) => Math.max(m, t.system?.rank ?? 1), 0);
  const scale = s.adversaryType === "minion" ? 0.25 : (s.adversaryType === "nemesis" ? 1.5 : 1);
  const extra = ((s.soak?.value ?? 2) - 3) * 0.4 + ((s.wounds?.max ?? 10) - 12) / 8 + (dmg - 6) / 3
    + ((s.defense?.melee?.value ?? 0) + (s.defense?.ranged?.value ?? 0)) * 0.4 + combatRank * 0.3 + adversary * 1.2;
  return Math.max(0.5, Math.round((base + extra * scale) * 10) / 10);
}
