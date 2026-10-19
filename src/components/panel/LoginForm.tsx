'use client';
import { useEffect, useState } from 'react';

type Emp = { id: string; name: string; role: string };

export default function LoginForm({ employees, next }: { employees: Emp[]; next: string }) {
  const [who, setWho] = useState<Emp | null>(null);
  // before any employee exists, the only useful first step is the owner's password
  const [owner, setOwner] = useState(employees.length === 0);
  const [pin, setPin] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const noStaff = employees.length === 0;
  const pinMode = !owner && (who || noStaff);

  async function send(body: Record<string, string>) {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Не удалось войти');
      location.href = next || j.home || '/admin';
    } catch (e: any) {
      setErr(e.message === 'Failed to fetch' ? 'Нет связи с сервером' : e.message);
      setPin('');
      setBusy(false);
    }
  }
  const submitPin = (p = pin) => p && send(who ? { id: who.id, pin: p } : { pin: p });

  // physical keyboard on the PIN screen
  useEffect(() => {
    if (!pinMode) return;
    const f = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) setPin((p) => (p + e.key).slice(0, 12));
      else if (e.key === 'Backspace') setPin((p) => p.slice(0, -1));
      else if (e.key === 'Enter') document.getElementById('pin-go')?.click();
    };
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, [pinMode]);

  if (owner)
    return (
      <form
        className="lg-form"
        onSubmit={(e) => {
          e.preventDefault();
          send({ password: pw });
        }}
      >
        <h2>Вход владельца</h2>
        <p className="muted" style={{ margin: 0 }}>
          {noStaff
            ? 'Первый вход: введите пароль владельца — тот же, что был у админки (ADMIN_PASSWORD в Railway). Потом в разделе «Сотрудники» добавьте кассира, официантов и поваров с их PIN.'
            : 'Пароль из переменной ADMIN_PASSWORD на Railway. Он работает всегда.'}
        </p>
        <label className="f">
          <span>Пароль</span>
          <input className="ip" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        </label>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="sx-row">
          <button type="button" className="b" onClick={() => (setOwner(false), setErr(null))}>
            {noStaff ? 'Общий PIN кассы' : 'Назад'}
          </button>
          <button className="b main" disabled={busy || !pw} style={{ flex: 1 }}>
            {busy ? 'Входим…' : 'Войти'}
          </button>
        </div>
      </form>
    );

  if (!pinMode)
    return (
      <div className="lg-form">
        <h2>Кто вы?</h2>
        <div className="who">
          {employees.map((e) => (
            <button key={e.id} onClick={() => (setWho(e), setPin(''), setErr(null))}>
              <b>{e.name}</b>
              <span>{e.role}</span>
            </button>
          ))}
        </div>
        <button className="lnk" style={{ alignSelf: 'flex-start' }} onClick={() => setOwner(true)}>
          Войти паролем владельца
        </button>
      </div>
    );

  return (
    <div className="lg-form">
      <h2>{who ? who.name : 'PIN кассы'}</h2>
      <p className="muted" style={{ margin: 0 }}>
        {who ? `${who.role}. Введите свой PIN.` : 'Сотрудники ещё не добавлены: введите общий PIN (STAFF_PIN) или войдите как владелец и добавьте сотрудников.'}
      </p>
      <div className="pin-dots" aria-label={`Введено цифр: ${pin.length}`}>
        {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
          <i key={i} className={i < pin.length ? 'on' : ''} />
        ))}
      </div>
      <div className="keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'go'].map((k) =>
          k === 'go' ? (
            <button key={k} id="pin-go" className="go" disabled={busy || !pin} onClick={() => submitPin()}>
              {busy ? '…' : 'Войти'}
            </button>
          ) : (
            <button key={k} aria-label={k === '⌫' ? 'Стереть' : k} onClick={() => setPin((p) => (k === '⌫' ? p.slice(0, -1) : (p + k).slice(0, 12)))}>
              {k}
            </button>
          ),
        )}
      </div>
      {err && <div className="err" role="alert" style={{ textAlign: 'center' }}>{err}</div>}
      <div className="sx-row" style={{ justifyContent: 'space-between' }}>
        {who ? (
          <button className="lnk" onClick={() => (setWho(null), setErr(null))}>
            Другой сотрудник
          </button>
        ) : (
          <span />
        )}
        <button className="lnk" onClick={() => setOwner(true)}>
          Пароль владельца
        </button>
      </div>
    </div>
  );
}
