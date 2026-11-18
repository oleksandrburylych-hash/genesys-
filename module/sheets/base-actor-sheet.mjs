import { GENESYS, SYSTEM_ID } from "../config.mjs";
import { WORLDS, getAdventure, fitsAdventure } from "../worlds.mjs";
import { worldLabels } from "../helpers/adventure.mjs";
import { DicePool } from "../dice/pool.mjs";
import { DicePoolDialog } from "../apps/dice-pool-dialog.mjs";

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const TextEditor = () => foundry.applications.ux.TextEditor.implementation;

/**
 * Общая основа листов персонажа и противника.
 */
export class GenesysBaseActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["genesys", "themed", "theme-light", "sheet", "actor"],
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      rollSkill: GenesysBaseActorSheet.#onRollSkill,
      rollCharacteristic: GenesysBaseActorSheet.#onRollCharacteristic,
      rollWeapon: GenesysBaseActorSheet.#onRollWeapon,
      rollPool: GenesysBaseActorSheet.#onRollPool,
      itemCreate: GenesysBaseActorSheet.#onItemCreate,
      itemEdit: GenesysBaseActorSheet.#onItemEdit,
      itemDelete: GenesysBaseActorSheet.#onItemDelete,
      itemToggle: GenesysBaseActorSheet.#onItemToggle,
      itemChat: GenesysBaseActorSheet.#onItemChat,
      itemQuantity: GenesysBaseActorSheet.#onItemQuantity,
      rollInjury: GenesysBaseActorSheet.#onRollInjury,
      toggleWorld: GenesysBaseActorSheet.#onToggleWorld,
      removeStatus: GenesysBaseActorSheet.#onRemoveStatus
    }
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const system = actor.system;
    if (!context.tabs && this.constructor.TABS?.primary) context.tabs = this._prepareTabs("primary");
    Object.assign(context, {
      actor,
      system,
      source: actor.system._source,
      systemFields: system.schema.fields,
      config: GENESYS,
      editable: this.isEditable,
      owner: actor.isOwner,
      characteristics: Object.entries(GENESYS.characteristics).map(([key, cfg]) => ({
        key,
        label: cfg.label,
        abbr: cfg.abbr,
        value: system.characteristics?.[key]?.value ?? 0
      })),
      skillGroups: this._prepareSkills(),
      weapons: actor.itemTypes.weapon.map(i => this._weaponContext(i)),
      armor: actor.itemTypes.armor,
      gear: actor.itemTypes.gear,
      talents: actor.itemTypes.talent,
      abilities: actor.itemTypes.ability,
      injuries: actor.itemTypes.injury,
      activeStatuses: GENESYS.statusEffects.filter(st => actor.statuses?.has(st.id)).map(st => {
        const effect = actor.effects.find(e => e.statuses?.has(st.id));
        const rounds = effect?.getFlag(SYSTEM_ID, "rounds") ?? 0;
        const name = game.i18n.localize(st.name);
        return { id: st.id, img: st.img, rounds, tooltip: rounds ? `${name} (${game.i18n.format("GENESYS.Conditions.RoundsLeft", { n: rounds })})` : `${name} — ${game.i18n.localize("GENESYS.Conditions.ClickRemove")}` };
      }),
      worldTags: system.worlds ? worldLabels(system.worlds) : [],
      worldChoices: system.worlds ? Object.entries(WORLDS).map(([key, w]) => ({ key, label: w.label, color: w.color, on: system.worlds.includes(key) })) : []
    });
    return context;
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.tab = context.tabs?.[partId];
    return context;
  }

  /** Обогатить HTML-поле (ссылки, секреты и т.п.). */
  async _enrich(html) {
    return TextEditor().enrichHTML(html ?? "", {
      secrets: this.actor.isOwner,
      relativeTo: this.actor,
      rollData: this.actor.getRollData()
    });
  }

  /** Навыки, сгруппированные по категориям, с предпросмотром пула. */
  _prepareSkills() {
    const actor = this.actor;
    const groups = Object.entries(GENESYS.skillCategories).map(([key, label]) => ({ key, label, skills: [] }));
    const byKey = Object.fromEntries(groups.map(g => [g.key, g]));
    const skills = [...actor.itemTypes.skill].sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
    for (const skill of skills) {
      const pool = actor.getSkillPool(skill, 0);
      (byKey[skill.system.category] ?? byKey.general).skills.push({
        id: skill.id,
        name: skill.name,
        rank: actor.skillRank(skill),
        career: skill.system.career,
        characteristic: skill.system.characteristic,
        charAbbr: GENESYS.characteristics[skill.system.characteristic]?.abbr,
        pool: pool.display,
        ranks: Array.from({ length: 5 }, (_, i) => i < skill.system.rank)
      });
    }
    return groups.filter(g => g.skills.length);
  }

  _weaponContext(item) {
    const s = item.system;
    const skill = this.actor.getSkill(s.skill);
    return {
      item,
      id: item.id,
      name: item.name,
      img: item.img,
      skillName: skill?.name ?? s.skill,
      damage: s.totalDamage,
      damageLabel: s.damageLabel,
      crit: s.crit,
      range: GENESYS.ranges[s.range]?.label,
      qualities: s.qualitiesText,
      equipped: s.equipped,
      pool: skill ? this.actor.getSkillPool(skill, 0).display : (this.actor.untrainedPool?.(s.skill, 0).display ?? [])
    };
  }

  /* -------------------------------------------- */
  /*  Перетаскивание                              */
  /* -------------------------------------------- */

  /** @override */
  async _onDropItem(event, item) {
    if (!this.actor.isOwner) return null;
    // Сортировка внутри листа — стандартное поведение.
    if (item.parent?.uuid === this.actor.uuid) return super._onDropItem(event, item);

    // Подсказка, если предмет из другого мира, чем приключение персонажа (не запрет — решает ведущий).
    const adventureKey = this.actor.system.adventure;
    if (adventureKey && !fitsAdventure(item, getAdventure(adventureKey))) {
      ui.notifications.info(game.i18n.format("GENESYS.Worlds.Foreign", {
        name: item.name, worlds: worldLabels(item.system.worlds).map(w => w.label).join(", "), adventure: getAdventure(adventureKey).label
      }));
    }

    switch (item.type) {
      case "archetype":
        if (this.actor.type === "character") return this.actor.applyArchetype(item);
        break;
      case "career":
        if (this.actor.type === "character") return this.actor.applyCareer(item);
        break;
      case "talent":
        return this.actor.addTalent(item);
      case "skill": {
        const existing = this.actor.getSkill(item.system.key || item.name);
        if (existing) {
          ui.notifications.warn(game.i18n.format("GENESYS.Warn.SkillOwned", { name: item.name }));
          return null;
        }
        break;
      }
    }
    return super._onDropItem(event, item);
  }

  /* -------------------------------------------- */
  /*  Действия                                    */
  /* -------------------------------------------- */

  _getItem(target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    return this.actor.items.get(id);
  }

  /** Снять состояние щелчком по значку. */
  static async #onRemoveStatus(event, target) {
    if (!this.isEditable) return;
    await this.actor.toggleStatusEffect(target.dataset.status, { active: false });
  }

  /** Включить/выключить тег мира (противник, транспорт). */
  static async #onToggleWorld(event, target) {
    const key = target.dataset.key;
    const worlds = new Set(this.actor.system.worlds ?? []);
    if (worlds.has(key)) worlds.delete(key); else worlds.add(key);
    await this.actor.update({ "system.worlds": Object.keys(WORLDS).filter(w => worlds.has(w)) });
  }

  static #onRollSkill(event, target) {
    const item = this._getItem(target);
    if (item) return this.actor.rollSkill(item, { skipDialog: event.shiftKey });
  }

  static #onRollCharacteristic(event, target) {
    return this.actor.rollCharacteristic(target.dataset.key);
  }

  static #onRollWeapon(event, target) {
    const item = this._getItem(target);
    if (item) return this.actor.rollWeapon(item);
  }

  static #onRollPool() {
    return DicePoolDialog.prompt({ pool: new DicePool({ difficulty: 2 }), actor: this.actor });
  }

  static async #onItemCreate(event, target) {
    const type = target.dataset.type;
    const name = game.i18n.format("GENESYS.NewItem", { type: game.i18n.localize(`TYPES.Item.${type}`) });
    const system = {};
    if (target.dataset.category) system.category = target.dataset.category;
    if (target.dataset.tier) system.tier = Number(target.dataset.tier);
    const [item] = await this.actor.createEmbeddedDocuments("Item", [{ name, type, system }]);
    item?.sheet.render({ force: true });
  }

  static #onItemEdit(event, target) {
    this._getItem(target)?.sheet.render({ force: true });
  }

  static async #onItemDelete(event, target) {
    const item = this._getItem(target);
    if (!item) return;
    const ok = await DialogV2.confirm({
      window: { title: "GENESYS.Delete" },
      content: `<p>${game.i18n.format("GENESYS.DeleteConfirm", { name: foundry.utils.escapeHTML(item.name) })}</p>`
    });
    if (ok) return item.delete();
  }

  static #onItemToggle(event, target) {
    const item = this._getItem(target);
    const field = target.dataset.field;
    if (item && field) return item.update({ [field]: !foundry.utils.getProperty(item, field) });
  }

  static #onItemChat(event, target) {
    return this._getItem(target)?.toChat();
  }

  static #onRollInjury() {
    return this.actor.promptCriticalInjury();
  }

  static #onItemQuantity(event, target) {
    const item = this._getItem(target);
    if (!item) return;
    const delta = Number(target.dataset.delta) || 0;
    return item.update({ "system.quantity": Math.max(0, item.system.quantity + delta) });
  }
}
