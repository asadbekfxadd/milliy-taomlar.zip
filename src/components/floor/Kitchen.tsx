'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStaff } from './FloorShell';
import { STATION_RU, placeOf, type StaffOrder } from './types';
import type { OrderItem } from '@/lib/types';

/* Kitchen display: one ticket per order and station; tap a line to move it on, or move the whole ticket. */
type Ticket = { o: StaffOrder; lines: { l: OrderItem; i: number }[]; at: number };

export default function Kitchen() {
  const { orders, refresh, toast } = useStaff();
  const [station, setStation] = useState<string>('all');
  const [sound, setSound] = useState(false);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    try {
      setStation(localStorage.getItem('mt-kds-station') || 'all');
    } catch {}
  }, []);
  const choose = (s: string) => {
    setStation(s);
    try {
      localStorage.setItem('mt-kds-station', s);
    } catch {}
  };

  const tickets = useMemo(() => {
    const out: Ticket[] = [];
    orders
      .filter((o) => !['done', 'cancelled'].includes(o.status))
      .forEach((o) => {
        const lines = o.items.map((l, i) => ({ l, i })).filter(({ l }) => l.sent && !l.void && l.ks !== 'ready' && (station === 'all' || (l.station || 'kitchen') === station));
        if (lines.length) out.push({ o, lines, at: Math.min(...lines.map(({ l }) => l.at || Date.parse(o.createdAt))) });
      });
    return out.sort((a, b) => a.at - b.at);
  }, [orders, station]);

  // beep on a new ticket
  useEffect(() => {
    const keys = new Set(tickets.map((t) => t.o.id + ':' + t.lines.map((x) => x.i).join(',')));
    if (seen.current && sound && [...keys].some((k) => !seen.current!.has(k))) beep();
    seen.current = keys;
  }, [tickets, sound]);

  async function move(o: StaffOrder, lines: number[], to: 'cooking' | 'ready') {
    const r = await fetch(`/api/staff/kitchen/${o.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lines, to }) });
    if (!r.ok) toast('Не удалось обновить');
    refresh();
  }

  const queued = tickets.filter((t) => t.lines.some(({ l }) => l.ks === 'queued'));
  const cooking = tickets.filter((t) => !t.lines.some(({ l }) => l.ks === 'queued'));

  return (
    <div className="kds">
      <div className="kds-top">
        <div className="sx-opts">
          {['all', 'kitchen', 'mangal', 'bar'].map((s) => (
            <button key={s} className={station === s ? 'on' : ''} onClick={() => choose(s)}>
              {s === 'all' ? 'Все цеха' : STATION_RU[s]}
            </button>
          ))}
        </div>
        <button className={`sx-btn ${sound ? 'ok' : 'ghost'}`} onClick={() => setSound(!sound)}>
          {sound ? 'Звук включён' : 'Включить звук'}
        </button>
      </div>
      <div className="kds-cols">
        <Col title="Новые" list={queued} move={move} next="cooking" />
        <Col title="Готовятся" list={cooking} move={move} next="ready" />
      </div>
    </div>
  );
}

function Col({ title, list, move, next }: { title: string; list: Ticket[]; move: (o: StaffOrder, l: number[], to: 'cooking' | 'ready') => void; next: 'cooking' | 'ready' }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <section>
      <h2>
        {title} <span className="chip">{list.length}</span>
      </h2>
      {list.length ? (
        list.map((t) => {
          const m = Math.floor((Date.now() - t.at) / 60000);
          return (
            <article key={t.o.id + title} className={`kt ${m >= 20 ? 'late' : m >= 12 ? 'warn' : ''}`}>
              <header>
                <b>{placeOf(t.o)}</b>
                <span className="num">№ {t.o.no} · {m} мин</span>
              </header>
              <ul>
                {t.lines.map(({ l, i }) => (
                  <li key={i}>
                    <button onClick={() => move(t.o, [i], l.ks === 'queued' ? 'cooking' : 'ready')} className={l.ks || ''}>
                      <b className="num">{l.qty}×</b>
                      <span>
                        {l.name}
                        {l.mods && <small> · {l.mods}</small>}
                        {l.note && <em>{l.note}</em>}
                      </span>
                      <i>{l.ks === 'cooking' ? 'готовится' : ''}</i>
                    </button>
                  </li>
                ))}
              </ul>
              <button className={`sx-btn ${next === 'ready' ? 'ok' : 'primary'} wide`} onClick={() => move(t.o, t.lines.map((x) => x.i), next)}>
                {next === 'ready' ? 'Готово' : 'Взять в работу'}
              </button>
            </article>
          );
        })
      ) : (
        <div className="pos-empty small">Пусто</div>
      )}
    </section>
  );
}

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.25].forEach((d) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 990;
      g.gain.setValueAtTime(0.2, ctx.currentTime + d);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + d);
      o.stop(ctx.currentTime + d + 0.2);
    });
  } catch {}
}
