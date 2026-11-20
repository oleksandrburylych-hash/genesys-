import { SYSTEM_ID } from "../config.mjs";
import { WORLDS } from "../worlds.mjs";

/**
 * Фильтр по тегам миров в окнах компендиумов системы: строка цветных плашек над списком.
 * Щелчок по миру оставляет только подходящие ему записи (и записи «любой мир»).
 */
export function registerCompendiumFilter() {
  Hooks.on("renderCompendium", (app, element) => {
    const pack = app.collection;
    const meta = pack?.metadata ?? {};
    if (meta.packageName !== SYSTEM_ID && meta.system !== SYSTEM_ID) return;
    const root = element instanceof HTMLElement ? element : element?.[0];
    if (!root) return;
    root.querySelector(".gs-world-filter")?.remove();

    const bar = document.createElement("div");
    bar.className = "genesys gs-world-filter gs-worlds";
    const chip = (key, label, color) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `gs-world${(app._genesysWorld ?? "") === key ? " on" : ""}`;
      b.style.setProperty("--world", color);
      b.dataset.world = key;
      b.textContent = label;
      return b;
    };
    bar.append(chip("", game.i18n.localize("GENESYS.Worlds.All"), "#1f3557"));
    for (const [key, w] of Object.entries(WORLDS)) bar.append(chip(key, w.label, w.color));

    const apply = () => {
      const key = app._genesysWorld ?? "";
      for (const el of root.querySelectorAll("[data-entry-id], [data-document-id]")) {
        const entry = pack.index.get(el.dataset.entryId ?? el.dataset.documentId);
        if (!entry) continue;
        const worlds = entry.system?.worlds ?? [];
        el.classList.toggle("gs-hidden", !!key && worlds.length > 0 && !worlds.includes(key));
      }
      bar.querySelectorAll("[data-world]").forEach(b => b.classList.toggle("on", b.dataset.world === key));
    };
    bar.addEventListener("click", event => {
      const b = event.target.closest("[data-world]");
      if (!b) return;
      app._genesysWorld = b.dataset.world;
      apply();
    });

    const list = root.querySelector(".directory-list");
    if (list) list.before(bar);
    else (root.querySelector(".window-content") ?? root).prepend(bar);
    apply();
  });
}
