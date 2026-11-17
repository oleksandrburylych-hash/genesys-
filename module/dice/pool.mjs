import { GENESYS } from "../config.mjs";

const KEYS = ["proficiency", "ability", "boost", "challenge", "difficulty", "setback"];

/**
 * Пул нарративных кубиков и операции над ним по правилам Genesys.
 */
export class DicePool {
  constructor(data = {}) {
    for (const k of KEYS) this[k] = Math.max(0, Number(data[k]) || 0);
  }

  static get KEYS() { return KEYS; }

  /**
   * Пул для проверки навыка: большее из (характеристика, ранг) — зелёные,
   * меньшее из них — улучшается до жёлтых.
   */
  static fromSkill(characteristic = 0, rank = 0, difficulty = 2) {
    const pool = new DicePool({
      ability: Math.max(characteristic, rank) - Math.min(characteristic, rank),
      proficiency: Math.min(characteristic, rank),
      difficulty
    });
    return pool;
  }

  /** Улучшить положительные кубики n раз (зелёный → жёлтый; если зелёных нет — добавить зелёный). */
  upgradeAbility(n = 1) {
    for (let i = 0; i < n; i++) {
      if (this.ability > 0) { this.ability--; this.proficiency++; }
      else this.ability++;
    }
    return this;
  }

  /** Ухудшить положительные кубики (жёлтый → зелёный). */
  downgradeAbility(n = 1) {
    for (let i = 0; i < n; i++) {
      if (this.proficiency > 0) { this.proficiency--; this.ability++; }
    }
    return this;
  }

  /** Улучшить сложность (фиолетовый → красный; если фиолетовых нет — добавить фиолетовый). */
  upgradeDifficulty(n = 1) {
    for (let i = 0; i < n; i++) {
      if (this.difficulty > 0) { this.difficulty--; this.challenge++; }
      else this.difficulty++;
    }
    return this;
  }

  /** Ухудшить сложность (красный → фиолетовый). */
  downgradeDifficulty(n = 1) {
    for (let i = 0; i < n; i++) {
      if (this.challenge > 0) { this.challenge--; this.difficulty++; }
    }
    return this;
  }

  /** Установить сложность (количество фиолетовых), сохранив уже улучшенные красные. */
  setDifficulty(n) {
    const total = Math.max(0, Number(n) || 0);
    this.challenge = Math.min(this.challenge, total);
    this.difficulty = total - this.challenge;
    return this;
  }

  get isEmpty() { return KEYS.every(k => this[k] === 0); }

  /** Формула Foundry: 2da+1dp+2di… */
  get formula() {
    const parts = [];
    for (const k of KEYS) {
      if (this[k] > 0) parts.push(`${this[k]}d${GENESYS.dice[k].denomination}`);
    }
    return parts.join(" + ") || "0";
  }

  toObject() {
    return Object.fromEntries(KEYS.map(k => [k, this[k]]));
  }

  clone() { return new DicePool(this.toObject()); }

  /** Массив для отображения иконок пула: [{key, label}] */
  get display() {
    const list = [];
    for (const k of KEYS) for (let i = 0; i < this[k]; i++) list.push({ key: k, label: GENESYS.dice[k].label });
    return list;
  }
}
