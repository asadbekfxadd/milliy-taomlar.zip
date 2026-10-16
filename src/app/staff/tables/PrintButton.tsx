'use client';
export default function PrintButton() {
  return (
    <button className="sx-btn primary" onClick={() => window.print()}>
      Печатать карточки
    </button>
  );
}
