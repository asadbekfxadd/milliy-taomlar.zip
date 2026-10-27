'use client';
import { useCallback, useEffect, useState } from 'react';
import { prettyPhone } from '@/lib/format';
import { api, PageHead, usePanel } from './kit';

type R = {
  id: number;
  day: string;
  time: string;
  guests: number;
  name: string;
  phone: string;
  note: string;
  tableNo: number | null;
  status: 'new' | 'confirmed' | 'seated' | 'cancelled' | 'noshow';
  source: 'site' | 'staff';
  byName: string;
};
const ST: Record<R['status'], [string, string]> = {
  new: ['Новая', 'new'],
  confirmed: ['Подтверждена', 'ok'],
  seated: ['Гости пришли', ''],
  cancelled: ['Отменена', 'bad'],
  noshow: ['Не пришли', 'bad'],
};

const shift = (day: string, k: number) => {
  if (!day) return '';
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + k)).toISOString().slice(0, 10);
};
const dayName = (day: string, today: string) => {
  if (!day) return '';
  if (day === today) return 'Сегодня';
  if (day === shift(today, 1)) return 'Завтра';
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('ru-RU', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });
};

export default function Reservations({ tables, enabled, maxGuests }: { tables: number; enabled: boolean; maxGuests: number }) {
  const { toast } = usePanel();
  const [view, setView] = useState<'day' | 'upcoming'>('day');
  const [day, setDay] = useState('');
  const [today, setToday] = useState('');
  const [list, setList] = useState<R[] | null>(null);
  const [form, setForm] = useState(false);
  const [on, setOn] = useState(enabled);

  const load = useCallback(async () => {
    try {
      const j = await api(`/api/staff/reservations?day=${view === 'upcoming' ? 'upcoming' : day}`);
      setList(j.list);
      setToday(j.today);
      if (!day && j.day) setDay(j.day);
    } catch (e: any) {
      toast(e.message);
    }
  }, [day, view, toast]);
  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const patch = async (id: number, body: Record<string, unknown>, ok: string) => {
    try {
      await api('/api/staff/reservations', 'PATCH', { id, ...body });
      toast(ok);
      load();
    } catch (e: any) {
      toast(e.message);
    }
  };

  const active = (list || []).filter((r) => r.status === 'new' || r.status === 'confirmed');
  const guests = active.reduce((a, r) => a + r.guests, 0);

  return (
    <>
      <PageHead title="Бронь столов" sub="Заявки с сайта и брони по телефону. Подтвердите заявку и назначьте стол — официант и касса увидят бронь на плане зала.">
        <button className="b main" onClick={() => setForm(true)}>
          + Бронь по телефону
        </button>
      </PageHead>
      <div className="kpis">
        <div className="kpi">
          <span>{view === 'upcoming' ? 'Активных броней' : dayName(day || today, today)}</span>
          <b>{active.length}</b>
          <small>{guests} гостей</small>
        </div>
        <div className="kpi">
          <span>Ждут подтверждения</span>
          <b>{active.filter((r) => r.status === 'new').length}</b>
          <small>позвоните гостю</small>
        </div>
        <div className="kpi">
          <span>Без стола</span>
          <b>{active.filter((r) => !r.tableNo).length}</b>
        </div>
        <div className="kpi">
          <span>Бронь на сайте</span>
          <div>
            <button
              className={`tg ${on ? 'on' : ''}`}
              style={{ marginTop: 6 }}
              onClick={async () => {
                try {
                  await api('/api/admin/settings', 'PATCH', {
                    bookingEnabled: !on,
                  });
                  setOn(!on);
                  toast(!on ? 'Гости могут бронировать на сайте' : 'Бронь на сайте выключена');
                } catch (e: any) {
                  toast(e.message);
                }
              }}
            >
              {on ? 'Включена' : 'Выключена'}
            </button>
          </div>
          <small>до {maxGuests} гостей, страница /book</small>
        </div>
      </div>
      <div className="box">
        <div className="sx-row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          <div className="seg">
            <button className={view === 'day' && day === today ? 'on' : ''} onClick={() => (setView('day'), setDay(today))}>
              Сегодня
            </button>
            <button className={view === 'day' && day === shift(today, 1) ? 'on' : ''} onClick={() => (setView('day'), setDay(shift(today, 1)))}>
              Завтра
            </button>
            <button className={view === 'upcoming' ? 'on' : ''} onClick={() => setView('upcoming')}>
              Все будущие
            </button>
          </div>
          {view === 'day' && (
            <>
              <button className="b sm" onClick={() => setDay(shift(day, -1))} aria-label="Предыдущий день">
                ←
              </button>
              <input className="ip sm" type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} style={{ width: 'auto' }} />
              <button className="b sm" onClick={() => setDay(shift(day, 1))} aria-label="Следующий день">
                →
              </button>
            </>
          )}
        </div>
        {!list ? (
          <div className="empty">Загружаем…</div>
        ) : list.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  {view === 'upcoming' && <th>День</th>}
                  <th>Время</th>
                  <th>Гость</th>
                  <th className="r">Гостей</th>
                  <th>Стол</th>
                  <th>Статус</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const live = r.status === 'new' || r.status === 'confirmed';
                  return (
                    <tr key={r.id} style={live ? undefined : { opacity: 0.55 }}>
                      {view === 'upcoming' && <td>{dayName(r.day, today)}</td>}
                      <td className="num">
                        <b>{r.time}</b>
                      </td>
                      <td>
                        <b>{r.name}</b>
                        <div className="muted small">
                          <a href={`tel:${r.phone}`}>{prettyPhone(r.phone)}</a> · {r.source === 'site' ? 'с сайта' : `принял ${r.byName || '—'}`}
                        </div>
                        {r.note && <div className="small">{r.note}</div>}
                      </td>
                      <td className="r num">{r.guests}</td>
                      <td>
                        <select
                          className="ip sm"
                          style={{ width: 'auto' }}
                          value={r.tableNo || ''}
                          disabled={!live}
                          onChange={(e) => patch(r.id, { table: Number(e.target.value) || null }, e.target.value ? `Стол ${e.target.value} за ${r.name}` : 'Стол снят')}
                        >
                          <option value="">—</option>
                          {Array.from({ length: tables }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={`bd ${ST[r.status][1]}`}>{ST[r.status][0]}</span>
                      </td>
                      <td className="r" style={{ whiteSpace: 'nowrap' }}>
                        {r.status === 'new' && (
                          <button className="b sm main" onClick={() => patch(r.id, { status: 'confirmed' }, 'Бронь подтверждена')}>
                            Подтвердить
                          </button>
                        )}
                        {live && (
                          <>
                            {' '}
                            <button className="b sm" onClick={() => patch(r.id, { status: 'seated' }, 'Гости пришли')}>
                              Пришли
                            </button>{' '}
                            <button className="b sm" onClick={() => patch(r.id, { status: 'noshow' }, 'Отмечено: не пришли')}>
                              Не пришли
                            </button>{' '}
                            <button className="b sm danger" onClick={() => patch(r.id, { status: 'cancelled' }, 'Бронь отменена')}>
                              Отменить
                            </button>
                          </>
                        )}
                        {!live && (
                          <button className="b sm" onClick={() => patch(r.id, { status: 'confirmed' }, 'Бронь восстановлена')}>
                            Вернуть
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <b>Броней нет</b>
            {on ? 'Гости бронируют на сайте на странице «Бронь стола». Брони по телефону добавьте кнопкой сверху.' : 'Бронь на сайте выключена. Брони по телефону добавьте кнопкой сверху.'}
          </div>
        )}
      </div>
      {form && (
        <NewBooking
          tables={tables}
          day={day || today}
          onClose={() => setForm(false)}
          onDone={(d) => {
            setForm(false);
            setView('day');
            setDay(d);
            load();
          }}
        />
      )}
    </>
  );
}

function NewBooking({ tables, day, onClose, onDone }: { tables: number; day: string; onClose: () => void; onDone: (day: string) => void }) {
  const { toast } = usePanel();
  const [f, setF] = useState({
    name: '',
    phone: '+998 ',
    day,
    time: '19:00',
    guests: '2',
    table: '',
    note: '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  return (
    <div className="sx-modal" role="dialog" aria-modal="true" aria-label="Новая бронь">
      <div className="sx-scrim" onClick={onClose} />
      <div className="sx-sheet">
        <h3>Бронь по телефону</h3>
        <div className="grid-f">
          <label className="f">
            <span>Имя гостя</span>
            <input className="ip" value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus />
          </label>
          <label className="f">
            <span>Телефон</span>
            <input className="ip" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          </label>
          <label className="f">
            <span>Дата</span>
            <input className="ip" type="date" value={f.day} onChange={(e) => set('day', e.target.value)} />
          </label>
          <label className="f">
            <span>Время</span>
            <input className="ip" type="time" step={900} value={f.time} onChange={(e) => set('time', e.target.value)} />
          </label>
          <label className="f">
            <span>Гостей</span>
            <input className="ip" inputMode="numeric" value={f.guests} onChange={(e) => set('guests', e.target.value.replace(/\D/g, ''))} />
          </label>
          <label className="f">
            <span>Стол</span>
            <select className="ip" value={f.table} onChange={(e) => set('table', e.target.value)}>
              <option value="">Назначить потом</option>
              {Array.from({ length: tables }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Стол {n}
                </option>
              ))}
            </select>
          </label>
          <label className="f full">
            <span>Заметка</span>
            <input className="ip" placeholder="День рождения, детский стул, у окна…" value={f.note} onChange={(e) => set('note', e.target.value)} />
          </label>
        </div>
        <div className="sx-row">
          <button className="b" onClick={onClose}>
            Отмена
          </button>
          <button
            className="b main"
            style={{ flex: 1 }}
            disabled={busy || !f.name.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await api('/api/staff/reservations', 'POST', {
                  ...f,
                  guests: Number(f.guests) || 2,
                  table: Number(f.table) || null,
                });
                toast('Бронь записана');
                onDone(f.day);
              } catch (e: any) {
                toast(e.message);
              }
              setBusy(false);
            }}
          >
            {busy ? 'Сохраняем…' : 'Записать бронь'}
          </button>
        </div>
      </div>
    </div>
  );
}
