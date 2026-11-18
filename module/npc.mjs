import { GENESYS, SYSTEM_ID } from "./config.mjs";
import { getAdventure, filterForAdventure } from "./worlds.mjs";
import { adventureSkillKeys, docAllowed } from "./helpers/adventure.mjs";
import { estimatePower } from "./creatures.mjs";

/**
 * Генератор NPC: роль × тип противника × сила (1 — слабый, 2 — опытный, 3 — грозный) × приключение.
 * Характеристики, навыки, оружие и броня из компендиума мира, таланты, мотивация, имя.
 * Ориентиры — профили противников Core Rulebook; это заготовка, которую ведущий легко поправит.
 */
export const NPC_GROUPS = {
  combat: "Бой", crime: "Криминал и тайные дела", society: "Общество и власть", civil: "Мирные жители", learned: "Знание и вера", special: "Особые"
};

/**
 * Роли NPC. title — по эпохам (old / modern / future); civilian — мирный житель: без брони, без «Противника»,
 * слабое оружие или никакого; weapon: melee | ranged | light | any (по эпохе) | improvised | none.
 */
export const NPC_ROLES = {
  fighter: { group: "combat", label: "Боец", title: { old: ["Наёмник", "Ветеран", "Дружинник"], modern: ["Наёмник", "Боец", "Телохранитель"], future: ["Наёмник", "Штурмовик", "Боец корпорации"] },
    chars: ["brawn", "agility"], skills: ["@melee", "brawl", "athletics", "resilience", "vigilance", "coercion"], weapon: "melee", armor: true, icon: "swordman" },
  shooter: { group: "combat", label: "Стрелок", title: { old: ["Лучник", "Арбалетчик", "Стрелок"], modern: ["Стрелок", "Снайпер", "Боевик"], future: ["Стрелок", "Снайпер", "Оператор турели"] },
    chars: ["agility", "cunning"], skills: ["@ranged", "perception", "vigilance", "stealth", "cool", "coordination"], weapon: "ranged", armor: true, icon: "bowman" },
  soldier: { group: "combat", label: "Солдат", title: { old: ["Ратник", "Пикинёр", "Латник"], modern: ["Солдат", "Спецназовец", "Ополченец"], future: ["Десантник", "Пехотинец", "Космопех"] },
    chars: ["brawn", "agility"], skills: ["@any", "athletics", "resilience", "discipline", "vigilance", "@melee"], weapon: "any", armor: true, icon: "visored-helm" },
  guard: { group: "combat", label: "Стражник / полицейский", title: { old: ["Стражник", "Тюремщик", "Привратник"], modern: ["Полицейский", "Охранник", "Патрульный"], future: ["Охранник станции", "Миротворец", "Патрульный"] },
    chars: ["brawn", "willpower"], skills: ["@any", "vigilance", "perception", "coercion", "athletics", "discipline"], weapon: "any", armor: true, icon: "guards" },
  thug: { group: "combat", label: "Громила", title: { old: ["Громила", "Вышибала", "Разбойник"], modern: ["Громила", "Бандит", "Вышибала"], future: ["Громила", "Налётчик", "Бандит из трущоб"] },
    chars: ["brawn", "cunning"], skills: ["brawl", "@melee", "coercion", "streetwise", "resilience", "athletics"], weapon: "melee", armor: false, icon: "brute" },
  hunter: { group: "combat", label: "Охотник / следопыт", title: { old: ["Охотник", "Егерь", "Следопыт"], modern: ["Охотник", "Егерь", "Проводник"], future: ["Разведчик", "Рейнджер", "Охотник за головами"] },
    chars: ["cunning", "agility"], skills: ["survival", "@ranged", "stealth", "perception", "athletics", "vigilance"], weapon: "ranged", armor: false, icon: "hunter-eyes" },
  leader: { group: "combat", label: "Лидер", title: { old: ["Капитан", "Главарь", "Атаман"], modern: ["Командир", "Главарь", "Босс"], future: ["Командир", "Капитан", "Начальник охраны"] },
    chars: ["presence", "willpower"], skills: ["leadership", "cool", "discipline", "@melee", "negotiation", "perception"], weapon: "any", armor: true, icon: "rally-the-troops" },

  sneak: { group: "crime", label: "Вор", title: { old: ["Вор", "Карманник", "Взломщик"], modern: ["Вор", "Домушник", "Угонщик"], future: ["Вор", "Взломщик", "Похититель данных"] },
    chars: ["agility", "cunning"], skills: ["stealth", "skulduggery", "coordination", "@melee", "perception", "streetwise"], weapon: "light", armor: false, icon: "hood" },
  assassin: { group: "crime", label: "Убийца", title: { old: ["Убийца", "Отравитель", "Тень гильдии"], modern: ["Киллер", "Ликвидатор", "Наёмный убийца"], future: ["Ликвидатор", "Призрак", "Наёмный убийца"] },
    chars: ["agility", "cunning"], skills: ["stealth", "@melee", "@ranged", "skulduggery", "deception", "perception"], weapon: "light", armor: false, icon: "hooded-assassin" },
  spy: { group: "crime", label: "Шпион / осведомитель", title: { old: ["Шпион", "Соглядатай", "Осведомитель"], modern: ["Агент", "Информатор", "Шпион"], future: ["Агент", "Информатор", "Корпоративный шпион"] },
    chars: ["cunning", "presence"], skills: ["deception", "stealth", "perception", "streetwise", "skulduggery", "computers"], weapon: "light", armor: false, icon: "spy" },
  conman: { group: "crime", label: "Мошенник", title: { old: ["Шарлатан", "Шулер", "Мошенник"], modern: ["Аферист", "Мошенник", "Шулер"], future: ["Аферист", "Мошенник", "Торговец фальшивками"] },
    chars: ["presence", "cunning"], skills: ["deception", "charm", "skulduggery", "streetwise", "cool", "perception"], weapon: "improvised", armor: false, civilian: true, icon: "domino-mask" },
  hacker: { group: "crime", label: "Хакер / подделыватель", title: { old: ["Подделыватель", "Писарь-фальсификатор", "Шифровальщик"], modern: ["Хакер", "Взломщик", "Айтишник"], future: ["Хакер", "Нетраннер", "Взломщик ИИ"] },
    chars: ["intellect", "cunning"], skills: ["computers", "skulduggery", "mechanics", "perception", "deception", "streetwise"], weapon: "none", armor: false, civilian: true, icon: "laptop" },

  face: { group: "society", label: "Дипломат", title: { old: ["Посредник", "Посол", "Советник"], modern: ["Дипломат", "Юрист", "Советник"], future: ["Посредник", "Дипломат", "Представитель"] },
    chars: ["presence", "cunning"], skills: ["charm", "deception", "negotiation", "streetwise", "cool", "perception"], weapon: "light", armor: false, civilian: true, icon: "shaking-hands" },
  merchant: { group: "society", label: "Торговец", title: { old: ["Торговец", "Купец", "Лавочник"], modern: ["Предприниматель", "Продавец", "Лавочник"], future: ["Торговец", "Брокер", "Владелец лавки"] },
    chars: ["presence", "cunning"], skills: ["negotiation", "charm", "deception", "perception", "streetwise", "@knowledge"], weapon: "improvised", armor: false, civilian: true, icon: "money-stack" },
  noble: { group: "society", label: "Знать / богач", title: { old: ["Дворянин", "Барон", "Леди"], modern: ["Бизнесмен", "Политик", "Наследница"], future: ["Корпорат", "Сенатор", "Наследник династии"] },
    chars: ["presence", "willpower"], skills: ["charm", "leadership", "negotiation", "coercion", "cool", "@knowledge"], weapon: "light", armor: false, civilian: true, icon: "crown" },
  official: { group: "society", label: "Чиновник", title: { old: ["Писарь", "Сборщик податей", "Магистрат"], modern: ["Чиновник", "Инспектор", "Бюрократ"], future: ["Администратор", "Инспектор", "Клерк корпорации"] },
    chars: ["intellect", "presence"], skills: ["negotiation", "@knowledge", "coercion", "perception", "cool", "deception"], weapon: "none", armor: false, civilian: true, icon: "scroll-quill" },
  entertainer: { group: "society", label: "Артист", title: { old: ["Бард", "Менестрель", "Жонглёр"], modern: ["Музыкант", "Актриса", "Блогер"], future: ["Голозвезда", "Музыкант", "Шоумен"] },
    chars: ["presence", "agility"], skills: ["charm", "deception", "coordination", "cool", "perception", "@knowledge"], weapon: "improvised", armor: false, civilian: true, icon: "drama-masks" },

  peasant: { group: "civil", label: "Крестьянин / рабочий", title: { old: ["Крестьянин", "Пастух", "Мельник"], modern: ["Рабочий", "Фермер", "Грузчик"], future: ["Колонист", "Шахтёр", "Работник гидропоники"] },
    chars: ["brawn", "willpower"], skills: ["athletics", "resilience", "survival", "@vehicle", "perception", "brawl"], weapon: "improvised", armor: false, civilian: true, icon: "farmer" },
  artisan: { group: "civil", label: "Ремесленник / механик", title: { old: ["Кузнец", "Плотник", "Каменщик"], modern: ["Механик", "Электрик", "Слесарь"], future: ["Техник", "Инженер", "Ремонтник дронов"] },
    chars: ["intellect", "brawn"], skills: ["mechanics", "athletics", "perception", "negotiation", "@knowledge", "resilience"], weapon: "improvised", armor: false, civilian: true, icon: "blacksmith" },
  driver: { group: "civil", label: "Возница / пилот / моряк", title: { old: ["Возница", "Моряк", "Конюх"], modern: ["Водитель", "Таксист", "Пилот"], future: ["Пилот", "Навигатор", "Водитель вездехода"] },
    chars: ["agility", "intellect"], skills: ["@vehicle", "@vehicle2", "mechanics", "perception", "cool", "astrocartography"], weapon: "improvised", armor: false, civilian: true, icon: "steering-wheel" },
  servant: { group: "civil", label: "Слуга / обыватель", title: { old: ["Слуга", "Трактирщик", "Горожанин"], modern: ["Официант", "Прохожий", "Студент"], future: ["Житель станции", "Курьер", "Обслуживающий персонал"] },
    chars: ["presence", "cunning"], skills: ["perception", "charm", "streetwise", "cool", "athletics", "negotiation"], weapon: "none", armor: false, civilian: true, icon: "person" },
  beggar: { group: "civil", label: "Бродяга / нищий", title: { old: ["Нищий", "Бродяга", "Беглый"], modern: ["Бездомный", "Бродяга", "Беглец"], future: ["Бродяга нижних уровней", "Беглец", "Нелегал"] },
    chars: ["cunning", "willpower"], skills: ["streetwise", "survival", "stealth", "perception", "resilience", "deception"], weapon: "improvised", armor: false, civilian: true, icon: "walking-boot" },

  scholar: { group: "learned", label: "Учёный", title: { old: ["Книжник", "Летописец", "Алхимик"], modern: ["Учёный", "Профессор", "Исследователь"], future: ["Учёный", "Аналитик", "Генетик"] },
    chars: ["intellect", "willpower"], skills: ["@knowledge", "perception", "discipline", "computers", "alchemy", "medicine"], weapon: "none", armor: false, civilian: true, icon: "book-pile" },
  healer: { group: "learned", label: "Лекарь / врач", title: { old: ["Лекарь", "Травница", "Цирюльник"], modern: ["Врач", "Медсестра", "Фельдшер"], future: ["Медик", "Биотехник", "Хирург"] },
    chars: ["intellect", "willpower"], skills: ["medicine", "@knowledge", "cool", "perception", "survival", "discipline"], weapon: "none", armor: false, civilian: true, icon: "doctor-face" },
  priest: { group: "learned", label: "Священник", title: { old: ["Священник", "Монах", "Паломник"], modern: ["Священник", "Проповедник", "Монахиня"], future: ["Капеллан", "Проповедник", "Служитель культа"] },
    chars: ["willpower", "presence"], skills: ["discipline", "charm", "leadership", "@knowledge", "medicine", "cool"], weapon: "none", armor: false, civilian: true, icon: "monk-face" },
  caster: { group: "learned", label: "Заклинатель", title: { old: ["Колдун", "Жрец", "Чародей"], modern: ["Оккультист", "Медиум", "Экзорцист"], future: ["Псионик", "Техномаг", "Мистик"] },
    chars: ["willpower", "intellect"], skills: ["@magic", "discipline", "@knowledge", "cool", "vigilance"], weapon: "light", armor: false, icon: "wizard-face" },

  pirate: { group: "special", label: "Пират / контрабандист", title: { old: ["Пират", "Контрабандист", "Абордажник"], modern: ["Контрабандист", "Пират", "Наркокурьер"], future: ["Космический пират", "Контрабандист", "Абордажник"] },
    chars: ["agility", "cunning"], skills: ["@vehicle", "@any", "streetwise", "deception", "athletics", "coordination"], weapon: "any", armor: false, icon: "pirate-captain" },
  cultist: { group: "special", label: "Сектант", title: { old: ["Сектант", "Культист", "Еретик"], modern: ["Сектант", "Фанатик", "Культист"], future: ["Фанатик", "Культист", "Адепт ИИ"] },
    chars: ["willpower", "presence"], skills: ["discipline", "deception", "@melee", "coercion", "@knowledge", "stealth"], weapon: "light", armor: false, icon: "prayer" }
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

/** Навыки, которых нет в эпохе. */
const ERA_EXCLUDE = { old: ["computers", "piloting", "astrocartography", "gunnery"], modern: ["astrocartography", "alchemy"], future: ["alchemy"] };
const VEHICLES = { old: ["riding", "operating", "driving"], modern: ["driving", "piloting", "operating"], future: ["piloting", "driving", "operating"] };

/** Выбрать конкретный навык с учётом набора навыков приключения и эпохи. */
function resolveSkill(token, keys, ep = "modern") {
  const has = k => (!keys || keys.includes(k)) && !(ERA_EXCLUDE[ep] ?? []).includes(k);
  switch (token) {
    case "@any": return resolveSkill(ep === "old" ? "@melee" : "@ranged", keys, ep);
    case "@vehicle": return VEHICLES[ep].filter(has)[0] ?? null;
    case "@vehicle2": return VEHICLES[ep].filter(has)[1] ?? null;
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
  const ep = era(adv);
  const civ = !!R.civilian;

  // Характеристики: 2, ведущие — выше.
  const ch = Object.fromEntries(Object.keys(GENESYS.characteristics).map(k => [k, 2]));
  const top = { minion: [3, 2], rival: [2 + p > 4 ? 4 : 2 + Math.ceil(p / 2), 3], nemesis: [3 + Math.ceil(p / 2), 3 + (p >= 2 ? 1 : 0)] }[kind];
  // Ведущая характеристика мирных — их ремесло; боевые (Сила/Ловкость) не завышаем.
  ch[R.chars[0]] = Math.min(5, top[0]);
  ch[R.chars[1]] = Math.max(ch[R.chars[1]], Math.min(5, top[1]));
  const weak = pick(Object.keys(ch).filter(k => !R.chars.includes(k)));
  if (kind !== "nemesis") ch[weak] = 1;

  // Навыки.
  const items = [];
  const skillKeys = [...new Set(R.skills.map(t => resolveSkill(t, keys, ep)).filter(Boolean))];
  const maxRank = { minion: 0, rival: 1 + p, nemesis: 2 + p }[kind];
  const COMBAT = ["melee", "meleeLight", "meleeHeavy", "ranged", "rangedLight", "rangedHeavy", "brawl", "gunnery"];
  // Мирные: профессиональные навыки как у всех, боевые — не выше 1.
  skillKeys.forEach((k, i) => items.push(skillItem(k, civ && COMBAT.includes(k) ? 1 : Math.max(1, maxRank - Math.floor(i / 2)), kind === "minion")));

  // Оружие и броня из компендиума мира.
  const docs = [];
  for (const key of ["weapons", "armor"]) {
    const pack = game.packs.get(`${SYSTEM_ID}.${key}`);
    if (pack) docs.push(...(await pack.getDocuments()));
  }
  const pool = filterForAdventure(docs.filter(d => docAllowed(d) && (d.system.price ?? 0) > 0 && !/транспорт/i.test(d.folder?.name ?? "")), adv);
  const budget = [200, 800, 3000][p - 1] * (kind === "nemesis" ? 2 : 1);
  const wmode = R.weapon === "any" ? (ep === "old" ? "melee" : "ranged") : R.weapon;
  const weaponKeys = wmode === "ranged" ? ["ranged", "rangedLight", "rangedHeavy"] : wmode === "melee" ? ["melee", "meleeLight", "meleeHeavy"]
    : wmode === "improvised" ? ["meleeLight", "melee", "brawl"] : ["meleeLight", "melee", "rangedLight", "ranged"];
  const priceCap = wmode === "improvised" ? 60 : budget;
  const weapons = wmode === "none" || (wmode === "improvised" && Math.random() < 0.4) ? []
    : pool.filter(d => d.type === "weapon" && weaponKeys.includes(d.system.skill) && d.system.price <= priceCap && !/граната|взрыв/i.test(d.name));
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
  const adversaryRank = civ ? 0 : (kind === "nemesis" ? p : (kind === "rival" ? p - 1 : 0));
  if (adversaryRank > 0) items.push({ name: "Противник", type: "talent", img: GENESYS.icons?.defaults?.talent, flags: { [SYSTEM_ID]: { nameEn: "Adversary" } },
    system: { tier: 1, ranked: true, rank: adversaryRank, activation: "passive", description: "<p>Усильте сложность всех боевых проверок против этого противника на ранг таланта.</p>" } });

  // Мотивация.
  const mot = {};
  for (const k of ["desire", "fear", "strength", "flaw"]) {
    const o = pick(GENESYS.creation?.motivations?.[k] ?? [{ name: "", text: "" }]);
    mot[k] = { name: o.name ?? "", description: o.text ?? "" };
  }

  const n = NAMES[era(adv)];
  const title = pick(Array.isArray(R.title) ? R.title : (R.title[ep] ?? R.title.modern));
  const plural = t => t.endsWith("а") ? `${t.slice(0, -1)}ы` : (/[кжчшщгх]$/.test(t) ? `${t}и` : `${t}ы`);
  const name = kind === "minion" ? plural(title) : `${pick(n.first)} ${pick(n.last)}`;
  const wounds = civ ? { minion: 2 + ch.brawn, rival: 6 + ch.brawn + p, nemesis: 10 + ch.brawn + p * 2 }[kind]
    : { minion: 3 + ch.brawn, rival: 8 + ch.brawn + p * 2, nemesis: 12 + ch.brawn + p * 3 }[kind];
  const strain = kind === "nemesis" ? 10 + ch.willpower + p * 2 : 0;
  const L = k => game.i18n.localize(k);
  const description = `<p><strong>${title}</strong> (${L(GENESYS.adversaryTypes[kind])}, ${R.label.toLowerCase()}, ${L(`GENESYS.NPC.Power.${p}`)}). ${L("GENESYS.NPC.Generated")}</p>
    <p>${["desire", "fear", "strength", "flaw"].map(k => `<strong>${L(GENESYS.motivations[k])}:</strong> ${mot[k].name}`).join(" · ")}</p>`;

  const folder = game.folders.find(f => f.type === "Actor" && f.name === L("GENESYS.NPC.Folder"))
    ?? await Folder.implementation.create({ name: L("GENESYS.NPC.Folder"), type: "Actor", color: "#1f3557" });
  const system = {
    adversaryType: kind, characteristics: Object.fromEntries(Object.entries(ch).map(([k, v]) => [k, { value: v }])),
    wounds: { value: 0, max: wounds }, strain: { value: 0, max: strain }, soak: { value: soak },
    defense: { melee: { value: defense }, ranged: { value: defense } }, groupSize: kind === "minion" ? 3 : 1,
    description, worlds: adv.key === "all" ? [] : adv.worlds, creatureType: "humanoid",
    loot: ["coins", "gear", ...(weapon ? ["weapons"] : []), ...(R.armor ? ["armor"] : []), ...(role === "noble" || role === "merchant" ? ["valuables"] : [])], motivations: mot
  };
  const pw = estimatePower({ system, items });
  system.power = { combat: pw.combat, social: pw.social, general: pw.general, listed: false };
  return Actor.implementation.create({
    name, type: "adversary", folder: folder.id,
    img: `systems/genesys-rpg/assets/icons/gi/adversary/${R.icon}.svg`,
    system,
    items
  });
}
