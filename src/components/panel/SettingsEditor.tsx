'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Promo, Settings } from '@/lib/types';
import { STORY } from '@/lib/defaults';
import { api, money, PageHead, usePanel } from './kit';

/* Settings are one document; each page edits its own fields and sends only what changed. */
function useSettingsDoc(initial: Settings) {
  const [s, setS] = useState<Settings>(() => JSON.parse(JSON.stringify(initial)));
  const [changed, setChanged] = useState<Set<keyof Settings>>(new Set());
  const [busy, setBusy] = useState(false);
  const { toast } = usePanel();
  const router = useRouter();
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    setChanged((c) => new Set(c).add(k));
  };
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (changed.size) e.preventDefault();
    };
    addEventListener('beforeunload', f);
    return () => removeEventListener('beforeunload', f);
  }, [changed]);
  const save = async () => {
    setBusy(true);
    try {
      await api('/api/admin/settings', 'PATCH', Object.fromEntries([...changed].map((k) => [k, s[k]])));
      setChanged(new Set());
      toast('Сохранено');
      router.refresh();
    } catch (e: any) {
      toast('Не сохранилось: ' + e.message);
    }
    setBusy(false);
  };
  const bar = changed.size ? (
    <div className="savebar">
      <span>Есть несохранённые изменения</span>
      <div className="sx-row">
        <button className="b sm" onClick={() => (setS(JSON.parse(JSON.stringify(initial))), setChanged(new Set()))}>
          Отменить
        </button>
        <button className="b main" disabled={busy} onClick={save}>
          {busy ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>
    </div>
  ) : null;
  return { s, set, bar };
}

const num = (v: string) => Number(v.replace(/[^\d.]/g, '')) || 0;
const zonesTxt = (s: Settings) => s.zones.map((z) => `${z.name} | ${z.fee} | ${z.min}${z.uz ? ' | ' + z.uz : ''}`).join('\n');
const parseZones = (t: string) =>
  t
    .split('\n')
    .map((l) => l.split('|').map((x) => x.trim()))
    .filter((a) => a[0])
    .map((a) => ({ name: a[0], fee: num(a[1] || ''), min: num(a[2] || ''), ...(a[3] ? { uz: a[3] } : {}) }));

export function SettingsPage({ initial }: { initial: Settings }) {
  const { s, set, bar } = useSettingsDoc(initial);
  const { toast } = usePanel();
  const t = (k: keyof Settings, label: string, ph = '', hint = '') => (
    <label className="f">
      <span>{label}</span>
      <input className="ip" value={String(s[k] ?? '')} placeholder={ph} onChange={(e) => set(k, e.target.value as never)} />
      {hint && <small>{hint}</small>}
    </label>
  );
  const upload = async (i: number, file?: File) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api('/api/admin/upload', 'POST', fd);
      const p = [...s.storyPhotos];
      p[i] = r.id;
      set('storyPhotos', p);
      toast('Фото загружено. Не забудьте сохранить');
    } catch (e: any) {
      toast(e.message);
    }
  };
  return (
    <>
      <PageHead title="Ресторан и сайт" sub="Контакты, часы приёма заказов, доставка, зал и печать." />
      <div className="box">
        <h2>Контакты</h2>
        <p>Показываются на сайте и в чеках.</p>
        <div className="grid-f">
          {t('name', 'Название')}
          {t('phone', 'Телефон для заказов', '+998 …')}
          {t('phone2', 'Второй телефон', '+998 …')}
          {t('instagram', 'Instagram', '@account')}
          {t('telegram', 'Telegram', '@account')}
          {t('mapUrl', 'Ссылка на карту', 'https://yandex.uz/maps/…')}
          {t('city', 'Город по-русски')}
          {t('cityUz', 'Город по-узбекски')}
          {t('address', 'Адрес по-русски', 'Улица, дом, ориентир')}
          {t('addressUz', 'Адрес по-узбекски')}
          {t('hours', 'Часы работы по-русски', 'ежедневно 9:00–23:00')}
          {t('hoursUz', 'Часы работы по-узбекски')}
          {t('tagline', 'Слоган по-русски')}
          {t('taglineUz', 'Слоган по-узбекски')}
        </div>
      </div>

      <div className="box">
        <h2>Онлайн-заказы</h2>
        <p>Вне этих часов сайт пишет «Сейчас закрыты» и не принимает заказ. Заказы за столом по QR работают всегда.</p>
        <div className="grid-f">
          <div className="f full">
            <span>Что можно на сайте</span>
            <div className="toggles">
              <button type="button" className={`tg ${s.pickup ? 'on' : ''}`} onClick={() => set('pickup', !s.pickup)}>
                Самовывоз
              </button>
              <button type="button" className={`tg ${s.delivery ? 'on' : ''}`} onClick={() => set('delivery', !s.delivery)}>
                Доставка
              </button>
              <button type="button" className={`tg ${s.pay.cash ? 'on' : ''}`} onClick={() => set('pay', { ...s.pay, cash: !s.pay.cash })}>
                Оплата наличными
              </button>
              <button type="button" className={`tg ${s.pay.card ? 'on' : ''}`} onClick={() => set('pay', { ...s.pay, card: !s.pay.card })}>
                Картой при получении
              </button>
              <button type="button" className={`tg ${s.ordersPaused ? 'on' : ''}`} onClick={() => set('ordersPaused', !s.ordersPaused)} style={s.ordersPaused ? { background: 'var(--red-soft)', borderColor: 'var(--red)', color: '#8E2619' } : undefined}>
                {s.ordersPaused ? 'Приём на паузе' : 'Поставить приём на паузу'}
              </button>
            </div>
          </div>
          <label className="f">
            <span>Принимаем с</span>
            <input className="ip" type="time" value={s.openFrom || ''} onChange={(e) => set('openFrom', e.target.value)} />
          </label>
          <label className="f">
            <span>до</span>
            <input className="ip" type="time" value={s.openTo || ''} onChange={(e) => set('openTo', e.target.value)} />
          </label>
          <div className="f">
            <span>Рабочие дни</span>
            <div className="toggles">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d, k) => {
                const i = (k + 1) % 7;
                const off = (s.closedDays || []).includes(i);
                return (
                  <button key={i} type="button" className={`tg ${off ? '' : 'on'}`} onClick={() => set('closedDays', off ? (s.closedDays || []).filter((y) => y !== i) : [...(s.closedDays || []), i])}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="f">
            <span>Готовим, минут</span>
            <input className="ip num" inputMode="numeric" value={String(s.prepMinutes ?? 25)} onChange={(e) => set('prepMinutes', Math.max(1, Math.min(240, num(e.target.value))))} />
            <small>Гость видит «будет готово к …»</small>
          </label>
          <label className="f">
            <span>Доставка в пути, минут</span>
            <input className="ip num" inputMode="numeric" value={String(s.deliveryMinutes ?? 20)} onChange={(e) => set('deliveryMinutes', Math.min(240, num(e.target.value)))} />
          </label>
          <label className="f full">
            <span>Зоны доставки — по строке: название | цена доставки | минимальный заказ | по-узбекски</span>
            <textarea className="ip" rows={4} defaultValue={zonesTxt(s)} onChange={(e) => set('zones', parseZones(e.target.value))} />
          </label>
        </div>
      </div>

      <div className="box">
        <h2>Зал, кухня и печать</h2>
        <p>Число столов и QR-карточки — в разделе «Столы и QR». Какой цех готовит категорию — в «Категории и цеха».</p>
        <div className="grid-f">
          <label className="f">
            <span>Обслуживание в зале, %</span>
            <input className="ip num" inputMode="decimal" value={String(s.servicePct ?? 0)} onChange={(e) => set('servicePct', Math.min(30, num(e.target.value)))} />
            <small>Добавляется к чекам зала. 0 — без обслуживания.</small>
          </label>
          <label className="f">
            <span>Ширина чековой ленты</span>
            <select className="ip" value={s.paper || '80'} onChange={(e) => set('paper', e.target.value as '80' | '58')}>
              <option value="80">80 мм</option>
              <option value="58">58 мм</option>
            </select>
          </label>
          <div className="f full">
            <span>Как работать с заказами</span>
            <div className="toggles">
              <button type="button" className={`tg ${s.autoAcceptOnline ? 'on' : ''}`} onClick={() => set('autoAcceptOnline', !s.autoAcceptOnline)}>
                Оплаченные онлайн-заказы сразу на кухню
              </button>
              <button type="button" className={`tg ${s.printGuestChecks ? 'on' : ''}`} onClick={() => set('printGuestChecks', !s.printGuestChecks)}>
                Печатать пречек и чек гостю
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="box">
        <h2>Страница «История»</h2>
        <p>Короткий текст и фото к каждой сцене. Пустое поле на сайте не показывается.</p>
        <div className="grid-f">
          {STORY.map((st, i) => (
            <div className="f" key={i}>
              <span>{st.t}</span>
              <textarea
                className="ip"
                value={s.story[i] || ''}
                onChange={(e) => {
                  const a = [...s.story];
                  a[i] = e.target.value;
                  set('story', a);
                }}
              />
              <div className="sx-row">
                <label className="b sm" style={{ cursor: 'pointer' }}>
                  {s.storyPhotos[i] ? 'Заменить фото' : 'Добавить фото'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => upload(i, e.target.files?.[0])} />
                </label>
                {s.storyPhotos[i] && (
                  <button
                    className="lnk red"
                    onClick={() => {
                      const p = [...s.storyPhotos];
                      p[i] = '';
                      set('storyPhotos', p);
                    }}
                  >
                    Убрать
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {bar}
    </>
  );
}

/* ---------------- promo codes ---------------- */
export function PromosPage({ initial, usage }: { initial: Settings; usage: Record<string, { n: number; discount: number }> }) {
  const { s, set, bar } = useSettingsDoc(initial);
  const promos = s.promos ?? [];
  const up = (i: number, fn: (p: Promo) => void) => {
    const next = promos.map((p) => ({ ...p }));
    fn(next[i]);
    set('promos', next);
  };
  return (
    <>
      <PageHead title="Промокоды" sub="Скидка на блюда при заказе на сайте (доставка не дисконтируется). Коды гостям не видны: проверяются на сервере.">
        <button className="b main" onClick={() => set('promos', [...promos, { code: 'MANGO10', pct: 10, fixed: 0, min: 0, active: false }])}>
          Добавить промокод
        </button>
      </PageHead>
      <div className="box">
        {promos.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Скидка, %</th>
                  <th>или сумма</th>
                  <th>От суммы заказа</th>
                  <th>Использован за 90 дней</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {promos.map((p, i) => {
                  const u = usage[p.code];
                  return (
                    <tr key={i}>
                      <td>
                        <input className="ip sm" style={{ width: 130 }} value={p.code} aria-label="Код" onChange={(e) => up(i, (x) => (x.code = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '')))} />
                      </td>
                      <td>
                        <input className="ip sm num" style={{ width: 80 }} inputMode="numeric" value={p.pct ? String(p.pct) : ''} aria-label="Процент" onChange={(e) => up(i, (x) => ((x.pct = Math.min(90, num(e.target.value))), x.pct && (x.fixed = 0)))} />
                      </td>
                      <td>
                        <input className="ip sm num" style={{ width: 110 }} inputMode="numeric" value={p.fixed ? money(p.fixed) : ''} aria-label="Сумма" onChange={(e) => up(i, (x) => ((x.fixed = num(e.target.value)), x.fixed && (x.pct = 0)))} />
                      </td>
                      <td>
                        <input className="ip sm num" style={{ width: 110 }} inputMode="numeric" value={p.min ? money(p.min) : ''} aria-label="Минимальный заказ" onChange={(e) => up(i, (x) => (x.min = num(e.target.value)))} />
                      </td>
                      <td className="muted">{u ? `${u.n} раз · скидка ${money(u.discount)} сум` : 'ещё не использован'}</td>
                      <td className="r">
                        <div className="sx-row" style={{ flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                          <button type="button" className={`tg ${p.active ? 'on' : ''}`} onClick={() => up(i, (x) => (x.active = !x.active))}>
                            {p.active ? 'Действует' : 'Выключен'}
                          </button>
                          <button className="lnk red" onClick={() => set('promos', promos.filter((_, k) => k !== i))}>
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <b>Промокодов нет</b>
            Например, MANGO10 — скидка 10% на первый заказ.
          </div>
        )}
      </div>
      {bar}
    </>
  );
}

/* ---------------- tables ---------------- */
export function TablesCount({ initial }: { initial: Settings }) {
  const { s, set, bar } = useSettingsDoc(initial);
  return (
    <div className="box noprint">
      <div className="grid-f">
        <label className="f">
          <span>Столов в зале</span>
          <input className="ip num" inputMode="numeric" value={String(s.tables ?? 0)} onChange={(e) => set('tables', Math.min(200, num(e.target.value)))} />
          <small>После сохранения карточки ниже обновятся.</small>
        </label>
      </div>
      {bar}
    </div>
  );
}
