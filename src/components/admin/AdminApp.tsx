'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminOrder, Dish, Menu, Settings } from '@/lib/types';
import { D, MOODS, STATUS, STORY, TAGS } from '@/lib/defaults';
import { basePrice } from '@/lib/pricing';
import { fmt, prettyPhone } from '@/lib/format';
import DishArt from '../DishArt';
import { useSite } from '../Providers';

const ART_LABELS: Record<string, string> = {
  plov: 'Плов', somsa: 'Самса', shashlik: 'Шашлык', lagmon: 'Лагман', non: 'Лепёшка', manti: 'Манты', shurva: 'Шурпа/суп', kazan: 'Казан-кабоб',
  salad: 'Салат', tea: 'Чай', chakchak: 'Чак-чак/сладкое', 'glass-mango': 'Напиток манго', 'glass-kompot': 'Компот', 'glass-ayron': 'Айран',
  brizol: 'Бризоль', mangal: 'Ассорти с мангала', grillveg: 'Овощи гриль', rice: 'Рис', fries: 'Картофель фри', potato: 'Картофель по-деревенски',
  pickles: 'Соленья', 'sauce-red': 'Соус томатный', 'sauce-white': 'Соус белый / сюзьма', 'sauce-chili': 'Соус острый', 'glass-water': 'Вода',
  'glass-cola': 'Газировка', sweets: 'Набот и халва', icecream: 'Мороженое', spices: 'Специи',
  'shashlik-beef': 'Шашлык из говядины', 'shashlik-lula': 'Люля-кебаб', 'shashlik-liver': 'Печень на мангале', 'shashlik-chicken': 'Шашлык из курицы',
  'brizol-beef': 'Бризоль из говядины', 'brizol-mix': 'Бризоль ассорти', dimlama: 'Димлама', 'somsa-pumpkin': 'Самса с тыквой', patir: 'Патир',
  chuchvara: 'Чучвара', xonim: 'Ханум', mastava: 'Мастава', 'salad-spring': 'Салат весенний', 'salad-tashkent': 'Салат «Ташкент»', 'sauce-qatiq': 'Соус из катыка', 'tea-black': 'Чёрный чай',
};
const THEMES: [string, string][] = [['ember', 'Угли (тёмный, огонь)'], ['saffron', 'Шафран'], ['pom', 'Гранат'], ['gold', 'Золото (выпечка)'], ['cream', 'Светлый (тесто)'], ['copper', 'Медь (супы)'], ['herb', 'Зелень (свежее, светлый)'], ['sand', 'Песок (светлый)'], ['teal', 'Бирюза (напитки)'], ['rose', 'Роза (десерты)']];
const ALL_STATUS: [string, string][] = [...STATUS, ['cancelled', 'Отменён']];
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
const lines = <T,>(arr: T[], fn: (x: T) => string) => (arr || []).map(fn).join('\n');
function parseLines(txt: string, keys: string[]) {
  return txt
    .split('\n')
    .map((l) => l.split('|').map((x) => x.trim()))
    .filter((a) => a[0])
    .map((a) => {
      const o: any = {};
      keys.forEach((k, i) => (o[k] = ['p', 'fee', 'min'].includes(k) ? +String(a[i] || '').replace(/\D/g, '') || 0 : a[i] || ''));
      if ('uz' in o && !o.uz) delete o.uz;
      return o;
    });
}

async function api(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: body instanceof FormData ? undefined : { 'content-type': 'application/json' }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error('Сессия истекла, войдите снова');
  if (!r.ok) throw new Error(j.error || 'Ошибка сервера');
  return j;
}

export default function AdminApp({ initialMenu, initialSettings, integ }: { initialMenu: Menu; initialSettings: Settings; integ: { telegram: boolean; telegramWebhook: boolean; payme: boolean; click: boolean; site: string } }) {
  const { toast } = useSite();
  const router = useRouter();
  const [tab, setTab] = useState<'orders' | 'menu' | 'cats' | 'combos' | 'settings' | 'int'>('orders');
  const [menu, setMenu] = useState<Menu>(() => clone(initialMenu));
  const [settings, setSettings] = useState<Settings>(() => clone(initialSettings));
  const [dirty, setDirty] = useState({ menu: false, settings: false });
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [ordersErr, setOrdersErr] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);

  // poll orders
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const list: AdminOrder[] = await api('/api/admin/orders', 'GET');
        if (seen.current) {
          const fresh = list.filter((o) => !seen.current!.has(o.id));
          if (fresh.length) {
            toast(`Новый заказ № ${fresh[0].no}`);
            beep();
          }
        }
        seen.current = new Set(list.map((o) => o.id));
        setOrders(list);
        setOrdersErr(null);
      } catch (e: any) {
        setOrdersErr(e.message);
      }
      t = setTimeout(load, 10000);
    };
    load();
    return () => clearTimeout(t);
  }, [toast]);

  // warn before leaving with unsaved edits
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (dirty.menu || dirty.settings) e.preventDefault();
    };
    addEventListener('beforeunload', f);
    return () => removeEventListener('beforeunload', f);
  }, [dirty]);

  const editMenu = useCallback((fn: (m: Menu) => void) => {
    setMenu((m) => {
      const n = clone(m);
      fn(n);
      return n;
    });
    setDirty((d) => ({ ...d, menu: true }));
  }, []);
  const editSettings = useCallback((fn: (s: Settings) => void) => {
    setSettings((s) => {
      const n = clone(s);
      fn(n);
      return n;
    });
    setDirty((d) => ({ ...d, settings: true }));
  }, []);

  const save = async (kind: 'menu' | 'settings') => {
    try {
      await api(`/api/admin/${kind}`, 'PUT', kind === 'menu' ? menu : settings);
      setDirty((d) => ({ ...d, [kind]: false }));
      toast('Сохранено. Гости уже видят изменения');
      router.refresh();
    } catch (e: any) {
      toast('Не сохранилось: ' + e.message);
    }
  };
  const revert = (kind: 'menu' | 'settings') => {
    if (kind === 'menu') setMenu(clone(initialMenu));
    else setSettings(clone(initialSettings));
    setDirty((d) => ({ ...d, [kind]: false }));
  };

  const newCount = orders?.filter((o) => o.status === 'new').length || 0;
  const tabs: [typeof tab, string][] = [
    ['orders', 'Заказы' + (newCount ? ` (${newCount})` : '')],
    ['menu', 'Блюда'],
    ['cats', 'Категории'],
    ['combos', 'Сеты и промокоды'],
    ['settings', 'Настройки'],
    ['int', 'Интеграции'],
  ];

  return (
    <div className="g">
      <div className="in adm">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="kicker">Управление</div>
          <button
            className="link"
            onClick={async () => {
              await fetch('/api/admin/logout', { method: 'POST' });
              router.refresh();
            }}
          >
            Выйти
          </button>
        </div>
        <h1 style={{ fontSize: 'clamp(48px,7vw,96px)', marginTop: 10 }}>{settings.name}</h1>
        <div className="adm-tabs" role="tablist">
          {tabs.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'orders' && <OrdersTab orders={orders} err={ordersErr} onStatus={async (id, status) => {
          setOrders((os) => os && os.map((o) => (o.id === id ? { ...o, status: status as any } : o)));
          try { await api(`/api/admin/orders/${id}`, 'PATCH', { status }); toast('Статус обновлён'); } catch (e: any) { toast(e.message); }
        }} />}
        {tab === 'menu' && <MenuTab menu={menu} edit={editMenu} toast={toast} />}
        {tab === 'cats' && <CatsTab menu={menu} edit={editMenu} />}
        {tab === 'combos' && <CombosTab menu={menu} edit={editMenu} s={settings} editS={editSettings} />}
        {tab === 'settings' && <SettingsTab s={settings} edit={editSettings} toast={toast} menuCats={menu.cats} />}
        {tab === 'int' && <IntTab integ={integ} toast={toast} />}

        {(tab === 'menu' || tab === 'cats' || tab === 'settings') && (
          <SaveBar dirty={tab === 'settings' ? dirty.settings : dirty.menu} onSave={() => save(tab === 'settings' ? 'settings' : 'menu')} onRevert={() => revert(tab === 'settings' ? 'settings' : 'menu')} />
        )}
        {tab === 'combos' && (
          <SaveBar
            dirty={dirty.menu || dirty.settings}
            onSave={async () => {
              if (dirty.menu) await save('menu');
              if (dirty.settings) await save('settings');
            }}
            onRevert={() => (revert('menu'), revert('settings'))}
          />
        )}
      </div>
    </div>
  );
}

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  } catch {}
}

function SaveBar({ dirty, onSave, onRevert }: { dirty: boolean; onSave: () => Promise<void> | void; onRevert: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="adm-bar">
      <span className={dirty ? '' : 'muted'}>{dirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены'}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        {dirty && (
          <button className="btn ghost sm" onClick={onRevert}>
            Отменить
          </button>
        )}
        <button
          className="btn sm"
          disabled={!dirty || busy}
          onClick={async () => {
            setBusy(true);
            await onSave();
            setBusy(false);
          }}
        >
          {busy ? 'Сохраняем…' : 'Сохранить и опубликовать'}
        </button>
      </div>
    </div>
  );
}

function OrdersTab({ orders, err, onStatus }: { orders: AdminOrder[] | null; err: string | null; onStatus: (id: string, s: string) => void }) {
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  if (!orders) return <div className="card">{err || 'Загружаем заказы…'}</div>;
  const list = filter === 'active' ? orders.filter((o) => !['done', 'cancelled'].includes(o.status)) : orders;
  const today = orders.filter((o) => new Date(o.createdAt).toDateString() === new Date().toDateString() && o.status !== 'cancelled');
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <div className="segm" style={{ maxWidth: 360, flex: 1 }}>
          <button className={filter === 'active' ? 'on' : ''} onClick={() => setFilter('active')}>
            В работе
          </button>
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
            Все
          </button>
        </div>
        <span className="cap num">
          Сегодня: {today.length} заказов · {fmt(today.reduce((s, o) => s + o.total, 0))} сум
        </span>
      </div>
      {err && <div className="alert err" style={{ marginBottom: 10 }}>{err}</div>}
      {!list.length ? (
        <div className="card">
          <h3 style={{ fontSize: 28, marginBottom: 8 }}>{filter === 'active' ? 'Активных заказов нет' : 'Заказов пока нет'}</h3>
          <p className="muted" style={{ margin: 0 }}>
            Новые заказы появятся здесь автоматически, список обновляется каждые 10 секунд.
          </p>
        </div>
      ) : (
        <div className="olist">
          {list.map((o) => (
            <div className="card ord" key={o.id}>
              <div>
                <h4>
                  № {o.no} · {o.type === 'delivery' ? 'Доставка' : 'Самовывоз'} · <span className="num">{fmt(o.total)} сум</span>{' '}
                  {o.status === 'new' && <span className="pill new">новый</span>}
                </h4>
                <div className="cap">
                  {new Date(o.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {o.name} ·{' '}
                  <a href={`tel:${o.phone}`} className="num">{prettyPhone(o.phone)}</a>
                  {o.address ? ` · ${o.zone}, ${o.address}` : ''}
                  {o.when !== 'asap' ? ` · ко времени ${o.when}` : ''} · {o.pay === 'card' ? 'карта' : 'наличные'}
                </div>
              </div>
              <div>
                <select value={o.status} onChange={(e) => onStatus(o.id, e.target.value)} aria-label={`Статус заказа ${o.no}`}>
                  {ALL_STATUS.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="items">
                {o.items.map((i) => `${i.name}${i.mods ? ` (${i.mods})` : ''} × ${i.qty}`).join(', ')}
                {o.note && (
                  <>
                    <br />
                    <span style={{ color: 'var(--cream)' }}>Комментарий: {o.note}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function MenuTab({ menu, edit, toast }: { menu: Menu; edit: (fn: (m: Menu) => void) => void; toast: (s: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const groups = [...menu.cats.map((c) => ({ c, ds: menu.dishes.filter((d) => d.cat === c.id) })), { c: { id: '__none', name: 'Без категории', ru: '' }, ds: menu.dishes.filter((d) => !menu.cats.some((c) => c.id === d.cat)) }].filter((g) => g.c.id !== '__none' || g.ds.length);
  return (
    <>
      <div className="dlist">
        {groups.map(({ c, ds }) => (
          <div key={c.id}>
            <div style={{ marginTop: 18, marginBottom: 8 }} className="kicker">
              {c.name} · {ds.length}
            </div>
            {ds.map((d) => (
              <div key={d.id} style={{ marginBottom: 8 }}>
                <div className="drow">
                  <DishArt art={d.art} photo={d.photo} />
                  <div>
                    <b>{d.name}</b> <span className="cap">{d.ru} · {fmt(basePrice(d))} сум</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {d.hidden && <span className="pill">скрыто</span>}
                      {basePrice(d) <= 0 && <span className="pill new">нет цены</span>}
                      {!d.available && <span className="pill new">нет в наличии</span>}
                      {d.featured && <span className="pill warn">на главной</span>}
                      <span className={`pill ${d.photo ? 'ok' : ''}`}>{d.photo ? 'фото' : 'иллюстрация'}</span>
                    </div>
                  </div>
                  <button className="btn ghost sm" aria-expanded={open === d.id} onClick={() => setOpen(open === d.id ? null : d.id)}>
                    {open === d.id ? 'Свернуть' : 'Изменить'}
                  </button>
                </div>
                {open === d.id && <DishEditor d={d} menu={menu} edit={edit} toast={toast} onDeleted={() => setOpen(null)} />}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <button
          className="btn ghost"
          onClick={() => {
            const id = 'd' + Date.now().toString(36);
            edit((m) => m.dishes.push(D({ id, cat: m.cats[0]?.id || '', name: 'Новое блюдо', available: false })));
            setOpen(id);
          }}
        >
          Добавить блюдо
        </button>
      </div>
    </>
  );
}

function DishEditor({ d, menu, edit, toast, onDeleted }: { d: Dish; menu: Menu; edit: (fn: (m: Menu) => void) => void; toast: (s: string) => void; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const up = (fn: (x: Dish) => void) => edit((m) => fn(m.dishes.find((x) => x.id === d.id)!));
  const field = (k: keyof Dish, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="fld">
      <label>{label}</label>
      <input value={String(d[k] ?? '')} onChange={(e) => up((x) => ((x as any)[k] = k === 'price' ? +e.target.value.replace(/\D/g, '') || 0 : e.target.value))} {...extra} />
    </div>
  );
  return (
    <div className="ed">
      {field('name', 'Название (узб.)')}
      {field('ru', 'Название (рус.)')}
      <div className="fld">
        <label>Категория</label>
        <select value={d.cat} onChange={(e) => up((x) => (x.cat = e.target.value))}>
          {menu.cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="fld">
        <label>Иллюстрация, если нет фото</label>
        <select value={d.art} onChange={(e) => up((x) => (x.art = e.target.value))}>
          {Object.entries(ART_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="fld full">
        <label>Описание (рус.)</label>
        <textarea value={d.desc} onChange={(e) => up((x) => (x.desc = e.target.value))} />
      </div>
      <div className="fld full">
        <label>Описание (узб.) — для гостей на узбекском</label>
        <textarea value={d.descUz || ''} onChange={(e) => up((x) => (x.descUz = e.target.value))} />
      </div>
      {field('price', 'Цена без вариантов, сум', { inputMode: 'numeric' })}
      {field('weight', 'Вес / объём')}
      <div className="fld full">
        <label>Варианты порции: название | вес | цена | название по-узбекски (по строке)</label>
        <textarea rows={3} defaultValue={lines(d.sizes, (s) => `${s.label} | ${s.w || ''} | ${s.p}${s.uz ? ' | ' + s.uz : ''}`)} onChange={(e) => up((x) => (x.sizes = parseLines(e.target.value, ['label', 'w', 'p', 'uz'])))} />
      </div>
      <div className="fld full">
        <label>Добавки: название | цена | название по-узбекски (по строке)</label>
        <textarea rows={3} defaultValue={lines(d.extras, (s) => `${s.label} | ${s.p}${s.uz ? ' | ' + s.uz : ''}`)} onChange={(e) => up((x) => (x.extras = parseLines(e.target.value, ['label', 'p', 'uz'])))} />
      </div>
      <div className="fld">
        <label>Состав через запятую</label>
        <input defaultValue={d.ingr.join(', ')} onChange={(e) => up((x) => (x.ingr = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)))} />
      </div>
      <div className="fld">
        <label>Состав по-узбекски</label>
        <input defaultValue={(d.ingrUz || []).join(', ')} onChange={(e) => up((x) => (x.ingrUz = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)))} />
      </div>
      <div className="fld">
        <label>Аллергены через запятую</label>
        <input defaultValue={d.allergens.join(', ')} onChange={(e) => up((x) => (x.allergens = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)))} />
      </div>
      <div className="fld full">
        <span className="lbl">Метки</span>
        <div className="tgl">
          {Object.entries(TAGS).map(([k, l]) => (
            <button key={k} type="button" className={`chk ${d.tags.includes(k) ? 'on' : ''}`} onClick={() => up((x) => (x.tags = x.tags.includes(k) ? x.tags.filter((t) => t !== k) : [...x.tags, k]))}>
              {l.ru}
              {l.badge ? ' (значок)' : ''}
            </button>
          ))}
          <button type="button" className={`chk ${d.hidden ? 'on' : ''}`} onClick={() => up((x) => (x.hidden = !x.hidden))}>
            Скрыто с сайта
          </button>
          <button type="button" className={`chk ${d.skewer ? 'on' : ''}`} onClick={() => up((x) => (x.skewer = !x.skewer))}>
            Цена за шампур
          </button>
          <button type="button" className={`chk ${d.available ? 'on' : ''}`} onClick={() => up((x) => (x.available = !x.available))}>
            В наличии
          </button>
          <button type="button" className={`chk ${d.featured ? 'on' : ''}`} onClick={() => up((x) => (x.featured = !x.featured))}>
            На главной
          </button>
        </div>
      </div>
      <div className="fld full">
        <span className="lbl">«Bugun nima yeymiz?» — в каких подборках показывать</span>
        <div className="tgl">
          {MOODS.map((m) => {
            const on = (d.moods || []).includes(m.id);
            return (
              <button key={m.id} type="button" className={`chk ${on ? 'on' : ''}`} onClick={() => up((x) => (x.moods = on ? (x.moods || []).filter((y) => y !== m.id) : [...(x.moods || []), m.id]))}>
                {m.ru}
              </button>
            );
          })}
        </div>
      </div>
      <div className="fld full">
        <span className="lbl">Фото блюда</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
            {uploading ? 'Загружаем…' : d.photo ? 'Заменить фото' : 'Загрузить фото'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              hidden
              disabled={uploading}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setUploading(true);
                try {
                  const fd = new FormData();
                  fd.append('file', f);
                  const r = await api('/api/admin/upload', 'POST', fd);
                  up((x) => (x.photo = r.id));
                  toast('Фото загружено. Сохраните меню');
                } catch (err: any) {
                  toast(err.message);
                } finally {
                  setUploading(false);
                  e.target.value = '';
                }
              }}
            />
          </label>
          {d.photo ? (
            <button type="button" className="link" onClick={() => up((x) => (x.photo = ''))}>
              Убрать фото
            </button>
          ) : (
            <span className="cap">Лучше всего: съёмка сверху, тёмный фон, тёплый свет, от 1600 px</span>
          )}
        </div>
      </div>
      <div className="full" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        {confirm ? (
          <span>
            Удалить «{d.name}»?{' '}
            <button
              type="button"
              className="link"
              onClick={() => {
                edit((m) => (m.dishes = m.dishes.filter((x) => x.id !== d.id)));
                onDeleted();
              }}
            >
              Да, удалить
            </button>{' '}
            ·{' '}
            <button type="button" className="link" onClick={() => setConfirm(false)}>
              Отмена
            </button>
          </span>
        ) : (
          <button type="button" className="link" style={{ color: 'var(--err)' }} onClick={() => setConfirm(true)}>
            Удалить блюдо
          </button>
        )}
      </div>
    </div>
  );
}

function CombosTab({ menu, edit, s, editS }: { menu: Menu; edit: (fn: (m: Menu) => void) => void; s: Settings; editS: (fn: (s: Settings) => void) => void }) {
  const combos = menu.combos ?? [];
  const dishName = (id: string) => menu.dishes.find((d) => d.id === id)?.name ?? `нет блюда ${id}`;
  return (
    <div className="agrid">
      <div className="card" style={{ gridColumn: '1/-1' }}>
        <h3 style={{ fontSize: 28, marginBottom: 6 }}>Популярные сочетания</h3>
        <p className="muted" style={{ marginTop: 0 }}>Цена сета на сайте — всегда сумма текущих цен блюд. Если блюда нет в наличии, сет скрывается.</p>
        <div className="dlist">
          {combos.map((c, i) => (
            <div key={c.id} className="ed" style={{ borderColor: 'var(--line-2)' }}>
              <div className="fld">
                <label>Название (узб.)</label>
                <input value={c.name} onChange={(e) => edit((m) => (m.combos![i].name = e.target.value))} />
              </div>
              <div className="fld">
                <label>Название (рус.)</label>
                <input value={c.ru} onChange={(e) => edit((m) => (m.combos![i].ru = e.target.value))} />
              </div>
              <div className="fld">
                <label>Описание (узб.)</label>
                <input value={c.descUz || ''} onChange={(e) => edit((m) => (m.combos![i].descUz = e.target.value))} />
              </div>
              <div className="fld">
                <label>Описание (рус.)</label>
                <input value={c.desc || ''} onChange={(e) => edit((m) => (m.combos![i].desc = e.target.value))} />
              </div>
              <div className="fld full">
                <label>Состав сета</label>
                {c.items.map((it, j) => (
                  <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <select value={it.id} onChange={(e) => edit((m) => (m.combos![i].items[j] = { id: e.target.value, si: 0, qty: it.qty }))} style={{ flex: '1 1 200px' }}>
                      {menu.dishes.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} · {d.ru}
                        </option>
                      ))}
                    </select>
                    {(menu.dishes.find((d) => d.id === it.id)?.sizes.length ?? 0) > 1 && (
                      <select value={it.si} onChange={(e) => edit((m) => (m.combos![i].items[j].si = +e.target.value))}>
                        {menu.dishes.find((d) => d.id === it.id)!.sizes.map((sz, k) => (
                          <option key={k} value={k}>
                            {sz.label}
                          </option>
                        ))}
                      </select>
                    )}
                    <input inputMode="numeric" value={String(it.qty)} style={{ width: 60 }} onChange={(e) => edit((m) => (m.combos![i].items[j].qty = Math.max(1, Math.min(50, +e.target.value.replace(/\D/g, '') || 1))))} aria-label="Количество" />
                    <button type="button" className="link" onClick={() => edit((m) => m.combos![i].items.splice(j, 1))} disabled={c.items.length < 2}>
                      убрать
                    </button>
                  </div>
                ))}
                <span className="cap">{c.items.map((it) => `${dishName(it.id)} ×${it.qty}`).join(', ')}</span>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn ghost sm" onClick={() => edit((m) => m.combos![i].items.push({ id: menu.dishes[0]?.id || '', si: 0, qty: 1 }))}>
                    Добавить блюдо
                  </button>
                  <button type="button" className={`chk ${c.active !== false ? 'on' : ''}`} onClick={() => edit((m) => (m.combos![i].active = !(c.active !== false)))}>
                    {c.active !== false ? 'Показывается' : 'Скрыт'}
                  </button>
                  <button type="button" className="link" style={{ color: 'var(--err)' }} onClick={() => edit((m) => m.combos!.splice(i, 1))}>
                    Удалить сет
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          className="btn ghost"
          style={{ marginTop: 12 }}
          onClick={() => edit((m) => (m.combos = [...(m.combos ?? []), { id: 'c' + Date.now().toString(36), name: 'Yangi toʻplam', ru: 'Новый сет', items: [{ id: menu.dishes[0]?.id || '', si: 0, qty: 1 }], active: false }]))}
        >
          Добавить сет
        </button>
      </div>

      <div className="card" style={{ gridColumn: '1/-1' }}>
        <h3 style={{ fontSize: 28, marginBottom: 6 }}>Промокоды</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Скидка на блюда (без доставки). Проверяется на сервере; список кодов гостям не виден. За столом промокоды не применяются.
        </p>
        <div className="dlist">
          {(s.promos ?? []).map((p, i) => (
            <div key={i} className="drow" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))' }}>
              <div className="fld">
                <label>Код</label>
                <input value={p.code} onChange={(e) => editS((x) => (x.promos![i].code = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '')))} />
              </div>
              <div className="fld">
                <label>Скидка, %</label>
                <input inputMode="numeric" value={String(p.pct || '')} onChange={(e) => editS((x) => ((x.promos![i].pct = Math.min(90, +e.target.value.replace(/\D/g, '') || 0)), x.promos![i].pct && (x.promos![i].fixed = 0)))} />
              </div>
              <div className="fld">
                <label>или сумма, сум</label>
                <input inputMode="numeric" value={String(p.fixed || '')} onChange={(e) => editS((x) => ((x.promos![i].fixed = +e.target.value.replace(/\D/g, '') || 0), x.promos![i].fixed && (x.promos![i].pct = 0)))} />
              </div>
              <div className="fld">
                <label>От суммы, сум</label>
                <input inputMode="numeric" value={String(p.min || '')} onChange={(e) => editS((x) => (x.promos![i].min = +e.target.value.replace(/\D/g, '') || 0))} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
                <button type="button" className={`chk ${p.active ? 'on' : ''}`} onClick={() => editS((x) => (x.promos![i].active = !p.active))}>
                  {p.active ? 'Действует' : 'Выключен'}
                </button>
                <button type="button" className="link" style={{ color: 'var(--err)' }} onClick={() => editS((x) => x.promos!.splice(i, 1))}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
        <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => editS((x) => (x.promos = [...(x.promos ?? []), { code: 'MANGO10', pct: 10, fixed: 0, min: 0, active: false }]))}>
          Добавить промокод
        </button>
      </div>
    </div>
  );
}

function CatsTab({ menu, edit }: { menu: Menu; edit: (fn: (m: Menu) => void) => void }) {
  return (
    <>
      <div className="dlist">
        {menu.cats.map((c, i) => {
          const used = menu.dishes.some((d) => d.cat === c.id);
          return (
            <div className="drow" key={c.id} style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) auto' }}>
              <div className="fld">
                <label>Название (узб.)</label>
                <input value={c.name} onChange={(e) => edit((m) => (m.cats[i].name = e.target.value))} />
              </div>
              <div className="fld">
                <label>Название по-русски</label>
                <input value={c.ru} onChange={(e) => edit((m) => (m.cats[i].ru = e.target.value))} />
                <select value={c.theme || 'pom'} onChange={(e) => edit((m) => (m.cats[i].theme = e.target.value))} style={{ marginTop: 6 }}>
                  {THEMES.map(([k, l]) => (
                    <option key={k} value={k}>
                      Оформление: {l}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn ghost sm" disabled={!i} aria-label="Выше" onClick={() => edit((m) => ([m.cats[i - 1], m.cats[i]] = [m.cats[i], m.cats[i - 1]]))}>
                  ↑
                </button>
                <button className="btn ghost sm" disabled={i === menu.cats.length - 1} aria-label="Ниже" onClick={() => edit((m) => ([m.cats[i + 1], m.cats[i]] = [m.cats[i], m.cats[i + 1]]))}>
                  ↓
                </button>
                <button className="btn ghost sm" disabled={used} title={used ? 'Сначала перенесите блюда' : ''} onClick={() => edit((m) => m.cats.splice(i, 1))}>
                  Удалить
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16 }}>
        <button className="btn ghost" onClick={() => edit((m) => m.cats.push({ id: 'c' + Date.now().toString(36), name: 'Новая категория', ru: '' }))}>
          Добавить категорию
        </button>
      </div>
      <p className="cap">Категорию с блюдами удалить нельзя: сначала перенесите блюда.</p>
    </>
  );
}

function SettingsTab({ s, edit, toast, menuCats }: { s: Settings; edit: (fn: (s: Settings) => void) => void; toast: (m: string) => void; menuCats: Menu['cats'] }) {
  const f = (k: keyof Settings, l: string, ph = '') => (
    <div className="fld">
      <label>{l}</label>
      <input value={String(s[k] ?? '')} placeholder={ph} onChange={(e) => edit((x) => ((x as any)[k] = e.target.value))} />
    </div>
  );
  const upload = async (i: number, file?: File) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api('/api/admin/upload', 'POST', fd);
      edit((x) => (x.storyPhotos[i] = r.id));
      toast('Фото загружено. Сохраните настройки');
    } catch (e: any) {
      toast(e.message);
    }
  };
  return (
    <div className="agrid">
      <div className="card form" style={{ gridTemplateColumns: '1fr' }}>
        {f('name', 'Название бренда')}
        {f('tagline', 'Слоган')}
        {f('taglineUz', 'Слоган по-узбекски')}
        {f('phone', 'Телефон для заказов', '+998 ...')}
        {f('phone2', 'Второй телефон', '+998 ...')}
        {f('city', 'Город')}
        {f('cityUz', 'Город по-узбекски', 'Yangiyoʻl, Toshkent viloyati')}
        {f('address', 'Адрес', 'Улица, дом, ориентир')}
        {f('addressUz', 'Адрес по-узбекски')}
        {f('hours', 'Часы работы', 'Например: ежедневно 10:00–23:00')}
        {f('hoursUz', 'Часы работы по-узбекски', '9:00–23:00, juma — dam olish kuni')}
        {f('mapUrl', 'Ссылка на карту', 'https://maps.google.com/... или yandex')}
        {f('instagram', 'Instagram', '@account')}
        {f('telegram', 'Telegram', '@account')}
      </div>
      <div className="card form" style={{ gridTemplateColumns: '1fr' }}>
        <div className="fld">
          <span className="lbl">Заказы</span>
          <div className="tgl">
            <button type="button" className={`chk ${s.pickup ? 'on' : ''}`} onClick={() => edit((x) => (x.pickup = !x.pickup))}>
              Самовывоз
            </button>
            <button type="button" className={`chk ${s.delivery ? 'on' : ''}`} onClick={() => edit((x) => (x.delivery = !x.delivery))}>
              Доставка
            </button>
            <button type="button" className={`chk ${s.pay.cash ? 'on' : ''}`} onClick={() => edit((x) => (x.pay.cash = !x.pay.cash))}>
              Наличные
            </button>
            <button type="button" className={`chk ${s.pay.card ? 'on' : ''}`} onClick={() => edit((x) => (x.pay.card = !x.pay.card))}>
              Карта при получении
            </button>
          </div>
        </div>
        <div className="fld">
          <span className="lbl">Приём онлайн-заказов (время Ташкента)</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="time" value={s.openFrom || ''} onChange={(e) => edit((x) => (x.openFrom = e.target.value))} style={{ width: 120 }} aria-label="С" />
            —
            <input type="time" value={s.openTo || ''} onChange={(e) => edit((x) => (x.openTo = e.target.value))} style={{ width: 120 }} aria-label="До" />
          </div>
          <div className="tgl" style={{ marginTop: 8 }}>
            {['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map((d, i) => {
              const off = (s.closedDays || []).includes(i);
              return (
                <button key={i} type="button" className={`chk ${off ? '' : 'on'}`} title={off ? 'Выходной' : 'Рабочий день'} onClick={() => edit((x) => (x.closedDays = off ? (x.closedDays || []).filter((y) => y !== i) : [...(x.closedDays || []), i]))}>
                  {d}
                </button>
              );
            })}
          </div>
          <span className="cap">Подсвеченные — рабочие дни. Вне этого времени сайт покажет «Сейчас закрыты» и не примет заказ.</span>
          <div className="tgl" style={{ marginTop: 8 }}>
            <button type="button" className={`chk ${s.ordersPaused ? 'on' : ''}`} onClick={() => edit((x) => (x.ordersPaused = !x.ordersPaused))}>
              {s.ordersPaused ? 'Онлайн-заказы на паузе' : 'Поставить онлайн-заказы на паузу'}
            </button>
          </div>
        </div>
        <div className="fld">
          <label>Готовим, мин (для времени ожидания гостю)</label>
          <input inputMode="numeric" value={String(s.prepMinutes ?? 25)} onChange={(e) => edit((x) => (x.prepMinutes = Math.max(1, Math.min(240, +e.target.value.replace(/\D/g, '') || 0))))} />
        </div>
        <div className="fld">
          <label>Доставка в пути, мин</label>
          <input inputMode="numeric" value={String(s.deliveryMinutes ?? 20)} onChange={(e) => edit((x) => (x.deliveryMinutes = Math.min(240, +e.target.value.replace(/\D/g, '') || 0)))} />
        </div>
        <div className="fld">
          <label>Зоны доставки: название | цена доставки | минимальный заказ | название по-узбекски</label>
          <textarea rows={4} defaultValue={lines(s.zones, (z) => `${z.name} | ${z.fee} | ${z.min}${z.uz ? ' | ' + z.uz : ''}`)} onChange={(e) => edit((x) => (x.zones = parseLines(e.target.value, ['name', 'fee', 'min', 'uz'])))} />
        </div>
        <div className="alert" style={{ fontSize: 13 }}>
          Зоны и суммы стоят примерные. Замените их на свои перед запуском.
        </div>
      </div>
      <div className="card form" style={{ gridColumn: '1/-1', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
        <h3 style={{ fontSize: 28, gridColumn: '1/-1' }}>Зал, кухня и печать</h3>
        <div className="fld">
          <label>Столов в зале</label>
          <input inputMode="numeric" value={String(s.tables ?? 0)} onChange={(e) => edit((x) => (x.tables = Math.min(200, +e.target.value.replace(/\D/g, '') || 0)))} />
        </div>
        <div className="fld">
          <label>Обслуживание в зале, %</label>
          <input inputMode="decimal" value={String(s.servicePct ?? 0)} onChange={(e) => edit((x) => (x.servicePct = Math.min(30, +e.target.value.replace(/[^\d.]/g, '') || 0)))} />
        </div>
        <div className="fld">
          <label>Ширина чековой ленты</label>
          <select value={s.paper || '80'} onChange={(e) => edit((x) => (x.paper = e.target.value as '80' | '58'))}>
            <option value="80">80 мм</option>
            <option value="58">58 мм</option>
          </select>
        </div>
        <div className="fld">
          <span className="lbl">Заказы с сайта</span>
          <div className="tgl">
            <button type="button" className={`chk ${s.autoAcceptOnline ? 'on' : ''}`} onClick={() => edit((x) => (x.autoAcceptOnline = !x.autoAcceptOnline))}>
              {s.autoAcceptOnline ? 'Сразу на кухню и в печать' : 'Сначала принимает кассир'}
            </button>
            <button type="button" className={`chk ${s.printGuestChecks ? 'on' : ''}`} onClick={() => edit((x) => (x.printGuestChecks = !x.printGuestChecks))}>
              {s.printGuestChecks ? 'Печатать пречек и чек гостю' : 'Только бегунки на кухню'}
            </button>
          </div>
        </div>
        <div className="fld" style={{ gridColumn: '1/-1' }}>
          <span className="lbl">Какой цех готовит раздел меню (туда печатается бегунок)</span>
          <div className="agrid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 8 }}>
            {menuCats.map((c) => (
              <label key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', fontSize: 14 }}>
                <span>{c.name}</span>
                <select
                  value={s.catStations?.[c.id] || 'kitchen'}
                  onChange={(e) => edit((x) => (x.catStations = { ...(x.catStations || {}), [c.id]: e.target.value }))}
                  style={{ background: 'var(--char)', border: '1px solid var(--line-2)', borderRadius: 8, padding: '6px 8px', color: 'var(--cream)' }}
                >
                  <option value="kitchen">Кухня</option>
                  <option value="mangal">Мангал</option>
                  <option value="bar">Бар</option>
                </select>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="card" style={{ gridColumn: '1/-1' }}>
        <h3 style={{ fontSize: 28, marginBottom: 12 }}>«Больше, чем еда»: ваша история</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Короткий текст и фото к каждой сцене. Пустое поле на сайте не показывается.
        </p>
        <div className="agrid">
          {STORY.map((st, i) => (
            <div className="fld" key={i}>
              <label>
                {String(i + 1).padStart(2, '0')} · {st.t}
              </label>
              <textarea rows={3} value={s.story[i] || ''} placeholder="Например, как это происходит у вас" onChange={(e) => edit((x) => (x.story[i] = e.target.value))} />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
                  {s.storyPhotos[i] ? 'Заменить фото' : 'Фото сцены'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => upload(i, e.target.files?.[0])} />
                </label>
                {s.storyPhotos[i] && (
                  <button type="button" className="link" onClick={() => edit((x) => (x.storyPhotos[i] = ''))}>
                    Убрать
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IntTab({ integ, toast }: { integ: { telegram: boolean; telegramWebhook: boolean; payme: boolean; click: boolean; site: string }; toast: (s: string) => void }) {
  const call = async (action: string) => {
    try {
      const r = await api('/api/admin/telegram', 'POST', { action });
      toast(r.ok ? (action === 'webhook' ? 'Кнопки в Telegram подключены' : 'Тестовое сообщение отправлено') : 'Telegram ответил: ' + (r.description || 'ошибка'));
    } catch (e: any) {
      toast(e.message);
    }
  };
  const Row = ({ st, cls, t, children }: { st: string; cls: string; t: string; children: React.ReactNode }) => (
    <div className="card int">
      <span className={`pill ${cls}`}>{st}</span>
      <h4 style={{ fontFamily: 'var(--ui)', fontSize: 16, fontWeight: 700 }}>{t}</h4>
      <div className="muted" style={{ margin: 0, fontSize: 14 }}>
        {children}
      </div>
    </div>
  );
  return (
    <div className="olist">
      <Row st="работает" cls="ok" t="Заказы с сайта">
        Заказы сохраняются в базе PostgreSQL, цены пересчитываются на сервере. Гость видит статус на странице заказа.
      </Row>
      <Row st={integ.telegram ? 'подключено' : 'не подключено'} cls={integ.telegram ? 'ok' : ''} t="Уведомления в Telegram">
        {integ.telegram ? (
          <>
            Новые заказы приходят в чат с кнопками статуса, а гости получают от бота «принят → готовится → готово».{' '}
            {!integ.telegramWebhook && 'Чтобы кнопки работали, задайте PUBLIC_URL и TELEGRAM_WEBHOOK_SECRET.'}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="btn ghost sm" onClick={() => call('test')}>
                Отправить тест
              </button>
              {integ.telegramWebhook && (
                <button className="btn ghost sm" onClick={() => call('webhook')}>
                  Подключить кнопки
                </button>
              )}
            </div>
          </>
        ) : (
          'Создайте бота через @BotFather и задайте в Railway переменные TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID.'
        )}
      </Row>
      <Row st={integ.payme ? 'подключено' : 'не подключено'} cls={integ.payme ? 'ok' : ''} t="Онлайн-оплата Payme">
        {integ.payme ? 'Гости видят «Онлайн через Payme» в корзине.' : 'Задайте PAYME_MERCHANT_ID и PAYME_KEY в Railway.'} В кабинете Payme Business укажите адрес:{' '}
        <code>{integ.site || 'https://ваш-сайт'}/api/pay/payme</code>, поле счёта <code>order_id</code>.
      </Row>
      <Row st={integ.click ? 'подключено' : 'не подключено'} cls={integ.click ? 'ok' : ''} t="Онлайн-оплата Click">
        {integ.click ? 'Гости видят «Онлайн через Click» в корзине.' : 'Задайте CLICK_SERVICE_ID, CLICK_MERCHANT_ID и CLICK_SECRET_KEY в Railway.'} В кабинете Click укажите Prepare и Complete URL:{' '}
        <code>{integ.site || 'https://ваш-сайт'}/api/pay/click</code>.
      </Row>
      <Row st="работает" cls="ok" t="Касса, кухня и печать чеков">
        Экраны персонала: <a href="/staff" style={{ color: 'var(--saffron)' }}>/staff</a>. Вход по PIN из переменной STAFF_PIN (или паролем администратора). Бегунки печатаются по цехам, пречек и чек — на кассе.
      </Row>
    </div>
  );
}
