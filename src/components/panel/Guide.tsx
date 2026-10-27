'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export type Step = { t: string; d: string; href: string; done: boolean };

/** «С чего начать»: the setup steps, ticked automatically as the restaurant fills the system in. */
export default function Guide({ steps, video }: { steps: Step[]; video: string }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem('mt-guide-hidden') === String(steps.filter((s) => s.done).length));
    } catch {
      setHidden(false);
    }
  }, [steps]);
  const done = steps.filter((s) => s.done).length;
  if (hidden || done === steps.length) return null;
  const next = steps.find((s) => !s.done);
  return (
    <div className="box guide">
      <div className="box-head">
        <div>
          <h2 style={{ margin: 0 }}>С чего начать</h2>
          <span className="muted small">
            Готово {done} из {steps.length}. Отметки ставятся сами, когда шаг сделан.
          </span>
        </div>
        <div className="sx-row">
          {video && (
            <a className="b sm" href={video} target="_blank" rel="noopener">
              ▶ Видео-инструкция
            </a>
          )}
          <button
            className="lnk"
            onClick={() => {
              try {
                localStorage.setItem('mt-guide-hidden', String(done));
              } catch {}
              setHidden(true);
            }}
          >
            скрыть
          </button>
        </div>
      </div>
      <div className="guide-bar">
        <i style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="guide-list">
        {steps.map((s) => (
          <li key={s.t} className={s.done ? 'done' : s === next ? 'next' : ''}>
            <Link href={s.href}>
              <b>{s.t}</b>
              <span>{s.d}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
