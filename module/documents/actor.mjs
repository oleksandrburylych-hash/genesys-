import { GENESYS, SYSTEM_ID } from "../config.mjs";
import { DicePool } from "../dice/pool.mjs";
import { DicePoolDialog } from "../apps/dice-pool-dialog.mjs";
import { getTargets, attackModifiers, applyStateModifiers, actOnActor } from "../combat/combat.mjs";
import { getAdventure } from "../worlds.mjs";
import { enabledAdventureKeys, adventureSkillKeys } from "../helpers/adventure.mjs";

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
    if (!data.img || data.img === CONST.DEFAULT_TOKEN || data.img === "icons/svg/mystery-man.svg") {
      const img = { character: GENESYS.icons?.defaults?.archetype, adversary: GENESYS.icons?.defaults?.adversary, vehicle: GENESYS.icons?.defaults?.vehicle }[this.type];
      if (img) { updates.img = img; updates["prototypeToken.texture.src"] = img; }
    }
    if (this.type === "character") {
      updates["prototypeToken.actorLink"] = true;
      updates["prototypeToken.disposition"] = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
    }

    // Новым персонажам — базовый набор навыков, если навыков ещё нет.
    const hasSkills = this.items.some(i => i.type === "skill");
    if (this.type === "character" && !hasSkills) {
      // Если ведущий разрешил один тип приключения — сразу его набор навыков, иначе — пресет мира.
      const enabled = enabledAdventureKeys();
      let skills;
      if (enabled.length === 1 && !data.system?.adventure) {
        const adventure = getAdventure(enabled[0]);
        updates["system.adventure"] = adventure.key;
        skills = adventure.skills === "all" ? GenesysActor.defaultSkillData("all") : GenesysActor.skillDataFromKeys(adventureSkillKeys(adventure));
      } else {
        skills = GenesysActor.defaultSkillData(game.settings.get(SYSTEM_ID, "skillPreset"));
      }
      if (skills.length) updates.items = [...(data.items ?? []), ...skills];
    }
    this.updateSource(updates);
  }

  /** Данные навыков по списку ключей. */
  static skillDataFromKeys(keys) {
    return keys.map(key => {
      const def = GENESYS.defaultSkills.find(s => s.key === key) ?? { key, ...GENESYS.extraSkills[key] };
      return {
        name: game.i18n.localize(`GENESYS.Skill.${key}`),
        type: "skill",
        img: GENESYS.icons?.skills?.[key] ?? "icons/svg/book.svg",
        system: { key, characteristic: def.characteristic ?? "intellect", category: def.category ?? "general", rank: 0, career: false }
      };
    });
  }

  /** Данные навыков по пресету настройки мира. */
  static defaultSkillData(preset = "all") {
    if (preset === "none") return [];
    const explicit = GENESYS.presetSkills?.[preset];
    if (explicit) {
      return explicit.map(key => {
        const def = GENESYS.defaultSkills.find(s => s.key === key) ?? { key, ...GENESYS.extraSkills[key] };
        return {
          name: game.i18n.localize(`GENESYS.Skill.${key}`),
          type: "skill",
          img: GENESYS.icons?.skills?.[key] ?? "icons/svg/book.svg",
          system: { key, characteristic: def.characteristic, category: def.category, rank: 0, career: false }
        };
      });
    }
    return GENESYS.defaultSkills
      .filter(s => preset === "all" || s.settings.includes("all") || s.settings.includes(preset))
      .map(s => ({
        name: game.i18n.localize(`GENESYS.Skill.${s.key}`),
        type: "skill",
        img: GENESYS.icons?.skills?.[s.key] ?? "icons/svg/book.svg",
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
    const key = skill.system.key;
    const target = getTargets()[0] ?? null;
    if (skill.system.category === "social") rollOptions = { ...rollOptions, social: true };
    const notes = [];
    let pool = this.getSkillPool(skill, difficulty);

    // Встречная проверка: сложность строится из навыка цели.
    const opposedKey = GENESYS.opposed[key];
    if (target && opposedKey && target.actor.getSkillPool) {
      const oppSkill = target.actor.getSkill(opposedKey);
      const oppChar = oppSkill ? target.actor.characteristic(oppSkill.system.characteristic) : 0;
      const opp = oppSkill ? target.actor.getSkillPool(oppSkill, 0) : null;
      pool.difficulty = opp ? opp.ability : Math.max(1, oppChar);
      pool.challenge = opp ? opp.proficiency : 0;
      notes.push(game.i18n.format("GENESYS.Combat.Opposed", { name: target.actor.name, skill: oppSkill?.name ?? game.i18n.localize(`GENESYS.Skill.${opposedKey}`) }));
    }

    // Медицина по цели: сложность по ранам цели, после броска — лечение.
    let healTarget = null;
    if (key === "medicine" && target?.actor.system.wounds) {
      const w = target.actor.system.wounds;
      pool.setDifficulty(w.value > w.max ? 3 : (w.value > w.max / 2 ? 2 : 1));
      if (target.actor === this) { pool.upgradeDifficulty(2); notes.push(game.i18n.localize("GENESYS.Combat.HealSelf")); }
      notes.push(game.i18n.format("GENESYS.Combat.HealTarget", { name: target.actor.name, wounds: w.value, max: w.max }));
      healTarget = target.actor;
    }

    notes.push(...applyStateModifiers(this, pool, { characteristic: skill.system.characteristic }));
    const charLabel = game.i18n.localize(GENESYS.characteristics[skill.system.characteristic].abbr);
    label ??= `${skill.name} (${charLabel})`;
    const roll = skipDialog
      ? await DicePoolDialog.rollPool(pool, { label, actor: this, rollOptions })
      : await DicePoolDialog.prompt({ pool, label, actor: this, rollOptions, notes });

    if (roll && healTarget) {
      const r = roll.results;
      if (r.isSuccess) await actOnActor(healTarget, "adjust", { wounds: -r.success, strain: -r.advantage });
    }
    return roll;
  }

  /** Открыть конструктор заклинания. */
  async castSpell(spell) {
    const { SpellCastDialog } = await import("../apps/spell-cast-dialog.mjs");
    return new SpellCastDialog({ actor: this, spell }).render({ force: true });
  }

  /** Проверка чистой характеристики. */
  async rollCharacteristic(key, { difficulty = 2 } = {}) {
    const pool = new DicePool({ ability: this.characteristic(key), difficulty });
    const notes = applyStateModifiers(this, pool, { characteristic: key });
    const label = game.i18n.localize(GENESYS.characteristics[key].label);
    return DicePoolDialog.prompt({ pool, label, actor: this, notes });
  }

  /** Атака оружием: цель, дистанция, защита, «Противник», состояния — автоматически. */
  async rollWeapon(weapon) {
    const sys = weapon.system;
    // Оружие транспорта стреляет член экипажа: выделенный токен (не сам транспорт) или назначенный персонаж.
    const shooter = this.type === "vehicle" ? GenesysActor.findCrewMember(this) : this;
    const skill = shooter?.getSkill?.(sys.skill);
    const target = getTargets()[0] ?? null;
    const mods = attackModifiers(this.type === "vehicle" ? this : shooter, weapon, target);
    const pool = skill ? shooter.getSkillPool(skill, mods.difficulty) : new DicePool({ ability: 1, difficulty: mods.difficulty });
    pool.setback += mods.setback;
    pool.boost += mods.boost;
    if (mods.upgrades) pool.upgradeDifficulty(mods.upgrades);
    const notes = [...mods.notes, ...applyStateModifiers(shooter, pool, { characteristic: skill?.system.characteristic })];

    const active = sys.allQualities
      .filter(q => GENESYS.activeQualities[q.name])
      .map(q => ({ name: q.name, rating: q.rating ?? 0, cost: GENESYS.activeQualities[q.name].cost }));
    const rollOptions = {
      weapon: {
        name: weapon.name,
        damage: sys.totalDamage,
        crit: sys.totalCrit,
        qualities: sys.qualitiesText,
        vicious: sys.qualityRating(/высококрит|vicious/i),
        pierce: sys.qualityRating(/проникающ|pierce/i),
        breach: sys.qualityRating(/бронебойн|breach/i),
        stun: sys.qualityRating(/оглушающий урон|stun damage/i) > 0,
        active
      },
      target: target ? { uuid: target.actor.uuid, name: target.actor.name } : null,
      melee: sys.isMelee || ["melee", "meleeLight", "meleeHeavy", "brawl"].includes(sys.skill)
    };
    let label = game.i18n.format("GENESYS.Roll.Attack", { name: weapon.name });
    if (this.type === "vehicle") label += ` (${this.name}${shooter && shooter !== this ? `, ${shooter.name}` : ""})`;
    if (target) label += ` → ${target.actor.name}`;
    if (mods.blocked) ui.notifications.warn(mods.notes.at(-1));
    return DicePoolDialog.prompt({ pool, label, actor: shooter ?? this, rollOptions, notes, dodge: mods.dodge ?? null });
  }

  /** Член экипажа для транспорта: выделенный токен-персонаж или назначенный персонаж пользователя. */
  static findCrewMember(vehicle) {
    const controlled = canvas?.tokens?.controlled?.map(t => t.actor).find(a => a && a !== vehicle && a.type !== "vehicle");
    return controlled ?? game.user.character ?? null;
  }

  /** Проверка управления транспортом (Вождение/Пилотирование/Управление) от лица экипажа. */
  async rollPilot() {
    if (this.type !== "vehicle") return null;
    const crew = GenesysActor.findCrewMember(this);
    const skill = crew?.getSkill(this.system.skill);
    const pool = skill ? crew.getSkillPool(skill, 2) : new DicePool({ ability: 1, difficulty: 2 });
    // Управляемость: положительная — кости бонуса, отрицательная — кости штрафа.
    const h = this.system.handling;
    if (h > 0) pool.boost += h; else if (h < 0) pool.setback += -h;
    const label = `${game.i18n.localize(`GENESYS.Skill.${this.system.skill}`)} (${this.name})`;
    return DicePoolDialog.prompt({ pool, label, actor: crew ?? this });
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

    // Способности архетипа/расы: убрать старые (выданные прошлым архетипом) и добавить новые.
    const oldAbilities = this.itemTypes.ability.filter(i => i.getFlag(SYSTEM_ID, "fromArchetype"));
    if (oldAbilities.length) await this.deleteEmbeddedDocuments("Item", oldAbilities.map(i => i.id));
    const abilities = (sys.abilities ?? []).map(a => ({
      name: a.name,
      type: "ability",
      img: "icons/svg/upgrade.svg",
      system: { description: a.description, source: sys.source ?? "" },
      flags: { [SYSTEM_ID]: { fromArchetype: true } }
    }));
    if (abilities.length) await this.createEmbeddedDocuments("Item", abilities);

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
  /*  Отдых и восстановление                      */
  /* -------------------------------------------- */

  /** Конец сцены: Элементарная проверка Хладнокровия или Выдержки (что лучше), успехи снимают усталость. */
  async recoverStrain() {
    const options = ["cool", "discipline"].map(k => this.getSkill(k)).filter(Boolean);
    if (!options.length) return null;
    const score = sk => { const p = this.getSkillPool(sk, 0); return p.proficiency * 10 + p.ability; };
    const skill = options.sort((a, b) => score(b) - score(a))[0];
    const pool = this.getSkillPool(skill, 0);
    const label = `${game.i18n.localize("GENESYS.Rest.Recover")}: ${skill.name}`;
    const roll = await DicePoolDialog.prompt({ pool, label, actor: this });
    if (roll?.results.isSuccess) {
      const healed = Math.min(roll.results.success, this.system.strain.value);
      await this.update({ "system.strain.value": this.system.strain.value - healed });
      ui.notifications.info(game.i18n.format("GENESYS.Rest.StrainRecovered", { name: this.name, value: healed }));
    }
    return roll;
  }

  /** Ночной отдых: вся усталость снимается, лечится 1 рана. */
  async restOvernight() {
    const upd = { "system.strain.value": 0 };
    if (this.system.wounds) upd["system.wounds.value"] = Math.max(0, this.system.wounds.value - 1);
    await this.update(upd);
    if (this.statuses?.has("incapacitated") && this.system.wounds.value - 1 <= this.system.wounds.max) {
      await this.toggleStatusEffect("incapacitated", { active: false });
    }
    return ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor: this }),
      content: `<div class="genesys">${game.i18n.format("GENESYS.Rest.Overnight", { name: foundry.utils.escapeHTML(this.name) })}</div>`
    });
  }

  /** Попытка излечения критической травмы: проверка Стойкости со сложностью по тяжести. */
  async healInjury(injury) {
    const skill = this.getSkill("resilience");
    const severity = Math.max(1, injury.system.severity || 1);
    const pool = skill ? this.getSkillPool(skill, severity) : new DicePool({ ability: this.characteristic("brawn"), difficulty: severity });
    const label = game.i18n.format("GENESYS.Rest.HealInjury", { name: injury.name });
    const roll = await DicePoolDialog.prompt({ pool, label, actor: this });
    if (roll?.results.isSuccess) {
      await injury.delete();
      ui.notifications.info(game.i18n.format("GENESYS.Rest.InjuryHealed", { name: injury.name }));
    }
    return roll;
  }

  /** Активировать героическую способность: тратит очки сюжета игроков и считает использования. */
  async activateHeroic(heroic) {
    const sys = heroic.system;
    if (sys.uses >= sys.usesPerSession) {
      return ui.notifications.warn(game.i18n.format("GENESYS.Heroic.NoUses", { max: sys.usesPerSession }));
    }
    let points = 0;
    try { points = game.settings.get(SYSTEM_ID, "storyPoints").player; } catch {}
    if (points < sys.storyCost) {
      return ui.notifications.warn(game.i18n.format("GENESYS.Heroic.NoStoryPoints", { cost: sys.storyCost }));
    }
    const { StoryPointsTracker } = await import("../apps/story-points.mjs");
    for (let i = 0; i < sys.storyCost; i++) StoryPointsTracker.request("usePlayer");
    await heroic.update({ "system.uses": sys.uses + 1 });
    const upgrades = sys.upgrades.filter(u => u.count > 0).map(u => `<li>${foundry.utils.escapeHTML(u.name)}${u.count > 1 ? ` ×${u.count}` : ""}</li>`).join("");
    return ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor: this }),
      content: `<div class="genesys item-card heroic-card"><header><img src="${heroic.img}" alt=""><h3>${foundry.utils.escapeHTML(heroic.name)}</h3></header>
        ${sys.description}${upgrades ? `<ul>${upgrades}</ul>` : ""}</div>`
    });
  }

  /* -------------------------------------------- */
  /*  Критические травмы                          */
  /* -------------------------------------------- */

  /** Разобрать диапазон «01-05» / «151+» → [min, max]. */
  static parseRollRange(range) {
    const nums = String(range ?? "").match(/\d+/g)?.map(Number) ?? [];
    if (!nums.length) return null;
    if (String(range).includes("+") || nums.length === 1) return [nums[0], Infinity];
    return [nums[0], nums[1]];
  }

  /**
   * Бросок по таблице критических травм: d100 + 10 за каждую имеющуюся травму + модификатор
   * (например, Высококритичное N даёт +10×N). Результат добавляется на лист и выводится в чат.
   */
  async rollCriticalInjury({ modifier = 0 } = {}) {
    // Приспешник: критическая травма просто выводит одного из группы.
    if (this.type === "adversary" && this.system.isMinion) {
      const { actOnActor } = await import("../combat/combat.mjs");
      return actOnActor(this, "adjust", { wounds: Math.max(1, this.system.wounds.max) });
    }
    const existing = this.itemTypes.injury.length;
    const durable = this.system.criticalModifier ?? 0;
    const roll = await new Roll(`1d100 + ${existing * 10} + ${(Number(modifier) || 0) + durable}`).evaluate();
    const total = Math.max(1, roll.total);

    // Таблица — из компендиума системы (или из предметов мира, если компендиума нет).
    let table = [];
    const pack = game.packs.get(`${SYSTEM_ID}.${this.type === "vehicle" ? "vehicle-crits" : "injuries"}`);
    if (pack) table = await pack.getDocuments();
    if (!table.length) table = game.items.filter(i => i.type === "injury" && (this.type === "vehicle") === (i.folder?.name === "Транспорт"));
    const entry = table.find(i => {
      const r = GenesysActor.parseRollRange(i.system.rollRange);
      return r && total >= r[0] && total <= r[1];
    });

    let created = null;
    if (entry) [created] = await this.createEmbeddedDocuments("Item", [entry.toObject()]);

    const severity = entry ? "◆".repeat(entry.system.severity) || "—" : "";
    const content = `<div class="genesys item-card critical-injury">
      <header><img src="${entry?.img ?? "icons/svg/blood.svg"}" alt=""><h3>${game.i18n.localize(this.type === "vehicle" ? "GENESYS.Vehicle.CritRoll" : "GENESYS.Injury.Roll")}: ${total}</h3></header>
      ${entry ? `<p><strong>${foundry.utils.escapeHTML(entry.name)}</strong> <span class="severity-text">${severity}</span></p>${entry.system.description}`
        : `<p>${game.i18n.localize("GENESYS.Warn.InjuryTableMissing")}</p>`}
      <p class="hint">${game.i18n.format("GENESYS.Injury.RollFormula", { existing, modifier: Number(modifier) || 0 })}</p>
    </div>`;
    await roll.toMessage({ speaker: ChatMessage.implementation.getSpeaker({ actor: this }), content, flavor: this.name });
    return created;
  }

  /** Спросить модификатор и бросить критическую травму. */
  async promptCriticalInjury() {
    const result = await foundry.applications.api.DialogV2.input({
      window: { title: "GENESYS.Injury.Roll" },
      content: `<div class="form-group"><label>${game.i18n.localize("GENESYS.Injury.Modifier")}</label>
        <input type="number" name="modifier" value="0" step="10" autofocus></div>
        <p class="hint">${game.i18n.localize("GENESYS.Injury.ModifierHint")}</p>`,
      ok: { label: "GENESYS.Injury.Roll" }
    });
    if (!result) return null;
    return this.rollCriticalInjury({ modifier: Number(result.modifier) || 0 });
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
