'use client';
import { useState } from 'react';

export default function CopyButton({ text, label = 'Скопировать номер', doneLabel = 'Скопировано' }: { text: string; label?: string; doneLabel?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {}
      }}
    >
      {done ? doneLabel : label}
    </button>
  );
}
