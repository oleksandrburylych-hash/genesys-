import { GENESYS, TEMPLATES, SYSTEM_ID } from "../config.mjs";
import { xpLedger } from "../helpers/xp-ledger.mjs";
import { actOnActor } from "../combat/combat.mjs";
import { getAdventure } from "../worlds.mjs";
import { GenesysBaseActorSheet } from "./base-actor-sheet.mjs";
import { gearMechanics, itemEncumbrance, painkillersOf, painkillersUsed, painkillerHeal, painkillerTalentRanks } from "../gear.mjs";

const { DialogV2 } = foundry.applications.api;
const T = `${TEMPLATES}/actor`;

/** Таланты-реакции с кнопкой на листе: статус и защищаемый тип атак. */
const GUARD_TALENTS = { "Defensive Stance": "defensiveStance", "Side Step": "sideStep" };

/**
 * Лист персонажа игрока.
 */
export class GenesysCharacterSheet extends GenesysBaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["character"],
    position: { width: 940, height: 980 },
    actions: {
      skillRank: GenesysCharacterSheet.#onSkillRank,
      charChange: GenesysCharacterSheet.#onCharChange,
      talentRank: GenesysCharacterSheet.#onTalentRank,
      xpAdd: GenesysCharacterSheet.#onXPAdd,
      xpDelete: GenesysCharacterSheet.#onXPDelete,
      finishCreation: GenesysCharacterSheet.#onFinishCreation,
      adjust: GenesysCharacterSheet.#onAdjust,
      castSpell: GenesysCharacterSheet.#onCastSpell,
      setSkillRank: GenesysCharacterSheet.#onSetSkillRank,
      toggleCareer: GenesysCharacterSheet.#onToggleCareer,
      activateHeroic: GenesysCharacterSheet.#onActivateHeroic,
      resetHeroic: GenesysCharacterSheet.#onResetHeroic,
      recoverStrain: GenesysCharacterSheet.#onRecoverStrain,
      restOvernight: GenesysCharacterSheet.#onRestOvernight,
      painkiller: GenesysCharacterSheet.#onPainkiller,
      healInjury: GenesysCharacterSheet.#onHealInjury,
      creationWizard: GenesysCharacterSheet.#onCreationWizard,
      addMagicActions: GenesysCharacterSheet.#onAddMagicActions,
      useGuard: GenesysCharacterSheet.#onUseGuard,
      exportChar: GenesysCharacterSheet.#onExportChar,
      workshop: GenesysCharacterSheet.#onWorkshop,
      mountOpen: GenesysCharacterSheet.#onMountOpen,
      mountRemove: GenesysCharacterSheet.#onMountRemove,
      mountToggle: GenesysCharacterSheet.#onMountToggle,
      mountControl: GenesysCharacterSheet.#onMountControl,
      mountAttack: GenesysCharacterSheet.#onMountAttack,
      importChar: GenesysCharacterSheet.#onImportChar
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

    // Болеутоляющие: сколько есть и сколько принято за день.
    const pk = painkillersOf(actor);
    const pkCount = pk.reduce((s, i) => s + (i.system.quantity ?? 0), 0);
    const pkUsed = painkillersUsed(actor, "wounds");
    context.painkillers = { count: pkCount, tooltip: game.i18n.format("GENESYS.Painkiller.Tooltip", { count: pkCount, used: pkUsed, next: painkillerHeal(pkUsed, painkillerTalentRanks(actor)) }) };
    // Снаряжение: свойства, надетость, нагрузка позиции.
    const suit = system.gear?.suit ?? null;
    context.gear = actor.itemTypes.gear.map(i => {
      const m = gearMechanics(i);
      const tags = [];
      if (m.thresholdBonus) tags.push(game.i18n.format("GENESYS.Equip.TagThreshold", { value: m.thresholdBonus }));
      if (m.wornEncumbrance !== null) tags.push(game.i18n.format("GENESYS.Equip.TagWorn", { value: m.wornEncumbrance }));
      if (m.bundle > 1) tags.push(game.i18n.format("GENESYS.Equip.TagBundle", { value: m.bundle }));
      if (m.painkiller) tags.push(game.i18n.localize(m.painkiller === "strain" ? "GENESYS.Equip.TagStim" : "GENESYS.Equip.TagPainkiller"));
      if (m.implant) tags.push(game.i18n.localize("GENESYS.Equip.TagImplant"));
      return { id: i.id, name: i.name, img: i.img, system: i.system, tags: tags.join(" · "), wearable: m.wornEncumbrance !== null,
        enc: itemEncumbrance(i, { worn: !!i.system.equipped }), container: m.thresholdBonus > 0 && system.encumbrance?.container === i.name };
    });
    context.armor = actor.itemTypes.armor.map(i => ({ id: i.id, name: i.name, img: i.img, system: i.system,
      suit: i === suit, extra: i.system.equipped && i !== suit, enc: itemEncumbrance(i, { worn: i === suit }) }));
    context.armorWarning = system.gear?.extraArmor?.length ? game.i18n.format("GENESYS.Equip.ExtraArmor", { suit: suit?.name ?? "", names: system.gear.extraArmor.join(", ") }) : "";

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
          activation: GENESYS.activations[t.system.activation],
          passive: t.system.activation === "passive",
          guard: GUARD_TALENTS[t.flags?.[SYSTEM_ID]?.nameEn] ?? null
        })),
      cost: GENESYS.xp.talent(tier),
      canAdd: tier === 1 || tiers[tier - 1] > tiers[tier]
    }));

    // Навыки в две колонки, как на листе из книги.
    const byKey = Object.fromEntries(context.skillGroups.map(g => [g.key, g]));
    context.skillColumns = [["general", "magic"], ["combat", "social", "knowledge"]]
      .map(keys => keys.map(k => byKey[k]).filter(Boolean)).filter(c => c.length);
    context.adventureLabel = actor.system.adventure ? getAdventure(actor.system.adventure).label : "";
    const mount = this.mountActor;
    context.mounted = actor.statuses?.has("mounted");
    context.mount = mount ? {
      name: mount.name, img: mount.img, wounds: mount.system.wounds?.value ?? 0, max: mount.system.wounds?.max ?? 0,
      soak: mount.system.soak?.value ?? 0, defense: `${mount.system.defense?.melee?.value ?? 0}/${mount.system.defense?.ranged?.value ?? 0}`,
      weapons: mount.itemTypes.weapon.map(w => ({ id: w.id, name: w.name }))
    } : null;
    context.playerName = game.users.find(u => !u.isGM && u.character?.id === actor.id)?.name
      ?? game.users.find(u => !u.isGM && actor.testUserPermission(u, "OWNER"))?.name ?? "";

    // Что таланты добавили к показателям (для пояснения на листе).
    const tb = system.talentBonuses ?? {};
    const parts = [];
    if (tb.wounds) parts.push(`${game.i18n.localize("GENESYS.Wounds")} +${tb.wounds}`);
    if (tb.strain) parts.push(`${game.i18n.localize("GENESYS.Strain")} +${tb.strain}`);
    if (tb.soak) parts.push(`${game.i18n.localize("GENESYS.Soak")} +${tb.soak}`);
    if (tb.meleeDefense) parts.push(`${game.i18n.localize("GENESYS.Defense")} +${tb.meleeDefense}`);
    if (tb.critical) parts.push(`${game.i18n.localize("GENESYS.CriticalInjuries")} ${tb.critical}`);
    context.talentBonusText = parts.length ? game.i18n.format("GENESYS.Sheet.TalentBonuses", { list: parts.join(", ") }) : "";
    let preset = "";
    try { preset = game.settings.get("genesys-rpg", "skillPreset"); } catch {}
    context.showHeroic = actor.itemTypes.heroic.length > 0 || preset === "terrinoth";

    // Журнал опыта: новые записи сверху.
    context.xpLedger = xpLedger(system.experience);
    context.xpLog = context.xpLedger.log;

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
    context.magicSkills = Object.keys(GENESYS.magicSkills).map(k => actor.getSkill(k)).filter(Boolean)
      .map(sk => ({ name: sk.name, rank: sk.system.rank }));

    context.heroics = actor.itemTypes.heroic.map(h => ({
      id: h.id, name: h.name, img: h.img,
      uses: h.system.uses, perSession: h.system.usesPerSession, storyCost: h.system.storyCost,
      upgrades: h.system.upgrades.filter(u => u.count > 0).map(u => u.count > 1 ? `${u.name} ×${u.count}` : u.name).join(", ")
    }));
    context.heroicPoints = system.heroicPoints;

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

  /** Щелчок по шеврону: установить ранг (повторный щелчок по текущему — понизить). */
  static async #onSetSkillRank(event, target) {
    const item = this._getItem(target);
    if (!item) return;
    let goal = Number(target.dataset.rank);
    if (goal === item.system.rank) goal -= 1;
    const step = goal > item.system.rank ? 1 : -1;
    while (item.system.rank !== goal) {
      const before = item.system.rank;
      await this.actor.changeSkillRank(item, step);
      if (item.system.rank === before) break; // не хватило опыта или упёрлись в предел
    }
  }

  static #onToggleCareer(event, target) {
    const item = this._getItem(target);
    if (item) return item.update({ "system.career": !item.system.career });
  }

  static #onActivateHeroic(event, target) {
    const item = this._getItem(target);
    if (item) return this.actor.activateHeroic(item);
  }

  /** Новая игровая встреча: сбросить счётчики использований героических способностей. */
  static #onResetHeroic() {
    const updates = this.actor.itemTypes.heroic.map(h => ({ _id: h.id, "system.uses": 0 }));
    if (updates.length) return this.actor.updateEmbeddedDocuments("Item", updates);
  }

  static #onRecoverStrain() { return this.actor.recoverStrain(); }
  static #onRestOvernight() { return this.actor.restOvernight(); }
  static #onPainkiller() { return this.actor.usePainkiller(); }

  static #onHealInjury(event, target) {
    const item = this._getItem(target);
    if (item) return this.actor.healInjury(item);
  }

  static async #onCreationWizard() {
    const { openApp } = await import("../helpers/safe.mjs");
    return openApp(async () => {
      const { CreationWizard } = await import("../apps/creation-wizard.mjs");
      return new CreationWizard({ actor: this.actor });
    }, "CreationWizard");
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

  /** Оборонительная тактика / Шаг в сторону: выбрать число ступеней (не больше ранга), получить столько же усталости. */
  static async #onUseGuard(event, target) {
    const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    const status = GUARD_TALENTS[item?.flags?.[SYSTEM_ID]?.nameEn];
    if (!status) return;
    const rank = Math.max(1, item.system.rank || 1);
    let n = 1;
    if (rank > 1) {
      n = await foundry.applications.api.DialogV2.prompt({
        window: { title: item.name },
        content: `<p>${game.i18n.localize("GENESYS.Reaction.GuardPrompt")}</p><input type="number" name="n" value="${rank}" min="1" max="${rank}" autofocus>`,
        ok: { label: game.i18n.localize("GENESYS.Reaction.Use"), callback: (ev, button) => Number(button.form.elements.n.value) || 1 },
        rejectClose: false
      });
      if (!n) return;
      n = Math.min(rank, Math.max(1, n));
    }
    await actOnActor(this.actor, "guard", { status, upgrades: n });
    await ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor: this.actor }),
      content: `<div class="genesys status-report">${game.i18n.format("GENESYS.Reaction.GuardUsed", { name: foundry.utils.escapeHTML(this.actor.name), talent: foundry.utils.escapeHTML(item.name), value: n })}</div>`
    });
  }

  /** Мастерская: ремесло и алхимия. */
  static async #onWorkshop() {
    const { Workshop } = await import("../apps/workshop.mjs");
    return new Workshop({ actor: this.actor }).render({ force: true });
  }

  /** Сохранить персонажа в JSON-файл (для переноса между мирами и кампаниями). */
  static #onExportChar() { return this.actor.exportToJSON(); }

  /** Загрузить персонажа из JSON-файла поверх текущего (стандартный диалог Foundry). */
  static #onImportChar() { return this.actor.importFromJSONDialog(); }

  /* -------------------------------------------- */
  /*  Скакун                                       */
  /* -------------------------------------------- */

  /** Актёр-скакун персонажа (если задан и существует). */
  get mountActor() {
    const uuid = this.actor.system.mount;
    if (!uuid) return null;
    try { return fromUuidSync(uuid) ?? null; } catch { return null; }
  }

  /** Перетащили актёра на лист — это скакун (противник-животное); из компендиума он импортируется в мир. */
  async _onDropActor(event, actor) {
    if (!this.isEditable || actor?.type !== "adversary") return null;
    let mount = actor;
    if (actor.pack) {
      const data = game.actors.fromCompendium(actor);
      mount = await Actor.implementation.create(data);
    }
    await this.actor.update({ "system.mount": mount.uuid });
    ui.notifications.info(game.i18n.format("GENESYS.Mount.Set", { name: mount.name }));
    return mount;
  }

  static #onMountOpen() { this.mountActor?.sheet.render({ force: true }); }
  static #onMountRemove() {
    if (this.actor.statuses?.has("mounted")) this.actor.toggleStatusEffect("mounted", { active: false });
    return this.actor.update({ "system.mount": "" });
  }

  /** Сесть в седло / спешиться: манёвр, с талантом «Поехали!» — побочное действие раз в раунд. */
  static async #onMountToggle() {
    const mounted = this.actor.statuses?.has("mounted");
    await this.actor.toggleStatusEffect("mounted", { active: !mounted });
    const letsRide = this.actor.itemTypes.talent.some(t => t.flags?.[SYSTEM_ID]?.nameEn === "Let's Ride");
    const key = mounted ? "GENESYS.Mount.DismountMsg" : "GENESYS.Mount.MountMsg";
    await ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor: this.actor }),
      content: `<div class="genesys status-report">${game.i18n.format(key, { name: foundry.utils.escapeHTML(this.actor.name), mount: foundry.utils.escapeHTML(this.mountActor?.name ?? "") })}
        <span class="hint">${game.i18n.localize(letsRide ? "GENESYS.Mount.LetsRide" : "GENESYS.Mount.Maneuver")}</span></div>`
    });
  }

  /** Совладать со скакуном: проверка Верховой езды (Обычная). */
  static #onMountControl() {
    const skill = this.actor.getSkill("riding") ?? this.actor.getSkill("survival");
    if (!skill) return ui.notifications.warn(game.i18n.format("GENESYS.Warn.SkillNotFound", { name: game.i18n.localize("GENESYS.Skill.riding") }));
    return this.actor.rollSkill(skill, { difficulty: 2, label: `${skill.name}: ${this.mountActor?.name ?? ""}` });
  }

  /** Атака скакуна его оружием (с талантом «Кавалерист» — по команде всадника манёвром). */
  static async #onMountAttack(event, target) {
    const mount = this.mountActor;
    const weapon = mount?.items.get(target.dataset.weaponId);
    if (!weapon) return;
    const cavalier = this.actor.itemTypes.talent.some(t => t.flags?.[SYSTEM_ID]?.nameEn === "Cavalier");
    if (cavalier) ui.notifications.info("GENESYS.Mount.Cavalier", { localize: true });
    return mount.rollWeapon(weapon);
  }

}
