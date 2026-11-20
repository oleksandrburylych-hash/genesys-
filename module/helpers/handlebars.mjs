import { TEMPLATES } from "../config.mjs";

/**
 * Безопасный localize: Foundry v14 падает, если в {{localize x}} попала не строка (undefined, объект),
 * и вместе с ним не открывается всё окно. Строки обрабатываются как обычно, остальное — выводится как есть.
 */
export function guardLocalizeHelper() {
  const core = Handlebars.helpers?.localize;
  if (core?._genesysSafe) return;
  const safe = function (value, options) {
    if (value instanceof Handlebars.SafeString) value = value.toString();
    if (typeof value !== "string") return value == null ? "" : String(value.label ?? value);
    if (core) return core.call(this, value, options);
    const hash = options?.hash ?? {};
    return Object.keys(hash).length ? game.i18n.format(value, hash) : game.i18n.localize(value);
  };
  safe._genesysSafe = true;
  Handlebars.registerHelper("localize", safe);
}

export function registerHandlebarsHelpers() {
  guardLocalizeHelper();
  /** Повторить блок n раз: {{#times 3}}…{{/times}} */
  Handlebars.registerHelper("times", function (n, options) {
    let out = "";
    for (let i = 0; i < (Number(n) || 0); i++) out += options.fn({ index: i, first: i === 0 });
    return out;
  });

  /** Иконка кубика пула. */
  Handlebars.registerHelper("genesysDie", function (key, title) {
    // Без подписи Handlebars передаёт вторым аргументом свой объект options — его не переводим.
    if (typeof title !== "string") title = "";
    const t = title ? ` data-tooltip="${Handlebars.escapeExpression(game.i18n.localize(title))}"` : "";
    return new Handlebars.SafeString(`<span class="genesys-die-icon ${Handlebars.escapeExpression(key)}"${t}></span>`);
  });

  /** Сложение: {{add @index 1}} */
  Handlebars.registerHelper("add", (a, b) => (Number(a) || 0) + (Number(b) || 0));

  /** Знак числа: +2 / −1 / 0 */
  Handlebars.registerHelper("signed", function (n) {
    n = Number(n) || 0;
    return n > 0 ? `+${n}` : String(n);
  });
}

export function preloadTemplates() {
  const paths = [
    "actor/character-header.hbs",
    "actor/parts/main.hbs",
    "actor/parts/talents.hbs",
    "actor/parts/inventory.hbs",
    "actor/parts/experience.hbs",
    "actor/parts/biography.hbs",
    "actor/adversary.hbs",
    "actor/vehicle.hbs",
    "parts/worlds.hbs",
    "parts/statuses.hbs",
    "parts/creature.hbs",
    "actor/parts/magic.hbs",
    "dialog/spell-cast.hbs",
    "actor/parts/skill-list.hbs",
    "item/header.hbs",
    "item/description.hbs",
    "item/qualities.hbs",
    "item/attachments.hbs",
    "apps/creation-wizard.hbs",
    "apps/world-setup.hbs",
    ...["skill", "talent", "ability", "archetype", "career", "weapon", "armor", "gear", "quality", "injury", "spell", "heroic", "attachment"]
      .map(t => `item/details-${t}.hbs`),
    "chat/roll.hbs",
    "dialog/dice-pool.hbs",
    "apps/story-points.hbs"
  ].map(p => `${TEMPLATES}/${p}`);
  return foundry.applications.handlebars.loadTemplates(paths);
}
