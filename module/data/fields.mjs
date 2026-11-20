import { GENESYS } from "../config.mjs";

const { NumberField, StringField, SchemaField, ArrayField } = foundry.data.fields;

/** Целое неотрицательное число. */
export function intField(initial = 0, { min = 0, max, label } = {}) {
  return new NumberField({ required: true, nullable: false, integer: true, initial, min, max, label });
}

/** Целое число, которое может быть отрицательным (бонусы/штрафы). */
export function bonusField(label) {
  return new NumberField({ required: true, nullable: false, integer: true, initial: 0, label });
}

/** Блок шести характеристик. */
export function characteristicsField(initial = 1, { min = 1, max = 6 } = {}) {
  const schema = {};
  for (const key of Object.keys(GENESYS.characteristics)) {
    schema[key] = new SchemaField({ value: intField(initial, { min, max, label: GENESYS.characteristics[key].label }) });
  }
  return new SchemaField(schema);
}

/** Строковое поле с выбором из справочника. */
export function choiceField(choices, initial, label) {
  return new StringField({ required: true, blank: false, initial, choices, label });
}

/** Качества предмета (Accurate 1, Pierce 2 и т.п.). */
export function qualitiesField() {
  return new ArrayField(new SchemaField({
    name: new StringField({ required: true, blank: true, initial: "" }),
    rating: new NumberField({ required: false, nullable: true, integer: true, initial: null, min: 0 })
  }));
}

/** Общие поля физического предмета. */
export function physicalFields() {
  return {
    quantity: intField(1),
    encumbrance: intField(0),
    price: intField(0),
    rarity: intField(0, { max: 10 }),
    equipped: new foundry.data.fields.BooleanField({ initial: false }),
    carried: new foundry.data.fields.BooleanField({ initial: true })
  };
}

/** Форматирует список качеств в строку «Точное 1, Пробивание 2». */
export function formatQualities(qualities = []) {
  return qualities
    .filter(q => q.name)
    .map(q => (q.rating ? `${q.name} ${q.rating}` : q.name))
    .join(", ");
}

/** Теги игровых миров (см. module/worlds.mjs); пустой список — любой мир. */
export function worldsField() {
  return new ArrayField(new StringField({ required: true, blank: false }), { required: true, initial: [] });
}
