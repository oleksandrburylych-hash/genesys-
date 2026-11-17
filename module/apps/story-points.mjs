import { SYSTEM_ID, TEMPLATES } from "../config.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const SOCKET = `system.${SYSTEM_ID}`;

/**
 * Трекер очков истории (Story Points).
 * Игроки тратят очко игроков → оно переходит к Мастеру, и наоборот.
 * Значения хранятся в настройке мира; изменения от игроков идут через сокет к активному Мастеру.
 */
export class StoryPointsTracker extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "genesys-story-points",
    classes: ["genesys", "story-points"],
    window: { title: "GENESYS.StoryPoints.Title", icon: "fa-solid fa-book-open", minimizable: true },
    position: { width: 260, height: "auto", top: 80, left: 120 },
    actions: {
      usePlayer: StoryPointsTracker.#onUsePlayer,
      useGM: StoryPointsTracker.#onUseGM,
      adjust: StoryPointsTracker.#onAdjust
    }
  };

  static PARTS = {
    main: { template: `${TEMPLATES}/apps/story-points.hbs` }
  };

  static get points() {
    return game.settings.get(SYSTEM_ID, "storyPoints");
  }

  /** @override */
  async _prepareContext() {
    const { player, gm } = StoryPointsTracker.points;
    return {
      player, gm,
      playerTokens: Array.from({ length: player }),
      gmTokens: Array.from({ length: gm }),
      isGM: game.user.isGM
    };
  }

  static #onUsePlayer() { StoryPointsTracker.request("usePlayer"); }
  static #onUseGM() { StoryPointsTracker.request("useGM"); }
  static #onAdjust(event, target) {
    StoryPointsTracker.request("adjust", { pool: target.dataset.pool, delta: Number(target.dataset.delta) });
  }

  /** Отправить запрос: Мастер выполняет сам, игрок — через сокет. */
  static request(action, data = {}) {
    const payload = { action, data, userId: game.user.id };
    if (game.user.isGM) return StoryPointsTracker.handle(payload);
    if (!game.users.activeGM) return ui.notifications.warn("GENESYS.StoryPoints.NoGM", { localize: true });
    game.socket.emit(SOCKET, payload);
  }

  /** Обработка запроса на стороне активного Мастера. */
  static async handle({ action, data, userId }) {
    if (!game.user.isActiveGM) return;
    const points = foundry.utils.deepClone(StoryPointsTracker.points);
    const user = game.users.get(userId);
    let message = null;

    if (action === "usePlayer") {
      if (points.player <= 0) return;
      points.player -= 1; points.gm += 1;
      message = game.i18n.format("GENESYS.StoryPoints.PlayerUsed", { name: user?.name ?? "?" });
    }
    else if (action === "useGM") {
      if (!user?.isGM || points.gm <= 0) return;
      points.gm -= 1; points.player += 1;
      message = game.i18n.localize("GENESYS.StoryPoints.GMUsed");
    }
    else if (action === "adjust") {
      if (!user?.isGM) return;
      const key = data.pool === "gm" ? "gm" : "player";
      points[key] = Math.max(0, points[key] + (data.delta || 0));
    }
    else return;

    await game.settings.set(SYSTEM_ID, "storyPoints", points);
    if (message) {
      await ChatMessage.implementation.create({
        content: `<div class="genesys story-point-message"><i class="fa-solid fa-book-open"></i> ${message}</div>`,
        speaker: { alias: game.i18n.localize("GENESYS.StoryPoints.Title") }
      });
    }
  }

  /** Подключить сокет и перерисовку при изменении настройки. */
  static initialize() {
    game.socket.on(SOCKET, payload => StoryPointsTracker.handle(payload));
  }

  static refresh() {
    foundry.applications.instances.get("genesys-story-points")?.render();
  }

  static toggle() {
    const app = foundry.applications.instances.get("genesys-story-points");
    if (app) return app.close();
    return new StoryPointsTracker().render({ force: true });
  }
}
