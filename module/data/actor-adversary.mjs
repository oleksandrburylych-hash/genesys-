import { GENESYS } from "../config.mjs";
import { intField, characteristicsField, choiceField, worldsField } from "./fields.mjs";

const { SchemaField, HTMLField } = foundry.data.fields;

/**
 * Противник: прислужник (minion), соперник (rival) или заклятый враг (nemesis).
 * Значения вводятся напрямую из блока характеристик в книге.
 */
export default class AdversaryData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      adversaryType: choiceField(Object.keys(GENESYS.adversaryTypes), "rival", "GENESYS.AdversaryType.label"),
      characteristics: characteristicsField(2),
      wounds: new SchemaField({ value: intField(0), max: intField(10) }),
      strain: new SchemaField({ value: intField(0), max: intField(0) }),
      soak: new SchemaField({ value: intField(2) }),
      defense: new SchemaField({
        melee: new SchemaField({ value: intField(0) }),
        ranged: new SchemaField({ value: intField(0) })
      }),
      /** Количество прислужников в группе. */
      groupSize: intField(3, { min: 1, max: 20 }),
      description: new HTMLField(),
      notes: new HTMLField(),
      source: new foundry.data.fields.StringField({ required: true, blank: true, initial: "" }),
      worlds: worldsField(),
      /** Тип существа (module/creatures.mjs) и теги добычи — для генераторов встреч и добычи. */
      creatureType: new foundry.data.fields.StringField({ required: true, blank: true, initial: "" }),
      /** Мотивации (для социальных сцен: их можно раскрыть). */
      motivations: new SchemaField(Object.fromEntries(["strength", "flaw", "desire", "fear"].map(k => [k, new SchemaField({
        name: new foundry.data.fields.StringField({ required: true, blank: true, initial: "" }),
        description: new foundry.data.fields.StringField({ required: true, blank: true, initial: "" })
      })]))),
      loot: new foundry.data.fields.ArrayField(new foundry.data.fields.StringField({ required: true, blank: false }), { required: true, initial: [] })
    };
  }

  get isMinion() { return this.adversaryType === "minion"; }
  get isNemesis() { return this.adversaryType === "nemesis"; }

  /** @override */
  prepareDerivedData() {
    if (this.isMinion) {
      // Общий порог ран группы и число живых прислужников.
      this.groupWounds = this.wounds.max * this.groupSize;
      const perMinion = Math.max(1, this.wounds.max);
      this.aliveMinions = Math.max(0, this.groupSize - Math.floor(this.wounds.value / perMinion));
    }
  }
}
