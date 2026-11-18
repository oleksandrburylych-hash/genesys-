/**
 * Genesys RPG — система для Foundry VTT v14.
 * Точка входа: регистрация моделей данных, документов, листов, кубиков и настроек.
 */
import { GENESYS, SYSTEM_ID, TEMPLATES } from "./module/config.mjs";
import CharacterData from "./module/data/actor-character.mjs";
import AdversaryData from "./module/data/actor-adversary.mjs";
import VehicleData from "./module/data/actor-vehicle.mjs";
import { ITEM_MODELS } from "./module/data/items.mjs";
import { GenesysActor } from "./module/documents/actor.mjs";
import { GenesysItem } from "./module/documents/item.mjs";
import { GenesysCombatant } from "./module/documents/combatant.mjs";
import { registerDice } from "./module/dice/terms.mjs";
import { GenesysRoll } from "./module/dice/roll.mjs";
import { DicePool } from "./module/dice/pool.mjs";
import { DicePoolDialog } from "./module/apps/dice-pool-dialog.mjs";
import { StoryPointsTracker } from "./module/apps/story-points.mjs";
import { GenesysCharacterSheet } from "./module/sheets/character-sheet.mjs";
import { GenesysAdversarySheet } from "./module/sheets/adversary-sheet.mjs";
import { GenesysVehicleSheet } from "./module/sheets/vehicle-sheet.mjs";
import { registerDiceSoNice } from "./module/dice/dice-so-nice.mjs";
import { SpellCastDialog } from "./module/apps/spell-cast-dialog.mjs";
import { GenesysItemSheet } from "./module/sheets/item-sheet.mjs";
import { registerSettings } from "./module/helpers/settings.mjs";
import { registerHandlebarsHelpers, preloadTemplates, guardLocalizeHelper } from "./module/helpers/handlebars.mjs";
import { registerChatHandlers, registerReactionSocket, loadSpendingTables, loadCreationData } from "./module/chat.mjs";
import { registerCombatSocket } from "./module/combat/combat.mjs";
import { registerCombatHooks } from "./module/combat/initiative.mjs";
import { registerConditionHooks } from "./module/combat/conditions.mjs";
import { WorldSetup, newSession } from "./module/apps/world-setup.mjs";
import { GMScreen } from "./module/apps/gm-screen.mjs";
import { Workshop } from "./module/apps/workshop.mjs";
import { SocialEncounter, registerSocial } from "./module/apps/social.mjs";
import { registerLoot } from "./module/loot.mjs";
import { registerInjuryHooks } from "./module/injuries.mjs";
import { registerMerchant } from "./module/merchant.mjs";
import { registerTokenPanel } from "./module/apps/token-panel.mjs";
import { registerGearHooks } from "./module/gear.mjs";
import { registerCompendiumFilter } from "./module/helpers/compendium-filter.mjs";
import { openApp } from "./module/helpers/safe.mjs";
import * as worlds from "./module/worlds.mjs";

/* -------------------------------------------- */
/*  Init                                        */
/* -------------------------------------------- */

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | Инициализация системы Genesys`);

  CONFIG.GENESYS = GENESYS;

  // Публичный API для макросов: game.genesys.roll({ability: 2, difficulty: 2})
  game.genesys = {
    config: GENESYS,
    worlds,
    DicePool,
    GenesysRoll,
    DicePoolDialog,
    SpellCastDialog,
    WorldSetup,
    GMScreen,
    Workshop,
    SocialEncounter,
    fearCheck: async () => (await import("./module/apps/fear.mjs")).promptFearCheck(),
    newSession,
    StoryPointsTracker,
    /** Открыть окно броска с заданным пулом. */
    roll: (pool = {}, options = {}) => DicePoolDialog.prompt({ pool: new DicePool(pool), ...options }),
    /** Бросок навыка выбранного/назначенного персонажа по имени или ключу. */
    rollSkill: (skill, options = {}) => {
      const actor = canvas?.tokens?.controlled[0]?.actor ?? game.user.character;
      if (!actor) return ui.notifications.warn("GENESYS.Warn.NoActor", { localize: true });
      return actor.rollSkill(skill, options);
    }
  };

  // Документы
  CONFIG.Actor.documentClass = GenesysActor;
  CONFIG.Item.documentClass = GenesysItem;
  CONFIG.Combatant.documentClass = GenesysCombatant;

  // Модели данных
  CONFIG.Actor.dataModels = { character: CharacterData, adversary: AdversaryData, vehicle: VehicleData };
  CONFIG.Item.dataModels = ITEM_MODELS;

  registerCompendiumFilter();

  // Теги миров и книга — в индексе компендиумов (быстрый отбор без загрузки документов).
  for (const cls of [CONFIG.Item, CONFIG.Actor]) {
    cls.compendiumIndexFields = [...new Set([...(cls.compendiumIndexFields ?? []), "system.worlds", "system.source"])];
  }

  // Отслеживаемые полоски токена
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["wounds", "strain"], value: [] },
    adversary: { bar: ["wounds", "strain"], value: [] },
    vehicle: { bar: ["hullTrauma", "systemStrain"], value: ["speed.value"] }
  };

  // Состояния (значки на токенах); «мёртв» — особое состояние поражения.
  CONFIG.statusEffects = GENESYS.statusEffects.map(s => ({ ...s }));
  CONFIG.specialStatusEffects.DEFEATED = "dead";

  // Кубики
  registerDice();
  CONFIG.Dice.rolls.push(GenesysRoll);
  CONFIG.Combat.initiative = { formula: "1da", decimals: 2 };

  // Листы
  const { DocumentSheetConfig } = foundry.applications.apps;
  DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, GenesysCharacterSheet, {
    types: ["character"], makeDefault: true, label: "GENESYS.Sheet.Character"
  });
  DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, GenesysAdversarySheet, {
    types: ["adversary"], makeDefault: true, label: "GENESYS.Sheet.Adversary"
  });
  DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, GenesysVehicleSheet, {
    types: ["vehicle"], makeDefault: true, label: "GENESYS.Sheet.Vehicle"
  });
  DocumentSheetConfig.registerSheet(Item, SYSTEM_ID, GenesysItemSheet, {
    makeDefault: true, label: "GENESYS.Sheet.Item"
  });

  registerSettings();
  registerHandlebarsHelpers();
  return preloadTemplates();
});

/* -------------------------------------------- */
/*  Ready                                       */
/* -------------------------------------------- */

Hooks.once("setup", () => { guardLocalizeHelper(); loadSpendingTables(); loadCreationData(); });

Hooks.once("ready", () => {
  StoryPointsTracker.initialize();
  registerCombatSocket();
  registerCombatHooks();
  registerConditionHooks();
  registerReactionSocket();
  registerSocial();
  registerLoot();
  registerInjuryHooks();
  registerGearHooks();
  registerMerchant();
  registerTokenPanel();
  // Боевые карты: в Foundry v14 фон сцены живёт в её уровне — если перенос не случился, дописать.
  if (game.user.isActiveGM) repairZoneMaps().catch(err => console.warn(`${SYSTEM_ID} |`, err));
  // Архетипы, импортированные в мир без особых способностей (старые версии), — дополнить из компендиума.
  if (game.user.isActiveGM) repairWorldArchetypes().catch(err => console.warn(`${SYSTEM_ID} |`, err));
  // Первый запуск мира: мастер настройки для ведущего.
  if (game.user.isGM && !game.settings.get(SYSTEM_ID, "worldSetupDone")) openApp(() => new WorldSetup(), "WorldSetup");
  console.log(`${SYSTEM_ID} | Genesys RPG ${game.system.version} готова`);
  if (game.settings.get(SYSTEM_ID, "showStoryPoints")) new StoryPointsTracker().render({ force: true });
});

/** Фон боевых карт (сцены компендиума «Боевые зоны») в уровне сцены v14. */
async function repairZoneMaps() {
  for (const scene of game.scenes ?? []) {
    const f = scene.getFlag?.(SYSTEM_ID, "zoneMap") ? scene.flags[SYSTEM_ID] : null;
    if (!f?.bg) continue;
    const level = scene.levels?.contents?.[0] ?? scene.firstLevel;
    if (level && !level.background?.src) await level.update({ "background.src": f.bg, "background.color": f.bgColor ?? "#000000" });
    else if (!level && !scene.background?.src) await scene.update({ "background.src": f.bg });
  }
}
Hooks.on("createScene", scene => { if (game.user.isActiveGM && scene.getFlag?.(SYSTEM_ID, "zoneMap")) repairZoneMaps().catch(() => {}); });

/** Дополнить способности у архетипов мира по одноимённым архетипам компендиума. */
async function repairWorldArchetypes() {
  const broken = game.items?.filter?.(i => i.type === "archetype" && !(i.system.abilities?.length)) ?? [];
  if (!broken.length) return;
  const pack = game.packs.get(`${SYSTEM_ID}.archetypes`);
  if (!pack) return;
  const docs = await pack.getDocuments();
  const updates = broken.map(i => ({ _id: i.id, abilities: docs.find(d => d.name === i.name)?.system.abilities ?? [] }))
    .filter(u => u.abilities.length).map(u => ({ _id: u._id, "system.abilities": u.abilities }));
  if (updates.length) await Item.implementation.updateDocuments(updates);
}

/* -------------------------------------------- */
/*  Dice So Nice                                */
/* -------------------------------------------- */

Hooks.once("diceSoNiceReady", dice3d => registerDiceSoNice(dice3d));

/* -------------------------------------------- */
/*  Кнопки на панели сцены                      */
/* -------------------------------------------- */

Hooks.on("getSceneControlButtons", controls => {
  // Группа токенов: в v13+ — controls.tokens; на всякий случай — первая доступная группа.
  const group = controls.tokens ?? controls.token ?? Object.values(controls ?? {}).find(c => c?.tools);
  const tools = group?.tools;
  if (!tools) return;
  const order = Object.keys(tools).length;
  tools.genesysDice = {
    name: "genesysDice",
    title: "GENESYS.Roll.Title",
    icon: "fa-solid fa-dice-d20",
    order: order + 1,
    button: true,
    onChange: () => {
      const actor = canvas?.tokens?.controlled[0]?.actor ?? game.user.character ?? null;
      DicePoolDialog.prompt({ pool: new DicePool({ difficulty: 2 }), actor });
    }
  };
  if (game.user.isGM) tools.genesysSetup = {
    name: "genesysSetup",
    title: "GENESYS.Setup.Title",
    icon: "fa-solid fa-wand-magic-sparkles",
    order: order + 3,
    button: true,
    onChange: () => openApp(() => new WorldSetup(), "WorldSetup")
  };
  if (game.user.isGM) tools.genesysGMScreen = {
    name: "genesysGMScreen",
    title: "GENESYS.GM.Title",
    icon: "fa-solid fa-book-skull",
    order: order + 4,
    button: true,
    onChange: () => {
      const open = foundry.applications.instances?.get("genesys-gm-screen");
      if (open) open.close(); else openApp(() => new GMScreen(), "GMScreen");
    }
  };
  tools.genesysStoryPoints = {
    name: "genesysStoryPoints",
    title: "GENESYS.StoryPoints.Title",
    icon: "fa-solid fa-book-open",
    order: order + 2,
    button: true,
    onChange: () => StoryPointsTracker.toggle()
  };
});

/* -------------------------------------------- */
/*  Вход в мастер настройки                     */
/* -------------------------------------------- */

/** Кнопка во вкладке «Настройки» боковой панели. */
Hooks.on("renderSettings", (app, html) => {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(".genesys-setup-button")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "genesys-setup-button";
  button.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${game.i18n.localize("GENESYS.Setup.Title")}`;
  button.addEventListener("click", () => openApp(() => new WorldSetup(), "WorldSetup"));
  const anchor = root.querySelector("section, .settings, .flexcol") ?? root;
  anchor.prepend(button);
});

/** Команда в чате: /genesys — мастер настройки мира. */
Hooks.on("chatMessage", (log, message) => {
  if (!/^\/(genesys|генезис)\b/i.test(message.trim())) return;
  if (!game.user.isGM) ui.notifications.warn("GENESYS.Setup.GMOnly", { localize: true });
  else openApp(() => new WorldSetup(), "WorldSetup");
  return false;
});

/* -------------------------------------------- */
/*  Чат: кнопки на карточке броска              */
/* -------------------------------------------- */

registerChatHandlers();

export { GENESYS, TEMPLATES };
