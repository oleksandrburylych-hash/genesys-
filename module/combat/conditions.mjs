import { SYSTEM_ID } from "../config.mjs";
import { actOnActor } from "./combat.mjs";

/**
 * Состояния с длительностью в раундах и Жжение.
 *
 * Длительность хранится во флагах эффекта: flags.genesys-rpg.rounds (сколько ходов цели осталось)
 * и flags.genesys-rpg.burn (урон Жжения за ход). В бою ведущий не отсчитывает их руками:
 *   — в начале хода участника Жжение наносит урон (поглощение учитывается, один раз за раунд);
 *   — в конце хода участника счётчики уменьшаются, истёкшие состояния снимаются с сообщением в чат.
 * Вне боя длительность не тикает — состояния снимаются вручную.
 */

const F = SYSTEM_ID;

/** Эффект состояния на актёре. */
function statusEffect(actor, status) {
  return actor.effects.find(e => e.statuses?.has(status));
}

/**
 * Повесить состояние на rounds ходов цели (0 — без ограничения). Повторное наложение продлевает.
 * @param {Actor} actor
 * @param {string} status
 * @param {{rounds?: number, burn?: number, source?: string}} opts
 */
export async function applyTimedStatus(actor, status, { rounds = 0, burn = 0, source = "" } = {}) {
  let effect = statusEffect(actor, status);
  if (!effect) {
    await actor.toggleStatusEffect(status, { active: true });
    effect = statusEffect(actor, status);
  }
  if (!effect) return;
  const prev = effect.getFlag(F, "rounds") ?? 0;
  const update = {};
  if (rounds > 0) update[`flags.${F}.rounds`] = Math.max(prev, rounds);
  if (burn > 0) update[`flags.${F}.burn`] = Math.max(effect.getFlag(F, "burn") ?? 0, burn);
  if (source) update[`flags.${F}.source`] = source;
  if (Object.keys(update).length) await effect.update(update);
}

/** Сколько ходов осталось у состояния (для подсказок). */
export function statusRounds(actor, status) {
  return statusEffect(actor, status)?.getFlag(F, "rounds") ?? 0;
}

async function say(actor, html) {
  return ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor }),
    content: `<div class="genesys status-report">${html}</div>`
  });
}

/** Начало хода: урон Жжения. */
async function startOfTurn(combat, combatant) {
  const actor = combatant?.actor;
  if (!actor || combatant.getFlag(F, "burnRound") === combat.round) return;
  const burning = statusEffect(actor, "burning");
  if (!burning) return;
  await combatant.setFlag(F, "burnRound", combat.round);
  const damage = burning.getFlag(F, "burn") ?? 0;
  if (damage > 0) {
    await actOnActor(actor, "damage", { damage, source: game.i18n.localize("GENESYS.Status.burning") });
    await say(actor, game.i18n.format("GENESYS.Conditions.BurnHint", { name: foundry.utils.escapeHTML(actor.name) }));
  }
}

/** Конец хода: уменьшить счётчики, снять истёкшие состояния. */
async function endOfTurn(combat, combatant) {
  const actor = combatant?.actor;
  if (!actor || combatant.getFlag(F, "tickRound") === combat.round) return;
  await combatant.setFlag(F, "tickRound", combat.round);
  const expired = [];
  for (const effect of actor.effects) {
    const rounds = effect.getFlag(F, "rounds");
    if (!rounds) continue;
    if (rounds <= 1) expired.push(effect);
    else await effect.update({ [`flags.${F}.rounds`]: rounds - 1 });
  }
  for (const effect of expired) {
    const name = effect.name;
    await effect.delete();
    await say(actor, game.i18n.format("GENESYS.Conditions.Expired", { name: foundry.utils.escapeHTML(actor.name), status: foundry.utils.escapeHTML(name) }));
  }
}

/** Хуки боя (обрабатывает только активный ведущий). */
export function registerConditionHooks() {
  Hooks.on("updateCombat", async (combat, changed, options) => {
    if (!game.user.isActiveGM) return;
    if (!("turn" in changed) && !("round" in changed)) return;
    // Обмен слотами инициативы ПИ: предыдущий участник на самом деле не ходил.
    if (!options?.genesysSlotSwap) {
      const prevId = combat.previous?.combatantId;
      const prev = prevId ? combat.combatants.get(prevId) : null;
      if (prev && prev.id !== combat.combatant?.id) await endOfTurn(combat, prev);
    }
    if (combat.combatant) await startOfTurn(combat, combat.combatant);
  });
  // Конец боя: состояния с длительностью в раундах заканчиваются вместе со встречей.
  Hooks.on("deleteCombat", async combat => {
    if (!game.user.isActiveGM) return;
    for (const c of combat.combatants) {
      const ids = c.actor?.effects.filter(e => e.getFlag(F, "rounds")).map(e => e.id) ?? [];
      if (ids.length) await c.actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    }
  });
}
