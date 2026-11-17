import { GENESYS, TEMPLATES } from "../config.mjs";
import { GenesysBaseActorSheet } from "./base-actor-sheet.mjs";

/**
 * Лист противника: компактный блок характеристик «как в книге».
 */
export class GenesysAdversarySheet extends GenesysBaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["adversary"],
    position: { width: 720, height: 780 },
    actions: {
      skillRankAdv: GenesysAdversarySheet.#onSkillRank
    }
  };

  static PARTS = {
    main: { template: `${TEMPLATES}/actor/adversary.hbs`, scrollable: [".adversary-body"] }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
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
}
