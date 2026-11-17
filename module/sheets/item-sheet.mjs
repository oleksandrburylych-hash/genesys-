import { GENESYS, TEMPLATES } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
const T = `${TEMPLATES}/item`;

/**
 * Универсальный лист предмета. Блок характеристик подставляется по типу:
 * templates/item/details-<type>.hbs
 */
export class GenesysItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["genesys", "sheet", "item"],
    position: { width: 560, height: 640 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      addQuality: GenesysItemSheet.#onAddQuality,
      removeQuality: GenesysItemSheet.#onRemoveQuality,
      addRow: GenesysItemSheet.#onAddRow,
      removeRow: GenesysItemSheet.#onRemoveRow,
      castSpell: GenesysItemSheet.#onCastSpell
    }
  };

  static PARTS = {
    header: { template: `${T}/header.hbs` },
    details: { template: `${T}/details-gear.hbs` },
    description: { template: `${T}/description.hbs`, scrollable: [""] }
  };

  /** Список типов, у которых есть свой шаблон. */
  static DETAIL_TYPES = ["skill", "talent", "ability", "archetype", "career", "weapon", "armor", "gear", "quality", "injury", "spell"];

  /** @override */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    const type = this.item.type;
    if (GenesysItemSheet.DETAIL_TYPES.includes(type)) parts.details.template = `${T}/details-${type}.hbs`;
    return parts;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.item;
    const system = item.system;
    const choices = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === "string" ? v : v.label]));

    // Подсказки для поля «навык» у оружия: навыки владельца или базовые боевые.
    let skillOptions;
    if (item.actor) skillOptions = item.actor.itemTypes.skill.filter(s => s.system.category === "combat").map(s => s.name);
    else skillOptions = GENESYS.defaultSkills.filter(s => s.category === "combat").map(s => game.i18n.localize(`GENESYS.Skill.${s.key}`));

    Object.assign(context, {
      item,
      system,
      source: system._source,
      systemFields: system.schema.fields,
      config: GENESYS,
      editable: this.isEditable,
      typeLabel: game.i18n.localize(`TYPES.Item.${item.type}`),
      choices: {
        characteristics: choices(GENESYS.characteristics),
        skillCategories: choices(GENESYS.skillCategories),
        activations: choices(GENESYS.activations),
        ranges: choices(GENESYS.ranges)
      },
      characteristicList: Object.entries(GENESYS.characteristics).map(([key, cfg]) => ({
        key, label: cfg.label, value: system.characteristics?.[key]
      })),
      careerSkillsText: (system.careerSkills ?? []).join(", "),
      magicSkills: ["arcana", "divine", "primal", "psychic"].map(k => ({
        key: k, label: `GENESYS.Skill.${k}`, on: (system.skills ?? []).includes?.(k)
      })),
      spellEffects: (system.effects ?? []).map((e, i) => ({
        ...e, index: i, only: e.skills?.[0] ?? ""
      })),
      skillChoices: { "": "—", arcana: "GENESYS.Skill.arcana", divine: "GENESYS.Skill.divine", primal: "GENESYS.Skill.primal", psychic: "GENESYS.Skill.psychic" },
      canCast: item.type === "spell" && !!(item.actor ?? game.user.character),
      skillOptions,
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(system.description ?? "", {
        relativeTo: item, secrets: item.isOwner
      })
    });
    return context;
  }

  /** @override */
  _prepareSubmitData(event, form, formData, updateData) {
    const obj = formData.object;
    // Заклинание: навыки — чекбоксы, ограничение эффекта — один навык из списка.
    if (this.item.type === "spell") {
      const keys = ["arcana", "divine", "primal", "psychic"];
      if (keys.some(k => `spellSkill.${k}` in obj)) {
        obj["system.skills"] = keys.filter(k => obj[`spellSkill.${k}`]);
        for (const k of keys) delete obj[`spellSkill.${k}`];
      }
      for (const key of Object.keys(obj)) {
        const m = key.match(/^effectSkill\.(\d+)$/);
        if (!m) continue;
        obj[`system.effects.${m[1]}.skills`] = obj[key] ? [obj[key]] : [];
        delete obj[key];
      }
    }
    if ("careerSkillsText" in obj) {
      obj["system.careerSkills"] = String(obj.careerSkillsText).split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
      delete obj.careerSkillsText;
    }
    return super._prepareSubmitData(event, form, formData, updateData);
  }

  /** Добавить строку в массив (эффекты заклинания, способности архетипа). */
  static #onAddRow(event, target) {
    const field = target.dataset.field;
    const rows = foundry.utils.deepClone(foundry.utils.getProperty(this.item, field) ?? []);
    rows.push(field === "system.effects"
      ? { name: game.i18n.localize("GENESYS.Spell.NewEffect"), difficulty: 1, skills: [], repeatable: false, description: "" }
      : { name: game.i18n.localize("GENESYS.NewAbility"), description: "" });
    return this.item.update({ [field]: rows });
  }

  static #onRemoveRow(event, target) {
    const field = target.dataset.field;
    const rows = foundry.utils.deepClone(foundry.utils.getProperty(this.item, field) ?? []);
    rows.splice(Number(target.dataset.index), 1);
    return this.item.update({ [field]: rows });
  }

  static #onCastSpell() {
    const actor = this.item.actor ?? game.user.character;
    return actor?.castSpell(this.item);
  }

  static #onAddQuality() {
    const qualities = foundry.utils.deepClone(this.item.system.qualities);
    qualities.push({ name: "", rating: null });
    return this.item.update({ "system.qualities": qualities });
  }

  static #onRemoveQuality(event, target) {
    const index = Number(target.dataset.index);
    const qualities = foundry.utils.deepClone(this.item.system.qualities);
    qualities.splice(index, 1);
    return this.item.update({ "system.qualities": qualities });
  }
}
