import { TEMPLATES } from "../config.mjs";
import { GenesysDie, emptyCounts, symbolHTML } from "./terms.mjs";
import { DicePool } from "./pool.mjs";
import { spendingOptions } from "../chat.mjs";

/**
 * Бросок нарративных кубиков.
 * total = чистые успехи (успехи − провалы, триумф считается успехом, отчаяние — провалом).
 *
 * Дополнительные опции (this.options):
 *   label      — заголовок проверки («Восприятие», «Атака: Меч»)
 *   pool       — исходный пул (для отображения)
 *   initiative — бросок инициативы: total = успехи + преимущества/100
 *   weapon     — данные оружия для атаки { name, damage, crit, qualities }
 */
export class GenesysRoll extends Roll {
  static CHAT_TEMPLATE = `${TEMPLATES}/chat/roll.hbs`;

  /** Создать бросок из пула. */
  static fromPool(pool, options = {}) {
    const p = pool instanceof DicePool ? pool : new DicePool(pool);
    return new this(p.formula, {}, { ...options, pool: p.toObject() });
  }

  /** Сырые количества символов. */
  get symbols() {
    const counts = emptyCounts();
    for (const term of this.dice) {
      if (term instanceof GenesysDie) term.countSymbols(counts);
    }
    return counts;
  }

  /** Итог после взаимного сокращения. */
  get results() {
    const c = this.symbols;
    const successes = c.success + c.triumph;
    const failures = c.failure + c.despair;
    const net = successes - failures;
    const adv = c.advantage - c.threat;
    return {
      raw: c,
      success: Math.max(0, net),
      failure: Math.max(0, -net),
      advantage: Math.max(0, adv),
      threat: Math.max(0, -adv),
      triumph: c.triumph,
      despair: c.despair,
      netSuccess: net,
      netAdvantage: adv,
      isSuccess: net > 0
    };
  }

  /** @override */
  _evaluateTotal() {
    const r = this.results;
    if (this.options.initiative) return r.netSuccess + (r.netAdvantage / 100);
    return r.netSuccess;
  }

  /** @override */
  async render({ flavor, template = this.constructor.CHAT_TEMPLATE, isPrivate = false } = {}) {
    if (!this._evaluated) await this.evaluate({ allowInteractive: !isPrivate });
    const context = await this._prepareChatContext({ flavor, isPrivate });
    return foundry.applications.handlebars.renderTemplate(template, context);
  }

  async _prepareChatContext({ flavor, isPrivate }) {
    const r = this.results;
    const dice = [];
    for (const term of this.dice) {
      if (!(term instanceof GenesysDie)) continue;
      for (const result of term.results) {
        if (!result.active) continue;
        const code = term.constructor.symbolsFor(result.result);
        dice.push({ key: term.constructor.DIE_KEY, label: term.getResultLabel(result), n: [...code].length, i: dice.length,
          name: game.i18n.localize(`GENESYS.Dice.${term.constructor.DIE_KEY}`) });
      }
    }

    // Строка итоговых символов.
    const summary = [];
    const push = (key, n) => { for (let i = 0; i < n; i++) summary.push(symbolHTML(key)); };
    push("triumph", r.triumph);
    push("success", r.success);
    push("advantage", r.advantage);
    push("despair", r.despair);
    push("failure", r.failure);
    push("threat", r.threat);

    // Атака оружием: урон и возможность крита.
    let attack = null;
    const w = this.options.weapon;
    if (w && r.isSuccess) {
      // Триумф позволяет нанести крит всегда; преимуществами — если у атаки есть критическое значение.
      const critReady = r.triumph > 0 || (w.crit > 0 && r.advantage >= w.crit);
      attack = {
        name: w.name,
        damage: w.damage + r.success,
        crit: w.crit,
        critReady,
        critCount: (w.crit > 0 ? Math.floor(r.advantage / w.crit) : 0) + r.triumph,
        critModifier: (w.vicious ?? 0) * 10,
        qualities: w.qualities
      };
    }

    // Проверка страха (Core Rulebook, «Эффекты страха»): подходящий результат и кнопка применения.
    let fear = null;
    if (this.options.fear && !isPrivate) {
      const many = r.threat >= 3 || r.despair > 0;
      let key;
      if (!r.isSuccess) key = many ? "freeze" : (r.threat > 0 ? "flee" : "aversion");
      else if (r.threat > 0 && r.advantage === 0) key = "adrenaline";
      else if (r.triumph > 0) key = "fearless";
      else if (r.advantage > 0) key = "rally";
      else key = "steady";
      fear = { key, source: this.options.fear.source, apply: ["aversion", "freeze", "adrenaline"].includes(key) };
    }

    // Итог после взаимного сокращения: крупные плашки.
    const L = k => game.i18n.localize(k);
    const net = [["triumph", r.triumph], ["success", r.success], ["advantage", r.advantage], ["despair", r.despair], ["failure", r.failure], ["threat", r.threat]]
      .filter(([, v]) => v > 0).map(([key, value]) => ({ key, value, label: L(`GENESYS.Symbol.${key}`) }));
    const raw = r.raw ?? {};
    const rawText = ["success", "failure", "advantage", "threat", "triumph", "despair"].filter(k => raw[k]).map(k => `${L(`GENESYS.Symbol.${k}`)}: ${raw[k]}`).join(" · ");

    return {
      net, rawText,
      fear,
      isPrivate,
      flavor: isPrivate ? null : (flavor ?? this.options.flavor),
      label: isPrivate ? null : this.options.label,
      dice: isPrivate ? [] : dice,
      summary: summary.join(""),
      results: r,
      outcome: r.isSuccess ? "success" : "failure",
      initiative: this.options.initiative ? this.total.toFixed(2) : null,
      target: isPrivate ? null : this.options.target,
      activeQualities: (!isPrivate && w && r.isSuccess)
        ? (w.active ?? []).filter(q => r.triumph > 0 || r.advantage >= q.cost) : [],
      spending: isPrivate || this.options.initiative ? [] : spendingOptions(r, this.options.spellContext
        ?? (this.options.spell ? "magic" : (w ? "combat" : (this.options.social ? "social" : "general")))),
      spell: isPrivate ? null : this.options.spell,
      attack,
      noSymbols: summary.length === 0
    };
  }
}
