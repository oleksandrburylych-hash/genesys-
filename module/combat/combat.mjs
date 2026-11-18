import { GENESYS, SYSTEM_ID } from "../config.mjs";
import { applyTimedStatus } from "./conditions.mjs";
import { injuryPoolModifiers } from "../injuries.mjs";

/**
 * Боевая автоматика: цели, дистанция, защита, урон, состояния.
 * Всё, что меняет чужих актёров, при нехватке прав уходит через сокет активному ведущему.
 */

const SOCKET = `system.${SYSTEM_ID}`;

/* -------------------------------------------- */
/*  Цели и дистанция                            */
/* -------------------------------------------- */

/** Наведённые цели пользователя: [{token, actor}]. */
export function getTargets() {
  return [...(game.user.targets ?? [])].filter(t => t.actor).map(t => ({ token: t, actor: t.actor }));
}

/** Токен актёра на текущей сцене (выделенный, иначе первый активный). */
export function getActorToken(actor) {
  if (!actor || !canvas?.ready) return null;
  const controlled = canvas.tokens.controlled.find(t => t.actor === actor);
  if (controlled) return controlled;
  return actor.getActiveTokens?.(true, false)?.[0] ?? null;
}

/** Пороги дистанций из настроек мира. */
function thresholds() {
  const out = { ...GENESYS.rangeThresholds };
  for (const band of Object.keys(out)) {
    const key = `range${band[0].toUpperCase()}${band.slice(1)}`;
    try { out[band] = Number(game.settings.get(SYSTEM_ID, key)) || out[band]; } catch { /* настройка ещё не зарегистрирована */ }
  }
  return out;
}

/** Расстояние между токенами в единицах сцены. */
export function tokenDistance(a, b) {
  if (!a || !b || !canvas?.grid) return null;
  try {
    return canvas.grid.measurePath([a.center, b.center]).distance;
  } catch {
    const px = Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y);
    return px / canvas.grid.size * canvas.grid.distance;
  }
}

/** Диапазон дистанции между токенами: engaged | short | medium | long | extreme. */
export function rangeBand(a, b) {
  const d = tokenDistance(a, b);
  if (d === null) return null;
  const t = thresholds();
  if (d <= t.engaged) return "engaged";
  if (d <= t.short) return "short";
  if (d <= t.medium) return "medium";
  if (d <= t.long) return "long";
  return "extreme";
}

const RANGE_ORDER = ["engaged", "short", "medium", "long", "extreme", "strategic"];
/** Базовая сложность дальнобойной атаки по диапазону. */
const RANGED_DIFFICULTY = { engaged: 1, short: 1, medium: 2, long: 3, extreme: 4, strategic: 4 };

/** Защита цели (ближняя/дальняя) для любого типа актёра. */
export function targetDefense(actor, melee) {
  const d = actor?.system?.defense;
  if (!d) return 0;
  if (actor.type === "vehicle") return Math.max(d.fore ?? 0, d.aft ?? 0, d.port ?? 0, d.starboard ?? 0);
  return (melee ? d.melee?.value : d.ranged?.value) ?? 0;
}

/** Ранг таланта «Противник» (Adversary) у актёра. */
export function adversaryRank(actor) {
  const t = actor?.itemTypes?.talent?.find(i => i.getFlag(SYSTEM_ID, "nameEn") === "Adversary" || /^Противник/.test(i.name));
  return t ? Math.max(1, t.system.rank ?? 1) : 0;
}

/** Есть ли у токена-цели союзник цели вплотную (т.е. цель сцепилась с кем-то из «наших»). */
function engagedWithAlly(attackerToken, targetToken) {
  if (!attackerToken || !targetToken || !canvas?.tokens) return false;
  const t = thresholds();
  return canvas.tokens.placeables.some(tok => tok !== attackerToken && tok !== targetToken && tok.actor
    && tok.document.disposition === attackerToken.document.disposition
    && (tokenDistance(tok, targetToken) ?? Infinity) <= t.engaged);
}

/** Есть ли враги вплотную к атакующему. */
function engagedWithEnemy(attackerToken) {
  if (!attackerToken || !canvas?.tokens) return false;
  const t = thresholds();
  return canvas.tokens.placeables.some(tok => tok !== attackerToken && tok.actor
    && tok.document.disposition !== attackerToken.document.disposition && tok.document.disposition !== 0
    && (tokenDistance(tok, attackerToken) ?? Infinity) <= t.engaged);
}

/**
 * Модификаторы атаки оружием по цели.
 * @returns {{difficulty:number, setback:number, boost:number, upgrades:number, notes:string[], blocked:boolean, range:string|null}}
 */
export function attackModifiers(attacker, weapon, target) {
  const sys = weapon.system;
  const melee = sys.isMelee || ["melee", "meleeLight", "meleeHeavy", "brawl"].includes(sys.skill);
  const res = { difficulty: melee ? 2 : (RANGED_DIFFICULTY[sys.range] ?? 2), setback: 0, boost: 0, upgrades: 0, notes: [], blocked: false, range: null };
  const i18n = (k, d) => game.i18n.format(k, d ?? {});
  const attackerToken = getActorToken(attacker);

  if (target) {
    const band = rangeBand(attackerToken, target.token);
    res.range = band;
    if (band) {
      res.notes.push(i18n("GENESYS.Combat.Range", { range: game.i18n.localize(GENESYS.ranges[band]?.label ?? band) }));
      if (melee && band !== "engaged") res.notes.push(i18n("GENESYS.Combat.NotEngaged"));
      if (!melee) {
        res.difficulty = RANGED_DIFFICULTY[band] ?? res.difficulty;
        if (RANGE_ORDER.indexOf(band) > RANGE_ORDER.indexOf(sys.range)) res.notes.push(i18n("GENESYS.Combat.OutOfRange"));
      }
    }
    // Защита цели → кости штрафа.
    const def = targetDefense(target.actor, melee);
    if (def > 0) { res.setback += def; res.notes.push(i18n("GENESYS.Combat.Defense", { value: def })); }
    // Талант «Противник» → усиление сложности.
    const adv = adversaryRank(target.actor);
    if (adv > 0) { res.upgrades += adv; res.notes.push(i18n("GENESYS.Combat.Adversary", { rank: adv })); }
    // Оборонительная тактика / Шаг в сторону: усиление на ранг, выбранный целью.
    const guard = guardUpgrades(target.actor, melee);
    if (guard > 0) { res.upgrades += guard; res.notes.push(i18n(melee ? "GENESYS.Reaction.StanceActive" : "GENESYS.Reaction.SideStepActive", { value: guard })); }
    // Уклонение: цель может усилить сложность, получив усталость (решается в окне броска).
    const dodge = talentRank(target.actor, /^dodge$/i, /^Уклонение$/i);
    if (dodge > 0 && target.actor.system.strain) res.dodge = { rank: dodge, uuid: target.actor.uuid, name: target.actor.name };
    // Лежачая цель.
    if (target.actor.statuses?.has("prone")) {
      if (melee) { res.boost += 1; res.notes.push(i18n("GENESYS.Combat.ProneMelee")); }
      else { res.setback += 1; res.notes.push(i18n("GENESYS.Combat.ProneRanged")); }
    }
    // Цель сцепилась с союзником — дальняя атака усиливается.
    if (!melee && engagedWithAlly(attackerToken, target.token)) {
      res.upgrades += 1; res.notes.push(i18n("GENESYS.Combat.EngagedAlly"));
    }
  }

  // Стрельба, когда враг вплотную (Таблица I.6–4).
  if (!melee && engagedWithEnemy(attackerToken)) {
    if (sys.skill === "gunnery") { res.blocked = true; res.notes.push(i18n("GENESYS.Combat.GunneryEngaged")); }
    else {
      const twoHanded = ["rangedHeavy", "ranged"].includes(sys.skill) && sys.skill !== "rangedLight";
      const add = sys.skill === "rangedLight" ? 1 : (twoHanded ? 2 : 1);
      res.difficulty += add;
      res.notes.push(i18n("GENESYS.Combat.ShootingEngaged", { value: add }));
    }
  }
  // Бой транспорта (Core Rulebook, с. 227–230): Уклонение и Получение преимущества.
  const flag = (a, status, key) => a?.effects?.find(e => e.statuses?.has(status))?.getFlag(SYSTEM_ID, key);
  const hasStatus = (a, status) => !!a?.effects?.some(e => e.statuses?.has(status));
  if (target?.actor?.type === "vehicle" && hasStatus(target.actor, "evasive")) { res.upgrades += 1; res.notes.push(i18n("GENESYS.Vehicle.EvasiveTarget")); }
  if (attacker?.type === "vehicle" && hasStatus(attacker, "evasive")) { res.upgrades += 1; res.notes.push(i18n("GENESYS.Vehicle.EvasiveSelf")); }
  if (attacker?.type === "vehicle" && target?.actor) {
    if (flag(attacker, "vehicleAdvantage", "over") === target.actor.uuid) { res.abilityUpgrades = (res.abilityUpgrades ?? 0) + 2; res.notes.push(i18n("GENESYS.Vehicle.AdvantageOurs")); }
    if (flag(target.actor, "vehicleAdvantage", "over") === attacker.uuid) { res.upgrades += 2; res.notes.push(i18n("GENESYS.Vehicle.AdvantageTheirs")); }
  }
  // Атакующий лежит и бьёт в ближнем бою.
  if (melee && attacker?.statuses?.has("prone")) { res.setback += 1; res.notes.push(i18n("GENESYS.Combat.AttackerProne")); }
  return res;
}

/** Ранг таланта по английскому названию (флаг nameEn) или русскому имени. */
export function talentRank(actor, re, ruRe = null) {
  let rank = 0;
  for (const t of actor?.itemTypes?.talent ?? []) {
    const en = t.flags?.[SYSTEM_ID]?.nameEn ?? "";
    if (re.test(en) || (ruRe && ruRe.test(t.name))) rank += t.system.ranked ? (t.system.rank || 1) : 1;
  }
  return rank;
}

/** Активные «Оборонительная тактика» (ближний бой) или «Шаг в сторону» (дальний бой) у цели. */
function guardUpgrades(actor, melee) {
  const effect = actor?.effects?.find(e => e.statuses?.has(melee ? "defensiveStance" : "sideStep"));
  return effect?.getFlag(SYSTEM_ID, "upgrades") ?? 0;
}

/* -------------------------------------------- */
/*  Урон, усталость, состояния                  */
/* -------------------------------------------- */

/** Выполнить действие над актёром: сам, если есть права, иначе через ведущего. */
export async function actOnActor(actor, action, data) {
  if (!actor) return;
  if (actor.isOwner) return ACTIONS[action]?.(actor, data);
  if (!game.users.activeGM) return ui.notifications.warn("GENESYS.StoryPoints.NoGM", { localize: true });
  game.socket.emit(SOCKET, { type: "actorAction", action, actorUuid: actor.uuid, data, userId: game.user.id });
}

/** Обработчик запросов на стороне ведущего. */
export function registerCombatSocket() {
  game.socket.on(SOCKET, async payload => {
    if (payload?.type !== "actorAction" || !game.user.isActiveGM) return;
    const actor = await fromUuid(payload.actorUuid);
    if (actor) await ACTIONS[payload.action]?.(actor, payload.data);
  });
}

/** Поглощение актёра. */
function soakOf(actor) {
  if (actor.type === "vehicle") return actor.system.armor ?? 0;
  return actor.system.soak?.value ?? 0;
}

const ACTIONS = {
  /**
   * Нанести урон: поглощение (минус Проникающее и Бронебойное ×10), Оглушающий урон → усталость.
   * data: { damage, pierce, breach, stun, source }
   */
  async damage(actor, { damage = 0, pierce = 0, breach = 0, stun = false, source = "" } = {}) {
    const soak = soakOf(actor);
    const effSoak = Math.max(0, soak - pierce - breach * 10);
    const taken = Math.max(0, damage - effSoak);
    const sys = actor.system;
    let path;
    if (actor.type === "vehicle") path = "system.hullTrauma.value";
    else if (stun && sys.strain?.max > 0) path = "system.strain.value";
    else path = "system.wounds.value";
    const before = foundry.utils.getProperty(actor, path) ?? 0;
    await actor.update({ [path]: before + taken });
    await ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor }),
      content: `<div class="genesys damage-report">${game.i18n.format(stun ? "GENESYS.Combat.StrainTaken" : "GENESYS.Combat.DamageTaken", {
        name: foundry.utils.escapeHTML(actor.name), damage, soak: effSoak, taken })}${source ? ` <span class="hint">(${foundry.utils.escapeHTML(source)})</span>` : ""}</div>`
    });
    await checkThresholds(actor);
  },

  /** Добавить/снять усталость или раны: data { wounds, strain } (знак — направление). */
  async adjust(actor, { wounds = 0, strain = 0 } = {}) {
    const sys = actor.system;
    const upd = {};
    if (wounds && sys.wounds) upd["system.wounds.value"] = Math.max(0, sys.wounds.value + wounds);
    if (strain && sys.strain) upd["system.strain.value"] = Math.max(0, sys.strain.value + strain);
    if (Object.keys(upd).length) await actor.update(upd);
    if (wounds > 0 || strain > 0) await checkThresholds(actor);
  },

  /** Повесить состояние. data { status, active, rounds, burn, source } */
  async status(actor, { status, active = true, rounds = 0, burn = 0, source = "" } = {}) {
    if (active && (rounds || burn)) return applyTimedStatus(actor, status, { rounds, burn, source });
    await actor.toggleStatusEffect(status, { active });
  },

  /** Оборонительная тактика / Шаг в сторону: data { status, upgrades } — усталость и состояние до конца следующего хода. */
  async guard(actor, { status, upgrades = 1 } = {}) {
    await ACTIONS.adjust(actor, { strain: upgrades });
    await applyTimedStatus(actor, status, { rounds: 2 });
    const effect = actor.effects.find(e => e.statuses?.has(status));
    if (effect) await effect.setFlag(SYSTEM_ID, "upgrades", upgrades);
  },

  /** Болеутоляющее: data { kind: wounds|strain, bonus, item, by }. Считает принятые за день, лечит 5/4/3/2/1 (+ранги таланта). */
  async painkiller(actor, { kind = "wounds", bonus = 0, item = "", by = "" } = {}) {
    const { painkillersUsed, painkillerHeal } = await import("../gear.mjs");
    const used = painkillersUsed(actor, kind);
    const track = kind === "strain" ? actor.system.strain : actor.system.wounds;
    if (!track) return;
    const healed = Math.min(painkillerHeal(used, bonus), track.value);
    const path = kind === "strain" ? "system.strain.value" : "system.wounds.value";
    await actor.update({ [path]: track.value - healed, [`flags.${SYSTEM_ID}.painkillers.${kind}`]: used + 1 });
    if (kind === "wounds" && actor.statuses?.has("incapacitated") && track.value - healed <= track.max) await actor.toggleStatusEffect("incapacitated", { active: false });
    const esc = foundry.utils.escapeHTML;
    await ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor }),
      content: `<div class="genesys status-report painkiller-report"><i class="fa-solid fa-pills"></i> ${game.i18n.format(kind === "strain" ? "GENESYS.Painkiller.ReportStrain" : "GENESYS.Painkiller.Report", {
        by: esc(by || actor.name), name: esc(actor.name), item: esc(item), value: healed, n: used + 1, left: Math.max(0, 4 - used) })}${bonus ? ` <small>(${game.i18n.format("GENESYS.Painkiller.Talent", { value: bonus })})</small>` : ""}</div>`
    });
  },

  /** Бросок критической травмы. data { modifier } */
  async critical(actor, { modifier = 0 } = {}) {
    await actor.rollCriticalInjury({ modifier });
  }
};

/** Проверить пороги: выведение из строя, гибель приспешников и соперников, крит. */
export async function checkThresholds(actor) {
  const sys = actor.system;
  if (actor.type === "vehicle") return;
  const woundsOver = sys.wounds && sys.wounds.value > (actor.type === "adversary" && sys.isMinion ? sys.groupWounds : sys.wounds.max);
  const strainOver = sys.strain?.max > 0 && sys.strain.value > sys.strain.max;

  if (actor.type === "adversary" && (sys.isMinion || sys.adversaryType === "rival")) {
    // Приспешники и соперники выбывают сразу при превышении порога ран (или усталости).
    if ((woundsOver || strainOver || (sys.isMinion && sys.aliveMinions === 0)) && !actor.statuses.has("dead")) {
      await actor.toggleStatusEffect("dead", { active: true, overlay: true });
      await announce(actor, "GENESYS.Combat.Defeated");
    }
    return;
  }
  if ((woundsOver || strainOver) && !actor.statuses.has("incapacitated")) {
    await actor.toggleStatusEffect("incapacitated", { active: true, overlay: true });
    await announce(actor, "GENESYS.Combat.Incapacitated");
    // Превышение порога ран — критическая травма.
    if (woundsOver && game.settings.get(SYSTEM_ID, "autoCritOnThreshold")) await actor.rollCriticalInjury();
  }
}

async function announce(actor, key) {
  return ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor }),
    content: `<div class="genesys status-report"><strong>${game.i18n.format(key, { name: foundry.utils.escapeHTML(actor.name) })}</strong></div>`
  });
}

/* -------------------------------------------- */
/*  Модификаторы проверок от состояния          */
/* -------------------------------------------- */

/**
 * Применить к пулу модификаторы от состояний актёра (дезориентация, перегруз, критические травмы).
 * @returns {string[]} пояснения
 */
export function applyStateModifiers(actor, pool, { characteristic, skillKey } = {}) {
  const notes = [];
  if (!actor) return notes;
  if (actor.statuses?.has("disoriented")) { pool.setback += 1; notes.push(game.i18n.localize("GENESYS.Combat.Disoriented")); }
  if (actor.statuses?.has("staggered")) notes.push(game.i18n.localize("GENESYS.Combat.StaggeredNote"));
  const excess = actor.system?.encumbrance?.excess ?? 0;
  if (excess > 0 && ["brawn", "agility"].includes(characteristic)) {
    pool.setback += excess;
    notes.push(game.i18n.format("GENESYS.Combat.Overencumbered", { value: excess }));
  }
  // Критические травмы с постоянным штрафом (поле setback у травмы).
  for (const inj of actor.itemTypes?.injury ?? []) {
    const sb = inj.system.setback ?? 0;
    if (sb > 0) { pool.setback += sb; notes.push(game.i18n.format("GENESYS.Combat.InjuryPenalty", { name: inj.name, value: sb })); }
  }
  // Механика критических травм Core (сложность, усиление, без бонуса, «к следующей проверке»).
  notes.push(...injuryPoolModifiers(actor, pool, { characteristic, skillKey }));
  return notes;
}
