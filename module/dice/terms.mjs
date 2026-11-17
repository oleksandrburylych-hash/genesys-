/**
 * Нарративные кубики Genesys.
 * Каждая грань кодируется строкой символов:
 *   s — успех, a — преимущество, R — триумф,
 *   f — провал, t — угроза, D — отчаяние.
 */

export const SYMBOL_CODES = {
  s: "success",
  a: "advantage",
  R: "triumph",
  f: "failure",
  t: "threat",
  D: "despair"
};

const DiceTerm = foundry.dice.terms.DiceTerm;

/** Базовый класс нарративного кубика. */
export class GenesysDie extends DiceTerm {
  /** Ключ кубика в GENESYS.dice. */
  static DIE_KEY = "";
  /** Грани кубика (индекс = результат − 1). */
  static FACES = [];

  constructor(termData = {}) {
    super(termData);
    this.faces = this.constructor.FACES.length;
  }

  /** Символы на выпавшей грани. */
  static symbolsFor(result) {
    return this.FACES[result - 1] ?? "";
  }

  /** @override */
  getResultLabel(result) {
    const code = this.constructor.symbolsFor(result.result);
    return symbolsToHTML(code) || "&nbsp;";
  }

  /** @override */
  getResultCSS(result) {
    return ["genesys-die", this.constructor.DIE_KEY, result.active ? null : "discarded"];
  }

  /** @override */
  get total() {
    // Числовой «итог» у нарративных кубиков бессмыслен — считаем по символам в GenesysRoll.
    return 0;
  }

  /** Подсчёт символов по всем активным результатам терма. */
  countSymbols(counts = emptyCounts()) {
    for (const r of this.results) {
      if (!r.active) continue;
      for (const ch of this.constructor.symbolsFor(r.result)) {
        const key = SYMBOL_CODES[ch];
        if (key) counts[key] += 1;
      }
    }
    return counts;
  }
}

export class BoostDie extends GenesysDie {
  static DENOMINATION = "b";
  static DIE_KEY = "boost";
  static FACES = ["", "", "s", "sa", "aa", "a"];
}

export class SetbackDie extends GenesysDie {
  static DENOMINATION = "s";
  static DIE_KEY = "setback";
  static FACES = ["", "", "f", "f", "t", "t"];
}

export class AbilityDie extends GenesysDie {
  static DENOMINATION = "a";
  static DIE_KEY = "ability";
  static FACES = ["", "s", "s", "ss", "a", "a", "sa", "aa"];
}

export class DifficultyDie extends GenesysDie {
  static DENOMINATION = "i";
  static DIE_KEY = "difficulty";
  static FACES = ["", "f", "ff", "t", "t", "t", "tt", "ft"];
}

export class ProficiencyDie extends GenesysDie {
  static DENOMINATION = "p";
  static DIE_KEY = "proficiency";
  static FACES = ["", "s", "s", "ss", "ss", "a", "sa", "sa", "sa", "aa", "aa", "R"];
}

export class ChallengeDie extends GenesysDie {
  static DENOMINATION = "h";
  static DIE_KEY = "challenge";
  static FACES = ["", "f", "f", "ff", "ff", "t", "t", "ft", "ft", "tt", "tt", "D"];
}

export const DICE_CLASSES = [ProficiencyDie, AbilityDie, BoostDie, ChallengeDie, DifficultyDie, SetbackDie];

export function emptyCounts() {
  return { success: 0, advantage: 0, triumph: 0, failure: 0, threat: 0, despair: 0 };
}

/** HTML-иконка одного символа. */
export function symbolHTML(key) {
  return `<span class="genesys-symbol ${key}" data-tooltip="GENESYS.Symbol.${key}"></span>`;
}

/** Строка кодов → HTML иконок. */
export function symbolsToHTML(code) {
  return [...code].map(ch => SYMBOL_CODES[ch] ? symbolHTML(SYMBOL_CODES[ch]) : "").join("");
}

/** Зарегистрировать кубики в CONFIG.Dice. */
export function registerDice() {
  for (const cls of DICE_CLASSES) {
    CONFIG.Dice.terms[cls.DENOMINATION] = cls;
    CONFIG.Dice.termTypes[cls.name] = cls;
  }
}
