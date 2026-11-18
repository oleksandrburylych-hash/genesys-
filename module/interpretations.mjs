import { SYSTEM_ID, SYSTEM_PATH } from "./config.mjs";
import { getAdventure } from "./worlds.mjs";

/**
 * Толкования символов: что могут значить преимущество, осложнение, триумф и крах в проверке конкретного навыка.
 * По 10 вариантов на каждый вид исхода, для трёх эпох. Тексты — module/data/interpretations/<навык>.json.
 */

export const OUTCOMES = ["advantage", "threat", "triumph", "despair"];

export const ERAS = {
  medieval: { label: "GENESYS.Interp.Era.medieval", icon: "fa-solid fa-chess-rook" },
  modern: { label: "GENESYS.Interp.Era.modern", icon: "fa-solid fa-city" },
  future: { label: "GENESYS.Interp.Era.future", icon: "fa-solid fa-rocket" }
};

/** Навыки справочника по группам (варианты ближнего/дальнего боя сведены к одному). */
export const INTERP_SKILLS = {
  general: ["athletics", "coordination", "resilience", "stealth", "perception", "vigilance", "survival", "streetwise", "cool", "discipline",
    "medicine", "mechanics", "computers", "alchemy", "astrocartography", "operating", "driving", "piloting", "riding", "skulduggery"],
  combat: ["brawl", "melee", "ranged", "gunnery"],
  social: ["charm", "coercion", "deception", "leadership", "negotiation"],
  knowledge: ["knowledge"],
  magic: ["arcana", "divine", "primal"]
};

const ALIAS = { meleeLight: "melee", meleeHeavy: "melee", rangedLight: "ranged", rangedHeavy: "ranged" };
export const interpKey = key => ALIAS[key] ?? key;

/** Эпоха по миру: фэнтези и стимпанк — средневековье, современные и постапокалиптические — наше время, фантастика — будущее. */
const WORLD_ERA = { fantasy: "medieval", mythic: "medieval", terrinoth: "medieval", steampunk: "medieval",
  weirdwar: "modern", modern: "modern", monster: "modern", postapoc: "modern", zombie: "modern", scifi: "future", spaceopera: "future" };

export function eraForAdventure(adventureKey) {
  const worlds = getAdventure(adventureKey)?.worlds ?? [];
  const counts = {};
  for (const w of worlds) if (WORLD_ERA[w]) counts[WORLD_ERA[w]] = (counts[WORLD_ERA[w]] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "medieval";
}

const cache = new Map();

/** Загрузить толкования навыка (с кешем). @returns {Promise<object|null>} { key, eras: { era: { advantage: [] … } } } */
export async function loadInterpretations(skillKey) {
  const key = interpKey(skillKey);
  if (cache.has(key)) return cache.get(key);
  let data = null;
  try {
    const res = await fetch(`${SYSTEM_PATH}/module/data/interpretations/${key}.json`);
    if (res.ok) data = await res.json();
  } catch (err) { console.warn(`${SYSTEM_ID} | толкования ${key}`, err); }
  cache.set(key, data);
  return data;
}

/** n случайных разных вариантов. */
export function pickRandom(list, n = 1) {
  const pool = [...(list ?? [])];
  const out = [];
  while (pool.length && out.length < n) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

/** Сообщение в чат с вариантами толкования. */
export async function postInterpretation({ skillKey, era, outcome, texts, whisper = true }) {
  const L = k => game.i18n.localize(k);
  const esc = foundry.utils.escapeHTML;
  const skill = L(`GENESYS.Skill.${interpKey(skillKey)}`);
  const content = `<div class="genesys interp-card ${outcome}">
    <h4><span class="genesys-symbol ${outcome}"></span> ${esc(L(`GENESYS.Symbol.${outcome}`))} · ${esc(skill)} <small>${esc(L(ERAS[era]?.label ?? ""))}</small></h4>
    <ul>${texts.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>`;
  return ChatMessage.implementation.create({
    content, speaker: { alias: L("GENESYS.Interp.Title") },
    whisper: whisper ? game.users.filter(u => u.isGM).map(u => u.id) : []
  });
}

/** Эпоха текущей игры для подсказок из чата: выбранная в ширме, иначе по первому включённому приключению. */
export function currentEra() {
  try {
    const saved = game.settings.get(SYSTEM_ID, "interpEra");
    if (saved) return saved;
  } catch { /* настройки нет */ }
  let adv = "all";
  try { adv = game.settings.get(SYSTEM_ID, "adventures")?.[0] ?? "all"; } catch { /* нет */ }
  return eraForAdventure(adv);
}
