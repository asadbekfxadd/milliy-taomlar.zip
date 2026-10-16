'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="masthead g">
      <div className="in">
        <div className="kicker">Ошибка</div>
        <h1 style={{ fontSize: 'clamp(48px,8vw,120px)' }}>Что-то пошло <em>не так</em></h1>
        <p className="muted" style={{ maxWidth: '48ch' }}>Страница не загрузилась. Попробуйте ещё раз через несколько секунд.</p>
        <button className="btn" onClick={reset} style={{ marginTop: 20 }}>Обновить</button>
      </div>
    </section>
  );
}
