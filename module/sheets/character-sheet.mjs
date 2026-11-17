import { GENESYS, TEMPLATES } from "../config.mjs";
import { GenesysBaseActorSheet } from "./base-actor-sheet.mjs";

const { DialogV2 } = foundry.applications.api;
const T = `${TEMPLATES}/actor`;

/**
 * Лист персонажа игрока.
 */
export class GenesysCharacterSheet extends GenesysBaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["character"],
    position: { width: 860, height: 900 },
    actions: {
      skillRank: GenesysCharacterSheet.#onSkillRank,
      charChange: GenesysCharacterSheet.#onCharChange,
      talentRank: GenesysCharacterSheet.#onTalentRank,
      xpAdd: GenesysCharacterSheet.#onXPAdd,
      xpDelete: GenesysCharacterSheet.#onXPDelete,
      finishCreation: GenesysCharacterSheet.#onFinishCreation,
      adjust: GenesysCharacterSheet.#onAdjust,
      castSpell: GenesysCharacterSheet.#onCastSpell,
      addMagicActions: GenesysCharacterSheet.#onAddMagicActions
    }
  };

  static PARTS = {
    header: { template: `${T}/character-header.hbs` },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    main: { template: `${T}/parts/main.hbs`, scrollable: [""] },
    talents: { template: `${T}/parts/talents.hbs`, scrollable: [""] },
    magic: { template: `${T}/parts/magic.hbs`, scrollable: [""] },
    inventory: { template: `${T}/parts/inventory.hbs`, scrollable: [""] },
    experience: { template: `${T}/parts/experience.hbs`, scrollable: [""] },
    biography: { template: `${T}/parts/biography.hbs`, scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "main", icon: "fa-solid fa-dice-d20", label: "GENESYS.Tab.main" },
        { id: "talents", icon: "fa-solid fa-star", label: "GENESYS.Tab.talents" },
        { id: "magic", icon: "fa-solid fa-wand-sparkles", label: "GENESYS.Tab.magic" },
        { id: "inventory", icon: "fa-solid fa-sack", label: "GENESYS.Tab.inventory" },
        { id: "experience", icon: "fa-solid fa-graduation-cap", label: "GENESYS.Tab.experience" },
        { id: "biography", icon: "fa-solid fa-feather", label: "GENESYS.Tab.biography" }
      ],
      initial: "main"
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const system = actor.system;

    context.rankAction = "skillRank";
    context.careerLabel = "GENESYS.CareerSkill";
    context.archetype = actor.itemTypes.archetype[0] ?? null;
    context.career = actor.itemTypes.career[0] ?? null;

    // Таланты по уровням (пирамида).
    const tiers = system.talentTiers;
    context.talentTiers = [1, 2, 3, 4, 5].map(tier => ({
      tier,
      count: tiers[tier],
      talents: actor.itemTypes.talent
        .filter(t => t.system.tier === tier)
        .map(t => ({
          item: t,
          id: t.id,
          name: t.name,
          img: t.img,
          ranked: t.system.ranked,
          rank: t.system.rank,
          activation: GENESYS.activations[t.system.activation]
        })),
      canAdd: tier === 1 || tiers[tier - 1] > tiers[tier]
    }));

    // Журнал опыта: новые записи сверху.
    context.xpLog = [...system.experience.log]
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(e => ({ ...e, date: new Date(e.timestamp).toLocaleDateString(game.i18n.lang), isEarn: e.type === "earn" }));

    // Магия: магические действия и готовые заклинания.
    const spellRow = sp => ({
      id: sp.id, name: sp.name, img: sp.img,
      difficulty: sp.system.difficulty,
      skills: sp.system.skills.map(k => game.i18n.localize(`GENESYS.Skill.${k}`)).join(", "),
      concentration: sp.system.concentration,
      effects: sp.system.isPreset ? sp.system.selected.join(", ") : sp.system.effects.length
    });
    const spells = actor.itemTypes.spell;
    context.magicActions = spells.filter(sp => !sp.system.isPreset).map(spellRow);
    context.presetSpells = spells.filter(sp => sp.system.isPreset).map(spellRow);
    context.magicSkills = ["arcana", "divine", "primal", "psychic"].map(k => actor.getSkill(k)).filter(Boolean)
      .map(sk => ({ name: sk.name, rank: sk.system.rank }));

    context.motivations = Object.entries(GENESYS.motivations).map(([key, label]) => ({
      key, label, ...system.motivations[key]
    }));

    context.enriched = {
      biography: await this._enrich(system.biography),
      notes: await this._enrich(system.notes)
    };
    return context;
  }

  /* -------------------------------------------- */

  static #onSkillRank(event, target) {
    const item = this._getItem(target);
    if (item) return this.actor.changeSkillRank(item, Number(target.dataset.delta));
  }

  static #onCharChange(event, target) {
    return this.actor.changeCharacteristic(target.dataset.key, Number(target.dataset.delta));
  }

  static async #onTalentRank(event, target) {
    const item = this._getItem(target);
    if (!item) return;
    const delta = Number(target.dataset.delta);
    if (delta > 0) return this.actor.addTalent(item);
    if (item.system.rank <= 1) return;
    const label = game.i18n.format("GENESYS.XP.Talent", {
      name: item.name, rank: item.system.rank, tier: Math.min(5, item.system.tier + item.system.rank - 1)
    });
    await this.actor.refundXP(label);
    return item.update({ "system.rank": item.system.rank - 1 });
  }

  static #onCastSpell(event, target) {
    const item = this._getItem(target);
    if (item) return this.actor.castSpell(item);
  }

  /** Добавить на лист все магические действия из компендиумов системы (без дублей). */
  static async #onAddMagicActions() {
    const packs = game.packs.filter(p => p.metadata.packageName === game.system.id && p.documentName === "Item");
    const owned = new Set(this.actor.itemTypes.spell.map(i => i.name));
    const toCreate = [];
    for (const pack of packs) {
      const index = await pack.getIndex({ fields: ["type", "system.baseAction", "system.selected"] });
      const ids = index.filter(e => e.type === "spell" && !e.system?.baseAction && !(e.system?.selected?.length) && !owned.has(e.name)).map(e => e._id);
      for (const id of ids) {
        const doc = await pack.getDocument(id);
        toCreate.push(doc.toObject());
        owned.add(doc.name);
      }
    }
    if (!toCreate.length) return ui.notifications.info("GENESYS.Spell.NothingToAdd", { localize: true });
    await this.actor.createEmbeddedDocuments("Item", toCreate);
    ui.notifications.info(game.i18n.format("GENESYS.Spell.Added", { count: toCreate.length }));
  }

  /** Быстрое +/- для ран и напряжения. */
  static #onAdjust(event, target) {
    const path = target.dataset.path;
    const delta = Number(target.dataset.delta) || 0;
    const current = foundry.utils.getProperty(this.actor, path) ?? 0;
    return this.actor.update({ [path]: Math.max(0, current + delta) });
  }

  static async #onXPAdd(event, target) {
    const type = target.dataset.type ?? "earn";
    const title = game.i18n.localize(type === "earn" ? "GENESYS.XP.Earn" : "GENESYS.XP.Spend");
    const result = await DialogV2.input({
      window: { title },
      content: `
        <div class="form-group"><label>${game.i18n.localize("GENESYS.XP.Amount")}</label>
          <input type="number" name="amount" value="5" min="0" step="1" autofocus></div>
        <div class="form-group"><label>${game.i18n.localize("GENESYS.XP.Reason")}</label>
          <input type="text" name="label" value=""></div>`,
      ok: { label: title }
    });
    if (!result) return;
    const amount = Math.max(0, Number(result.amount) || 0);
    if (!amount) return;
    return this.actor.logXP(type, amount, result.label || title);
  }

  static async #onXPDelete(event, target) {
    const id = target.closest("[data-entry-id]")?.dataset.entryId;
    if (id) return this.actor.removeXPEntry(id);
  }

  static async #onFinishCreation() {
    const finishing = this.actor.system.creation;
    if (finishing) {
      const ok = await DialogV2.confirm({
        window: { title: "GENESYS.Creation.Finish" },
        content: `<p>${game.i18n.localize("GENESYS.Creation.FinishConfirm")}</p>`
      });
      if (!ok) return;
    }
    const update = { "system.creation": !finishing };
    if (finishing) {
      // Фиксируем Силу и Волю для порогов ран и усталости.
      update["system.wounds.creationChar"] = this.actor.characteristic("brawn");
      update["system.strain.creationChar"] = this.actor.characteristic("willpower");
    }
    return this.actor.update(update);
  }
}
