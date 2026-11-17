import { GENESYS, SYSTEM_ID } from "../config.mjs";
import { StoryPointsTracker } from "../apps/story-points.mjs";

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

  game.settings.register(SYSTEM_ID, "storyPoints", {
    scope: "world",
    config: false,
    type: Object,
    default: { player: 0, gm: 0 },
    onChange: () => StoryPointsTracker.refresh()
  });
}
