import { GENESYS, SYSTEM_ID } from "../config.mjs";
import { sourceEnabled } from "../helpers/adventure.mjs";

/**
 * Проверка страха (Core Rulebook, «Страх»): проверка Выдержки, сложность по степени страха (табл. III.4-1).
 * Ведущий объявляет источник — в чат приходит карточка с кнопкой броска для каждого персонажа.
 * С модулем Expanded Fear Guidelines под броском — таблица трат символов страха.
 */

/** Персонажи для проверки: выделенные токены или персонажи игроков на сцене. */
function fearTargets(mode) {
  const tokens = mode === "selected" ? (canvas?.tokens?.controlled ?? []) : (canvas?.tokens?.placeables ?? []).filter(t => t.actor?.hasPlayerOwner);
  const actors = [...new Set(tokens.map(t => t.actor).filter(a => a && a.type === "character"))];
  if (!actors.length && mode !== "selected") return game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
  return actors;
}

/** Окно ведущего: источник, степень страха, кого проверять. */
export async function promptFearCheck() {
  if (!game.user.isGM) return ui.notifications.warn("GENESYS.Setup.GMOnly", { localize: true });
  const L = k => game.i18n.localize(k);
  const options = [1, 2, 3, 4, 5].map(n => `<option value="${n}" ${n === 2 ? "selected" : ""}>${L(GENESYS.difficulties[n])} — ${L(`GENESYS.Fear.Degree.${n}`)}</option>`).join("");
  const data = await foundry.applications.api.DialogV2.prompt({
    window: { title: L("GENESYS.Fear.Title"), icon: "fa-solid fa-ghost" },
    content: `<div class="genesys fear-prompt">
      <label>${L("GENESYS.Fear.Source")}<input type="text" name="source" placeholder="${L("GENESYS.Fear.SourcePh")}" autofocus></label>
      <label>${L("GENESYS.Fear.Degree.label")}<select name="difficulty">${options}</select></label>
      <label>${L("GENESYS.Fear.Who")}<select name="who"><option value="scene">${L("GENESYS.Fear.WhoScene")}</option><option value="selected">${L("GENESYS.Fear.WhoSelected")}</option></select></label>
      <p class="hint">${L("GENESYS.Fear.PromptHint")}</p></div>`,
    ok: { label: L("GENESYS.Fear.Call"), callback: (ev, button) => ({
      source: button.form.elements.source.value.trim() || L("GENESYS.Fear.Unknown"),
      difficulty: Number(button.form.elements.difficulty.value) || 2,
      who: button.form.elements.who.value }) },
    rejectClose: false
  });
  if (!data) return;
  const actors = fearTargets(data.who);
  if (!actors.length) return ui.notifications.warn("GENESYS.Fear.NoTargets", { localize: true });
  const esc = foundry.utils.escapeHTML;
  const buttons = actors.map(a => `<button type="button" data-genesys-fear data-actor-uuid="${a.uuid}" data-difficulty="${data.difficulty}" data-source="${esc(data.source)}">
      <img src="${a.img}" alt=""> ${esc(a.name)}</button>`).join("");
  return ChatMessage.implementation.create({
    speaker: { alias: L("GENESYS.Fear.Title") },
    content: `<div class="genesys fear-card"><h4><i class="fa-solid fa-ghost"></i> ${esc(data.source)}</h4>
      <p>${game.i18n.format("GENESYS.Fear.CardText", { difficulty: L(GENESYS.difficulties[data.difficulty]) })}</p>
      <div class="slot-buttons">${buttons}</div></div>`
  });
}

/** Бросок проверки страха персонажем (по кнопке из карточки). */
export async function rollFear(actor, { difficulty = 2, source = "" } = {}) {
  const fearMotivation = actor.system.motivations?.fear?.name;
  const notes = fearMotivation ? [game.i18n.format("GENESYS.Fear.MotivationNote", { fear: fearMotivation })] : [];
  const skill = actor.getSkill("discipline");
  if (!skill) return ui.notifications.warn(game.i18n.format("GENESYS.Warn.SkillNotFound", { name: game.i18n.localize("GENESYS.Skill.discipline") }));
  return actor.rollSkill(skill, {
    difficulty,
    label: game.i18n.format("GENESYS.Fear.RollLabel", { source }),
    rollOptions: { fear: { source }, spellContext: sourceEnabled("fear") ? "fear" : "none" },
    notes
  });
}

/** Применить эффект страха к персонажу. */
export async function applyFearEffect(actor, key) {
  const { actOnActor } = await import("../combat/combat.mjs");
  if (key === "aversion") await actOnActor(actor, "status", { status: "disoriented", active: true });
  else if (key === "freeze") {
    await actOnActor(actor, "status", { status: "immobilized", active: true, rounds: 1 });
    await actOnActor(actor, "status", { status: "staggered", active: true, rounds: 1 });
  } else if (key === "adrenaline") await actOnActor(actor, "adjust", { strain: 3 });
  if (key !== "adrenaline") await actOnActor(actor, "status", { status: "frightened", active: true });
}

export const FEAR_FLAG = SYSTEM_ID;
