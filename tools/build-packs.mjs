/**
 * Сборка компендиумов Foundry (LevelDB) из JSON-исходников.
 *
 *   packs-src/<pack>/*.json  — массивы документов (см. packs-src/README.md)
 *   packs/<pack>/            — результат (LevelDB), его и читает Foundry
 *
 * Запуск: npm run build:packs
 * Скрипт также обновляет "packs" и "packFolders" в system.json.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { pickIcon, DEFAULTS } from "./icon-rules.mjs";
import { tilePath, TILE_DIR } from "./icon-tiles.mjs";
import { worldsFor } from "./world-rules.mjs";
import { ADVENTURES, WORLD_KEYS } from "../module/worlds.mjs";

/** Картинка документа: явно заданная или плашка game-icons по названию. */
function imageFor(doc) {
  if (doc.img) return doc.img;
  const category = doc.type;
  try { return tilePath(category, pickIcon(doc)); }
  catch (err) { console.warn(`  ! ${err.message} (${doc.name})`); return ICONS[doc.type] ?? "icons/svg/item-bag.svg"; }
}

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "packs-src");
const OUT = path.join(ROOT, "packs");
const TMP = path.join(ROOT, ".build", "packs-json");
const SYSTEM_ID = "genesys-rpg";

/** Компендиумы: порядок = порядок в боковой панели. */
const PACKS = [
  { name: "archetypes", label: "Архетипы и расы", type: "Item" },
  { name: "careers", label: "Карьеры", type: "Item" },
  { name: "skills", label: "Навыки", type: "Item" },
  { name: "talents", label: "Таланты", type: "Item" },
  { name: "abilities", label: "Особые способности", type: "Item" },
  { name: "heroic", label: "Героические способности", type: "Item" },
  { name: "spells", label: "Магия", type: "Item" },
  { name: "weapons", label: "Оружие", type: "Item" },
  { name: "armor", label: "Броня", type: "Item" },
  { name: "gear", label: "Снаряжение", type: "Item" },
  { name: "qualities", label: "Свойства предметов", type: "Item" },
  { name: "attachments", label: "Модификации и зачарования", type: "Item" },
  { name: "injuries", label: "Критические травмы", type: "Item" },
  { name: "vehicle-crits", label: "Критические попадания (транспорт)", type: "Item" },
  { name: "adversaries", label: "Противники", type: "Actor" },
  { name: "vehicles", label: "Транспорт", type: "Actor" }
];

const ICONS = {
  skill: "icons/svg/book.svg",
  talent: "icons/svg/aura.svg",
  ability: "icons/svg/upgrade.svg",
  archetype: "icons/svg/mystery-man.svg",
  career: "icons/svg/statue.svg",
  weapon: "icons/svg/sword.svg",
  armor: "icons/svg/shield.svg",
  gear: "icons/svg/item-bag.svg",
  quality: "icons/svg/sun.svg",
  injury: "icons/svg/blood.svg",
  spell: "icons/svg/explosion.svg",
  heroic: "icons/svg/sun.svg",
  attachment: "icons/svg/padlock.svg",
  adversary: "icons/svg/skull.svg",
  vehicle: "icons/svg/cog.svg"
};

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Стабильный 16-символьный id из строки (чтобы ссылки не ломались при пересборке). */
function stableId(seed) {
  const bytes = crypto.createHash("sha256").update(seed).digest();
  let id = "";
  for (let i = 0; i < 16; i++) id += ALPHABET[bytes[i] % ALPHABET.length];
  return id;
}

function readSources(pack) {
  const dir = path.join(SRC, pack);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort();
  const docs = [];
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    if (!Array.isArray(data)) throw new Error(`${pack}/${file}: ожидается массив`);
    for (const d of data) docs.push({ ...d, _file: file });
  }
  return docs;
}

function embeddedItem(actorId, item, index) {
  const id = stableId(`${actorId}:${index}:${item.name}`);
  return {
    _id: id,
    _key: `!actors.items!${actorId}.${id}`,
    name: item.name,
    type: item.type,
    img: imageFor(item),
    system: item.system ?? {},
    effects: [],
    flags: item.nameEn ? { [SYSTEM_ID]: { nameEn: item.nameEn } } : {},
    sort: index * 100
  };
}

/* -------------------------------------------- */
/*  Связи между документами                     */
/* -------------------------------------------- */

/** Готовые заклинания получают эффекты базового действия; сложность пересчитывается. */
function linkSpells(docs) {
  // Базовые действия по имени; при совпадении имён побеждает первый источник (Core раньше RoT).
  const actions = new Map();
  for (const d of docs) if (!d.system?.baseAction && !actions.has(d.name)) actions.set(d.name, d);
  for (const d of docs) {
    const sys = d.system ?? {};
    if (!sys.baseAction) continue;
    const base = actions.get(sys.baseAction);
    if (!base) { console.warn(`  ! заклинание «${d.name}»: нет базового действия «${sys.baseAction}»`); continue; }
    sys.effects = structuredClone(base.system.effects ?? []);
    sys.concentration ??= base.system.concentration;
    sys.attack = !!(sys.attack || base.system.attack);
    if (!sys.skills?.length) sys.skills = [...base.system.skills];
    const extra = (sys.selected ?? []).reduce((sum, n) => {
      const e = sys.effects.find(x => x.name === n);
      if (!e) console.warn(`  ! заклинание «${d.name}»: нет эффекта «${n}» у «${sys.baseAction}»`);
      return sum + (e?.difficulty ?? 0);
    }, 0);
    const computed = Math.min(5, base.system.difficulty + extra);
    if (sys.difficulty !== computed) {
      sys.description = `${sys.description ?? ""}<p><em>В источнике указана сложность ${sys.difficulty}; по правилам сложения эффектов — ${computed}.</em></p>`;
      sys.difficulty = computed;
    }
  }
}

/** Архетипы и расы получают свои особые способности (по упоминанию в описании). */
function linkArchetypes(docs) {
  const abilities = readSources("abilities");
  for (const d of docs) {
    const names = [...(d.system?.description ?? "").matchAll(/<strong>([^<:]+?):?<\/strong>/g)].map(m => m[1].trim());
    const stem = d._file.replace(/\.json$/, "");
    d.system.abilities = [];
    for (const name of names) {
      const candidates = abilities.filter(a => a.name === name);
      if (!candidates.length) continue;
      const best = candidates.find(a => a.folder === d.folder && a._file.replace(/\.json$/, "") === stem)
        ?? candidates.find(a => a.folder === d.folder)
        ?? candidates.find(a => a._file.replace(/\.json$/, "") === stem)
        ?? candidates[0];
      d.system.abilities.push({ name: best.name, description: best.system.description ?? "" });
    }
  }
}

const WORLD_STATS = {};

function buildPack(pack) {
  const raw = readSources(pack.name);
  if (!raw.length) return null;
  if (pack.name === "spells") linkSpells(raw);
  if (pack.name === "archetypes") linkArchetypes(raw);

  const outDir = path.join(TMP, pack.name);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  // Папки
  const folders = new Map();
  const folderId = name => {
    if (!name) return null;
    if (!folders.has(name)) folders.set(name, stableId(`${pack.name}:folder:${name}`));
    return folders.get(name);
  };

  const seen = new Map();
  let count = 0;
  for (const doc of raw) {
    const ident = doc.type === "skill" ? (doc.system?.key || doc.name) : `${doc.folder ?? ""}:${doc.nameEn || doc.name}`;
    if (seen.has(ident)) {
      console.warn(`  ! ${pack.name}: дубликат «${doc.name}» (${doc._file}), уже есть из ${seen.get(ident)} — пропущен`);
      continue;
    }
    seen.set(ident, doc._file);

    const id = stableId(`${pack.name}:${ident}`);
    const isActor = pack.type === "Actor";
    const out = {
      _id: id,
      _key: `!${isActor ? "actors" : "items"}!${id}`,
      name: doc.name,
      type: doc.type,
      img: imageFor(doc),
      folder: folderId(doc.folder),
      system: { ...(doc.system ?? {}), worlds: worldsFor(doc, pack.name) },
      effects: [],
      flags: { [SYSTEM_ID]: { nameEn: doc.nameEn ?? "" } },
      sort: count * 100,
      ownership: { default: 0 }
    };
    if (isActor) {
      out.items = (doc.items ?? []).map((it, i) => embeddedItem(id, it, i));
      out.prototypeToken = {
        name: doc.name,
        actorLink: false,
        disposition: -1,
        displayBars: 20,
        bar1: { attribute: doc.type === "vehicle" ? "hullTrauma" : "wounds" },
        bar2: { attribute: doc.type === "vehicle" ? "systemStrain" : (doc.system?.adversaryType === "nemesis" ? "strain" : null) }
      };
      if (doc.type === "vehicle") out.prototypeToken.disposition = 0;
    }
    fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(out, null, 2));
    for (const w of out.system.worlds) WORLD_STATS[w] = (WORLD_STATS[w] ?? 0) + 1;
    if (out.system.worlds.length === WORLD_KEYS.length) WORLD_STATS["(все)"] = (WORLD_STATS["(все)"] ?? 0) + 1;
    count++;
  }

  // Документы папок
  let sort = 0;
  for (const [name, id] of [...folders.entries()].sort((a, b) => a[0].localeCompare(b[0], "ru"))) {
    const folder = {
      _id: id, _key: `!folders!${id}`, name, type: pack.type,
      folder: null, sorting: "a", sort: (sort += 100), color: null, flags: {}
    };
    fs.writeFileSync(path.join(outDir, `folder-${id}.json`), JSON.stringify(folder, null, 2));
  }
  return { count, folders: folders.size };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  // Плашки по умолчанию для новых документов каждого типа.
  for (const [type, icon] of Object.entries(DEFAULTS)) tilePath(type, icon);
  // Плашки типов приключений (мастера настройки мира и создания персонажа).
  for (const a of Object.values(ADVENTURES)) tilePath("adventure", a.icon);
  tilePath("adventure", "scroll-unfurled");
  // Плашки состояний (значки на токенах и в справке).
  const { GENESYS } = await import("../module/config.mjs");
  for (const st of GENESYS.statusEffects) {
    const icon = st.img.match(/\/status\/([^/]+)\.svg$/)?.[1];
    if (icon) tilePath("status", icon);
  }
  writeCredits();
  const built = [];
  for (const pack of PACKS) {
    const result = buildPack(pack);
    if (!result) continue;
    const dest = path.join(OUT, pack.name);
    fs.rmSync(dest, { recursive: true, force: true });
    await compilePack(path.join(TMP, pack.name), dest);
    console.log(`✓ ${pack.name}: ${result.count} док., ${result.folders} папок`);
    built.push(pack);
  }

  // Обновить system.json
  const manifestPath = path.join(ROOT, "system.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.packs = built.map(p => ({
    name: p.name,
    label: p.label,
    path: `packs/${p.name}`,
    type: p.type,
    system: SYSTEM_ID,
    ownership: { PLAYER: "OBSERVER", ASSISTANT: "OWNER" },
    flags: {}
  }));
  manifest.packFolders = [{
    name: "Genesys",
    sorting: "m",
    color: "#2f6f8f",
    packs: built.filter(p => p.type === "Item").map(p => p.name),
    folders: [{ name: "Противники и транспорт", sorting: "m", packs: built.filter(p => p.type === "Actor").map(p => p.name) }]
  }];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  fs.rmSync(path.join(ROOT, ".build"), { recursive: true, force: true });
  console.log(`system.json: ${built.length} компендиумов`);
  console.log("Теги миров:", Object.entries(WORLD_STATS).map(([k, v]) => `${k} ${v}`).join(", "));
}

/** Атрибуция иконок (CC BY 3.0). */
function writeCredits() {
  fs.mkdirSync(TILE_DIR, { recursive: true });
  fs.writeFileSync(path.join(TILE_DIR, "CREDITS.md"), `# Иконки

Символы на плашках — из коллекции [game-icons.net](https://game-icons.net)
(авторы: Lorc, Delapouite, Skoll, sbed, John Colburn, Carl Olsen, Cathelineau и другие),
лицензия [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
Плашки (фон, рамка, цвета) сгенерированы для системы Genesys RPG скриптом \`tools/icon-tiles.mjs\`.
`);
}

main().catch(err => { console.error(err); process.exit(1); });
