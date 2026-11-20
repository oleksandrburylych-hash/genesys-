import { SYSTEM_ID } from "./config.mjs";

/**
 * Механика критических травм Core Rulebook (табл. I.6–10): что травма делает сразу и что действует, пока не вылечена.
 * Ключ — английское название (флаг nameEn) или русское имя.
 *
 *   now:       сразу — strain (усталость), status [{id, rounds}], storyPoint (очко сюжета переходит), death
 *   difficulty: { all | brawnAgility | intCun | preWil: n } — +n костей сложности к проверкам, пока травма есть
 *   upgrade:   { all: n, perception: n } — усиление сложности (Слепота)
 *   status:    постоянное состояние, пока травма есть
 *   noBoost:   убрать кости бонуса из проверок
 *   bleed:     раны/усталость в начале каждого хода
 *   charLoss:  "temp" — характеристика (d10) считается на 1 меньше, пока травма есть; "perm" — навсегда −1
 *   next:      к следующей проверке { setback, difficulty }
 *   note:      подсказка в чат (то, что система не автоматизирует)
 */
export const INJURY_EFFECTS = {
  "Minor Nick": { now: { strain: 1 } },
  "Slowed Down": { note: "slowed" },
  "Sudden Jolt": { note: "drop" },
  "Distracted": { note: "noFreeManeuver" },
  "Off-Balance": { next: { setback: 1 } },
  "Discouraging Wound": { now: { storyPoint: true } },
  "Stunned": { now: { status: [{ id: "staggered", rounds: 1 }] } },
  "Stinger": { next: { difficulty: 1 } },
  "Bowled Over": { now: { strain: 1, status: [{ id: "prone" }] } },
  "Head Ringer": { difficulty: { intCun: 1 } },
  "Fearsome Wound": { difficulty: { preWil: 1 } },
  "Agonizing Wound": { difficulty: { brawnAgility: 1 } },
  "Slightly Dazed": { status: "disoriented" },
  "Scattered Senses": { noBoost: true },
  "Hamstrung": { note: "noFreeManeuverLasting" },
  "Overpowered": { note: "extraAttack" },
  "Winded": { note: "noVoluntaryStrain" },
  "Compromised": { difficulty: { all: 1 } },
  "At the Brink": { note: "strainPerAction" },
  "Crippled": { note: "limb" },
  "Maimed": { note: "limbLost", difficulty: { all: 1 } },
  "Horrific Injury": { charLoss: "temp" },
  "Temporarily Disabled": { status: "immobilized" },
  "Blinded": { upgrade: { all: 2, perception: 1 } },
  "Knocked Senseless": { status: "staggered" },
  "Gruesome Injury": { charLoss: "perm" },
  "Bleeding Out": { bleed: { wounds: 1, strain: 1 } },
  "The End Is Nigh": { note: "endNigh" },
  "Dead": { now: { death: true } }
};

const BY_RU = {
  "Небольшая царапина": "Minor Nick", "Замедление": "Slowed Down", "Внезапный толчок": "Sudden Jolt", "Отвлечение": "Distracted",
  "Потеря равновесия": "Off-Balance", "Удручающая рана": "Discouraging Wound", "Остолбенение": "Stunned", "Резкий удар": "Stinger",
  "Сбивание с ног": "Bowled Over", "Звон в ушах": "Head Ringer", "Страшная рана": "Fearsome Wound", "Мучительная рана": "Agonizing Wound",
  "Лёгкое потрясение": "Slightly Dazed", "В растерянных чувствах": "Scattered Senses", "Хромота": "Hamstrung", "Подавленность": "Overpowered",
  "Изнурение": "Winded", "Срыв планов": "Compromised", "На грани": "At the Brink", "Калека": "Crippled", "Уродство": "Maimed",
  "Ужасная травма": "Horrific Injury", "Временная недееспособность": "Temporarily Disabled", "Слепота": "Blinded",
  "Лишение чувств": "Knocked Senseless", "Чудовищная травма": "Gruesome Injury", "Кровотечение": "Bleeding Out",
  "Конец близок": "The End Is Nigh", "Смерть": "Dead"
};

/** Эффект травмы по документу. */
export function injuryEffect(item) {
  const en = item.flags?.[SYSTEM_ID]?.nameEn || BY_RU[item.name] || item.name;
  return INJURY_EFFECTS[en] ?? null;
}

/** d10 → характеристика (Core, «Ужасная травма» / «Чудовищная травма»). */
export function rollInjuryCharacteristic() {
  const n = Math.ceil(Math.random() * 10);
  return n <= 3 ? "brawn" : n <= 6 ? "agility" : n === 7 ? "intellect" : n === 8 ? "cunning" : n === 9 ? "presence" : "willpower";
}

const GROUPS = { brawnAgility: ["brawn", "agility"], intCun: ["intellect", "cunning"], preWil: ["presence", "willpower"] };

/**
 * Модификаторы пула от травм (вызывается из applyStateModifiers).
 * @returns {string[]} пояснения
 */
export function injuryPoolModifiers(actor, pool, { characteristic, skillKey } = {}) {
  const notes = [];
  for (const inj of actor.itemTypes?.injury ?? []) {
    const fx = injuryEffect(inj);
    if (!fx) continue;
    let add = 0;
    for (const [scope, n] of Object.entries(fx.difficulty ?? {})) {
      if (scope === "all" || GROUPS[scope]?.includes(characteristic)) add += n;
    }
    if (add) { pool.difficulty += add; notes.push(game.i18n.format("GENESYS.Injury.NoteDifficulty", { name: inj.name, value: add })); }
    if (fx.upgrade) {
      const n = (fx.upgrade.all ?? 0) + (["perception", "vigilance"].includes(skillKey) ? (fx.upgrade.perception ?? 0) : 0);
      if (n) { pool.upgradeDifficulty(n); notes.push(game.i18n.format("GENESYS.Injury.NoteUpgrade", { name: inj.name, value: n })); }
    }
    if (fx.noBoost && pool.boost) { pool.boost = 0; notes.push(game.i18n.format("GENESYS.Injury.NoteNoBoost", { name: inj.name })); }
    if (fx.note === "strainPerAction") notes.push(game.i18n.format("GENESYS.Injury.NoteStrainPerAction", { name: inj.name }));
  }
  // Разовые: к следующей проверке.
  const next = actor.getFlag?.(SYSTEM_ID, "nextCheck");
  if (next) {
    if (next.setback) { pool.setback += next.setback; notes.push(game.i18n.format("GENESYS.Injury.NoteNextSetback", { value: next.setback })); }
    if (next.difficulty) { pool.difficulty += next.difficulty; notes.push(game.i18n.format("GENESYS.Injury.NoteNextDifficulty", { value: next.difficulty })); }
    pool._consumeNext = actor;
  }
  return notes;
}

/** Временное снижение характеристики от «Ужасной травмы». */
export function injuryCharacteristicPenalty(actor, key) {
  return (actor.itemTypes?.injury ?? []).filter(i => injuryEffect(i)?.charLoss === "temp" && i.system.characteristic === key).length;
}

async function say(actor, key, data = {}) {
  return ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor }),
    content: `<div class="genesys status-report injury-report">${game.i18n.format(key, { name: foundry.utils.escapeHTML(actor.name), ...data })}</div>`
  });
}

/** Применить травму к актёру (выполняет владелец, создавший травму). */
export async function applyInjury(item) {
  const actor = item.parent;
  if (!actor || item.type !== "injury" || item.getFlag(SYSTEM_ID, "applied")) return;
  const fx = injuryEffect(item);
  await item.setFlag(SYSTEM_ID, "applied", true);
  if (!fx) return;
  const { actOnActor } = await import("./combat/combat.mjs");
  const now = fx.now ?? {};
  if (now.strain) await actOnActor(actor, "adjust", { strain: now.strain });
  for (const st of now.status ?? []) await actOnActor(actor, "status", { status: st.id, active: true, rounds: st.rounds ?? 0 });
  if (fx.status) await actOnActor(actor, "status", { status: fx.status, active: true });
  if (fx.status === undefined && fx.bleed) await actOnActor(actor, "status", { status: "bleeding", active: true });
  if (now.death) await actOnActor(actor, "status", { status: "dead", active: true });
  if (now.storyPoint) {
    const { StoryPointsTracker } = await import("./apps/story-points.mjs");
    StoryPointsTracker.request(actor.hasPlayerOwner ? "transferToGM" : "transferToPlayers");
  }
  if (fx.next) await actor.setFlag(SYSTEM_ID, "nextCheck", fx.next);
  if (fx.charLoss) {
    const key = rollInjuryCharacteristic();
    await item.update({ "system.characteristic": key });
    const label = game.i18n.localize(`GENESYS.Characteristic.${key}`);
    if (fx.charLoss === "perm") {
      const v = actor.system.characteristics?.[key]?.value ?? 1;
      await actor.update({ [`system.characteristics.${key}.value`]: Math.max(1, v - 1) });
      await say(actor, "GENESYS.Injury.CharPerm", { char: label });
    } else await say(actor, "GENESYS.Injury.CharTemp", { char: label });
  }
  if (fx.note) await say(actor, `GENESYS.Injury.Note.${fx.note}`, { injury: foundry.utils.escapeHTML(item.name) });
}

/** Вылечили травму: снять постоянные состояния, если их не держит другая травма. */
export async function removeInjury(item) {
  const actor = item.parent;
  const fx = item.type === "injury" ? injuryEffect(item) : null;
  if (!actor || !fx) return;
  const still = id => actor.itemTypes.injury.some(i => i.id !== item.id && (injuryEffect(i)?.status === id || (id === "bleeding" && injuryEffect(i)?.bleed)));
  for (const id of [fx.status, fx.bleed ? "bleeding" : null].filter(Boolean)) {
    if (!still(id) && actor.statuses?.has(id)) await actor.toggleStatusEffect(id, { active: false });
  }
}

/** Кровотечение: в начале хода — раны и усталость (вызывается из conditions.mjs). */
export async function bleedAtTurnStart(actor) {
  for (const inj of actor.itemTypes?.injury ?? []) {
    const b = injuryEffect(inj)?.bleed;
    if (!b) continue;
    const { actOnActor } = await import("./combat/combat.mjs");
    await actOnActor(actor, "adjust", { wounds: b.wounds, strain: b.strain });
    await say(actor, "GENESYS.Injury.Bleed", { wounds: b.wounds, strain: b.strain });
  }
}

/** Хуки: применение при получении, снятие при излечении, расход «следующей проверки». */
export function registerInjuryHooks() {
  Hooks.on("createItem", (item, options, userId) => { if (userId === game.user.id && item.type === "injury" && item.parent) applyInjury(item); });
  Hooks.on("deleteItem", (item, options, userId) => { if (userId === game.user.id && item.type === "injury" && item.parent) removeInjury(item); });
}
