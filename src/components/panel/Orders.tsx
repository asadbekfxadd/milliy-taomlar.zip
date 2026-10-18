'use client';
import { useCallback, useEffect, useState } from 'react';
import { PAY_RU, STATUS_RU, TYPE_RU } from '@/lib/rbac';
import { prettyPhone } from '@/lib/format';
import { api, money, PageHead, usePanel, when } from './kit';
import type { OrderItem } from '@/lib/types';

type O = {
  id: string; no: number; status: string; type: string; source: string; tableNo: number | null; guests: number; waiter: string; cashier: string;
  name: string; phone: string; address: string; zone: string; note: string; when: string; pay: string; paidWith: string; payStatus: string;
  items: OrderItem[]; subtotal: number; service: number; fee: number; discount: number; promo: string; total: number; tips: number;
  createdAt: string; paidAt: string | null; cancelReason: string;
};

const tone: Record<string, string> = { new: 'bad', accepted: 'new', cooking: 'new', ready: 'ok', done: '', cancelled: '' };
const place = (o: O) => (o.type === 'hall' ? `Стол ${o.tableNo ?? '—'}` : `${o.source === 'site' ? 'Сайт · ' : ''}${TYPE_RU[o.type]}`);

export default function Orders() {
  const [status, setStatus] = useState('open');
  const [type, setType] = useState('');
  const [days, setDays] = useState('7');
  const [qs, setQs] = useState('');
  const [list, setList] = useState<O[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<O | null>(null);
  const { toast } = usePanel();

  const load = useCallback(async () => {
    const p = new URLSearchParams({ status, days });
    if (type) p.set('type', type);
    if (qs.trim()) p.set('q', qs.trim());
    try {
      setList(await api(`/api/admin/orders?${p}`));
      setErr(null);
    } catch (e: any) {
      setErr(e.message);
    }
  }, [status, type, days, qs]);

  useEffect(() => {
    const t0 = setTimeout(load, qs ? 300 : 0);
    const t = setInterval(load, 15000);
    return () => (clearTimeout(t0), clearInterval(t));
  }, [load, qs]);

  const total = (list || []).filter((o) => o.status === 'done').reduce((s, o) => s + o.total, 0);

  return (
    <>
      <PageHead title="Заказы" sub="Все чеки: зал, с собой и с сайта. Работа с открытым заказом — на кассе; здесь история и поиск." />
      <div className="box">
        <div className="sx-row" style={{ marginBottom: 12 }}>
          <div className="seg">
            {[
              ['open', 'В работе'],
              ['done', 'Закрытые'],
              ['cancelled', 'Отменённые'],
              ['all', 'Все'],
            ].map(([k, l]) => (
              <button key={k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>
                {l}
              </button>
            ))}
          </div>
          <select className="ip sm" style={{ width: 'auto' }} value={type} onChange={(e) => setType(e.target.value)} aria-label="Тип заказа">
            <option value="">Зал, с собой и доставка</option>
            <option value="hall">Только зал</option>
            <option value="pickup">Только с собой</option>
            <option value="delivery">Только доставка</option>
          </select>
          <select className="ip sm" style={{ width: 'auto' }} value={days} onChange={(e) => setDays(e.target.value)} aria-label="Период">
            <option value="1">Сутки</option>
            <option value="7">7 дней</option>
            <option value="30">30 дней</option>
            <option value="90">90 дней</option>
          </select>
          <input className="ip sm" style={{ flex: '1 1 200px', width: 'auto' }} placeholder="№ чека, телефон или имя" value={qs} onChange={(e) => setQs(e.target.value)} />
        </div>
        {err && <p className="err">{err}</p>}
        {!list ? (
          <div className="empty">Загружаем…</div>
        ) : !list.length ? (
          <div className="empty">
            <b>Заказов нет</b>
            Попробуйте другой период или фильтр.
          </div>
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Время</th>
                    <th>Где</th>
                    <th>Гость / официант</th>
                    <th>Статус</th>
                    <th>Оплата</th>
                    <th className="r">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((o) => (
                    <tr key={o.id} className="click" onClick={() => setOpen(o)}>
                      <td className="num">
                        <b>{o.no}</b>
                      </td>
                      <td className="num muted">{when(o.createdAt)}</td>
                      <td>{place(o)}</td>
                      <td>{o.source === 'site' ? `${o.name} · ${prettyPhone(o.phone)}` : o.waiter || '—'}</td>
                      <td>
                        <span className={`bd ${tone[o.status]}`}>{STATUS_RU[o.status]}</span>
                      </td>
                      <td className="muted">{o.payStatus === 'paid' ? PAY_RU[o.paidWith] || o.paidWith : o.status === 'cancelled' ? '—' : 'не оплачен'}</td>
                      <td className="r num">
                        <b>{money(o.total)}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small" style={{ margin: '10px 0 0' }}>
              Показано {list.length}. Закрытые на сумму {money(total)} сум.
            </p>
          </>
        )}
      </div>
      {open && (
        <OrderSheet
          o={open}
          onClose={() => setOpen(null)}
          onStatus={async (s) => {
            try {
              await api(`/api/admin/orders/${open.id}`, 'PATCH', { status: s });
              toast('Статус изменён');
              setOpen(null);
              load();
            } catch (e: any) {
              toast(e.message);
            }
          }}
        />
      )}
    </>
  );
}

function OrderSheet({ o, onClose, onStatus }: { o: O; onClose: () => void; onStatus: (s: string) => void }) {
  const [s, setS] = useState(o.status);
  return (
    <div className="sx-modal" role="dialog" aria-modal="true" aria-label={`Чек № ${o.no}`}>
      <div className="sx-scrim" onClick={onClose} />
      <div className="sx-sheet">
        <div className="box-head" style={{ margin: 0 }}>
          <h3>
            Чек № {o.no} · {place(o)}
          </h3>
          <span className={`bd ${tone[o.status]}`}>{STATUS_RU[o.status]}</span>
        </div>
        <div className="rep">
          <div>
            <span className="muted">Открыт</span>
            <span>{when(o.createdAt)}</span>
          </div>
          {o.paidAt && (
            <div>
              <span className="muted">Оплачен</span>
              <span>
                {when(o.paidAt)} · {PAY_RU[o.paidWith] || o.paidWith}
                {o.cashier ? ` · ${o.cashier}` : ''}
              </span>
            </div>
          )}
          {o.waiter && (
            <div>
              <span className="muted">Официант</span>
              <span>
                {o.waiter}
                {o.guests ? ` · гостей ${o.guests}` : ''}
              </span>
            </div>
          )}
          {o.source === 'site' && (
            <div>
              <span className="muted">Гость</span>
              <span>
                {o.name} · <a href={`tel:${o.phone}`}>{prettyPhone(o.phone)}</a>
              </span>
            </div>
          )}
          {o.address && (
            <div>
              <span className="muted">Адрес</span>
              <span>
                {o.zone}: {o.address}
              </span>
            </div>
          )}
          {o.note && (
            <div>
              <span className="muted">Комментарий</span>
              <span>{o.note}</span>
            </div>
          )}
          {o.cancelReason && (
            <div>
              <span className="muted">Причина отмены</span>
              <span>{o.cancelReason}</span>
            </div>
          )}
        </div>
        <table className="tbl">
          <tbody>
            {o.items.map((l, i) => (
              <tr key={i} style={l.void ? { opacity: 0.55 } : undefined}>
                <td>
                  {l.name}
                  {l.mods ? <span className="muted"> · {l.mods}</span> : null}
                  {l.void && <div className="small" style={{ color: 'var(--red)' }}>отменено: {l.void.reason} · {l.void.by}</div>}
                </td>
                <td className="r num">× {l.qty}</td>
                <td className="r num">{l.void ? '—' : money(l.unit * l.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="rep">
          {o.service > 0 && (
            <div>
              <span>Обслуживание</span>
              <span className="num">{money(o.service)}</span>
            </div>
          )}
          {o.fee > 0 && (
            <div>
              <span>Доставка</span>
              <span className="num">{money(o.fee)}</span>
            </div>
          )}
          {o.discount > 0 && (
            <div>
              <span>Скидка {o.promo}</span>
              <span className="num">−{money(o.discount)}</span>
            </div>
          )}
          <div className="t">
            <span>Итого</span>
            <span className="num">{money(o.total)} сум</span>
          </div>
          {o.tips > 0 && (
            <div>
              <span>Чаевые</span>
              <span className="num">{money(o.tips)}</span>
            </div>
          )}
        </div>
        <details>
          <summary className="muted small" style={{ cursor: 'pointer' }}>
            Изменить статус вручную (управляющий)
          </summary>
          <div className="sx-row" style={{ marginTop: 8 }}>
            <select className="ip" style={{ width: 'auto' }} value={s} onChange={(e) => setS(e.target.value)}>
              {Object.entries(STATUS_RU).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
            <button className="b" disabled={s === o.status} onClick={() => onStatus(s)}>
              Сохранить статус
            </button>
          </div>
          <p className="muted small">Обычно не нужно: касса и кухня меняют статус сами. Закрытый вручную чек списывает продукты по техкартам.</p>
        </details>
        <button className="b" onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  );
}
