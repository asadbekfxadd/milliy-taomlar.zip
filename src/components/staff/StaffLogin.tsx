'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffLogin() {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const press = (k: string) => setPin((p) => (k === '⌫' ? p.slice(0, -1) : (p + k).slice(0, 32)));
  async function go(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await fetch('/api/staff/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin }) }).catch(() => null);
    setBusy(false);
    if (r?.ok) return router.refresh();
    const j = await r?.json().catch(() => ({}));
    setErr(j?.error || 'Нет связи с сервером');
    setPin('');
  }
  return (
    <div className="sx-login">
      <form onSubmit={go} className="sx-login-box">
        <div className="sx-kicker">MANGO · персонал</div>
        <h1>Вход</h1>
        <input className="sx-pin" type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN-код" aria-label="PIN-код" autoFocus />
        <div className="sx-keys">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].map((k) =>
            k === 'OK' ? (
              <button key={k} type="submit" className="sx-key ok" disabled={busy || !pin}>
                {busy ? '…' : 'Войти'}
              </button>
            ) : (
              <button key={k} type="button" className="sx-key" onClick={() => press(k)}>
                {k}
              </button>
            ),
          )}
        </div>
        {err && <div className="sx-err" role="alert">{err}</div>}
      </form>
    </div>
  );
}
