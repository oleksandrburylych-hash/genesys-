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
 * settings — в каких сеттингах навык обычно используется (для пресетов).
 */
GENESYS.defaultSkills = [
  // Общие
  { key: "alchemy", characteristic: "intellect", category: "general", settings: ["fantasy"] },
  { key: "astrocartography", characteristic: "intellect", category: "general", settings: ["scifi"] },
  { key: "athletics", characteristic: "brawn", category: "general", settings: ["all"] },
  { key: "computers", characteristic: "intellect", category: "general", settings: ["modern", "scifi"] },
  { key: "cool", characteristic: "presence", category: "general", settings: ["all"] },
  { key: "coordination", characteristic: "agility", category: "general", settings: ["all"] },
  { key: "discipline", characteristic: "willpower", category: "general", settings: ["all"] },
  { key: "driving", characteristic: "agility", category: "general", settings: ["modern", "scifi"] },
  { key: "mechanics", characteristic: "intellect", category: "general", settings: ["all"] },
  { key: "medicine", characteristic: "intellect", category: "general", settings: ["all"] },
  { key: "operating", characteristic: "intellect", category: "general", settings: ["modern", "scifi"] },
  { key: "perception", characteristic: "cunning", category: "general", settings: ["all"] },
  { key: "piloting", characteristic: "agility", category: "general", settings: ["modern", "scifi"] },
  { key: "resilience", characteristic: "brawn", category: "general", settings: ["all"] },
  { key: "riding", characteristic: "agility", category: "general", settings: ["fantasy"] },
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
  { key: "gunnery", characteristic: "agility", category: "combat", settings: ["modern", "scifi"] },
  { key: "melee", characteristic: "brawn", category: "combat", settings: ["modern", "scifi"] },
  { key: "meleeLight", characteristic: "brawn", category: "combat", settings: ["fantasy"] },
  { key: "meleeHeavy", characteristic: "brawn", category: "combat", settings: ["fantasy"] },
  { key: "rangedLight", characteristic: "agility", category: "combat", settings: ["modern", "scifi"] },
  { key: "rangedHeavy", characteristic: "agility", category: "combat", settings: ["modern", "scifi"] },
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
  modern: "GENESYS.Settings.SkillPreset.modern",
  scifi: "GENESYS.Settings.SkillPreset.scifi",
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
  extreme: { label: "GENESYS.Range.extreme", difficulty: 4 }
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
