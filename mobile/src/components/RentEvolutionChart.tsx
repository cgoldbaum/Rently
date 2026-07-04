import { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { formatMoney } from '@rently/shared';
import { useThemeColors } from '../theme/useThemeColors';
import type { ThemeColors } from '../theme/colors';

export type RentPoint = { date: string; amount: number };

// Gráfico de línea de una sola serie: evolución del alquiler en el tiempo.
// Tocá un punto para ver su monto y fecha (RN no tiene hover).
export function RentEvolutionChart({
  points,
  currency,
}: {
  points: RentPoint[];
  currency: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (points.length < 2) return null;

  const W = 320, H = 180;
  const padL = 58, padR = 12, padT = 14, padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const times = points.map((p) => new Date(p.date).getTime());
  const amounts = points.map((p) => p.amount);
  const t0 = Math.min(...times), t1 = Math.max(...times);
  const minA = Math.min(...amounts), maxA = Math.max(...amounts);
  const pad = (maxA - minA) * 0.08 || maxA * 0.08 || 1;
  const yMin = minA - pad, yMax = maxA + pad;

  const xFor = (t: number) => (t1 === t0 ? padL + plotW / 2 : padL + ((t - t0) / (t1 - t0)) * plotW);
  const yFor = (a: number) => padT + (1 - (a - yMin) / (yMax - yMin)) * plotH;

  const coords = points.map((p, i) => ({ x: xFor(times[i]), y: yFor(p.amount), ...p }));
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');

  const gridLines = Array.from({ length: 4 }, (_, i) => {
    const a = yMin + (i / 3) * (yMax - yMin);
    return { y: yFor(a), amount: a };
  });

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear()).slice(2)}`;
  };

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {gridLines.map((g, i) => (
          <Line key={`g${i}`} x1={padL} y1={g.y} x2={W - padR} y2={g.y} stroke="#eee6da" strokeWidth={1} />
        ))}
        {gridLines.map((g, i) => (
          <SvgText key={`t${i}`} x={padL - 6} y={g.y + 3} fontSize={9} fill={colors.textMuted} textAnchor="end">
            {formatMoney(Math.round(g.amount), currency)}
          </SvgText>
        ))}

        <Path d={linePath} fill="none" stroke="#6b5b45" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {coords.map((c, i) => (
          <SvgText key={`x${i}`} x={c.x} y={H - padB + 16} fontSize={9} fill={colors.textMuted} textAnchor="middle">
            {fmtDate(c.date)}
          </SvgText>
        ))}
        {coords.map((c, i) => (
          <Circle
            key={`c${i}`}
            cx={c.x} cy={c.y} r={selected === i ? 7 : 5}
            fill="#6b5b45" stroke="#fff" strokeWidth={2}
            onPress={() => setSelected(selected === i ? null : i)}
          />
        ))}
      </Svg>

      {selected !== null && (
        <Text style={styles.caption}>
          {fmtDate(coords[selected].date)} · {formatMoney(coords[selected].amount, currency)}
        </Text>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    caption: { textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#6b5b45', marginTop: 6 },
  });
}
