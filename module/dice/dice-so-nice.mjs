import { SYSTEM_ID, SYSTEM_PATH } from "../config.mjs";
import { DICE_CLASSES } from "./terms.mjs";

/** Цвета и форма кубиков для Dice So Nice. */
const STYLE = {
  boost: { background: "#8ad6f6", edge: "#4aa5d3", variant: "light", shape: "d6", material: "glass" },
  setback: { background: "#2c2c2e", edge: "#0b0b0c", variant: "dark", shape: "d6", material: "plastic" },
  ability: { background: "#3db34c", edge: "#23792f", variant: "light", shape: "d8", material: "plastic" },
  difficulty: { background: "#6b37a2", edge: "#3f1e62", variant: "dark", shape: "d8", material: "plastic" },
  proficiency: { background: "#f6c41a", edge: "#c48f00", variant: "light", shape: "d12", material: "metal" },
  challenge: { background: "#d3303a", edge: "#8c1a20", variant: "dark", shape: "d12", material: "metal" }
};

/** Код грани → файл картинки (assets/dice). Пустая грань — пробел. */
function faceLabel(code, variant) {
  if (!code) return " ";
  const file = code.length === 1 && code === code.toUpperCase() ? code + code.toLowerCase() : code;
  return `${SYSTEM_PATH}/assets/dice/${file}-${variant}.png`;
}

/**
 * Регистрация нарративных кубиков в Dice So Nice (если модуль установлен).
 * @param {object} dice3d  API модуля из хука diceSoNiceReady
 */
export function registerDiceSoNice(dice3d) {
  dice3d.addSystem({ id: SYSTEM_ID, name: "Genesys" }, "preferred");
  for (const cls of DICE_CLASSES) {
    const key = cls.DIE_KEY;
    const style = STYLE[key];
    const colorset = `${SYSTEM_ID}-${key}`;
    dice3d.addColorset({
      name: colorset,
      description: `Genesys: ${game.i18n.localize(`GENESYS.Dice.${key}`)}`,
      category: "Genesys",
      foreground: style.variant === "light" ? "#111111" : "#ffffff",
      background: style.background,
      outline: "none",
      edge: style.edge,
      material: style.material,
      visibility: "visible"
    }, "default");
    dice3d.addDicePreset({
      type: `d${cls.DENOMINATION}`,
      labels: cls.FACES.map(code => faceLabel(code, style.variant)),
      system: SYSTEM_ID,
      colorset
    }, style.shape);
  }
}
