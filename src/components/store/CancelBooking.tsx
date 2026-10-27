'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelBooking({ token, uz }: { token: string; uz: boolean }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn ghost"
      disabled={busy}
      onClick={async () => {
        if (!ask) return setAsk(true);
        setBusy(true);
        await fetch(`/api/reservations/${token}`, { method: 'DELETE' }).catch(() => null);
        router.refresh();
        setBusy(false);
        setAsk(false);
      }}
    >
      {ask ? (uz ? 'Ha, bekor qilish' : 'Да, отменить бронь') : uz ? 'Bronni bekor qilish' : 'Отменить бронь'}
    </button>
  );
}
