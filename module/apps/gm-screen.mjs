import { GENESYS, SYSTEM_ID, TEMPLATES } from "../config.mjs";
import { ADVENTURES, getAdventure, filterForAdventure } from "../worlds.mjs";
import { enabledAdventureKeys } from "../helpers/adventure.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Боевой уровень силы из описания противника (есть у противников Expanded Player's Guide). */
function combatPower(doc) {
  const m = String(doc.system?.description ?? "").match(/боевой\s+(\d+)/i);
  return m ? Number(m[1]) : null;
}

/**
 * Ширма ведущего: справка по правилам, награда опытом, конструктор встреч.
 */
export class GMScreen extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.tab = "encounter";
    this.lib = null;
    this.filter = { adventure: enabledAdventureKeys()[0] ?? "all", type: "", search: "" };
    this.encounter = [];
    this.xp = { amount: 10, reason: "", selected: null };
    this.refTable = "combatPositive";
  }

  static DEFAULT_OPTIONS = {
    id: "genesys-gm-screen",
    classes: ["genesys", "gm-screen"],
    tag: "form",
    window: { title: "GENESYS.GM.Title", icon: "fa-solid fa-book-skull", resizable: true },
    position: { width: 900, height: 720 },
    actions: {
      tab: GMScreen.#onTab, add: GMScreen.#onAdd, remove: GMScreen.#onRemove, count: GMScreen.#onCount,
      place: GMScreen.#onPlace, clear: GMScreen.#onClear, award: GMScreen.#onAward, refTable: GMScreen.#onRefTable,
      toggleChar: GMScreen.#onToggleChar, open: GMScreen.#onOpen
    },
    form: { handler: GMScreen.#onChange, submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = { main: { template: `${TEMPLATES}/apps/gm-screen.hbs`, scrollable: [".gm-list", ".gm-body"] } };

  /** Открыть/закрыть ширму. */
  static toggle() {
    const app = foundry.applications.instances?.get("genesys-gm-screen");
    if (app) return app.close();
    return new GMScreen().render({ force: true });
  }

  /** @override */
  async _prepareContext() {
    try { return await this.#context(); }
    catch (err) {
      console.error("genesys-rpg |", err);
      ui.notifications.error(`Genesys: ${err.message}`, { permanent: true });
      throw err;
    }
  }

  /** Противники: компендиум + мир (копии из компендиума заменяют оригинал). */
  async #load() {
    if (this.lib) return this.lib;
    const pack = game.packs.get(`${SYSTEM_ID}.adversaries`);
    const packDocs = pack ? await pack.getDocuments() : [];
    const world = game.actors.filter(a => a.type === "adversary");
    const copied = new Set(world.map(a => a._stats?.compendiumSource).filter(Boolean));
    this.lib = [...packDocs.filter(d => !copied.has(d.uuid)), ...world];
    return this.lib;
  }

  /** Персонажи игроков для награды опытом. */
  get characters() {
    const chars = game.actors.filter(a => a.type === "character");
    if (!this.xp.selected) this.xp.selected = new Set(chars.filter(a => a.hasPlayerOwner).map(a => a.id));
    return chars;
  }

  async #context() {
    const L = k => game.i18n.localize(k);
    const ctx = {
      tab: this.tab,
      tabs: ["encounter", "xp", "reference"].map(t => ({ key: t, label: `GENESYS.GM.Tab.${t}`, active: t === this.tab }))
    };

    if (this.tab === "encounter") {
      const lib = await this.#load();
      const keys = enabledAdventureKeys();
      const advKeys = keys.length ? [...keys, "all"] : Object.keys(ADVENTURES);
      const adv = getAdventure(this.filter.adventure);
      const q = this.filter.search.toLowerCase();
      ctx.adventures = [...new Set(advKeys)].map(k => ({ key: k, label: getAdventure(k).label, selected: k === this.filter.adventure }));
      ctx.types = Object.entries(GENESYS.adversaryTypes).map(([k, v]) => ({ key: k, label: typeof v === "string" ? v : v.label, selected: k === this.filter.type }));
      ctx.filter = this.filter;
      ctx.list = filterForAdventure(lib, adv)
        .filter(d => (!this.filter.type || d.system.adversaryType === this.filter.type) && (!q || d.name.toLowerCase().includes(q)))
        .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang))
        .slice(0, 200)
        .map(d => ({ uuid: d.uuid, name: d.name, img: d.img, type: L(GENESYS.adversaryTypes[d.system.adversaryType] ?? ""),
          folder: d.folder?.name ?? "", power: combatPower(d), wounds: d.system.wounds?.max, soak: d.system.soak?.value }));
      ctx.encounter = this.encounter.map((e, i) => ({ ...e, index: i }));
      const powers = this.encounter.map(e => e.power).filter(p => p !== null);
      ctx.totalPower = powers.length ? powers.reduce((s, p) => s + p, 0) : null;
      ctx.hasScene = !!globalThis.canvas?.scene;
    }

    if (this.tab === "xp") {
      ctx.characters = this.characters.map(a => ({ id: a.id, name: a.name, img: a.img, on: this.xp.selected.has(a.id),
        available: a.system.experience?.available ?? 0, total: a.system.experience?.total ?? 0 }));
      ctx.xp = this.xp;
      ctx.presets = [5, 10, 15, 20, 25];
    }

    if (this.tab === "reference") {
      ctx.difficulties = Object.entries(GENESYS.difficulties).map(([n, label]) => ({ n: Number(n), label }));
      ctx.ranges = ["engaged", "short", "medium", "long", "extreme"].map(k => ({ label: `GENESYS.Range.${k}`, hint: `GENESYS.GM.RangeHint.${k}` }));
      const tables = GENESYS.spending ?? {};
      ctx.refTables = Object.entries(tables).map(([k, t]) => ({ key: k, title: t.title, active: k === this.refTable }));
      ctx.refRows = tables[this.refTable]?.rows ?? [];
      ctx.statuses = GENESYS.statusEffects.map(s => ({ name: s.name, img: s.img, hint: `GENESYS.GM.StatusHint.${s.id}` }));
    }
    return ctx;
  }

  static #onChange(event, form, formData) {
    const d = foundry.utils.expandObject(formData.object);
    if (d.filter) {
      Object.assign(this.filter, { adventure: d.filter.adventure ?? this.filter.adventure, type: d.filter.type ?? "", search: d.filter.search ?? "" });
    }
    if (d.xp) {
      if (d.xp.amount !== undefined) this.xp.amount = Number(d.xp.amount) || 0;
      if (d.xp.reason !== undefined) this.xp.reason = d.xp.reason;
    }
    if (d.enc) for (const [i, v] of Object.entries(d.enc)) if (this.encounter[i]) this.encounter[i].count = Math.max(1, Number(v.count) || 1);
    const name = event?.target?.name ?? "";
    if (name.startsWith("filter.")) {
      this.render().then(() => {
        if (name !== "filter.search") return;
        const el = this.element.querySelector(`[name="${name}"]`);
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      });
    }
  }

  static #onTab(event, target) { this.tab = target.dataset.tab; this.render(); }
  static #onRefTable(event, target) { this.refTable = target.dataset.table; this.render(); }

  static async #onOpen(event, target) {
    const doc = await fromUuid(target.dataset.uuid);
    doc?.sheet?.render({ force: true });
  }

  static #onAdd(event, target) {
    const doc = this.lib?.find(d => d.uuid === target.dataset.uuid);
    if (!doc) return;
    const minion = doc.system.adversaryType === "minion";
    const existing = this.encounter.find(e => e.uuid === doc.uuid);
    if (existing) existing.count += minion ? 0 : 1;
    if (!existing || minion) {
      if (!existing) this.encounter.push({ uuid: doc.uuid, name: doc.name, img: doc.img, minion, count: minion ? (doc.system.groupSize || 3) : 1, groups: 1, power: combatPower(doc) });
      else existing.groups = (existing.groups ?? 1) + 1;
    }
    this.render();
  }

  static #onRemove(event, target) { this.encounter.splice(Number(target.dataset.index), 1); this.render(); }
  static #onClear() { this.encounter = []; this.render(); }

  static #onCount(event, target) {
    const e = this.encounter[Number(target.dataset.index)];
    if (!e) return;
    const key = e.minion ? "groups" : "count";
    e[key] = Math.max(1, (e[key] ?? 1) + Number(target.dataset.delta));
    this.render();
  }

  /** Поставить противников на текущую сцену (и, по желанию, в бой). */
  static async #onPlace(event, target) {
    if (!globalThis.canvas?.scene) return ui.notifications.warn("GENESYS.GM.NoScene", { localize: true });
    if (!this.encounter.length) return;
    const hidden = target.dataset.hidden === "1";
    const folder = game.folders.find(f => f.type === "Actor" && f.name === game.i18n.localize("GENESYS.GM.Folder"))
      ?? await Folder.implementation.create({ name: game.i18n.localize("GENESYS.GM.Folder"), type: "Actor", color: "#8e2229" });
    const grid = canvas.grid.size;
    const center = canvas.stage?.pivot ?? { x: canvas.dimensions.width / 2, y: canvas.dimensions.height / 2 };
    const tokens = [];
    let slot = 0;
    for (const e of this.encounter) {
      const src = await fromUuid(e.uuid);
      if (!src) continue;
      let actor = src;
      if (src.pack) {
        actor = game.actors.find(a => a._stats?.compendiumSource === src.uuid && a.folder?.id === folder.id);
        if (!actor) {
          const data = game.actors.fromCompendium(src);
          data.folder = folder.id;
          actor = await Actor.implementation.create(data);
        }
      }
      const copies = e.minion ? (e.groups ?? 1) : e.count;
      for (let i = 0; i < copies; i++) {
        const x = center.x + ((slot % 6) - 2.5) * grid * 1.2;
        const y = center.y + (Math.floor(slot / 6) - 1) * grid * 1.2;
        slot++;
        const td = await actor.getTokenDocument({ x: Math.round(x), y: Math.round(y), hidden });
        const data = td.toObject();
        if (e.minion) foundry.utils.setProperty(data, "delta.system.groupSize", e.count);
        tokens.push(data);
      }
    }
    const created = await canvas.scene.createEmbeddedDocuments("Token", tokens);
    if (target.dataset.combat === "1" && created.length) {
      const cls = TokenDocument.implementation;
      if (typeof cls.createCombatants === "function") await cls.createCombatants(created);
    }
    ui.notifications.info(game.i18n.format("GENESYS.GM.Placed", { count: created.length }));
  }

  static #onToggleChar(event, target) {
    const id = target.dataset.id;
    if (this.xp.selected.has(id)) this.xp.selected.delete(id); else this.xp.selected.add(id);
    this.render();
  }

  /** Выдать опыт выбранным персонажам с записью в журнал опыта. */
  static async #onAward(event, target) {
    const amount = Number(target.dataset.amount ?? this.xp.amount) || 0;
    if (amount <= 0) return;
    const actors = this.characters.filter(a => this.xp.selected.has(a.id));
    if (!actors.length) return ui.notifications.warn("GENESYS.GM.NoCharacters", { localize: true });
    const label = this.xp.reason || game.i18n.localize("GENESYS.GM.XPDefault");
    for (const a of actors) {
      const log = [...a.system.experience.log.map(e => ({ ...e })),
        { id: foundry.utils.randomID(), type: "earn", kind: "award", amount, label, timestamp: Date.now() }];
      await a.update({ "system.experience.log": log });
    }
    await ChatMessage.implementation.create({
      speaker: { alias: game.i18n.localize("GENESYS.GM.Title") },
      content: `<div class="genesys xp-award"><h4><i class="fa-solid fa-star"></i> ${game.i18n.format("GENESYS.GM.Awarded", { amount })}</h4>
        <p>${actors.map(a => foundry.utils.escapeHTML(a.name)).join(", ")}</p><p class="hint">${foundry.utils.escapeHTML(label)}</p></div>`
    });
    this.render();
  }
}
