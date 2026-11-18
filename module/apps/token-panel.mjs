import { GENESYS, SYSTEM_ID, TEMPLATES } from "../config.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Панель на токене: выделили свой токен — внизу экрана раны и усталость (±), состояния (щелчок — снять),
 * атака любым оружием одним щелчком, бросок навыка, отдых, лист. Для транспорта — корпус, системы, скорость, управление.
 * Включается в настройках клиента («Панель на токене»).
 */
export class TokenPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static instance = null;

  static DEFAULT_OPTIONS = {
    id: "genesys-token-panel",
    classes: ["genesys", "token-panel"],
    window: { frame: false, positioned: false },
    actions: {
      adjust: TokenPanel.#onAdjust, attack: TokenPanel.#onAttack, status: TokenPanel.#onStatus,
      sheet: TokenPanel.#onSheet, rest: TokenPanel.#onRest, pilot: TokenPanel.#onPilot, painkiller: TokenPanel.#onPainkiller, medicine: TokenPanel.#onMedicine, hidePanel: TokenPanel.#onClose
    }
  };

  static PARTS = { main: { template: `${TEMPLATES}/apps/token-panel.hbs` } };

  constructor(actor, options = {}) { super(options); this.actor = actor; }

  /** Показать панель для актёра (или убрать). */
  static show(actor) {
    let enabled = true;
    try { enabled = game.settings.get(SYSTEM_ID, "tokenPanel"); } catch { /* нет настройки */ }
    if (!enabled || !actor?.isOwner) return TokenPanel.hide();
    if (TokenPanel.instance) { TokenPanel.instance.actor = actor; return TokenPanel.instance.render({ force: true }); }
    TokenPanel.instance = new TokenPanel(actor);
    return TokenPanel.instance.render({ force: true });
  }

  static hide() { TokenPanel.instance?.close(); TokenPanel.instance = null; }

  static refresh(actor) { if (TokenPanel.instance && (!actor || TokenPanel.instance.actor === actor || TokenPanel.instance.actor?.uuid === actor?.uuid)) TokenPanel.instance.render(); }

  /** @override */
  async _prepareContext() {
    const a = this.actor;
    const s = a.system;
    const vehicle = a.type === "vehicle";
    const bar = (value, max) => ({ value, max, pct: max ? Math.min(100, Math.round(100 * value / max)) : 0, over: value > max });
    const weapons = a.itemTypes.weapon.filter(w => vehicle || w.system.equipped !== false || a.type !== "character").slice(0, 6).map(w => ({
      id: w.id, name: w.name, img: w.img, damage: w.system.totalDamage ?? w.system.damage, crit: w.system.totalCrit ?? w.system.crit,
      range: game.i18n.localize(GENESYS.ranges[w.system.range]?.label ?? "")
    }));
    const skills = a.itemTypes.skill.filter(sk => sk.system.rank > 0 || ["perception", "vigilance", "cool", "athletics", "discipline"].includes(sk.system.key))
      .sort((x, y) => y.system.rank - x.system.rank || x.name.localeCompare(y.name, game.i18n.lang))
      .map(sk => ({ id: sk.id, name: sk.name, rank: sk.system.rank }));
    return {
      name: a.name, img: a.img, vehicle, character: a.type === "character",
      wounds: vehicle ? bar(s.hullTrauma.value, s.hullTrauma.max) : bar(s.wounds.value, a.type === "adversary" && s.isMinion ? s.groupWounds : s.wounds.max),
      strain: vehicle ? bar(s.systemStrain.value, s.systemStrain.max) : (s.strain?.max ? bar(s.strain.value, s.strain.max) : null),
      woundsPath: vehicle ? "system.hullTrauma.value" : "system.wounds.value",
      strainPath: vehicle ? "system.systemStrain.value" : "system.strain.value",
      soak: vehicle ? s.armor : s.soak?.value, defense: vehicle ? null : `${s.defense?.melee?.value ?? 0}/${s.defense?.ranged?.value ?? 0}`,
      speed: vehicle ? `${s.speed.value}/${s.speed.max}` : null,
      minions: a.type === "adversary" && s.isMinion ? `${s.aliveMinions}/${s.groupSize}` : null,
      statuses: GENESYS.statusEffects.filter(st => a.statuses?.has(st.id)).map(st => {
        const e = a.effects.find(x => x.statuses?.has(st.id));
        return { id: st.id, img: st.img, name: game.i18n.localize(st.name), rounds: e?.getFlag(SYSTEM_ID, "rounds") ?? 0 };
      }),
      weapons, skills
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    this.element.querySelector("[name=skill]")?.addEventListener("change", ev => {
      const id = ev.target.value;
      ev.target.value = "";
      const skill = this.actor.items.get(id);
      if (skill) this.actor.rollSkill(skill);
    });
  }

  /** @override */
  _onClose(options) { super._onClose?.(options); if (TokenPanel.instance === this) TokenPanel.instance = null; }

  static #onAdjust(event, target) {
    const path = target.dataset.path;
    const cur = foundry.utils.getProperty(this.actor, path) ?? 0;
    return this.actor.update({ [path]: Math.max(0, cur + Number(target.dataset.delta)) });
  }
  static #onAttack(event, target) {
    const w = this.actor.items.get(target.dataset.id);
    if (w) return this.actor.rollWeapon(w);
  }
  static #onStatus(event, target) { return this.actor.toggleStatusEffect(target.dataset.id, { active: false }); }
  static #onSheet() { this.actor.sheet.render({ force: true }); }
  static #onRest() { return this.actor.recoverStrain?.(); }
  static #onPilot() { return this.actor.rollPilot?.(); }
  static #onPainkiller() { return this.actor.usePainkiller?.(); }
  static #onMedicine() { return this.actor.useMedicine?.(); }
  static #onClose() { TokenPanel.hide(); }
}

/** Хуки: выделение токена, обновление актёра, его эффектов и предметов. */
export function registerTokenPanel() {
  Hooks.on("controlToken", () => {
    const controlled = canvas?.tokens?.controlled ?? [];
    if (controlled.length === 1 && controlled[0].actor) TokenPanel.show(controlled[0].actor);
    else TokenPanel.hide();
  });
  const refresh = doc => TokenPanel.refresh(doc?.parent ?? doc);
  for (const h of ["updateActor", "createActiveEffect", "deleteActiveEffect", "updateActiveEffect", "createItem", "deleteItem", "updateItem"]) Hooks.on(h, refresh);
}
