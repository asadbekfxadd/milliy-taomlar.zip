'use client';
import { useEffect, useMemo, useState } from 'react';
import { prettyPhone } from '@/lib/format';
import { STATUS_RU, TYPE_RU } from '@/lib/rbac';
import { api, money, PageHead, usePanel, when } from './kit';

type C = { phone: string; name: string; orders: number; spent: number; first: string; last: string; delivery: boolean; note: string; points: number };
const DAY = 86400_000;
const SEG: [string, string, (c: C) => boolean][] = [
  ['all', 'Все', () => true],
  ['regular', 'Постоянные (3+ заказа)', (c) => c.orders >= 3],
  ['new', 'Новые за 30 дней', (c) => Date.now() - Date.parse(c.first) < 30 * DAY],
  ['lost', 'Давно не заказывали', (c) => c.orders >= 2 && Date.now() - Date.parse(c.last) > 45 * DAY],
];

export default function Customers({ list }: { list: C[] }) {
  const [seg, setSeg] = useState('all');
  const [qs, setQs] = useState('');
  const [open, setOpen] = useState<C | null>(null);
  const shown = useMemo(() => {
    const f = SEG.find((s) => s[0] === seg)![2];
    const s = qs.trim().toLowerCase();
    const d = s.replace(/\D/g, '');
    return list.filter((c) => f(c) && (!s || c.name.toLowerCase().includes(s) || (d.length >= 3 && c.phone.includes(d))));
  }, [list, seg, qs]);

  return (
    <>
      <PageHead title="Клиенты" sub="Гости с номером телефона — с сайта, из Telegram и с кассы: сколько раз заказывали, на какую сумму, сколько баллов. Сюда можно записать заметку и начислить баллы вручную." />
      <div className="kpis">
        <div className="kpi">
          <span>Всего гостей</span>
          <b>{list.length}</b>
        </div>
        <div className="kpi">
          <span>Постоянные</span>
          <b>{list.filter(SEG[1][2]).length}</b>
          <small>3 и больше заказов</small>
        </div>
        <div className="kpi">
          <span>Новые за 30 дней</span>
          <b>{list.filter(SEG[2][2]).length}</b>
        </div>
        <div className="kpi">
          <span>Давно не заказывали</span>
          <b>{list.filter(SEG[3][2]).length}</b>
          <small>повод позвонить или дать промокод</small>
        </div>
      </div>
      <div className="box">
        <div className="sx-row" style={{ marginBottom: 12 }}>
          <div className="seg">
            {SEG.map(([k, l]) => (
              <button key={k} className={seg === k ? 'on' : ''} onClick={() => setSeg(k)}>
                {l}
              </button>
            ))}
          </div>
          <input className="ip sm" style={{ flex: '1 1 200px', width: 'auto' }} placeholder="Имя или телефон" value={qs} onChange={(e) => setQs(e.target.value)} />
        </div>
        {shown.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Гость</th>
                  <th>Телефон</th>
                  <th className="r">Заказов</th>
                  <th className="r">Потратил</th>
                  <th className="r">Баллы</th>
                  <th>Последний заказ</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, 300).map((c) => (
                  <tr key={c.phone} className="click" onClick={() => setOpen(c)}>
                    <td>
                      <b>{c.name || 'Без имени'}</b>
                      {c.note && <div className="muted small">{c.note}</div>}
                    </td>
                    <td className="num">{prettyPhone(c.phone)}</td>
                    <td className="r num">{c.orders}</td>
                    <td className="r num">{money(c.spent)}</td>
                    <td className="r num">{c.points ? money(c.points) : '—'}</td>
                    <td className="muted num">{when(c.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <b>Никого не нашлось</b>
            {list.length ? 'Смените фильтр или поиск.' : 'Гости появятся здесь после первых заказов на сайте.'}
          </div>
        )}
      </div>
      {open && <Guest c={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Guest({ c, onClose }: { c: C; onClose: () => void }) {
  const [data, setData] = useState<{ note: string; orders: any[] } | null>(null);
  const [note, setNote] = useState(c.note);
  const { toast } = usePanel();
  useEffect(() => {
    api(`/api/admin/customers?phone=${encodeURIComponent(c.phone)}`).then(setData).catch((e) => toast(e.message));
  }, [c.phone, toast]);
  return (
    <div className="sx-modal" role="dialog" aria-modal="true" aria-label={c.name}>
      <div className="sx-scrim" onClick={onClose} />
      <div className="sx-sheet">
        <h3>{c.name || 'Гость'}</h3>
        <div className="sx-row">
          <a className="b sm" href={`tel:${c.phone}`}>
            Позвонить {prettyPhone(c.phone)}
          </a>
          <span className="muted small">
            {c.orders} заказов · {money(c.spent)} сум · с {when(c.first).slice(0, 5)}
          </span>
        </div>
        <label className="f">
          <span>Заметка о госте</span>
          <textarea className="ip" rows={2} placeholder="Например: аллергия на орехи, любит острое, заказывает на офис" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <PointsBox c={c} />
        <button
          className="b sm"
          style={{ alignSelf: 'flex-start' }}
          disabled={note === c.note}
          onClick={async () => {
            try {
              await api('/api/admin/customers', 'PATCH', { phone: c.phone, note });
              c.note = note;
              toast('Заметка сохранена');
            } catch (e: any) {
              toast(e.message);
            }
          }}
        >
          Сохранить заметку
        </button>
        {!data ? (
          <div className="empty">Загружаем заказы…</div>
        ) : (
          <table className="tbl">
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.id}>
                  <td className="num muted">{when(o.createdAt)}</td>
                  <td>
                    № {o.no} · {TYPE_RU[o.type]} · <span className="muted">{STATUS_RU[o.status]}</span>
                    <div className="muted small">{o.items.map((l: any) => `${l.name} × ${l.qty}`).join(', ')}</div>
                  </td>
                  <td className="r num">{money(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button className="b" onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  );
}

function PointsBox({ c }: { c: C }) {
  const { toast } = usePanel();
  const [pts, setPts] = useState(c.points);
  const [hist, setHist] = useState<{ points: number; note: string; at: string }[]>([]);
  const [n, setN] = useState('');
  const [why, setWhy] = useState('');
  useEffect(() => {
    api(`/api/admin/loyalty?phone=${encodeURIComponent(c.phone)}`)
      .then((j) => (setPts(j.points), setHist(j.history)))
      .catch(() => {});
  }, [c.phone]);
  const go = async (sign: 1 | -1) => {
    try {
      const j = await api('/api/admin/loyalty', 'POST', { phone: c.phone, points: sign * Number(n.replace(/\D/g, '')), note: why });
      setPts(j.points);
      c.points = j.points;
      setN('');
      setWhy('');
      toast('Баллы изменены');
      api(`/api/admin/loyalty?phone=${encodeURIComponent(c.phone)}`).then((x) => setHist(x.history));
    } catch (e: any) {
      toast(e.message);
    }
  };
  return (
    <div className="f">
      <span>
        Баллы: <b className="num">{money(pts)}</b>
      </span>
      <div className="sx-row">
        <input className="ip sm num" style={{ width: 110 }} inputMode="numeric" placeholder="Сколько" value={n} onChange={(e) => setN(e.target.value)} />
        <input className="ip sm" style={{ flex: 1 }} placeholder="Причина: подарок, компенсация…" value={why} onChange={(e) => setWhy(e.target.value)} />
        <button className="b sm" disabled={!n || !why.trim()} onClick={() => go(1)}>
          Начислить
        </button>
        <button className="b sm" disabled={!n || !why.trim()} onClick={() => go(-1)}>
          Списать
        </button>
      </div>
      {hist.length > 0 && (
        <div className="muted small">
          {hist.slice(0, 6).map((h, i) => (
            <div key={i}>
              {when(h.at)} · <b className="num">{h.points > 0 ? '+' : ''}{money(h.points)}</b> · {h.note}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
