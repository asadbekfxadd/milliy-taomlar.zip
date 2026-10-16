'use client';
import { useEffect, useRef, useState } from 'react';
import { useStaff } from './StaffShell';
import { STATION_RU } from './types';
import { ticketHtml } from './ticket';

/* Open this page on the computer the receipt printer is connected to.
   It pulls new runners/checks for the ticked stations and prints them.
   For printing without the dialog, start Chrome with --kiosk-printing (see the hint on the page). */

type Job = { id: number; station: string; kind: string; body: any; created_at: string };
const KIND_RU: Record<string, string> = { runner: 'бегунок', precheck: 'пречек', receipt: 'чек', online: 'заказ с сайта', test: 'тест' };

export default function PrintStation() {
  const { toast } = useStaff();
  const [stations, setStations] = useState<string[]>([]);
  const [auto, setAuto] = useState(true);
  const [log, setLog] = useState<{ t: number; job: Job; ok: boolean }[]>([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const printing = useRef(false);
  const [origin, setOrigin] = useState('https://ваш-сайт');
  useEffect(() => setOrigin(location.origin), []);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('mt-print-stations') || 'null');
      setStations(Array.isArray(s) ? s : ['kitchen', 'mangal', 'bar', 'cashier']);
      setAuto(localStorage.getItem('mt-print-auto') !== '0');
    } catch {
      setStations(['kitchen', 'mangal', 'bar', 'cashier']);
    }
  }, []);
  const save = (s: string[], a = auto) => {
    setStations(s);
    try {
      localStorage.setItem('mt-print-stations', JSON.stringify(s));
      localStorage.setItem('mt-print-auto', a ? '1' : '0');
    } catch {}
  };

  // keep the screen awake on a dedicated print PC/tablet
  useEffect(() => {
    let lock: any;
    (navigator as any).wakeLock?.request('screen').then((l: any) => (lock = l)).catch(() => {});
    return () => lock?.release?.();
  }, []);

  function printOne(html: string) {
    return new Promise<void>((resolve) => {
      const f = frame.current;
      if (!f) return resolve();
      f.onload = () => {
        const w = f.contentWindow;
        if (!w) return resolve();
        let done = false;
        const finish = () => {
          if (!done) {
            done = true;
            resolve();
          }
        };
        w.addEventListener('afterprint', finish);
        setTimeout(finish, 2500);
        w.focus();
        w.print();
      };
      f.srcdoc = html;
    });
  }

  useEffect(() => {
    if (!auto || !stations.length) return;
    let alive = true;
    const loop = async () => {
      if (!alive || printing.current) return;
      printing.current = true;
      try {
        const r = await fetch(`/api/staff/print?stations=${stations.join(',')}`, { cache: 'no-store' });
        const j = await r.json();
        for (const job of (j.jobs || []) as Job[]) {
          try {
            await printOne(ticketHtml(job, j.paper || '80'));
            await fetch('/api/staff/print', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'done', id: job.id }) });
            setLog((l) => [{ t: Date.now(), job, ok: true }, ...l].slice(0, 30));
          } catch {
            await fetch('/api/staff/print', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'release', id: job.id }) });
            setLog((l) => [{ t: Date.now(), job, ok: false }, ...l].slice(0, 30));
          }
        }
      } catch {}
      printing.current = false;
    };
    loop();
    const t = setInterval(loop, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [auto, stations]);

  async function test(station: string) {
    setBusy(true);
    await fetch('/api/staff/print', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'test', station }) });
    setBusy(false);
    toast(stations.includes(station) && auto ? 'Тест в очереди, сейчас напечатается' : 'Тест в очереди. Отметьте этот цех и включите печать.');
  }

  return (
    <div className="prn">
      <section className="prn-card">
        <h2>Что печатать на этом компьютере</h2>
        <div className="prn-st">
          {Object.entries(STATION_RU).map(([k, l]) => (
            <label key={k} className={stations.includes(k) ? 'on' : ''}>
              <input type="checkbox" checked={stations.includes(k)} onChange={() => save(stations.includes(k) ? stations.filter((x) => x !== k) : [...stations, k])} />
              <b>{l}</b>
              <span>{k === 'cashier' ? 'чеки гостю (если включены)' : 'бегунки на кухню'}</span>
              <button type="button" className="sx-link" disabled={busy} onClick={(e) => (e.preventDefault(), test(k))}>
                тест
              </button>
            </label>
          ))}
        </div>
        <div className="sx-row">
          <button className={`sx-btn ${auto ? 'ok' : 'primary'} grow`} onClick={() => (setAuto(!auto), save(stations, !auto))}>
            {auto ? '● Печать включена — ждём заказы' : 'Включить автопечать'}
          </button>
          <button className="sx-btn ghost" onClick={() => setPreview(ticketHtml({ kind: 'runner', station: 'mangal', body: { title: 'Мангал', place: 'Стол 7', no: 128, at: Date.now(), waiter: 'Азиз', guests: 4, lines: [{ qty: 4, name: "Qo'y kabob", mods: '', note: 'без лука' }, { qty: 2, name: 'Lula kabob', mods: '' }] } }, '80'))}>
            Образец бегунка
          </button>
        </div>
      </section>

      <section className="prn-card">
        <h2>Как настроить принтер, один раз</h2>
        <ol className="prn-steps">
          <li>Подключите чековый принтер (USB или по сети) к этому компьютеру и установите драйвер. Сделайте его <b>принтером по умолчанию</b>, бумага 80 мм.</li>
          <li>
            Чтобы печатало <b>без окна подтверждения</b>, создайте ярлык Chrome с такой строкой:
            <code>chrome.exe --kiosk-printing --app={origin}/staff/print</code>
          </li>
          <li>Откройте ярлык, войдите PIN-кодом и отметьте цеха, которые печатает этот принтер. Нажмите «тест».</li>
          <li>Если принтеров несколько (кухня, мангал, касса), откройте эту страницу на каждом компьютере и отметьте только его цех.</li>
        </ol>
      </section>

      <section className="prn-card">
        <h2>Напечатано</h2>
        {log.length ? (
          <ul className="prn-log">
            {log.map((x, i) => (
              <li key={i} className={x.ok ? '' : 'bad'}>
                <span className="num">{new Date(x.t).toLocaleTimeString('ru-RU')}</span>
                <b>{STATION_RU[x.job.station]}</b>
                <span>{KIND_RU[x.job.kind] || x.job.kind}</span>
                <span>{x.job.body?.place || ''}{x.job.body?.no ? ` · № ${x.job.body.no}` : ''}</span>
                <span>{x.ok ? 'готово' : 'ошибка, повтор'}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sx-muted">Пока ничего. Новые бегунки и чеки появятся здесь сразу после печати.</p>
        )}
      </section>

      <iframe ref={frame} title="print" className="prn-frame" aria-hidden="true" />
      {preview && (
        <div className="sx-modal" role="dialog" aria-modal="true">
          <div className="sx-scrim" onClick={() => setPreview(null)} />
          <div className="sx-sheet narrow">
            <iframe title="Образец" srcDoc={preview} className="prn-preview" />
            <button className="sx-btn" onClick={() => setPreview(null)}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
