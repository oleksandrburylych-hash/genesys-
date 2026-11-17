import { SYSTEM_ID, SYSTEM_PATH } from "../config.mjs";
import { DICE_CLASSES } from "./terms.mjs";

/** Цвета и форма кубиков для Dice So Nice. */
const STYLE = {
  boost: { background: "#8fd3f2", edge: "#5fa9cc", variant: "light", shape: "d6" },
  setback: { background: "#1c1c1c", edge: "#000000", variant: "dark", shape: "d6" },
  ability: { background: "#3aa845", edge: "#2b7d33", variant: "light", shape: "d8" },
  difficulty: { background: "#5b2d86", edge: "#3f1d5f", variant: "dark", shape: "d8" },
  proficiency: { background: "#f2c516", edge: "#c9a210", variant: "light", shape: "d12" },
  challenge: { background: "#c9282d", edge: "#951c20", variant: "dark", shape: "d12" }
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
      material: "plastic",
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
