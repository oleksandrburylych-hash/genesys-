import { GENESYS, SYSTEM_PATH, SYSTEM_ID } from "./config.mjs";
import { getTargets, actOnActor, talentRank } from "./combat/combat.mjs";

const SOCKET = `system.${SYSTEM_ID}`;
const MELEE_SKILLS = ["melee", "meleeLight", "meleeHeavy", "brawl"];

/**
 * Может ли цель парировать попадание: талант «Парирование» и оружие ближнего боя в руках;
 * с талантом «Блок» (Терринот) и щитом — также дальние атаки.
 * @returns {number} на сколько снижается урон (0 — нельзя)
 */
function parryValue(actor, melee) {
  const parry = talentRank(actor, /^parry$/i, /^Парирование$/i);
  if (!parry) return 0;
  const weapons = actor.itemTypes?.weapon ?? [];
  const held = w => w.system.equipped !== false;
  if (melee) return weapons.some(w => held(w) && MELEE_SKILLS.includes(w.system.skill)) ? 2 + parry : 0;
  const block = talentRank(actor, /^block$/i, /^Блок$/i);
  const shield = [...weapons, ...(actor.itemTypes?.armor ?? [])].some(i => held(i) && /щит|shield/i.test(i.name));
  return block && shield ? 2 + parry : 0;
}

/** Карточка реакции «Парировать / Принять удар»; урон применится после выбора. */
async function offerParry(target, data, value) {
  const name = foundry.utils.escapeHTML(target.name);
  return ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: target }),
    content: `<div class="genesys reaction-card"><p>${game.i18n.format("GENESYS.Reaction.ParryOffer", { name, damage: data.damage, value })}</p>
      <div class="reaction-buttons">
        <button type="button" data-genesys-react="parry"><i class="fa-solid fa-shield-halved"></i> ${game.i18n.format("GENESYS.Reaction.ParryButton", { value })}</button>
        <button type="button" data-genesys-react="take"><i class="fa-solid fa-heart-crack"></i> ${game.i18n.localize("GENESYS.Reaction.Take")}</button>
      </div></div>`,
    flags: { [SYSTEM_ID]: { reaction: { targetUuid: target.uuid, value, data, resolved: false } } }
  });
}

/** Выполнить выбранную реакцию (на стороне ведущего или владельца сообщения). */
async function resolveReaction(message, choice) {
  const r = message.getFlag(SYSTEM_ID, "reaction");
  if (!r || r.resolved) return;
  const target = await fromUuid(r.targetUuid);
  if (!target) return;
  await message.update({ [`flags.${SYSTEM_ID}.reaction.resolved`]: true });
  const data = { ...r.data };
  let text;
  if (choice === "parry") {
    await actOnActor(target, "adjust", { strain: 3 });
    data.damage = Math.max(0, data.damage - r.value);
    text = game.i18n.format("GENESYS.Reaction.Parried", { name: foundry.utils.escapeHTML(target.name), value: r.value });
  } else text = game.i18n.format("GENESYS.Reaction.Took", { name: foundry.utils.escapeHTML(target.name) });
  await message.update({ content: `<div class="genesys reaction-card resolved"><p>${text}</p></div>` });
  await actOnActor(target, "damage", data);
}

/**
 * Кнопки на карточках бросков: урон по цели, крит, активация свойств, трата символов.
 */

/** Таблицы траты символов (загружаются из module/data/spending.json). */
export async function loadSpendingTables() {
  try {
    const res = await fetch(`${SYSTEM_PATH}/module/data/spending.json`);
    GENESYS.spending = res.ok ? await res.json() : {};
  } catch { GENESYS.spending = {}; }
}

/** Данные мастера создания: таблицы мотиваций, стартовые деньги (module/data/creation.json). */
export async function loadCreationData() {
  try {
    const res = await fetch(`${SYSTEM_PATH}/module/data/creation.json`);
    GENESYS.creation = res.ok ? await res.json() : {};
  } catch { GENESYS.creation = {}; }
}

/** Цели для применения эффекта: цель из броска, иначе наведённые, иначе выделенные. */
async function resolveTargets(roll) {
  const uuid = roll?.options?.target?.uuid;
  if (uuid) {
    const actor = await fromUuid(uuid);
    if (actor) return [actor];
  }
  const targets = getTargets().map(t => t.actor);
  if (targets.length) return targets;
  return (canvas?.tokens?.controlled ?? []).map(t => t.actor).filter(Boolean);
}

/** Актёр, сделавший бросок. */
function rollActor(message) {
  return ChatMessage.implementation.getSpeakerActor(message.speaker);
}

/** Сообщение в чат от имени актёра. */
function say(actor, html) {
  return ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor }),
    content: `<div class="genesys spend-report">${html}</div>`
  });
}

/** Реакции, выбранные игроками без прав на сообщение, выполняет ведущий (вызывается в ready). */
export function registerReactionSocket() {
  game.socket.on(SOCKET, async payload => {
    if (payload?.type !== "reaction" || !game.user.isActiveGM) return;
    const message = game.messages.get(payload.messageId);
    if (message) await resolveReaction(message, payload.choice);
  });
}

export function registerChatHandlers() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    html.querySelectorAll("[data-genesys-react]").forEach(btn => btn.addEventListener("click", async event => {
      event.preventDefault();
      const r = message.getFlag(SYSTEM_ID, "reaction");
      if (!r || r.resolved) return;
      const target = await fromUuid(r.targetUuid);
      if (!game.user.isGM && !target?.isOwner) return ui.notifications.warn("GENESYS.Reaction.NotYours", { localize: true });
      const choice = btn.dataset.genesysReact;
      if (message.isOwner) return resolveReaction(message, choice);
      if (!game.users.activeGM) return ui.notifications.warn("GENESYS.StoryPoints.NoGM", { localize: true });
      game.socket.emit(SOCKET, { type: "reaction", messageId: message.id, choice });
    }));

    const roll = message.rolls?.[0];
    html.querySelectorAll("[data-genesys-action]").forEach(btn => {
      btn.addEventListener("click", async event => {
        event.preventDefault();
        const action = btn.dataset.genesysAction;
        const w = roll?.options?.weapon ?? {};
        const actor = rollActor(message);

        if (action === "applyDamage") {
          const targets = await resolveTargets(roll);
          if (!targets.length) return ui.notifications.warn("GENESYS.Warn.NoTokenSelected", { localize: true });
          for (const t of targets) {
            const data = {
              damage: Number(btn.dataset.damage) || 0,
              pierce: w.pierce ?? 0, breach: w.breach ?? 0, stun: !!w.stun, source: w.name ?? ""
            };
            // Парирование: цель решает до применения поглощения.
            const parry = t.system?.strain ? parryValue(t, !!roll?.options?.melee) : 0;
            if (parry > 0 && data.damage > 0) await offerParry(t, data, parry);
            else await actOnActor(t, "damage", data);
          }
        }

        else if (action === "applyCrit") {
          const targets = await resolveTargets(roll);
          if (!targets.length) return ui.notifications.warn("GENESYS.Warn.NoTokenSelected", { localize: true });
          for (const t of targets) await actOnActor(t, "critical", { modifier: Number(btn.dataset.modifier) || 0 });
        }

        else if (action === "activateQuality") {
          const name = btn.dataset.quality;
          const rating = Number(btn.dataset.rating) || 0;
          const cfg = GENESYS.activeQualities[name] ?? {};
          const targets = await resolveTargets(roll);
          for (const t of targets) {
            if (cfg.status) await actOnActor(t, "status", {
              status: cfg.status, active: true, source: w.name ?? name,
              rounds: cfg.timed ? Math.max(1, rating) : 0,
              burn: cfg.burn ? (w.damage ?? 0) : 0
            });
            if (cfg.strain) await actOnActor(t, "adjust", { strain: rating || 1 });
          }
          const who = targets.map(t => foundry.utils.escapeHTML(t.name)).join(", ");
          const note = cfg.note ? ` ${game.i18n.localize(cfg.note)}` : "";
          await say(actor, game.i18n.format("GENESYS.Spend.Quality", { name, rating: rating || "", targets: who || "—" }) + note);
        }

        else if (action === "spend") {
          const row = GENESYS.spending?.[btn.dataset.table]?.rows?.[Number(btn.dataset.row)];
          if (!row) return;
          await say(actor, `<strong>${foundry.utils.escapeHTML(row.cost)}</strong>: ${foundry.utils.escapeHTML(row.text)}`);
          // Простая автоматика: восстановление/получение усталости заклинателем или атакующим.
          const m = row.text.match(/(восстанавлива\w*|вылечива\w*|снима\w*|получа\w*|испытыва\w*)\s+(\d+)?\s*(?:ед\w*\s+)?усталост/i);
          if (m && actor) {
            const amount = Number(m[2] ?? 1);
            const sign = /^(получа|испытыва)/i.test(m[1]) ? 1 : -1;
            await actOnActor(actor, "adjust", { strain: sign * amount });
          }
        }
      });
    });
  });
}

/**
 * Подготовить блок «как потратить символы» для карточки броска.
 * @param {object} results  итоги броска (GenesysRoll#results)
 * @param {string} context  combat | magic | social | general
 */
export function spendingOptions(results, context) {
  const tables = GENESYS.spending ?? {};
  const pick = (suffix) => {
    const key = `${context}${suffix}`;
    return tables[key] ? key : (tables[`general${suffix}`] ? `general${suffix}` : null);
  };
  const out = [];
  for (const [key, have] of [[pick("Positive"), { advantage: results.advantage, triumph: results.triumph }],
                             [pick("Negative"), { threat: results.threat, despair: results.despair }]]) {
    if (!key) continue;
    const rows = (tables[key].rows ?? [])
      .map((row, index) => ({ ...row, index, table: key }))
      .filter(row => (have[row.symbol] ?? 0) >= (row.amount ?? 1));
    if (rows.length) out.push({ title: tables[key].title, positive: key.endsWith("Positive"), rows });
  }
  return out;
}
