import { GENESYS, SYSTEM_ID } from "../config.mjs";
import { DicePool } from "../dice/pool.mjs";
import { DicePoolDialog } from "../apps/dice-pool-dialog.mjs";

/**
 * Актёр Genesys: персонаж или противник.
 */
export class GenesysActor extends Actor {

  /* -------------------------------------------- */
  /*  Создание                                    */
  /* -------------------------------------------- */

  /** @override */
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;

    const updates = {};
    if (this.type === "character") {
      updates["prototypeToken.actorLink"] = true;
      updates["prototypeToken.disposition"] = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
    }

    // Новым персонажам — базовый набор навыков, если навыков ещё нет.
    const hasSkills = this.items.some(i => i.type === "skill");
    if (this.type === "character" && !hasSkills) {
      const preset = game.settings.get(SYSTEM_ID, "skillPreset");
      const skills = GenesysActor.defaultSkillData(preset);
      if (skills.length) updates.items = [...(data.items ?? []), ...skills];
    }
    this.updateSource(updates);
  }

  /** Данные навыков по пресету настройки мира. */
  static defaultSkillData(preset = "all") {
    if (preset === "none") return [];
    return GENESYS.defaultSkills
      .filter(s => preset === "all" || s.settings.includes("all") || s.settings.includes(preset))
      .map(s => ({
        name: game.i18n.localize(`GENESYS.Skill.${s.key}`),
        type: "skill",
        img: "icons/svg/book.svg",
        system: { key: s.key, characteristic: s.characteristic, category: s.category, rank: 0, career: false }
      }));
  }

  /* -------------------------------------------- */
  /*  Поиск                                       */
  /* -------------------------------------------- */

  get isCharacter() { return this.type === "character"; }

  /** Найти навык по ключу или имени (без учёта регистра). */
  getSkill(keyOrName) {
    if (!keyOrName) return null;
    const needle = String(keyOrName).trim().toLowerCase();
    const skills = this.itemTypes.skill;
    return skills.find(s => s.system.key && s.system.key.toLowerCase() === needle)
      ?? skills.find(s => s.name.toLowerCase() === needle)
      ?? null;
  }

  characteristic(key) {
    return this.system.characteristics?.[key]?.value ?? 0;
  }

  /** Эффективный ранг навыка (у прислужников — по размеру группы). */
  skillRank(skill) {
    if (!skill) return 0;
    if (this.type === "adversary" && this.system.isMinion) {
      if (!skill.system.career) return 0;
      const alive = this.system.aliveMinions ?? this.system.groupSize;
      return Math.clamp(alive - 1, 0, 5);
    }
    return skill.system.rank;
  }

  /** Пул для навыка. */
  getSkillPool(skill, difficulty = 2) {
    const char = this.characteristic(skill.system.characteristic);
    return DicePool.fromSkill(char, this.skillRank(skill), difficulty);
  }

  /* -------------------------------------------- */
  /*  Броски                                      */
  /* -------------------------------------------- */

  /**
   * Проверка навыка.
   * @param {Item|string} skillOrKey
   * @param {object} [options]
   * @param {number} [options.difficulty=2]
   * @param {boolean} [options.skipDialog=false]
   */
  async rollSkill(skillOrKey, { difficulty = 2, skipDialog = false, label, rollOptions = {} } = {}) {
    const skill = typeof skillOrKey === "string" ? this.getSkill(skillOrKey) : skillOrKey;
    if (!skill) {
      ui.notifications.warn(game.i18n.format("GENESYS.Warn.SkillNotFound", { name: skillOrKey }));
      return null;
    }
    const pool = this.getSkillPool(skill, difficulty);
    const charLabel = game.i18n.localize(GENESYS.characteristics[skill.system.characteristic].abbr);
    label ??= `${skill.name} (${charLabel})`;
    if (skipDialog) return DicePoolDialog.rollPool(pool, { label, actor: this, rollOptions });
    return DicePoolDialog.prompt({ pool, label, actor: this, rollOptions });
  }

  /** Проверка чистой характеристики. */
  async rollCharacteristic(key, { difficulty = 2 } = {}) {
    const pool = new DicePool({ ability: this.characteristic(key), difficulty });
    const label = game.i18n.localize(GENESYS.characteristics[key].label);
    return DicePoolDialog.prompt({ pool, label, actor: this });
  }

  /** Атака оружием. */
  async rollWeapon(weapon) {
    const sys = weapon.system;
    const skill = this.getSkill(sys.skill);
    const difficulty = sys.isMelee ? 2 : (GENESYS.ranges[sys.range]?.difficulty ?? 2);
    const pool = skill ? this.getSkillPool(skill, difficulty) : new DicePool({ ability: 1, difficulty });
    const rollOptions = {
      weapon: {
        name: weapon.name,
        damage: sys.totalDamage,
        crit: sys.crit,
        qualities: sys.qualitiesText
      }
    };
    const label = game.i18n.format("GENESYS.Roll.Attack", { name: weapon.name });
    return DicePoolDialog.prompt({ pool, label, actor: this, rollOptions });
  }

  /* -------------------------------------------- */
  /*  Опыт                                        */
  /* -------------------------------------------- */

  get availableXP() { return this.system.experience?.available ?? 0; }

  /** Добавить запись в журнал опыта. */
  async logXP(type, amount, label) {
    if (!this.isCharacter) return;
    const log = foundry.utils.deepClone(this.system.experience.log);
    log.push({ id: foundry.utils.randomID(), type, amount, label, timestamp: Date.now() });
    return this.update({ "system.experience.log": log });
  }

  /** Удалить запись журнала (возврат опыта). */
  async removeXPEntry(id) {
    const log = this.system.experience.log.filter(e => e.id !== id);
    return this.update({ "system.experience.log": log });
  }

  /**
   * Потратить опыт, если включена автоматизация.
   * @returns {Promise<boolean>} удалось ли
   */
  async spendXP(amount, label) {
    if (!this.isCharacter || !this.system.autoXP || amount <= 0) return true;
    if (amount > this.availableXP) {
      ui.notifications.warn(game.i18n.format("GENESYS.Warn.NotEnoughXP", { cost: amount, available: this.availableXP }));
      return false;
    }
    await this.logXP("spend", amount, label);
    return true;
  }

  /** Вернуть опыт за последнюю покупку с таким же описанием. */
  async refundXP(label) {
    if (!this.isCharacter || !this.system.autoXP) return;
    const log = [...this.system.experience.log];
    const idx = log.findLastIndex(e => e.type === "spend" && e.label === label);
    if (idx < 0) return;
    log.splice(idx, 1);
    return this.update({ "system.experience.log": log });
  }

  /** Повысить/понизить ранг навыка с учётом опыта. */
  async changeSkillRank(skill, delta) {
    const current = skill.system.rank;
    const next = current + delta;
    if (next < 0 || next > GENESYS.xp.maxSkill) return;

    if (this.isCharacter) {
      if (delta > 0 && this.system.creation && next > GENESYS.xp.maxSkillCreation && this.system.autoXP) {
        return ui.notifications.warn(game.i18n.format("GENESYS.Warn.SkillCreationMax", { max: GENESYS.xp.maxSkillCreation }));
      }
      const rankForCost = delta > 0 ? next : current;
      const label = game.i18n.format("GENESYS.XP.SkillRank", { name: skill.name, rank: rankForCost });
      if (delta > 0) {
        const cost = GENESYS.xp.skill(next, skill.system.career);
        if (!(await this.spendXP(cost, label))) return;
      }
      else await this.refundXP(label);
    }
    return skill.update({ "system.rank": next });
  }

  /** Изменить характеристику. В режиме создания — за опыт. */
  async changeCharacteristic(key, delta) {
    const current = this.characteristic(key);
    const next = current + delta;
    const creation = this.isCharacter && this.system.creation;
    const max = creation ? GENESYS.xp.maxCharacteristicCreation : GENESYS.xp.maxCharacteristic;
    if (next < 1 || next > max) return;

    if (creation) {
      const name = game.i18n.localize(GENESYS.characteristics[key].label);
      const value = delta > 0 ? next : current;
      const label = game.i18n.format("GENESYS.XP.Characteristic", { name, value });
      if (delta > 0) {
        if (!(await this.spendXP(GENESYS.xp.characteristic(next), label))) return;
      }
      else await this.refundXP(label);
    }
    return this.update({ [`system.characteristics.${key}.value`]: next });
  }

  /* -------------------------------------------- */
  /*  Архетип, карьера, таланты                   */
  /* -------------------------------------------- */

  /** Применить архетип: характеристики, базы порогов, стартовый опыт. */
  async applyArchetype(archetypeData) {
    const sys = archetypeData.system;
    const old = this.itemTypes.archetype;
    if (old.length) await this.deleteEmbeddedDocuments("Item", old.map(i => i.id));

    const update = {
      "system.wounds.base": sys.wounds,
      "system.strain.base": sys.strain
    };
    for (const [k, v] of Object.entries(sys.characteristics)) update[`system.characteristics.${k}.value`] = v;

    // Стартовый опыт: заменяем предыдущую запись архетипа.
    const startLabel = game.i18n.format("GENESYS.XP.StartingXP", { name: archetypeData.name });
    const log = this.system.experience.log.filter(e => e.kind !== "archetype");
    log.unshift({ id: foundry.utils.randomID(), type: "earn", kind: "archetype", amount: sys.startingXP, label: startLabel, timestamp: Date.now() });
    update["system.experience.log"] = log;

    await this.update(update);
    const [created] = await this.createEmbeddedDocuments("Item", [archetypeData.toObject?.() ?? archetypeData]);
    ui.notifications.info(game.i18n.format("GENESYS.Info.ArchetypeApplied", { name: archetypeData.name }));
    return created;
  }

  /** Применить карьеру: отметить карьерные навыки (создать недостающие). */
  async applyCareer(careerData) {
    const old = this.itemTypes.career;
    if (old.length) await this.deleteEmbeddedDocuments("Item", old.map(i => i.id));

    const names = careerData.system.careerSkills.map(n => n.trim().toLowerCase()).filter(Boolean);
    const updates = [];
    const found = new Set();
    for (const skill of this.itemTypes.skill) {
      const match = names.includes(skill.name.toLowerCase()) || (skill.system.key && names.includes(skill.system.key.toLowerCase()));
      if (match) found.add(names.find(n => n === skill.name.toLowerCase() || n === skill.system.key.toLowerCase()));
      if (skill.system.career !== match) updates.push({ _id: skill.id, "system.career": match });
    }
    if (updates.length) await this.updateEmbeddedDocuments("Item", updates);

    const missing = careerData.system.careerSkills.filter(n => !found.has(n.trim().toLowerCase()));
    if (missing.length) {
      ui.notifications.warn(game.i18n.format("GENESYS.Warn.CareerSkillsMissing", { list: missing.join(", ") }));
    }

    const [created] = await this.createEmbeddedDocuments("Item", [careerData.toObject?.() ?? careerData]);
    ui.notifications.info(game.i18n.format("GENESYS.Info.CareerApplied", { name: careerData.name }));
    return created;
  }

  /**
   * Добавить талант: если такой ранжированный уже есть — повысить ранг.
   * Проверяет пирамиду и списывает опыт.
   */
  async addTalent(talentData) {
    const data = talentData.toObject?.() ?? foundry.utils.deepClone(talentData);
    const existing = this.itemTypes.talent.find(t => t.name === data.name);

    if (existing && !existing.system.ranked) {
      ui.notifications.warn(game.i18n.format("GENESYS.Warn.TalentOwned", { name: data.name }));
      return null;
    }

    const tier = existing ? existing.system.nextTier : data.system.tier;
    if (this.isCharacter && !this.system.canAddTalentTier(tier)) {
      const proceed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "GENESYS.Talent.Pyramid" },
        content: `<p>${game.i18n.format("GENESYS.Warn.TalentPyramid", { tier, lower: tier - 1 })}</p>`
      });
      if (!proceed) return null;
    }

    const rank = existing ? existing.system.rank + 1 : 1;
    const label = game.i18n.format("GENESYS.XP.Talent", { name: data.name, rank, tier });
    if (!(await this.spendXP(GENESYS.xp.talent(tier), label))) return null;

    if (existing) return existing.update({ "system.rank": rank });
    data.system.rank = 1;
    const [created] = await this.createEmbeddedDocuments("Item", [data]);
    return created;
  }

  /* -------------------------------------------- */
  /*  Данные для бросков и формул                 */
  /* -------------------------------------------- */

  /** @override */
  getRollData() {
    const data = super.getRollData();
    for (const [k, v] of Object.entries(this.system.characteristics ?? {})) data[k] = v.value;
    return data;
  }
}
