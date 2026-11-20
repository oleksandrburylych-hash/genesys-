import assert from "node:assert/strict";
const R = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(/\/$/, "");
class DiceTerm { constructor({number=1}={}) { this.number=number; this.results=[]; this._faces=0; } get faces(){return this._faces} set faces(v){this._faces=v} }
globalThis.foundry = { dice: { terms: { DiceTerm } }, abstract: { TypeDataModel: class {} }, data: { fields: {} } };
globalThis.Roll = class { constructor(formula, data={}, options={}) { this.formula=formula; this.options=options; this.terms=[]; } get dice(){ return this.terms; } };
const { DicePool } = await import(`${R}/module/dice/pool.mjs`);
const T = await import(`${R}/module/dice/terms.mjs`);
const { GenesysRoll } = await import(`${R}/module/dice/roll.mjs`);
const { GENESYS } = await import(`${R}/module/config.mjs`);

// Пул навыка: характеристика 3, ранг 1 → 1 жёлтый + 2 зелёных
let p = DicePool.fromSkill(3, 1, 2);
assert.deepEqual([p.proficiency, p.ability, p.difficulty], [1, 2, 2]);
p = DicePool.fromSkill(2, 4, 0);
assert.deepEqual([p.proficiency, p.ability], [2, 2]);
// Улучшение при отсутствии зелёных добавляет зелёный
p = new DicePool({}); p.upgradeAbility(); assert.equal(p.ability, 1); p.upgradeAbility(); assert.deepEqual([p.ability,p.proficiency],[0,1]);
p = new DicePool({difficulty:2}); p.upgradeDifficulty(3); assert.deepEqual([p.difficulty,p.challenge],[1,2]) ;
p = new DicePool({difficulty:1, challenge:1}); p.setDifficulty(3); assert.deepEqual([p.challenge,p.difficulty],[1,2]);
assert.equal(new DicePool({ability:2, proficiency:1, difficulty:2, boost:1}).formula, "1dp + 2da + 1db + 2di");

// Грани: сверка суммарных символов с распределением кубиков Genesys
const tally = cls => cls.FACES.join("").split("").reduce((a,c)=>(a[c]=(a[c]||0)+1,a),{});
assert.deepEqual(tally(T.AbilityDie), {s:5, a:5});
assert.deepEqual(tally(T.ProficiencyDie), {s:9, a:8, R:1});
assert.deepEqual(tally(T.DifficultyDie), {f:4, t:6});
assert.deepEqual(tally(T.ChallengeDie), {f:8, t:8, D:1});
assert.deepEqual(tally(T.BoostDie), {s:2, a:4});
assert.deepEqual(tally(T.SetbackDie), {f:2, t:2});
assert.equal(T.ProficiencyDie.FACES.length, 12); assert.equal(T.BoostDie.FACES.length, 6);

// Бросок: триумф (12 на жёлтом) + "ss" (4 на зелёном) против "ft" (8 на фиолетовом) + отчаяние
const mk = (cls, ...vals) => { const d = new cls({number: vals.length}); d.results = vals.map(v=>({result:v, active:true})); return d; };
const roll = new GenesysRoll("x", {}, {});
roll.terms = [mk(T.ProficiencyDie, 12), mk(T.AbilityDie, 4), mk(T.DifficultyDie, 8), mk(T.ChallengeDie, 12)];
const r = roll.results;
// успехи: R(1)+ss(2)=3 ; провалы: f(1)+D(1)=2 → чистый 1 успех; преимущества 0, угрозы 1
assert.equal(r.netSuccess, 1); assert.equal(r.threat, 1); assert.equal(r.triumph, 1); assert.equal(r.despair, 1); assert.ok(r.isSuccess);
assert.equal(roll._evaluateTotal(), 1);
roll.options.initiative = true; assert.equal(roll._evaluateTotal(), 0.99);

// Стоимость опыта
assert.equal(GENESYS.xp.skill(2, true), 10); assert.equal(GENESYS.xp.skill(1, false), 10); assert.equal(GENESYS.xp.characteristic(4), 40); assert.equal(GENESYS.xp.talent(3), 15);
// Зарезервированные действия ApplicationV2 (ядро перехватывает их раньше наших обработчиков).
{
  const fs = await import("node:fs");
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
  for (const f of walk(`${R}/templates`).filter(f => f.endsWith(".hbs"))) {
    const bad = fs.readFileSync(f, "utf8").match(/data-action="(tab|close|toggleControls)"/);
    assert.ok(!bad || /data-group=/.test(fs.readFileSync(f, "utf8")), `${f}: зарезервированное действие ${bad?.[1]}`);
  }
}
// Все ключи перевода GENESYS.Xxx… из кода и шаблонов есть в ru.json.
{
  const fs = await import("node:fs");
  const ru = JSON.parse(fs.readFileSync(`${R}/lang/ru.json`, "utf8"));
  const has = k => k.split(".").reduce((o, p) => (o && typeof o === "object" ? o[p] : undefined), ru) !== undefined;
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
  const missing = new Set();
  for (const f of [...walk(`${R}/module`), ...walk(`${R}/templates`), `${R}/genesys.mjs`].filter(f => /\.(mjs|hbs)$/.test(f))) {
    for (const k of fs.readFileSync(f, "utf8").match(/GENESYS\.[A-Z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*/g) ?? []) {
      if (/\.$/.test(k) || has(k)) continue;
      // Ключи, собираемые по частям (`GENESYS.Skill.${key}`), проверяются только целиком.
      missing.add(`${k} (${f.replace(R + "/", "")})`);
    }
  }
  assert.deepEqual([...missing].filter(m => !/\$\{/.test(m)), [], "нет ключей перевода");
}

// Снаряжение: рюкзак, надетая одежда, связки, броня, импланты, болеутоляющее.
{
  globalThis.Hooks ??= { on() {} };
  const G = await import(`${R}/module/gear.mjs`);
  const pack = G.inferGear("Рюкзак", "Пока персонаж носит рюкзак, его порог нагрузки увеличивается на 4.");
  assert.equal(pack.thresholdBonus, 4);
  assert.equal(G.inferGear("Седельные сумки", "Увеличивают порог нагрузки скакуна на 4").thresholdBonus, 0);
  assert.equal(G.inferGear("Бездонный рюкзак", "вмещает предметы с суммарной нагрузкой до 12, а сам всегда имеет нагрузку 2").thresholdBonus, 12);
  assert.equal(G.inferGear("Зимняя одежда", "Надетая имеет нагрузку 1.").wornEncumbrance, 1);
  assert.equal(G.inferGear("Эльфийские сапоги", "Нагрузка надетых сапог — 0.").wornEncumbrance, 0);
  assert.equal(G.inferGear("Сухой паёк", "Нагрузка указана за 5 пайков.").bundle, 5);
  assert.equal(G.inferGear("Болеутоляющее", "").painkiller, "wounds");
  assert.equal(G.inferGear("Эликсир бодрости", "Персонаж сразу восстанавливает 5 усталости. Каждый следующий эликсир за тот же день восстанавливает на 1 меньше.").painkiller, "strain");
  const arm = G.inferGear("Имплантированная броня", "+1 к поглощению. Киберимплант: устанавливается…");
  assert.ok(arm.implant); assert.deepEqual(arm.mods, [{ target: "soak", value: 1 }]); assert.equal(arm.strainPenalty, 1);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(n => G.painkillerHeal(n)), [5, 4, 3, 2, 1, 0, 0]);
  assert.equal(G.painkillerHeal(0, 2), 7); assert.equal(G.painkillerHeal(5, 2), 0);

  const it = (type, name, system) => ({ type, name, system: { quantity: 1, carried: true, equipped: false, description: "", ...system } });
  const items = [
    it("armor", "Кольчуга", { soak: 2, defense: 0, encumbrance: 3, equipped: true }),
    it("armor", "Плотная куртка", { soak: 1, defense: 0, encumbrance: 1, equipped: true }),
    it("armor", "Латы (запасные)", { soak: 2, defense: 1, encumbrance: 4 }),
    it("gear", "Рюкзак", { encumbrance: 0, description: "порог нагрузки увеличивается на 4" }),
    it("gear", "Рюкзак", { encumbrance: 0, description: "порог нагрузки увеличивается на 4", quantity: 1 }),
    it("gear", "Зимняя одежда", { encumbrance: 4, equipped: true, description: "Надетая имеет нагрузку 1." }),
    it("gear", "Сухой паёк", { encumbrance: 1, quantity: 7, description: "Нагрузка указана за 5 пайков." }),
    it("gear", "Верёвка", { encumbrance: 1, quantity: 2 }),
    it("gear", "Имплантированная броня", { encumbrance: 0, description: "Киберимплант" }),
    { type: "weapon", name: "Щит", system: { quantity: 1, carried: true, equipped: true, encumbrance: 1, qualityRating: re => re.test("Оборонительное") ? 1 : 0 } }
  ];
  const sum = G.gearSummary({ items });
  // Кольчуга (лучшая) надета: 3−3 = 0; куртка надета вторым комплектом — считается полностью (1); латы 4;
  // зимняя одежда надета: 1; паёк 7 шт. по 5 → 2; верёвка 2; щит 1. Итого 11.
  assert.equal(sum.suit.name, "Кольчуга"); assert.deepEqual(sum.extraArmor, ["Плотная куртка"]);
  assert.equal(sum.soak, 2); assert.equal(sum.meleePlus, 1); assert.equal(sum.rangedPlus, 0);
  assert.equal(sum.encumbrance, 11);
  assert.equal(sum.thresholdBonus, 4, "два рюкзака не складываются");
  assert.equal(sum.mods.soak, 1); assert.equal(sum.strainPenalty, 1);
  // Две брони одной позицией (количество 2): одна надета (−3), вторая в руках.
  assert.equal(G.itemEncumbrance(it("armor", "Кольчуга", { encumbrance: 3, quantity: 2 }), { worn: true }), 3);

  assert.ok(G.isStackable({ type: "gear", system: {} }));
  assert.ok(!G.isStackable({ type: "armor", system: {} }));
  assert.ok(G.isStackable({ type: "weapon", system: { qualities: [{ name: "Ограниченный боезапас", rating: 1 }] } }));
  assert.ok(!G.isStackable({ type: "weapon", system: { qualities: [{ name: "Точное" }] } }));
}
// Медицина (Core, табл. I.3–3): сложность по ранам, исцеление успехами (+Хирург), усталость преимуществами.
{
  const M = await import(`${R}/module/medicine.mjs`);
  assert.equal(M.woundDifficulty(3, 12), 1); assert.equal(M.woundDifficulty(6, 12), 1); assert.equal(M.woundDifficulty(7, 12), 2);
  assert.equal(M.woundDifficulty(12, 12), 2); assert.equal(M.woundDifficulty(13, 12), 3);
  const mk = (opts, res) => ({ options: { medicine: opts }, results: res });
  assert.deepEqual(M.medicineOutcome(mk({ mode: "wounds", patientName: "А", surgeon: 1 }, { isSuccess: true, success: 2, advantage: 1 })),
    { injury: false, patient: "А", success: true, wounds: 3, strain: 1, surgeon: 1 });
  assert.equal(M.medicineOutcome(mk({ mode: "wounds", patientName: "А" }, { isSuccess: false, success: 0, advantage: 2 })).strain, 0);
  assert.equal(M.medicineOutcome(mk({ mode: "injury", injuryName: "Х", patientName: "А" }, { isSuccess: true })).healed, true);
  const talent = (name, nameEn, rank) => ({ name, flags: { "genesys-rpg": { nameEn } }, system: { ranked: true, rank } });
  assert.equal(M.surgeonRanks({ itemTypes: { talent: [talent("Хирург", "Surgeon", 2)] } }), 2);
  assert.ok(M.hasMedkit({ itemTypes: { gear: [{ name: "Аптечка первой помощи", system: { quantity: 1, carried: true } }] } }));
  assert.ok(!M.hasMedkit({ itemTypes: { gear: [{ name: "Верёвка", system: { quantity: 1 } }] } }));
}
// Зоны боя: попадание в зону, дистанция по графу, соседство, цена перехода, модификаторы атаки.
{
  globalThis.game ??= {}; game.i18n ??= { format: (k, d) => `${k}${JSON.stringify(d ?? {})}`, localize: k => k };
  const Z = await import(`${R}/module/zones.mjs`);
  const sq = (x, y, w = 100, h = 100) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const zones = [
    { id: "a", name: "A", tags: [], poly: sq(0, 0) }, { id: "b", name: "B", tags: ["cover"], poly: sq(100, 0) },
    { id: "c", name: "C", tags: ["dark", "difficult"], poly: sq(200, 0) }, { id: "d", name: "D", tags: ["elevated"], poly: sq(300, 0) },
    { id: "e", name: "E", tags: [], poly: sq(400, 0) }, { id: "f", name: "F", tags: [], poly: sq(500, 0) }
  ];
  const geo = { zones, links: [] };
  assert.ok(Z.pointInPolygon(50, 50, zones[0].poly)); assert.ok(!Z.pointInPolygon(150, 50, zones[0].poly));
  assert.equal(Z.zoneAt(250, 50, geo).id, "c");
  assert.ok(Z.zonesTouch(zones[0], zones[1])); assert.ok(!Z.zonesTouch(zones[0], zones[2]));
  // По геометрии: та же — короткая, соседняя — короткая, через одну — средняя, через две — длинная, дальше — экстремальная.
  assert.deepEqual(["a", "b", "c", "d", "e", "f"].map(id => Z.zoneRange(zones[0], zones.find(z => z.id === id), geo)), ["short", "short", "medium", "long", "extreme", "extreme"]);
  // Явные связи важнее: A–B средняя ⇒ A–C (через B) длинная.
  const linked = { zones, links: [["a", "b", "medium"], ["b", "c", "short"], ["c", "d", "short"]] };
  assert.equal(Z.zoneRange(zones[0], zones[1], linked), "medium");
  assert.equal(Z.zoneRange(zones[0], zones[2], linked), "long");
  assert.equal(Z.zoneRange(zones[0], zones[5], linked), "extreme", "нет пути — экстремальная");
  // Перемещение: короткая — 1 манёвр, в труднопроходимую зону — вдвое.
  assert.equal(Z.moveCost(zones[0], zones[1], geo), 1);
  assert.equal(Z.moveCost(zones[1], zones[2], geo), 2);
  // Атака: цель в укрытии и темноте, стрелок на возвышенности.
  globalThis.canvas = { scene: { flags: { "genesys-rpg": { zones, links: [] } } } };
  const tok = (x, y) => ({ center: { x, y }, scene: canvas.scene });
  const m1 = Z.zoneAttackMods(tok(350, 50), tok(150, 50), false);
  assert.equal(m1.defense, 1); assert.equal(m1.boost, 1); assert.equal(m1.setback, 0);
  const m2 = Z.zoneAttackMods(tok(50, 50), tok(250, 50), false);
  assert.equal(m2.setback, 1); assert.equal(m2.defense, 0);
  assert.equal(Z.zoneAttackMods(tok(50, 50), tok(150, 50), true).defense, 0, "в ближнем бою укрытие зоны не действует");
  assert.equal(Z.tokenZoneRange(tok(50, 50), tok(350, 50)).range, "long");
  delete globalThis.canvas;
}
console.log("logic tests passed");
