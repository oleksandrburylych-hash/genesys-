import { GENESYS } from "../config.mjs";
import { intField, choiceField, qualitiesField, physicalFields, formatQualities } from "./fields.mjs";

const { StringField, BooleanField, SchemaField, ArrayField, HTMLField } = foundry.data.fields;

/** Базовый класс для всех предметов: есть описание и источник (книга, страница). */
class BaseItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField(),
      source: new StringField({ required: true, blank: true, initial: "" })
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
      startingSkills: new StringField({ required: true, blank: true, initial: "" })
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
export class WeaponData extends BaseItemData {
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
      qualities: qualitiesField()
    };
  }

  get qualitiesText() { return formatQualities(this.qualities); }

  /** Итоговый базовый урон с учётом Силы владельца. */
  get totalDamage() {
    const actor = this.parent?.actor;
    const brawn = this.brawnDamage ? (actor?.system.characteristics?.brawn?.value ?? 0) : 0;
    return this.damage + brawn;
  }

  get damageLabel() {
    return this.brawnDamage ? `+${this.damage}` : `${this.damage}`;
  }

  get isMelee() { return this.range === "engaged"; }
}

/** Броня. */
export class ArmorData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ...physicalFields(),
      defense: intField(0),
      soak: intField(0),
      hardPoints: intField(0),
      qualities: qualitiesField()
    };
  }

  get qualitiesText() { return formatQualities(this.qualities); }
}

/** Снаряжение. */
export class GearData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ...physicalFields()
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
      rollRange: new StringField({ required: true, blank: true, initial: "" })
    };
  }
}

export const ITEM_MODELS = {
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
