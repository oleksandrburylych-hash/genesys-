import { GENESYS } from "../config.mjs";
import { intField, choiceField, qualitiesField, physicalFields, formatQualities, worldsField } from "./fields.mjs";

const { StringField, BooleanField, SchemaField, ArrayField, HTMLField, NumberField } = foundry.data.fields;

/** Модификации, установленные в оружие/броню (копии предметов-модификаций). */
function installedField() {
  return new ArrayField(new SchemaField({
    name: new StringField({ required: true, blank: false, initial: "?" }),
    hardPoints: intField(0),
    damage: new NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
    crit: new NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
    soak: new NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
    defense: new NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
    encumbrance: new NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
    qualities: qualitiesField(),
    description: new StringField({ required: true, blank: true, initial: "" })
  }));
}

/** Сложить список качеств: одинаковые имена суммируют рейтинг. */
function mergeQualities(...lists) {
  const map = new Map();
  for (const q of lists.flat()) {
    if (!q?.name) continue;
    const prev = map.get(q.name);
    if (prev) prev.rating = (prev.rating ?? 0) + (q.rating ?? 0) || prev.rating;
    else map.set(q.name, { name: q.name, rating: q.rating ?? null });
  }
  return [...map.values()];
}

/** Общие расчёты для предметов с модификациями. */
const AttachableMixin = Base => class extends Base {
  get installedHardPoints() { return this.attachments.reduce((s, a) => s + a.hardPoints, 0); }
  get freeHardPoints() { return this.hardPoints - this.installedHardPoints; }
  get allQualities() { return mergeQualities(this.qualities, ...this.attachments.map(a => a.qualities)); }
  get qualitiesText() { return formatQualities(this.allQualities); }
  get totalEncumbrance() { return Math.max(0, this.encumbrance + this.attachments.reduce((s, a) => s + a.encumbrance, 0)); }
  /** Рейтинг качества по имени (с учётом модификаций), 0 — нет. */
  qualityRating(regex) {
    const q = this.allQualities.find(x => regex.test(x.name));
    return q ? (q.rating ?? 1) : 0;
  }
};

/** Базовый класс для всех предметов: есть описание и источник (книга, страница). */
class BaseItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField(),
      source: new StringField({ required: true, blank: true, initial: "" }),
      worlds: worldsField()
    };
  }
}

/** Навык. */
export class SkillData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      /** Стабильный идентификатор (vigilance, cool, melee…), не зависит от языка. */
      key: new StringField({ required: true, blank: true, initial: "" }),
      characteristic: choiceField(Object.keys(GENESYS.characteristics), "brawn"),
      category: choiceField(Object.keys(GENESYS.skillCategories), "general"),
      rank: intField(0, { max: 5 }),
      /** Карьерный навык (у прислужников — «групповой» навык). */
      career: new BooleanField({ initial: false })
    };
  }
}

/** Талант. */
export class TalentData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      tier: intField(1, { min: 1, max: 5 }),
      activation: choiceField(Object.keys(GENESYS.activations), "passive"),
      ranked: new BooleanField({ initial: false }),
      rank: intField(1, { min: 1 })
    };
  }

  /** Уровень, на котором будет следующий ранг (для ранжированных талантов). */
  get nextTier() {
    return Math.min(5, this.tier + (this.ranked ? this.rank : 0));
  }
}

/** Особая способность (архетипа, противника и т.п.). */
export class AbilityData extends BaseItemData {}

/** Архетип: стартовые характеристики, базы порогов, стартовый опыт. */
export class ArchetypeData extends BaseItemData {
  static defineSchema() {
    const chars = {};
    for (const key of Object.keys(GENESYS.characteristics)) chars[key] = intField(2, { min: 1, max: 5 });
    return {
      ...super.defineSchema(),
      characteristics: new SchemaField(chars),
      wounds: intField(10),
      strain: intField(10),
      startingXP: intField(100),
      /** Стартовые навыки в свободной форме (часто это выбор игрока). */
      startingSkills: new StringField({ required: true, blank: true, initial: "" }),
      /** Особые способности, которые получает персонаж с этим архетипом/расой. */
      abilities: new ArrayField(new SchemaField({
        name: new StringField({ required: true, blank: false, initial: "?" }),
        description: new HTMLField()
      }))
    };
  }
}

/** Карьера: список карьерных навыков. */
export class CareerData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      careerSkills: new ArrayField(new StringField({ required: true, blank: false }))
    };
  }
}

/** Оружие. */
export class WeaponData extends AttachableMixin(BaseItemData) {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ...physicalFields(),
      /** Имя или ключ навыка, которым атакуют. */
      skill: new StringField({ required: true, blank: true, initial: "" }),
      damage: intField(0),
      /** Урон прибавляется к Силе (холодное оружие, «+2»). */
      brawnDamage: new BooleanField({ initial: false }),
      crit: intField(3),
      range: choiceField(Object.keys(GENESYS.ranges), "engaged"),
      hardPoints: intField(0),
      qualities: qualitiesField(),
      /** Сектор обстрела (для оружия транспорта): «носовой», «все» и т.п. */
      firingArc: new StringField({ required: true, blank: true, initial: "" }),
      attachments: installedField()
    };
  }

  /** Итоговый базовый урон с учётом Силы владельца и модификаций. */
  get totalDamage() {
    const actor = this.parent?.actor;
    const brawn = this.brawnDamage ? (actor?.system.characteristics?.brawn?.value ?? 0) : 0;
    return this.damage + brawn + this.attachments.reduce((s, a) => s + a.damage, 0);
  }

  /** Критическое значение с модификациями (не меньше 1, если было задано). */
  get totalCrit() {
    if (!this.crit) return 0;
    return Math.max(1, this.crit + this.attachments.reduce((s, a) => s + a.crit, 0));
  }

  get damageLabel() {
    return this.brawnDamage ? `+${this.damage}` : `${this.damage}`;
  }

  get isMelee() { return this.range === "engaged"; }
}

/** Броня. */
export class ArmorData extends AttachableMixin(BaseItemData) {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ...physicalFields(),
      defense: intField(0),
      soak: intField(0),
      hardPoints: intField(0),
      qualities: qualitiesField(),
      attachments: installedField()
    };
  }

  get totalSoak() { return this.soak + this.attachments.reduce((s, a) => s + a.soak, 0); }
  get totalDefense() { return this.defense + this.attachments.reduce((s, a) => s + a.defense, 0); }
}

/** Снаряжение. */
export class GearData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ...physicalFields(),
      /** Магический фокус: бонус к урону заклинания Атака (0 — не фокус или без бонуса). */
      implementDamage: intField(0)
    };
  }
}

/** Качество предмета (для справочника/компендиума). */
export class QualityData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      /** Активируемое качество (требует преимуществ) или пассивное. */
      active: new BooleanField({ initial: false }),
      ranked: new BooleanField({ initial: false })
    };
  }
}

/** Критическое ранение. */
export class InjuryData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      /** Тяжесть = количество кубиков сложности на исцеление (1–4). */
      severity: intField(1, { min: 0, max: 5 }),
      /** Диапазон на d100, например «01–05». */
      rollRange: new StringField({ required: true, blank: true, initial: "" }),
      /** Постоянный штраф к проверкам, пока травма не вылечена (кости штрафа). */
      setback: intField(0, { max: 5 }),
      /** Характеристика, выпавшая на d10 («Ужасная/Чудовищная травма»). */
      characteristic: new StringField({ required: true, blank: true, initial: "" })
    };
  }
}

/** Ключи магических навыков. */
export const MAGIC_SKILLS = Object.keys(GENESYS.magicSkills);
const MAGIC_NAMES = { "Магия": "arcana", "Вера": "divine", "Природа": "primal", "Псионика": "psychic", "Psychic": "psychic", "Руны": "runes", "Runes": "runes", "Стихосложение": "verse", "Verse": "verse", "Arcana": "arcana", "Divine": "divine", "Primal": "primal",
  "Экстрасенсорика": "psiExtrasensory", "Extrasensory": "psiExtrasensory", "Разум над материей": "psiMind", "Mind Over Matter": "psiMind",
  "Проекция": "psiProjection", "Projection": "psiProjection" };

/**
 * Магическое действие или готовое заклинание.
 * Действие: базовая сложность + список дополнительных эффектов.
 * Готовое заклинание: то же самое плюс baseAction и выбранные эффекты (selected).
 */
export class SpellData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      /** Магические навыки, которыми можно наложить заклинание. */
      skills: new ArrayField(new StringField({ required: true, blank: false, choices: MAGIC_SKILLS })),
      difficulty: intField(1, { max: 5 }),
      concentration: new BooleanField({ initial: false }),
      /** Заклинание-атака: урон = связанная характеристика + успехи. */
      attack: new BooleanField({ initial: false }),
      effects: new ArrayField(new SchemaField({
        name: new StringField({ required: true, blank: false, initial: "?" }),
        difficulty: new NumberField({ required: true, nullable: false, integer: true, initial: 1, min: -5, max: 5 }),
        /** Ограничение по навыкам (пусто — любой). */
        skills: new ArrayField(new StringField({ required: true, blank: false, choices: MAGIC_SKILLS })),
        repeatable: new BooleanField({ initial: false }),
        description: new StringField({ required: true, blank: true, initial: "" })
      })),
      /** Для готового заклинания: базовое действие и выбранные эффекты (имена, повторы допустимы). */
      baseAction: new StringField({ required: true, blank: true, initial: "" }),
      selected: new ArrayField(new StringField({ required: true, blank: false }))
    };
  }

  /** @override — старый формат: навыки строкой «Вера, Магия». */
  static migrateData(source) {
    if (typeof source.skills === "string") {
      source.skills = source.skills.split(/[,;]/).map(s => MAGIC_NAMES[s.trim()]).filter(Boolean);
    }
    return super.migrateData(source);
  }

  get isPreset() { return !!this.baseAction || this.selected.length > 0; }

  /** Базовая сложность действия (для готового заклинания — без выбранных эффектов). */
  get baseDifficulty() {
    if (!this.isPreset) return this.difficulty;
    const extra = this.selected.reduce((sum, n) => sum + (this.effects.find(e => e.name === n)?.difficulty ?? 0), 0);
    return Math.max(0, this.difficulty - extra);
  }
}

/**
 * Героическая способность (Realms of Terrinoth).
 * Активация — 2 очка сюжета (1 с улучшением «Сюжет»), раз за сессию (+ улучшения «Частота»).
 * Улучшения покупаются очками способностей: 1 очко за каждые 50 полученных опыта (без стартового).
 */
export class HeroicData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      activation: choiceField(Object.keys(GENESYS.activations), "incidental"),
      cost: new StringField({ required: true, blank: true, initial: "" }),
      /** Сколько раз использована в текущей сессии. */
      uses: intField(0),
      upgrades: new ArrayField(new SchemaField({
        name: new StringField({ required: true, blank: false, initial: "?" }),
        /** Стоимость в очках способностей. */
        cost: intField(1),
        /** Сколько раз можно купить (0 — без ограничений). */
        max: intField(1),
        /** Сколько раз куплено. */
        count: intField(0),
        description: new StringField({ required: true, blank: true, initial: "" })
      }))
    };
  }

  /** @override — старые данные: xp → cost, purchased → count. */
  static migrateData(source) {
    for (const u of source.upgrades ?? []) {
      if (u.xp !== undefined && u.cost === undefined) u.cost = u.xp;
      if (u.purchased !== undefined && u.count === undefined) u.count = u.purchased ? 1 : 0;
    }
    return super.migrateData(source);
  }

  get spentPoints() { return this.upgrades.reduce((s, u) => s + u.cost * u.count, 0); }
  /** Стоимость активации в очках сюжета. */
  get storyCost() { return this.upgrades.some(u => /сюжет|story/i.test(u.name) && u.count > 0) ? 1 : 2; }
  /** Сколько раз за сессию можно активировать. */
  get usesPerSession() { return 1 + this.upgrades.filter(u => /частота|frequency/i.test(u.name)).reduce((s, u) => s + u.count, 0); }
}

/** Модификация / зачарование / мастерская работа для оружия и брони. */
export class AttachmentData extends BaseItemData {
  static defineSchema() {
    const mod = () => new NumberField({ required: true, nullable: false, integer: true, initial: 0 });
    return {
      ...super.defineSchema(),
      appliesTo: choiceField(["weapon", "armor", "any"], "any"),
      hardPoints: intField(1),
      price: intField(0),
      /** Модификатор редкости (может быть отрицательным) или итоговая редкость. */
      rarity: new NumberField({ required: true, nullable: false, integer: true, initial: 0, min: -10, max: 10 }),
      damage: mod(), crit: mod(), soak: mod(), defense: mod(), encumbrance: mod(),
      qualities: qualitiesField(),
      modifications: new HTMLField()
    };
  }

  /** Данные для установки в предмет. */
  toInstalled(name) {
    const plain = html => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return {
      name, hardPoints: this.hardPoints,
      damage: this.damage, crit: this.crit, soak: this.soak, defense: this.defense, encumbrance: this.encumbrance,
      qualities: foundry.utils.deepClone(this.qualities),
      description: plain(this.description).slice(0, 500)
    };
  }
}

export const ITEM_MODELS = {
  heroic: HeroicData,
  attachment: AttachmentData,
  spell: SpellData,
  skill: SkillData,
  talent: TalentData,
  ability: AbilityData,
  archetype: ArchetypeData,
  career: CareerData,
  weapon: WeaponData,
  armor: ArmorData,
  gear: GearData,
  quality: QualityData,
  injury: InjuryData
};
