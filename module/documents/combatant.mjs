import { SYSTEM_ID } from "../config.mjs";
import { DicePool } from "../dice/pool.mjs";
import { GenesysRoll } from "../dice/roll.mjs";

/**
 * Участник боя. Инициатива — проверка Бдительности (или Хладнокровия)
 * без сложности. Порядок: сначала по успехам, затем по преимуществам.
 */
export class GenesysCombatant extends Combatant {
  /** @override */
  getInitiativeRoll(formula) {
    const actor = this.actor;
    const skillKey = game.settings.get(SYSTEM_ID, "initiativeSkill");
    let pool;
    if (actor?.getSkill) {
      const skill = actor.getSkill(skillKey);
      pool = skill
        ? actor.getSkillPool(skill, 0)
        : new DicePool({ ability: actor.characteristic("willpower") });
    }
    else pool = new DicePool({ ability: 1 });
    if (pool.isEmpty) pool.ability = 1;
    const label = game.i18n.localize("GENESYS.Initiative.label");
    return GenesysRoll.fromPool(pool, { initiative: true, label });
  }
}
