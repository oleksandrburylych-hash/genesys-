import { GENESYS, SYSTEM_ID } from "../config.mjs";
import { ADVENTURES, getAdventure, WORLDS } from "../worlds.mjs";

/** Путь к плашке типа приключения. */
export function adventureImg(adventure) {
  return `systems/${SYSTEM_ID}/assets/icons/gi/adventure/${adventure.icon ?? "scroll-unfurled"}.svg`;
}

/** Ключи приключений, разрешённых ведущим (пусто — не настроено, доступны все). */
export function enabledAdventureKeys() {
  let keys = [];
  try { keys = game.settings.get(SYSTEM_ID, "adventures") ?? []; } catch { /* нет настройки */ }
  return Array.isArray(keys) ? keys.filter(Boolean) : [];
}

/** Приключения, из которых игрок выбирает в мастере создания персонажа. */
export function availableAdventures() {
  const keys = enabledAdventureKeys();
  const list = keys.length ? keys : Object.keys(ADVENTURES);
  return list.map(k => getAdventure(k));
}

/** Подпись миров документа. */
export function worldLabels(worlds = []) {
  const all = Object.keys(WORLDS);
  if (!worlds.length || all.every(w => worlds.includes(w))) return [{ key: "any", label: game.i18n.localize("GENESYS.Worlds.Any"), color: "#6b5a3a" }];
  return worlds.filter(w => WORLDS[w]).map(w => ({ key: w, label: WORLDS[w].label, color: WORLDS[w].color }));
}

/** Ключи навыков приключения (в порядке набора). */
export function adventureSkillKeys(adventure) {
  const preset = adventure.skills ?? "all";
  let keys;
  const explicit = GENESYS.presetSkills?.[preset];
  if (explicit) keys = [...explicit];
  else keys = GENESYS.defaultSkills
    .filter(s => preset === "all" || s.settings.includes("all") || s.settings.includes(preset))
    .map(s => s.key);
  for (const k of adventure.extraSkills ?? []) if (!keys.includes(k)) keys.push(k);
  return keys;
}

/**
 * Правило «магические навыки — только карьерные» (Realms of Terrinoth, с. 116; в Core — вариант из врезки на с. 212).
 * Настройка мира: auto — только в Терриноте, always — всегда, never — никогда.
 */
export function magicCareerOnly(adventureKey) {
  let mode = "auto";
  try { mode = game.settings.get(SYSTEM_ID, "magicCareerOnly"); } catch { /* нет настройки */ }
  if (mode === "always") return true;
  if (mode === "never") return false;
  const keys = adventureKey ? [adventureKey] : enabledAdventureKeys();
  return keys.length > 0 && keys.every(k => getAdventure(k).worlds[0] === "terrinoth");
}

/** Ключ книги по строке source документа. */
export function sourceKey(doc) {
  const source = doc?.system?.source ?? "";
  return Object.entries(GENESYS.sources).find(([, cfg]) => source.startsWith(cfg.match))?.[0] ?? null;
}

/** Выключенные ведущим книги и модули. */
export function disabledSources() {
  try { return game.settings.get(SYSTEM_ID, "disabledSources") ?? GENESYS.defaultDisabledSources; }
  catch { return GENESYS.defaultDisabledSources ?? []; }
}

/** Включён ли модуль/книга. */
export function sourceEnabled(key) { return !disabledSources().includes(key); }

/** Разрешён ли документ включёнными книгами и модулями. */
export function docAllowed(doc) {
  const key = sourceKey(doc);
  return !key || sourceEnabled(key);
}
