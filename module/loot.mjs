import { SYSTEM_ID } from "./config.mjs";

/**
 * Карточка добычи в чате: «Взять» кладёт предмет назначенному персонажу (или выделенному токену),
 * «Поделить деньги» (ведущий) делит монеты поровну между персонажами игроков.
 * Состояние — во флагах сообщения; меняет его ведущий (игроки — через сокет).
 */
const SOCKET = `system.${SYSTEM_ID}`;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

function cardHTML(state) {
  const rows = state.items.map((it, i) => `<li class="${it.taken ? "taken" : ""}">
      <img src="${esc(it.data.img)}" alt=""><span class="loot-name">${esc(it.data.name)}${it.qty > 1 ? ` ×${it.qty}` : ""}</span>
      <span class="loot-price">${(it.data.system?.price ?? 0) * it.qty}</span>
      ${it.taken ? `<span class="loot-taken">${esc(it.taken)}</span>` : `<button type="button" data-genesys-loot="take" data-index="${i}">${game.i18n.localize("GENESYS.Loot.Take")}</button>`}</li>`).join("");
  const coins = state.coins > 0 ? `<div class="loot-coins"><i class="fa-solid fa-coins"></i> <b>${state.coins}</b> ${game.i18n.localize("GENESYS.Loot.Coins")}
      ${state.split ? `<span class="loot-taken">${esc(state.split)}</span>` : `<button type="button" data-genesys-loot="split">${game.i18n.localize("GENESYS.Loot.Split")}</button>`}</div>` : "";
  return `<div class="genesys loot-card"><h4><i class="fa-solid fa-sack-dollar"></i> ${game.i18n.localize("GENESYS.Loot.Title")}</h4>${coins}
    <ul class="loot-list">${rows || `<li class="gs-empty">${game.i18n.localize("GENESYS.Loot.NoItems")}</li>`}</ul></div>`;
}

export async function postLoot(state) {
  return ChatMessage.implementation.create({
    speaker: { alias: game.i18n.localize("GENESYS.Loot.Title") },
    content: cardHTML(state),
    flags: { [SYSTEM_ID]: { loot: state } }
  });
}

/** Получатель: назначенный персонаж игрока или выделенный токен. */
function receiver() {
  return canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
}

/** Выполняется у ведущего. */
async function resolve(message, { action, index, actorUuid }) {
  const state = foundry.utils.deepClone(message.getFlag(SYSTEM_ID, "loot"));
  if (!state) return;
  if (action === "take") {
    const it = state.items[index];
    const actor = await fromUuid(actorUuid);
    if (!it || it.taken || !actor) return;
    const data = foundry.utils.deepClone(it.data);
    if (data.system) data.system.quantity = it.qty;
    await actor.createEmbeddedDocuments("Item", [data]);
    it.taken = actor.name;
  } else if (action === "split") {
    if (state.split || !state.coins) return;
    const pcs = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
    if (!pcs.length) return;
    const share = Math.floor(state.coins / pcs.length);
    for (const a of pcs) await a.update({ "system.money": (a.system.money ?? 0) + share });
    state.split = game.i18n.format("GENESYS.Loot.SplitDone", { share, n: pcs.length, rest: state.coins - share * pcs.length });
  }
  await message.update({ content: cardHTML(state), [`flags.${SYSTEM_ID}.loot`]: state });
}

export function registerLoot() {
  game.socket.on(SOCKET, async payload => {
    if (payload?.type !== "loot" || !game.user.isActiveGM) return;
    const message = game.messages.get(payload.messageId);
    if (message) await resolve(message, payload);
  });
  Hooks.on("renderChatMessageHTML", (message, html) => {
    html.querySelectorAll("[data-genesys-loot]").forEach(btn => btn.addEventListener("click", async ev => {
      ev.preventDefault();
      const action = btn.dataset.genesysLoot;
      if (action === "split" && !game.user.isGM) return ui.notifications.warn("GENESYS.Setup.GMOnly", { localize: true });
      const actor = receiver();
      if (action === "take" && (!actor || !actor.isOwner)) return ui.notifications.warn("GENESYS.Loot.NoReceiver", { localize: true });
      const payload = { type: "loot", messageId: message.id, action, index: Number(btn.dataset.index), actorUuid: actor?.uuid };
      btn.disabled = true;
      if (game.user.isGM) return resolve(message, payload);
      if (!game.users.activeGM) return ui.notifications.warn("GENESYS.StoryPoints.NoGM", { localize: true });
      game.socket.emit(SOCKET, payload);
    }));
  });
}
