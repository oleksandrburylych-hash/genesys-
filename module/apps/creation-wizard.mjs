import { GENESYS, SYSTEM_ID, TEMPLATES } from "../config.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const STEPS = ["archetype", "career", "skills", "xp", "talents", "motivations", "heroic", "details", "summary"];
const CHARS = Object.keys(GENESYS.characteristics);
const MOTIVATIONS = ["strength", "flaw", "desire", "fear"];

/** Книга по строке source. */
function bookOf(source = "") {
  if (source.startsWith("Core")) return "Core";
  if (source.startsWith("Expanded")) return "EPG";
  if (source.startsWith("Realms")) return "Терринот";
  if (source.startsWith("Zynnythryx")) return "Зиннитрикс";
  return "";
}

/**
 * Мастер создания персонажа по шагам книги правил:
 * раса → карьера → бесплатные ранги → опыт (характеристики, навыки) → таланты →
 * мотивации → героическая способность → описание и деньги → итог.
 * Всё считается внутри мастера; на персонажа применяется одной кнопкой с журналом опыта.
 */
export class CreationWizard extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ actor, ...options } = {}) {
    super(options);
    this.actor = actor;
    this.stepIndex = 0;
    this.lib = null;
    this.filter = { archetype: "", career: "", talent: "", archetypeSearch: "", careerSearch: "", talentSearch: "", talentTier: 0 };
    this.pick = {
      archetype: null, career: null, heroic: null,
      careerFree: [], startFree: [],
      chars: Object.fromEntries(CHARS.map(k => [k, 0])),
      skills: {},
      talents: [],
      motivations: Object.fromEntries(MOTIVATIONS.map(k => [k, { name: "", text: "" }])),
      details: { name: actor.name, gender: "", age: "", height: "", build: "", hair: "", eyes: "", features: "", money: null }
    };
  }

  static DEFAULT_OPTIONS = {
    classes: ["genesys", "creation-wizard"],
    tag: "form",
    window: { title: "GENESYS.Wizard.Title", icon: "fa-solid fa-hat-wizard", resizable: true },
    position: { width: 1040, height: 800 },
    actions: {
      goto: CreationWizard.#onGoto, next: CreationWizard.#onNext, back: CreationWizard.#onBack,
      pick: CreationWizard.#onPick, group: CreationWizard.#onGroup, toggle: CreationWizard.#onToggle,
      char: CreationWizard.#onChar, skill: CreationWizard.#onSkill, talent: CreationWizard.#onTalent,
      tier: CreationWizard.#onTier, rollMotivation: CreationWizard.#onRollMotivation,
      pickMotivation: CreationWizard.#onPickMotivation, finish: CreationWizard.#onFinish
    },
    form: { handler: CreationWizard.#onChange, submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = { main: { template: `${TEMPLATES}/apps/creation-wizard.hbs`, scrollable: [".wz-list", ".wz-detail", ".wz-body"] } };

  get step() { return STEPS[this.stepIndex]; }

  /* -------------------------------------------- */
  /*  Данные                                       */
  /* -------------------------------------------- */

  async #docs(packName, type) {
    const out = [];
    const pack = game.packs.get(`${SYSTEM_ID}.${packName}`);
    if (pack) for (const d of await pack.getDocuments()) if (d.type === type) out.push(d);
    for (const d of game.items.filter(i => i.type === type)) out.push(d);
    return out;
  }

  async #load() {
    if (this.lib) return this.lib;
    const [archetypes, careers, heroics, talents, skills] = await Promise.all([
      this.#docs("archetypes", "archetype"), this.#docs("careers", "career"), this.#docs("heroic", "heroic"),
      this.#docs("talents", "talent"), this.#docs("skills", "skill")
    ]);
    this.lib = { archetypes, careers, heroics, talents, skills, byUuid: new Map([...archetypes, ...careers, ...heroics, ...talents].map(d => [d.uuid, d])) };
    // Стартовые деньги по правилам книги.
    if (this.pick.details.money === null) this.pick.details.money = GENESYS.creation?.rules?.startingMoney ?? 500;
    return this.lib;
  }

  #doc(uuid) { return uuid ? this.lib?.byUuid.get(uuid) ?? null : null; }
  get archetype() { return this.#doc(this.pick.archetype); }
  get career() { return this.#doc(this.pick.career); }

  /** Группа (книга · папка) документа. */
  #group(doc) {
    const book = bookOf(doc.system?.source);
    const folder = doc.folder?.name ?? "";
    const parts = [book, folder].filter(Boolean);
    if (parts.length === 2 && parts[0] === parts[1]) parts.pop();
    return parts.join(" · ") || game.i18n.localize("GENESYS.Wizard.World");
  }

  /** Набор игрового мира (для фильтра талантов). */
  get setting() { try { return game.settings.get(SYSTEM_ID, "skillPreset"); } catch { return "all"; } }

  /** Подходит ли талант миру (как в мастере настройки мира). */
  #talentAllowed(doc) {
    const setting = this.setting;
    const folder = doc.folder?.name ?? "";
    const allowed = GENESYS.settingContent?.[setting];
    if (allowed && GENESYS.settingFolders.some(f => folder.startsWith(f)) && !allowed.some(a => folder.startsWith(a))) return false;
    if (setting === "terrinoth" && (doc.system?.source ?? "").startsWith("Core") && !GENESYS.terrinothCoreTalents.includes(doc.name)) return false;
    return true;
  }

  /* -------------------------------------------- */
  /*  Навыки и опыт                                */
  /* -------------------------------------------- */

  /** Все навыки, которые будут у персонажа: текущие + навыки карьеры из компендиума. */
  #skillRows() {
    const career = this.career;
    const careerNames = new Set((career?.system.careerSkills ?? []).map(n => n.toLowerCase()));
    const rows = new Map();
    for (const s of this.actor.itemTypes.skill) rows.set(s.name.toLowerCase(), { name: s.name, characteristic: s.system.characteristic, base: s.system.rank, category: s.system.category });
    for (const n of career?.system.careerSkills ?? []) {
      if (rows.has(n.toLowerCase())) continue;
      const def = this.lib.skills.find(s => s.name.toLowerCase() === n.toLowerCase());
      rows.set(n.toLowerCase(), { name: n, characteristic: def?.system.characteristic ?? "intellect", base: 0, category: def?.system.category ?? "general" });
    }
    return [...rows.values()].map(r => {
      const isCareer = careerNames.has(r.name.toLowerCase());
      const free = (this.pick.careerFree.includes(r.name) ? 1 : 0) + (this.pick.startFree.includes(r.name) ? 1 : 0);
      const start = Math.min(GENESYS.xp.maxSkillCreation, r.base + free);
      const bought = this.pick.skills[r.name] ?? 0;
      return { ...r, career: isCareer, free, start, bought, rank: start + bought };
    }).sort((a, b) => (b.career - a.career) || a.name.localeCompare(b.name, game.i18n.lang));
  }

  /** Стоимость повышения навыка с ранга a до b. */
  static skillCost(a, b, career) {
    let c = 0;
    for (let r = a + 1; r <= b; r++) c += GENESYS.xp.skill(r, career);
    return c;
  }

  /** Стоимость повышения характеристики с a до b. */
  static charCost(a, b) {
    let c = 0;
    for (let v = a + 1; v <= b; v++) c += GENESYS.xp.characteristic(v);
    return c;
  }

  /** Уровень таланта с учётом ранга (каждый следующий ранг — на уровень выше). */
  #talentTier(entry) {
    const doc = this.#doc(entry.uuid);
    return Math.min(5, (doc?.system.tier ?? 1) + (entry.rank - 1));
  }

  #budget() {
    const arch = this.archetype;
    const total = arch?.system.startingXP ?? 0;
    let spent = 0;
    for (const k of CHARS) {
      const base = arch?.system.characteristics[k] ?? 2;
      spent += CreationWizard.charCost(base, base + this.pick.chars[k]);
    }
    for (const row of this.#skillRows()) spent += CreationWizard.skillCost(row.start, row.rank, row.career);
    for (const t of this.pick.talents) spent += GENESYS.xp.talent(this.#talentTier(t));
    return { total, spent, left: total - spent };
  }

  /** Число талантов по уровням (для пирамиды). */
  #tierCounts() {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const t of this.pick.talents) c[this.#talentTier(t)]++;
    return c;
  }

  /* -------------------------------------------- */
  /*  Контекст                                     */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    try { return await this.#context(); }
    catch (err) {
      console.error("genesys-rpg |", err);
      ui.notifications.error(`Genesys: ${err.message}`, { permanent: true });
      throw err;
    }
  }

  async #context() {
    await this.#load();
    const L = k => game.i18n.localize(k);
    const arch = this.archetype;
    const career = this.career;
    const budget = this.#budget();
    const ctx = {
      step: this.step, stepIndex: this.stepIndex, isFirst: this.stepIndex === 0, isLast: this.stepIndex === STEPS.length - 1,
      steps: STEPS.map((s, i) => ({ key: s, index: i, num: i + 1, label: `GENESYS.Wizard.Step.${s}`, active: i === this.stepIndex, done: this.#stepDone(s) })),
      budget, archetypeName: arch?.name, careerName: career?.name
    };

    const cards = (docs, kind) => {
      const groups = [...new Set(docs.map(d => this.#group(d)))].sort();
      const g = this.filter[kind];
      const q = this.filter[`${kind}Search`].toLowerCase();
      return {
        groups: groups.map(name => ({ name, active: name === g })),
        allActive: !g,
        search: this.filter[`${kind}Search`],
        cards: docs.filter(d => (!g || this.#group(d) === g) && (!q || d.name.toLowerCase().includes(q)))
          .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang))
          .map(d => ({ uuid: d.uuid, name: d.name, img: d.img, group: this.#group(d), selected: this.pick[kind] === d.uuid,
            line: kind === "archetype"
              ? `${CHARS.map(k => `${L(GENESYS.characteristics[k].abbr)} ${d.system.characteristics[k]}`).join(" · ")} · ${d.system.startingXP} ${L("GENESYS.Sheet.XPShort")}`
              : (d.system.careerSkills ?? []).slice(0, 4).join(", ") + ((d.system.careerSkills?.length ?? 0) > 4 ? "…" : "") }))
      };
    };

    if (this.step === "archetype") {
      ctx.list = cards(this.lib.archetypes, "archetype");
      if (arch) ctx.detail = {
        name: arch.name, img: arch.img, group: this.#group(arch),
        chars: CHARS.map(k => ({ label: GENESYS.characteristics[k].label, value: arch.system.characteristics[k] })),
        wounds: arch.system.wounds, strain: arch.system.strain, xp: arch.system.startingXP,
        startingSkills: arch.system.startingSkills,
        abilities: arch.system.abilities.map(a => ({ name: a.name, description: a.description })),
        description: arch.system.description
      };
    }
    if (this.step === "career") {
      ctx.list = cards(this.lib.careers, "career");
      if (career) ctx.detail = {
        name: career.name, img: career.img, group: this.#group(career),
        careerSkills: career.system.careerSkills, description: career.system.description,
        gear: GENESYS.creation?.careerGear?.[career.name] ?? ""
      };
    }
    if (this.step === "skills") {
      const rows = this.#skillRows();
      ctx.careerSkills = rows.filter(r => r.career).map(r => ({ ...r, checked: this.pick.careerFree.includes(r.name) }));
      ctx.careerFreeCount = this.pick.careerFree.length;
      ctx.startingText = arch?.system.startingSkills ?? "";
      ctx.allSkills = rows.map(r => ({ ...r, checked: this.pick.startFree.includes(r.name) }));
    }
    if (this.step === "xp") {
      ctx.chars = CHARS.map(k => {
        const base = arch?.system.characteristics[k] ?? 2;
        const value = base + this.pick.chars[k];
        return { key: k, label: GENESYS.characteristics[k].label, base, value, next: value < GENESYS.xp.maxCharacteristicCreation ? GENESYS.xp.characteristic(value + 1) : null };
      });
      ctx.skillRows = this.#skillRows().map(r => ({ ...r, abbr: GENESYS.characteristics[r.characteristic]?.abbr,
        ranks: [r.rank >= 1, r.rank >= 2],
        next: r.rank < GENESYS.xp.maxSkillCreation ? GENESYS.xp.skill(r.rank + 1, r.career) : null }));
    }
    if (this.step === "talents") {
      const counts = this.#tierCounts();
      const q = this.filter.talentSearch.toLowerCase();
      const tierF = this.filter.talentTier;
      ctx.tierFilter = [0, 1, 2, 3].map(t => ({ t, active: t === tierF, label: t ? `${L("GENESYS.Talent.Tier")} ${t}` : L("GENESYS.Wizard.All") }));
      ctx.talentSearch = this.filter.talentSearch;
      ctx.chosenTalents = this.pick.talents.map((t, i) => {
        const d = this.#doc(t.uuid);
        return { index: i, name: d?.name, img: d?.img, rank: t.rank, tier: this.#talentTier(t), cost: GENESYS.xp.talent(this.#talentTier(t)) };
      });
      ctx.counts = [1, 2, 3, 4, 5].map(t => ({ t, n: counts[t] }));
      ctx.talentCards = this.lib.talents.filter(d => this.#talentAllowed(d) && d.system.tier <= 3
          && (!tierF || d.system.tier === tierF) && (!q || d.name.toLowerCase().includes(q)))
        .sort((a, b) => a.system.tier - b.system.tier || a.name.localeCompare(b.name, game.i18n.lang))
        .slice(0, 160)
        .map(d => ({ uuid: d.uuid, name: d.name, img: d.img, tier: d.system.tier, cost: GENESYS.xp.talent(d.system.tier),
          ranked: d.system.ranked, activation: GENESYS.activations[d.system.activation],
          owned: this.pick.talents.some(t => t.uuid === d.uuid),
          description: d.system.description }));
    }
    if (this.step === "motivations") {
      const tables = GENESYS.creation?.motivations ?? {};
      ctx.motivations = MOTIVATIONS.map(k => ({
        key: k, label: GENESYS.motivations[k], value: this.pick.motivations[k],
        options: (tables[k] ?? []).map((o, i) => ({ index: i, roll: o.roll, name: o.name, text: o.text, selected: o.name === this.pick.motivations[k].name }))
      }));
      ctx.hasTables = Object.keys(tables).length > 0;
    }
    if (this.step === "heroic") {
      ctx.heroics = this.lib.heroics.map(d => ({ uuid: d.uuid, name: d.name, img: d.img, description: d.system.description, selected: this.pick.heroic === d.uuid }));
    }
    if (this.step === "details") {
      ctx.details = this.pick.details;
      ctx.moneyText = GENESYS.creation?.rules?.moneyText ?? "";
      ctx.careerGear = GENESYS.creation?.careerGear?.[career?.name] ?? "";
    }
    if (this.step === "summary") {
      ctx.summary = {
        archetype: arch?.name, career: career?.name, heroic: this.#doc(this.pick.heroic)?.name,
        careerFree: this.pick.careerFree.join(", "), startFree: this.pick.startFree.join(", "),
        chars: CHARS.map(k => ({ label: GENESYS.characteristics[k].label, value: (arch?.system.characteristics[k] ?? 2) + this.pick.chars[k] })),
        skills: this.#skillRows().filter(r => r.rank > 0).map(r => `${r.name} ${r.rank}`).join(", "),
        talents: this.pick.talents.map(t => `${this.#doc(t.uuid)?.name}${t.rank > 1 ? ` ${t.rank}` : ""}`).join(", "),
        motivations: MOTIVATIONS.map(k => ({ label: GENESYS.motivations[k], name: this.pick.motivations[k].name })).filter(m => m.name),
        name: this.pick.details.name, money: this.pick.details.money
      };
      ctx.ready = !!arch && !!career && budget.left >= 0;
    }
    return ctx;
  }

  #stepDone(step) {
    if (step === "archetype") return !!this.pick.archetype;
    if (step === "career") return !!this.pick.career;
    if (step === "skills") return this.pick.careerFree.length === 4;
    if (step === "motivations") return MOTIVATIONS.some(k => this.pick.motivations[k].name);
    if (step === "heroic") return !!this.pick.heroic;
    return false;
  }

  /* -------------------------------------------- */
  /*  Действия                                     */
  /* -------------------------------------------- */

  static #onChange(event, form, formData) {
    const d = foundry.utils.expandObject(formData.object);
    if (d.search) for (const [k, v] of Object.entries(d.search)) this.filter[`${k}Search`] = v ?? "";
    if (d.details) Object.assign(this.pick.details, d.details, { money: Number(d.details.money ?? this.pick.details.money) || 0 });
    if (d.mot) for (const k of MOTIVATIONS) if (d.mot[k]) Object.assign(this.pick.motivations[k], d.mot[k]);
    // Поиск — перерисовать списки, сохранив фокус ввода.
    if (d.search && event?.target?.name?.startsWith("search.")) {
      const name = event.target.name;
      this.render().then(() => {
        const el = this.element.querySelector(`[name="${name}"]`);
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      });
    }
  }

  static #onGoto(event, target) { this.stepIndex = Number(target.dataset.index); this.render(); }
  static #onNext() {
    if (this.step === "archetype" && !this.pick.archetype) return ui.notifications.warn("GENESYS.Wizard.PickArchetype", { localize: true });
    if (this.step === "career" && !this.pick.career) return ui.notifications.warn("GENESYS.Wizard.PickCareer", { localize: true });
    this.stepIndex = Math.min(STEPS.length - 1, this.stepIndex + 1);
    if (this.step === "heroic" && !this.lib.heroics.length) this.stepIndex++;
    this.render();
  }
  static #onBack() {
    this.stepIndex = Math.max(0, this.stepIndex - 1);
    if (this.step === "heroic" && !this.lib.heroics.length) this.stepIndex--;
    this.render();
  }

  static #onPick(event, target) {
    const kind = target.dataset.kind;
    const uuid = target.dataset.uuid;
    this.pick[kind] = this.pick[kind] === uuid && kind === "heroic" ? null : uuid;
    if (kind === "career") { this.pick.careerFree = []; this.pick.skills = {}; }
    if (kind === "archetype") {
      this.pick.chars = Object.fromEntries(CHARS.map(k => [k, 0]));
      // Стартовые навыки: заранее отметить навыки, названные в тексте расы.
      const text = (this.archetype?.system.startingSkills ?? "").toLowerCase();
      this.pick.startFree = this.#skillRows().filter(r => {
        const stem = r.name.toLowerCase().slice(0, Math.max(5, r.name.length - 2));
        return text.includes(stem);
      }).map(r => r.name).slice(0, 3);
    }
    this.render();
  }

  static #onGroup(event, target) {
    this.filter[target.dataset.kind] = target.dataset.group ?? "";
    this.render();
  }

  static #onToggle(event, target) {
    const list = this.pick[target.dataset.list];
    const name = target.dataset.name;
    const max = target.dataset.list === "careerFree" ? 4 : 3;
    const i = list.indexOf(name);
    if (i >= 0) list.splice(i, 1);
    else if (list.length >= max) return ui.notifications.warn(game.i18n.format("GENESYS.Wizard.MaxSkills", { max }));
    else list.push(name);
    this.render();
  }

  static #onChar(event, target) {
    const k = target.dataset.key;
    const delta = Number(target.dataset.delta);
    const base = this.archetype?.system.characteristics[k] ?? 2;
    const next = this.pick.chars[k] + delta;
    if (next < 0 || base + next > GENESYS.xp.maxCharacteristicCreation) return;
    this.pick.chars[k] = next;
    if (this.#budget().left < 0) { this.pick.chars[k] -= delta; return ui.notifications.warn("GENESYS.Wizard.NoXP", { localize: true }); }
    this.render();
  }

  static #onSkill(event, target) {
    const name = target.dataset.name;
    const delta = Number(target.dataset.delta);
    const row = this.#skillRows().find(r => r.name === name);
    if (!row) return;
    const next = (this.pick.skills[name] ?? 0) + delta;
    if (next < 0 || row.start + next > GENESYS.xp.maxSkillCreation) return;
    this.pick.skills[name] = next;
    if (this.#budget().left < 0) { this.pick.skills[name] -= delta; return ui.notifications.warn("GENESYS.Wizard.NoXP", { localize: true }); }
    this.render();
  }

  static #onTalent(event, target) {
    const remove = target.dataset.index !== undefined;
    if (remove) { this.pick.talents.splice(Number(target.dataset.index), 1); return this.render(); }
    const doc = this.#doc(target.dataset.uuid);
    if (!doc) return;
    const existing = this.pick.talents.filter(t => t.uuid === doc.uuid);
    if (existing.length && !doc.system.ranked) return ui.notifications.warn(game.i18n.format("GENESYS.Warn.TalentOwned", { name: doc.name }));
    const entry = { uuid: doc.uuid, rank: existing.length + 1 };
    const tier = this.#talentTier(entry);
    const counts = this.#tierCounts();
    if (tier > 1 && !(counts[tier - 1] > counts[tier])) {
      return ui.notifications.warn(game.i18n.format("GENESYS.Warn.TalentPyramid", { tier, lower: tier - 1 }));
    }
    this.pick.talents.push(entry);
    if (this.#budget().left < 0) { this.pick.talents.pop(); return ui.notifications.warn("GENESYS.Wizard.NoXP", { localize: true }); }
    this.render();
  }

  static #onTier(event, target) { this.filter.talentTier = Number(target.dataset.tier); this.render(); }

  static #onPickMotivation(event, target) {
    const k = target.dataset.key;
    const o = GENESYS.creation?.motivations?.[k]?.[Number(target.dataset.index)];
    if (o) this.pick.motivations[k] = { name: o.name, text: o.text };
    this.render();
  }

  static async #onRollMotivation(event, target) {
    const keys = target.dataset.key ? [target.dataset.key] : MOTIVATIONS;
    for (const k of keys) {
      const table = GENESYS.creation?.motivations?.[k] ?? [];
      if (!table.length) continue;
      const o = table[Math.floor(Math.random() * table.length)];
      this.pick.motivations[k] = { name: o.name, text: o.text };
    }
    this.render();
  }

  /* -------------------------------------------- */
  /*  Применение                                   */
  /* -------------------------------------------- */

  async #ensureSkill(name) {
    let skill = this.actor.getSkill(name);
    if (skill) return skill;
    const doc = this.lib.skills.find(s => s.name.toLowerCase() === name.toLowerCase());
    const data = doc ? doc.toObject() : { name, type: "skill", system: { characteristic: "intellect", category: "general" } };
    [skill] = await this.actor.createEmbeddedDocuments("Item", [data]);
    return skill;
  }

  static async #onFinish() {
    const actor = this.actor;
    const arch = this.archetype;
    const career = this.career;
    if (!arch || !career) return ui.notifications.warn("GENESYS.Wizard.PickBoth", { localize: true });
    if (this.#budget().left < 0) return ui.notifications.warn("GENESYS.Wizard.NoXP", { localize: true });
    const L = (k, d) => game.i18n.format(k, d ?? {});
    try {
      // Раса/архетип (характеристики, пороги, стартовый опыт, способности) и карьера.
      await actor.applyArchetype(arch);
      for (const n of career.system.careerSkills) await this.#ensureSkill(n);
      await actor.applyCareer(career);

      // Навыки: бесплатные ранги и покупка за опыт.
      const log = foundry.utils.deepClone(actor.system.experience.log);
      const entry = (amount, label) => ({ id: foundry.utils.randomID(), type: "spend", kind: "", amount, label, timestamp: Date.now() });
      const skillUpdates = [];
      for (const row of this.#skillRows()) {
        if (row.rank === row.base) continue;
        const skill = await this.#ensureSkill(row.name);
        skillUpdates.push({ _id: skill.id, "system.rank": row.rank });
        for (let r = row.start + 1; r <= row.rank; r++) log.push(entry(GENESYS.xp.skill(r, row.career), L("GENESYS.XP.SkillRank", { name: row.name, rank: r })));
      }
      if (skillUpdates.length) await actor.updateEmbeddedDocuments("Item", skillUpdates);

      // Характеристики за опыт.
      const update = {};
      for (const k of CHARS) {
        const base = arch.system.characteristics[k];
        const value = base + this.pick.chars[k];
        update[`system.characteristics.${k}.value`] = value;
        for (let v = base + 1; v <= value; v++) log.push(entry(GENESYS.xp.characteristic(v), L("GENESYS.XP.Characteristic", { name: game.i18n.localize(GENESYS.characteristics[k].label), value: v })));
      }

      // Таланты за опыт.
      const talentData = new Map();
      for (const t of this.pick.talents) {
        const doc = this.#doc(t.uuid);
        const tier = this.#talentTier(t);
        log.push(entry(GENESYS.xp.talent(tier), L("GENESYS.XP.Talent", { name: doc.name, rank: t.rank, tier })));
        const data = talentData.get(t.uuid) ?? doc.toObject();
        data.system.rank = t.rank;
        talentData.set(t.uuid, data);
      }
      const extra = [...talentData.values()];
      const heroic = this.#doc(this.pick.heroic);
      if (heroic) extra.push(heroic.toObject());
      if (extra.length) await actor.createEmbeddedDocuments("Item", extra);

      // Мотивации, описание, деньги.
      for (const k of MOTIVATIONS) {
        update[`system.motivations.${k}.name`] = this.pick.motivations[k].name;
        update[`system.motivations.${k}.description`] = this.pick.motivations[k].text;
      }
      const det = this.pick.details;
      for (const k of ["gender", "age", "height", "build", "hair", "eyes", "features"]) update[`system.details.${k}`] = det[k] ?? "";
      update["system.money"] = Number(det.money) || 0;
      if (det.name) update.name = det.name;
      update["system.experience.log"] = log;
      update["system.creation"] = true;
      await actor.update(update);

      ui.notifications.info("GENESYS.Wizard.Done", { localize: true });
      this.close();
      actor.sheet.render({ force: true });
    } catch (err) {
      console.error("genesys-rpg |", err);
      ui.notifications.error(`Genesys: ${err.message}`, { permanent: true });
    }
  }
}
