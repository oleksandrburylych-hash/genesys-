/**
 * Предмет Genesys. Иконки по умолчанию и бросок из предмета.
 */
export class GenesysItem extends Item {
  static DEFAULT_ICONS = {
    skill: "icons/svg/book.svg",
    talent: "icons/svg/aura.svg",
    ability: "icons/svg/upgrade.svg",
    archetype: "icons/svg/mystery-man.svg",
    career: "icons/svg/statue.svg",
    weapon: "icons/svg/sword.svg",
    armor: "icons/svg/shield.svg",
    gear: "icons/svg/item-bag.svg",
    quality: "icons/svg/sun.svg",
    injury: "icons/svg/blood.svg",
    spell: "icons/svg/explosion.svg",
    heroic: "icons/svg/sun.svg",
    attachment: "icons/svg/padlock.svg"
  };

  /** @override */
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;
    if (!data.img || data.img === Item.DEFAULT_ICON) {
      const img = GenesysItem.DEFAULT_ICONS[this.type];
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
