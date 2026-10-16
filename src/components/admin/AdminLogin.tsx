'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <section className="masthead g">
      <div className="in" style={{ maxWidth: 560 }}>
        <div className="kicker">Управление</div>
        <h1 style={{ fontSize: 'clamp(56px,9vw,110px)' }}>Вход</h1>
        <form
          className="form"
          style={{ gridTemplateColumns: '1fr', marginTop: 30 }}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr(null);
            const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw }) }).catch(() => null);
            setBusy(false);
            if (r?.ok) return router.refresh();
            const j = await r?.json().catch(() => ({}));
            setErr(j?.error || 'Нет связи с сервером');
          }}
        >
          <div className={`fld ${err ? 'bad' : ''}`}>
            <label htmlFor="pw">Пароль администратора</label>
            <input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
            {err && <span className="er">{err}</span>}
          </div>
          <button className="btn" disabled={busy || !pw}>
            {busy ? 'Проверяем…' : 'Войти'}
          </button>
        </form>
      </div>
    </section>
  );
}
