import { GENESYS, TEMPLATES, SYSTEM_ID } from "../config.mjs";
import { GenesysBaseActorSheet } from "./base-actor-sheet.mjs";
import { GenesysActor } from "../documents/actor.mjs";
import { getTargets } from "../combat/combat.mjs";
import { applyTimedStatus } from "../combat/conditions.mjs";

/**
 * Манёвры и действия транспорта (Core Rulebook, гл. «Транспорт», с. 227–230).
 * sil — допустимая фигура [мин, макс], speed — минимальная текущая скорость.
 */
const MANEUVERS = {
  accelerate: { sil: [0, 10], speed: 0 },
  decelerate: { sil: [0, 10], speed: 1 },
  reposition: { sil: [0, 10], speed: 1 },
  evade: { sil: [0, 4], speed: 3 },
  brace: { sil: [0, 10], speed: 0 },
  advantage: { sil: [1, 4], speed: 4, action: true },
  stunt: { sil: [0, 10], speed: 1, action: true }
};

/**
 * Лист транспорта: профиль, оружие с секторами обстрела, критические попадания.
 */
export class GenesysVehicleSheet extends GenesysBaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["vehicle"],
    position: { width: 720, height: 760 },
    actions: {
      rollPilot: GenesysVehicleSheet.#onRollPilot,
      adjustVehicle: GenesysVehicleSheet.#onAdjust,
      maneuver: GenesysVehicleSheet.#onManeuver
    }
  };

  static PARTS = {
    main: { template: `${TEMPLATES}/actor/vehicle.hbs`, scrollable: [""] }
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
    const bar = (value, max) => ({ value, max, pct: max ? Math.min(100, Math.round(100 * value / max)) : 0, over: value > max });
    context.hull = bar(system.hullTrauma.value, system.hullTrauma.max);
    context.sysStrain = bar(system.systemStrain.value, system.systemStrain.max);
    const h = system.handling ?? 0;
    context.handlingBoost = Math.max(0, h); context.handlingSetback = Math.max(0, -h); context.handling = h !== 0;
    const speed = system.speed.value;
    context.maneuvers = Object.entries(MANEUVERS).map(([key, m]) => ({
      key, label: `GENESYS.Vehicle.M.${key}`, hint: `GENESYS.Vehicle.MHint.${key}`, action: !!m.action,
      allowed: system.silhouette >= m.sil[0] && system.silhouette <= m.sil[1] && speed >= m.speed
    }));
    context.terrain = this.actor.getFlag(SYSTEM_ID, "terrain") ?? 0;
    context.terrainChoices = [0, 1, 2, 3].map(n => ({ n, label: `GENESYS.Vehicle.Terrain${n}`, selected: n === context.terrain }));
    context.vehicleStates = ["evasive", "braced", "vehicleAdvantage"].filter(st => this.actor.statuses?.has(st))
      .map(st => game.i18n.localize(`GENESYS.Status.${st}`));
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

  /** Сообщение о манёвре в чат. */
  async #say(key, data = {}) {
    return ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor: this.actor }),
      content: `<div class="genesys status-report"><b>${game.i18n.localize(`GENESYS.Vehicle.M.${key}`)}.</b> ${game.i18n.format(`GENESYS.Vehicle.MDone.${key}`, { name: foundry.utils.escapeHTML(this.actor.name), ...data })}</div>`
    });
  }

  /** Спросить число (на сколько изменить скорость). */
  static async #askNumber(title, max) {
    if (max <= 1) return max;
    return foundry.applications.api.DialogV2.prompt({
      window: { title },
      content: `<input type="number" name="n" value="1" min="1" max="${max}" autofocus>`,
      ok: { label: "OK", callback: (ev, button) => Math.min(max, Math.max(1, Number(button.form.elements.n.value) || 1)) },
      rejectClose: false
    });
  }

  static async #onManeuver(event, target) {
    const key = target.dataset.key;
    const actor = this.actor;
    const sys = actor.system;
    const m = MANEUVERS[key];
    if (!m) return;
    if (sys.silhouette < m.sil[0] || sys.silhouette > m.sil[1] || sys.speed.value < m.speed) {
      return ui.notifications.warn(game.i18n.localize(`GENESYS.Vehicle.MHint.${key}`));
    }
    const pilot = GenesysActor.findCrewMember(actor);
    const title = game.i18n.localize(`GENESYS.Vehicle.M.${key}`);
    switch (key) {
      case "accelerate":
      case "decelerate": {
        const room = key === "accelerate" ? sys.speed.max - sys.speed.value : sys.speed.value;
        if (room <= 0) return ui.notifications.warn("GENESYS.Vehicle.NoSpeedRoom", { localize: true });
        const n = await GenesysVehicleSheet.#askNumber(title, room);
        if (!n) return;
        const speed = sys.speed.value + (key === "accelerate" ? n : -n);
        const strain = Math.max(0, n - 1);
        await actor.update({ "system.speed.value": speed, "system.systemStrain.value": sys.systemStrain.value + strain });
        return this.#say(key, { speed, strain });
      }
      case "reposition":
        return this.#say(key);
      case "evade":
      case "brace":
        await applyTimedStatus(actor, key === "evade" ? "evasive" : "braced", { untilTurnOf: pilot?.uuid ?? actor.uuid, source: title });
        return this.#say(key, { sil: sys.silhouette });
      case "advantage": {
        const foe = getTargets()[0]?.actor;
        if (foe?.type !== "vehicle") return ui.notifications.warn("GENESYS.Vehicle.NeedTarget", { localize: true });
        const diff = sys.speed.value - (foe.system.speed?.value ?? 0);
        let difficulty = diff >= 1 ? 1 : diff === 0 ? 2 : diff === -1 ? 3 : 4;
        const theirs = foe.effects.find(e => e.statuses?.has("vehicleAdvantage"))?.getFlag(SYSTEM_ID, "over") === actor.uuid;
        if (theirs) difficulty += 1;
        const roll = await actor.rollPilot({ difficulty: Math.min(5, difficulty), label: `${title} → ${foe.name}` });
        if (roll?.results?.isSuccess) {
          await actor.toggleStatusEffect("vehicleAdvantage", { active: true });
          const effect = actor.effects.find(e => e.statuses?.has("vehicleAdvantage"));
          await effect?.setFlag(SYSTEM_ID, "over", foe.uuid);
          if (theirs) await foe.toggleStatusEffect("vehicleAdvantage", { active: false });
          return this.#say(key, { target: foundry.utils.escapeHTML(foe.name) });
        }
        return null;
      }
      case "stunt":
        return actor.rollPilot({ difficulty: Math.min(5, Math.max(1, sys.silhouette)), label: title });
    }
  }
}
