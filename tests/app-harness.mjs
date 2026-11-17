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
H.registerHelper("gt", (a, b) => a > b);
H.registerHelper("lt", (a, b) => a < b);
H.registerHelper("selectOptions", (choices, opts) => new H.SafeString(Object.entries(choices).map(([k, v]) => `<option value="${k}">${loc(v)}</option>`).join("")));
const notes = [];
class ApplicationV2 {
  constructor(options = {}) { this.options = options; this.rendered = 0; }
  async render() {
    const ctx = await this._prepareContext({});
    const part = Object.values(this.constructor.PARTS)[0].template.replace("systems/genesys-rpg/", "");
    const src = fs.readFileSync(path.join(R, part), "utf8");
    this.html = H.compile(src, { strict: false })(ctx);
    this.rendered++;
    return this;
  }
  close() { this.closed = true; }
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
const { CreationWizard } = await import(`${R}/module/apps/creation-wizard.mjs`);
const actor = { itemTypes: { skill: [{ name: "Атлетика" }] }, getSkill: () => null };
const cw = new CreationWizard({ actor });
await cw.render();
assert.ok(cw.html.includes("data-kind=\"archetype\""), "archetype options rendered");
const firstUuid = cw.html.match(/data-kind="archetype" data-uuid="([^"]+)"/)[1];
CreationWizard.DEFAULT_OPTIONS.actions.pick.call(cw, null, { dataset: { kind: "archetype", uuid: firstUuid } });
CreationWizard.DEFAULT_OPTIONS.actions.next.call(cw);
await cw.render();
assert.ok(cw.html.includes("data-kind=\"career\""), "career step rendered");
console.log("notifications:", notes);
console.log("APP HARNESS PASSED");
