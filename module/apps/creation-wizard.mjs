import { GENESYS, SYSTEM_ID, TEMPLATES } from "../config.mjs";
import { getAdventure, filterForAdventure, fitsAdventure, worldsOf } from "../worlds.mjs";
import { enabledAdventureKeys, adventureImg, adventureSkillKeys, magicCareerOnly } from "../helpers/adventure.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const STEPS = ["archetype", "career", "skills", "xp", "talents", "motivations", "heroic", "gear", "details", "summary"];
const GEAR_TYPES = ["weapon", "armor", "gear"];
const CHARS = Object.keys(GENESYS.characteristics);
const MOTIVATIONS = ["strength", "flaw", "desire", "fear"];

/** Замена карьерных навыков, которых нет в наборе приключения (правило Core: «Ближний бой» ↔ «Ближний бой (лёгкое оружие)» и т. п.). */
const SKILL_SUBSTITUTES = {
  melee: ["meleeLight", "meleeHeavy"], meleeLight: ["melee"], meleeHeavy: ["melee"],
  ranged: ["rangedLight", "rangedHeavy"], rangedLight: ["ranged"], rangedHeavy: ["ranged"],
  knowledge: ["knowledgeLore", "knowledgeAdventuring", "knowledgeSupernatural"],
  knowledgeLore: ["knowledge"], knowledgeAdventuring: ["knowledge"], knowledgeForbidden: ["knowledge"], knowledgeGeography: ["knowledge"]
};

/** Книга по строке source. */
function bookOf(source = "") {
  if (source.startsWith("Core")) return "Core";
  if (source.startsWith("Expanded")) return "EPG";
  if (source.startsWith("Realms")) return "Терринот";
  if (source.startsWith("Zynnythryx")) return "Зиннитрикс";
  return "";
}

/**
 * Мастер создания персонажа по шагам книги правил:
 * раса → карьера → бесплатные ранги → опыт (характеристики, навыки) → таланты →
 * мотивации → героическая способность → описание и деньги → итог.
 * Всё считается внутри мастера; на персонажа применяется одной кнопкой с журналом опыта.
 */
export class CreationWizard extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ actor, ...options } = {}) {
    super(options);
    this.actor = actor;
    this.stepIndex = 0;
    this.lib = null;
    this.viewCache = null;
    this.filter = { gearType: "weapon", gearSearch: "", archetype: "", career: "", talent: "", archetypeSearch: "", careerSearch: "", talentSearch: "", talentTier: 0 };
    this.pick = {
      archetype: null, career: null, heroic: null,
      careerFree: [], startFree: [],
      chars: Object.fromEntries(CHARS.map(k => [k, 0])),
      skills: {},
      talents: [],
      motivations: Object.fromEntries(MOTIVATIONS.map(k => [k, { name: "", text: "" }])),
      details: { name: actor.name, gender: "", age: "", height: "", build: "", hair: "", eyes: "", features: "", money: null, pocket: 0 },
      gear: []
    };
  }

  static DEFAULT_OPTIONS = {
    classes: ["genesys", "creation-wizard"],
    tag: "form",
    window: { title: "GENESYS.Wizard.Title", icon: "fa-solid fa-hat-wizard", resizable: true },
    position: { width: 1040, height: 800 },
    actions: {
      goto: CreationWizard.#onGoto, next: CreationWizard.#onNext, back: CreationWizard.#onBack,
      pick: CreationWizard.#onPick, group: CreationWizard.#onGroup, toggle: CreationWizard.#onToggle,
      char: CreationWizard.#onChar, skill: CreationWizard.#onSkill, talent: CreationWizard.#onTalent,
      tier: CreationWizard.#onTier, rollMotivation: CreationWizard.#onRollMotivation,
      pickMotivation: CreationWizard.#onPickMotivation, finish: CreationWizard.#onFinish,
      gearType: CreationWizard.#onGearType, buy: CreationWizard.#onBuy, cartQty: CreationWizard.#onCartQty,
      rollPocket: CreationWizard.#onRollPocket, random: CreationWizard.#onRandom
    },
    form: { handler: CreationWizard.#onChange, submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = { main: { template: `${TEMPLATES}/apps/creation-wizard.hbs`, scrollable: [".wz-list", ".wz-detail", ".wz-body"] } };

  get step() { return STEPS[this.stepIndex]; }

  /* -------------------------------------------- */
  /*  Данные                                       */
  /* -------------------------------------------- */

  /**
   * Документы типа из компендиума и мира. Копии из компендиума, импортированные в мир мастером настройки,
   * заменяют оригинал (ведущий мог их поправить), поэтому одна и та же карьера не появляется дважды.
   */
  async #docs(packName, type) {
    const pack = game.packs.get(`${SYSTEM_ID}.${packName}`);
    const packDocs = pack ? (await pack.getDocuments()).filter(d => d.type === type) : [];
    const byUuid = new Map(packDocs.map(d => [d.uuid, d]));
    const replaced = new Set();
    const world = [];
    for (const item of game.items.filter(i => i.type === type)) {
      const src = item._stats?.compendiumSource ?? item.flags?.core?.sourceId;
      const original = src ? byUuid.get(src) : null;
      // Копии, импортированные до появления тегов (пустые теги), заменяются оригиналом с тегами.
      if (original && !(item.system.worlds?.length) && original.system.worlds?.length) continue;
      if (original) replaced.add(src);
      world.push(item);
    }
    return [...packDocs.filter(d => !replaced.has(d.uuid)), ...world];
  }

  async #load() {
    if (this.lib) return this.lib;
    const [archetypes, careers, heroics, talents, skills, weapons, armor, gear] = await Promise.all([
      this.#docs("archetypes", "archetype"), this.#docs("careers", "career"), this.#docs("heroic", "heroic"),
      this.#docs("talents", "talent"), this.#docs("skills", "skill"),
      this.#docs("weapons", "weapon"), this.#docs("armor", "armor"), this.#docs("gear", "gear")
    ]);
    // В лавке — только то, что можно купить: оружие персонального масштаба, броня и снаряжение с ценой.
    const shop = [...weapons, ...armor, ...gear].filter(d => (d.system.price ?? 0) > 0 && !/транспорт/i.test(d.folder?.name ?? ""));
    this.lib = { archetypes, careers, heroics, talents, skills, shop,
      byUuid: new Map([...archetypes, ...careers, ...heroics, ...talents, ...shop].map(d => [d.uuid, d])) };
    // Стартовые деньги по правилам книги.
    if (this.pick.details.money === null) this.pick.details.money = GENESYS.creation?.rules?.startingMoney ?? 500;
    return this.lib;
  }

  #doc(uuid) { return uuid ? this.lib?.byUuid.get(uuid) ?? null : null; }

  /** Деньги: стартовый бюджет, потрачено в лавке, остаток. */
  #money() {
    const budget = Number(this.pick.details.money) || 0;
    const spent = this.pick.gear.reduce((sum, g) => sum + (this.#doc(g.uuid)?.system.price ?? 0) * g.qty, 0);
    const pocket = Number(this.pick.details.pocket) || 0;
    return { budget, spent, left: budget - spent, pocket, final: budget - spent + pocket };
  }

  /** Типы приключений, выбранные ведущим в мастере настройки мира (пусто — без ограничений). */
  get worldAdventures() { return enabledAdventureKeys().map(k => getAdventure(k)); }

  /**
   * Приключение персонажа. Игрок его не выбирает: это приключение мира, а если ведущий
   * разрешил несколько — то, к которому относится выбранная раса.
   */
  get adventure() {
    const list = this.worldAdventures;
    if (list.length <= 1) return list[0] ?? null;
    const arch = this.archetype;
    if (arch) {
      const tags = worldsOf(arch);
      return list.find(a => tags.includes(a.worlds[0])) ?? list.find(a => fitsAdventure(arch, a)) ?? list[0];
    }
    return list.find(a => a.key === this.actor?.system?.adventure) ?? list[0];
  }

  /**
   * Контент для мастера (без дублей): расы — из всех приключений мира,
   * карьеры, таланты и героические способности — из приключения выбранной расы.
   */
  get view() {
    const list = this.worldAdventures;
    const adv = this.adventure ?? getAdventure("all");
    const key = `${list.map(a => a.key).join("|")}>${adv.key}`;
    if (this.viewCache?.key !== key) {
      const f = docs => filterForAdventure(docs, adv);
      let archetypes = f(this.lib.archetypes);
      if (list.length > 1) {
        const all = new Map();
        for (const a of list) for (const d of filterForAdventure(this.lib.archetypes, a)) all.set(d.uuid, d);
        archetypes = [...all.values()];
      }
      this.viewCache = {
        key, archetypes, careers: f(this.lib.careers), heroics: f(this.lib.heroics),
        talents: f(this.lib.talents), skills: this.lib.skills, shop: f(this.lib.shop)
      };
    }
    return this.viewCache;
  }
  get archetype() { return this.#doc(this.pick.archetype); }
  get career() { return this.#doc(this.pick.career); }

  /** Группа (книга · папка) документа. */
  #group(doc) {
    const book = bookOf(doc.system?.source);
    const folder = doc.folder?.name ?? "";
    const parts = [book, folder].filter(Boolean);
    if (parts.length === 2 && parts[0] === parts[1]) parts.pop();
    return parts.join(" · ") || game.i18n.localize("GENESYS.Wizard.World");
  }

  /* -------------------------------------------- */
  /*  Навыки и опыт                                */
  /* -------------------------------------------- */

  /** Ключ навыка по имени (компендиум навыков или локализация). */
  #skillKey(name) {
    const n = name.trim().toLowerCase();
    const doc = this.lib.skills.find(s => s.name.toLowerCase() === n);
    if (doc?.system.key) return doc.system.key;
    const all = [...GENESYS.defaultSkills.map(s => s.key), ...Object.keys(GENESYS.extraSkills)];
    return all.find(k => game.i18n.localize(`GENESYS.Skill.${k}`).toLowerCase() === n) ?? null;
  }

  /** Ключи навыков приключения (null — без ограничений). */
  get skillKeys() {
    const adv = this.adventure;
    return adv && adv.skills !== "all" ? adventureSkillKeys(adv) : null;
  }

  /** Карьерные навыки с заменой на навыки приключения («Ближний бой» → «Ближний бой (лёгкое оружие)» и т. п.). */
  #careerSkillNames(career = this.career) {
    const keys = this.skillKeys;
    const out = [];
    for (const name of career?.system.careerSkills ?? []) {
      let result = name;
      const key = this.#skillKey(name);
      if (keys && key && !keys.includes(key)) {
        const alt = SKILL_SUBSTITUTES[key]?.find(a => keys.includes(a) && !out.includes(game.i18n.localize(`GENESYS.Skill.${a}`)));
        if (alt) result = game.i18n.localize(`GENESYS.Skill.${alt}`);
      }
      if (!out.some(n => n.toLowerCase() === result.toLowerCase())) out.push(result);
    }
    return out;
  }

  /** Действует ли правило «магия только карьерная» для этого персонажа. */
  get magicLocked() { return magicCareerOnly(this.adventure?.key); }

  /** Описание навыка по ключу. */
  static #skillDef(key) {
    return GENESYS.defaultSkills.find(s => s.key === key) ?? GENESYS.extraSkills[key] ?? null;
  }

  /**
   * Навыки будущего персонажа: набор навыков приключения + карьерные навыки
   * + уже вложенные ранги персонажа (ничего не теряется).
   */
  #skillRows() {
    const careerNames = this.#careerSkillNames();
    const careerSet = new Set(careerNames.map(n => n.toLowerCase()));
    const keys = this.skillKeys;
    const owned = this.actor.itemTypes.skill;
    const rows = new Map();
    const add = (name, characteristic, category, base) => {
      if (!rows.has(name.toLowerCase())) rows.set(name.toLowerCase(), { name, characteristic, base, category });
    };
    if (keys) {
      for (const k of keys) {
        const def = CreationWizard.#skillDef(k);
        const have = owned.find(s => s.system.key === k);
        add(have?.name ?? game.i18n.localize(`GENESYS.Skill.${k}`), def?.characteristic ?? "intellect", def?.category ?? "general", have?.system.rank ?? 0);
      }
      for (const s of owned) if (s.system.rank > 0 || !s.system.key) add(s.name, s.system.characteristic, s.system.category, s.system.rank);
    } else {
      for (const s of owned) add(s.name, s.system.characteristic, s.system.category, s.system.rank);
    }
    for (const n of careerNames) {
      if (rows.has(n.toLowerCase())) continue;
      const key = this.#skillKey(n);
      const def = this.lib.skills.find(s => s.name.toLowerCase() === n.toLowerCase())?.system ?? CreationWizard.#skillDef(key);
      add(n, def?.characteristic ?? "intellect", def?.category ?? "general", 0);
    }
    return [...rows.values()].map(r => {
      const isCareer = careerSet.has(r.name.toLowerCase());
      const free = (this.pick.careerFree.includes(r.name) ? 1 : 0) + (this.pick.startFree.includes(r.name) ? 1 : 0);
      const start = Math.min(GENESYS.xp.maxSkillCreation, r.base + free);
      const bought = this.pick.skills[r.name] ?? 0;
      const locked = r.category === "magic" && !isCareer && this.magicLocked;
      return { ...r, career: isCareer, free, start, bought, rank: start + bought, locked };
    }).sort((a, b) => (b.career - a.career) || a.name.localeCompare(b.name, game.i18n.lang));
  }

  /** Стоимость повышения навыка с ранга a до b. */
  static skillCost(a, b, career) {
    let c = 0;
    for (let r = a + 1; r <= b; r++) c += GENESYS.xp.skill(r, career);
    return c;
  }

  /** Стоимость повышения характеристики с a до b. */
  static charCost(a, b) {
    let c = 0;
    for (let v = a + 1; v <= b; v++) c += GENESYS.xp.characteristic(v);
    return c;
  }

  /** Уровень таланта с учётом ранга (каждый следующий ранг — на уровень выше). */
  #talentTier(entry) {
    const doc = this.#doc(entry.uuid);
    return Math.min(5, (doc?.system.tier ?? 1) + (entry.rank - 1));
  }

  #budget() {
    const arch = this.archetype;
    const total = arch?.system.startingXP ?? 0;
    let spent = 0;
    for (const k of CHARS) {
      const base = arch?.system.characteristics[k] ?? 2;
      spent += CreationWizard.charCost(base, base + this.pick.chars[k]);
    }
    for (const row of this.#skillRows()) spent += CreationWizard.skillCost(row.start, row.rank, row.career);
    for (const t of this.pick.talents) spent += GENESYS.xp.talent(this.#talentTier(t));
    return { total, spent, left: total - spent };
  }

  /** Число талантов по уровням (для пирамиды). */
  #tierCounts() {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const t of this.pick.talents) c[this.#talentTier(t)]++;
    return c;
  }

  /* -------------------------------------------- */
  /*  Контекст                                     */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    try { return await this.#context(); }
    catch (err) {
      console.error("genesys-rpg |", err);
      ui.notifications.error(`Genesys: ${err.message}`, { permanent: true });
      throw err;
    }
  }

  async #context() {
    await this.#load();
    const L = k => game.i18n.localize(k);
    const arch = this.archetype;
    const career = this.career;
    const budget = this.#budget();
    const ctx = {
      step: this.step, stepIndex: this.stepIndex, isFirst: this.stepIndex === 0, isLast: this.stepIndex === STEPS.length - 1,
      steps: STEPS.map((s, i) => ({ key: s, index: i, num: i + 1, label: `GENESYS.Wizard.Step.${s}`, active: i === this.stepIndex, done: this.#stepDone(s) })),
      budget, archetypeName: arch?.name, careerName: career?.name,
      adventureName: this.adventure?.label, adventureImg: this.adventure ? adventureImg(this.adventure) : null
    };


    const cards = (docs, kind) => {
      const groups = [...new Set(docs.map(d => this.#group(d)))].sort();
      const g = this.filter[kind];
      const q = this.filter[`${kind}Search`].toLowerCase();
      return {
        groups: groups.map(name => ({ name, active: name === g })),
        allActive: !g,
        search: this.filter[`${kind}Search`],
        cards: docs.filter(d => (!g || this.#group(d) === g) && (!q || d.name.toLowerCase().includes(q)))
          .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang))
          .map(d => ({ uuid: d.uuid, name: d.name, img: d.img, group: this.#group(d), selected: this.pick[kind] === d.uuid,
            line: kind === "archetype"
              ? `${CHARS.map(k => `${L(GENESYS.characteristics[k].abbr)} ${d.system.characteristics[k]}`).join(" · ")} · ${d.system.startingXP} ${L("GENESYS.Sheet.XPShort")}`
              : (d.system.careerSkills ?? []).slice(0, 4).join(", ") + ((d.system.careerSkills?.length ?? 0) > 4 ? "…" : "") }))
      };
    };

    if (this.step === "archetype") {
      ctx.list = cards(this.view.archetypes, "archetype");
      if (arch) ctx.detail = {
        name: arch.name, img: arch.img, group: this.#group(arch),
        chars: CHARS.map(k => ({ label: GENESYS.characteristics[k].label, value: arch.system.characteristics[k] })),
        wounds: arch.system.wounds, strain: arch.system.strain, xp: arch.system.startingXP,
        startingSkills: arch.system.startingSkills,
        abilities: arch.system.abilities.map(a => ({ name: a.name, description: a.description })),
        description: arch.system.description
      };
    }
    if (this.step === "career") {
      ctx.list = cards(this.view.careers, "career");
      if (career) ctx.detail = {
        name: career.name, img: career.img, group: this.#group(career),
        careerSkills: this.#careerSkillNames(career), description: career.system.description,
        gear: GENESYS.creation?.careerGear?.[career.name] ?? ""
      };
    }
    if (this.step === "skills") {
      const rows = this.#skillRows();
      ctx.careerSkills = rows.filter(r => r.career).map(r => ({ ...r, checked: this.pick.careerFree.includes(r.name) }));
      ctx.careerFreeCount = this.pick.careerFree.length;
      ctx.startingText = arch?.system.startingSkills ?? "";
      ctx.allSkills = rows.map(r => ({ ...r, checked: this.pick.startFree.includes(r.name) }));
    }
    if (this.step === "xp") {
      ctx.chars = CHARS.map(k => {
        const base = arch?.system.characteristics[k] ?? 2;
        const value = base + this.pick.chars[k];
        return { key: k, label: GENESYS.characteristics[k].label, base, value, next: value < GENESYS.xp.maxCharacteristicCreation ? GENESYS.xp.characteristic(value + 1) : null };
      });
      ctx.skillRows = this.#skillRows().map(r => ({ ...r, abbr: GENESYS.characteristics[r.characteristic]?.abbr,
        ranks: [r.rank >= 1, r.rank >= 2],
        next: r.rank < GENESYS.xp.maxSkillCreation ? GENESYS.xp.skill(r.rank + 1, r.career) : null }));
    }
    if (this.step === "talents") {
      const counts = this.#tierCounts();
      const q = this.filter.talentSearch.toLowerCase();
      const tierF = this.filter.talentTier;
      ctx.tierFilter = [0, 1, 2, 3].map(t => ({ t, active: t === tierF, label: t ? `${L("GENESYS.Talent.Tier")} ${t}` : L("GENESYS.Wizard.All") }));
      ctx.talentSearch = this.filter.talentSearch;
      ctx.chosenTalents = this.pick.talents.map((t, i) => {
        const d = this.#doc(t.uuid);
        return { index: i, name: d?.name, img: d?.img, rank: t.rank, tier: this.#talentTier(t), cost: GENESYS.xp.talent(this.#talentTier(t)) };
      });
      ctx.counts = [1, 2, 3, 4, 5].map(t => ({ t, n: counts[t] }));
      ctx.talentCards = this.view.talents.filter(d => d.system.tier <= 3
          && (!tierF || d.system.tier === tierF) && (!q || d.name.toLowerCase().includes(q)))
        .sort((a, b) => a.system.tier - b.system.tier || a.name.localeCompare(b.name, game.i18n.lang))
        .slice(0, 160)
        .map(d => ({ uuid: d.uuid, name: d.name, img: d.img, tier: d.system.tier, cost: GENESYS.xp.talent(d.system.tier),
          ranked: d.system.ranked, activation: GENESYS.activations[d.system.activation],
          owned: this.pick.talents.some(t => t.uuid === d.uuid),
          description: d.system.description }));
    }
    if (this.step === "motivations") {
      const tables = GENESYS.creation?.motivations ?? {};
      ctx.motivations = MOTIVATIONS.map(k => ({
        key: k, label: GENESYS.motivations[k], value: this.pick.motivations[k],
        options: (tables[k] ?? []).map((o, i) => ({ index: i, roll: o.roll, name: o.name, text: o.text, selected: o.name === this.pick.motivations[k].name }))
      }));
      ctx.hasTables = Object.keys(tables).length > 0;
    }
    if (this.step === "heroic") {
      ctx.heroics = this.view.heroics.map(d => ({ uuid: d.uuid, name: d.name, img: d.img, description: d.system.description, selected: this.pick.heroic === d.uuid }));
    }
    if (this.step === "gear") {
      const money = this.#money();
      const q = this.filter.gearSearch.toLowerCase();
      const type = this.filter.gearType;
      ctx.money = money;
      ctx.gearTypes = GEAR_TYPES.map(t => ({ key: t, label: `TYPES.Item.${t}`, active: t === type }));
      ctx.gearSearch = this.filter.gearSearch;
      ctx.shop = this.view.shop.filter(d => d.type === type && (!q || d.name.toLowerCase().includes(q)))
        .sort((a, b) => a.system.price - b.system.price || a.name.localeCompare(b.name, game.i18n.lang))
        .slice(0, 150)
        .map(d => {
          const sys = d.system;
          let line = "";
          if (d.type === "weapon") line = `${L("GENESYS.DamageShort")} ${sys.brawnDamage ? "+" : ""}${sys.damage} · ${L("GENESYS.CritShort")} ${sys.crit} · ${L(GENESYS.ranges[sys.range]?.label ?? "")}`;
          else if (d.type === "armor") line = `${L("GENESYS.Soak")} +${sys.soak ?? 0} · ${L("GENESYS.Defense")} ${sys.defense ?? 0}`;
          return { uuid: d.uuid, name: d.name, img: d.img, price: sys.price, rarity: sys.rarity, enc: sys.encumbrance, line,
            affordable: sys.price <= money.left, inCart: this.pick.gear.some(g => g.uuid === d.uuid) };
        });
      ctx.cart = this.pick.gear.map((g, i) => {
        const d = this.#doc(g.uuid);
        return { index: i, name: d?.name, img: d?.img, qty: g.qty, price: (d?.system.price ?? 0) * g.qty };
      });
      ctx.careerGear = GENESYS.creation?.careerGear?.[career?.name] ?? "";
    }
    if (this.step === "details") {
      ctx.money = this.#money();
      ctx.details = this.pick.details;
      ctx.moneyText = GENESYS.creation?.rules?.moneyText ?? "";
      ctx.careerGear = GENESYS.creation?.careerGear?.[career?.name] ?? "";
    }
    if (this.step === "summary") {
      ctx.summary = {
        adventure: this.adventure?.label, archetype: arch?.name, career: career?.name, heroic: this.#doc(this.pick.heroic)?.name,
        careerFree: this.pick.careerFree.join(", "), startFree: this.pick.startFree.join(", "),
        chars: CHARS.map(k => ({ label: GENESYS.characteristics[k].label, value: (arch?.system.characteristics[k] ?? 2) + this.pick.chars[k] })),
        skills: this.#skillRows().filter(r => r.rank > 0).map(r => `${r.name} ${r.rank}`).join(", "),
        talents: this.pick.talents.map(t => `${this.#doc(t.uuid)?.name}${t.rank > 1 ? ` ${t.rank}` : ""}`).join(", "),
        motivations: MOTIVATIONS.map(k => ({ label: GENESYS.motivations[k], name: this.pick.motivations[k].name })).filter(m => m.name),
        name: this.pick.details.name, money: this.#money().final,
        gear: this.pick.gear.map(g => `${this.#doc(g.uuid)?.name}${g.qty > 1 ? ` ×${g.qty}` : ""}`).join(", ")
      };
      ctx.ready = !!arch && !!career && budget.left >= 0;
    }
    return ctx;
  }

  #stepDone(step) {
    if (step === "archetype") return !!this.pick.archetype;
    if (step === "career") return !!this.pick.career;
    if (step === "skills") return this.pick.careerFree.length === 4;
    if (step === "motivations") return MOTIVATIONS.some(k => this.pick.motivations[k].name);
    if (step === "heroic") return !!this.pick.heroic;
    return false;
  }

  /* -------------------------------------------- */
  /*  Действия                                     */
  /* -------------------------------------------- */

  static #onChange(event, form, formData) {
    const d = foundry.utils.expandObject(formData.object);
    if (d.search) for (const [k, v] of Object.entries(d.search)) this.filter[`${k}Search`] = v ?? "";
    if (d.details) Object.assign(this.pick.details, d.details, {
      money: Number(d.details.money ?? this.pick.details.money) || 0,
      pocket: Number(d.details.pocket ?? this.pick.details.pocket) || 0
    });
    if (d.mot) for (const k of MOTIVATIONS) if (d.mot[k]) Object.assign(this.pick.motivations[k], d.mot[k]);
    // Поиск — перерисовать списки, сохранив фокус ввода.
    if (d.search && event?.target?.name?.startsWith("search.")) {
      const name = event.target.name;
      this.render().then(() => {
        const el = this.element.querySelector(`[name="${name}"]`);
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      });
    }
  }

  static #onGoto(event, target) { this.stepIndex = Number(target.dataset.index); this.render(); }
  static #onNext() {
    if (this.step === "archetype" && !this.pick.archetype) return ui.notifications.warn("GENESYS.Wizard.PickArchetype", { localize: true });
    if (this.step === "career" && !this.pick.career) return ui.notifications.warn("GENESYS.Wizard.PickCareer", { localize: true });
    this.stepIndex = Math.min(STEPS.length - 1, this.stepIndex + 1);
    if (this.step === "heroic" && !this.view.heroics.length) this.stepIndex++;
    this.render();
  }
  static #onBack() {
    this.stepIndex = Math.max(0, this.stepIndex - 1);
    if (this.step === "heroic" && !this.view.heroics.length) this.stepIndex--;
    this.render();
  }

  static #onPick(event, target) {
    const kind = target.dataset.kind;
    const uuid = target.dataset.uuid;
    this.pick[kind] = this.pick[kind] === uuid && kind === "heroic" ? null : uuid;
    if (kind === "career") { this.pick.careerFree = []; this.pick.skills = {}; }
    if (kind === "archetype") {
      this.pick.chars = Object.fromEntries(CHARS.map(k => [k, 0]));
      // Раса из другого приключения мира — карьера, таланты и героическая способность могут больше не подходить.
      const v = this.view;
      if (this.pick.career && !v.careers.some(d => d.uuid === this.pick.career)) Object.assign(this.pick, { career: null, careerFree: [], skills: {} });
      this.pick.talents = this.pick.talents.filter(t => v.talents.some(d => d.uuid === t.uuid));
      if (this.pick.heroic && !v.heroics.some(d => d.uuid === this.pick.heroic)) this.pick.heroic = null;
      this.pick.startFree = this.#defaultStartFree();
    }
    this.render();
  }

  static #onGroup(event, target) {
    this.filter[target.dataset.kind] = target.dataset.group ?? "";
    this.render();
  }

  static #onToggle(event, target) {
    const list = this.pick[target.dataset.list];
    const name = target.dataset.name;
    const max = target.dataset.list === "careerFree" ? 4 : 3;
    const i = list.indexOf(name);
    const row = this.#skillRows().find(r => r.name === name);
    if (i < 0 && row?.locked) return ui.notifications.warn(game.i18n.format("GENESYS.Warn.MagicCareerOnly", { name }));
    if (i >= 0) list.splice(i, 1);
    else if (list.length >= max) return ui.notifications.warn(game.i18n.format("GENESYS.Wizard.MaxSkills", { max }));
    else list.push(name);
    this.render();
  }

  static #onChar(event, target) {
    const k = target.dataset.key;
    const delta = Number(target.dataset.delta);
    const base = this.archetype?.system.characteristics[k] ?? 2;
    const next = this.pick.chars[k] + delta;
    if (next < 0 || base + next > GENESYS.xp.maxCharacteristicCreation) return;
    this.pick.chars[k] = next;
    if (this.#budget().left < 0) { this.pick.chars[k] -= delta; return ui.notifications.warn("GENESYS.Wizard.NoXP", { localize: true }); }
    this.render();
  }

  static #onSkill(event, target) {
    const name = target.dataset.name;
    const delta = Number(target.dataset.delta);
    const row = this.#skillRows().find(r => r.name === name);
    if (!row) return;
    if (row.locked && Number(target.dataset.delta) > 0) return ui.notifications.warn(game.i18n.format("GENESYS.Warn.MagicCareerOnly", { name }));
    const next = (this.pick.skills[name] ?? 0) + delta;
    if (next < 0 || row.start + next > GENESYS.xp.maxSkillCreation) return;
    this.pick.skills[name] = next;
    if (this.#budget().left < 0) { this.pick.skills[name] -= delta; return ui.notifications.warn("GENESYS.Wizard.NoXP", { localize: true }); }
    this.render();
  }

  static #onTalent(event, target) {
    const remove = target.dataset.index !== undefined;
    if (remove) { this.pick.talents.splice(Number(target.dataset.index), 1); return this.render(); }
    const doc = this.#doc(target.dataset.uuid);
    if (!doc) return;
    const existing = this.pick.talents.filter(t => t.uuid === doc.uuid);
    if (existing.length && !doc.system.ranked) return ui.notifications.warn(game.i18n.format("GENESYS.Warn.TalentOwned", { name: doc.name }));
    const entry = { uuid: doc.uuid, rank: existing.length + 1 };
    const tier = this.#talentTier(entry);
    const counts = this.#tierCounts();
    if (tier > 1 && !(counts[tier - 1] > counts[tier])) {
      return ui.notifications.warn(game.i18n.format("GENESYS.Warn.TalentPyramid", { tier, lower: tier - 1 }));
    }
    this.pick.talents.push(entry);
    if (this.#budget().left < 0) { this.pick.talents.pop(); return ui.notifications.warn("GENESYS.Wizard.NoXP", { localize: true }); }
    this.render();
  }

  /** Стартовые навыки расы: заранее отметить навыки, названные в её описании. */
  #defaultStartFree() {
    const text = (this.archetype?.system.startingSkills ?? "").toLowerCase();
    return this.#skillRows().filter(r => {
      const stem = r.name.toLowerCase().slice(0, Math.max(5, r.name.length - 2));
      return text.includes(stem) && !r.locked;
    }).map(r => r.name).slice(0, 3);
  }

  /**
   * Случайный персонаж: раса, карьера, бесплатные ранги, разумная трата опыта
   * (лучшая характеристика, карьерные навыки, таланты 1-го уровня), мотивации, героическая способность,
   * оружие и броня по карману. Всё можно поправить на любом шаге перед созданием.
   */
  static async #onRandom() {
    await this.#load();
    const rnd = list => list[Math.floor(Math.random() * list.length)];
    const shuffle = list => list.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    if (!this.view.archetypes.length) return;
    Object.assign(this.pick, { archetype: rnd(this.view.archetypes).uuid, career: null, heroic: null, careerFree: [], skills: {}, talents: [], gear: [] });
    this.pick.chars = Object.fromEntries(CHARS.map(k => [k, 0]));
    const careers = this.view.careers;
    if (careers.length) this.pick.career = rnd(careers).uuid;
    this.pick.startFree = this.#defaultStartFree();
    this.pick.careerFree = shuffle(this.#skillRows().filter(r => r.career && !r.locked).map(r => r.name)).slice(0, 4);

    // Опыт: +1 к одной из двух лучших характеристик, если останется на навыки.
    const arch = this.archetype;
    const best = [...CHARS].sort((a, b) => (arch.system.characteristics[b] ?? 0) - (arch.system.characteristics[a] ?? 0)).slice(0, 2);
    const k = rnd(best);
    if ((arch.system.characteristics[k] ?? 2) < GENESYS.xp.maxCharacteristicCreation) {
      this.pick.chars[k] = 1;
      if (this.#budget().left < 25) this.pick.chars[k] = 0;
    }
    // Карьерные навыки до ранга 2, пока хватает (оставляя на таланты).
    for (const row of shuffle(this.#skillRows().filter(r => r.career && !r.locked))) {
      while (row.start + (this.pick.skills[row.name] ?? 0) < GENESYS.xp.maxSkillCreation) {
        this.pick.skills[row.name] = (this.pick.skills[row.name] ?? 0) + 1;
        if (this.#budget().left < 10) { this.pick.skills[row.name]--; break; }
      }
    }
    // Таланты 1-го уровня на остаток.
    // Магические таланты — только тем, у кого есть магический карьерный навык.
    const caster = this.#skillRows().some(r => r.career && r.category === "magic");
    const magical = d => /магическ|заклинан|колдовств|чародей/i.test(`${d.name} ${d.system.description ?? ""}`);
    for (const t of shuffle(this.view.talents.filter(d => d.system.tier === 1 && (caster || !magical(d))))) {
      if (this.#budget().left < GENESYS.xp.talent(1) || this.pick.talents.length >= 3) break;
      this.pick.talents.push({ uuid: t.uuid, rank: 1 });
    }
    // Мотивации и героическая способность.
    for (const key of MOTIVATIONS) {
      const table = GENESYS.creation?.motivations?.[key] ?? [];
      if (table.length) { const o = rnd(table); this.pick.motivations[key] = { name: o.name, text: o.text }; }
    }
    if (this.view.heroics.length) this.pick.heroic = rnd(this.view.heroics).uuid;
    // Снаряжение: оружие карьерного боевого навыка и броня по карману.
    if (this.pick.details.money === null) this.pick.details.money = GENESYS.creation?.rules?.startingMoney ?? 500;
    const combat = new Set(this.#skillRows().filter(r => r.career && r.category === "combat").map(r => this.#skillKey(r.name)));
    const weapons = this.view.shop.filter(d => d.type === "weapon" && combat.has(d.system.skill) && d.system.price <= this.#money().left * 0.6);
    if (weapons.length) this.pick.gear.push({ uuid: rnd(weapons).uuid, qty: 1 });
    const armor = this.view.shop.filter(d => d.type === "armor" && d.system.price <= this.#money().left);
    if (armor.length) this.pick.gear.push({ uuid: rnd(armor).uuid, qty: 1 });

    this.stepIndex = STEPS.indexOf("summary");
    ui.notifications.info("GENESYS.Wizard.RandomDone", { localize: true });
    this.render();
  }

  static #onGearType(event, target) { this.filter.gearType = target.dataset.type; this.render(); }

  /** Купить предмет в лавке (повторная покупка — +1 к количеству). */
  static #onBuy(event, target) {
    const doc = this.#doc(target.dataset.uuid);
    if (!doc) return;
    if (doc.system.price > this.#money().left) return ui.notifications.warn("GENESYS.Wizard.NoMoney", { localize: true });
    const g = this.pick.gear.find(x => x.uuid === doc.uuid);
    if (g) g.qty++; else this.pick.gear.push({ uuid: doc.uuid, qty: 1 });
    this.render();
  }

  static #onCartQty(event, target) {
    const g = this.pick.gear[Number(target.dataset.index)];
    if (!g) return;
    const delta = Number(target.dataset.delta);
    if (delta > 0 && (this.#doc(g.uuid)?.system.price ?? 0) > this.#money().left) return ui.notifications.warn("GENESYS.Wizard.NoMoney", { localize: true });
    g.qty += delta;
    if (g.qty <= 0) this.pick.gear.splice(Number(target.dataset.index), 1);
    this.render();
  }

  /** Карманные деньги: d100 после стартовой закупки (Core Rulebook, с. 51). */
  static async #onRollPocket() {
    const roll = await new Roll(GENESYS.creation?.rules?.moneyRoll ?? "1d100").evaluate();
    this.pick.details.pocket = roll.total;
    this.render();
  }

  static #onTier(event, target) { this.filter.talentTier = Number(target.dataset.tier); this.render(); }

  static #onPickMotivation(event, target) {
    const k = target.dataset.key;
    const o = GENESYS.creation?.motivations?.[k]?.[Number(target.dataset.index)];
    if (o) this.pick.motivations[k] = { name: o.name, text: o.text };
    this.render();
  }

  static async #onRollMotivation(event, target) {
    const keys = target.dataset.key ? [target.dataset.key] : MOTIVATIONS;
    for (const k of keys) {
      const table = GENESYS.creation?.motivations?.[k] ?? [];
      if (!table.length) continue;
      const o = table[Math.floor(Math.random() * table.length)];
      this.pick.motivations[k] = { name: o.name, text: o.text };
    }
    this.render();
  }

  /* -------------------------------------------- */
  /*  Применение                                   */
  /* -------------------------------------------- */

  /** Данные нового навыка по имени (из компендиума или по ключу). */
  #skillData(name) {
    const doc = this.lib.skills.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (doc) return doc.toObject();
    const key = this.#skillKey(name);
    const def = CreationWizard.#skillDef(key);
    return {
      name, type: "skill", img: GENESYS.icons?.skills?.[key] ?? GENESYS.icons?.defaults?.skill,
      system: { key: key ?? "", characteristic: def?.characteristic ?? "intellect", category: def?.category ?? "general", rank: 0, career: false }
    };
  }

  async #ensureSkill(name) {
    let skill = this.actor.getSkill(name);
    if (skill) return skill;
    [skill] = await this.actor.createEmbeddedDocuments("Item", [this.#skillData(name)]);
    return skill;
  }

  /** Создать недостающие навыки одним запросом. */
  async #ensureSkills(names) {
    const missing = names.filter(n => !this.actor.getSkill(n));
    if (missing.length) await this.actor.createEmbeddedDocuments("Item", missing.map(n => this.#skillData(n)));
  }

  static async #onFinish() {
    const actor = this.actor;
    const arch = this.archetype;
    const career = this.career;
    if (!arch || !career) return ui.notifications.warn("GENESYS.Wizard.PickBoth", { localize: true });
    if (this.#budget().left < 0) return ui.notifications.warn("GENESYS.Wizard.NoXP", { localize: true });
    const L = (k, d) => game.i18n.format(k, d ?? {});
    try {
      // Лишние навыки (не из набора приключения, без рангов) убираются с листа.
      const rows = this.#skillRows();
      const keep = new Set(rows.map(r => r.name.toLowerCase()));
      if (this.skillKeys) {
        const extra = actor.itemTypes.skill.filter(s => s.system.rank === 0 && !keep.has(s.name.toLowerCase())).map(s => s.id);
        if (extra.length) await actor.deleteEmbeddedDocuments("Item", extra);
      }

      // Раса/архетип (характеристики, пороги, стартовый опыт, способности) и карьера
      // (карьерные навыки — с заменой на навыки приключения).
      await actor.applyArchetype(arch);
      const careerData = career.toObject();
      careerData.system.careerSkills = this.#careerSkillNames(career);
      await this.#ensureSkills(rows.map(r => r.name));
      await actor.applyCareer(careerData);

      // Навыки: бесплатные ранги и покупка за опыт.
      const log = foundry.utils.deepClone(actor.system.experience.log);
      const entry = (amount, label) => ({ id: foundry.utils.randomID(), type: "spend", kind: "", amount, label, timestamp: Date.now() });
      const skillUpdates = [];
      for (const row of rows) {
        if (row.rank === row.base) continue;
        const skill = await this.#ensureSkill(row.name);
        skillUpdates.push({ _id: skill.id, "system.rank": row.rank });
        for (let r = row.start + 1; r <= row.rank; r++) log.push(entry(GENESYS.xp.skill(r, row.career), L("GENESYS.XP.SkillRank", { name: row.name, rank: r })));
      }
      if (skillUpdates.length) await actor.updateEmbeddedDocuments("Item", skillUpdates);

      // Характеристики за опыт.
      const update = {};
      for (const k of CHARS) {
        const base = arch.system.characteristics[k];
        const value = base + this.pick.chars[k];
        update[`system.characteristics.${k}.value`] = value;
        for (let v = base + 1; v <= value; v++) log.push(entry(GENESYS.xp.characteristic(v), L("GENESYS.XP.Characteristic", { name: game.i18n.localize(GENESYS.characteristics[k].label), value: v })));
      }

      // Таланты за опыт.
      const talentData = new Map();
      for (const t of this.pick.talents) {
        const doc = this.#doc(t.uuid);
        const tier = this.#talentTier(t);
        log.push(entry(GENESYS.xp.talent(tier), L("GENESYS.XP.Talent", { name: doc.name, rank: t.rank, tier })));
        const data = talentData.get(t.uuid) ?? doc.toObject();
        data.system.rank = t.rank;
        talentData.set(t.uuid, data);
      }
      const extra = [...talentData.values()];
      const heroic = this.#doc(this.pick.heroic);
      if (heroic) extra.push(heroic.toObject());
      for (const g of this.pick.gear) {
        const doc = this.#doc(g.uuid);
        if (!doc) continue;
        const data = doc.toObject();
        if (data.system && "quantity" in data.system) data.system.quantity = g.qty;
        extra.push(data);
      }
      if (extra.length) await actor.createEmbeddedDocuments("Item", extra);

      // Мотивации, описание, деньги.
      for (const k of MOTIVATIONS) {
        update[`system.motivations.${k}.name`] = this.pick.motivations[k].name;
        update[`system.motivations.${k}.description`] = this.pick.motivations[k].text;
      }
      const det = this.pick.details;
      for (const k of ["gender", "age", "height", "build", "hair", "eyes", "features"]) update[`system.details.${k}`] = det[k] ?? "";
      update["system.money"] = Math.max(0, this.#money().final);
      if (det.name) update.name = det.name;
      update["system.experience.log"] = log;
      update["system.creation"] = true;
      update["system.adventure"] = this.adventure?.key ?? "";
      await actor.update(update);

      ui.notifications.info("GENESYS.Wizard.Done", { localize: true });
      this.close();
      actor.sheet.render({ force: true });
    } catch (err) {
      console.error("genesys-rpg |", err);
      ui.notifications.error(`Genesys: ${err.message}`, { permanent: true });
    }
  }
}
