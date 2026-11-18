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
console.log("logic tests passed");
