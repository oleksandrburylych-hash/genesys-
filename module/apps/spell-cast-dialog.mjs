import { GENESYS, TEMPLATES } from "../config.mjs";
import { DicePoolDialog } from "./dice-pool-dialog.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

/** Характеристика, связанная с магическим навыком (урон Атаки). */
const MAGIC_CHAR = GENESYS.magicSkills;
/** Предельная сложность заклинания — Запредельная. */
const MAX_DIFFICULTY = 5;
/** Сколько усталости стоит проверка заклинания. */
const STRAIN_COST = 2;

/**
 * Конструктор заклинания: выбор навыка, дополнительных эффектов и фокуса,
 * подсчёт итоговой сложности, бросок и сохранение готового заклинания.
 */
export class SpellCastDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ actor, spell, ...options } = {}) {
    super(options);
    this.actor = actor;
    this.spell = spell;
    const sys = spell.system;

    // Начальный выбор: для готового заклинания — его эффекты.
    this.counts = sys.effects.map(e => sys.selected.filter(n => n === e.name).length);
    const usable = this.usableSkills;
    this.skillKey = usable.find(k => this.actor?.getSkill(k)?.system.rank > 0) ?? usable[0] ?? "arcana";
    this.implementId = this.implements[0]?.id ?? "";
    // Пси-силы (PSI) по правилам дополнения не стоят усталости; обычная магия — 2 усталости.
    this.sufferStrain = !(sys.skills.length && sys.skills.every(k => k.startsWith("psi")));
  }

  static DEFAULT_OPTIONS = {
    classes: ["genesys", "spell-cast-dialog"],
    tag: "form",
    window: { title: "GENESYS.Spell.Cast", icon: "fa-solid fa-wand-sparkles", resizable: true },
    position: { width: 560, height: "auto" },
    actions: {
      toggleEffect: SpellCastDialog.#onToggleEffect,
      effectCount: SpellCastDialog.#onEffectCount,
      cast: SpellCastDialog.#onCast,
      save: SpellCastDialog.#onSave
    },
    form: { handler: SpellCastDialog.#onChange, submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = {
    form: { template: `${TEMPLATES}/dialog/spell-cast.hbs`, scrollable: [".spell-effects"] }
  };

  /** @override */
  get title() {
    return `${game.i18n.localize("GENESYS.Spell.Cast")}: ${this.spell.name}`;
  }

  /** Навыки, которыми можно наложить заклинание. */
  get usableSkills() {
    const s = this.spell.system.skills;
    return s.length ? s : Object.keys(GENESYS.magicSkills);
  }

  /** Магические фокусы персонажа (снаряжение с бонусом к урону или из папки «Магия»). */
  get implements() {
    return (this.actor?.itemTypes.gear ?? []).filter(i => i.system.implementDamage > 0 || /фокус|implement|жезл|посох|сфера|кольцо|символ|венец|рун|камень странника|музыкальн|инструмент/i.test(i.name));
  }

  /** Ранг Знания: максимальный среди навыков категории «знания». */
  get knowledgeRank() {
    const ranks = (this.actor?.itemTypes.skill ?? []).filter(s => s.system.category === "knowledge").map(s => s.system.rank);
    return ranks.length ? Math.max(...ranks) : 0;
  }

  get baseDifficulty() {
    return this.spell.system.baseDifficulty;
  }

  /** Выбранные эффекты [{effect, count}]. */
  get chosen() {
    return this.spell.system.effects
      .map((effect, i) => ({ effect, count: this.counts[i] ?? 0 }))
      .filter(c => c.count > 0);
  }

  get totalDifficulty() {
    return this.baseDifficulty + this.chosen.reduce((sum, c) => sum + c.effect.difficulty * c.count, 0);
  }

  /** Урон Атаки: характеристика (удвоенная при «усиленном» эффекте) + бонус фокуса. */
  get attackDamage() {
    const char = this.actor?.characteristic(MAGIC_CHAR[this.skillKey]) ?? 0;
    const doubled = this.chosen.some(c => /удвоенн|double/i.test(c.effect.description));
    const implement = this.actor?.items.get(this.implementId);
    return (doubled ? char * 2 : char) + (implement?.system.implementDamage ?? 0);
  }

  /** Критическое значение Атаки: из эффекта («критическое значение 2») или 0 — только триумф. */
  get attackCrit() {
    for (const c of this.chosen) {
      const m = c.effect.description.match(/критическ\w* значени\w* (\d)/i) ?? c.effect.description.match(/crit(?:ical)? rating (?:of )?(\d)/i);
      if (m) return Number(m[1]);
    }
    return 0;
  }

  /** @override */
  async _prepareContext() {
    const sys = this.spell.system;
    const total = this.totalDifficulty;
    const skillOptions = this.usableSkills.map(key => {
      const skill = this.actor?.getSkill(key);
      return {
        key,
        label: skill?.name ?? game.i18n.localize(`GENESYS.Skill.${key}`),
        rank: skill?.system.rank ?? 0,
        selected: key === this.skillKey
      };
    });
    const skill = this.actor?.getSkill(this.skillKey);
    const pool = skill ? this.actor.getSkillPool(skill, Math.min(total, MAX_DIFFICULTY)) : null;
    return {
      spell: this.spell,
      description: sys.description,
      concentration: sys.concentration,
      attack: sys.attack,
      skillOptions,
      effects: sys.effects.map((e, i) => {
        const allowed = !e.skills.length || e.skills.includes(this.skillKey);
        return {
          index: i,
          name: e.name,
          difficulty: e.difficulty,
          description: e.description,
          repeatable: e.repeatable,
          count: this.counts[i] ?? 0,
          isChosen: (this.counts[i] ?? 0) > 0,
          allowed,
          only: e.skills.map(k => game.i18n.localize(`GENESYS.Skill.${k}`)).join(", ")
        };
      }),
      baseDifficulty: this.baseDifficulty,
      total,
      tooHard: total > MAX_DIFFICULTY,
      difficultyLabel: game.i18n.localize(GENESYS.difficulties[Math.min(total, MAX_DIFFICULTY)] ?? ""),
      pool: pool?.display ?? [],
      implements: this.implements.map(i => ({ id: i.id, name: i.name, bonus: i.system.implementDamage, selected: i.id === this.implementId })),
      attackDamage: this.attackDamage,
      attackCrit: this.attackCrit,
      knowledgeRank: this.knowledgeRank,
      sufferStrain: this.sufferStrain,
      strainCost: STRAIN_COST,
      canCast: !!this.actor && total <= MAX_DIFFICULTY,
      canSave: !!this.actor?.isOwner
    };
  }

  static #onChange(event, form, formData) {
    const data = formData.object;
    if (data.skillKey) this.skillKey = data.skillKey;
    if ("implementId" in data) this.implementId = data.implementId;
    if ("sufferStrain" in data) this.sufferStrain = !!data.sufferStrain;
    // Эффекты, недоступные выбранному навыку, снимаются.
    this.spell.system.effects.forEach((e, i) => {
      if (e.skills.length && !e.skills.includes(this.skillKey)) this.counts[i] = 0;
    });
    this.render();
  }

  static #onToggleEffect(event, target) {
    const i = Number(target.dataset.index);
    this.counts[i] = this.counts[i] > 0 ? 0 : 1;
    this.render();
  }

  static #onEffectCount(event, target) {
    const i = Number(target.dataset.index);
    this.counts[i] = Math.max(0, (this.counts[i] ?? 0) + Number(target.dataset.delta));
    this.render();
  }

  /** Описание выбранных эффектов для карточки в чате. */
  _chosenForChat() {
    return this.chosen.map(c => ({ name: c.effect.name, count: c.count, description: c.effect.description }));
  }

  static async #onCast() {
    const actor = this.actor;
    const skill = actor?.getSkill(this.skillKey);
    if (!skill) {
      return ui.notifications.warn(game.i18n.format("GENESYS.Warn.SkillNotFound", { name: game.i18n.localize(`GENESYS.Skill.${this.skillKey}`) }));
    }
    const total = this.totalDifficulty;
    if (total > MAX_DIFFICULTY) return ui.notifications.warn("GENESYS.Spell.TooHard", { localize: true });

    const pool = actor.getSkillPool(skill, total);
    const rollOptions = {
      spell: {
        name: this.spell.name,
        skill: skill.name,
        effects: this._chosenForChat(),
        concentration: this.spell.system.concentration,
        knowledgeRank: this.knowledgeRank
      }
    };
    if (this.spell.system.attack) {
      rollOptions.weapon = { name: this.spell.name, damage: this.attackDamage, crit: this.attackCrit, qualities: "", vicious: 0 };
    }
    const label = `${this.spell.name} (${skill.name})`;
    const roll = await DicePoolDialog.prompt({ pool, label, actor, rollOptions });
    if (roll && this.sufferStrain && actor.system.strain) {
      await actor.update({ "system.strain.value": actor.system.strain.value + STRAIN_COST });
    }
    if (roll) this.close();
    return roll;
  }

  /** Сохранить текущую настройку как готовое заклинание на листе персонажа. */
  static async #onSave() {
    const effectsText = this.chosen.map(c => c.count > 1 ? `${c.effect.name} ×${c.count}` : c.effect.name).join(", ");
    const result = await DialogV2.input({
      window: { title: "GENESYS.Spell.Save" },
      content: `<div class="form-group"><label>${game.i18n.localize("GENESYS.Name")}</label>
        <input type="text" name="name" value="${foundry.utils.escapeHTML(this.spell.name)}${effectsText ? ` (${foundry.utils.escapeHTML(effectsText)})` : ""}" autofocus></div>`,
      ok: { label: "GENESYS.Spell.Save" }
    });
    if (!result?.name) return;
    const data = this.spell.toObject();
    delete data._id;
    data.name = result.name;
    data.system.baseAction = this.spell.system.baseAction || this.spell.name;
    data.system.selected = this.chosen.flatMap(c => Array(c.count).fill(c.effect.name));
    data.system.difficulty = Math.min(this.totalDifficulty, MAX_DIFFICULTY);
    data.system.skills = [this.skillKey];
    const [item] = await this.actor.createEmbeddedDocuments("Item", [data]);
    ui.notifications.info(game.i18n.format("GENESYS.Spell.Saved", { name: item.name }));
  }
}
