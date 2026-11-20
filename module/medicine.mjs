import { SYSTEM_ID } from "./config.mjs";

/**
 * Медицина по Core Rulebook («Медицина», табл. I.3–3):
 *  — раны: сложность лёгкая (ран ≤ половины порога), обычная (> половины), сложная (раны превышают порог);
 *    каждый успех лечит рану, каждое преимущество — единицу усталости; «Хирург» — +1 рана за ранг;
 *  — критическая травма: сложность = тяжесть; успех — травма вылечена; один лекарь — одна попытка на травму в неделю игрового времени;
 *  — персонаж получает пользу только от одной проверки Медицины за встречу;
 *  — лечить самого себя: сложность +2.
 * Ограничения не запрещают бросок: система предупреждает, решает ведущий.
 */

const WEEK = 7 * 24 * 3600;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const L = k => game.i18n.localize(k);

/** Сложность лечения ран по табл. I.3–3. */
export function woundDifficulty(wounds, threshold) {
  if (wounds > threshold) return 3;
  if (wounds > threshold / 2) return 2;
  return 1;
}

/** Ранги «Хирурга». */
export function surgeonRanks(actor) {
  return (actor?.itemTypes?.talent ?? []).filter(t => (t.flags?.[SYSTEM_ID]?.nameEn) === "Surgeon" || /^хирург/i.test(t.name))
    .reduce((s, t) => s + (t.system.ranked ? Math.max(1, t.system.rank ?? 1) : 1), 0);
}

/** Есть ли у лекаря медицинские принадлежности (аптечка, набор аптекаря, медпак…). */
export function hasMedkit(actor) {
  return (actor?.itemTypes?.gear ?? []).some(i => i.system.carried !== false && (i.system.quantity ?? 1) > 0
    && /аптечк|аптекар|медпак|медкомплект|медицинск\S* (набор|сумк|чемодан)|набор (врача|хирурга|лекаря|целителя)|травник|бинт|перевяз/i.test(i.name));
}

/** Ключ текущей «встречи» для ограничения «одна проверка Медицины за встречу». */
export function encounterKey() {
  if (game.combat?.started) return `combat:${game.combat.id}`;
  return `scene:${canvas?.scene?.id ?? "none"}`;
}

/** Пациент для лечения: выбранная цель (если есть), иначе сам лекарь. */
function defaultPatient(healer) {
  const t = [...(game.user.targets ?? [])].map(x => x.actor).find(a => a?.system?.wounds);
  return t ?? healer;
}

/**
 * Окно выбора: кого лечить и что (раны или одну из критических травм), затем проверка Медицины.
 * @param {Actor} healer
 * @param {{patient?: Actor, injury?: Item}} [opts]
 */
export async function rollMedicine(healer, { patient = null, injury = null } = {}) {
  const skill = healer.getSkill?.("medicine");
  patient ??= injury?.parent ?? defaultPatient(healer);
  if (!patient?.system?.wounds) return ui.notifications.warn("GENESYS.Medicine.NoPatient", { localize: true });

  // Выбор режима, если не задан заранее: раны или конкретная травма.
  let mode = injury ? `injury:${injury.id}` : null;
  if (!mode) {
    const injuries = patient.itemTypes?.injury ?? [];
    const w = patient.system.wounds;
    const options = [`<option value="wounds">${esc(game.i18n.format("GENESYS.Medicine.ModeWounds", { value: w.value, max: w.max }))}</option>`,
      ...injuries.map(i => `<option value="injury:${i.id}">${esc(game.i18n.format("GENESYS.Medicine.ModeInjury", { name: i.name, severity: i.system.severity || 1 }))}</option>`)].join("");
    if (injuries.length) {
      mode = await foundry.applications.api.DialogV2.prompt({
        window: { title: L("GENESYS.Medicine.Title"), icon: "fa-solid fa-stethoscope" },
        content: `<div class="genesys gs-med-dialog"><p>${esc(game.i18n.format("GENESYS.Medicine.Patient", { name: patient.name }))}</p><select name="mode">${options}</select></div>`,
        ok: { label: L("GENESYS.Medicine.Treat"), callback: (ev, button) => button.form.elements.mode.value },
        rejectClose: false
      });
      if (!mode) return null;
    } else mode = "wounds";
  }

  const self = patient === healer || patient.uuid === healer.uuid;
  const notes = [];
  let difficulty, target = null;
  if (mode === "wounds") {
    const w = patient.system.wounds;
    if (!w.value) return ui.notifications.info(game.i18n.format("GENESYS.Medicine.NoWounds", { name: patient.name }));
    difficulty = woundDifficulty(w.value, w.max);
    notes.push(game.i18n.format("GENESYS.Medicine.NoteWounds", { name: patient.name, value: w.value, max: w.max }));
    // Одна проверка Медицины за встречу.
    if (patient.getFlag(SYSTEM_ID, "medicineEncounter") === encounterKey()) {
      const go = await foundry.applications.api.DialogV2.confirm({
        window: { title: L("GENESYS.Medicine.Title") },
        content: `<p>${esc(game.i18n.format("GENESYS.Medicine.AlreadyTreated", { name: patient.name }))}</p>`, rejectClose: false
      });
      if (!go) return null;
    }
  } else {
    target = patient.items.get(mode.slice(7));
    if (!target) return null;
    difficulty = Math.max(1, target.system.severity || 1);
    notes.push(game.i18n.format("GENESYS.Medicine.NoteInjury", { name: target.name, severity: difficulty }));
    // Одна попытка одного лекаря на травму в неделю игрового времени.
    const last = target.getFlag(SYSTEM_ID, `healAttempts.${healer.id}`);
    const now = game.time?.worldTime ?? 0;
    if (last !== undefined && now - last < WEEK) {
      const go = await foundry.applications.api.DialogV2.confirm({
        window: { title: L("GENESYS.Medicine.Title") },
        content: `<p>${esc(game.i18n.format("GENESYS.Medicine.WeekLimit", { healer: healer.name, name: target.name }))}</p>`, rejectClose: false
      });
      if (!go) return null;
    }
  }
  if (self) { difficulty += 2; notes.push(L("GENESYS.Medicine.NoteSelf")); }

  const { DicePool } = await import("./dice/pool.mjs");
  const { DicePoolDialog } = await import("./apps/dice-pool-dialog.mjs");
  const { applyStateModifiers } = await import("./combat/combat.mjs");
  const pool = skill ? healer.getSkillPool(skill, 0) : new DicePool({ ability: healer.characteristic?.("intellect") ?? 1 });
  pool.difficulty = Math.min(5, difficulty);
  if (difficulty > 5) pool.upgradeDifficulty(difficulty - 5);
  if (!hasMedkit(healer)) { pool.setback += 1; notes.push(L("GENESYS.Medicine.NoteNoKit")); }
  const surgeon = mode === "wounds" ? surgeonRanks(healer) : 0;
  if (surgeon) notes.push(game.i18n.format("GENESYS.Medicine.NoteSurgeon", { value: surgeon }));
  notes.push(...applyStateModifiers(healer, pool, { characteristic: skill?.system.characteristic ?? "intellect", skillKey: "medicine" }));

  const label = mode === "wounds"
    ? game.i18n.format("GENESYS.Medicine.LabelWounds", { name: patient.name })
    : game.i18n.format("GENESYS.Medicine.LabelInjury", { name: patient.name, injury: target.name });
  const rollOptions = { skill: "medicine", medicine: { patientUuid: patient.uuid, patientName: patient.name, mode: mode === "wounds" ? "wounds" : "injury",
    injuryId: target?.id ?? null, injuryName: target?.name ?? null, surgeon } };
  const roll = await DicePoolDialog.prompt({ pool, label, actor: healer, rollOptions, notes });
  if (!roll) return null;
  await applyMedicine(roll, healer);
  return roll;
}

/** Результат лечения (для карточки броска). */
export function medicineOutcome(roll) {
  const m = roll.options?.medicine;
  const r = roll.results;
  if (!m) return null;
  if (m.mode === "injury") return { injury: true, name: m.injuryName, patient: m.patientName, healed: r.isSuccess };
  return { injury: false, patient: m.patientName, success: r.isSuccess,
    wounds: r.isSuccess ? r.success + (m.surgeon ?? 0) : 0, strain: r.isSuccess ? r.advantage : 0, surgeon: m.surgeon ?? 0 };
}

/** Применить лечение после броска (выполняет лекарь; чужого пациента лечит ведущий через сокет). */
export async function applyMedicine(roll, healer) {
  const m = roll.options?.medicine;
  if (!m) return;
  const patient = await fromUuid(m.patientUuid);
  if (!patient) return;
  const { actOnActor } = await import("./combat/combat.mjs");
  const out = medicineOutcome(roll);
  if (m.mode === "wounds") {
    await actOnActor(patient, "medicine", { mode: "wounds", wounds: out.wounds, strain: out.strain, encounter: encounterKey() });
  } else {
    await actOnActor(patient, "medicine", { mode: "injury", injuryId: m.injuryId, healed: out.healed, healerId: healer.id, now: game.time?.worldTime ?? 0 });
  }
}
