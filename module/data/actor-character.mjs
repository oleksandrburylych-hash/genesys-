import { GENESYS } from "../config.mjs";
import { intField, bonusField, characteristicsField } from "./fields.mjs";

const { StringField, BooleanField, SchemaField, ArrayField, HTMLField, NumberField } = foundry.data.fields;

/**
 * Данные персонажа игрока.
 * Хранимые значения: характеристики, базы порогов, бонусы, журнал опыта.
 * Вычисляемые: пороги ран/напряжения, поглощение, защита, нагрузка, остаток опыта.
 */
export default class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const motivation = () => new SchemaField({
      name: new StringField({ required: true, blank: true, initial: "" }),
      description: new StringField({ required: true, blank: true, initial: "" })
    });

    return {
      /** Тип приключения, по которому создан персонаж (ключ module/worlds.mjs → ADVENTURES или "custom:…"). */
      adventure: new StringField({ required: true, blank: true, initial: "" }),
      characteristics: characteristicsField(2),

      // creationChar — Сила/Воля, зафиксированные при завершении создания персонажа
      // (по правилам рост характеристики после создания не меняет порог). 0 — не зафиксировано.
      wounds: new SchemaField({
        value: intField(0),
        max: intField(0),
        base: intField(10),
        bonus: bonusField(),
        creationChar: intField(0)
      }),
      strain: new SchemaField({
        value: intField(0),
        max: intField(0),
        base: intField(10),
        bonus: bonusField(),
        creationChar: intField(0)
      }),
      soak: new SchemaField({ bonus: bonusField() }),
      defense: new SchemaField({
        melee: new SchemaField({ bonus: bonusField() }),
        ranged: new SchemaField({ bonus: bonusField() })
      }),
      encumbrance: new SchemaField({ bonus: bonusField() }),

      experience: new SchemaField({
        log: new ArrayField(new SchemaField({
          id: new StringField({ required: true, blank: false, initial: () => foundry.utils.randomID() }),
          type: new StringField({ required: true, initial: "earn", choices: ["earn", "spend"] }),
          /** Служебная пометка: "archetype" — стартовый опыт архетипа. */
          kind: new StringField({ required: true, blank: true, initial: "" }),
          amount: intField(0),
          label: new StringField({ required: true, blank: true, initial: "" }),
          timestamp: new NumberField({ required: true, nullable: false, initial: () => Date.now() })
        }))
      }),

      /** Режим создания персонажа: характеристики покупаются за опыт, ограничения рангов. */
      creation: new BooleanField({ initial: true }),
      /** Автоматически списывать опыт при повышении навыков/характеристик и покупке талантов. */
      autoXP: new BooleanField({ initial: true }),

      motivations: new SchemaField(
        Object.fromEntries(Object.keys(GENESYS.motivations).map(k => [k, motivation()]))
      ),
      details: new SchemaField({
        gender: new StringField({ required: true, blank: true, initial: "" }),
        age: new StringField({ required: true, blank: true, initial: "" }),
        height: new StringField({ required: true, blank: true, initial: "" }),
        build: new StringField({ required: true, blank: true, initial: "" }),
        hair: new StringField({ required: true, blank: true, initial: "" }),
        eyes: new StringField({ required: true, blank: true, initial: "" }),
        features: new StringField({ required: true, blank: true, initial: "" })
      }),
      money: intField(0),
      biography: new HTMLField(),
      notes: new HTMLField()
    };
  }

  /** @override */
  prepareDerivedData() {
    const actor = this.parent;
    const c = Object.fromEntries(Object.entries(this.characteristics).map(([k, v]) => [k, v.value]));

    // Броня: суммируем надетую.
    let armorSoak = 0, armorMelee = 0, armorRanged = 0, encumbrance = 0;
    for (const item of actor.items) {
      const s = item.system;
      if (item.type === "armor" && s.equipped) {
        armorSoak += s.totalSoak ?? s.soak;
        armorMelee += s.totalDefense ?? s.defense;
        armorRanged += s.totalDefense ?? s.defense;
      }
      // Нагрузка: учитываются носимые предметы. Надетая броня весит на 3 меньше.
      if (["weapon", "armor", "gear"].includes(item.type) && s.carried !== false) {
        const baseEnc = s.totalEncumbrance ?? s.encumbrance;
        let enc = baseEnc * (s.quantity ?? 1);
        if (item.type === "armor" && s.equipped) enc = Math.max(0, baseEnc - 3) * Math.max(1, s.quantity);
        encumbrance += enc;
      }
    }

    // Числовые эффекты талантов (Закалённый, Упорство, Оборона, Выносливость, Крепость…).
    const tb = { wounds: 0, strain: 0, soak: 0, meleeDefense: 0, rangedDefense: 0, critical: 0 };
    for (const t of actor.itemTypes?.talent ?? []) {
      const eff = CONFIG.GENESYS?.talentEffects?.[t.getFlag?.("genesys-rpg", "nameEn") || ""];
      if (!eff) continue;
      const rank = t.system.ranked ? Math.max(1, t.system.rank) : 1;
      for (const [k, v] of Object.entries(eff)) tb[k] = (tb[k] ?? 0) + v * rank;
    }
    this.talentBonuses = tb;
    this.criticalModifier = tb.critical;

    // Порог ран/усталости: при создании — от текущих Силы/Воли, после — от зафиксированных.
    const woundChar = (!this.creation && this.wounds.creationChar) ? this.wounds.creationChar : c.brawn;
    const strainChar = (!this.creation && this.strain.creationChar) ? this.strain.creationChar : c.willpower;
    this.wounds.max = this.wounds.base + woundChar + this.wounds.bonus + tb.wounds;
    this.strain.max = this.strain.base + strainChar + this.strain.bonus + tb.strain;
    this.soak.value = c.brawn + armorSoak + this.soak.bonus + tb.soak;
    this.defense.melee.value = armorMelee + this.defense.melee.bonus + tb.meleeDefense;
    this.defense.ranged.value = armorRanged + this.defense.ranged.bonus + tb.rangedDefense;
    this.encumbrance.value = encumbrance;
    this.encumbrance.threshold = 5 + c.brawn + this.encumbrance.bonus;
    this.encumbrance.over = encumbrance > this.encumbrance.threshold;
    this.encumbrance.excess = Math.max(0, encumbrance - this.encumbrance.threshold);

    // Состояния
    this.wounds.critical = this.wounds.value > this.wounds.max;
    this.strain.critical = this.strain.value > this.strain.max;

    // Опыт
    let total = 0, spent = 0;
    for (const e of this.experience.log) {
      if (e.type === "earn") total += e.amount;
      else spent += e.amount;
    }
    this.experience.total = total;
    this.experience.spent = spent;
    this.experience.available = total - spent;
    // Очки способностей для героических способностей: 1 за каждые 50 опыта, кроме стартового.
    const earnedInPlay = this.experience.log.filter(e => e.type === "earn" && e.kind !== "archetype").reduce((s, e) => s + e.amount, 0);
    const heroicSpent = (actor.itemTypes?.heroic ?? []).reduce((s, h) => s + h.system.spentPoints, 0);
    this.heroicPoints = { total: Math.floor(earnedInPlay / 50), spent: heroicSpent };
    this.heroicPoints.available = this.heroicPoints.total - heroicSpent;

    // Пирамида талантов: сколько «слотов» занято на каждом уровне.
    this.talentTiers = CharacterData.countTalentTiers(actor.items);
  }

  /**
   * Подсчитать таланты по уровням. Каждый ранг ранжированного таланта
   * занимает слот на уровень выше предыдущего (максимум 5).
   * @returns {Record<number, number>}
   */
  static countTalentTiers(items) {
    const tiers = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const item of items) {
      if (item.type !== "talent") continue;
      const ranks = item.system.ranked ? Math.max(1, item.system.rank) : 1;
      for (let r = 0; r < ranks; r++) {
        const tier = Math.min(5, item.system.tier + r);
        tiers[tier] += 1;
      }
    }
    return tiers;
  }

  /**
   * Можно ли взять ещё один талант уровня tier по правилу пирамиды:
   * на уровне ниже должно быть хотя бы на один талант больше, чем станет на уровне tier.
   */
  canAddTalentTier(tier) {
    if (tier <= 1) return true;
    const tiers = this.talentTiers ?? CharacterData.countTalentTiers(this.parent.items);
    return tiers[tier - 1] > tiers[tier];
  }
}
