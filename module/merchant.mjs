import { GENESYS, SYSTEM_ID } from "./config.mjs";

/**
 * Лавка и проверки редкости (Core Rulebook, «Снаряжение»: табл. I.5-1 «Редкость», I.5-2 «Модификаторы редкости»,
 * «Покупка и продажа»). Ведущий собирает лавку в ширме и выкладывает её в чат; игроки покупают и продают.
 *  — Покупка: если итоговая редкость требует проверки, бросается Переговоры (запрещённый товар — Уличная интуиция)
 *    со сложностью по редкости; при успехе деньги списываются, предмет появляется у персонажа.
 *  — Продажа: та же проверка; успех — ¼ цены, 2 успеха — ½, 3+ — ¾.
 */
const SOCKET = `system.${SYSTEM_ID}`;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Табл. I.5-2: модификаторы редкости по месту. */
export const LOCATION_MODS = [
  { key: "consumer", value: -1 }, { key: "bigCity", value: -1 }, { key: "tradeHub", value: -1 },
  { key: "town", value: 0 }, { key: "civilized", value: 0 }, { key: "rural", value: 1 }, { key: "stateEconomy", value: 1 },
  { key: "frontier", value: 2 }, { key: "banned", value: 2 }, { key: "warZone", value: 3 }, { key: "wasteland", value: 4 }
];

/** Типы лавок: какие предметы. */
export const SHOP_TYPES = {
  general: { types: ["gear"], icon: "swap-bag" },
  weapons: { types: ["weapon"], icon: "crossed-swords" },
  armor: { types: ["armor"], icon: "chest-armor" },
  magic: { types: ["gear", "weapon", "armor"], match: /маги|зель|эликс|рун|фокус|амулет|жезл|посох|свиток|талисман|зачар/i, icon: "magic-potion" },
  tech: { types: ["gear", "weapon", "armor"], match: /кибер|электрон|компьют|сканер|дрон|комлинк|голо|взлом|гаджет|имплант|лазер|бластер/i, icon: "processor" },
  all: { types: ["gear", "weapon", "armor"], icon: "open-treasure-chest" }
};

/** Размер лавки: не больше N позиций и не больше доли всего, что в этом мире подходит лавке такого типа. */
export const SHOP_SIZES = { small: 8, medium: 16, large: 30 };
const SHOP_SHARE = { small: 0.3, medium: 0.55, large: 0.85 };

/** Табл. I.5-1: сложность проверки по итоговой редкости (выше 10 — Запредельная и усиление за каждую единицу). */
export function rarityCheck(rarity) {
  const r = Math.max(0, rarity);
  const difficulty = r <= 1 ? 0 : r <= 3 ? 1 : r <= 5 ? 2 : r <= 7 ? 3 : r <= 9 ? 4 : 5;
  return { difficulty, upgrades: Math.max(0, r - 10) };
}

/** Запрещённый (R) товар — проверка Уличной интуиции. */
export function isRestricted(data) {
  return /\(R\)|ограниченн|запрещ/i.test(`${data.name} ${data.system?.description ?? ""}`);
}

/** Собрать ассортимент. */
export function generateShop(pool, { type = "general", size = "medium", locMod = 0 } = {}) {
  const T = SHOP_TYPES[type] ?? SHOP_TYPES.general;
  const candidates = pool.filter(d => T.types.includes(d.type) && (!T.match || T.match.test(`${d.name} ${d.folder?.name ?? ""}`)));
  // Если подходящих товаров мало, размер — это доля ассортимента: маленькая лавка берёт треть, большая — почти всё.
  const want = Math.max(Math.min(3, candidates.length), Math.min(SHOP_SIZES[size] ?? 16, Math.round(candidates.length * (SHOP_SHARE[size] ?? 0.55))));
  // Чем реже вещь в этом месте, тем реже она на прилавке.
  // Вес: обычные вещи (редкость 0–3) — почти всегда, 4–7 — заметно реже, 8–10 — изредка, выше 10 — только в «Всё подряд».
  const weighted = candidates.flatMap(d => {
    const eff = Math.max(0, (d.system.rarity ?? 0) + locMod);
    if (eff > 10 && type !== "all") return [];
    const w = eff <= 3 ? 8 : eff <= 5 ? 5 : eff <= 7 ? 3 : eff <= 9 ? 2 : 1;
    return Array(w).fill(d);
  });
  const chosen = new Map();
  for (let i = 0; i < want * 6 && chosen.size < want && weighted.length; i++) {
    const d = weighted[Math.floor(Math.random() * weighted.length)];
    if (!chosen.has(d.uuid)) chosen.set(d.uuid, d);
  }
  const result = [...chosen.values()].sort((a, b) => (a.system.price ?? 0) - (b.system.price ?? 0)).map(d => {
    const data = d.toObject ? d.toObject() : structuredClone(d);
    delete data._id;
    const eff = (d.system.rarity ?? 0) + locMod;
    // Запас: обычного — несколько штук, редкого — одна-две.
    const stock = eff <= 3 ? 1 + Math.floor(Math.random() * (size === "large" ? 6 : size === "medium" ? 4 : 3)) : eff <= 6 ? 1 + Math.floor(Math.random() * 2) : 1;
    return { data, rarity: eff, stock };
  });
  result.available = candidates.length;
  return result;
}

function cardHTML(state) {
  const L = k => game.i18n.localize(k);
  const rows = state.items.map((it, i) => {
    const chk = rarityCheck(it.rarity);
    const diff = chk.difficulty ? `${L(GENESYS.difficulties[chk.difficulty])}${chk.upgrades ? ` +${chk.upgrades}↑` : ""}` : L("GENESYS.Shop.NoCheck");
    return `<li class="${it.stock <= 0 ? "taken" : ""}"><img src="${esc(it.data.img)}" alt=""><span class="loot-name">${esc(it.data.name)}
      <small>${L("GENESYS.Rarity")} ${it.rarity} · ${diff}${isRestricted(it.data) ? " · (R)" : ""}</small></span>
      <span class="loot-price">${it.data.system?.price ?? 0}</span>
      ${it.stock > 0 ? `<button type="button" data-genesys-shop="buy" data-index="${i}">${L("GENESYS.Shop.Buy")} (${it.stock})</button>` : `<span class="loot-taken">${L("GENESYS.Shop.SoldOut")}</span>`}</li>`;
  }).join("");
  return `<div class="genesys loot-card shop-card"><h4><i class="fa-solid fa-store"></i> ${esc(state.name)}</h4>
    <p class="hint">${esc(state.where)}${state.locMod ? ` (${L("GENESYS.Rarity")} ${state.locMod > 0 ? "+" : ""}${state.locMod})` : ""}</p>
    <ul class="loot-list">${rows}</ul>
    <div class="shop-actions"><button type="button" data-genesys-shop="sell"><i class="fa-solid fa-hand-holding-dollar"></i> ${L("GENESYS.Shop.Sell")}</button></div></div>`;
}

export async function postShop(state) {
  return ChatMessage.implementation.create({ speaker: { alias: state.name }, content: cardHTML(state), flags: { [SYSTEM_ID]: { shop: state } } });
}

function buyer() { return canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null; }

/** Ведущий уменьшает остаток на складе. */
async function takeStock(message, index) {
  const state = foundry.utils.deepClone(message.getFlag(SYSTEM_ID, "shop"));
  if (!state?.items?.[index]) return;
  state.items[index].stock = Math.max(0, state.items[index].stock - 1);
  await message.update({ content: cardHTML(state), [`flags.${SYSTEM_ID}.shop`]: state });
}

/** Покупка: проверка редкости (если нужна), деньги, предмет. */
async function buy(message, index) {
  const state = message.getFlag(SYSTEM_ID, "shop");
  const it = state?.items?.[index];
  const actor = buyer();
  if (!it || it.stock <= 0) return;
  if (!actor?.isOwner) return ui.notifications.warn("GENESYS.Loot.NoReceiver", { localize: true });
  const price = it.data.system?.price ?? 0;
  if ((actor.system.money ?? 0) < price) return ui.notifications.warn("GENESYS.Wizard.NoMoney", { localize: true });
  const chk = rarityCheck(it.rarity);
  if (chk.difficulty > 0) {
    const skillKey = isRestricted(it.data) ? "streetwise" : "negotiation";
    const skill = actor.getSkill(skillKey);
    if (!skill) return ui.notifications.warn(game.i18n.format("GENESYS.Warn.SkillNotFound", { name: game.i18n.localize(`GENESYS.Skill.${skillKey}`) }));
    const roll = await actor.rollSkill(skill, { difficulty: chk.difficulty, upgrades: chk.upgrades, label: game.i18n.format("GENESYS.Shop.FindLabel", { name: it.data.name }) });
    if (!roll?.results?.isSuccess) return ui.notifications.info(game.i18n.format("GENESYS.Shop.NotFound", { name: it.data.name }));
  }
  await actor.update({ "system.money": (actor.system.money ?? 0) - price });
  const data = foundry.utils.deepClone(it.data);
  if (data.system) data.system.quantity = 1;
  await actor.createEmbeddedDocuments("Item", [data]);
  await ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor }),
    content: `<div class="genesys spend-report">${game.i18n.format("GENESYS.Shop.Bought", { name: esc(actor.name), item: esc(it.data.name), price })}</div>` });
  if (game.user.isGM) return takeStock(message, index);
  game.socket.emit(SOCKET, { type: "shopStock", messageId: message.id, index });
}

/** Продажа предмета персонажа: проверка по редкости, ¼ / ½ / ¾ цены. */
async function sell(message) {
  const state = message.getFlag(SYSTEM_ID, "shop");
  const actor = buyer();
  if (!actor?.isOwner) return ui.notifications.warn("GENESYS.Loot.NoReceiver", { localize: true });
  const items = actor.items.filter(i => ["weapon", "armor", "gear"].includes(i.type) && (i.system.price ?? 0) > 0);
  if (!items.length) return ui.notifications.warn("GENESYS.Shop.NothingToSell", { localize: true });
  const options = items.map(i => `<option value="${i.id}">${esc(i.name)} — ${i.system.price}</option>`).join("");
  const id = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("GENESYS.Shop.Sell") },
    content: `<p>${game.i18n.localize("GENESYS.Shop.SellHint")}</p><select name="item">${options}</select>`,
    ok: { label: game.i18n.localize("GENESYS.Shop.Sell"), callback: (ev, button) => button.form.elements.item.value },
    rejectClose: false
  });
  const item = actor.items.get(id);
  if (!item) return;
  const rarity = (item.system.rarity ?? 0) + (state?.locMod ?? 0);
  const chk = rarityCheck(rarity);
  const skill = actor.getSkill(isRestricted(item) ? "streetwise" : "negotiation");
  const roll = skill ? await actor.rollSkill(skill, { difficulty: chk.difficulty, upgrades: chk.upgrades, label: game.i18n.format("GENESYS.Shop.SellLabel", { name: item.name }) }) : null;
  const s = roll?.results?.success ?? 0;
  if (!roll?.results?.isSuccess) return ui.notifications.info(game.i18n.format("GENESYS.Shop.NoBuyer", { name: item.name }));
  const share = s >= 3 ? 0.75 : s === 2 ? 0.5 : 0.25;
  const money = Math.floor((item.system.price ?? 0) * share);
  const qty = item.system.quantity ?? 1;
  if (qty > 1) await item.update({ "system.quantity": qty - 1 }); else await item.delete();
  await actor.update({ "system.money": (actor.system.money ?? 0) + money });
  await ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor }),
    content: `<div class="genesys spend-report">${game.i18n.format("GENESYS.Shop.Sold", { name: esc(actor.name), item: esc(item.name), money, share: Math.round(share * 100) })}</div>` });
}

export function registerMerchant() {
  game.socket.on(SOCKET, async payload => {
    if (payload?.type !== "shopStock" || !game.user.isActiveGM) return;
    const message = game.messages.get(payload.messageId);
    if (message) await takeStock(message, payload.index);
  });
  Hooks.on("renderChatMessageHTML", (message, html) => {
    html.querySelectorAll("[data-genesys-shop]").forEach(btn => btn.addEventListener("click", ev => {
      ev.preventDefault();
      if (btn.dataset.genesysShop === "buy") buy(message, Number(btn.dataset.index));
      else sell(message);
    }));
  });
}
