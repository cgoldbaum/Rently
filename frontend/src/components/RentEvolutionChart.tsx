'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { formatMoney } from '@rently/shared';

export type RentPoint = { date: string; amount: number };

// Ticks "redondos" para el eje Y: paso 1/2/5×10^n dentro del rango dado.
function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || Math.abs(max) || 1;
  const rawStep = span / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) ticks.push(v);
  return ticks;
}

// Gráfico de línea de una sola serie: evolución del monto del alquiler en el
// tiempo, con un punto por ajuste. Sin leyenda (el título nombra la serie),
// grillas recesivas y tooltip al pasar el mouse. Se dibuja a escala 1:1 con
// el ancho real del contenedor (altura fija) para que el texto no se escale.
export default function RentEvolutionChart({
  points,
  currency,
}: {
  points: RentPoint[];
  currency: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 240;

  if (points.length < 2) return null;

  const W = width;
  const padL = 72, padR = 16, padT = 12, padB = 30;
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

  const gridLines = niceTicks(yMin, yMax).map(a => ({ y: yFor(a), amount: a }));

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear()).slice(2)}`;
  };

  // Etiquetas del eje X: omitir las que quedarían a menos de 56px de la anterior.
  let lastLabelX = -Infinity;
  const xLabels = coords.map(c => {
    const show = c.x - lastLabelX >= 56;
    if (show) lastLabelX = c.x;
    return show;
  });

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: H }}>
      {W > 0 && (
        <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }} role="img">
          {/* Grillas + etiquetas del eje Y */}
          {gridLines.map((g, i) => (
            <g key={i}>
              <line x1={padL} y1={g.y} x2={W - padR} y2={g.y} stroke="var(--border-light)" strokeWidth={1} />
              <text x={padL - 10} y={g.y + 4} textAnchor="end" fontSize={11} fill="var(--text-muted)">
                {formatMoney(Math.round(g.amount), currency)}
              </text>
            </g>
          ))}

          {/* Línea de la serie */}
          <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* Marcadores + etiquetas del eje X */}
          {coords.map((c, i) => (
            <g key={i}>
              {xLabels[i] && (
                <text x={c.x} y={H - padB + 20} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
                  {fmtDate(c.date)}
                </text>
              )}
              <circle
                cx={c.x} cy={c.y} r={hovered === i ? 6 : 4}
                fill="var(--accent)" stroke="var(--bg-card)" strokeWidth={2}
                style={{ transition: 'r 120ms' }}
              />
              {/* Zona de hover más grande que el marcador */}
              <circle
                cx={c.x} cy={c.y} r={14} fill="transparent" style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          ))}
        </svg>
      )}

      {/* Tooltip */}
      {hovered !== null && coords[hovered] && (
        <div
          style={{
            position: 'absolute',
            left: coords[hovered].x,
            top: coords[hovered].y,
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
