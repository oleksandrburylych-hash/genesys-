/**
 * Genesys RPG — система для Foundry VTT v14.
 * Точка входа: регистрация моделей данных, документов, листов, кубиков и настроек.
 */
import { GENESYS, SYSTEM_ID, TEMPLATES } from "./module/config.mjs";
import CharacterData from "./module/data/actor-character.mjs";
import AdversaryData from "./module/data/actor-adversary.mjs";
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
import { GenesysItemSheet } from "./module/sheets/item-sheet.mjs";
import { registerSettings } from "./module/helpers/settings.mjs";
import { registerHandlebarsHelpers, preloadTemplates } from "./module/helpers/handlebars.mjs";

/* -------------------------------------------- */
/*  Init                                        */
/* -------------------------------------------- */

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | Инициализация системы Genesys`);

  CONFIG.GENESYS = GENESYS;

  // Публичный API для макросов: game.genesys.roll({ability: 2, difficulty: 2})
  game.genesys = {
    config: GENESYS,
    DicePool,
    GenesysRoll,
    DicePoolDialog,
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
  CONFIG.Actor.dataModels = { character: CharacterData, adversary: AdversaryData };
  CONFIG.Item.dataModels = ITEM_MODELS;

  // Отслеживаемые полоски токена
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["wounds", "strain"], value: [] },
    adversary: { bar: ["wounds", "strain"], value: [] }
  };

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

Hooks.once("ready", () => {
  StoryPointsTracker.initialize();
  if (game.settings.get(SYSTEM_ID, "showStoryPoints")) new StoryPointsTracker().render({ force: true });
});

/* -------------------------------------------- */
/*  Кнопки на панели сцены                      */
/* -------------------------------------------- */

Hooks.on("getSceneControlButtons", controls => {
  const tools = controls.tokens?.tools;
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
/*  Чат: кнопки на карточке броска              */
/* -------------------------------------------- */

Hooks.on("renderChatMessageHTML", (message, html) => {
  html.querySelectorAll("[data-genesys-action='applyCrit']").forEach(btn => {
    btn.addEventListener("click", async () => {
      const targets = canvas?.tokens?.controlled ?? [];
      if (!targets.length) return ui.notifications.warn("GENESYS.Warn.NoTokenSelected", { localize: true });
      for (const token of targets) {
        if (token.actor?.isOwner) await token.actor.rollCriticalInjury({ modifier: Number(btn.dataset.modifier) || 0 });
      }
    });
  });
  html.querySelectorAll("[data-genesys-action='applyDamage']").forEach(btn => {
    btn.addEventListener("click", async () => {
      const damage = Number(btn.dataset.damage) || 0;
      const targets = canvas?.tokens?.controlled ?? [];
      if (!targets.length) return ui.notifications.warn("GENESYS.Warn.NoTokenSelected", { localize: true });
      for (const token of targets) {
        const actor = token.actor;
        if (!actor?.isOwner) continue;
        const soak = actor.system.soak?.value ?? 0;
        const taken = Math.max(0, damage - soak);
        await actor.update({ "system.wounds.value": actor.system.wounds.value + taken });
        ui.notifications.info(game.i18n.format("GENESYS.Info.DamageApplied", { name: actor.name, damage: taken, soak }));
      }
    });
  });
});

export { GENESYS, TEMPLATES };
