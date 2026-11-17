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
