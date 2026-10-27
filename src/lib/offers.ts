/* Happy hours and promotions without a code. Pure functions shared by the browser (to show prices and hints)
   and the server (the only source of truth for what the guest pays). */

export type Window = {
  /** weekdays 0..6 (0 = Sunday); empty = every day */
  days: number[];
  /** "HH:MM" Tashkent time; empty = all day */
  from: string;
  to: string;
  /** "YYYY-MM-DD"; empty = no limit */
  dateFrom?: string;
  dateTo?: string;
};

export type HappyHour = Window & {
  id: string;
  name: string;
  pct: number;
  /** category ids; empty = whole menu */
  cats: string[];
  active: boolean;
};

export type DealKind = 'nplus' | 'set' | 'tiers' | 'first';
export type Deal = Window & {
  id: string;
  kind: DealKind;
  name: string;
  /** shown to guests on the site; Uzbek twin optional */
  nameUz?: string;
  active: boolean;
  site: boolean;
  pos: boolean;
  /** may a promo code be used together with this deal */
  withPromo?: boolean;
  /** dishes already discounted by happy hours take part too */
  withHappy?: boolean;
  /* nplus: buy N of the target, M more get pct off (100 = free) */
  cats?: string[];
  dishes?: string[];
  buy?: number;
  get?: number;
  pct?: number;
  /* set: one of each dish for a fixed price */
  setDishes?: string[];
  setPrice?: number;
  /* tiers: % off the dishes from a sum */
  tiers?: { from: number; pct: number }[];
  /* first: % off the first order (guest recognised by phone) */
};

export type LoyaltyCfg = {
  enabled: boolean;
  /** % of the paid dishes returned as points (1 point = 1 sum) */
  earnPct: number;
  /** up to this % of an order may be paid with points */
  maxRedeemPct: number;
  /** points for a new guest's first completed order */
  welcome: number;
};
export const LOYALTY_DEFAULT: LoyaltyCfg = { enabled: false, earnPct: 3, maxRedeemPct: 30, welcome: 0 };

export const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
export const DAYS_UZ = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

/** Weekday, minutes and date in Tashkent. */
export function tkNow(d = new Date()) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tashkent', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return {
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
    min: +get('hour') * 60 + +get('minute'),
    ymd: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

const toMin = (s: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s || '');
  return m ? +m[1] * 60 + +m[2] : null;
};

export function inWindow(w: Window, now = tkNow()) {
  if (w.dateFrom && now.ymd < w.dateFrom) return false;
  if (w.dateTo && now.ymd > w.dateTo) return false;
  if (w.days?.length && !w.days.includes(now.day)) return false;
  const a = toMin(w.from),
    b = toMin(w.to);
  if (a === null || b === null) return true;
  return b > a ? now.min >= a && now.min < b : now.min >= a || now.min < b;
}

/** "Пн–Пт 15:00–18:00" */
export function windowText(w: Window, uz = false) {
  const names = uz ? DAYS_UZ : DAYS_RU;
  const days = !w.days?.length || w.days.length === 7 ? (uz ? 'har kuni' : 'каждый день') : [1, 2, 3, 4, 5, 6, 0].filter((d) => w.days.includes(d)).map((d) => names[d]).join(', ');
  const time = w.from && w.to ? ` ${w.from}–${w.to}` : '';
  const dates = w.dateTo ? (uz ? ` · ${w.dateTo} gacha` : ` · до ${w.dateTo}`) : '';
  return days + time + dates;
}

/** Best happy-hour discount for a dish right now, %. */
export function happyPct(st: { happyHours?: HappyHour[] }, cat: string, now = tkNow()) {
  let best = 0;
  for (const h of st.happyHours || []) if (h.active && h.pct > 0 && (!h.cats?.length || h.cats.includes(cat)) && inWindow(h, now)) best = Math.max(best, h.pct);
  return Math.min(90, best);
}

/** Price after happy hours, rounded to 100 sum. */
export const happyPrice = (unit: number, pct: number) => (pct > 0 ? Math.round((unit * (100 - pct)) / 100 / 100) * 100 : unit);

export type DealLine = { id: string; cat: string; unit: number; qty: number; hh?: number };
export type DealResult = {
  applied: { id: string; name: string; amount: number }[];
  discount: number;
  /** may a promo code be added */
  promoOk: boolean;
  hints: { dealId: string; ru: string; uz: string; dish?: string; need?: number }[];
};

const n = (x: number) => Math.round(x).toLocaleString('ru-RU').replace(/\s/g, ' ');
const nameOf = (d: Deal, uz: boolean) => (uz && d.nameUz ? d.nameUz : d.name);

/** Which deals apply to these lines, and how much they take off. Item deals first (each portion counts once),
    then the single best deal on the sum. */
export function computeDeals(st: { deals?: Deal[] }, lines: DealLine[], ctx: { channel: 'site' | 'pos'; first?: boolean; now?: ReturnType<typeof tkNow> }): DealResult {
  const now = ctx.now || tkNow();
  const deals = (st.deals || []).filter((d) => d.active && (ctx.channel === 'site' ? d.site : d.pos) && inWindow(d, now));
  // one entry per portion so each can be used by one deal only
  const units = lines.flatMap((l) => Array.from({ length: Math.max(0, l.qty) }, () => ({ id: l.id, cat: l.cat, unit: l.unit, hh: l.hh || 0, used: false })));
  const applied: DealResult['applied'] = [];
  const hints: DealResult['hints'] = [];

  for (const d of deals.filter((x) => x.kind === 'set')) {
    const want = (d.setDishes || []).filter(Boolean);
    if (want.length < 2 || !(d.setPrice! > 0)) continue;
    let amount = 0;
    for (;;) {
      const pick = want.map((id) => units.filter((u) => !u.used && u.id === id && (d.withHappy || !u.hh)).sort((a, b) => b.unit - a.unit)[0]);
      if (pick.some((u) => !u)) break;
      const sum = pick.reduce((s, u) => s + u!.unit, 0);
      if (sum <= d.setPrice!) break;
      pick.forEach((u) => (u!.used = true));
      amount += sum - d.setPrice!;
    }
    if (amount > 0) applied.push({ id: d.id, name: d.name, amount });
    else {
      const ok = (id: string) => units.some((u) => !u.used && u.id === id && (d.withHappy || !u.hh));
      const have = want.filter(ok);
      const miss = want.filter((id) => !ok(id) && !units.some((u) => u.id === id));
      if (have.length && miss.length === 1) hints.push({ dealId: d.id, dish: miss[0], ru: `Добавьте ещё одно блюдо — сработает «${d.name}» за ${n(d.setPrice!)} сум`, uz: `Yana bitta taom qoʻshing — «${nameOf(d, true)}» ${n(d.setPrice!)} soʻmga` });
    }
  }

  for (const d of deals.filter((x) => x.kind === 'nplus')) {
    const buy = Math.max(1, d.buy || 1),
      get = Math.max(1, d.get || 1),
      pct = Math.min(100, Math.max(1, d.pct ?? 100));
    const fits = (u: (typeof units)[number]) => !u.used && (d.withHappy || !u.hh) && ((d.dishes || []).includes(u.id) || (d.cats || []).includes(u.cat));
    const pool = units.filter(fits).sort((a, b) => b.unit - a.unit);
    const groups = Math.floor(pool.length / (buy + get));
    let amount = 0;
    for (let g = 0; g < groups; g++) {
      // groups from the most expensive down; in each group of N+M the M cheapest get the discount
      const grp = pool.splice(0, buy + get);
      grp.forEach((u) => (u.used = true));
      grp.slice(buy).forEach((u) => (amount += Math.round((u.unit * pct) / 100)));
    }
    if (amount > 0) applied.push({ id: d.id, name: d.name, amount });
    const rest = pool.length;
    if (rest >= Math.max(1, buy - 1) && rest < buy + get) {
      const need = buy + get - rest;
      const what = pct >= 100 ? (get === 1 ? 'одна бесплатно' : `${get} бесплатно`) : `${get === 1 ? 'одна' : get} со скидкой ${pct}%`;
      const whatUz = pct >= 100 ? `${get} tasi bepul` : `${get} tasiga ${pct}% chegirma`;
      hints.push({ dealId: d.id, need, dish: pool[0]?.id, ru: `Добавьте ещё ${need} шт. — ${what} («${d.name}»)`, uz: `Yana ${need} dona qoʻshing — ${whatUz} («${nameOf(d, true)}»)` });
    }
  }

  const itemDisc = applied.reduce((s, a) => s + a.amount, 0);
  const sub = units.reduce((s, u) => s + u.unit, 0) - itemDisc;
  let best: { d: Deal; amount: number } | null = null;
  let nextTier: { d: Deal; from: number; pct: number } | null = null;
  for (const d of deals) {
    let amount = 0;
    if (d.kind === 'tiers') {
      const ts = (d.tiers || []).filter((t) => t.from > 0 && t.pct > 0).sort((a, b) => a.from - b.from);
      const hit = ts.filter((t) => sub >= t.from).pop();
      if (hit) amount = Math.round((sub * hit.pct) / 100);
      const nx = ts.find((t) => sub < t.from);
      if (nx && (!nextTier || nx.from < nextTier.from)) nextTier = { d, ...nx };
    } else if (d.kind === 'first' && ctx.first && (d.pct || 0) > 0) amount = Math.round((sub * d.pct!) / 100);
    if (amount > 0 && (!best || amount > best.amount)) best = { d, amount };
  }
  if (best) applied.push({ id: best.d.id, name: best.d.name, amount: Math.min(best.amount, sub) });
  if (nextTier && sub > 0) {
    const left = nextTier.from - sub;
    hints.push({ dealId: nextTier.d.id, ru: `Ещё ${n(left)} сум до скидки ${nextTier.pct}%`, uz: `${nextTier.pct}% chegirmagacha yana ${n(left)} soʻm` });
  }

  const used = new Set(applied.map((a) => a.id));
  const promoOk = deals.filter((d) => used.has(d.id)).every((d) => d.withPromo);
  const discount = Math.min(
    applied.reduce((s, a) => s + a.amount, 0),
    lines.reduce((s, l) => s + l.unit * l.qty, 0),
  );
  return { applied, discount, promoOk, hints };
}

/** Points that may pay for an order. */
export function maxRedeem(cfg: LoyaltyCfg | undefined, payable: number, balance: number) {
  if (!cfg?.enabled) return 0;
  return Math.max(0, Math.min(balance, Math.floor((payable * (cfg.maxRedeemPct || 0)) / 100)));
}
export const earnFor = (cfg: LoyaltyCfg | undefined, paidDishes: number) => (cfg?.enabled ? Math.floor((Math.max(0, paidDishes) * (cfg.earnPct || 0)) / 100) : 0);
