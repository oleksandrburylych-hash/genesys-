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

/* -------------------------------------------- */
/*  Уровни силы (Expanded Player's Guide, гл. II.2)  */
/* -------------------------------------------- */

const COMBAT_SKILLS = ["melee", "meleeLight", "meleeHeavy", "brawl", "ranged", "rangedLight", "rangedHeavy", "gunnery"];
const MAGIC_SKILLS = ["arcana", "divine", "primal", "runes", "verse", "psychic", "psiExtrasensory", "psiMind", "psiProjection"];
const SOCIAL_OFFENSE = ["charm", "coercion", "deception", "leadership", "negotiation"];
const SOCIAL_DEFENSE = ["cool", "discipline", "vigilance"];

/** Уровни силы, указанные в описании (противники Expanded Player's Guide: «Уровни силы: боевой 3, социальный 1, общий 1»). */
export function listedPower(doc) {
  const m = String(doc.system?.description ?? "").match(/боевой\s+(\d+)\s*,\s*социальный\s+(\d+)\s*,\s*общий\s+(\d+)/i);
  return m ? { combat: Number(m[1]), social: Number(m[2]), general: Number(m[3]), listed: true } : null;
}

/**
 * Оценка уровней силы по профилю — по поправкам быстрого создания противника EPG
 * (табл. II.2–1 характеристики, II.2–2 производные, II.2–3 навыки, II.2–4 таланты, II.2–5 способности, шаг 6 снаряжение).
 * Профиль не собран из пакетов книги, поэтому это приближение: пакет подбирается по фактическим числам.
 */
export function estimatePower(doc) {
  const s = doc.system ?? {};
  const ch = k => s.characteristics?.[k]?.value ?? 2;
  const items = doc.items?.contents ?? doc.items ?? [];
  const rank = k => items.find(i => i.type === "skill" && i.system?.key === k)?.system?.rank ?? 0;
  const type = s.adversaryType ?? "rival";
  const minion = type === "minion";
  let combat = 0, social = 0, general = 0;

  // Характеристики (табл. II.2–1).
  const br = ch("brawn"), ag = ch("agility"), int = ch("intellect"), cun = ch("cunning"), wil = ch("willpower"), pr = ch("presence");
  if (br >= 4 && ag >= 3) combat += 2;
  else if (br >= 4 || ag >= 4 || (br >= 3 && ag >= 3)) combat += 1;
  else if (br <= 1) combat -= 1;
  if (pr >= 5 || (wil >= 5 && pr >= 3)) social += 2;
  else if (pr >= 3 && wil >= 3) social += 1;
  else if (pr <= 1 && (s.creatureType && s.creatureType !== "humanoid")) social -= 1;
  if (int >= 4 && cun >= 4) general += 2;
  else if (int >= 4 || cun >= 5 || [br, ag, int, cun, wil, pr].every(v => v >= 3)) general += 1;

  // Производные (табл. II.2–2): раны сверх базы, усталость сверх базы.
  const baseWounds = minion ? (br <= 1 ? 3 : 5) : (type === "nemesis" ? 12 + br : 8 + br);
  const extraWounds = (s.wounds?.max ?? baseWounds) - baseWounds;
  if (extraWounds >= 25) combat += 2; else if (extraWounds >= 10) combat += 1;
  if (type === "nemesis" && (s.strain?.max ?? 0) - (10 + wil) >= 10) social += 1;

  // Навыки (табл. II.2–3). У приспешников — не больше +1 от навыков на уровень.
  const cap = v => minion ? Math.min(1, v) : v;
  const combatRanks = COMBAT_SKILLS.map(rank).filter(r => r > 0);
  const topCombat = Math.max(0, ...combatRanks);
  let c = topCombat >= 5 ? 2 : (topCombat >= 4 || (combatRanks.length >= 2 && topCombat >= 2)) ? 1 : 0;
  if (Math.max(0, ...MAGIC_SKILLS.map(rank)) >= 4) c = Math.max(c, 2);
  combat += cap(c);
  const off = SOCIAL_OFFENSE.reduce((t, k) => t + rank(k), 0);
  const def = SOCIAL_DEFENSE.reduce((t, k) => t + rank(k), 0);
  social += cap(Math.min(3, Math.round((off + def * 0.5) / 3.5)));
  const generalRanks = items.filter(i => i.type === "skill" && !COMBAT_SKILLS.includes(i.system?.key) && !SOCIAL_OFFENSE.includes(i.system?.key))
    .reduce((t, i) => t + (i.system?.rank ?? 0), 0);
  general += cap(Math.max(0, Math.min(5, Math.round((generalRanks - 4) / 3.5))));

  // Таланты (табл. II.2–4).
  const talents = items.filter(i => i.type === "talent");
  const adversary = talents.filter(t => /^(Противник|Adversary)/i.test(t.name)).reduce((m, t) => Math.max(m, t.system?.rank ?? 1), 0);
  if (adversary >= 3) combat += 2; else if (adversary === 2) combat += 1;
  const others = talents.filter(t => !/^(Противник|Adversary)/i.test(t.name));
  if (others.some(t => /парирован|parry|обоерук|dual wield|счастливое попадание|lucky strike|бочка|barrel|гренадер|grenadier|полевой командир|field commander|непоколеб|indomitable|мастер$|^master|одарён|natural|скоординированн|coordinated/i.test(t.name))) combat += 1;
  if (others.some(t => /уничтожающ|ruinous|второе дыхание|second wind|непоколеб|indomitable|одарён|natural|колк|scathing|остроум|clever/i.test(t.name))) social += 1;

  // Особые способности (табл. II.2–5).
  const abilities = items.filter(i => i.type === "ability").map(i => i.name).join(" | ");
  if (/летун|летает|flyer|плава|aquatic/i.test(abilities)) general += 1;
  if (/призрачн|бестелес|ghost/i.test(abilities)) { combat += 2; general += 1; }
  if (/рой|swarm|стая|pack fighter|в стае/i.test(abilities)) combat += 1;
  if (/ужас|устрашающ|terrifying|страх/i.test(abilities)) { combat += 1; social += 1; general += 1; }

  // Снаряжение (шаг 6): урон, броня сверх Силы, защита, несколько попаданий, Укреплённое.
  const weapons = items.filter(i => i.type === "weapon");
  const dmg = Math.max(0, ...weapons.map(w => (w.system?.damage ?? 0) + (w.system?.brawnDamage ? br : 0)));
  const multi = weapons.some(w => (w.system?.qualities ?? []).some(q => /автоматическ|взрыв|залпов|auto|blast|linked/i.test(q.name)));
  const soak = s.soak?.value ?? br;
  const soakExtra = soak - br;
  const defense = Math.max(s.defense?.melee?.value ?? 0, s.defense?.ranged?.value ?? 0);
  if (dmg >= 8 && dmg <= 14 || soakExtra === 2 || (defense >= 2 && defense <= 3)) combat += 1;
  if (dmg >= 15 || soakExtra >= 3 || defense >= 4) combat += 2;
  if (multi) combat += 2;
  if (items.some(i => i.type === "armor" && (i.system?.qualities ?? []).some(q => /укреплён|reinforced/i.test(q.name)))) combat += 1;
  if (soak >= 7) combat += 1;

  // Поправка по 49 профилям EPG с указанными уровнями: образцы книги собраны не по быстрым правилам
  // и в среднем сильнее (соперник ≈ +1, главарь ≈ +2 к боевому и социальному).
  const cal = { minion: [1, 0, 0], rival: [1, 1, 1], nemesis: [2, 2, 1] }[type] ?? [0, 0, 0];
  combat += cal[0]; social += cal[1]; general += cal[2];
  return { combat: Math.max(1, combat), social: Math.max(1, social), general: Math.max(1, general), listed: false };
}

/** Уровни силы противника: из системы (если заданы), из описания EPG или оценкой. */
export function powerOf(doc) {
  const p = doc.system?.power;
  if (p && (p.combat || p.social || p.general)) return { combat: p.combat || 1, social: p.social || 1, general: p.general || 1, listed: !!p.listed };
  return listedPower(doc) ?? estimatePower(doc);
}

/** Поправка уровня силы приспешников за размер группы (EPG: расчёт на группу из трёх). */
export function minionGroupPower(power, size) {
  const d = size <= 2 ? -1 : (size >= 5 ? 1 : 0);
  return { ...power, combat: Math.max(1, power.combat + d), social: Math.max(1, power.social + d) };
}
