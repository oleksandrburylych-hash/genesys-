/**
 * Сборка архива для установки в Foundry: dist/genesys-rpg.zip (файлы системы в корне архива)
 * и обновление ссылок manifest/download в system.json.
 *
 * Запуск: npm run build:release            (ветка по умолчанию — текущая git-ветка)
 *         BRANCH=main npm run build:release
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const REPO = "oleksandrburylych-hash/genesys-";
const branch = process.env.BRANCH || execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: ROOT }).toString().trim();
const raw = `https://raw.githubusercontent.com/${REPO}/${branch}`;

// 1) Ссылки в манифесте.
const manifestPath = path.join(ROOT, "system.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.url = `https://github.com/${REPO}`;
manifest.manifest = `${raw}/system.json`;
manifest.download = `${raw}/dist/genesys-rpg.zip`;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

// 2) Архив: только то, что нужно Foundry.
const INCLUDE = ["system.json", "genesys.mjs", "README.md", "module", "templates", "styles", "lang", "assets", "packs"];
const dist = path.join(ROOT, "dist");
fs.mkdirSync(dist, { recursive: true });
const zipPath = path.join(dist, "genesys-rpg.zip");
fs.rmSync(zipPath, { force: true });
execFileSync("zip", ["-r", "-q", "-X", zipPath, ...INCLUDE, "-x", "packs/*/LOCK", "packs/*/LOG", "packs/*/LOG.old"], { cwd: ROOT });

const size = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(2);
console.log(`✓ ${path.relative(ROOT, zipPath)} (${size} МБ), версия ${manifest.version}`);
console.log(`  manifest: ${manifest.manifest}`);
console.log(`  download: ${manifest.download}`);
