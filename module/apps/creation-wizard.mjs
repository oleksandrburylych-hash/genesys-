import { GENESYS, SYSTEM_ID, TEMPLATES } from "../config.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const STEPS = ["archetype", "career", "careerSkills", "startingSkills", "heroic", "summary"];

/**
 * Мастер создания персонажа:
 * раса/архетип → карьера → 4 бесплатных ранга карьерных навыков → стартовые навыки → героическая способность → итог.
 */
export class CreationWizard extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ actor, ...options } = {}) {
    super(options);
    this.actor = actor;
    this.step = 0;
    this.choice = { archetype: null, career: null, careerSkills: [], startingSkills: [], heroic: null };
    this.options_ = null;
  }

  static DEFAULT_OPTIONS = {
    classes: ["genesys", "creation-wizard"],
    tag: "form",
    window: { title: "GENESYS.Wizard.Title", icon: "fa-solid fa-hat-wizard", resizable: true },
    position: { width: 640, height: 680 },
    actions: {
      next: CreationWizard.#onNext,
      back: CreationWizard.#onBack,
      pick: CreationWizard.#onPick,
      toggleSkill: CreationWizard.#onToggleSkill,
      finish: CreationWizard.#onFinish
    },
    form: { handler: CreationWizard.#onChange, submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = { main: { template: `${TEMPLATES}/apps/creation-wizard.hbs`, scrollable: [".wizard-body"] } };

  /** Документы выбранного типа из компендиумов системы и мира: [{uuid, name, folder, doc}]. */
  async #collect(type, packName) {
    const out = [];
    const pack = game.packs.get(`${SYSTEM_ID}.${packName}`);
    if (pack) {
      const docs = await pack.getDocuments();
      for (const d of docs) if (d.type === type) out.push({ uuid: d.uuid, name: d.name, folder: d.folder?.name ?? "", doc: d });
    }
    for (const d of game.items.filter(i => i.type === type)) out.push({ uuid: d.uuid, name: d.name, folder: game.i18n.localize("GENESYS.Wizard.World"), doc: d });
    return out.sort((a, b) => a.folder.localeCompare(b.folder) || a.name.localeCompare(b.name));
  }

  async #ensureOptions() {
    if (this.options_) return this.options_;
    this.options_ = {
      archetype: await this.#collect("archetype", "archetypes"),
      career: await this.#collect("career", "careers"),
      heroic: await this.#collect("heroic", "heroic")
    };
    return this.options_;
  }

  get stepKey() { return STEPS[this.step]; }

  #find(kind) { return this.options_?.[kind]?.find(o => o.uuid === this.choice[kind]) ?? null; }

  /** @override */
  async _prepareContext(options) {
    try { return await this.#buildContext(); }
    catch (err) {
      console.error("genesys-rpg |", err);
      ui.notifications.error(`Genesys: ${err.message}`, { permanent: true });
      throw err;
    }
  }

  async #buildContext() {
    const opts = await this.#ensureOptions();
    const archetype = this.#find("archetype")?.doc;
    const career = this.#find("career")?.doc;
    const group = list => {
      const groups = new Map();
      for (const o of list) {
        if (!groups.has(o.folder)) groups.set(o.folder, []);
        groups.get(o.folder).push({ ...o, selected: Object.values(this.choice).includes(o.uuid) });
      }
      return [...groups.entries()].map(([folder, items]) => ({ folder, items }));
    };
    const allSkills = this.actor.itemTypes.skill.map(s => s.name).sort((a, b) => a.localeCompare(b));
    return {
      step: this.stepKey,
      stepIndex: this.step + 1,
      stepCount: STEPS.length,
      isFirst: this.step === 0,
      isLast: this.step === STEPS.length - 1,
      stepTitle: `GENESYS.Wizard.Step.${this.stepKey}`,
      archetypes: group(opts.archetype),
      careers: group(opts.career),
      heroics: group(opts.heroic),
      hasHeroics: opts.heroic.length > 0,
      archetype: archetype ? {
        name: archetype.name,
        chars: Object.entries(archetype.system.characteristics).map(([k, v]) => ({ label: GENESYS.characteristics[k].label, value: v })),
        wounds: archetype.system.wounds, strain: archetype.system.strain, xp: archetype.system.startingXP,
        startingSkills: archetype.system.startingSkills,
        abilities: archetype.system.abilities.map(a => a.name).join(", ")
      } : null,
      career: career ? { name: career.name, skills: career.system.careerSkills } : null,
      careerSkillOptions: (career?.system.careerSkills ?? []).map(n => ({ name: n, checked: this.choice.careerSkills.includes(n) })),
      careerSkillCount: this.choice.careerSkills.length,
      startingSkillOptions: allSkills.map(n => ({ name: n, checked: this.choice.startingSkills.includes(n) })),
      heroic: this.#find("heroic")?.doc?.name ?? null,
      chosenCareerSkills: this.choice.careerSkills.join(", "),
      chosenStartingSkills: this.choice.startingSkills.join(", ")
    };
  }

  static #onChange() { /* выбор идёт через кнопки */ }

  static #onPick(event, target) {
    this.choice[target.dataset.kind] = target.dataset.uuid;
    if (target.dataset.kind === "career") this.choice.careerSkills = [];
    this.render();
  }

  static #onToggleSkill(event, target) {
    const list = this.choice[target.dataset.list];
    const name = target.dataset.name;
    const i = list.indexOf(name);
    if (i >= 0) list.splice(i, 1);
    else {
      const max = target.dataset.list === "careerSkills" ? 4 : 3;
      if (list.length >= max) return ui.notifications.warn(game.i18n.format("GENESYS.Wizard.MaxSkills", { max }));
      list.push(name);
    }
    this.render();
  }

  static #onNext() {
    if (this.stepKey === "archetype" && !this.choice.archetype) return ui.notifications.warn("GENESYS.Wizard.PickArchetype", { localize: true });
    if (this.stepKey === "career" && !this.choice.career) return ui.notifications.warn("GENESYS.Wizard.PickCareer", { localize: true });
    this.step = Math.min(STEPS.length - 1, this.step + 1);
    if (this.stepKey === "heroic" && !this.options_.heroic.length) this.step += 1;
    this.render();
  }

  static #onBack() {
    this.step = Math.max(0, this.step - 1);
    if (this.stepKey === "heroic" && !this.options_.heroic.length) this.step -= 1;
    this.render();
  }

  /** Найти навык персонажа по имени или создать его из компендиума навыков. */
  async #ensureSkill(name) {
    const actor = this.actor;
    let skill = actor.getSkill(name);
    if (skill) return skill;
    const pack = game.packs.get(`${SYSTEM_ID}.skills`);
    const doc = pack ? (await pack.getDocuments()).find(d => d.name === name) : null;
    if (!doc) return null;
    [skill] = await actor.createEmbeddedDocuments("Item", [doc.toObject()]);
    return skill;
  }

  static async #onFinish() {
    const actor = this.actor;
    const archetype = this.#find("archetype")?.doc;
    const career = this.#find("career")?.doc;
    if (archetype) await actor.applyArchetype(archetype);
    if (career) {
      for (const name of career.system.careerSkills) await this.#ensureSkill(name);
      await actor.applyCareer(career);
    }
    // Бесплатные ранги: 4 карьерных навыка и стартовые навыки архетипа — без траты опыта.
    const free = [...this.choice.careerSkills, ...this.choice.startingSkills];
    const updates = [];
    for (const name of free) {
      const skill = await this.#ensureSkill(name);
      if (!skill) continue;
      const pending = updates.find(u => u._id === skill.id);
      if (pending) pending["system.rank"] = Math.min(2, pending["system.rank"] + 1);
      else updates.push({ _id: skill.id, "system.rank": Math.min(2, skill.system.rank + 1) });
    }
    if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
    const heroic = this.#find("heroic")?.doc;
    if (heroic) await actor.createEmbeddedDocuments("Item", [heroic.toObject()]);
    await actor.update({ "system.creation": true });
    ui.notifications.info("GENESYS.Wizard.Done", { localize: true });
    this.close();
    actor.sheet.render({ force: true });
  }
}
