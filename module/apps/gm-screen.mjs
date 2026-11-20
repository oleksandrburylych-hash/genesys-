import { GENESYS, SYSTEM_ID, TEMPLATES } from "../config.mjs";
import { ADVENTURES, getAdventure, filterForAdventure } from "../worlds.mjs";
import { enabledAdventureKeys, docAllowed } from "../helpers/adventure.mjs";
import { CREATURE_TYPES, LOOT_TAGS, threatOf, powerOf, minionGroupPower } from "../creatures.mjs";
import { ENCOUNTER_DIFFICULTY, LOOT_LEVELS, partyChallenge, generateEncounter, encounterPower, encounterSize, generateLoot } from "../encounters.mjs";

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
    this.gen = { encKind: "combat", mode: "budget", difficulty: 1, count: 4, party: null, creatures: new Set(), kinds: new Set(["minion", "rival", "nemesis"]) };
    this.loot = { level: 3, result: null, off: new Set(), quick: { count: 0, kind: "minion", creature: "humanoid" } };
    this.shop = { name: "", type: "general", size: "medium", locs: new Set(["town"]), result: null };
    this.shopPool = null;
    this.interp = { era: null, skill: "athletics", whisper: true, hl: {} };
  }

  static DEFAULT_OPTIONS = {
    id: "genesys-gm-screen",
    classes: ["genesys", "themed", "theme-light", "gm-screen"],
    tag: "form",
    window: { title: "GENESYS.GM.Title", icon: "fa-solid fa-book-skull", resizable: true },
    position: { width: 900, height: 720 },
    actions: {
      gmTab: GMScreen.#onTab, add: GMScreen.#onAdd, remove: GMScreen.#onRemove, count: GMScreen.#onCount,
      place: GMScreen.#onPlace, clear: GMScreen.#onClear, award: GMScreen.#onAward, refTable: GMScreen.#onRefTable,
      toggleChar: GMScreen.#onToggleChar, open: GMScreen.#onOpen,
      genMode: GMScreen.#onGenMode, genKindEnc: GMScreen.#onGenEncKind, genDifficulty: GMScreen.#onGenDifficulty, genCreature: GMScreen.#onGenCreature,
      genKind: GMScreen.#onGenKind, generate: GMScreen.#onGenerate,
      lootToggle: GMScreen.#onLootToggle, lootKind: GMScreen.#onLootKind, lootQuick: GMScreen.#onLootQuick, lootLevel: GMScreen.#onLootLevel, lootGenerate: GMScreen.#onLootGenerate,
      lootRemove: GMScreen.#onLootRemove, lootToChat: GMScreen.#onLootToChat,
      shopType: GMScreen.#onShopType, shopSize: GMScreen.#onShopSize, shopLoc: GMScreen.#onShopLoc,
      interpEra: GMScreen.#onInterpEra, interpSkill: GMScreen.#onInterpSkill, interpPick: GMScreen.#onInterpPick,
      interpRandom: GMScreen.#onInterpRandom, interpWhisper: GMScreen.#onInterpWhisper,
      shopGenerate: GMScreen.#onShopGenerate, shopRemove: GMScreen.#onShopRemove, shopToChat: GMScreen.#onShopToChat, npcGenerate: GMScreen.#onNpcGenerate,
      fear: async () => (await import("./fear.mjs")).promptFearCheck(),
      zoneEditor: async () => (await import("./zone-editor.mjs")).openZoneEditor(),
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
      tabs: ["encounter", "loot", "shop", "npc", "xp", "interp", "reference"].map(t => ({ key: t, label: `GENESYS.GM.Tab.${t}`, active: t === this.tab }))
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
          folder: d.folder?.name ?? "", power: powerOf(d), wounds: d.system.wounds?.max, soak: d.system.soak?.value }));
      ctx.encounter = this.encounter.map((e, i) => ({ ...e, index: i }));
      ctx.hasScene = !!globalThis.canvas?.scene;
      // Генератор по правилам EPG: рейтинг испытания группы (табл. II.2–6).
      const party = this.partyActors;
      const ch = partyChallenge(party, this.gen.party);
      const kind = this.gen.encKind;
      const single = encounterSize(this.encounter) === 1 && ch.size >= 3 ? 1 : 0;
      const diff = ENCOUNTER_DIFFICULTY[this.gen.difficulty];
      this.budget = Math.max(1, Math.round((ch.cr + single) * diff.mult));
      this.partySize = ch.size;
      const threat = encounterPower(this.encounter, kind);
      const count = encounterSize(this.encounter);
      ctx.gen = {
        mode: this.gen.mode, budgetMode: this.gen.mode === "budget", count: this.gen.count, partySize: ch.size, avgXP: ch.avgXP,
        crBase: ch.base, cr: ch.cr + single, mods: [...ch.mods, ...(single ? [{ key: "single", value: 1 }] : [])].map(m => ({ label: `GENESYS.GM.CRMod.${m.key}`, value: m.value })),
        encKind: kind, combat: kind === "combat",
        budget: this.budget, threat, pct: Math.min(100, Math.round(100 * threat / Math.max(1, this.budget))),
        over: threat > this.budget, tooMany: count > ch.size, count,
        difficulties: ENCOUNTER_DIFFICULTY.map((d, i) => ({ index: i, label: `GENESYS.GM.Diff.${d.key}`, active: i === this.gen.difficulty })),
        creatures: Object.entries(CREATURE_TYPES).map(([k, c]) => ({ key: k, label: c.label, img: `systems/genesys-rpg/assets/icons/gi/creature/${c.icon}.svg`, on: this.gen.creatures.has(k) })),
        kinds: ["minion", "rival", "nemesis"].map(k => ({ key: k, label: GENESYS.adversaryTypes[k], on: this.gen.kinds.has(k) }))
      };
    }

    if (this.tab === "loot") {
      const r = this.loot.result;
      const cands = await this.#lootCandidates();
      const q = this.loot.quick;
      ctx.loot = {
        enemies: cands.map(c => ({ key: c.key, name: c.name, img: c.img, count: c.count, dead: c.dead, fromEncounter: c.fromEncounter, on: !this.loot.off.has(c.key) })),
        quick: { count: q.count,
          kinds: ["minion", "rival", "nemesis"].map(k => ({ key: k, label: GENESYS.adversaryTypes[k], active: k === q.kind })),
          creatures: Object.entries(CREATURE_TYPES).map(([k, c]) => ({ key: k, label: c.label, selected: k === q.creature })) },
        levels: LOOT_LEVELS.map(l => ({ level: l.level, label: `GENESYS.Loot.Level.${l.level}`, hint: `GENESYS.Loot.LevelHint.${l.level}`, active: l.level === this.loot.level,
          img: `systems/genesys-rpg/assets/icons/gi/loot/${["cobweb", "coins", "two-coins", "open-treasure-chest", "crown-coin"][l.level - 1]}.svg` })),
        result: r ? { coins: r.coins, items: r.items.map((it, i) => ({ ...it, index: i, total: it.price * it.qty })), value: r.coins + r.items.reduce((s2, it) => s2 + it.price * it.qty, 0) } : null,
        total: cands.filter(c => !this.loot.off.has(c.key)).reduce((s2, c) => s2 + c.count, 0) + q.count
      };
    }
    if (this.tab === "shop") {
      const { LOCATION_MODS, SHOP_TYPES, SHOP_SIZES, rarityCheck, isRestricted } = await import("../merchant.mjs");
      const locMod = LOCATION_MODS.filter(l => this.shop.locs.has(l.key)).reduce((s2, l) => s2 + l.value, 0);
      this.shop.locMod = locMod;
      const keys = enabledAdventureKeys();
      ctx.shop = {
        available: this.shop.result?.available ?? null,
        name: this.shop.name,
        adventures: [...new Set(keys.length ? [...keys, "all"] : Object.keys(ADVENTURES))].map(k => ({ key: k, label: getAdventure(k).label, selected: k === (this.shop.adventure ?? this.filter.adventure) })),
        types: Object.entries(SHOP_TYPES).map(([k, t]) => ({ key: k, label: `GENESYS.Shop.Type.${k}`, img: `systems/genesys-rpg/assets/icons/gi/loot/${t.icon}.svg`, active: k === this.shop.type })),
        sizes: Object.keys(SHOP_SIZES).map(k => ({ key: k, label: `GENESYS.Shop.Size.${k}`, active: k === this.shop.size })),
        locs: LOCATION_MODS.map(l => ({ key: l.key, label: `GENESYS.Shop.Loc.${l.key}`, value: l.value > 0 ? `+${l.value}` : `${l.value}`, on: this.shop.locs.has(l.key) })),
        locMod: locMod > 0 ? `+${locMod}` : `${locMod}`,
        items: this.shop.result?.map((it, i) => {
          const c = rarityCheck(it.rarity);
          return { index: i, name: it.data.name, img: it.data.img, price: it.data.system?.price ?? 0, rarity: it.rarity, stock: it.stock,
            check: c.difficulty ? `${L(GENESYS.difficulties[c.difficulty])}${c.upgrades ? ` +${c.upgrades}↑` : ""}` : L("GENESYS.Shop.NoCheck"), restricted: isRestricted(it.data) };
        }) ?? null
      };
    }
    if (this.tab === "npc") {
      const { NPC_ROLES, NPC_GROUPS } = await import("../npc.mjs");
      const keys = enabledAdventureKeys();
      ctx.npc = {
        adventures: [...new Set(keys.length ? [...keys] : Object.keys(ADVENTURES))].map(k => ({ key: k, label: getAdventure(k).label, selected: k === (this.npc?.adventure ?? this.filter.adventure) })),
        roleGroups: Object.entries(NPC_GROUPS).map(([g, label]) => ({ label, roles: Object.entries(NPC_ROLES).filter(([, r]) => r.group === g)
          .map(([k, r]) => ({ key: k, label: r.label, selected: k === (this.npc?.role ?? "fighter") })) })),
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

    if (this.tab === "interp") {
      const I = await import("../interpretations.mjs");
      const st = this.interp;
      st.era ??= I.currentEra();
      const data = await I.loadInterpretations(st.skill);
      const eraData = data?.eras?.[st.era] ?? null;
      const skillName = k => L(`GENESYS.Skill.${k}`);
      ctx.interp = {
        era: st.era, whisper: st.whisper, skill: skillName(st.skill),
        eras: Object.entries(I.ERAS).map(([k, e]) => ({ key: k, label: e.label, icon: e.icon, active: k === st.era })),
        groups: Object.entries(I.INTERP_SKILLS).map(([cat, keys]) => ({
          label: `GENESYS.SkillCategory.${cat}`,
          skills: keys.map(k => ({ key: k, label: skillName(k), active: k === st.skill })).sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
        })),
        missing: !eraData,
        otherEras: data ? Object.keys(data.eras ?? {}).map(k => L(I.ERAS[k]?.label ?? k)).join(", ") : "",
        columns: I.OUTCOMES.map(o => ({ key: o, label: o === "mixed" ? "GENESYS.Interp.Mixed" : `GENESYS.Symbol.${o}`, mixed: o === "mixed",
          items: (eraData?.[o] ?? []).map((text, i) => ({ i, text, hl: st.hl[o] === i })) }))
      };
    }

    if (this.tab === "reference") {
      ctx.difficulties = Object.entries(GENESYS.difficulties).map(([n, label]) => ({ n: Number(n), label }));
      ctx.ranges = ["engaged", "short", "medium", "long", "extreme"].map(k => ({ label: `GENESYS.Range.${k}`, hint: `GENESYS.GM.RangeHint.${k}` }));
      const tables = GENESYS.spending ?? {};
      ctx.refTables = Object.entries(tables).map(([k, t]) => ({ key: k, title: t.title, active: k === this.refTable }));
      ctx.refRows = tables[this.refTable]?.rows ?? [];
      ctx.healing = ["medWounds1", "medWounds2", "medWounds3", "medInjury", "medResult", "medSurgeon", "medSelf", "medOnce", "medWeek", "medKit",
        "painkiller", "painkillerLimit", "strainScene", "rest", "incap"].map(k => ({ label: `GENESYS.GM.Heal.${k}.label`, text: `GENESYS.GM.Heal.${k}.text` }));
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
  /**
   * Кого обыскивают: все враждебные противники на сцене (живые и выбывшие — кого победили, того и обыскивают)
   * и противники из списка встречи. Дружественных и нейтральных не трогаем. Каждого можно выключить щелчком.
   */
  async #lootCandidates() {
    const out = [];
    const seen = new Set();
    for (const t of globalThis.canvas?.tokens?.placeables ?? []) {
      const a = t.actor;
      if (!a || a.type !== "adversary") continue;
      const disp = t.document?.disposition ?? -1;
      if (disp !== -1) continue; // CONST.TOKEN_DISPOSITIONS.HOSTILE
      const key = `token:${t.id}`;
      seen.add(a.uuid);
      out.push({ key, doc: a, count: a.system.isMinion ? (a.system.aliveMinions || a.system.groupSize || 1) : 1, name: t.name ?? a.name, img: a.img,
        dead: a.statuses?.has("dead") || a.statuses?.has("incapacitated") || !!t.combatant?.defeated });
    }
    for (const e of this.encounter) {
      const doc = await fromUuid(e.uuid);
      if (!doc || seen.has(doc.uuid)) continue;
      out.push({ key: `enc:${e.uuid}`, doc, count: e.minion ? e.count * (e.groups ?? 1) : e.count, name: doc.name, img: doc.img, fromEncounter: true });
    }
    return out;
  }

  /** Источники добычи: включённые враги + «быстрые» (число × тип × вид существа). */
  async #lootSources() {
    const out = (await this.#lootCandidates()).filter(c => !this.loot.off.has(c.key)).map(c => ({ doc: c.doc, count: c.count }));
    const q = this.loot.quick;
    if (q.count > 0) {
      const lib = await this.#load();
      const fit = lib.filter(d => (d.system.creatureType || "humanoid") === q.creature && d.system.adversaryType === q.kind);
      const any = fit.length ? fit : lib.filter(d => (d.system.creatureType || "humanoid") === q.creature);
      for (let i = 0; i < q.count; i++) {
        const doc = any.length ? any[Math.floor(Math.random() * any.length)] : null;
        if (doc) out.push({ doc, count: 1 });
        else {
          const { lootTagsFor } = await import("../creatures.mjs");
          const fake = { name: game.i18n.localize(`GENESYS.AdversaryType.${q.kind}`), items: [], system: { creatureType: q.creature, adversaryType: q.kind, power: { combat: q.kind === "nemesis" ? 4 : q.kind === "rival" ? 2 : 1 } } };
          fake.system.loot = lootTagsFor(fake, q.creature);
          out.push({ doc: fake, count: 1 });
        }
      }
    }
    return out;
  }

  /** Предметы компендиумов для «находок» (по приключению фильтра и включённым книгам). */
  /** Товары для лавки и добычи: компендиумы + предметы мира (копия из компендиума заменяет оригинал), по типу приключения. */
  async #shop(adventureKey = this.filter.adventure) {
    this.shopPools ??= new Map();
    if (this.shopPools.has(adventureKey)) return this.shopPools.get(adventureKey);
    const docs = [];
    for (const key of ["weapons", "armor", "gear"]) {
      const pack = game.packs.get(`${SYSTEM_ID}.${key}`);
      if (pack) docs.push(...(await pack.getDocuments()));
    }
    const world = (game.items?.filter?.(i => ["weapon", "armor", "gear"].includes(i.type)) ?? []);
    const copied = new Set(world.map(i => i._stats?.compendiumSource).filter(Boolean));
    const all = [...docs.filter(d => !copied.has(d.uuid)), ...world];
    const pool = filterForAdventure(all.filter(d => docAllowed(d) && (d.system.price ?? 0) > 0
      && !/транспорт|правила|создание/i.test(`${d.folder?.name ?? ""} ${d.name}`)), getAdventure(adventureKey));
    this.shopPools.set(adventureKey, pool);
    return pool;
  }

  static #onGenMode(event, target) { this.gen.mode = target.dataset.mode; this.render(); }
  static #onGenEncKind(event, target) { this.gen.encKind = target.dataset.kind; this.render(); }
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
    const list = generateEncounter(candidates, { mode: this.gen.mode, budget: this.budget ?? 8, count: this.gen.count, kinds: this.gen.kinds,
      kind: this.gen.encKind, maxEntries: this.partySize ?? 4 });
    if (!list.length) return ui.notifications.warn("GENESYS.GM.GenNothing", { localize: true });
    this.encounter = list;
    this.render();
  }

  static #onLootToggle(event, target) {
    const k = target.dataset.key;
    if (this.loot.off.has(k)) this.loot.off.delete(k); else this.loot.off.add(k);
    this.render();
  }
  static #onLootKind(event, target) { this.loot.quick.kind = target.dataset.key; this.render(); }
  static #onLootQuick(event, target) {
    this.loot.quick.count = Math.max(0, Math.min(30, this.loot.quick.count + Number(target.dataset.delta)));
    this.render();
  }
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

  static #onInterpEra(event, target) {
    this.interp.era = target.dataset.key; this.interp.hl = {};
    if (game.user.isGM) game.settings.set(SYSTEM_ID, "interpEra", this.interp.era).catch(() => {});
    this.render();
  }
  static #onInterpSkill(event, target) { this.interp.skill = target.dataset.key; this.interp.hl = {}; this.render(); }
  static #onInterpWhisper() { this.interp.whisper = !this.interp.whisper; this.render(); }
  /** Щелчок по варианту — в чат. */
  static async #onInterpPick(event, target) {
    const I = await import("../interpretations.mjs");
    const o = target.dataset.outcome, i = Number(target.dataset.index);
    const text = (await I.loadInterpretations(this.interp.skill))?.eras?.[this.interp.era]?.[o]?.[i];
    if (!text) return;
    this.interp.hl = { ...this.interp.hl, [o]: i };
    await I.postInterpretation({ skillKey: this.interp.skill, era: this.interp.era, outcome: o, texts: [text], whisper: this.interp.whisper });
    this.render();
  }
  /** Кубик над колонкой — случайный вариант: подсветить и отправить в чат. */
  static async #onInterpRandom(event, target) {
    const I = await import("../interpretations.mjs");
    const o = target.dataset.outcome;
    const list = (await I.loadInterpretations(this.interp.skill))?.eras?.[this.interp.era]?.[o] ?? [];
    if (!list.length) return;
    const i = Math.floor(Math.random() * list.length);
    this.interp.hl = { ...this.interp.hl, [o]: i };
    await I.postInterpretation({ skillKey: this.interp.skill, era: this.interp.era, outcome: o, texts: [list[i]], whisper: this.interp.whisper });
    this.render();
  }

  static #onShopType(event, target) { this.shop.type = target.dataset.key; this.render(); }
  static #onShopSize(event, target) { this.shop.size = target.dataset.key; this.render(); }
  static #onShopLoc(event, target) {
    const k = target.dataset.key;
    if (this.shop.locs.has(k)) this.shop.locs.delete(k); else this.shop.locs.add(k);
    this.render();
  }
  static async #onShopGenerate() {
    const { generateShop } = await import("../merchant.mjs");
    this.shop.result = generateShop(await this.#shop(this.shop.adventure ?? this.filter.adventure), { type: this.shop.type, size: this.shop.size, locMod: this.shop.locMod ?? 0 });
    this.render();
  }
  static #onShopRemove(event, target) { this.shop.result?.splice(Number(target.dataset.index), 1); this.render(); }
  static async #onShopToChat() {
    if (!this.shop.result?.length) return;
    const { postShop, LOCATION_MODS } = await import("../merchant.mjs");
    const where = LOCATION_MODS.filter(l => this.shop.locs.has(l.key)).map(l => game.i18n.localize(`GENESYS.Shop.Loc.${l.key}`)).join(", ");
    await postShop({ name: this.shop.name || game.i18n.localize(`GENESYS.Shop.Type.${this.shop.type}`), where, locMod: this.shop.locMod ?? 0, items: this.shop.result });
    ui.notifications.info("GENESYS.Shop.Posted", { localize: true });
  }

  static #onChange(event, form, formData) {
    const d = foundry.utils.expandObject(formData.object);
    if (d.filter?.adventure && d.filter.adventure !== this.filter.adventure) this.shopPools?.delete(d.filter.adventure);
    if (d.shop?.adventure) this.shop.adventure = d.shop.adventure;
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
    if (d.shop?.name !== undefined) this.shop.name = d.shop.name;
    if (d.loot?.creature) this.loot.quick.creature = d.loot.creature;
    if (d.loot?.count !== undefined) this.loot.quick.count = Math.max(0, Math.min(30, Number(d.loot.count) || 0));
    if (d.npc) this.npc = { ...(this.npc ?? {}), ...d.npc, power: Number(d.npc.power ?? this.npc?.power ?? 2) };
    if (d.enc) for (const [i, v] of Object.entries(d.enc)) {
      const e = this.encounter[i];
      if (!e) continue;
      e.count = Math.max(1, Number(v.count) || 1);
      if (e.minion) {
        const doc = this.lib?.find(x => x.uuid === e.uuid);
        if (doc) e.power = minionGroupPower(powerOf(doc), e.count);
      }
    }
    const name = event?.target?.name ?? "";
    if (name.startsWith("loot.")) this.render();
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
      const size = minion ? (doc.system.groupSize || 3) : 1;
      if (!existing) this.encounter.push({ uuid: doc.uuid, name: doc.name, img: doc.img, minion, count: size, groups: 1,
        power: minion ? minionGroupPower(powerOf(doc), size) : powerOf(doc), threat: threatOf(doc) });
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
