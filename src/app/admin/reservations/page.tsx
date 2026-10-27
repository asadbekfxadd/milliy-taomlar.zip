import { pageUser } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import Reservations from '@/components/panel/Reservations';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('tables', '/admin/reservations');
  const st = await getSettings();
  return <Reservations tables={st.tables || 0} enabled={st.bookingEnabled !== false} maxGuests={st.bookingMaxGuests || 20} />;
}
