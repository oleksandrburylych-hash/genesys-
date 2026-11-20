import { intField, worldsField } from "./fields.mjs";

const { NumberField, StringField, SchemaField, HTMLField } = foundry.data.fields;

/**
 * Транспорт: машины, корабли, дирижабли, мехи.
 * Значения вводятся из профиля транспорта в книге.
 */
export default class VehicleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const arc = () => intField(0, { max: 4 });
    return {
      silhouette: intField(2, { max: 10 }),
      speed: new SchemaField({ value: intField(0, { max: 6 }), max: intField(3, { max: 6 }) }),
      handling: new NumberField({ required: true, nullable: false, integer: true, initial: 0, min: -5, max: 5 }),
      defense: new SchemaField({ fore: arc(), aft: arc(), port: arc(), starboard: arc() }),
      armor: intField(0),
      hullTrauma: new SchemaField({ value: intField(0), max: intField(10) }),
      systemStrain: new SchemaField({ value: intField(0), max: intField(10) }),
      /** Навык управления: driving | piloting | operating. */
      skill: new StringField({ required: true, blank: false, initial: "driving", choices: ["driving", "piloting", "operating", "riding"] }),
      crew: new StringField({ required: true, blank: true, initial: "" }),
      passengers: intField(0),
      encumbrance: intField(0),
      price: intField(0),
      rarity: intField(0, { max: 10 }),
      hardPoints: intField(0),
      description: new HTMLField(),
      notes: new HTMLField(),
      source: new StringField({ required: true, blank: true, initial: "" }),
      worlds: worldsField()
    };
  }

  /** @override */
  prepareDerivedData() {
    this.hullTrauma.critical = this.hullTrauma.value > this.hullTrauma.max;
    this.systemStrain.critical = this.systemStrain.value > this.systemStrain.max;
  }
}
