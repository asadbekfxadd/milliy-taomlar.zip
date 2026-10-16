import Link from 'next/link';
import { getLang } from '@/lib/lang';
import { translate } from '@/lib/i18n';

export default function NotFound() {
  const lang = getLang();
  return (
    <section className="masthead g">
      <div className="in">
        <div className="kicker">404</div>
        <h1 style={{ fontSize: 'clamp(56px,9vw,140px)' }}>
          {translate(lang, 'nf.h1')} <em>{translate(lang, 'nf.h2')}</em>
        </h1>
        <div style={{ marginTop: 30, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link className="btn" href="/menu">
            {translate(lang, 'cart.open')}
          </Link>
          <Link className="btn ghost" href="/">
            {translate(lang, 'nav.toHome')}
          </Link>
        </div>
      </div>
    </section>
  );
}
