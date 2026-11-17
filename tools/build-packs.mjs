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

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "packs-src");
const OUT = path.join(ROOT, "packs");
const TMP = path.join(ROOT, ".build", "packs-json");
const SYSTEM_ID = "genesys-rpg";

/** Компендиумы: порядок = порядок в боковой панели. */
const PACKS = [
  { name: "archetypes", label: "Архетипы и виды", type: "Item" },
  { name: "careers", label: "Карьеры", type: "Item" },
  { name: "skills", label: "Навыки", type: "Item" },
  { name: "talents", label: "Таланты", type: "Item" },
  { name: "abilities", label: "Особые способности", type: "Item" },
  { name: "spells", label: "Магия", type: "Item" },
  { name: "weapons", label: "Оружие", type: "Item" },
  { name: "armor", label: "Броня", type: "Item" },
  { name: "gear", label: "Снаряжение", type: "Item" },
  { name: "qualities", label: "Качества предметов", type: "Item" },
  { name: "injuries", label: "Критические ранения", type: "Item" },
  { name: "adversaries", label: "Противники", type: "Actor" }
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
  adversary: "icons/svg/skull.svg"
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
    img: item.img ?? ICONS[item.type] ?? "icons/svg/item-bag.svg",
    system: item.system ?? {},
    effects: [],
    flags: {},
    sort: index * 100
  };
}

function buildPack(pack) {
  const raw = readSources(pack.name);
  if (!raw.length) return null;

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
      img: doc.img ?? ICONS[doc.type] ?? "icons/svg/item-bag.svg",
      folder: folderId(doc.folder),
      system: doc.system ?? {},
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
        bar1: { attribute: "wounds" },
        bar2: { attribute: doc.system?.adversaryType === "nemesis" ? "strain" : null }
      };
    }
    fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(out, null, 2));
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
    folders: [{ name: "Противники", sorting: "m", packs: built.filter(p => p.type === "Actor").map(p => p.name) }]
  }];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  fs.rmSync(path.join(ROOT, ".build"), { recursive: true, force: true });
  console.log(`system.json: ${built.length} компендиумов`);
}

main().catch(err => { console.error(err); process.exit(1); });
