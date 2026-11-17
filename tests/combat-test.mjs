import assert from "node:assert/strict";
const R = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(/\/$/, "");
class DiceTerm { constructor(){ this.results=[]; } }
const F = {};
for (const n of ["StringField","NumberField","BooleanField","SchemaField","ArrayField","HTMLField"]) F[n] = class { constructor(...a){ this.args=a; } };
globalThis.foundry = { dice:{terms:{DiceTerm}}, abstract:{ TypeDataModel: class { static migrateData(s){return s;} } }, data:{ fields: F }, utils:{ escapeHTML:s=>s, deepClone:o=>structuredClone(o), getProperty:(o,p)=>p.split('.').reduce((a,k)=>a?.[k],o) } };
globalThis.Roll = class {};
const msgs=[];
globalThis.ChatMessage = { implementation: { create: async m => msgs.push(m), getSpeaker: () => ({}) } };
globalThis.game = { i18n: { format:(k,d)=>k+JSON.stringify(d??{}), localize:k=>k }, settings:{ get:(s,k)=>{ if(k==="autoCritOnThreshold") return false; throw new Error("x"); } }, user:{ targets:new Set() } };
const tokA={ center:{x:0,y:0}, document:{disposition:1} }, tokB={ center:{x:300,y:0}, document:{disposition:-1} };
globalThis.canvas = { ready:true, grid:{ size:100, distance:1.5, measurePath: ([a,b]) => ({ distance: Math.hypot(a.x-b.x,a.y-b.y)/100*1.5 }) }, tokens:{ controlled:[], placeables:[tokA,tokB] } };
const { GENESYS } = await import(`${R}/module/config.mjs`);
const C = await import(`${R}/module/combat/combat.mjs`);
const mkActor = (sys, talents=[]) => { const a={ system:sys, statuses:new Set(), isOwner:true, name:"T", type:"character",
  itemTypes:{ talent: talents, injury: [] }, getActiveTokens:()=>[tokA],
  async update(u){ for (const [k,v] of Object.entries(u)) { const p=k.split('.'); let o=this; for(const x of p.slice(0,-1)) o=o[x]; o[p.at(-1)]=v; } },
  async toggleStatusEffect(id){ this.statuses.add(id); } }; return a; };
// Range bands: 3 squares * 1.5 = 4.5 m → short
assert.equal(C.rangeBand(tokA, tokB), "short");
// Ranged weapon (rangedLight, medium) vs target defense 2 with Adversary 1, prone
const target = mkActor({ defense:{ ranged:{value:2}, melee:{value:1} } }, [{ name:"Противник", system:{rank:1}, getFlag:()=> "Adversary" }]);
target.statuses.add("prone");
tokB.actor = target; tokA.actor = mkActor({});
const attacker = tokA.actor; attacker.getActiveTokens = () => [tokA];
const weapon = { system:{ skill:"rangedLight", range:"medium", isMelee:false } };
const m = C.attackModifiers(attacker, weapon, { token: tokB, actor: target });
assert.equal(m.range, "short"); assert.equal(m.difficulty, 1); assert.equal(m.setback, 3); assert.equal(m.upgrades, 1);
// Melee vs prone: boost
const mm = C.attackModifiers(attacker, { system:{ skill:"melee", range:"engaged", isMelee:true } }, { token: tokB, actor: target });
assert.equal(mm.difficulty, 2); assert.equal(mm.boost, 1); assert.equal(mm.setback, 1);
// Damage: soak 5, pierce 2 → effective 3; damage 7 → 4 wounds
const victim = mkActor({ soak:{value:5}, wounds:{value:0,max:10}, strain:{value:0,max:10} });
await C.actOnActor(victim, "damage", { damage:7, pierce:2 });
assert.equal(victim.system.wounds.value, 4);
// Stun damage goes to strain; breach 1 ignores 10 soak
await C.actOnActor(victim, "damage", { damage:3, breach:1, stun:true });
assert.equal(victim.system.strain.value, 3);
// Threshold exceeded → incapacitated
await C.actOnActor(victim, "damage", { damage:12 });
assert.ok(victim.statuses.has("incapacitated"));
// State modifiers: disoriented + overencumbered on agility
const st = mkActor({ encumbrance:{ excess:2 } }); st.statuses.add("disoriented");
const pool={setback:0}; const notes=C.applyStateModifiers(st,pool,{characteristic:"agility"});
assert.equal(pool.setback,3); assert.equal(notes.length,2);
// Spending options
GENESYS.spending = { combatPositive:{ title:"P", rows:[{cost:"1",symbol:"advantage",amount:1,text:"a"},{cost:"3",symbol:"advantage",amount:3,text:"b"},{cost:"T",symbol:"triumph",amount:1,text:"c"}] }, combatNegative:{ title:"N", rows:[{cost:"1",symbol:"threat",amount:1,text:"x"}] } };
const { spendingOptions } = await import(`${R}/module/chat.mjs`);
const sp = spendingOptions({ advantage:2, triumph:0, threat:0, despair:0 }, "combat");
assert.equal(sp.length,1); assert.equal(sp[0].rows.length,1);
console.log("combat tests passed");
