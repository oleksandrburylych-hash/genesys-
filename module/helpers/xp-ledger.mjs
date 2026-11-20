/** Журнал опыта: категории записей и сводка для листа персонажа. */
/** Категория записи журнала опыта. */
export function xpCategory(e) {
  if (e.type === "earn") return e.kind === "archetype" ? "start" : (e.kind === "award" ? "award" : "earn");
  if (["skill", "characteristic", "talent"].includes(e.kind)) return e.kind;
  const l = e.label ?? "";
  if (/^(Талант|Talent)/i.test(l)) return "talent";
  if (/→\s*\d+$/.test(l)) return "characteristic";
  if (/:\s*(ранг|rank)\s*\d+$/i.test(l)) return "skill";
  return "other";
}

/** Сводка опыта: получено/потрачено/осталось, разбивка по категориям, лента с остатком. */
export function xpLedger(exp) {
  const L = k => game.i18n.localize(k);
  // Порядок записей журнала — исходный (при равном времени покупки идут после получения опыта).
  const entries = exp.log.map((e, i) => ({ ...e, cat: xpCategory(e), i }))
    .sort((a, b) => (a.timestamp - b.timestamp) || ((a.type === "earn" ? 0 : 1) - (b.type === "earn" ? 0 : 1)) || (a.i - b.i));
  const total = exp.total || 0;
  const sum = cat => entries.filter(e => e.cat === cat).reduce((s, e) => s + e.amount, 0);
  const spendCats = ["characteristic", "skill", "talent", "other"];
  const icons = { characteristic: "fa-dumbbell", skill: "fa-graduation-cap", talent: "fa-star", other: "fa-ellipsis", start: "fa-flag", award: "fa-trophy", earn: "fa-plus" };
  const details = cat => {
    const groups = new Map();
    for (const e of entries.filter(x => x.cat === cat)) {
      const key = cat === "talent" ? e.label.replace(/^(Талант|Talent)\s*/i, "").replace(/\s*\(.*$/, "") : e.label.replace(/(:\s*(ранг|rank)\s*\d+|\s*→\s*\d+)$/i, "");
      const g = groups.get(key) ?? { name: key, amount: 0, steps: [] };
      g.amount += e.amount;
      const step = e.label.match(/(\d+)\s*$/)?.[1] ?? e.label.match(/ранг (\d+)/)?.[1];
      if (step) g.steps.push(step);
      groups.set(key, g);
    }
    return [...groups.values()].sort((a, b) => b.amount - a.amount).map(g => ({ ...g, steps: g.steps.join(", ") }));
  };
  const cats = spendCats.map(cat => {
    const amount = sum(cat);
    return { key: cat, label: L(`GENESYS.XP.Cat.${cat}`), icon: icons[cat], amount, pct: total ? Math.round(100 * amount / total) : 0,
      count: entries.filter(e => e.cat === cat).length, details: details(cat) };
  }).filter(c => c.amount > 0 || c.key !== "other");
  const earned = ["start", "award", "earn"].map(cat => ({ key: cat, label: L(`GENESYS.XP.Cat.${cat}`), icon: icons[cat], amount: sum(cat) })).filter(c => c.amount > 0);
  let balance = 0;
  const log = entries.map(e => {
    balance += e.type === "earn" ? e.amount : -e.amount;
    return { ...e, balance, isEarn: e.type === "earn", icon: icons[e.cat], date: new Date(e.timestamp).toLocaleDateString(game.i18n.lang) };
  }).reverse();
  // Группы по дням (игровым встречам).
  const days = [];
  for (const e of log) {
    let d = days.at(-1);
    if (!d || d.date !== e.date) { d = { date: e.date, entries: [], earned: 0, spent: 0 }; days.push(d); }
    d.entries.push(e);
    if (e.isEarn) d.earned += e.amount; else d.spent += e.amount;
  }
  return {
    total, spent: exp.spent || 0, available: exp.available || 0,
    availablePct: total ? Math.max(0, Math.round(100 * (exp.available || 0) / total)) : 0,
    cats, earned, days, log
  };
}
