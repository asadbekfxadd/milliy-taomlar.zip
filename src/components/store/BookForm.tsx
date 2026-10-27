'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSite } from '../Providers';
import { L } from './StoreHeader';

const TZ = 'Asia/Tashkent';
const ymd = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
const toMin = (s?: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s || '');
  return m ? +m[1] * 60 + +m[2] : null;
};
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const DOW_UZ = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
const DOW_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/** Table booking form for guests: day chips, time slots inside opening hours, guests, name and phone. */
export default function BookForm() {
  const { settings: st, lang } = useSite();
  const router = useRouter();
  const days = useMemo(
    () =>
      Array.from({ length: 14 }, (_, k) => {
        const d = new Date(Date.now() + k * 86400_000);
        const v = ymd(d);
        const [y, m, dd] = v.split('-').map(Number);
        const dow = new Date(Date.UTC(y, m - 1, dd)).getUTCDay();
        return {
          v,
          dow,
          dd,
          closed: (st.closedDays || []).includes(dow) && !!st.openFrom,
        };
      }),
    [st.closedDays, st.openFrom],
  );
  const [day, setDay] = useState(days.find((d) => !d.closed)?.v || days[0].v);
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [f, setF] = useState({ name: '', phone: '', note: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const slots = useMemo(() => {
    const a = toMin(st.openFrom) ?? 10 * 60;
    let b = toMin(st.openTo) ?? 22 * 60;
    if (b <= a) b += 24 * 60;
    const out: string[] = [];
    // last booking an hour before closing
    for (let m = Math.ceil(a / 30) * 30; m <= b - 60; m += 30) out.push(hhmm(m));
    if (day === ymd(new Date())) {
      const p = new Intl.DateTimeFormat('en-US', {
        timeZone: TZ,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date());
      const now = +p.find((x) => x.type === 'hour')!.value * 60 + +p.find((x) => x.type === 'minute')!.value;
      return out.filter((s) => (toMin(s)! < a ? toMin(s)! + 1440 : toMin(s)!) >= now + 30);
    }
    return out;
  }, [st.openFrom, st.openTo, day]);

  if (st.bookingEnabled === false)
    return (
      <div className="alert warn">
        {L(lang, 'Saytda bron hozir yopiq. Iltimos, qoʻngʻiroq qiling: ', 'Бронь на сайте сейчас не принимаем. Позвоните нам: ')}
        {st.phone && <a href={`tel:${st.phone.replace(/[^\d+]/g, '')}`}>{st.phone}</a>}
      </div>
    );

  const max = st.bookingMaxGuests || 20;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.name.trim()) er.name = L(lang, 'Ismingizni kiriting', 'Укажите имя');
    if (f.phone.replace(/\D/g, '').length < 9) er.phone = L(lang, 'Raqam +998 90 123 45 67 koʻrinishida', 'Номер в формате +998 90 123 45 67');
    if (!time) er.time = L(lang, 'Vaqtni tanlang', 'Выберите время');
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const r = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...f, day, time, guests, lang }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr({ [j.field || 'form']: j.error });
        setBusy(false);
        return;
      }
      try {
        localStorage.setItem('mt-booking', j.token);
      } catch {}
      router.push(`/book/${j.token}`);
    } catch {
      setErr({
        form: L(lang, 'Aloqa yoʻq. Qayta urinib koʻring', 'Нет связи. Попробуйте ещё раз'),
      });
      setBusy(false);
    }
  };

  return (
    <form className="form bk-form" onSubmit={submit} noValidate>
      <div className="fld full">
        <span className="lbl">{L(lang, 'Qaysi kuni', 'Какой день')}</span>
        <div className="bk-days">
          {days.map((d, k) => (
            <button type="button" key={d.v} className={day === d.v ? 'on' : ''} disabled={d.closed} onClick={() => (setDay(d.v), setTime(''))}>
              <small>{k === 0 ? L(lang, 'Bugun', 'Сегодня') : k === 1 ? L(lang, 'Ertaga', 'Завтра') : (lang === 'uz' ? DOW_UZ : DOW_RU)[d.dow]}</small>
              <b className="num">{d.dd}</b>
            </button>
          ))}
        </div>
        {err.day && <span className="er">{err.day}</span>}
      </div>
      <div className={`fld full ${err.time ? 'bad' : ''}`}>
        <span className="lbl">{L(lang, 'Vaqt', 'Время')}</span>
        {slots.length ? (
          <div className="bk-slots">
            {slots.map((s) => (
              <button type="button" key={s} className={`num ${time === s ? 'on' : ''}`} onClick={() => setTime(s)}>
                {s}
              </button>
            ))}
          </div>
        ) : (
          <span className="cap">{L(lang, 'Bugun boʻsh vaqt qolmadi — boshqa kunni tanlang', 'На сегодня время закончилось — выберите другой день')}</span>
        )}
        {err.time && <span className="er">{err.time}</span>}
      </div>
      <div className={`fld full ${err.guests ? 'bad' : ''}`}>
        <span className="lbl">{L(lang, 'Necha kishi', 'Сколько гостей')}</span>
        <div className="bk-guests">
          <button type="button" onClick={() => setGuests(Math.max(1, guests - 1))} aria-label="−">
            −
          </button>
          <b className="num">{guests}</b>
          <button type="button" onClick={() => setGuests(Math.min(max, guests + 1))} aria-label="+">
            +
          </button>
          <span className="cap">{L(lang, `${max} kishidan koʻp boʻlsa — qoʻngʻiroq qiling`, `Больше ${max} — позвоните нам`)}</span>
        </div>
        {err.guests && <span className="er">{err.guests}</span>}
      </div>
      <div className={`fld ${err.name ? 'bad' : ''}`}>
        <label htmlFor="bkName">{L(lang, 'Ismingiz', 'Ваше имя')}</label>
        <input id="bkName" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        {err.name && <span className="er">{err.name}</span>}
      </div>
      <div className={`fld ${err.phone ? 'bad' : ''}`}>
        <label htmlFor="bkPhone">{L(lang, 'Telefon', 'Телефон')}</label>
        <input id="bkPhone" inputMode="tel" autoComplete="tel" placeholder="+998 90 123 45 67" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        {err.phone && <span className="er">{err.phone}</span>}
      </div>
      <div className="fld full">
        <label htmlFor="bkNote">{L(lang, 'Izoh (ixtiyoriy)', 'Пожелание (необязательно)')}</label>
        <input
          id="bkNote"
          placeholder={L(lang, 'Tugʻilgan kun, bolalar stuli, deraza yonida…', 'День рождения, детский стул, у окна…')}
          value={f.note}
          onChange={(e) => setF({ ...f, note: e.target.value })}
        />
      </div>
      {err.form && <div className="alert warn full">{err.form}</div>}
      <button className="btn full" disabled={busy} style={{ gridColumn: '1/-1' }}>
        {busy ? L(lang, 'Yuborilmoqda…', 'Отправляем…') : L(lang, 'Stolni bron qilish', 'Забронировать стол')}
      </button>
      <span className="cap full">{L(lang, 'Administrator qoʻngʻiroq qilib tasdiqlaydi.', 'Администратор перезвонит и подтвердит бронь.')}</span>
    </form>
  );
}
