import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const H = require("handlebars");
const R = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(/\/$/, "");
const SRC = path.join(R, "packs-src");

// ---- Foundry-like environment ----
const lang = JSON.parse(fs.readFileSync(path.join(R, "lang/ru.json"), "utf8"));
const loc = k => k.split(".").reduce((o, p) => o?.[p], lang) ?? k;
// Строго, как в Foundry v14: перевод не строки — ошибка (так ловятся подписи-объекты в шаблонах).
const strictLoc = k => { if (typeof k !== "string") throw new Error(`localize: не строка (${typeof k})`); return loc(k); };
H.registerHelper("localize", k => strictLoc(k?.toString && k instanceof H.SafeString ? k.toString() : k));
H.registerHelper("checked", v => v ? "checked" : "");
H.registerHelper("eq", (a, b) => a === b);
H.registerHelper("or", (...a) => a.slice(0, -1).some(Boolean));
H.registerHelper("concat", (...a) => a.slice(0, -1).join(""));
H.registerHelper("add", (a, b) => a + b);
H.registerHelper("times", function (n, o) { let s = ""; for (let i = 0; i < n; i++) s += o.fn(this); return s; });
H.registerHelper("genesysDie", k => new H.SafeString(`<span class="${k}"></span>`));
H.registerHelper("gt", (a, b) => a > b);
H.registerHelper("lt", (a, b) => a < b);
H.registerHelper("selectOptions", (choices, opts) => new H.SafeString(Object.entries(choices).map(([k, v]) => `<option value="${k}">${loc(v)}</option>`).join("")));
const notes = [];
class ApplicationV2 {
  constructor(options = {}) { this.options = options; this._renders = 0; }
  async render() {
    const ctx = await this._prepareContext({});
    const part = Object.values(this.constructor.PARTS)[0].template.replace("systems/genesys-rpg/", "");
    const src = fs.readFileSync(path.join(R, part), "utf8");
    this.html = H.compile(src, { strict: false })(ctx);
    this._renders++;
    return this;
  }
  close() { this.closed = true; }
}
// Встроенные свойства окна Foundry — только для чтения (как в настоящем ApplicationV2).
for (const name of ["children", "classList", "document", "element", "form", "hasFrame", "id", "isEditable", "isVisible", "minimized", "parent", "parts", "rendered", "state", "title", "window"]) {
  if (!Object.getOwnPropertyDescriptor(ApplicationV2.prototype, name)) Object.defineProperty(ApplicationV2.prototype, name, { get() { return this[`_${name}`]; }, configurable: true });
}

const HandlebarsApplicationMixin = B => B;
globalThis.foundry = {
  dice: { terms: { DiceTerm: class {} } },
  applications: { api: { ApplicationV2, HandlebarsApplicationMixin, DialogV2: {} } },
  utils: { expandObject: o => { const r = {}; for (const [k, v] of Object.entries(o)) { const p = k.split("."); let t = r; p.slice(0, -1).forEach(x => t = t[x] ??= {}); t[p.at(-1)] = v; } return r; }, escapeHTML: s => s, deepClone: o => structuredClone(o) }
};
globalThis.ui = { notifications: { info: m => notes.push(["info", m]), warn: m => notes.push(["warn", m]), error: m => notes.push(["error", m]) } };
const settings = { "genesys-rpg.adventures": [], "genesys-rpg.skillPreset": "all", "genesys-rpg.worldSetupDone": false, "genesys-rpg.storyPoints": { player: 0, gm: 0 } };

// Compendia from packs-src (теги миров — как при сборке)
const { worldsFor } = await import(`${R}/tools/world-rules.mjs`);
const { pickIcon } = await import(`${R}/tools/icon-rules.mjs`);
const { creatureTypeFor, lootTagsFor } = await import(`${R}/module/creatures.mjs`);
const imgOf = d => { try { return `systems/genesys-rpg/assets/icons/gi/${d.type}/${pickIcon(d)}.svg`; } catch { return "x"; } };
let docSeq = 0;
const mkDoc = (d, packName) => {
  d.type ??= packName === "vehicles" ? "vehicle" : "adversary";
  d.system = { ...(d.system ?? {}), worlds: worldsFor(d, packName) };
  if (d.type === "adversary") { d.system.creatureType ||= creatureTypeFor(d); if (!d.system.loot?.length) d.system.loot = lootTagsFor(d, d.system.creatureType); }
  const uuid = `Compendium.genesys-rpg.${packName}.${d.name}#${++docSeq}`;
  return { ...d, _id: uuid, id: uuid, uuid, folder: d.folder ? { name: d.folder } : null, img: imgOf(d), system: d.system, toObject() { return structuredClone(d); } };
};
const packs = new Map();
for (const dir of fs.readdirSync(SRC, { withFileTypes: true }).filter(e => e.isDirectory())) {
  const docs = fs.readdirSync(path.join(SRC, dir.name)).filter(f => f.endsWith(".json")).flatMap(f => JSON.parse(fs.readFileSync(path.join(SRC, dir.name, f))));
  const md = docs.map(d => mkDoc(d, dir.name));
  // archetype abilities linked at build time; emulate
  if (dir.name === "archetypes") for (const a of md) a.system.abilities ??= [];
  packs.set(`genesys-rpg.${dir.name}`, { metadata: { label: dir.name }, documentName: dir.name === "adversaries" || dir.name === "vehicles" ? "Actor" : "Item", index: { size: md.length }, getDocuments: async () => md,
    getIndex: async () => md.map(d => ({ _id: d._id, name: d.name, type: d.type, system: { worlds: d.system.worlds, source: d.system.source } })) });
}
const created = [];
globalThis.game = {
  i18n: { localize: strictLoc, format: (k, d) => loc(k) + JSON.stringify(d ?? {}), lang: "ru" },
  settings: { get: (n, k) => { if (!(`${n}.${k}` in settings)) throw new Error(`not registered ${n}.${k}`); return settings[`${n}.${k}`]; }, set: async (n, k, v) => { settings[`${n}.${k}`] = v; } },
  packs: { get: k => packs.get(k) },
  items: { filter: () => [], fromCompendium: d => ({ ...d.toObject() }) },
  actors: { filter: () => [], fromCompendium: d => ({ ...d.toObject() }) },
  folders: { find: () => null },
  tables: { getName: () => null },
  journal: { getName: () => null },
  macros: { find: () => null },
  users: { filter: () => [{ active: true }, { active: true }] },
  user: { isGM: true, hotbar: {}, assignHotbarMacro: async () => {} },
  system: { id: "genesys-rpg" }
};
// Настоящие помощники шаблонов системы (genesysDie, times, …) поверх упрощённых.
globalThis.Handlebars = H;
(await import(`${R}/module/helpers/handlebars.mjs`)).registerHandlebarsHelpers();
// …но localize в тестах оставляем строгим, чтобы ловить подписи-не-строки в шаблонах.
H.registerHelper("localize", k => strictLoc(k instanceof H.SafeString ? k.toString() : k));
let fid = 0;
globalThis.Folder = { implementation: { create: async d => ({ id: `f${++fid}`, ...d }) } };
globalThis.Item = { implementation: { createDocuments: async d => created.push(...d) } };
globalThis.Actor = { implementation: { createDocuments: async d => created.push(...d) } };
globalThis.RollTable = { implementation: { create: async d => { assert.ok(d.results.length > 0); assert.ok(d.results.every(r => r.weight >= 1)); created.push(d); } } };
globalThis.JournalEntry = { implementation: { create: async d => { assert.ok(d.pages.length >= 5); created.push(d); } } };
globalThis.Macro = { implementation: { create: async d => ({ id: "m", ...d }) } };
globalThis.ChatMessage = { implementation: { create: async () => {} } };
globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2 } };

const { GENESYS } = await import(`${R}/module/config.mjs`);
GENESYS.spending = JSON.parse(fs.readFileSync(path.join(R, "module/data/spending.json")));

// ---- World setup ----
const { WorldSetup } = await import(`${R}/module/apps/world-setup.mjs`);
const ws = new WorldSetup();
await ws.render();
assert.ok(ws.html.includes('data-key="terrinoth"'), "adventure cards rendered");
assert.ok(ws.html.includes('data-key="zombie"'), "zombie adventure card");
assert.ok(ws.html.includes('name="packs.talents"'), "pack checkboxes rendered");
const WA = WorldSetup.DEFAULT_OPTIONS.actions;
// без выбора — предупреждение
await WA.install.call(ws);
assert.ok(notes.some(n => n[1] === "GENESYS.Setup.PickAdventure"), "warns without adventure");
// choose Terrinoth, click install
WorldSetup.DEFAULT_OPTIONS.form.handler.call(ws, null, null, { object: { "sources.core": true, "sources.epg": true, "sources.rot": true, "sources.zgm": true, "packs.talents": true, "packs.archetypes": true, "packs.careers": true, "packs.weapons": true, "packs.adversaries": true, tables: true, journal: true, macros: true, storyPoints: true, replace: true } });
WA.adventure.call(ws, null, { dataset: { key: "terrinoth" } });
await ws.render();
if (process.env.DUMP) fs.writeFileSync(path.join(process.env.DUMP, "ws.html"), ws.html);
await WA.install.call(ws);
console.log("setup log:", ws.log);
assert.ok(!ws.log.some(l => l.startsWith("⚠")), "no errors in install log");
const talents = created.filter(d => d.type === "talent");
assert.ok(talents.length > 0 && talents.length < 155, `terrinoth talents filtered: ${talents.length}`);
assert.ok(!talents.some(t => t.name === "Закалённый"), "non-RoT core talent filtered out");
assert.equal(settings["genesys-rpg.skillPreset"], "terrinoth");
assert.deepEqual(settings["genesys-rpg.adventures"], ["terrinoth"]);
const careersImported = created.filter(d => d.type === "career").map(d => d.name);
assert.equal(careersImported.length, 9, `only Terrinoth careers: ${careersImported}`);
const weaponNames = created.filter(d => d.type === "weapon").map(d => d.name);
assert.equal(new Set(weaponNames).size, weaponNames.length, "no duplicate weapons");
assert.ok(!weaponNames.includes("Лазерный пистолет"), "no sci-fi guns in Terrinoth");
const archImported = created.filter(d => d.type === "archetype").map(d => d.name);
assert.equal(archImported.length, 14, "14 Terrinoth races");
assert.equal(settings["genesys-rpg.worldSetupDone"], true);

// ---- Creation wizard ----
GENESYS.creation = JSON.parse(fs.readFileSync(path.join(R, "module/data/creation.json")));
const { CreationWizard, startingRule } = await import(`${R}/module/apps/creation-wizard.mjs`);
{
  const r1 = startingRule("По 1 рангу в двух разных некарьерных навыках (при создании персонажа нельзя поднять выше 2)");
  assert.equal(r1.max, 2); assert.equal(r1.nonCareer, true);
  assert.equal(startingRule("1 ранг в Атлетике, Координации или Стойкости").max, 1);
  assert.equal(startingRule("1 ранг в Обаянии и 1 ранг в Стойкости").max, 2);
  assert.equal(startingRule("нет").max, 0);
  assert.equal(startingRule("После выбора карьеры — по 1 рангу в шести из восьми карьерных навыков").careerMax, 6);
  assert.deepEqual(startingRule("2 ранга в Выдержке и 1 ранг в боевом навыке на выбор").double, ["выдерж"]);
}
const sk = (name, characteristic, category, key) => ({ name, type: "skill", system: { key, characteristic, category, rank: 0 }, id: name });
const updates = []; const deleted = []; let createdItems = []; let archetypeApplied = null; let careerApplied = null;
const actor = {
  name: "Тест", itemTypes: { skill: [sk("Атлетика", "brawn", "general", "athletics"), sk("Хладнокровие", "presence", "general", "cool"), sk("Внимание", "cunning", "general", "perception"), sk("Компьютеры", "intellect", "general", "computers"), sk("Пилотирование", "agility", "general", "piloting")] },
  system: { experience: { log: [] } },
  async deleteEmbeddedDocuments(t, ids) { deleted.push(...ids); this.itemTypes.skill = this.itemTypes.skill.filter(s => !ids.includes(s.id)); },
  getSkill(n) { return this.itemTypes.skill.find(s => s.name.toLowerCase() === String(n).toLowerCase()) ?? null; },
  async applyArchetype(a) { archetypeApplied = a.name; this.system.experience.log = [{ type: "earn", amount: a.system.startingXP, kind: "archetype" }]; },
  async applyCareer(c) { careerApplied = c.name; },
  async createEmbeddedDocuments(t, d) { createdItems.push(...d); const made = d.map(x => ({ ...x, id: x.name, system: { rank: 0, ...(x.system ?? {}) } })); this.itemTypes.skill.push(...made.filter(m => m.type === "skill")); return made; },
  async updateEmbeddedDocuments(t, u) { updates.push(...u); },
  async update(u) { updates.push(u); },
  sheet: { render() {} }
};
globalThis.fromUuid = async uuid => { for (const p of packs.values()) { const d = (await p.getDocuments()).find(x => x.uuid === uuid); if (d) return d; } return null; };
globalThis.foundry.utils.randomID = () => Math.random().toString(36).slice(2);
const A = CreationWizard.DEFAULT_OPTIONS.actions;
// Ведущий выбрал «Фэнтези»: игрок сразу выбирает расу, шага выбора приключения нет, дублей нет.
settings["genesys-rpg.adventures"] = ["fantasy"];
// В мире уже лежат импортированные копии карьер (как после мастера настройки) — они не должны дублироваться.
const careerDocs = await packs.get("genesys-rpg.careers").getDocuments();
const worldCopies = careerDocs.map(d => ({ ...d, uuid: `Item.${d.name}`, _stats: { compendiumSource: d.uuid } }));
game.items.filter = fn => worldCopies.filter(fn);
const free = new CreationWizard({ actor });
await free.render();
assert.ok(!free.html.includes('data-kind="adventure"'), "no adventure step for players");
assert.ok(free.html.includes('data-kind="archetype"'), "wizard starts with race");
const fantasyRaces = [...free.html.matchAll(/wz-card-name">([^<]+)/g)].map(m => m[1]);
assert.ok(fantasyRaces.includes("Эльф") && !fantasyRaces.includes("Высокородный эльф") && !fantasyRaces.includes("Робот"), `fantasy races: ${fantasyRaces}`);
A.pick.call(free, null, { dataset: { kind: "archetype", uuid: [...free.html.matchAll(/data-kind="archetype" data-uuid="([^"]+)"/g)][0][1] } });
A.next.call(free); await free.render();
const fantasyCareers = [...free.html.matchAll(/wz-card-name">([^<]+)/g)].map(m => m[1]);
assert.equal(new Set(fantasyCareers).size, fantasyCareers.length, "no duplicate careers");
assert.ok(free.html.includes('data-uuid="Item.Волшебник"'), "world copy used instead of compendium original");
game.items.filter = () => [];
assert.ok(fantasyCareers.includes("Волшебник") && !fantasyCareers.includes("Маг") && !fantasyCareers.includes("Хакер"), `fantasy careers: ${fantasyCareers}`);
// Мошенник Core: «Дальний бой» остаётся (в фэнтези он есть), «Ближний бой» → «Ближний бой (лёгкое оружие)».
A.pick.call(free, null, { dataset: { kind: "career", uuid: [...free.html.matchAll(/data-kind="career" data-uuid="([^"]+)"/g)].find(m => m[1].includes("Артист"))[1] } });
await free.render();
assert.ok(free.html.includes("Ближний бой (лёгкое оружие)"), "career skill substituted for fantasy");

// Модули: без включения ведущим дополнительных талантов и пси в мастере нет; включили — есть, и только по смыслу миру.
const hasSrc = (w, src) => w.view.talents.some(t => (t.system.source ?? "").startsWith(src));
assert.ok(!hasSrc(free, "Talents Expanded") && !hasSrc(free, "PSI"), "modules off by default");
settings["genesys-rpg.disabledSources"] = [];
const modOn = new CreationWizard({ actor });
await modOn.render();
assert.ok(hasSrc(modOn, "Talents Expanded"), "Talents Expanded on when enabled");
assert.ok(!modOn.view.talents.some(t => /взлом|хакер/i.test(t.name) && !(t.system.worlds ?? []).includes("fantasy")), "only fantasy-fitting extra talents");
delete settings["genesys-rpg.disabledSources"];

// Ведущий выбрал два приключения: расы обоих, карьеры — по миру выбранной расы.
settings["genesys-rpg.adventures"] = ["terrinoth", "spaceopera"];
const multi = new CreationWizard({ actor });
await multi.render();
const multiRaces = [...multi.html.matchAll(/data-kind="archetype" data-uuid="([^"]+)"/g)].map(m => m[1]);
assert.equal(multiRaces.length, 24, `races of both adventures: ${multiRaces.length}`);
A.pick.call(multi, null, { dataset: { kind: "archetype", uuid: multiRaces.find(u => u.includes("Робот")) } });
A.next.call(multi); await multi.render();
const robotCareers = [...multi.html.matchAll(/wz-card-name">([^<]+)/g)].map(m => m[1]);
assert.ok(robotCareers.includes("Капитан звездолёта") && !robotCareers.includes("Маг"), `robot careers: ${robotCareers}`);
A.back.call(multi); await multi.render();
A.pick.call(multi, null, { dataset: { kind: "archetype", uuid: multiRaces.find(u => u.includes("Кошколюд")) } });
A.next.call(multi); await multi.render();
const catCareers = [...multi.html.matchAll(/wz-card-name">([^<]+)/g)].map(m => m[1]);
assert.ok(catCareers.includes("Маг") && !catCareers.includes("Капитан звездолёта"), `catfolk careers: ${catCareers}`);

// Случайный персонаж: сразу итог, опыт не уходит в минус.
const rndw = new CreationWizard({ actor });
await rndw.render();
await A.random.call(rndw); await rndw.render();
assert.ok(rndw.html.includes("wz-summary"), "random character jumps to summary");
assert.ok(!rndw.html.includes('data-action="finish" disabled'), "random character is valid");
assert.ok(Number(rndw.html.match(/wz-budget-value">(-?\d+)/)[1]) >= 0, "random XP not negative");
if (process.env.DUMP) fs.writeFileSync(path.join(process.env.DUMP, "wz-summary.html"), rndw.html);

// Ведущий выбрал Терринот: мастер сразу начинает с расы и показывает только Терринот.
settings["genesys-rpg.adventures"] = ["terrinoth"];
const cw = new CreationWizard({ actor });
await cw.render();
assert.ok(cw.html.includes("wz-card"), "archetype cards rendered");
const cards = [...cw.html.matchAll(/data-kind="archetype" data-uuid="([^"]+)"/g)].map(m => m[1]);
assert.equal(cards.length, 14, `Terrinoth races listed: ${cards.length}`);
const dwarf = cards.find(u => u.includes("Дварф Данварра")) ?? cards[0];
A.pick.call(cw, null, { dataset: { kind: "archetype", uuid: dwarf } }); await cw.render();
assert.ok(cw.html.includes("wz-detail-head"), "archetype detail shown");
const dump = n => process.env.DUMP && fs.writeFileSync(path.join(process.env.DUMP, `wz-${n}.html`), cw.html);
dump("archetype");
A.next.call(cw); await cw.render();
const careers = [...cw.html.matchAll(/data-kind="career" data-uuid="([^"]+)"/g)].map(m => m[1]);
assert.equal(careers.length, 9, `Terrinoth careers listed: ${careers.length}`);
A.pick.call(cw, null, { dataset: { kind: "career", uuid: careers.find(u => u.includes("Воин")) ?? careers[0] } });
A.next.call(cw); await cw.render(); // skills
const careerSkillNames = [...cw.html.matchAll(/data-list="careerFree" data-name="([^"]+)"/g)].map(m => m[1]);
assert.equal(careerSkillNames.length, 8, "8 career skills");
for (const n of careerSkillNames.slice(0, 4)) A.toggle.call(cw, null, { dataset: { list: "careerFree", name: n } });
await cw.render(); dump("skills");
A.next.call(cw); await cw.render(); // xp
const before = cw.html.match(/wz-budget-value">(-?\d+)/)[1];
A.char.call(cw, null, { dataset: { key: "agility", delta: 1 } });
A.skill.call(cw, null, { dataset: { name: careerSkillNames[5], delta: 1 } });
await cw.render();
const after = cw.html.match(/wz-budget-value">(-?\d+)/)[1];
dump("xp");
assert.ok(Number(after) < Number(before), `XP spent: ${before} → ${after}`);
A.next.call(cw); await cw.render(); // talents
const tal = cw.html.match(/data-action="talent" data-uuid="([^"]+)"/)[1];
A.talent.call(cw, null, { dataset: { uuid: tal } });
A.next.call(cw); await cw.render(); // motivations
await A.rollMotivation.call(cw, null, { dataset: {} }); await cw.render();
assert.ok(cw.html.includes('wz-tag small on'), "motivation picked from table");
dump("motivations");
A.next.call(cw); await cw.render(); // heroic (exists in RoT pack)
A.next.call(cw); await cw.render(); // gear
const shopItems = [...cw.html.matchAll(/data-action="buy" data-uuid="([^"]+)"/g)].map(m => m[1]);
assert.ok(shopItems.length > 5, `shop lists weapons: ${shopItems.length}`);
assert.ok(!shopItems.some(u => u.includes("Лазерный")), "no sci-fi in Terrinoth shop");
A.buy.call(cw, null, { dataset: { uuid: shopItems[0] } }); await cw.render();
dump("gear");
assert.ok(cw.html.includes("wz-cart-row"), "bought item in cart");
A.next.call(cw); await cw.render(); // details
assert.ok(cw.html.includes('name="details.money" value="500"'), "starting money 500");
dump("details");
A.next.call(cw); await cw.render(); // summary
assert.ok(!cw.html.includes('data-action="finish" disabled'), "finish enabled");
await A.finish.call(cw);
assert.ok(archetypeApplied && careerApplied, "archetype and career applied");
assert.ok(deleted.includes("Компьютеры") && deleted.includes("Пилотирование"), `skills outside Terrinoth removed: ${deleted}`);
assert.ok(createdItems.some(i => i.name === "Руны"), "Terrinoth skills added");
assert.ok(updates.some(u => u["system.adventure"] === "terrinoth"), "adventure saved on actor");
const final = updates.find(u => u["system.experience.log"]);
assert.ok(final, "final actor update");
const spent = final["system.experience.log"].filter(e => e.type === "spend").reduce((s, e) => s + e.amount, 0);
assert.equal(Number(before) - Number(after) + 5, spent, "XP log matches wizard spending (incl. tier-1 talent 5)");
assert.ok(final["system.motivations.strength.name"], "motivations saved");
assert.ok(createdItems.some(i => i.type === "talent"), "talent created");
// ---- Ширма ведущего ----
const { GMScreen } = await import(`${R}/module/apps/gm-screen.mjs`);
const pcLog = [];
const pc = { id: "pc1", name: "Герой", img: "x", type: "character", hasPlayerOwner: true,
  system: { experience: { log: [], available: 0, total: 0 } }, async update(u) { pcLog.push(u); } };
game.actors.filter = fn => [pc].filter(fn);
settings["genesys-rpg.adventures"] = ["zombie"];
const gm = new GMScreen();
await gm.render();
const G = GMScreen.DEFAULT_OPTIONS.actions;
const foes = [...gm.html.matchAll(/data-action="add" data-uuid="([^"]+)"/g)].map(m => m[1]);
assert.ok(foes.some(u => u.includes("Ходячий мертвец")), "zombies in encounter builder");
assert.ok(!foes.some(u => u.includes("Дракон")), "no Terrinoth dragons in zombie apocalypse");
G.add.call(gm, null, { dataset: { uuid: foes.find(u => u.includes("Ходячий мертвец")) } });
G.add.call(gm, null, { dataset: { uuid: foes.find(u => u.includes("Ходячий мертвец")) } });
G.add.call(gm, null, { dataset: { uuid: foes.find(u => u.includes("Громила")) } });
await gm.render();
assert.equal(gm.encounter.length, 2, "minion groups stacked");
assert.equal(gm.encounter[0].groups, 2, "two zombie groups");
if (process.env.DUMP) fs.writeFileSync(path.join(process.env.DUMP, "gm.html"), gm.html);
// Генератор встреч: по сложности и по количеству.
const GA = GMScreen.DEFAULT_OPTIONS.actions;
GA.genDifficulty.call(gm, null, { dataset: { index: "2" } });
await gm.render();
await GA.generate.call(gm);
await gm.render();
assert.ok(gm.encounter.length > 0, "encounter generated");
const { encounterPower, encounterSize, partyChallenge } = await import(`${R}/module/encounters.mjs`);
const th = encounterPower(gm.encounter, "combat");
assert.ok(th > 0 && th <= gm.budget, `power sum ${th} within budget ${gm.budget}`);
assert.ok(encounterSize(gm.encounter) <= gm.partySize, "no more foes than heroes");
assert.equal(partyChallenge([], 4).cr, 5, "CR table: 0 XP, 4 PCs → 5");
assert.equal(partyChallenge([], 6).cr, 6, "CR table: 0 XP, 6 PCs → 6");
GA.genMode.call(gm, null, { dataset: { mode: "count" } });
gm.gen.count = 6; await GA.generate.call(gm);
const individuals = gm.encounter.reduce((s, e) => s + e.count * (e.minion ? e.groups : 1), 0);
assert.equal(individuals, 6, `exact count: ${individuals}`);
GA.genCreature.call(gm, null, { dataset: { key: "undead" } }); await GA.generate.call(gm);
assert.ok(gm.encounter.every(e => /мертвец|бегун|раздут|громила|зомби/i.test(e.name)), `only undead: ${gm.encounter.map(e => e.name)}`);
GA.genCreature.call(gm, null, { dataset: { key: "undead" } });
GA.genMode.call(gm, null, { dataset: { mode: "budget" } }); await gm.render(); await GA.generate.call(gm);
await gm.render();
if (process.env.DUMP) fs.writeFileSync(path.join(process.env.DUMP, "gm.html"), gm.html);
// Добыча: 5 уровней щедрости.
await new Promise(r => setTimeout(r, 50)); gm.tab = "loot";
GA.lootLevel.call(gm, null, { dataset: { level: "5" } });
await GA.lootGenerate.call(gm); await gm.render();
assert.ok(gm.loot.result && (gm.loot.result.coins > 0 || gm.loot.result.items.length > 0), "rich loot generated");
if (process.env.DUMP) fs.writeFileSync(path.join(process.env.DUMP, "gm-loot.html"), gm.html);
GA.lootLevel.call(gm, null, { dataset: { level: "1" } });
await GA.lootGenerate.call(gm);
assert.ok(gm.loot.result.coins < 200, "poor loot is poor");
// Лавка: сложность по редкости (Core, табл. I.5-1) и сборка ассортимента.
const { rarityCheck, generateShop } = await import(`${R}/module/merchant.mjs`);
assert.deepEqual(rarityCheck(1), { difficulty: 0, upgrades: 0 }, "rarity 1 → simple");
assert.deepEqual(rarityCheck(5), { difficulty: 2, upgrades: 0 }, "rarity 5 → average");
assert.deepEqual(rarityCheck(12), { difficulty: 5, upgrades: 2 }, "rarity 12 → formidable +2 upgrades");
await new Promise(r => setTimeout(r, 50)); gm.tab = "shop"; await gm.render();
await GMScreen.DEFAULT_OPTIONS.actions.shopGenerate.call(gm); await gm.render();
assert.ok(gm.shop.result.length > 3 && gm.shop.result.every(i => i.data.type === "gear"), `shop items: ${gm.shop.result.length}`);
if (process.env.DUMP) fs.writeFileSync(path.join(process.env.DUMP, "gm-shop.html"), gm.html);
// Оружейная в фэнтези: только оружие, без бластеров; в зоне войны (+3) редкие вещи встречаются реже обычных.
{
  gm.shop.adventure = "fantasy"; gm.shop.type = "weapons";
  await GMScreen.DEFAULT_OPTIONS.actions.shopGenerate.call(gm);
  const names = gm.shop.result.map(i => i.data.name);
  assert.ok(gm.shop.result.length > 3 && gm.shop.result.every(i => i.data.type === "weapon"), `weapon shop: ${names}`);
  assert.ok(!names.some(n => /бластер|лазер|винтовк|пистолет/i.test(n)), `no guns in a fantasy shop: ${names}`);
  const pool = gm.shopPools.get("fantasy");
  let common = 0, rare = 0;
  for (let k = 0; k < 40; k++) for (const it of generateShop(pool, { type: "weapons", size: "small", locMod: 0 })) (it.rarity <= 3 ? common++ : it.rarity >= 8 ? rare++ : 0);
  assert.ok(common > rare, `common ${common} > rare ${rare}`);
  assert.ok(generateShop(pool, { type: "weapons", locMod: 0 }).every(it => it.rarity <= 10), "rarity > 10 only in 'all'");
}
// NPC
await new Promise(r => setTimeout(r, 50)); gm.tab = "npc"; await gm.render();
assert.ok(gm.html.includes('name="npc.role"'), "npc form");
const { generateNPC } = await import(`${R}/module/npc.mjs`);
let npcData = null;
globalThis.Actor.implementation.create = async d => { npcData = d; return { ...d, uuid: "Actor.npc", sheet: { render() {} } }; };
await generateNPC({ role: "shooter", kind: "nemesis", power: 3, adventure: "modern" });
assert.equal(npcData.system.adversaryType, "nemesis");
assert.ok(npcData.items.some(i => i.type === "skill" && /ranged/.test(i.system.key)), "shooter has ranged skill");
assert.ok(npcData.items.some(i => i.name === "Противник" && i.system.rank === 3), "nemesis Adversary 3");
assert.ok(npcData.system.strain.max > 0 && npcData.system.wounds.max > 15, "nemesis thresholds");
if (process.env.DUMP) fs.writeFileSync(path.join(process.env.DUMP, "gm-npc.html"), gm.html);
G.gmTab.call(gm, null, { dataset: { tab: "xp" } }); await gm.render();
assert.ok(gm.html.includes("Герой"), "characters listed for XP");
await G.award.call(gm, null, { dataset: { amount: "15" } });
assert.equal(pcLog[0]["system.experience.log"].at(-1).amount, 15, "XP awarded into log");
G.gmTab.call(gm, null, { dataset: { tab: "reference" } }); await gm.render();
assert.ok(gm.html.includes("gm-cost"), "spending table in reference");
if (process.env.DUMP) fs.writeFileSync(path.join(process.env.DUMP, "gm-ref.html"), gm.html);

// ---- Мастерская ----
const { Workshop } = await import(`${R}/module/apps/workshop.mjs`);
const smith = { name: "Кузнец", system: { adventure: "terrinoth", money: 300 }, getSkill: () => ({ name: "Механика" }) };
const wsp = new Workshop({ actor: smith });
await wsp.render();
const craftItems = [...wsp.html.matchAll(/data-action="select" data-uuid="([^"]+)"/g)].map(m => m[1]);
assert.ok(craftItems.length > 10, `workshop lists items: ${craftItems.length}`);
const sword = craftItems.find(u => u.includes("Меч")) ?? craftItems[0];
Workshop.DEFAULT_OPTIONS.actions.select.call(wsp, null, { dataset: { uuid: sword } }); await wsp.render();
assert.ok(wsp.html.includes("Механика"), "craft check uses Mechanics");
assert.deepEqual(Workshop.plan({ system: { rarity: 2, price: 200 } }, "craft").difficulty, 1, "rarity 2 → Easy");
assert.equal(Workshop.plan({ system: { rarity: 5, price: 100 } }, "alchemy").cost, 50, "ingredients half price");
Workshop.DEFAULT_OPTIONS.actions.mode.call(wsp, null, { dataset: { mode: "alchemy" } }); await wsp.render();
assert.ok([...wsp.html.matchAll(/data-action="select"/g)].length > 0, "alchemy lists potions");
assert.ok(GENESYS.spending.craftingPositive && GENESYS.spending.alchemyNegative, "crafting spending tables");

// Толкования символов: у каждого навыка справочника — файл, в каждой эпохе по 10 вариантов на каждый исход; вкладка рисуется.
{
  const I = await import(`${R}/module/interpretations.mjs`);
  globalThis.fetch = async url => {
    const f = path.join(R, String(url).replace(/^systems\/genesys-rpg\//, ""));
    return fs.existsSync(f) ? { ok: true, json: async () => JSON.parse(fs.readFileSync(f, "utf8")) } : { ok: false };
  };
  const keys = Object.values(I.INTERP_SKILLS).flat();
  for (const key of keys) {
    const d = await I.loadInterpretations(key);
    assert.ok(d?.eras, `толкования: нет файла ${key}`);
    assert.ok(Object.keys(d.eras).length >= 1, `толкования ${key}: нет эпох`);
    for (const [era, o] of Object.entries(d.eras)) {
      assert.ok(I.ERAS[era], `толкования ${key}: неизвестная эпоха ${era}`);
      for (const k of I.OUTCOMES) {
        assert.equal(o[k]?.length, 10, `толкования ${key}/${era}/${k}: ${o[k]?.length}`);
        assert.ok(o[k].every(t => typeof t === "string" && t.length > 20 && t.length < 400), `толкования ${key}/${era}/${k}: текст`);
        assert.equal(new Set(o[k]).size, 10, `толкования ${key}/${era}/${k}: повторы`);
      }
    }
  }
  for (const k of ["computers", "piloting"]) assert.ok(!(await I.loadInterpretations(k)).eras.medieval, `${k} нет в средневековье`);
  assert.ok(!(await I.loadInterpretations("astrocartography")).eras.modern, "астронавигация только в будущем");
  assert.equal(I.interpKey("meleeHeavy"), "melee");
  gm.tab = "interp"; gm.interp.era = "modern"; gm.interp.skill = "athletics"; await gm.render();
  assert.equal([...gm.html.matchAll(/data-action="interpPick"/g)].length, 40, "40 вариантов на вкладке");
  gm.interp.skill = "alchemy"; await gm.render();
  assert.ok(gm.html.includes("gs-warning"), "алхимии нет в нашем времени — подсказка");
}
console.log("notifications:", notes);
// Окно броска: собирается и рисуется (раньше падало на настройке видимости в некоторых сборках).
{
  globalThis.Roll ??= class { constructor() { this.terms = []; } };
  globalThis.CONFIG ??= {}; CONFIG.ChatMessage ??= { modes: { public: { label: "Всем" }, gm: { label: "Ведущему" } } };
  const { DicePoolDialog } = await import(`${R}/module/apps/dice-pool-dialog.mjs`);
  const { DicePool } = await import(`${R}/module/dice/pool.mjs`);
  const pool = new DicePool({ ability: 2, proficiency: 1, difficulty: 2 });
  const dlg = new DicePoolDialog({ pool, label: "Атлетика", actor: null, notes: ["заметка"] });
  await dlg.render();
  assert.ok(dlg.html.includes("pool-row"), "окно броска рисуется");
  assert.ok(["public", "roll", "publicroll"].includes(dlg.messageMode) || dlg.messageMode);
}
console.log("APP HARNESS PASSED");
