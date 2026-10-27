import type { Metadata } from 'next';
import { getLang } from '@/lib/lang';
import BookForm from '@/components/store/BookForm';

export async function generateMetadata(): Promise<Metadata> {
  const uz = getLang() === 'uz';
  return {
    title: uz ? 'Stol bron qilish' : 'Бронь стола',
    description: uz ? 'Kun, vaqt va mehmonlar sonini tanlang — administrator tasdiqlaydi.' : 'Выберите день, время и число гостей — администратор подтвердит.',
    alternates: { canonical: '/book' },
  };
}

export default function BookPage() {
  const uz = getLang() === 'uz';
  return (
    <>
      <section className="masthead g" style={{ paddingBottom: 10 }}>
        <div className="in">
          <div className="kicker">{uz ? 'Zalda' : 'В зале'}</div>
          <h1>{uz ? 'Stol bron qilish' : 'Бронь стола'}</h1>
        </div>
      </section>
      <div className="g">
        <div className="in">
          <div style={{ maxWidth: 760 }}>
            <BookForm />
          </div>
        </div>
      </div>
    </>
  );
}
