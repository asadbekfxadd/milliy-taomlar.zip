'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Dish, Menu, Settings } from '@/lib/types';
import { D, MOODS, TAGS } from '@/lib/defaults';
import { basePrice } from '@/lib/pricing';
import DishArt from '../DishArt';
import { api, money, PageHead, usePanel } from './kit';

/* Menu editing: changes are kept on the page until "Сохранить" — then the site and the cash desk see them at once. */

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
type Ctx = { menu: Menu; edit: (fn: (m: Menu) => void) => void };
const C = createContext<Ctx | null>(null);
const useMenu = () => useContext(C)!;

function MenuDoc({ initial, children }: { initial: Menu; children: React.ReactNode }) {
  const [menu, setMenu] = useState(() => clone(initial));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = usePanel();
  const router = useRouter();
  const edit = useCallback((fn: (m: Menu) => void) => {
    setMenu((m) => {
      const n = clone(m);
      fn(n);
      return n;
    });
    setDirty(true);
  }, []);
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    addEventListener('beforeunload', f);
    return () => removeEventListener('beforeunload', f);
  }, [dirty]);
  return (
    <C.Provider value={{ menu, edit }}>
      {children}
      {dirty && (
        <div className="savebar">
          <span>Есть несохранённые изменения</span>
          <div className="sx-row">
            <button className="b sm" onClick={() => (setMenu(clone(initial)), setDirty(false))}>
              Отменить
            </button>
            <button
              className="b main"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api('/api/admin/menu', 'PUT', menu);
                  setDirty(false);
                  toast('Сохранено. Сайт и касса уже видят изменения');
                  router.refresh();
                } catch (e: any) {
                  toast('Не сохранилось: ' + e.message);
                }
                setBusy(false);
              }}
            >
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}
    </C.Provider>
  );
}

/* ---------------- dishes ---------------- */

const FILTERS: [string, string, (d: Dish) => boolean][] = [
  ['all', 'Все', () => true],
  ['noprice', 'Без цены', (d) => basePrice(d) <= 0],
  ['stop', 'Стоп-лист', (d) => !d.available],
  ['hidden', 'Скрытые с сайта', (d) => Boolean(d.hidden)],
  ['nophoto', 'Без фото', (d) => !d.photo],
];

export function DishesPage({ initial }: { initial: Menu }) {
  return (
    <MenuDoc initial={initial}>
      <Dishes />
    </MenuDoc>
  );
}

function Dishes() {
  const { menu, edit } = useMenu();
  const sp = useSearchParams();
  const [f, setF] = useState(sp.get('f') || 'all');
  const [qs, setQs] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const fn = FILTERS.find((x) => x[0] === f)?.[2] || (() => true);
  const s = qs.trim().toLowerCase();
  const shown = menu.dishes.filter((d) => fn(d) && (!s || (d.name + ' ' + d.ru).toLowerCase().includes(s)));
  const groups = [...menu.cats.map((c) => ({ id: c.id, name: c.ru || c.name })), { id: '__none', name: 'Без категории' }]
    .map((c) => ({ ...c, ds: shown.filter((d) => (c.id === '__none' ? !menu.cats.some((x) => x.id === d.cat) : d.cat === c.id)) }))
    .filter((g) => g.ds.length);

  return (
    <>
      <PageHead title="Блюда" sub="Цену и наличие можно менять прямо в списке. Остальное — кнопкой «Изменить».">
        <button
          className="b main"
          onClick={() => {
            const id = 'd' + Date.now().toString(36);
            edit((m) => m.dishes.push(D({ id, cat: m.cats[0]?.id || '', name: 'Yangi taom', ru: 'Новое блюдо', available: false })));
            setF('all');
            setQs('');
            setOpen(id);
          }}
        >
          Добавить блюдо
        </button>
      </PageHead>
      <div className="sx-row" style={{ marginBottom: 12 }}>
        <div className="seg">
          {FILTERS.map(([k, l, test]) => (
            <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>
              {l} · {menu.dishes.filter(test).length}
            </button>
          ))}
        </div>
        <input className="ip sm" style={{ flex: '1 1 200px', width: 'auto' }} placeholder="Найти блюдо" value={qs} onChange={(e) => setQs(e.target.value)} />
      </div>
      {groups.length ? (
        groups.map((g) => (
          <div className="box" key={g.id} style={{ padding: 0, overflow: 'hidden' }}>
            <h2 style={{ padding: '14px 14px 6px' }}>
              {g.name} <span className="muted small">· {g.ds.length}</span>
            </h2>
            {g.ds.map((d) => (
              <div key={d.id}>
                <DishRow d={d} open={open === d.id} onToggle={() => setOpen(open === d.id ? null : d.id)} />
                {open === d.id && <DishEditor d={d} onDeleted={() => setOpen(null)} />}
              </div>
            ))}
          </div>
        ))
      ) : (
        <div className="box empty">
          <b>Ничего не нашлось</b>
          Смените фильтр или поиск.
        </div>
      )}
    </>
  );
}

function DishRow({ d, open, onToggle }: { d: Dish; open: boolean; onToggle: () => void }) {
  const { edit } = useMenu();
  const up = (fn: (x: Dish) => void) => edit((m) => fn(m.dishes.find((x) => x.id === d.id)!));
  const p = basePrice(d);
  return (
    <div className="dish-row">
      <DishArt art={d.art} photo={d.photo} sizes="56px" />
      <div style={{ minWidth: 0 }}>
        <b>{d.ru || d.name}</b> <span className="muted small">{d.name}</span>
        <div className="dmeta">
          {p <= 0 && <span className="bd new">нет цены</span>}
          {!d.available && <span className="bd bad">стоп-лист</span>}
          {d.hidden && <span className="bd">скрыто с сайта</span>}
          {d.featured && <span className="bd info">на главной</span>}
          {!d.photo && <span className="bd">рисунок</span>}
        </div>
      </div>
      <div className="sx-row" style={{ justifyContent: 'flex-end' }}>
        {d.sizes.length ? (
          <span className="muted small num">{d.sizes.map((s) => `${s.label} ${money(s.p)}`).join(' · ')}</span>
        ) : (
          <label className="sx-row" style={{ gap: 6 }}>
            <input
              className="ip sm num"
              style={{ width: 110, textAlign: 'right' }}
              inputMode="numeric"
              aria-label={`Цена: ${d.ru || d.name}`}
              value={d.price ? money(d.price) : ''}
              placeholder="цена"
              onChange={(e) => up((x) => (x.price = Number(e.target.value.replace(/\D/g, '')) || 0))}
            />
            <span className="muted small">сум</span>
          </label>
        )}
        <button type="button" className={`tg ${d.available ? 'on' : ''}`} onClick={() => up((x) => (x.available = !x.available))} title="Есть сегодня или стоп-лист">
          {d.available ? 'Есть' : 'Стоп'}
        </button>
        <button className="b sm" aria-expanded={open} onClick={onToggle}>
          {open ? 'Свернуть' : 'Изменить'}
        </button>
      </div>
    </div>
  );
}

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

function DishEditor({ d, onDeleted }: { d: Dish; onDeleted: () => void }) {
  const { menu, edit } = useMenu();
  const { toast } = usePanel();
  const [confirm, setConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const up = (fn: (x: Dish) => void) => edit((m) => fn(m.dishes.find((x) => x.id === d.id)!));
  const arts = useMemo(() => {
    const m = new Map<string, string>();
    menu.dishes.forEach((x) => m.has(x.art) || m.set(x.art, x.ru || x.name));
    return [...m].sort((a, b) => a[1].localeCompare(b[1], 'ru'));
  }, [menu.dishes]);
  const text = (k: 'name' | 'ru' | 'weight', label: string) => (
    <label className="f">
      <span>{label}</span>
      <input className="ip" value={String(d[k] ?? '')} onChange={(e) => up((x) => (x[k] = e.target.value))} />
    </label>
  );
  return (
    <div className="dish-ed">
      <div className="grid-f">
        {text('ru', 'Название по-русски')}
        {text('name', 'Название по-узбекски')}
        <label className="f">
          <span>Категория</span>
          <select className="ip" value={d.cat} onChange={(e) => up((x) => (x.cat = e.target.value))}>
            {menu.cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.ru || c.name}
              </option>
            ))}
          </select>
        </label>
        {text('weight', 'Вес или объём')}
        <label className="f full">
          <span>Описание по-русски</span>
          <textarea className="ip" value={d.desc} onChange={(e) => up((x) => (x.desc = e.target.value))} />
        </label>
        <label className="f full">
          <span>Описание по-узбекски</span>
          <textarea className="ip" value={d.descUz || ''} onChange={(e) => up((x) => (x.descUz = e.target.value))} />
        </label>
        <label className="f full">
          <span>Порции с разной ценой — по строке: название | вес | цена | по-узбекски</span>
          <textarea className="ip" rows={3} placeholder="1 шампур | 100 г | 18000 | 1 six" defaultValue={lines(d.sizes, (s) => `${s.label} | ${s.w || ''} | ${s.p}${s.uz ? ' | ' + s.uz : ''}`)} onChange={(e) => up((x) => (x.sizes = parseLines(e.target.value, ['label', 'w', 'p', 'uz'])))} />
          <small>Если порций нет, оставьте пустым — тогда действует цена в списке.</small>
        </label>
        <label className="f full">
          <span>Добавки — по строке: название | цена | по-узбекски</span>
          <textarea className="ip" rows={2} defaultValue={lines(d.extras, (s) => `${s.label} | ${s.p}${s.uz ? ' | ' + s.uz : ''}`)} onChange={(e) => up((x) => (x.extras = parseLines(e.target.value, ['label', 'p', 'uz'])))} />
        </label>
        <label className="f">
          <span>Состав через запятую</span>
          <input className="ip" defaultValue={d.ingr.join(', ')} onChange={(e) => up((x) => (x.ingr = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)))} />
        </label>
        <label className="f">
          <span>Состав по-узбекски</span>
          <input className="ip" defaultValue={(d.ingrUz || []).join(', ')} onChange={(e) => up((x) => (x.ingrUz = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)))} />
        </label>
        <label className="f">
          <span>Аллергены через запятую</span>
          <input className="ip" defaultValue={d.allergens.join(', ')} onChange={(e) => up((x) => (x.allergens = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)))} />
        </label>
        <label className="f">
          <span>Рисунок, если нет фото</span>
          <select className="ip" value={d.art} onChange={(e) => up((x) => (x.art = e.target.value))}>
            {arts.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <div className="f full">
          <span>Где показывать</span>
          <div className="toggles">
            <button type="button" className={`tg ${!d.hidden ? 'on' : ''}`} onClick={() => up((x) => (x.hidden = !x.hidden))}>
              На сайте
            </button>
            <button type="button" className={`tg ${d.featured ? 'on' : ''}`} onClick={() => up((x) => (x.featured = !x.featured))}>
              На главной странице
            </button>
            <button type="button" className={`tg ${d.skewer ? 'on' : ''}`} onClick={() => up((x) => (x.skewer = !x.skewer))}>
              Цена за шампур
            </button>
            {Object.entries(TAGS).map(([k, l]) => (
              <button key={k} type="button" className={`tg ${d.tags.includes(k) ? 'on' : ''}`} onClick={() => up((x) => (x.tags = x.tags.includes(k) ? x.tags.filter((t) => t !== k) : [...x.tags, k]))}>
                {l.ru}
              </button>
            ))}
          </div>
        </div>
        <div className="f full">
          <span>Подборки «Bugun nima yeymiz?» на главной</span>
          <div className="toggles">
            {MOODS.map((mo) => {
              const on = (d.moods || []).includes(mo.id);
              return (
                <button key={mo.id} type="button" className={`tg ${on ? 'on' : ''}`} onClick={() => up((x) => (x.moods = on ? (x.moods || []).filter((y) => y !== mo.id) : [...(x.moods || []), mo.id]))}>
                  {mo.ru}
                </button>
              );
            })}
          </div>
        </div>
        <div className="f full">
          <span>Фото</span>
          <div className="sx-row">
            <label className="b sm" style={{ cursor: 'pointer' }}>
              {uploading ? 'Загружаем…' : d.photo ? 'Заменить фото' : 'Загрузить своё фото'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                hidden
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    const fd = new FormData();
                    fd.append('file', file);
                    const r = await api('/api/admin/upload', 'POST', fd);
                    up((x) => (x.photo = r.id));
                    toast('Фото загружено. Не забудьте сохранить');
                  } catch (err: any) {
                    toast(err.message);
                  } finally {
                    setUploading(false);
                    e.target.value = '';
                  }
                }}
              />
            </label>
            {d.photo && (
              <button type="button" className="lnk red" onClick={() => up((x) => (x.photo = ''))}>
                Убрать фото
              </button>
            )}
            <small className="muted">Своё фото лучше любого стокового: сверху, при дневном свете, от 1600 px.</small>
          </div>
        </div>
      </div>
      <div className="sx-row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
        {confirm ? (
          <>
            <span>Удалить «{d.ru || d.name}» из меню?</span>
            <button
              className="b sm danger fill"
              onClick={() => {
                edit((m) => (m.dishes = m.dishes.filter((x) => x.id !== d.id)));
                onDeleted();
              }}
            >
              Удалить
            </button>
            <button className="b sm" onClick={() => setConfirm(false)}>
              Нет
            </button>
          </>
        ) : (
          <button className="lnk red" onClick={() => setConfirm(true)}>
            Удалить блюдо
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- categories + kitchen stations ---------------- */

const THEMES: [string, string][] = [['ember', 'Угли, тёмный'], ['saffron', 'Шафран'], ['pom', 'Гранат'], ['gold', 'Золото'], ['cream', 'Светлый'], ['copper', 'Медь'], ['herb', 'Зелень'], ['sand', 'Песок'], ['teal', 'Бирюза'], ['rose', 'Роза']];

export function CategoriesPage({ initial, settings }: { initial: Menu; settings: Settings }) {
  return (
    <MenuDoc initial={initial}>
      <Cats settings={settings} />
    </MenuDoc>
  );
}

function Cats({ settings }: { settings: Settings }) {
  const { menu, edit } = useMenu();
  const { toast } = usePanel();
  const [stations, setStations] = useState(settings.catStations || {});
  const setStation = async (cat: string, v: string) => {
    const next = { ...stations, [cat]: v };
    setStations(next);
    try {
      await api('/api/admin/settings', 'PATCH', { catStations: next });
      toast('Цех сохранён: новые бегунки пойдут туда');
    } catch (e: any) {
      toast(e.message);
    }
  };
  return (
    <>
      <PageHead title="Категории и цеха" sub="Порядок категорий — как на сайте и в кассе. Цех решает, куда печатается бегунок: кухня, мангал или бар.">
        <button className="b main" onClick={() => edit((m) => m.cats.push({ id: 'c' + Date.now().toString(36), name: 'Yangi boʻlim', ru: 'Новая категория' }))}>
          Добавить категорию
        </button>
      </PageHead>
      <div className="box">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>По-русски</th>
                <th>По-узбекски</th>
                <th>Цех</th>
                <th>Оформление на сайте</th>
                <th>Блюд</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {menu.cats.map((c, i) => {
                const n = menu.dishes.filter((d) => d.cat === c.id).length;
                return (
                  <tr key={c.id}>
                    <td>
                      <input className="ip sm" value={c.ru} onChange={(e) => edit((m) => (m.cats[i].ru = e.target.value))} aria-label="Название по-русски" />
                    </td>
                    <td>
                      <input className="ip sm" value={c.name} onChange={(e) => edit((m) => (m.cats[i].name = e.target.value))} aria-label="Название по-узбекски" />
                    </td>
                    <td>
                      <select className="ip sm" value={stations[c.id] || 'kitchen'} onChange={(e) => setStation(c.id, e.target.value)} aria-label="Цех">
                        <option value="kitchen">Кухня</option>
                        <option value="mangal">Мангал</option>
                        <option value="bar">Бар</option>
                      </select>
                    </td>
                    <td>
                      <select className="ip sm" value={c.theme || 'pom'} onChange={(e) => edit((m) => (m.cats[i].theme = e.target.value))} aria-label="Оформление">
                        {THEMES.map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="num">{n}</td>
                    <td className="r">
                      <div className="sx-row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                        <button className="b sm" disabled={!i} aria-label="Выше" onClick={() => edit((m) => ([m.cats[i - 1], m.cats[i]] = [m.cats[i], m.cats[i - 1]]))}>
                          ↑
                        </button>
                        <button className="b sm" disabled={i === menu.cats.length - 1} aria-label="Ниже" onClick={() => edit((m) => ([m.cats[i + 1], m.cats[i]] = [m.cats[i], m.cats[i + 1]]))}>
                          ↓
                        </button>
                        <button className="b sm danger" disabled={n > 0} title={n ? 'Сначала перенесите блюда в другую категорию' : 'Удалить'} onClick={() => edit((m) => m.cats.splice(i, 1))}>
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
        <p className="muted small" style={{ marginBottom: 0 }}>
          Цех сохраняется сразу. Названия и порядок — кнопкой «Сохранить» внизу.
        </p>
      </div>
    </>
  );
}

/* ---------------- combos ---------------- */

export function CombosPage({ initial }: { initial: Menu }) {
  return (
    <MenuDoc initial={initial}>
      <Combos />
    </MenuDoc>
  );
}

function Combos() {
  const { menu, edit } = useMenu();
  const combos = menu.combos ?? [];
  const priceOf = (id: string, si: number) => {
    const d = menu.dishes.find((x) => x.id === id);
    return d ? (d.sizes.length ? d.sizes[Math.min(si, d.sizes.length - 1)].p : d.price) : 0;
  };
  return (
    <>
      <PageHead title="Сеты" sub="Готовые сочетания на главной странице сайта. Цена сета — сумма текущих цен блюд; если блюда нет или у него нет цены, сет не показывается.">
        <button className="b main" onClick={() => edit((m) => (m.combos = [...(m.combos ?? []), { id: 'c' + Date.now().toString(36), name: 'Yangi toʻplam', ru: 'Новый сет', items: [{ id: menu.dishes[0]?.id || '', si: 0, qty: 1 }], active: false }]))}>
          Добавить сет
        </button>
      </PageHead>
      {combos.map((c, i) => {
        const sum = c.items.reduce((s, it) => s + priceOf(it.id, it.si) * it.qty, 0);
        const broken = c.items.some((it) => priceOf(it.id, it.si) <= 0);
        return (
          <div className="box" key={c.id}>
            <div className="box-head">
              <h2>{c.ru || c.name}</h2>
              <div className="sx-row">
                {broken ? <span className="bd new">не показывается: есть блюдо без цены</span> : <span className="bd ok">{money(sum)} сум</span>}
                <button type="button" className={`tg ${c.active !== false ? 'on' : ''}`} onClick={() => edit((m) => (m.combos![i].active = !(c.active !== false)))}>
                  {c.active !== false ? 'Включён' : 'Выключен'}
                </button>
              </div>
            </div>
            <div className="grid-f">
              <label className="f">
                <span>Название по-русски</span>
                <input className="ip" value={c.ru} onChange={(e) => edit((m) => (m.combos![i].ru = e.target.value))} />
              </label>
              <label className="f">
                <span>Название по-узбекски</span>
                <input className="ip" value={c.name} onChange={(e) => edit((m) => (m.combos![i].name = e.target.value))} />
              </label>
              <label className="f">
                <span>Описание по-русски</span>
                <input className="ip" value={c.desc || ''} onChange={(e) => edit((m) => (m.combos![i].desc = e.target.value))} />
              </label>
              <label className="f">
                <span>Описание по-узбекски</span>
                <input className="ip" value={c.descUz || ''} onChange={(e) => edit((m) => (m.combos![i].descUz = e.target.value))} />
              </label>
            </div>
            <table className="tbl" style={{ marginTop: 10 }}>
              <tbody>
                {c.items.map((it, j) => {
                  const d = menu.dishes.find((x) => x.id === it.id);
                  return (
                    <tr key={j}>
                      <td>
                        <select className="ip sm" value={it.id} onChange={(e) => edit((m) => (m.combos![i].items[j] = { id: e.target.value, si: 0, qty: it.qty }))} aria-label="Блюдо">
                          {menu.dishes.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.ru || x.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {d && d.sizes.length > 1 && (
                          <select className="ip sm" value={it.si} onChange={(e) => edit((m) => (m.combos![i].items[j].si = +e.target.value))} aria-label="Порция">
                            {d.sizes.map((sz, k) => (
                              <option key={k} value={k}>
                                {sz.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td style={{ width: 90 }}>
                        <input className="ip sm num" inputMode="numeric" value={String(it.qty)} aria-label="Количество" onChange={(e) => edit((m) => (m.combos![i].items[j].qty = Math.max(1, Math.min(50, +e.target.value.replace(/\D/g, '') || 1))))} />
                      </td>
                      <td className="r num">{priceOf(it.id, it.si) > 0 ? money(priceOf(it.id, it.si) * it.qty) : <span className="bd new">нет цены</span>}</td>
                      <td className="r">
                        <button className="lnk red" disabled={c.items.length < 2} onClick={() => edit((m) => m.combos![i].items.splice(j, 1))}>
                          убрать
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="sx-row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
              <button className="b sm" onClick={() => edit((m) => m.combos![i].items.push({ id: menu.dishes[0]?.id || '', si: 0, qty: 1 }))}>
                Добавить блюдо в сет
              </button>
              <button className="lnk red" onClick={() => edit((m) => m.combos!.splice(i, 1))}>
                Удалить сет
              </button>
            </div>
          </div>
        );
      })}
      {!combos.length && (
        <div className="box empty">
          <b>Сетов пока нет</b>
          Добавьте сочетание, которое часто берут вместе.
        </div>
      )}
    </>
  );
}
