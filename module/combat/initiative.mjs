import { SYSTEM_ID } from "../config.mjs";

/**
 * Слоты инициативы Genesys: результаты инициативы задают слоты ПИ и противников,
 * а кто из персонажей игроков действует в слоте ПИ — решают игроки.
 * Когда наступает слот ПИ, в чат приходит карточка с кнопками персонажей, ещё не ходивших в этом раунде.
 */
const SOCKET = `system.${SYSTEM_ID}`;
const FLAG = "acted";

const isPC = c => !!c?.actor?.hasPlayerOwner;

export function registerCombatHooks() {
  Hooks.on("updateCombat", onUpdateCombat);
  game.socket.on(SOCKET, payload => {
    if (payload?.type === "claimSlot" && game.user.isActiveGM) claimSlot(payload.combatId, payload.combatantId);
  });
  Hooks.on("renderChatMessageHTML", (message, html) => {
    html.querySelectorAll("[data-genesys-slot]").forEach(btn => btn.addEventListener("click", ev => {
      ev.preventDefault();
      const { combatId, combatantId } = btn.dataset;
      const combat = game.combats.get(combatId);
      const combatant = combat?.combatants.get(combatantId);
      if (!combatant) return;
      if (!game.user.isGM && !combatant.isOwner) return ui.notifications.warn("GENESYS.Initiative.NotYours", { localize: true });
      if (game.user.isGM) return claimSlot(combatId, combatantId);
      game.socket.emit(SOCKET, { type: "claimSlot", combatId, combatantId });
    }));
  });
}

async function onUpdateCombat(combat, changed, options) {
  if (!game.user.isActiveGM || !game.settings.get(SYSTEM_ID, "initiativeSlots")) return;
  if (options?.genesysSlotSwap) return;
  // Новый раунд — сбросить отметки «уже ходил».
  if ("round" in changed) {
    const updates = combat.combatants.filter(c => c.getFlag(SYSTEM_ID, FLAG)).map(c => ({ _id: c.id, [`flags.${SYSTEM_ID}.${FLAG}`]: false }));
    if (updates.length) await combat.updateEmbeddedDocuments("Combatant", updates);
  }
  if (!("turn" in changed) && !("round" in changed)) return;
  const current = combat.combatant;
  if (!isPC(current)) return;
  const waiting = combat.combatants.filter(c => isPC(c) && !c.getFlag(SYSTEM_ID, FLAG) && !c.defeated);
  if (waiting.length <= 1) return;
  const buttons = waiting.map(c => `<button type="button" data-genesys-slot data-combat-id="${combat.id}" data-combatant-id="${c.id}">
      <img src="${c.img}" alt=""> ${foundry.utils.escapeHTML(c.name)}${c.id === current.id ? " ✓" : ""}</button>`).join("");
  await ChatMessage.implementation.create({
    content: `<div class="genesys slot-card"><h4>${game.i18n.localize("GENESYS.Initiative.PCSlot")}</h4>
      <p class="hint">${game.i18n.localize("GENESYS.Initiative.PCSlotHint")}</p><div class="slot-buttons">${buttons}</div></div>`,
    speaker: { alias: game.i18n.localize("GENESYS.Initiative.Title") }
  });
}

/** Отметить ход завершённым при смене хода (вызывается из хука combatTurnChange). */
async function markActed(combat, prior) {
  const prev = prior?.combatantId ? combat.combatants.get(prior.combatantId) : null;
  if (prev && !prev.getFlag(SYSTEM_ID, FLAG)) await prev.setFlag(SYSTEM_ID, FLAG, true);
}
Hooks.on("combatTurnChange", (combat, prior) => {
  if (game.user.isActiveGM) markActed(combat, prior);
});

/** Занять текущий слот: поменяться инициативой с текущим участником. */
async function claimSlot(combatId, combatantId) {
  const combat = game.combats.get(combatId);
  const chosen = combat?.combatants.get(combatantId);
  const current = combat?.combatant;
  if (!chosen || !current || chosen.id === current.id) return;
  if (chosen.getFlag(SYSTEM_ID, FLAG)) return ui.notifications.warn("GENESYS.Initiative.AlreadyActed", { localize: true });
  await combat.updateEmbeddedDocuments("Combatant", [
    { _id: current.id, initiative: chosen.initiative },
    { _id: chosen.id, initiative: current.initiative }
  ], { genesysSlotSwap: true });
  const turn = combat.turns.findIndex(c => c.id === chosen.id);
  if (turn >= 0) await combat.update({ turn }, { genesysSlotSwap: true });
}
