import { GENESYS, SYSTEM_ID, TEMPLATES } from "../config.mjs";
import { getAdventure, filterForAdventure } from "../worlds.mjs";
import { docAllowed } from "../helpers/adventure.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Похоже ли снаряжение на зелье/яд/эликсир (для режима «Алхимия»). */
const POTION = /зель|эликсир|тоник|яд\b|отрав|мазь|бальзам|снадоб|potion|elixir|tonic|poison|salve/i;

/**
 * Мастерская (Realms of Terrinoth, «Ремесло» и «Алхимия»): выбрать предмет — система посчитает
 * сложность (редкость / 2, вверх), время, стоимость материалов; проверка Механики или Алхимии
 * с таблицей трат символов ремесла; при успехе предмет появляется у персонажа.
 */
export class Workshop extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ actor, ...options } = {}) {
    super(options);
    this.actor = actor;
    this.mode = "craft";
    this.search = "";
    this.selected = null;
    this.payMaterials = true;
    this.lib = null;
  }

  static DEFAULT_OPTIONS = {
    classes: ["genesys", "themed", "theme-light", "workshop"],
    tag: "form",
    window: { title: "GENESYS.Workshop.Title", icon: "fa-solid fa-hammer", resizable: true },
    position: { width: 820, height: 640 },
    actions: { mode: Workshop.#onMode, select: Workshop.#onSelect, craft: Workshop.#onCraft, gather: Workshop.#onGather },
    form: { handler: Workshop.#onChange, submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = { main: { template: `${TEMPLATES}/apps/workshop.hbs`, scrollable: [".ws-list"] } };

  /** @override */
  get title() { return `${game.i18n.localize("GENESYS.Workshop.Title")}: ${this.actor.name}`; }

  async #load() {
    if (this.lib) return this.lib;
    const docs = [];
    for (const key of ["weapons", "armor", "gear"]) {
      const pack = game.packs.get(`${SYSTEM_ID}.${key}`);
      if (pack) docs.push(...(await pack.getDocuments()));
    }
    docs.push(...game.items.filter(i => ["weapon", "armor", "gear"].includes(i.type)));
    const adv = getAdventure(this.actor.system.adventure || "all");
    this.lib = filterForAdventure(docs.filter(d => docAllowed(d) && (d.system.price ?? 0) > 0 && !/транспорт/i.test(d.folder?.name ?? "")), adv);
    return this.lib;
  }

  /** Параметры изготовления по правилам книги. */
  static plan(doc, mode) {
    const rarity = Math.max(0, doc.system.rarity ?? 0);
    const difficulty = Math.min(5, Math.ceil(rarity / 2));
    const price = doc.system.price ?? 0;
    return mode === "alchemy"
      ? { skill: "alchemy", difficulty, time: game.i18n.format("GENESYS.Workshop.Hours", { n: 1 + rarity }), cost: Math.ceil(price / 2),
          ingredientRarity: Math.ceil(rarity / 2), gatherDifficulty: difficulty }
      : { skill: "mechanics", difficulty, time: game.i18n.format("GENESYS.Workshop.Days", { n: 1 + rarity }), cost: Math.ceil(price / 2) };
  }

  /** @override */
  async _prepareContext() {
    const lib = await this.#load();
    const q = this.search.toLowerCase();
    const alchemy = this.mode === "alchemy";
    const list = lib.filter(d => (alchemy ? POTION.test(`${d.name} ${d.flags?.[SYSTEM_ID]?.nameEn ?? ""}`) : true)
        && (!q || d.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang)).slice(0, 200)
      .map(d => ({ uuid: d.uuid, name: d.name, img: d.img, rarity: d.system.rarity, price: d.system.price, selected: d.uuid === this.selected }));
    const doc = this.selected ? lib.find(d => d.uuid === this.selected) : null;
    const plan = doc ? Workshop.plan(doc, this.mode) : null;
    const skill = plan ? this.actor.getSkill(plan.skill) : null;
    return {
      modes: ["craft", "alchemy"].map(m => ({ key: m, label: `GENESYS.Workshop.Mode.${m}`, active: m === this.mode })),
      search: this.search, list, alchemy,
      item: doc ? { name: doc.name, img: doc.img, rarity: doc.system.rarity, price: doc.system.price } : null,
      plan, skillName: skill?.name ?? game.i18n.localize(`GENESYS.Skill.${plan?.skill ?? "mechanics"}`),
      difficultyLabel: plan ? GENESYS.difficulties[plan.difficulty] : "",
      money: this.actor.system.money ?? 0, payMaterials: this.payMaterials || !game.user.isGM, isGM: game.user.isGM
    };
  }

  static #onChange(event, form, formData) {
    const d = formData.object;
    if ("search" in d) this.search = d.search ?? "";
    // Платить ли за материалы, решает только ведущий: игрок платит всегда.
    if ("payMaterials" in d && game.user.isGM) this.payMaterials = !!d.payMaterials;
    if (event?.target?.name === "search") {
      this.render().then(() => {
        const el = this.element.querySelector('[name="search"]');
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      });
    }
  }

  static #onMode(event, target) { this.mode = target.dataset.mode; this.selected = null; this.render(); }
  static #onSelect(event, target) { this.selected = target.dataset.uuid; this.render(); }

  /** Сбор ингредиентов для зелья: проверка Выживания (сложность = редкость зелья / 2). */
  static async #onGather() {
    const doc = this.lib?.find(d => d.uuid === this.selected);
    if (!doc) return;
    const plan = Workshop.plan(doc, "alchemy");
    return this.actor.rollSkill("survival", { difficulty: plan.gatherDifficulty, label: game.i18n.format("GENESYS.Workshop.GatherLabel", { name: doc.name }) });
  }

  /** Проверка ремесла; при успехе — предмет у персонажа, материалы списаны. */
  static async #onCraft() {
    const doc = this.lib?.find(d => d.uuid === this.selected);
    if (!doc) return;
    const plan = Workshop.plan(doc, this.mode);
    const actor = this.actor;
    if (!game.user.isGM) this.payMaterials = true;
    if (!actor.getSkill(plan.skill)) {
      return ui.notifications.warn(game.i18n.format("GENESYS.Warn.SkillNotFound", { name: game.i18n.localize(`GENESYS.Skill.${plan.skill}`) }));
    }
    if (this.payMaterials && (actor.system.money ?? 0) < plan.cost) return ui.notifications.warn("GENESYS.Wizard.NoMoney", { localize: true });
    const roll = await actor.rollSkill(plan.skill, {
      difficulty: plan.difficulty,
      label: game.i18n.format("GENESYS.Workshop.CraftLabel", { name: doc.name }),
      rollOptions: { spellContext: this.mode === "alchemy" ? "alchemy" : "crafting" }
    });
    if (!roll) return;
    // Материалы расходуются при любом исходе проверки.
    if (this.payMaterials && plan.cost) await actor.update({ "system.money": Math.max(0, (actor.system.money ?? 0) - plan.cost) });
    if (roll.results?.isSuccess) {
      const data = doc.toObject();
      if (data.system && "quantity" in data.system) data.system.quantity = 1;
      // Своё изделие: лавки скупают его не дороже половины цены (см. настройку «craftedSaleCap»).
      foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.crafted`, { by: actor.name });
      await actor.createEmbeddedDocuments("Item", [data], { genesysNoStack: true });
    }
    await ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor }),
      content: `<div class="genesys status-report">${game.i18n.format(roll.results?.isSuccess ? "GENESYS.Workshop.Success" : "GENESYS.Workshop.Failure", {
        name: foundry.utils.escapeHTML(actor.name), item: foundry.utils.escapeHTML(doc.name), time: plan.time, cost: this.payMaterials ? plan.cost : 0 })}</div>`
    });
    this.render();
  }
}
