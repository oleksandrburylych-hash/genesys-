import { GENESYS, SYSTEM_ID } from "../config.mjs";
import { StoryPointsTracker } from "../apps/story-points.mjs";
import { WorldSetup } from "../apps/world-setup.mjs";

export function registerSettings() {
  game.settings.register(SYSTEM_ID, "skillPreset", {
    name: "GENESYS.Settings.SkillPreset.name",
    hint: "GENESYS.Settings.SkillPreset.hint",
    scope: "world",
    config: true,
    type: String,
    choices: GENESYS.skillPresets,
    default: "all"
  });

  game.settings.register(SYSTEM_ID, "initiativeSkill", {
    name: "GENESYS.Settings.InitiativeSkill.name",
    hint: "GENESYS.Settings.InitiativeSkill.hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      vigilance: "GENESYS.Skill.vigilance",
      cool: "GENESYS.Skill.cool"
    },
    default: "vigilance"
  });

  game.settings.register(SYSTEM_ID, "showStoryPoints", {
    name: "GENESYS.Settings.ShowStoryPoints.name",
    hint: "GENESYS.Settings.ShowStoryPoints.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  // Пороги диапазонов дистанции (в единицах сетки сцены).
  for (const band of ["engaged", "short", "medium", "long"]) {
    game.settings.register(SYSTEM_ID, `range.${band}`, {
      name: `GENESYS.Settings.Range.${band}`,
      hint: "GENESYS.Settings.Range.hint",
      scope: "world",
      config: true,
      type: Number,
      default: GENESYS.rangeThresholds[band]
    });
  }

  game.settings.register(SYSTEM_ID, "autoCritOnThreshold", {
    name: "GENESYS.Settings.AutoCrit.name",
    hint: "GENESYS.Settings.AutoCrit.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(SYSTEM_ID, "initiativeSlots", {
    name: "GENESYS.Settings.InitiativeSlots.name",
    hint: "GENESYS.Settings.InitiativeSlots.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(SYSTEM_ID, "worldSetupDone", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.registerMenu(SYSTEM_ID, "worldSetup", {
    name: "GENESYS.Setup.Title",
    label: "GENESYS.Setup.Open",
    hint: "GENESYS.Setup.MenuHint",
    icon: "fa-solid fa-wand-magic-sparkles",
    type: WorldSetup,
    restricted: true
  });

  game.settings.register(SYSTEM_ID, "storyPoints", {
    scope: "world",
    config: false,
    type: Object,
    default: { player: 0, gm: 0 },
    onChange: () => StoryPointsTracker.refresh()
  });
}
