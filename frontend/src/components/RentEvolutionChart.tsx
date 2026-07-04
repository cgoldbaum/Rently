'use client';

import { useState } from 'react';
import { formatMoney } from '@rently/shared';

export type RentPoint = { date: string; amount: number };

// Gráfico de línea de una sola serie: evolución del monto del alquiler en el
// tiempo, con un punto por ajuste. Sin leyenda (el título nombra la serie),
// grillas recesivas y tooltip al pasar el mouse.
export default function RentEvolutionChart({
  points,
  currency,
}: {
  points: RentPoint[];
  currency: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (points.length < 2) return null;

  const W = 640, H = 220;
  const padL = 70, padR = 18, padT = 16, padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const times = points.map(p => new Date(p.date).getTime());
  const amounts = points.map(p => p.amount);
  const t0 = Math.min(...times), t1 = Math.max(...times);
  const minA = Math.min(...amounts), maxA = Math.max(...amounts);
  // Padding vertical del 8% para que la línea no toque los bordes.
  const pad = (maxA - minA) * 0.08 || maxA * 0.08 || 1;
  const yMin = minA - pad, yMax = maxA + pad;

  const xFor = (t: number) => t1 === t0 ? padL + plotW / 2 : padL + ((t - t0) / (t1 - t0)) * plotW;
  const yFor = (a: number) => padT + (1 - (a - yMin) / (yMax - yMin)) * plotH;

  const coords = points.map((p, i) => ({ x: xFor(times[i]), y: yFor(p.amount), ...p }));
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');

  // 4 líneas de grilla horizontales con etiquetas de monto.
  const gridLines = Array.from({ length: 4 }, (_, i) => {
    const a = yMin + (i / 3) * (yMax - yMin);
    return { y: yFor(a), amount: a };
  });

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear()).slice(2)}`;
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }} role="img">
        {/* Grillas + etiquetas del eje Y */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={g.y} x2={W - padR} y2={g.y} stroke="var(--border-light)" strokeWidth={1} />
            <text x={padL - 8} y={g.y + 4} textAnchor="end" fontSize={11} fill="var(--text-muted)">
              {formatMoney(Math.round(g.amount), currency)}
            </text>
          </g>
        ))}

        {/* Línea de la serie */}
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Marcadores + etiquetas del eje X */}
        {coords.map((c, i) => (
          <g key={i}>
            <text x={c.x} y={H - padB + 20} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
              {fmtDate(c.date)}
            </text>
            <circle
              cx={c.x} cy={c.y} r={hovered === i ? 7 : 5}
              fill="var(--accent)" stroke="var(--bg-card)" strokeWidth={2}
              style={{ cursor: 'pointer', transition: 'r 120ms' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hovered !== null && (
        <div
          style={{
            position: 'absolute',
            left: `${(coords[hovered].x / W) * 100}%`,
            top: `${(coords[hovered].y / H) * 100}%`,
            transform: 'translate(-50%, calc(-100% - 12px))',
            background: 'var(--text)', color: 'var(--bg-card)',
            padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 2,
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {formatMoney(coords[hovered].amount, currency)}
          <span style={{ opacity: 0.7, fontWeight: 400 }}> · {fmtDate(coords[hovered].date)}</span>
        </div>
      )}
    </div>
  );
}
