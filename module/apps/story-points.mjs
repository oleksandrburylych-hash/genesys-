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
    position: { width: 380, height: "auto", top: 80, left: 120 },
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

  /** Прошлые значения — чтобы «перевернуть» только что пришедший жетон. */
  static #last = null;

  /** @override */
  async _prepareContext() {
    const { player, gm } = StoryPointsTracker.points;
    const last = StoryPointsTracker.#last;
    const arrived = last ? { player: player > last.player, gm: gm > last.gm } : { player: false, gm: false };
    StoryPointsTracker.#last = { player, gm };
    const coins = (n, side) => Array.from({ length: Math.min(n, 12) }, (_, i) => ({ i, arrive: arrived[side] && i === n - 1 }));
    return {
      player, gm,
      playerCoins: coins(player, "player"), gmCoins: coins(gm, "gm"),
      playerMore: player > 12 ? player - 12 : 0, gmMore: gm > 12 ? gm - 12 : 0,
      isGM: game.user.isGM,
      coinPlayer: "systems/genesys-rpg/assets/story/player.svg",
      coinGM: "systems/genesys-rpg/assets/story/gm.svg"
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
    else if (action === "transferToGM" || action === "transferToPlayers") {
      // Критическая травма «Удручающая рана»: очко сюжета переходит к другой стороне.
      const from = action === "transferToGM" ? "player" : "gm";
      const to = from === "player" ? "gm" : "player";
      if (points[from] <= 0) return;
      points[from] -= 1; points[to] += 1;
      message = game.i18n.localize(action === "transferToGM" ? "GENESYS.Injury.SPToGM" : "GENESYS.Injury.SPToPlayers");
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
        content: `<div class="genesys story-point-message ${action === "useGM" ? "gm" : "player"}"><img src="systems/genesys-rpg/assets/story/${action === "useGM" ? "gm" : "player"}.svg" alt=""><span>${message}</span></div>`,
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
