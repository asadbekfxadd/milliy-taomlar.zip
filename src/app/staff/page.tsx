import Link from 'next/link';

export default function StaffHome() {
  const tiles = [
    ['/staff/pos', 'Касса и официант', 'Столы, заказы с сайта, отправка на кухню, пречек и оплата'],
    ['/staff/kitchen', 'Экран кухни', 'Бегунки по цехам: кухня, мангал, бар. Отмечайте «Готовится» и «Готово»'],
    ['/staff/print', 'Станция печати', 'Откройте на компьютере с чековым принтером: печатает бегунки и чеки сам'],
  ];
  return (
    <div className="sx-hub">
      {tiles.map(([href, t, d]) => (
        <Link key={href} href={href} className="sx-tile">
          <b>{t}</b>
          <span>{d}</span>
        </Link>
      ))}
    </div>
  );
}
