import { pageUser } from '@/lib/auth';
import { q } from '@/lib/db';
import { ROLES } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export default async function AuditPage({ searchParams }: { searchParams: { who?: string } }) {
  await pageUser('audit', '/admin/audit');
  const who = searchParams.who || '';
  const [r, people] = await Promise.all([
    q(`SELECT * FROM audit_log ${who ? 'WHERE who = $1' : ''} ORDER BY id DESC LIMIT 400`, who ? [who] : []),
    q(`SELECT DISTINCT who FROM audit_log WHERE at > now() - interval '90 days' ORDER BY who`),
  ]);
  return (
    <>
      <div className="phd">
        <div>
          <h1>Журнал действий</h1>
          <p>Кто что делал: входы, смены, отмены позиций, изменения цен и настроек, склад. Удалить запись нельзя.</p>
        </div>
      </div>
      <div className="box">
        <form className="sx-row" style={{ marginBottom: 12 }}>
          <select className="ip sm" style={{ width: 'auto' }} name="who" defaultValue={who}>
            <option value="">Все сотрудники</option>
            {people.rows.map((p) => (
              <option key={p.who} value={p.who}>
                {p.who}
              </option>
            ))}
          </select>
          <button className="b sm">Показать</button>
        </form>
        {r.rows.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Когда</th>
                  <th>Кто</th>
                  <th>Что сделал</th>
                </tr>
              </thead>
              <tbody>
                {r.rows.map((a) => (
                  <tr key={a.id}>
                    <td className="num muted" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(a.at).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <b>{a.who}</b>
                      <div className="muted small">{(ROLES as Record<string, { name: string }>)[a.role]?.name || ''}</div>
                    </td>
                    <td>
                      {a.action}
                      {a.details && <div className="muted small">{a.details}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <b>Записей нет</b>
          </div>
        )}
      </div>
    </>
  );
}
