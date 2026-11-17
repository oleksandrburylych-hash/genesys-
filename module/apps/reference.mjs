import { GENESYS } from "../config.mjs";
import { symbolHTML } from "../dice/terms.mjs";

/**
 * Страницы журнала «Genesys: справочник». Содержимое собирается из данных системы,
 * поэтому всегда совпадает с тем, что делает автоматика.
 */
export function buildReferencePages() {
  const L = k => game.i18n.localize(k);
  const page = (name, content, sort) => ({ name, type: "text", sort, text: { content, format: 1 } });
  const pages = [];

  // 1. Как пользоваться системой
  pages.push(page(L("GENESYS.Ref.HowTo"), `
    <h2>${L("GENESYS.Ref.HowTo")}</h2>
    <ul>
      <li><strong>Создание персонажа:</strong> на листе в режиме создания нажмите шляпу волшебника — мастер проведёт по шагам: раса → карьера → бесплатные ранги → героическая способность. Затем тратьте опыт кнопками «+» (цены считаются сами).</li>
      <li><strong>Броски:</strong> щёлкните по навыку, характеристике или оружию. Shift+щелчок по навыку — бросок без окна.</li>
      <li><strong>Атака:</strong> наведите цель (клавиша T) и щёлкните по оружию — дистанция, защита цели, «Противник», распластанность и прочее учтутся сами. В карточке: «Нанести урон», активация свойств, трата символов, критическая травма.</li>
      <li><strong>Социальные проверки:</strong> наведите цель — Обаяние, Обман, Запугивание, Лидерство, Переговоры станут встречными автоматически.</li>
      <li><strong>Лечение:</strong> наведите раненого и бросьте Медицину — раны и усталость снимутся сами.</li>
      <li><strong>Магия:</strong> вкладка «Магия» → щёлкните по действию → отметьте эффекты; сложность и пул считаются сами.</li>
      <li><strong>Очки сюжета:</strong> кнопка в окне броска; трекер — на панели токенов. Макрос «Новая игровая встреча» раздаёт очки и сбрасывает героические способности.</li>
      <li><strong>Модификации:</strong> перетащите модификацию на лист оружия или брони.</li>
    </ul>`, 100));

  // 2. Кости и символы
  const dice = Object.entries(GENESYS.dice).map(([k, d]) => `<li><span class="genesys-die-icon ${k}"></span> ${L(d.label)}</li>`).join("");
  const symbols = Object.entries(GENESYS.symbols).map(([k, label]) => `<li>${symbolHTML(k)} ${L(label)}</li>`).join("");
  pages.push(page(L("GENESYS.Ref.Dice"), `
    <h2>${L("GENESYS.Ref.Dice")}</h2><ul class="genesys">${dice}</ul>
    <h3>${L("GENESYS.Ref.Symbols")}</h3><ul class="genesys">${symbols}</ul>
    <p>${L("GENESYS.Ref.DiceRules")}</p>`, 200));

  // 3. Сложности и дистанции
  const diffs = Object.values(GENESYS.difficulties).map(l => `<li>${L(l)}</li>`).join("");
  const ranges = Object.values(GENESYS.ranges).map(r => `<li>${L(r.label)}</li>`).join("");
  pages.push(page(L("GENESYS.Ref.Difficulty"), `
    <h2>${L("GENESYS.Difficulty.label")}</h2><ul>${diffs}</ul>
    <h2>${L("GENESYS.Range.label")}</h2><ul>${ranges}</ul>
    <p>${L("GENESYS.Ref.RangeAuto")}</p>`, 300));

  // 4. Трата символов
  const spend = Object.values(GENESYS.spending ?? {}).map(t => `
    <h3>${foundry.utils.escapeHTML(t.title)}</h3>
    <table><tbody>${(t.rows ?? []).map(r => `<tr><td><strong>${foundry.utils.escapeHTML(r.cost)}</strong></td><td>${foundry.utils.escapeHTML(r.text)}</td></tr>`).join("")}</tbody></table>`).join("");
  if (spend) pages.push(page(L("GENESYS.Spend.Title"), `<h2>${L("GENESYS.Spend.Title")}</h2>${spend}`, 400));

  // 5. Состояния
  const statuses = GENESYS.statusEffects.map(s => `<li><img src="${s.img}" width="20" height="20" style="border:none;vertical-align:middle"> ${L(s.name)}</li>`).join("");
  pages.push(page(L("GENESYS.Ref.Statuses"), `<h2>${L("GENESYS.Ref.Statuses")}</h2><ul>${statuses}</ul><p>${L("GENESYS.Ref.StatusesAuto")}</p>`, 500));

  // 6. Опыт
  pages.push(page(L("GENESYS.Ref.XP"), `
    <h2>${L("GENESYS.Ref.XP")}</h2>
    <ul>
      <li>${L("GENESYS.Ref.XPChar")}</li>
      <li>${L("GENESYS.Ref.XPSkill")}</li>
      <li>${L("GENESYS.Ref.XPTalent")}</li>
      <li>${L("GENESYS.Ref.XPHeroic")}</li>
    </ul>`, 600));
  return pages;
}
