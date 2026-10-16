/* Girih lattice: 8-point stars joined by straight ties — the brand mark repeated as hero background and footer band. */
function starPts(cx: number, cy: number, R: number, r: number) {
  let p = '';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2,
      rr = i % 2 ? r : R;
    p += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
  }
  return p + 'Z';
}

export default function Girih({ w, h, step, className = '' }: { w: number; h: number; step: number; className?: string }) {
  const paths: string[] = [];
  for (let y = step / 2; y < h + step; y += step)
    for (let x = step / 2; x < w + step; x += step) {
      paths.push(starPts(x, y, step * 0.34, step * 0.25));
      paths.push(`M${x + step * 0.34} ${y}L${x + step * 0.66} ${y}M${x} ${y + step * 0.34}L${x} ${y + step * 0.66}`);
      const a = (step * 0.24).toFixed(1), b = (step * 0.76).toFixed(1);
      paths.push(`M${x + +a} ${y + +a}L${x + +b} ${y + +b}M${x + +b} ${y + +a}L${x + +a} ${y + +b}`);
    }
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export function StarMark({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="9" y="9" width="22" height="22" />
        <rect x="9" y="9" width="22" height="22" transform="rotate(45 20 20)" />
        <circle cx="20" cy="20" r="4.5" />
      </g>
    </svg>
  );
}
