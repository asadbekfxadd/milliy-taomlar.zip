import type { Metadata } from 'next';
import TableEntry from '@/components/TableEntry';

import { getLang } from '@/lib/lang';

export async function generateMetadata(): Promise<Metadata> {
  return { title: getLang() === 'uz' ? 'Stoldagi menyu' : 'Меню за столом', robots: { index: false } };
}

/* NFC tag / QR on each table points here: /t/7 → remembers table 7 and opens the menu. */
export default function TablePage({ params }: { params: { n: string } }) {
  return <TableEntry n={Number(params.n) || 0} />;
}
