'use client';
export default function PrintButton({ label = 'Печать' }: { label?: string }) {
  return (
    <button className="b main" onClick={() => print()}>
      {label}
    </button>
  );
}
