import { GENESYS, SYSTEM_ID, TEMPLATES } from "../config.mjs";
import { ADVENTURES, WORLDS, getAdventure, filterForAdventure } from "../worlds.mjs";
import { adventureImg, enabledAdventureKeys, disabledSources } from "../helpers/adventure.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Компендиумы, которые можно импортировать в мир, и включены ли они по умолчанию. */
const IMPORTABLE = [
  ["archetypes", true], ["careers", true], ["skills", false], ["talents", true], ["abilities", true],
  ["heroic", true], ["spells", true], ["weapons", true], ["armor", true], ["gear", true],
  ["attachments", true], ["qualities", true], ["injuries", false], ["vehicle-crits", false],
  ["adversaries", true], ["vehicles", true]
];

/**
 * Мастер настройки мира: типы приключений (наборы миров), книги, импорт подходящего контента
 * в мир, таблицы бросков, журнал-справочник, макросы, стартовые очки сюжета.
 * Выбранные приключения сохраняются в настройке мира — из них игроки выбирают при создании персонажа.
 */
export class WorldSetup extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    const saved = enabledAdventureKeys();
    const custom = saved.find(k => k.startsWith("custom:"));
    this.setup = {
      adventures: new Set(saved.filter(k => ADVENTURES[k])),
      customWorlds: new Set(custom ? custom.slice(7).split(",") : []),
      customName: "", customSkills: "",
      sources: Object.fromEntries(Object.keys(GENESYS.sources).map(k => [k, !disabledSources().includes(k)])),
      packs: Object.fromEntries(IMPORTABLE.map(([k, on]) => [k, on])),
      tables: true, journal: true, macros: true, storyPoints: true, replace: true
    };
    try {
      const saved = game.settings.get(SYSTEM_ID, "customAdventure") ?? {};
      this.setup.customName = saved.name ?? ""; this.setup.customSkills = saved.skills ?? "";
    } catch { /* нет настройки */ }
    this.index = null;
    this.log = [];
    this.running = false;
  }

  static DEFAULT_OPTIONS = {
    id: "genesys-world-setup",
    classes: ["genesys", "themed", "theme-light", "world-setup"],
    tag: "form",
    window: { title: "GENESYS.Setup.Title", icon: "fa-solid fa-wand-magic-sparkles", resizable: true },
    position: { width: 860, height: 820 },
    actions: { install: WorldSetup.#onInstall, skip: WorldSetup.#onSkip, adventure: WorldSetup.#onAdventure, world: WorldSetup.#onWorld },
    form: { handler: WorldSetup.#onChange, submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = { main: { template: `${TEMPLATES}/apps/world-setup.hbs`, scrollable: [".setup-body"] } };

  /** @override */
  async _prepareContext(options) {
    try { return await this.#buildContext(); }
    catch (err) {
      console.error("genesys-rpg |", err);
      ui.notifications.error(`Genesys: ${err.message}`, { permanent: true });
      throw err;
    }
  }

  /** Индекс всех импортируемых компендиумов с тегами миров (для счётчиков). */
  async #loadIndex() {
    if (this.index) return this.index;
    const entries = [];
    for (const [key] of IMPORTABLE) {
      const pack = game.packs.get(`${SYSTEM_ID}.${key}`);
      if (!pack) continue;
      const index = await pack.getIndex({ fields: ["system.worlds", "system.source"] });
      for (const e of index) entries.push({ ...e, pack: key });
    }
    return (this.index = entries);
  }

  /** Выбранные приключения (объекты), включая своё сочетание миров. */
  get chosen() {
    const s = this.setup;
    const list = [...s.adventures].map(k => getAdventure(k));
    if (s.customWorlds.size) {
      const a = getAdventure(`custom:${[...s.customWorlds].join(",")}`);
      list.push({ ...a, label: s.customName.trim() || [...s.customWorlds].map(w => WORLDS[w]?.label).join(" + "), skills: s.customSkills || a.skills });
    }
    return list;
  }

  /** Подходит ли книга документа выбранным книгам. */
  #bookOk(doc) {
    const source = doc.system?.source ?? "";
    const book = Object.entries(GENESYS.sources).find(([, cfg]) => source.startsWith(cfg.match))?.[0];
    return !book || this.setup.sources[book];
  }

  /** Документы (или записи индекса), подходящие хотя бы одному выбранному приключению, без дублей. */
  select(docs) {
    const pool = docs.filter(d => this.#bookOk(d));
    const out = new Map();
    for (const a of this.chosen) for (const d of filterForAdventure(pool, a)) out.set(d._id ?? d.id ?? d.uuid, d);
    return [...out.values()];
  }

  async #buildContext() {
    const s = this.setup;
    const index = await this.#loadIndex();
    const pool = index.filter(d => this.#bookOk(d));
    const count = (a, pack) => filterForAdventure(pool.filter(d => d.pack === pack), a).length;
    const adventures = Object.entries(ADVENTURES).map(([key, cfg]) => {
      const a = getAdventure(key);
      return {
        key, label: cfg.label, hint: cfg.hint, img: adventureImg(cfg), selected: s.adventures.has(key),
        archetypes: count(a, "archetypes"), careers: count(a, "careers"), adversaries: count(a, "adversaries"),
        total: filterForAdventure(pool, a).length
      };
    });
    const selected = this.select(index);
    const byPack = new Map();
    for (const d of selected) byPack.set(d.pack, (byPack.get(d.pack) ?? 0) + 1);
    return {
      adventures,
      customImg: adventureImg({ icon: "scroll-unfurled" }),
      customActive: s.customWorlds.size > 0,
      worlds: Object.entries(WORLDS).map(([key, w]) => ({ key, label: w.label, color: w.color, on: s.customWorlds.has(key) })),
      customName: s.customName,
      skillSets: [{ key: "", label: "GENESYS.Setup.CustomSkillsAuto", selected: !s.customSkills },
        ...Object.entries(GENESYS.skillPresets).filter(([k]) => k !== "none").map(([key, label]) => ({ key, label, selected: key === s.customSkills }))],
      sources: Object.entries(GENESYS.sources).filter(([, c]) => c.kind === "official").map(([key, cfg]) => ({ key, label: cfg.label, checked: s.sources[key] })),
      fanSources: Object.entries(GENESYS.sources).filter(([, c]) => c.kind === "fan").map(([key, cfg]) => ({ key, label: cfg.label, checked: s.sources[key] })),
      modules: Object.entries(GENESYS.sources).filter(([, c]) => c.kind === "module").map(([key, cfg]) => ({
        key, label: `GENESYS.Modules.${key}Title`, hint: cfg.hint, checked: s.sources[key],
        count: index.filter(d => d.system?.source?.startsWith(cfg.match)).length })),
      packs: IMPORTABLE.map(([key]) => {
        const pack = game.packs.get(`${SYSTEM_ID}.${key}`);
        return pack ? { key, label: pack.metadata.label, count: byPack.get(key) ?? 0, total: pack.index.size, checked: s.packs[key] } : null;
      }).filter(Boolean),
      chosenLabels: this.chosen.map(a => a.label).join(", "),
      nothingChosen: !this.chosen.length,
      selectedTotal: selected.filter(d => s.packs[d.pack]).length,
      state: s,
      log: this.log,
      running: this.running
    };
  }

  static #onChange(event, form, formData) {
    const d = foundry.utils.expandObject(formData.object);
    const s = this.setup;
    for (const k of Object.keys(s.sources)) s.sources[k] = !!d.sources?.[k];
    for (const k of Object.keys(s.packs)) s.packs[k] = !!d.packs?.[k];
    for (const k of ["tables", "journal", "macros", "storyPoints", "replace"]) s[k] = !!d[k];
    if (d.custom) { s.customName = d.custom.name ?? s.customName; s.customSkills = d.custom.skills ?? s.customSkills; }
    if (event?.target?.name?.startsWith("sources.") || event?.target?.name?.startsWith("packs.")) this.render();
  }

  static #onAdventure(event, target) {
    const key = target.dataset.key;
    const s = this.setup;
    if (key === "all") { s.adventures = new Set(s.adventures.has("all") ? [] : ["all"]); s.customWorlds.clear(); }
    else {
      s.adventures.delete("all");
      if (s.adventures.has(key)) s.adventures.delete(key); else s.adventures.add(key);
    }
    this.render();
  }

  static #onWorld(event, target) {
    const key = target.dataset.key;
    const s = this.setup;
    s.adventures.delete("all");
    if (s.customWorlds.has(key)) s.customWorlds.delete(key); else s.customWorlds.add(key);
    this.render();
  }

  static async #onSkip() {
    await game.settings.set(SYSTEM_ID, "worldSetupDone", true);
    this.close();
  }

  #step(text) {
    this.log.push(text);
    this.render();
  }

  static async #onInstall() {
    if (this.running) return;
    const chosen = this.chosen;
    if (!chosen.length) return ui.notifications.warn("GENESYS.Setup.PickAdventure", { localize: true });
    this.running = true;
    this.log = [];
    const s = this.setup;
    try {
      await game.settings.set(SYSTEM_ID, "disabledSources", Object.keys(s.sources).filter(k => !s.sources[k]));
      await game.settings.set(SYSTEM_ID, "customAdventure", { name: s.customName.trim(), skills: s.customSkills });
      await game.settings.set(SYSTEM_ID, "adventures", chosen.map(a => a.key));
      await game.settings.set(SYSTEM_ID, "skillPreset", chosen.length === 1 ? chosen[0].skills : (chosen.find(a => a.key === "all") ? "all" : chosen[0].skills));
      this.#step(game.i18n.format("GENESYS.Setup.Log.Setting", { name: chosen.map(a => a.label).join(", ") }));

      for (const [key] of IMPORTABLE) {
        if (!s.packs[key]) continue;
        const n = await this.#importPack(key);
        if (n !== null) this.#step(game.i18n.format("GENESYS.Setup.Log.Imported", { name: game.packs.get(`${SYSTEM_ID}.${key}`)?.metadata.label ?? key, count: n }));
      }
      if (s.tables) {
        await this.#createTable("injuries", game.i18n.localize("GENESYS.Setup.TableInjuries"));
        await this.#createTable("vehicle-crits", game.i18n.localize("GENESYS.Setup.TableVehicle"));
        this.#step(game.i18n.localize("GENESYS.Setup.Log.Tables"));
      }
      if (s.journal) { await this.#createJournal(); this.#step(game.i18n.localize("GENESYS.Setup.Log.Journal")); }
      if (s.macros) { await this.#createMacros(); this.#step(game.i18n.localize("GENESYS.Setup.Log.Macros")); }
      if (s.storyPoints) { await newSession({ silent: true }); this.#step(game.i18n.localize("GENESYS.Setup.Log.StoryPoints")); }
      await game.settings.set(SYSTEM_ID, "worldSetupDone", true);
      this.#step(game.i18n.localize("GENESYS.Setup.Log.Done"));
      ui.notifications.info("GENESYS.Setup.Log.Done", { localize: true });
    } catch (err) {
      console.error(err);
      this.#step(`⚠ ${err.message}`);
    } finally {
      this.running = false;
      this.render();
    }
  }

  /** Папка мира (создаётся при необходимости). */
  async #folder(name, type, parent = null) {
    const existing = game.folders.find(f => f.type === type && f.name === name && (f.folder?.id ?? null) === (parent?.id ?? null));
    if (existing) return existing;
    return Folder.implementation.create({ name, type, folder: parent?.id ?? null, sorting: "a", color: parent ? null : "#2f6f8f" });
  }

  /** Импорт компендиума в мир с папками; возвращает число документов. */
  async #importPack(key) {
    const pack = game.packs.get(`${SYSTEM_ID}.${key}`);
    if (!pack) return null;
    const type = pack.documentName;
    const collection = type === "Actor" ? game.actors : game.items;
    const rootName = `Genesys: ${pack.metadata.label}`;
    const oldRoot = game.folders.find(f => f.type === type && f.name === rootName && !f.folder);
    if (oldRoot && this.setup.replace) await oldRoot.delete({ deleteSubfolders: true, deleteContents: true });
    else if (oldRoot) return 0;

    const docs = this.select(await pack.getDocuments());
    if (!docs.length) return 0;
    const root = await this.#folder(rootName, type);
    const sub = new Map();
    const data = [];
    for (const doc of docs) {
      const fname = doc.folder?.name;
      if (fname && !sub.has(fname)) sub.set(fname, await this.#folder(fname, type, root));
      const d = collection.fromCompendium(doc);
      d.folder = (fname ? sub.get(fname) : root).id;
      data.push(d);
    }
    const cls = type === "Actor" ? Actor.implementation : Item.implementation;
    for (let i = 0; i < data.length; i += 100) await cls.createDocuments(data.slice(i, i + 100));
    return data.length;
  }

  /** Таблица бросков d100 из компендиума травм. */
  async #createTable(key, name) {
    const pack = game.packs.get(`${SYSTEM_ID}.${key}`);
    if (!pack) return;
    const old = game.tables.getName(name);
    if (old) await old.delete();
    const docs = await pack.getDocuments();
    const results = docs.map(d => {
      const nums = String(d.system.rollRange ?? "").match(/\d+/g)?.map(Number) ?? [];
      const lo = nums[0] ?? 1;
      const hi = String(d.system.rollRange).includes("+") || nums.length < 2 ? 1000 : nums[1];
      return { type: "document", name: d.name, documentUuid: d.uuid, img: d.img, range: [lo, Math.max(lo, hi)], weight: Math.max(1, hi - lo + 1), description: "" };
    }).sort((a, b) => a.range[0] - b.range[0]);
    const folder = await this.#folder("Genesys", "RollTable");
    await RollTable.implementation.create({ name, formula: "1d100", replacement: true, displayRoll: true, folder: folder.id, results });
  }

  /** Журнал-справочник по правилам и по системе. */
  async #createJournal() {
    const name = game.i18n.localize("GENESYS.Setup.JournalName");
    const old = game.journal.getName(name);
    if (old) await old.delete();
    const { buildReferencePages, buildModulePages } = await import("./reference.mjs");
    const folder = await this.#folder("Genesys", "JournalEntry");
    await JournalEntry.implementation.create({
      name, folder: folder.id,
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
      pages: [...buildReferencePages(), ...(await buildModulePages(this.setup.sources))]
    });
  }

  /** Макросы ведущего на панели. */
  async #createMacros() {
    const folder = await this.#folder("Genesys", "Macro");
    const defs = [
      ["GENESYS.Setup.Macro.Roll", "fa-dice-d20", "game.genesys.roll();", "icons/svg/d20-grey.svg"],
      ["GENESYS.Setup.Macro.StoryPoints", "", "game.genesys.StoryPointsTracker.toggle();", "icons/svg/book.svg"],
      ["GENESYS.Setup.Macro.NewSession", "", "game.genesys.newSession();", "icons/svg/clockwork.svg"],
      ["GENESYS.Setup.Macro.Crit", "", "for (const t of canvas.tokens.controlled) await t.actor?.promptCriticalInjury();", "icons/svg/blood.svg"],
      ["GENESYS.Setup.Macro.Recover", "", "for (const t of canvas.tokens.controlled) if (t.actor?.recoverStrain) await t.actor.recoverStrain();", "icons/svg/regen.svg"],
      ["GENESYS.Setup.Macro.Setup", "", "new game.genesys.WorldSetup().render({ force: true });", "icons/svg/cog.svg"],
      ["GENESYS.GM.Title", "", "game.genesys.GMScreen.toggle();", "icons/svg/book.svg"],
      ["GENESYS.Fear.Title", "", "game.genesys.fearCheck();", "systems/genesys-rpg/assets/icons/gi/status/terror.svg"]
    ];
    let slot = 1;
    for (const [key, , command, img] of defs) {
      const name = game.i18n.localize(key);
      let macro = game.macros.find(m => m.name === name && m.folder?.id === folder.id);
      if (!macro) macro = await Macro.implementation.create({ name, type: "script", command, img, folder: folder.id });
      while (slot <= 10 && game.user.hotbar?.[slot]) slot++;
      if (slot <= 10) await game.user.assignHotbarMacro(macro, slot++);
    }
  }
}

/**
 * Новая игровая встреча: очки сюжета — по одному на игрока и одно у ведущего (правило Core),
 * сброс использований героических способностей.
 */
export async function newSession({ silent = false } = {}) {
  if (!game.user.isGM) return ui.notifications.warn("GENESYS.Setup.GMOnly", { localize: true });
  const players = game.users.filter(u => !u.isGM && (u.active || u.character)).length || game.users.filter(u => !u.isGM).length;
  await game.settings.set(SYSTEM_ID, "storyPoints", { player: players, gm: 1 });
  for (const actor of game.actors.filter(a => a.type === "character")) {
    const ups = actor.itemTypes.heroic.filter(h => h.system.uses > 0).map(h => ({ _id: h.id, "system.uses": 0 }));
    if (ups.length) await actor.updateEmbeddedDocuments("Item", ups);
  }
  if (!silent) {
    await ChatMessage.implementation.create({
      content: `<div class="genesys">${game.i18n.format("GENESYS.Setup.NewSessionMsg", { players })}</div>`,
      speaker: { alias: "Genesys" }
    });
  }
}
