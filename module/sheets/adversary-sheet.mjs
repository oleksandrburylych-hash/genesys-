import { GENESYS, TEMPLATES } from "../config.mjs";
import { CREATURE_TYPES, LOOT_TAGS } from "../creatures.mjs";
import { GenesysBaseActorSheet } from "./base-actor-sheet.mjs";

/**
 * Лист противника: компактный блок характеристик «как в книге».
 */
export class GenesysAdversarySheet extends GenesysBaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["adversary"],
    position: { width: 720, height: 780 },
    actions: {
      skillRankAdv: GenesysAdversarySheet.#onSkillRank,
      toggleLoot: GenesysAdversarySheet.#onToggleLoot
    }
  };

  static PARTS = {
    main: { template: `${TEMPLATES}/actor/adversary.hbs`, scrollable: [".adversary-body"] }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;
    context.creatureTypes = Object.entries(CREATURE_TYPES).map(([key, t]) => ({ key, label: t.label, selected: key === sys.creatureType }));
    context.lootChoices = Object.entries(LOOT_TAGS).map(([key, t]) => ({ key, label: t.label, on: (sys.loot ?? []).includes(key) }));
    const system = this.actor.system;
    context.adversaryTypes = GENESYS.adversaryTypes;
    context.isMinion = system.isMinion;
    context.isNemesis = system.isNemesis;
    context.rankAction = "skillRankAdv";
    context.careerLabel = system.isMinion ? "GENESYS.GroupSkill" : "GENESYS.CareerSkill";
    context.enriched = {
      description: await this._enrich(system.description),
      notes: await this._enrich(system.notes)
    };
    return context;
  }

  static #onSkillRank(event, target) {
    const item = this._getItem(target);
    if (!item) return;
    const next = Math.clamp(item.system.rank + Number(target.dataset.delta), 0, 5);
    return item.update({ "system.rank": next });
  }

  /** Включить/выключить тег добычи. */
  static async #onToggleLoot(event, target) {
    const set = new Set(this.actor.system.loot ?? []);
    const k = target.dataset.key;
    if (set.has(k)) set.delete(k); else set.add(k);
    await this.actor.update({ "system.loot": Object.keys(LOOT_TAGS).filter(x => set.has(x)) });
  }
}
