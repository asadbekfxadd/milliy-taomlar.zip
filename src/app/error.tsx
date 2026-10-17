'use client';
import { useEffect, useState } from 'react';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const [uz, setUz] = useState(true);
  useEffect(() => setUz(document.documentElement.lang !== 'ru'), []);
  return (
    <section className="masthead g">
      <div className="in">
        <div className="kicker">{uz ? 'Xatolik' : 'Ошибка'}</div>
        <h1 style={{ fontSize: 'clamp(48px,8vw,120px)' }}>
          {uz ? 'Nimadir' : 'Что-то пошло'} <em>{uz ? 'notoʻgʻri ketdi' : 'не так'}</em>
        </h1>
        <p className="muted" style={{ maxWidth: '48ch' }}>
          {uz ? 'Sahifa yuklanmadi. Bir necha soniyadan soʻng qayta urinib koʻring.' : 'Страница не загрузилась. Попробуйте ещё раз через несколько секунд.'}
        </p>
        <button className="btn" onClick={reset} style={{ marginTop: 20 }}>
          {uz ? 'Yangilash' : 'Обновить'}
        </button>
      </div>
    </section>
  );
}
