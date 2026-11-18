import { SYSTEM_ID } from "./config.mjs";

/**
 * Снаряжение по правилам Core Rulebook (гл. «Снаряжение»):
 *  — рюкзак: пока персонаж его носит, порог нагрузки +4 (контейнеры не складываются — действует лучший);
 *  — одежда, плащи, сапоги: «надетая имеет нагрузку N»;
 *  — «нагрузка указана за 5 штук» (пайки и т. п.);
 *  — болеутоляющее: манёвр, 5 ран, каждое следующее за день на 1 меньше, шестое — без эффекта;
 *  — киберимпланты: бонусы и снижение порога усталости; импланты дают к параметру не больше +1 (к порогу ран — +2).
 *
 * Явные поля предмета (заданы в листе предмета) важнее; если поле пустое — свойство определяется по названию и тексту.
 */

const strip = html => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

/** Числовые эффекты известных имплантов (Core, «Киберимпланты»). target: soak | wounds | strain | char.<key> | skill.<key> */
const IMPLANT_MODS = [
  { re: /имплантированная броня/i, mods: [{ target: "soak", value: 1 }], strain: 1 },
  { re: /киберглаз/i, mods: [{ target: "skill.vigilance", value: 1 }, { target: "skill.perception", value: 1 }], strain: 1, once: true },
  { re: /кибернетическая (рука|нога)/i, mods: [], strain: 1, once: true },
  { re: /киберорган/i, mods: [], strain: 1 },
  { re: /разъём в черепе/i, mods: [], strain: 1, once: true }
];

/** Свойства предмета снаряжения, выведенные из названия и описания. */
export function inferGear(name, description) {
  const n = String(name ?? "");
  const t = strip(description);
  const out = { thresholdBonus: 0, wornEncumbrance: null, bundle: 1, painkiller: "", implant: false, mods: [], strainPenalty: 0, implantOnce: false };

  // Порог нагрузки (только то, что несёт сам персонаж: седельные сумки — для скакуна).
  const thr = t.match(/порог нагрузки([^.]{0,40})увеличива[а-яё]*\s+на\s+(\d+)/i);
  if (thr && !/скакун|животн/i.test(thr[1])) out.thresholdBonus = Number(thr[2]);
  else if (/^рюкзак$/i.test(n.trim())) out.thresholdBonus = 4;
  const holds = t.match(/вмещает предметы с суммарной нагрузкой до (\d+)/i);
  if (holds && /рюкзак|сумк|мешок|ранец/i.test(n)) out.thresholdBonus = Number(holds[1]);

  // Нагрузка надетого предмета.
  const worn = t.match(/надет[а-яё]*(?:\s+[а-яё]+)?\s+имеет нагрузку\s+(\d+)/i) ?? t.match(/нагрузка надет[а-яё]*(?:\s+[а-яё]+)?\s*[—–-]\s*(\d+)/i);
  if (worn) out.wornEncumbrance = Number(worn[1]);

  // «Нагрузка указана за 5 пайков».
  const bundle = t.match(/нагрузка указана за (\d+)/i);
  if (bundle) out.bundle = Math.max(1, Number(bundle[1]));

  // Болеутоляющее и его аналоги.
  if (/болеутоля/i.test(n) || /действует как болеутоляющее/i.test(t)) out.painkiller = "wounds";
  else if (/восстанавливает 5 усталости/i.test(t) && /каждый следующий[^.]*за (тот же|один) день/i.test(t)) out.painkiller = "strain";

  // Киберимпланты.
  if (/киберимплант/i.test(t)) {
    out.implant = true;
    const rule = IMPLANT_MODS.find(r => r.re.test(n));
    if (rule) { out.mods = rule.mods.map(m => ({ ...m })); out.strainPenalty = rule.strain; out.implantOnce = !!rule.once; }
  }
  return out;
}

/** Итоговые свойства предмета снаряжения: явные поля листа предмета + выведенные из текста. */
export function gearMechanics(item) {
  const s = item.system ?? {};
  const inf = inferGear(item.name, s.description);
  const explicit = v => v !== null && v !== undefined;
  return {
    thresholdBonus: explicit(s.thresholdBonus) ? s.thresholdBonus : inf.thresholdBonus,
    wornEncumbrance: explicit(s.wornEncumbrance) ? s.wornEncumbrance : inf.wornEncumbrance,
    bundle: s.bundle > 1 ? s.bundle : inf.bundle,
    painkiller: s.painkiller === "none" ? "" : (s.painkiller || inf.painkiller),
    implant: s.implant || inf.implant,
    mods: s.mods?.length ? s.mods : inf.mods,
    strainPenalty: inf.strainPenalty,
    implantOnce: inf.implantOnce
  };
}

/** Нагрузка одной позиции (оружие, броня, снаряжение) с учётом количества, надетости и связок. */
export function itemEncumbrance(item, { worn = false } = {}) {
  const s = item.system ?? {};
  const unit = s.totalEncumbrance ?? s.encumbrance ?? 0;
  const qty = Math.max(0, s.quantity ?? 1);
  if (!qty) return 0;
  if (item.type === "armor") return worn ? Math.max(0, unit - 3) + unit * (qty - 1) : unit * qty;
  if (item.type === "gear") {
    const m = gearMechanics(item);
    if (worn && s.equipped && m.wornEncumbrance !== null) return m.wornEncumbrance + unit * (qty - 1);
    if (m.bundle > 1) return unit * Math.ceil(qty / m.bundle);
  }
  return unit * qty;
}

/**
 * Сводка снаряжения персонажа: нагрузка, лучший контейнер, надетый комплект брони, импланты.
 * @returns {{ encumbrance, thresholdBonus, container, suit, extraArmor[], soak, defense, meleePlus, rangedPlus, mods, strainPenalty }}
 */
export function gearSummary(actor) {
  const items = [...(actor.items ?? [])];
  // Броня: учитывается один комплект (Core: «нельзя надеть три комплекта брони, чтобы сложить поглощение»).
  const wornArmor = items.filter(i => i.type === "armor" && i.system.equipped)
    .sort((a, b) => ((b.system.totalSoak ?? b.system.soak) + (b.system.totalDefense ?? b.system.defense)) - ((a.system.totalSoak ?? a.system.soak) + (a.system.totalDefense ?? a.system.defense)));
  const suit = wornArmor[0] ?? null;
  let encumbrance = 0, best = null;
  const out = { suit, extraArmor: wornArmor.slice(1).map(i => i.name), soak: 0, defense: 0, meleePlus: 0, rangedPlus: 0, mods: {}, strainPenalty: 0 };
  if (suit) { out.soak = suit.system.totalSoak ?? suit.system.soak; out.defense = suit.system.totalDefense ?? suit.system.defense; }
  const onceSeen = new Set();
  for (const i of items) {
    const s = i.system;
    if (!["weapon", "armor", "gear"].includes(i.type)) continue;
    // Оружие в руках: «Оборонительное» +ближняя защита, «Отражающее» +дальняя (источники, «увеличивающие» защиту).
    if (i.type === "weapon" && s.equipped !== false && typeof s.qualityRating === "function") {
      out.meleePlus += s.qualityRating(/^оборонит|^defensive/i);
      out.rangedPlus += s.qualityRating(/^отражающ|^deflection/i);
    }
    if (i.type === "gear") {
      const m = gearMechanics(i);
      if (s.carried !== false && m.thresholdBonus > (best?.bonus ?? 0)) best = { bonus: m.thresholdBonus, name: i.name };
      if (m.implant) {
        const key = m.implantOnce ? i.name : null;
        if (!key || !onceSeen.has(key)) {
          if (key) onceSeen.add(key);
          out.strainPenalty += m.strainPenalty * (m.implantOnce ? 1 : Math.max(1, s.quantity ?? 1));
          for (const mod of m.mods) out.mods[mod.target] = (out.mods[mod.target] ?? 0) + mod.value;
        }
      } else if (s.equipped) for (const mod of m.mods) out.mods[mod.target] = (out.mods[mod.target] ?? 0) + mod.value;
    }
    if (s.carried === false) continue;
    encumbrance += itemEncumbrance(i, { worn: i === suit || (i.type === "gear" && s.equipped) });
  }
  // Импланты: не больше +1 к параметру (к порогу ран — +2).
  for (const [k, v] of Object.entries(out.mods)) out.mods[k] = Math.min(v, k === "wounds" ? 2 : 1);
  out.encumbrance = encumbrance;
  out.thresholdBonus = best?.bonus ?? 0;
  out.container = best?.name ?? null;
  return out;
}

/* -------------------------------------------- */
/*  Стакание                                    */
/* -------------------------------------------- */

/** Складываются ли одинаковые предметы в одну стопку. */
export function isStackable(data) {
  if (data.type === "gear") return true;
  // Гранаты и т. п.: оружие с «Ограниченным боезапасом» без модификаций.
  if (data.type === "weapon") return !(data.system?.attachments?.length) && (data.system?.qualities ?? []).some(q => /ограниченный боезапас|limited ammo/i.test(q.name));
  return false;
}

/** Найти, к какой стопке добавить предмет. */
export function findStack(actor, data) {
  if (!isStackable(data)) return null;
  return actor.items.find(i => i.type === data.type && i.name === data.name && (i.system.quantity ?? 0) >= 0
    && !(i.type === "gear" && i.system.equipped) && !i.flags?.["genesys-rpg"]?.crafted && !data.flags?.["genesys-rpg"]?.crafted);
}

/* -------------------------------------------- */
/*  Болеутоляющее                               */
/* -------------------------------------------- */

/** Сколько ран (усталости) вылечит очередное болеутоляющее: 5, 4, 3, 2, 1, потом 0. */
export function painkillerHeal(usedToday, talentRanks = 0) {
  if (usedToday >= 5) return 0;
  return 5 - usedToday + talentRanks;
}

/** Ранги «Знатока болеутоляющих» у применяющего. */
export function painkillerTalentRanks(actor) {
  return (actor?.itemTypes?.talent ?? []).filter(t => (t.getFlag?.(SYSTEM_ID, "nameEn") ?? t.flags?.[SYSTEM_ID]?.nameEn) === "Painkiller Specialization" || /знаток болеутоляющ/i.test(t.name))
    .reduce((s, t) => s + (t.system.ranked ? Math.max(1, t.system.rank ?? 1) : 1), 0);
}

/** Болеутоляющие, которые есть у актёра. */
export function painkillersOf(actor) {
  return (actor?.itemTypes?.gear ?? []).filter(i => (i.system.quantity ?? 0) > 0 && i.system.carried !== false && gearMechanics(i).painkiller);
}

/** Сколько болеутоляющих принято сегодня (по видам: раны / усталость). */
export function painkillersUsed(actor, kind = "wounds") {
  return actor?.getFlag?.(SYSTEM_ID, `painkillers.${kind}`) ?? actor?.flags?.[SYSTEM_ID]?.painkillers?.[kind] ?? 0;
}

/** Хуки: одинаковое снаряжение складывается в стопку при получении (перетаскивание, лавка, добыча). */
export function registerGearHooks() {
  Hooks.on("preCreateItem", (item, data, options, userId) => {
    if (userId !== game.user.id || options?.genesysNoStack || !(item.parent instanceof Actor)) return;
    const stack = findStack(item.parent, item);
    if (!stack) return;
    stack.update({ "system.quantity": (stack.system.quantity ?? 0) + Math.max(1, item.system.quantity ?? 1) });
    ui.notifications.info(game.i18n.format("GENESYS.Equip.Stacked", { name: item.name, value: (stack.system.quantity ?? 0) + Math.max(1, item.system.quantity ?? 1) }));
    return false;
  });
}
