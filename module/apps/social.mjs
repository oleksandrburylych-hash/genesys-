import { GENESYS, SYSTEM_ID, TEMPLATES } from "../config.mjs";
import { getTargets } from "../combat/combat.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const SOCKET = `system.${SYSTEM_ID}`;

/**
 * Социальная сцена по Core Rulebook («Проверка против порога усталости», «Критическое замечание»):
 * давление на цель копится как усталость; больше половины порога — компромисс, больше порога — капитуляция.
 * У соперников и приспешников порог — порог ран (раны на самом деле не наносятся: давление хранится в сцене).
 * Состояние сцены — в настройке мира, меняет его ведущий; игроки жмут кнопки на своих бросках.
 */

/** Текущая сцена (или null). */
export function socialState() {
  try { const s = game.settings.get(SYSTEM_ID, "socialEncounter"); return s?.active ? s : null; } catch { return null; }
}

/** Порог цели: усталость, у соперников и приспешников — раны. */
function thresholdOf(actor) {
  const sys = actor?.system ?? {};
  return sys.strain?.max > 0 ? sys.strain.max : (sys.wounds?.max ?? 10);
}

async function say(html) {
  return ChatMessage.implementation.create({ speaker: { alias: game.i18n.localize("GENESYS.Social.Title") }, content: `<div class="genesys social-report">${html}</div>` });
}

/** Добавить давление (только ведущий). Сообщает о компромиссе и капитуляции. */
export async function addPressure(amount, reason = "") {
  if (!game.user.isGM) return game.socket.emit(SOCKET, { type: "socialPressure", amount, reason });
  const state = socialState();
  if (!state) return;
  const before = state.pressure;
  const pressure = Math.max(0, before + amount);
  await game.settings.set(SYSTEM_ID, "socialEncounter", { ...state, pressure });
  const half = state.threshold / 2;
  const esc = foundry.utils.escapeHTML;
  let text = game.i18n.format("GENESYS.Social.PressureMsg", { name: esc(state.targetName), amount: amount > 0 ? `+${amount}` : amount, pressure, threshold: state.threshold });
  if (reason) text += ` <span class="hint">(${esc(reason)})</span>`;
  if (before <= state.threshold && pressure > state.threshold) text += `<br><b>${game.i18n.format("GENESYS.Social.Capitulation", { name: esc(state.targetName) })}</b>`;
  else if (before <= half && pressure > half) text += `<br><b>${game.i18n.format("GENESYS.Social.Compromise", { name: esc(state.targetName) })}</b>`;
  await say(text);
  SocialEncounter.instance?.render();
}

/** Сокет и кнопки давления на карточках социальных бросков. */
export function registerSocial() {
  game.socket.on(SOCKET, payload => {
    if (payload?.type === "socialPressure" && game.user.isActiveGM) addPressure(payload.amount, payload.reason);
  });
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const roll = message.rolls?.[0];
    const state = socialState();
    if (!state || !roll?.options?.social || !roll.results?.isSuccess) return;
    const r = roll.results;
    const bar = document.createElement("div");
    bar.className = "genesys social-buttons";
    const mk = (amount, label) => {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = `<i class="fa-solid fa-comments"></i> ${label}`;
      b.addEventListener("click", ev => { ev.preventDefault(); addPressure(amount, roll.options.label ?? ""); });
      bar.append(b);
    };
    mk(r.success, game.i18n.format("GENESYS.Social.Press", { n: r.success, name: state.targetName }));
    if (r.triumph > 0 || r.advantage >= 4) mk(5, game.i18n.localize("GENESYS.Social.CritRemark"));
    (html.querySelector(".message-content") ?? html).append(bar);
  });
}

/** Окно ведущего. */
export class SocialEncounter extends HandlebarsApplicationMixin(ApplicationV2) {
  static instance = null;

  static DEFAULT_OPTIONS = {
    id: "genesys-social",
    classes: ["genesys", "themed", "theme-light", "gm-screen", "social-encounter"],
    tag: "form",
    window: { title: "GENESYS.Social.Title", icon: "fa-solid fa-comments", resizable: true },
    position: { width: 560, height: 620 },
    actions: {
      start: SocialEncounter.#onStart, end: SocialEncounter.#onEnd, press: SocialEncounter.#onPress,
      nextRound: SocialEncounter.#onNextRound, acted: SocialEncounter.#onActed, reveal: SocialEncounter.#onReveal
    },
    form: { handler: SocialEncounter.#onChange, submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = { main: { template: `${TEMPLATES}/apps/social.hbs`, scrollable: [".gm-body"] } };

  static open() {
    if (!game.user.isGM) return ui.notifications.warn("GENESYS.Setup.GMOnly", { localize: true });
    this.instance ??= new SocialEncounter();
    return this.instance.render({ force: true });
  }

  constructor(options) { super(options); this.goal = ""; }

  /** @override */
  async _prepareContext() {
    const state = socialState();
    if (!state) {
      const t = getTargets()[0]?.actor ?? canvas?.tokens?.controlled?.[0]?.actor ?? null;
      return { active: false, goal: this.goal, candidate: t ? { name: t.name, img: t.img, threshold: thresholdOf(t) } : null };
    }
    const target = await fromUuid(state.targetUuid);
    const pcs = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner).map(a => ({
      id: a.id, name: a.name, img: a.img, strain: a.system.strain?.value ?? 0, max: a.system.strain?.max ?? 0,
      over: (a.system.strain?.value ?? 0) > (a.system.strain?.max ?? 0), acted: state.acted.includes(a.id)
    }));
    const mot = target?.system?.motivations ?? null;
    return {
      active: true, state,
      img: target?.img,
      pct: Math.min(100, Math.round(100 * state.pressure / Math.max(1, state.threshold))),
      stage: state.pressure > state.threshold ? "capitulation" : (state.pressure > state.threshold / 2 ? "compromise" : "start"),
      pcs,
      motivations: mot ? ["desire", "fear", "strength", "flaw"].map(k => ({ key: k, label: GENESYS.motivations[k], name: mot[k]?.name ?? "", revealed: state.revealed.includes(k) })).filter(m => m.name) : []
    };
  }

  static #onChange(event, form, formData) { if ("goal" in formData.object) this.goal = formData.object.goal; }

  static async #onStart() {
    const t = getTargets()[0]?.actor ?? canvas?.tokens?.controlled?.[0]?.actor ?? null;
    if (!t) return ui.notifications.warn("GENESYS.Social.NeedTarget", { localize: true });
    const state = { active: true, goal: this.goal, targetUuid: t.uuid, targetName: t.name, threshold: thresholdOf(t), pressure: 0, round: 1, acted: [], revealed: [] };
    await game.settings.set(SYSTEM_ID, "socialEncounter", state);
    await say(game.i18n.format("GENESYS.Social.StartMsg", { name: foundry.utils.escapeHTML(t.name), goal: foundry.utils.escapeHTML(this.goal || "—"),
      half: Math.floor(state.threshold / 2) + 1, full: state.threshold + 1 }));
    this.render();
  }

  static async #onEnd() {
    const state = socialState();
    if (!state) return;
    const key = state.pressure > state.threshold ? "capitulation" : (state.pressure > state.threshold / 2 ? "compromise" : "start");
    await say(game.i18n.format("GENESYS.Social.EndMsg", { name: foundry.utils.escapeHTML(state.targetName), result: game.i18n.localize(`GENESYS.Social.Stage.${key}`) }));
    await game.settings.set(SYSTEM_ID, "socialEncounter", { active: false });
    this.render();
  }

  static #onPress(event, target) { return addPressure(Number(target.dataset.amount) || 0, game.i18n.localize("GENESYS.Social.Manual")); }

  static async #onNextRound() {
    const state = socialState();
    if (!state) return;
    await game.settings.set(SYSTEM_ID, "socialEncounter", { ...state, round: state.round + 1, acted: [] });
    this.render();
  }

  static async #onActed(event, target) {
    const state = socialState();
    if (!state) return;
    const id = target.dataset.id;
    const acted = state.acted.includes(id) ? state.acted.filter(x => x !== id) : [...state.acted, id];
    await game.settings.set(SYSTEM_ID, "socialEncounter", { ...state, acted });
    this.render();
  }

  /** Отметить аспект мотивации цели как раскрытый (Таблица 1.7-2: узнать Достоинство/Недостаток/Страх/Желание). */
  static async #onReveal(event, target) {
    const state = socialState();
    if (!state) return;
    const k = target.dataset.key;
    const revealed = state.revealed.includes(k) ? state.revealed.filter(x => x !== k) : [...state.revealed, k];
    await game.settings.set(SYSTEM_ID, "socialEncounter", { ...state, revealed });
    if (!state.revealed.includes(k)) {
      const actor = await fromUuid(state.targetUuid);
      const m = actor?.system?.motivations?.[k];
      if (m?.name) await say(game.i18n.format("GENESYS.Social.Revealed", { name: foundry.utils.escapeHTML(state.targetName),
        aspect: game.i18n.localize(GENESYS.motivations[k]), value: foundry.utils.escapeHTML(m.name) }));
    }
    this.render();
  }

  /** @override */
  _onClose(options) { super._onClose(options); SocialEncounter.instance = null; }
}
