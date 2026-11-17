import { GENESYS, TEMPLATES } from "../config.mjs";
import { GenesysBaseActorSheet } from "./base-actor-sheet.mjs";

/**
 * Лист транспорта: профиль, оружие с секторами обстрела, критические попадания.
 */
export class GenesysVehicleSheet extends GenesysBaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["vehicle"],
    position: { width: 720, height: 760 },
    actions: {
      rollPilot: GenesysVehicleSheet.#onRollPilot,
      adjustVehicle: GenesysVehicleSheet.#onAdjust
    }
  };

  static PARTS = {
    main: { template: `${TEMPLATES}/actor/vehicle.hbs`, scrollable: [".vehicle-body"] }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;
    context.skillChoices = {
      driving: "GENESYS.Skill.driving",
      piloting: "GENESYS.Skill.piloting",
      operating: "GENESYS.Skill.operating",
      riding: "GENESYS.Skill.riding"
    };
    context.weapons = this.actor.itemTypes.weapon.map(i => ({
      ...this._weaponContext(i),
      firingArc: i.system.firingArc,
      skillName: game.i18n.localize(`GENESYS.Skill.${i.system.skill}`) !== `GENESYS.Skill.${i.system.skill}`
        ? game.i18n.localize(`GENESYS.Skill.${i.system.skill}`) : i.system.skill
    }));
    context.crits = this.actor.itemTypes.injury;
    context.enriched = {
      description: await this._enrich(system.description),
      notes: await this._enrich(system.notes)
    };
    return context;
  }

  static #onRollPilot() {
    return this.actor.rollPilot();
  }

  static #onAdjust(event, target) {
    const path = target.dataset.path;
    const delta = Number(target.dataset.delta) || 0;
    const current = foundry.utils.getProperty(this.actor, path) ?? 0;
    return this.actor.update({ [path]: Math.max(0, current + delta) });
  }
}
