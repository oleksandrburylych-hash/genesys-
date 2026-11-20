import { SYSTEM_ID } from "../config.mjs";
import { ZONE_TAGS } from "../zones.mjs";

/**
 * «Зоны сцены»: ведущий отмечает регионы текущей сцены (инструмент «Регионы» Foundry) как зоны боя Genesys
 * и задаёт их свойства. Дистанции между соседними зонами система считает сама (соседние — короткая, через одну — средняя…).
 */
export async function openZoneEditor(scene = canvas?.scene) {
  if (!game.user.isGM || !scene) return;
  const L = k => game.i18n.localize(k);
  const esc = foundry.utils.escapeHTML;
  const regions = scene.regions?.contents ?? [];
  if (!regions.length) return ui.notifications.info("GENESYS.Zone.NoRegions", { localize: true });
  const rows = regions.map(r => {
    const z = r.flags?.[SYSTEM_ID]?.zone;
    const tags = ZONE_TAGS.map(t => `<label class="gs-ze-tag" data-tooltip="${esc(L(`GENESYS.Zone.TagHint.${t}`))}"><input type="checkbox" name="${r.id}.${t}" ${z?.tags?.includes(t) ? "checked" : ""}> ${esc(L(`GENESYS.Zone.Tag.${t}`))}</label>`).join("");
    return `<div class="gs-ze-row"><label class="gs-ze-name"><input type="checkbox" name="${r.id}.zone" ${z ? "checked" : ""}> <b>${esc(r.name)}</b> <small>${esc(L("GENESYS.Zone.IsZone"))}</small></label><div class="gs-ze-tags">${tags}</div></div>`;
  }).join("");
  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: L("GENESYS.Zone.Editor"), icon: "fa-solid fa-map-location-dot" },
    position: { width: 640 },
    content: `<div class="genesys gs-zone-editor"><p class="hint">${esc(L("GENESYS.Zone.EditorHint"))}</p>${rows}</div>`,
    ok: { label: L("GENESYS.Zone.Save"), callback: (ev, button) => new foundry.applications.ux.FormDataExtended(button.form).object },
    rejectClose: false
  });
  if (!result) return;
  const updates = regions.map(r => {
    const on = !!result[`${r.id}.zone`];
    const tags = ZONE_TAGS.filter(t => result[`${r.id}.${t}`]);
    return on ? { _id: r.id, [`flags.${SYSTEM_ID}.zone`]: { id: r.flags?.[SYSTEM_ID]?.zone?.id ?? r.id, tags } } : { _id: r.id, [`flags.${SYSTEM_ID}.zone`]: null };
  });
  await scene.updateEmbeddedDocuments("Region", updates);
  ui.notifications.info(game.i18n.format("GENESYS.Zone.Saved", { count: updates.filter(u => u[`flags.${SYSTEM_ID}.zone`]).length }));
}
