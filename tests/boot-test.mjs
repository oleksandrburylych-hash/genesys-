/**
 * Загрузка системы целиком: импорт genesys.mjs и выполнение хуков init → setup → ready
 * на заглушках Foundry. Ловит ошибки, из-за которых система «молча» не стартует.
 */
import assert from "node:assert/strict";
const R = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(/\/$/, "");
const hooks = {}; const once = {};
globalThis.Hooks = { on: (n, f) => (hooks[n] ??= []).push(f), once: (n, f) => (once[n] ??= []).push(f), callAll() {} };
class Base { constructor(o = {}) { this.options = o; } async render() { this.rendered = true; return this; } static registerSheet() {} }
const api = { ApplicationV2: Base, HandlebarsApplicationMixin: B => B, DialogV2: Base };
const registered = {}; const menus = {};
const settings = {
  register: (n, k, d) => { if (k.includes(".")) throw new Error(`dotted key ${k}`); registered[`${n}.${k}`] = d; },
  registerMenu: (n, k, d) => { menus[k] = d; },
  get: (n, k) => { const d = registered[`${n}.${k}`]; if (!d) throw new Error(`not registered: ${k}`); return d.default; },
  set: async () => {}
};
const opened = [];
globalThis.foundry = {
  dice: { terms: { DiceTerm: class {} } },
  abstract: { TypeDataModel: class { static migrateData(s) { return s; } } },
  data: { fields: new Proxy({}, { get: () => class { constructor(...a) { this.a = a; } } }) },
  applications: {
    api, sheets: { ActorSheetV2: Base, ItemSheetV2: Base },
    apps: { DocumentSheetConfig: { registerSheet() {} } },
    handlebars: { loadTemplates: async () => {}, renderTemplate: async () => "" },
    ux: { TextEditor: { implementation: {} } }, instances: new Map()
  },
  utils: { deepClone: o => structuredClone(o) }
};
globalThis.CONFIG = { Actor: {}, Item: {}, Combatant: {}, Dice: { terms: {}, termTypes: {}, rolls: [] }, Combat: {}, specialStatusEffects: {}, statusEffects: [] };
globalThis.Roll = class {}; globalThis.Actor = class {}; globalThis.Item = class {}; globalThis.Combatant = class {};
globalThis.Handlebars = { registerHelper() {}, SafeString: class {}, escapeExpression: s => s };
globalThis.fetch = async () => ({ ok: true, json: async () => ({}) });
globalThis.ui = { notifications: { info() {}, warn() {}, error: m => { throw new Error(`notification error: ${m}`); } } };
globalThis.game = {
  settings, socket: { on() {} }, user: { isGM: true, isActiveGM: true }, system: { id: "genesys-rpg", version: "test" },
  i18n: { localize: k => k }, users: {}
};
const origLog = console.log; console.log = () => {};
await import(`${R}/genesys.mjs`);
for (const f of once.init ?? []) await f();
for (const f of once.setup ?? []) await f();
// Мастер настройки должен открыться в ready
const { WorldSetup } = await import(`${R}/module/apps/world-setup.mjs`);
const origRender = WorldSetup.prototype.render;
WorldSetup.prototype.render = async function () { opened.push("WorldSetup"); return this; };
for (const f of once.ready ?? []) await f();
await new Promise(r => setTimeout(r, 10));
console.log = origLog;
assert.ok(menus.worldSetup, "menu registered");
assert.ok(registered["genesys-rpg.worldSetupDone"], "worldSetupDone registered");
assert.ok(opened.includes("WorldSetup"), "world setup opens on ready");
// Кнопка на панели сцены
const controls = { tokens: { tools: {} } };
for (const f of hooks.getSceneControlButtons ?? []) f(controls);
assert.ok(controls.tokens.tools.genesysSetup, "scene control button");
// Команда /genesys в чате
let chatOpened = false;
WorldSetup.prototype.render = async function () { chatOpened = true; return this; };
const res = (hooks.chatMessage ?? []).map(f => f({}, "/genesys"));
await new Promise(r => setTimeout(r, 10));
assert.ok(res.includes(false) && chatOpened, "/genesys opens the wizard");
// Кнопка во вкладке настроек (минимальный DOM)
globalThis.HTMLElement = class {};
globalThis.document = { createElement: () => ({ addEventListener() {}, set innerHTML(v) { this.html = v; } }) };
const root = new HTMLElement(); let prepended = null;
root.querySelector = sel => sel === ".genesys-setup-button" ? null : { prepend: b => { prepended = b; } };
for (const f of hooks.renderSettings ?? []) f({}, root);
assert.ok(prepended, "settings sidebar button");
console.log("BOOT TEST PASSED");
