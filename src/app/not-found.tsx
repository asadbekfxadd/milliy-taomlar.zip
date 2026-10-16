import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="masthead g">
      <div className="in">
        <div className="kicker">404</div>
        <h1 style={{ fontSize: 'clamp(56px,9vw,140px)' }}>
          Такой страницы <em>нет</em>
        </h1>
        <div style={{ marginTop: 30, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link className="btn" href="/menu">Открыть меню</Link>
          <Link className="btn ghost" href="/">На главную</Link>
        </div>
      </div>
    </section>
  );
}
