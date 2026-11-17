import { GENESYS, SYSTEM_ID, TEMPLATES } from "../config.mjs";
import { ADVENTURES, getAdventure, filterForAdventure } from "../worlds.mjs";
import { enabledAdventureKeys, docAllowed } from "../helpers/adventure.mjs";
import { CREATURE_TYPES, LOOT_TAGS, threatOf } from "../creatures.mjs";
import { ENCOUNTER_DIFFICULTY, LOOT_LEVELS, heroPower, generateEncounter, encounterThreat, generateLoot } from "../encounters.mjs";

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
    this.gen = { mode: "budget", difficulty: 1, count: 4, party: null, creatures: new Set(), kinds: new Set(["minion", "rival", "nemesis"]) };
    this.loot = { source: "encounter", level: 3, result: null };
    this.shopPool = null;
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
      toggleChar: GMScreen.#onToggleChar, open: GMScreen.#onOpen,
      genMode: GMScreen.#onGenMode, genDifficulty: GMScreen.#onGenDifficulty, genCreature: GMScreen.#onGenCreature,
      genKind: GMScreen.#onGenKind, generate: GMScreen.#onGenerate,
      lootSource: GMScreen.#onLootSource, lootLevel: GMScreen.#onLootLevel, lootGenerate: GMScreen.#onLootGenerate,
      lootRemove: GMScreen.#onLootRemove, lootToChat: GMScreen.#onLootToChat, npcGenerate: GMScreen.#onNpcGenerate,
      fear: async () => (await import("./fear.mjs")).promptFearCheck(),
      social: () => game.genesys.SocialEncounter.open()
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
    this.lib = [...packDocs.filter(d => !copied.has(d.uuid) && docAllowed(d)), ...world];
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
      tabs: ["encounter", "loot", "npc", "xp", "reference"].map(t => ({ key: t, label: `GENESYS.GM.Tab.${t}`, active: t === this.tab }))
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
      // Генератор
      const party = this.partyActors;
      const power = Math.round(party.reduce((s2, a) => s2 + heroPower(a), 0) * 10) / 10 || 8;
      const partySize = this.gen.party ?? party.length ?? 0;
      const partyPower = this.gen.party ? Math.round(this.gen.party * (power / Math.max(1, party.length || this.gen.party)) * 10) / 10 : power;
      const diff = ENCOUNTER_DIFFICULTY[this.gen.difficulty];
      this.budget = Math.round(partyPower * diff.mult * 10) / 10;
      const threat = encounterThreat(this.encounter);
      ctx.gen = {
        mode: this.gen.mode, budgetMode: this.gen.mode === "budget", count: this.gen.count, partySize: partySize || 4, partyPower,
        budget: this.budget, threat, pct: Math.min(100, Math.round(100 * threat / Math.max(1, this.budget))),
        over: threat > this.budget * 1.15,
        difficulties: ENCOUNTER_DIFFICULTY.map((d, i) => ({ index: i, label: `GENESYS.GM.Diff.${d.key}`, active: i === this.gen.difficulty })),
        creatures: Object.entries(CREATURE_TYPES).map(([k, c]) => ({ key: k, label: c.label, img: `systems/genesys-rpg/assets/icons/gi/creature/${c.icon}.svg`, on: this.gen.creatures.has(k) })),
        kinds: ["minion", "rival", "nemesis"].map(k => ({ key: k, label: GENESYS.adversaryTypes[k], on: this.gen.kinds.has(k) }))
      };
    }

    if (this.tab === "loot") {
      const r = this.loot.result;
      ctx.loot = {
        source: this.loot.source,
        sources: ["encounter", "defeated"].map(k => ({ key: k, label: `GENESYS.Loot.Source.${k}`, active: k === this.loot.source })),
        levels: LOOT_LEVELS.map(l => ({ level: l.level, label: `GENESYS.Loot.Level.${l.level}`, hint: `GENESYS.Loot.LevelHint.${l.level}`, active: l.level === this.loot.level,
          img: `systems/genesys-rpg/assets/icons/gi/loot/${["cobweb", "coins", "two-coins", "open-treasure-chest", "crown-coin"][l.level - 1]}.svg` })),
        result: r ? { coins: r.coins, items: r.items.map((it, i) => ({ ...it, index: i, total: it.price * it.qty })), value: r.coins + r.items.reduce((s2, it) => s2 + it.price * it.qty, 0) } : null,
        sourceCount: (await this.#lootSources()).length
      };
    }
    if (this.tab === "npc") {
      const { NPC_ROLES } = await import("../npc.mjs");
      const keys = enabledAdventureKeys();
      ctx.npc = {
        adventures: [...new Set(keys.length ? [...keys] : Object.keys(ADVENTURES))].map(k => ({ key: k, label: getAdventure(k).label, selected: k === (this.npc?.adventure ?? this.filter.adventure) })),
        roles: Object.entries(NPC_ROLES).map(([k, r]) => ({ key: k, label: r.label, selected: k === (this.npc?.role ?? "fighter") })),
        kinds: ["minion", "rival", "nemesis"].map(k => ({ key: k, label: GENESYS.adversaryTypes[k], selected: k === (this.npc?.kind ?? "rival") })),
        power: this.npc?.power ?? 2,
        last: this.npc?.last ?? null
      };
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

  /** Персонажи игроков (на сцене, иначе все с владельцем-игроком). */
  get partyActors() {
    const onScene = (globalThis.canvas?.tokens?.placeables ?? []).map(t => t.actor).filter(a => a?.type === "character" && a.hasPlayerOwner);
    const list = onScene.length ? onScene : game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
    return [...new Set(list)];
  }

  /** Источники добычи: встреча из списка или побеждённые противники на сцене. */
  async #lootSources() {
    if (this.loot.source === "defeated") {
      const tokens = (globalThis.canvas?.tokens?.placeables ?? []).filter(t => t.actor?.type === "adversary"
        && (t.actor.statuses?.has("dead") || t.actor.statuses?.has("incapacitated") || t.document?.hidden === false && t.combatant?.defeated));
      return tokens.map(t => ({ doc: t.actor, count: t.actor.system.isMinion ? (t.actor.system.groupSize ?? 1) : 1 }));
    }
    const out = [];
    for (const e of this.encounter) {
      const doc = await fromUuid(e.uuid);
      if (doc) out.push({ doc, count: e.minion ? e.count * (e.groups ?? 1) : e.count });
    }
    return out;
  }

  /** Предметы компендиумов для «находок» (по приключению фильтра и включённым книгам). */
  async #shop() {
    if (this.shopPool) return this.shopPool;
    const docs = [];
    for (const key of ["weapons", "armor", "gear"]) {
      const pack = game.packs.get(`${SYSTEM_ID}.${key}`);
      if (pack) docs.push(...(await pack.getDocuments()));
    }
    const adv = getAdventure(this.filter.adventure);
    this.shopPool = filterForAdventure(docs.filter(d => docAllowed(d) && (d.system.price ?? 0) > 0 && !/транспорт|правила/i.test(`${d.folder?.name ?? ""} ${d.name}`)), adv);
    return this.shopPool;
  }

  static #onGenMode(event, target) { this.gen.mode = target.dataset.mode; this.render(); }
  static #onGenDifficulty(event, target) { this.gen.difficulty = Number(target.dataset.index); this.render(); }
  static #onGenCreature(event, target) {
    const k = target.dataset.key;
    if (this.gen.creatures.has(k)) this.gen.creatures.delete(k); else this.gen.creatures.add(k);
    this.render();
  }
  static #onGenKind(event, target) {
    const k = target.dataset.key;
    if (this.gen.kinds.has(k) && this.gen.kinds.size > 1) this.gen.kinds.delete(k); else this.gen.kinds.add(k);
    this.render();
  }

  /** Сгенерировать встречу по сложности или числу противников. */
  static async #onGenerate() {
    const lib = await this.#load();
    const adv = getAdventure(this.filter.adventure);
    const types = this.gen.creatures;
    const candidates = filterForAdventure(lib, adv).filter(d => (!types.size || types.has(d.system.creatureType))
      && !/скакун|вьючное|ездовое/i.test(d.name));
    const list = generateEncounter(candidates, { mode: this.gen.mode, budget: this.budget ?? 8, count: this.gen.count, kinds: this.gen.kinds });
    if (!list.length) return ui.notifications.warn("GENESYS.GM.GenNothing", { localize: true });
    this.encounter = list;
    this.render();
  }

  static #onLootSource(event, target) { this.loot.source = target.dataset.key; this.loot.result = null; this.render(); }
  static #onLootLevel(event, target) { this.loot.level = Number(target.dataset.level); this.render(); }

  static async #onLootGenerate() {
    const sources = await this.#lootSources();
    if (!sources.length) return ui.notifications.warn("GENESYS.Loot.NoSources", { localize: true });
    this.loot.result = generateLoot(sources, this.loot.level, await this.#shop());
    this.render();
  }

  static #onLootRemove(event, target) {
    this.loot.result?.items.splice(Number(target.dataset.index), 1);
    this.render();
  }

  /** Карточка добычи в чат: кнопки «Взять» и «Поделить деньги». */
  static async #onLootToChat() {
    const r = this.loot.result;
    if (!r) return;
    const { postLoot } = await import("../loot.mjs");
    await postLoot({ coins: r.coins, items: r.items.map(it => ({ data: it.data, qty: it.qty, taken: null })) });
    this.loot.result = null;
    this.render();
  }

  /** Создать NPC и открыть его лист. */
  static async #onNpcGenerate() {
    const { generateNPC } = await import("../npc.mjs");
    const opts = { role: "fighter", kind: "rival", power: 2, adventure: this.filter.adventure, ...(this.npc ?? {}) };
    const actor = await generateNPC(opts);
    if (!actor) return;
    this.npc = { ...opts, last: { name: actor.name, uuid: actor.uuid, img: actor.img } };
    actor.sheet.render({ force: true });
    this.render();
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
    if (d.gen) {
      if (d.gen.count !== undefined) this.gen.count = Math.max(1, Number(d.gen.count) || 1);
      if (d.gen.party !== undefined) this.gen.party = Math.max(1, Number(d.gen.party) || 1);
    }
    if (d.npc) this.npc = { ...(this.npc ?? {}), ...d.npc, power: Number(d.npc.power ?? this.npc?.power ?? 2) };
    if (d.filter?.adventure && d.filter.adventure !== this.filter.adventure) this.shopPool = null;
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
      if (!existing) this.encounter.push({ uuid: doc.uuid, name: doc.name, img: doc.img, minion, count: minion ? (doc.system.groupSize || 3) : 1, groups: 1, power: combatPower(doc), threat: threatOf(doc) });
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
