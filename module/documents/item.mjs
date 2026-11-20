/**
 * Предмет Genesys. Иконки по умолчанию и бросок из предмета.
 */
export class GenesysItem extends Item {
  /** Плашки по умолчанию для новых предметов (game-icons.net, CC BY 3.0). */
  static get DEFAULT_ICONS() { return CONFIG.GENESYS?.icons?.defaults ?? {}; }

  /** @override */
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;
    if (!data.img || data.img === Item.DEFAULT_ICON) {
      const img = (this.type === "skill" && CONFIG.GENESYS?.icons?.skills?.[data.system?.key]) || GenesysItem.DEFAULT_ICONS[this.type];
      if (img) this.updateSource({ img });
    }
  }

  /** Использовать предмет: навык/оружие — бросок, остальное — показать в чат. */
  async use() {
    const actor = this.actor;
    if (actor && this.type === "skill") return actor.rollSkill(this);
    if (actor && this.type === "weapon") return actor.rollWeapon(this);
    if (actor && this.type === "spell") return actor.castSpell(this);
    return this.toChat();
  }

  /** Карточка предмета в чате. */
  async toChat() {
    const description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.system.description ?? "", {
      relativeTo: this, secrets: this.isOwner
    });
    const content = `<div class="genesys item-card">
      <header><img src="${this.img}" alt=""><h3>${foundry.utils.escapeHTML(this.name)}</h3></header>
      <div class="item-card-description">${description}</div>
    </div>`;
    return ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor: this.actor }),
      content
    });
  }
}
