'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES, ROLE_IDS, type Role } from '@/lib/rbac';
import { api, PageHead, usePanel } from './kit';

type Emp = { id: string; name: string; role: Role; phone: string; active: boolean; createdAt: string };

export default function Employees({ initial, me }: { initial: Emp[]; me: { id: string; role: Role } }) {
  const [list, setList] = useState(initial);
  const [edit, setEdit] = useState<string | null>(initial.length ? null : 'new');
  const { toast } = usePanel();
  const router = useRouter();
  const reload = async () => {
    setList(await api('/api/admin/employees'));
    router.refresh();
  };
  const roles = ROLE_IDS.filter((r) => r !== 'owner' || me.role === 'owner');

  return (
    <>
      <PageHead title="Сотрудники" sub="У каждого свой PIN и роль. Роль решает, какие экраны человек видит после входа.">
        <button className="b main" onClick={() => setEdit('new')}>
          Добавить сотрудника
        </button>
      </PageHead>

      {edit === 'new' && (
        <EmpForm
          roles={roles}
          onCancel={() => setEdit(null)}
          onSave={async (d) => {
            await api('/api/admin/employees', 'POST', d);
            toast(`${d.name} добавлен. Вход: имя и PIN на странице /login`);
            setEdit(null);
            await reload();
          }}
        />
      )}

      <div className="box">
        {list.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Роль</th>
                  <th>Что видит</th>
                  <th>Телефон</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((e) =>
                  edit === e.id ? (
                    <tr key={e.id}>
                      <td colSpan={5} style={{ padding: 0 }}>
                        <EmpForm
                          e={e}
                          roles={e.role === 'owner' ? (['owner'] as Role[]) : roles}
                          self={e.id === me.id}
                          onCancel={() => setEdit(null)}
                          onSave={async (d) => {
                            await api(`/api/admin/employees/${e.id}`, 'PATCH', d);
                            toast('Сохранено');
                            setEdit(null);
                            await reload();
                          }}
                          onToggle={async () => {
                            await api(`/api/admin/employees/${e.id}`, 'PATCH', { active: !e.active });
                            toast(e.active ? `${e.name} больше не может войти` : `${e.name} снова может войти`);
                            setEdit(null);
                            await reload();
                          }}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={e.id} className="click" onClick={() => setEdit(e.id)} style={e.active ? undefined : { opacity: 0.5 }}>
                      <td>
                        <b>{e.name}</b> {e.id === me.id && <span className="bd info">это вы</span>} {!e.active && <span className="bd">отключён</span>}
                      </td>
                      <td>{ROLES[e.role].name}</td>
                      <td className="muted small">{ROLES[e.role].hint}</td>
                      <td className="num">{e.phone}</td>
                      <td className="r">
                        <button className="b sm">Изменить</button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <b>Сотрудников пока нет</b>
            Добавьте кассира, официантов и поваров — каждый получит свой PIN.
          </div>
        )}
      </div>
    </>
  );
}

function EmpForm({ e, roles, self, onSave, onCancel, onToggle }: { e?: Emp; roles: Role[]; self?: boolean; onSave: (d: { name: string; role: Role; pin: string; phone: string }) => Promise<void>; onCancel: () => void; onToggle?: () => Promise<void> }) {
  const [name, setName] = useState(e?.name || '');
  const [role, setRole] = useState<Role>(e?.role || 'waiter');
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState(e?.phone || '');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (x: any) {
      setErr(x.message);
    }
    setBusy(false);
  };
  return (
    <form
      className="box"
      style={{ margin: e ? 0 : '0 0 14px', borderRadius: e ? 0 : 14, borderWidth: e ? 0 : 1, background: e ? 'var(--soft)' : undefined }}
      onSubmit={(ev) => {
        ev.preventDefault();
        run(() => onSave({ name, role, pin, phone }));
      }}
    >
      <h2>{e ? e.name : 'Новый сотрудник'}</h2>
      <div className="grid-f" style={{ marginTop: 12 }}>
        <label className="f">
          <span>Имя, как на экране входа</span>
          <input className="ip" value={name} onChange={(x) => setName(x.target.value)} required autoFocus={!e} />
        </label>
        <label className="f">
          <span>Роль</span>
          <select className="ip" value={role} onChange={(x) => setRole(x.target.value as Role)} disabled={self}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLES[r].name}
              </option>
            ))}
          </select>
          <small>{ROLES[role].hint}</small>
        </label>
        <label className="f">
          <span>{e ? 'Новый PIN (пусто — оставить старый)' : 'PIN, 4–8 цифр'}</span>
          <input className="ip num" inputMode="numeric" autoComplete="off" value={pin} onChange={(x) => setPin(x.target.value.replace(/\D/g, '').slice(0, 8))} required={!e} />
        </label>
        <label className="f">
          <span>Телефон (необязательно)</span>
          <input className="ip" inputMode="tel" value={phone} onChange={(x) => setPhone(x.target.value)} />
        </label>
      </div>
      {err && <p className="err">{err}</p>}
      <div className="sx-row" style={{ marginTop: 14 }}>
        <button className="b main" disabled={busy}>
          {e ? 'Сохранить' : 'Добавить'}
        </button>
        <button type="button" className="b" onClick={onCancel}>
          Отмена
        </button>
        {e && onToggle && !self && (
          <button type="button" className="b danger" style={{ marginLeft: 'auto' }} disabled={busy} onClick={() => run(onToggle)}>
            {e.active ? 'Отключить вход' : 'Включить вход'}
          </button>
        )}
      </div>
    </form>
  );
}
