import { GENESYS, TEMPLATES } from "../config.mjs";
import { DicePool } from "../dice/pool.mjs";
import { GenesysRoll } from "../dice/roll.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Окно сборки пула кубиков перед броском.
 * Использование: await DicePoolDialog.prompt({ pool, label, actor, rollOptions })
 */
export class DicePoolDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ pool, label, actor, rollOptions = {}, notes = [], dodge = null, ...options } = {}) {
    super(options);
    /** Уклонение цели: { rank, uuid, name } — сколько ступеней усилить, решает цель (вслух за столом). */
    this.dodge = dodge;
    this.dodgeUsed = 0;
    this.notes = notes;
    this.storyPointUsed = false;
    this.pool = pool instanceof DicePool ? pool : new DicePool(pool);
    this.label = label ?? "";
    this.actor = actor ?? null;
    this.rollOptions = rollOptions;
    this.messageMode = game.settings.get("core", "messageMode");
  }

  static DEFAULT_OPTIONS = {
    classes: ["genesys", "dice-pool-dialog"],
    tag: "form",
    window: { title: "GENESYS.Roll.Title", icon: "fa-solid fa-dice-d20", resizable: false },
    position: { width: 460 },
    actions: {
      add: DicePoolDialog.#onAdd,
      remove: DicePoolDialog.#onRemove,
      upgrade: DicePoolDialog.#onUpgrade,
      downgrade: DicePoolDialog.#onDowngrade,
      setDifficulty: DicePoolDialog.#onSetDifficulty,
      roll: DicePoolDialog.#onRoll,
      storyPoint: DicePoolDialog.#onStoryPoint,
      dodge: DicePoolDialog.#onDodge
    },
    form: { handler: DicePoolDialog.#onSubmit, submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = {
    form: { template: `${TEMPLATES}/dialog/dice-pool.hbs` }
  };

  /** @override */
  get title() {
    const base = game.i18n.localize("GENESYS.Roll.Title");
    return this.label ? `${base}: ${this.label}` : base;
  }

  /** @override */
  async _prepareContext(options) {
    const modes = CONFIG.ChatMessage?.modes ?? {};
    return {
      label: this.label,
      pool: this.pool.display,
      rows: DicePool.KEYS.map(k => ({ key: k, label: GENESYS.dice[k].label, count: this.pool[k] })),
      difficulties: Object.entries(GENESYS.difficulties).map(([n, label]) => ({
        value: Number(n), label, active: (this.pool.difficulty + this.pool.challenge) === Number(n)
      })),
      messageModes: Object.entries(modes).map(([key, cfg]) => ({
        key, label: typeof cfg === "string" ? cfg : cfg.label, selected: key === this.messageMode
      })),
      empty: this.pool.isEmpty,
      notes: this.notes,
      storyPoints: this.#storyPointInfo(),
      dodge: this.dodge ? {
        name: this.dodge.name, used: this.dodgeUsed,
        options: Array.from({ length: this.dodge.rank }, (_, i) => ({ n: i + 1 }))
      } : null
    };
  }

  /** Можно ли потратить очко сюжета (одно за проверку). */
  #storyPointInfo() {
    let points;
    try { points = game.settings.get("genesys-rpg", "storyPoints"); } catch { return null; }
    const gm = game.user.isGM;
    const available = gm ? points.gm : points.player;
    return { gm, available, used: this.storyPointUsed, can: !this.storyPointUsed && available > 0 };
  }

  /**
   * Потратить очко сюжета: игрок усиливает свою кость способности,
   * ведущий — сложность проверки (очко переходит к другой стороне).
   */
  static async #onStoryPoint() {
    const info = this.#storyPointInfo();
    if (!info?.can) return;
    const { StoryPointsTracker } = await import("./story-points.mjs");
    StoryPointsTracker.request(info.gm ? "useGM" : "usePlayer");
    if (info.gm) this.pool.upgradeDifficulty(); else this.pool.upgradeAbility();
    this.storyPointUsed = true;
    this.notes = [...this.notes, game.i18n.localize(info.gm ? "GENESYS.StoryPoints.UpgradedDifficulty" : "GENESYS.StoryPoints.UpgradedAbility")];
    this.render();
  }

  /** Цель уклоняется: усилить сложность на n, цель получит n усталости при броске. */
  static #onDodge(event, target) {
    if (!this.dodge || this.dodgeUsed) return;
    const n = Math.min(Number(target.dataset.n) || 1, this.dodge.rank);
    this.pool.upgradeDifficulty(n);
    this.dodgeUsed = n;
    this.notes = [...this.notes, game.i18n.format("GENESYS.Reaction.DodgeUsed", { name: this.dodge.name, value: n })];
    this.render();
  }

  static #onAdd(event, target) {
    this.pool[target.dataset.die] += 1;
    this.render();
  }

  static #onRemove(event, target) {
    const k = target.dataset.die;
    this.pool[k] = Math.max(0, this.pool[k] - 1);
    this.render();
  }

  static #onUpgrade(event, target) {
    if (target.dataset.side === "difficulty") this.pool.upgradeDifficulty();
    else this.pool.upgradeAbility();
    this.render();
  }

  static #onDowngrade(event, target) {
    if (target.dataset.side === "difficulty") this.pool.downgradeDifficulty();
    else this.pool.downgradeAbility();
    this.render();
  }

  static #onSetDifficulty(event, target) {
    this.pool.setDifficulty(Number(target.dataset.value));
    this.render();
  }

  static async #onSubmit(event, form, formData) {
    const data = formData.object;
    if (data.messageMode) this.messageMode = data.messageMode;
  }

  static async #onRoll() {
    if (this.pool.isEmpty) return ui.notifications.warn("GENESYS.Roll.EmptyPool", { localize: true });
    const roll = await DicePoolDialog.rollPool(this.pool, {
      label: this.label, actor: this.actor, messageMode: this.messageMode, rollOptions: this.rollOptions
    });
    if (this.dodgeUsed && this.dodge) {
      const { actOnActor } = await import("../combat/combat.mjs");
      const target = await fromUuid(this.dodge.uuid);
      if (target) await actOnActor(target, "adjust", { strain: this.dodgeUsed });
    }
    this._resolve?.(roll);
    this._resolve = null;
    await this.close();
  }

  /** @override */
  _onClose(options) {
    super._onClose(options);
    this._resolve?.(null);
  }

  /**
   * Открыть окно и дождаться броска.
   * @returns {Promise<GenesysRoll|null>}
   */
  static prompt(config = {}) {
    return new Promise(resolve => {
      const app = new this(config);
      app._resolve = resolve;
      app.render({ force: true });
    });
  }

  /** Бросить пул без окна и отправить в чат. */
  static async rollPool(pool, { label = "", actor = null, messageMode, rollOptions = {}, flavor } = {}) {
    const roll = GenesysRoll.fromPool(pool, { label, ...rollOptions });
    await roll.evaluate();
    const speaker = ChatMessage.implementation.getSpeaker({ actor });
    const options = messageMode ? { messageMode } : {};
    await roll.toMessage({ speaker, flavor }, options);
    return roll;
  }
}
