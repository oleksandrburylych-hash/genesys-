import { GENESYS, SYSTEM_PATH } from "./config.mjs";
import { getTargets, actOnActor } from "./combat/combat.mjs";

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

export function registerChatHandlers() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
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
            await actOnActor(t, "damage", {
              damage: Number(btn.dataset.damage) || 0,
              pierce: w.pierce ?? 0, breach: w.breach ?? 0, stun: !!w.stun, source: w.name ?? ""
            });
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
            if (cfg.status) await actOnActor(t, "status", { status: cfg.status, active: true });
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
