/**
 * Сборка релиза для установки в Foundry по ссылке на манифест.
 *
 *   dist/genesys-rpg.zip — файлы системы в корне архива
 *   dist/system.json     — манифест для релиза (ссылки на релизы GitHub)
 *
 * Постоянная ссылка для установки:
 *   https://github.com/oleksandrburylych-hash/genesys-/releases/latest/download/system.json
 *
 * Обычно запускается GitHub Actions при отправке тега vX.Y.Z (.github/workflows/release.yml).
 * Локально: TAG=v0.5.0 node tools/build-release.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const REPO = "oleksandrburylych-hash/genesys-";
const manifestPath = path.join(ROOT, "system.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const tag = process.env.TAG || `v${manifest.version}`;

// Ссылки: манифест — всегда «последний релиз».
// В репозитории архив тоже «последний» (по этой копии обновляются старые установки),
// в релизе и внутри архива — конкретная версия.
manifest.url = `https://github.com/${REPO}`;
manifest.manifest = `https://github.com/${REPO}/releases/latest/download/system.json`;
manifest.download = `https://github.com/${REPO}/releases/latest/download/genesys-rpg.zip`;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

const release = { ...manifest, download: `https://github.com/${REPO}/releases/download/${tag}/genesys-rpg.zip` };
const dist = path.join(ROOT, "dist");
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, "system.json"), JSON.stringify(release, null, 2) + "\n");

const INCLUDE = ["system.json", "genesys.mjs", "README.md", "module", "templates", "styles", "lang", "assets", "packs"];
const zipPath = path.join(dist, "genesys-rpg.zip");
fs.rmSync(zipPath, { force: true });
fs.writeFileSync(manifestPath, JSON.stringify(release, null, 2) + "\n");
try {
  execFileSync("zip", ["-r", "-q", "-X", zipPath, ...INCLUDE, "-x", "packs/*/LOCK", "packs/*/LOG", "packs/*/LOG.old"], { cwd: ROOT });
} finally {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

const size = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(2);
console.log(`✓ ${path.relative(ROOT, zipPath)} (${size} МБ), версия ${manifest.version}, тег ${tag}`);
console.log(`  manifest: ${manifest.manifest}`);
console.log(`  download: ${manifest.download}`);
