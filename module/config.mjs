/**
 * Константы и справочники системы Genesys.
 * Всё, что видит игрок, задаётся ключами локализации (lang/*.json).
 */

export const SYSTEM_ID = "genesys-rpg";
export const SYSTEM_PATH = `systems/${SYSTEM_ID}`;
export const TEMPLATES = `${SYSTEM_PATH}/templates`;

export const GENESYS = {};

/** Шесть характеристик. */
GENESYS.characteristics = {
  brawn: { label: "GENESYS.Characteristic.brawn", abbr: "GENESYS.CharacteristicAbbr.brawn" },
  agility: { label: "GENESYS.Characteristic.agility", abbr: "GENESYS.CharacteristicAbbr.agility" },
  intellect: { label: "GENESYS.Characteristic.intellect", abbr: "GENESYS.CharacteristicAbbr.intellect" },
  cunning: { label: "GENESYS.Characteristic.cunning", abbr: "GENESYS.CharacteristicAbbr.cunning" },
  willpower: { label: "GENESYS.Characteristic.willpower", abbr: "GENESYS.CharacteristicAbbr.willpower" },
  presence: { label: "GENESYS.Characteristic.presence", abbr: "GENESYS.CharacteristicAbbr.presence" }
};

/** Категории навыков. */
GENESYS.skillCategories = {
  general: "GENESYS.SkillCategory.general",
  combat: "GENESYS.SkillCategory.combat",
  social: "GENESYS.SkillCategory.social",
  knowledge: "GENESYS.SkillCategory.knowledge",
  magic: "GENESYS.SkillCategory.magic"
};

/**
 * Базовый список навыков. Используется для автодобавления навыков новому персонажу.
 * key — стабильный идентификатор (не зависит от языка), по нему ищутся навыки
 * для инициативы, оружия и т.п. Список правится после загрузки книг правил.
 * settings — в каких сеттингах навык используется (по таблице навыков Core Rulebook).
 */
GENESYS.defaultSkills = [
  // Общие
  { key: "alchemy", characteristic: "intellect", category: "general", settings: ["fantasy", "steampunk", "weirdwar"] },
  { key: "astrocartography", characteristic: "intellect", category: "general", settings: ["spaceopera"] },
  { key: "athletics", characteristic: "brawn", category: "general", settings: ["all"] },
  { key: "computers", characteristic: "intellect", category: "general", settings: ["modern", "scifi", "spaceopera"] },
  { key: "cool", characteristic: "presence", category: "general", settings: ["all"] },
  { key: "coordination", characteristic: "agility", category: "general", settings: ["all"] },
  { key: "discipline", characteristic: "willpower", category: "general", settings: ["all"] },
  { key: "driving", characteristic: "agility", category: "general", settings: ["steampunk", "weirdwar", "modern", "scifi", "spaceopera"] },
  { key: "mechanics", characteristic: "intellect", category: "general", settings: ["all"] },
  { key: "medicine", characteristic: "intellect", category: "general", settings: ["all"] },
  { key: "operating", characteristic: "intellect", category: "general", settings: ["all"] },
  { key: "perception", characteristic: "cunning", category: "general", settings: ["all"] },
  { key: "piloting", characteristic: "agility", category: "general", settings: ["weirdwar", "modern", "scifi", "spaceopera"] },
  { key: "resilience", characteristic: "brawn", category: "general", settings: ["all"] },
  { key: "riding", characteristic: "agility", category: "general", settings: ["fantasy", "steampunk"] },
  { key: "skulduggery", characteristic: "cunning", category: "general", settings: ["all"] },
  { key: "stealth", characteristic: "agility", category: "general", settings: ["all"] },
  { key: "streetwise", characteristic: "cunning", category: "general", settings: ["all"] },
  { key: "survival", characteristic: "cunning", category: "general", settings: ["all"] },
  { key: "vigilance", characteristic: "willpower", category: "general", settings: ["all"] },
  // Магические
  { key: "arcana", characteristic: "intellect", category: "magic", settings: ["fantasy"] },
  { key: "divine", characteristic: "willpower", category: "magic", settings: ["fantasy"] },
  { key: "primal", characteristic: "cunning", category: "magic", settings: ["fantasy"] },
  // Боевые
  { key: "brawl", characteristic: "brawn", category: "combat", settings: ["all"] },
  { key: "gunnery", characteristic: "agility", category: "combat", settings: ["steampunk", "weirdwar", "modern", "scifi", "spaceopera"] },
  { key: "melee", characteristic: "brawn", category: "combat", settings: ["steampunk", "weirdwar", "modern", "scifi", "spaceopera"] },
  { key: "meleeLight", characteristic: "brawn", category: "combat", settings: ["fantasy"] },
  { key: "meleeHeavy", characteristic: "brawn", category: "combat", settings: ["fantasy"] },
  { key: "rangedLight", characteristic: "agility", category: "combat", settings: ["steampunk", "weirdwar", "modern", "scifi", "spaceopera"] },
  { key: "rangedHeavy", characteristic: "agility", category: "combat", settings: ["steampunk", "weirdwar", "modern", "scifi", "spaceopera"] },
  { key: "ranged", characteristic: "agility", category: "combat", settings: ["fantasy"] },
  // Социальные
  { key: "charm", characteristic: "presence", category: "social", settings: ["all"] },
  { key: "coercion", characteristic: "willpower", category: "social", settings: ["all"] },
  { key: "deception", characteristic: "cunning", category: "social", settings: ["all"] },
  { key: "leadership", characteristic: "presence", category: "social", settings: ["all"] },
  { key: "negotiation", characteristic: "presence", category: "social", settings: ["all"] },
  // Знания
  { key: "knowledge", characteristic: "intellect", category: "knowledge", settings: ["all"] }
];

/** Пресеты набора навыков для новых персонажей (настройка мира). */
GENESYS.skillPresets = {
  all: "GENESYS.Settings.SkillPreset.all",
  fantasy: "GENESYS.Settings.SkillPreset.fantasy",
  steampunk: "GENESYS.Settings.SkillPreset.steampunk",
  weirdwar: "GENESYS.Settings.SkillPreset.weirdwar",
  modern: "GENESYS.Settings.SkillPreset.modern",
  scifi: "GENESYS.Settings.SkillPreset.scifi",
  spaceopera: "GENESYS.Settings.SkillPreset.spaceopera",
  terrinoth: "GENESYS.Settings.SkillPreset.terrinoth",
  none: "GENESYS.Settings.SkillPreset.none"
};

/** Сложности проверок: количество кубиков сложности. */
GENESYS.difficulties = {
  0: "GENESYS.Difficulty.simple",
  1: "GENESYS.Difficulty.easy",
  2: "GENESYS.Difficulty.average",
  3: "GENESYS.Difficulty.hard",
  4: "GENESYS.Difficulty.daunting",
  5: "GENESYS.Difficulty.formidable"
};

/** Дистанции (range bands). difficulty — стандартная сложность дальнобойной атаки. */
GENESYS.ranges = {
  engaged: { label: "GENESYS.Range.engaged", difficulty: 1 },
  short: { label: "GENESYS.Range.short", difficulty: 1 },
  medium: { label: "GENESYS.Range.medium", difficulty: 2 },
  long: { label: "GENESYS.Range.long", difficulty: 3 },
  extreme: { label: "GENESYS.Range.extreme", difficulty: 4 },
  strategic: { label: "GENESYS.Range.strategic", difficulty: 4 }
};

/** Типы активации талантов. */
GENESYS.activations = {
  passive: "GENESYS.Activation.passive",
  incidental: "GENESYS.Activation.incidental",
  incidentalOOT: "GENESYS.Activation.incidentalOOT",
  maneuver: "GENESYS.Activation.maneuver",
  action: "GENESYS.Activation.action"
};

/** Типы противников. */
GENESYS.adversaryTypes = {
  minion: "GENESYS.AdversaryType.minion",
  rival: "GENESYS.AdversaryType.rival",
  nemesis: "GENESYS.AdversaryType.nemesis"
};

/** Мотивации персонажа. */
GENESYS.motivations = {
  strength: "GENESYS.Motivation.strength",
  flaw: "GENESYS.Motivation.flaw",
  desire: "GENESYS.Motivation.desire",
  fear: "GENESYS.Motivation.fear"
};

/** Шесть типов кубиков. Порядок важен для отображения пула. */
GENESYS.dice = {
  proficiency: { label: "GENESYS.Dice.proficiency", denomination: "p", positive: true },
  ability: { label: "GENESYS.Dice.ability", denomination: "a", positive: true },
  boost: { label: "GENESYS.Dice.boost", denomination: "b", positive: true },
  challenge: { label: "GENESYS.Dice.challenge", denomination: "h", positive: false },
  difficulty: { label: "GENESYS.Dice.difficulty", denomination: "i", positive: false },
  setback: { label: "GENESYS.Dice.setback", denomination: "s", positive: false }
};

/** Символы результатов. */
GENESYS.symbols = {
  success: "GENESYS.Symbol.success",
  advantage: "GENESYS.Symbol.advantage",
  triumph: "GENESYS.Symbol.triumph",
  failure: "GENESYS.Symbol.failure",
  threat: "GENESYS.Symbol.threat",
  despair: "GENESYS.Symbol.despair"
};

/** Стоимость опыта (правила создания и развития персонажа). */
GENESYS.xp = {
  /** Повышение характеристики при создании: 10 × новое значение. */
  characteristic: (newValue) => 10 * newValue,
  /** Ранг навыка: 5 × новый ранг, +5 если навык не карьерный. */
  skill: (newRank, career) => 5 * newRank + (career ? 0 : 5),
  /** Талант: 5 × уровень (tier). */
  talent: (tier) => 5 * tier,
  /** Максимум характеристики при создании / вообще. */
  maxCharacteristicCreation: 5,
  maxCharacteristic: 6,
  /** Максимальный ранг навыка при создании / вообще. */
  maxSkillCreation: 2,
  maxSkill: 5
};

/**
 * Встречные проверки: навык → навык цели, который задаёт сложность
 * (кости способности цели → кости сложности, мастерства → вызова).
 */
GENESYS.opposed = {
  charm: "cool",
  deception: "vigilance",
  coercion: "discipline",
  leadership: "discipline",
  negotiation: "negotiation",
  stealth: "perception",
  skulduggery: "perception"
};

/**
 * Пороги диапазонов дистанции в единицах сетки сцены (по умолчанию метры).
 * Расстояние больше «длинной» — экстремальная. Настраивается в параметрах мира.
 */
GENESYS.rangeThresholds = { engaged: 2, short: 15, medium: 50, long: 200 };

/** Состояния персонажей (значки на токене). */
GENESYS.statusEffects = [
  { id: "incapacitated", name: "GENESYS.Status.incapacitated", img: "icons/svg/unconscious.svg" },
  { id: "dead", name: "GENESYS.Status.dead", img: "icons/svg/skull.svg" },
  { id: "disoriented", name: "GENESYS.Status.disoriented", img: "icons/svg/daze.svg" },
  { id: "staggered", name: "GENESYS.Status.staggered", img: "icons/svg/stoned.svg" },
  { id: "immobilized", name: "GENESYS.Status.immobilized", img: "icons/svg/net.svg" },
  { id: "prone", name: "GENESYS.Status.prone", img: "icons/svg/falling.svg" },
  { id: "burning", name: "GENESYS.Status.burning", img: "icons/svg/fire.svg" },
  { id: "bleeding", name: "GENESYS.Status.bleeding", img: "icons/svg/blood.svg" },
  { id: "poisoned", name: "GENESYS.Status.poisoned", img: "icons/svg/poison.svg" },
  { id: "frightened", name: "GENESYS.Status.frightened", img: "icons/svg/terror.svg" },
  { id: "blind", name: "GENESYS.Status.blind", img: "icons/svg/blind.svg" },
  { id: "concentrating", name: "GENESYS.Status.concentrating", img: "icons/svg/aura.svg" },
  { id: "invisible", name: "GENESYS.Status.invisible", img: "icons/svg/invisible.svg" }
];

/**
 * Активируемые свойства оружия: стоимость (преимуществ) и что делает автоматика.
 * status — какое состояние повесить на цель; strain — урон усталостью (рейтинг).
 */
GENESYS.activeQualities = {
  "Автоматическое": { cost: 2, note: "GENESYS.Quality.AutoFire" },
  "Взрыв": { cost: 2, note: "GENESYS.Quality.Blast" },
  "Дезориентация": { cost: 2, status: "disoriented" },
  "Жжение": { cost: 2, status: "burning" },
  "Залповое": { cost: 2, note: "GENESYS.Quality.Linked" },
  "Наведение": { cost: 2, note: "GENESYS.Quality.Guided" },
  "Нокдаун": { cost: 2, status: "prone" },
  "Оглушение": { cost: 2, strain: true },
  "Ошеломление": { cost: 2, status: "staggered" },
  "Повреждение": { cost: 1, note: "GENESYS.Quality.Sunder" },
  "Сковывание": { cost: 2, status: "immobilized" }
};

/**
 * Числовые эффекты талантов (по английскому названию из флага nameEn).
 * Значения умножаются на ранг таланта.
 */
GENESYS.talentEffects = {
  "Toughened": { wounds: 2 },
  "Grit": { strain: 1 },
  "Durable": { critical: -10 },
  "Defensive": { meleeDefense: 1, rangedDefense: 1 },
  "Enduring": { soak: 1 }
};

/** Магические навыки и связанные с ними характеристики (урон Атаки). */
GENESYS.magicSkills = {
  arcana: "intellect",
  divine: "willpower",
  primal: "cunning",
  runes: "intellect",
  verse: "presence",
  psychic: "presence"
};

/**
 * Наборы навыков, заданные явным списком (вместо тегов settings).
 * Realms of Terrinoth: четыре навыка Знания заменяют общее Знание, добавлены Руны и Стихосложение.
 */
GENESYS.presetSkills = {
  terrinoth: ["alchemy", "arcana", "athletics", "brawl", "charm", "coercion", "cool", "coordination", "deception",
    "discipline", "divine", "knowledgeAdventuring", "knowledgeForbidden", "knowledgeGeography", "knowledgeLore",
    "leadership", "mechanics", "medicine", "meleeHeavy", "meleeLight", "negotiation", "perception", "primal",
    "ranged", "resilience", "riding", "runes", "skulduggery", "stealth", "streetwise", "survival", "verse", "vigilance"]
};

/** Навыки, которых нет в базовом списке (характеристика, категория) — для наборов вроде Терринота. */
GENESYS.extraSkills = {
  knowledgeAdventuring: { characteristic: "intellect", category: "knowledge" },
  knowledgeForbidden: { characteristic: "intellect", category: "knowledge" },
  knowledgeGeography: { characteristic: "intellect", category: "knowledge" },
  knowledgeLore: { characteristic: "intellect", category: "knowledge" },
  runes: { characteristic: "intellect", category: "magic" },
  verse: { characteristic: "presence", category: "magic" },
  psychic: { characteristic: "presence", category: "magic" }
};

/** Источники (книги) по началу строки source. */
GENESYS.sources = {
  core: { label: "Core Rulebook", match: "Core Rulebook" },
  epg: { label: "Expanded Player's Guide", match: "Expanded Player's Guide" },
  rot: { label: "Realms of Terrinoth", match: "Realms of Terrinoth" },
  zgm: { label: "Zynnythryx's Guide to Magic", match: "Zynnythryx" }
};

/** Папки компендиумов, привязанные к игровым мирам (остальные папки — общие). */
GENESYS.settingFolders = ["Фэнтези", "Стимпанк", "Моровая война", "Современность", "Научная фантастика", "Космоопера",
  "Эпоха мифов", "Мир чудовищ", "Постапокалипсис", "Терринот"];

/** Какие папки миров подходят выбранному набору (по началу имени папки). */
GENESYS.settingContent = {
  all: null,
  fantasy: ["Фэнтези", "Эпоха мифов"],
  steampunk: ["Стимпанк"],
  weirdwar: ["Моровая война", "Стимпанк"],
  modern: ["Современность", "Мир чудовищ"],
  scifi: ["Научная фантастика", "Постапокалипсис"],
  spaceopera: ["Космоопера", "Научная фантастика"],
  terrinoth: ["Терринот", "Фэнтези"]
};

/** Таланты Core, разрешённые в Терриноте (Таблица 2–4 Realms of Terrinoth). */
GENESYS.terrinothCoreTalents = ["Животное-спутник", "Берсерк", "Покупка информации", "Может, обсудим это?", "Остроумный ответ",
  "Скоординированная атака", "Встречное предложение", "Меткий глаз", "Повышение", "Оборона", "Оборонительная тактика",
  "Отчаянное восстановление", "Уклонение", "Обоерукий", "Дуэлянт", "Крепость", "Орлиный глаз", "Выносливость",
  "Полевой командир", "Полевой командир (улучшенный)", "Добытчик", "Упорство", "Обездвиживающий выстрел",
  "Повышенное внимание", "Героическая воля", "Воодушевляющая речь", "Воодушевляющая речь (улучшенный)",
  "Воодушевляющая речь (мастерский)", "Изобретатель", "Подскок", "Квалификация", "Торговые связи", "Поехали",
  "Счастливое попадание", "Мастер", "Одарённость", "Единение с природой", "Знаток болеутоляющих", "Парирование",
  "Парирование (улучшенный)", "Пристойное поведение", "Выхватывание", "Быстрый удар", "Быстрая стрельба из лука"];
