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
H.registerHelper("localize", k => typeof k === "string" ? loc(k) : k);
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
const settings = { "genesys-rpg.skillPreset": "all", "genesys-rpg.worldSetupDone": false, "genesys-rpg.storyPoints": { player: 0, gm: 0 } };

// Compendia from packs-src
const mkDoc = (d, packName) => ({ ...d, uuid: `Compendium.genesys-rpg.${packName}.${d.name}`, folder: d.folder ? { name: d.folder } : null, img: "x", system: d.system, toObject() { return structuredClone(d); } });
const packs = new Map();
for (const dir of fs.readdirSync(SRC, { withFileTypes: true }).filter(e => e.isDirectory())) {
  const docs = fs.readdirSync(path.join(SRC, dir.name)).filter(f => f.endsWith(".json")).flatMap(f => JSON.parse(fs.readFileSync(path.join(SRC, dir.name, f))));
  const md = docs.map(d => mkDoc(d, dir.name));
  // archetype abilities linked at build time; emulate
  if (dir.name === "archetypes") for (const a of md) a.system.abilities ??= [];
  packs.set(`genesys-rpg.${dir.name}`, { metadata: { label: dir.name }, documentName: dir.name === "adversaries" || dir.name === "vehicles" ? "Actor" : "Item", index: { size: md.length }, getDocuments: async () => md });
}
const created = [];
globalThis.game = {
  i18n: { localize: loc, format: (k, d) => loc(k) + JSON.stringify(d ?? {}), lang: "ru" },
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
assert.ok(ws.html.includes("Терринот"), "setting select rendered");
assert.ok(ws.html.includes('name="packs.talents"'), "pack checkboxes rendered");
// choose Terrinoth, click install
WorldSetup.DEFAULT_OPTIONS.form.handler.call(ws, null, null, { object: { setting: "terrinoth", "sources.core": true, "sources.epg": true, "sources.rot": true, "sources.zgm": true, "packs.talents": true, "packs.archetypes": true, "packs.adversaries": true, tables: true, journal: true, macros: true, storyPoints: true, replace: true } });
await WorldSetup.DEFAULT_OPTIONS.actions.install.call(ws);
console.log("setup log:", ws.log);
assert.ok(!ws.log.some(l => l.startsWith("⚠")), "no errors in install log");
const talents = created.filter(d => d.type === "talent");
assert.ok(talents.length > 0 && talents.length < 155, `terrinoth talents filtered: ${talents.length}`);
assert.ok(!talents.some(t => t.name === "Закалённый"), "non-RoT core talent filtered out");
assert.equal(settings["genesys-rpg.skillPreset"], "terrinoth");
assert.equal(settings["genesys-rpg.worldSetupDone"], true);

// ---- Creation wizard ----
GENESYS.creation = JSON.parse(fs.readFileSync(path.join(R, "module/data/creation.json")));
const { CreationWizard } = await import(`${R}/module/apps/creation-wizard.mjs`);
const sk = (name, characteristic, category) => ({ name, system: { characteristic, category, rank: 0 }, id: name });
const updates = []; let createdItems = []; let archetypeApplied = null; let careerApplied = null;
const actor = {
  name: "Тест", itemTypes: { skill: [sk("Атлетика", "brawn", "general"), sk("Хладнокровие", "presence", "general"), sk("Внимание", "cunning", "general")] },
  system: { experience: { log: [] } },
  getSkill(n) { return this.itemTypes.skill.find(s => s.name.toLowerCase() === String(n).toLowerCase()) ?? null; },
  async applyArchetype(a) { archetypeApplied = a.name; this.system.experience.log = [{ type: "earn", amount: a.system.startingXP, kind: "archetype" }]; },
  async applyCareer(c) { careerApplied = c.name; },
  async createEmbeddedDocuments(t, d) { createdItems.push(...d); const made = d.map(x => ({ ...x, id: x.name, system: { rank: 0, ...(x.system ?? {}) } })); this.itemTypes.skill.push(...made.filter(m => m.type === "skill")); return made; },
  async updateEmbeddedDocuments(t, u) { updates.push(...u); },
  async update(u) { updates.push(u); },
  sheet: { render() {} }
};
globalThis.foundry.utils.randomID = () => Math.random().toString(36).slice(2);
const A = CreationWizard.DEFAULT_OPTIONS.actions;
const cw = new CreationWizard({ actor });
await cw.render();
assert.ok(cw.html.includes("wz-card"), "archetype cards rendered");
const cards = [...cw.html.matchAll(/data-kind="archetype" data-uuid="([^"]+)"/g)].map(m => m[1]);
assert.ok(cards.length >= 39, `all races/archetypes listed: ${cards.length}`);
const dwarf = cards.find(u => u.includes("Дварф Данварра")) ?? cards[0];
A.pick.call(cw, null, { dataset: { kind: "archetype", uuid: dwarf } }); await cw.render();
assert.ok(cw.html.includes("wz-detail-head"), "archetype detail shown");
const dump = n => process.env.DUMP && fs.writeFileSync(path.join(process.env.DUMP, `wz-${n}.html`), cw.html);
dump("archetype");
A.next.call(cw); await cw.render();
const careers = [...cw.html.matchAll(/data-kind="career" data-uuid="([^"]+)"/g)].map(m => m[1]);
assert.ok(careers.length >= 25, `all careers listed: ${careers.length}`);
A.pick.call(cw, null, { dataset: { kind: "career", uuid: careers.find(u => u.includes("Воин")) ?? careers[0] } });
A.next.call(cw); await cw.render(); // skills
const careerSkillNames = [...cw.html.matchAll(/data-list="careerFree" data-name="([^"]+)"/g)].map(m => m[1]);
assert.equal(careerSkillNames.length, 8, "8 career skills");
for (const n of careerSkillNames.slice(0, 4)) A.toggle.call(cw, null, { dataset: { list: "careerFree", name: n } });
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
A.next.call(cw); await cw.render(); // details
assert.ok(cw.html.includes('name="details.money" value="500"'), "starting money 500");
A.next.call(cw); await cw.render(); // summary
assert.ok(!cw.html.includes('data-action="finish" disabled'), "finish enabled");
await A.finish.call(cw);
assert.ok(archetypeApplied && careerApplied, "archetype and career applied");
const final = updates.find(u => u["system.experience.log"]);
assert.ok(final, "final actor update");
const spent = final["system.experience.log"].filter(e => e.type === "spend").reduce((s, e) => s + e.amount, 0);
assert.equal(Number(before) - Number(after) + 5, spent, "XP log matches wizard spending (incl. tier-1 talent 5)");
assert.ok(final["system.motivations.strength.name"], "motivations saved");
assert.ok(createdItems.some(i => i.type === "talent"), "talent created");
console.log("notifications:", notes);
console.log("APP HARNESS PASSED");
