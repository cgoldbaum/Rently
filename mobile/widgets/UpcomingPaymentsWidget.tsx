import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetData, WidgetItem } from './cache';

const COLORS = {
  bg: '#ffffff',
  text: '#2d2d2d',
  muted: '#8a8a8a',
  brand: '#6b5b45',
  danger: '#dc2626',
  warn: '#f59e0b',
  ok: '#16a34a',
} as const;

type HexColor = `#${string}`;

function daysUntil(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

// Big countdown shown for the next unpaid payment.
function countdown(item: WidgetItem): { big: string; caption: string; color: HexColor } {
  const days = daysUntil(item.dueDate);
  if (days < 0) {
    const n = Math.abs(days);
    return { big: String(n), caption: `día${n !== 1 ? 's' : ''} vencido`, color: COLORS.danger };
  }
  if (days === 0) return { big: 'Hoy', caption: 'vence hoy', color: COLORS.danger };
  return {
    big: String(days),
    caption: `día${days !== 1 ? 's' : ''} para vencer`,
    color: days <= 5 ? COLORS.warn : COLORS.brand,
  };
}

function Centered({ text }: { text: string }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 14,
      }}
    >
      <TextWidget text={text} style={{ fontSize: 14, color: COLORS.muted, textAlign: 'center' }} />
    </FlexWidget>
  );
}

export function UpcomingPaymentsWidget({ data }: { data: WidgetData }) {
  if (!data.loggedIn) return <Centered text="Iniciá sesión en Rently" />;

  const next = data.items.find((p) => !p.paid);
  if (!next) return <Centered text="Todo al día ✓" />;

  const { big, caption, color } = countdown(next);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 12,
      }}
    >
      <TextWidget
        text="PRÓXIMO PAGO"
        style={{ fontSize: 11, fontWeight: '700', color: COLORS.muted, letterSpacing: 1 }}
      />
      <TextWidget
        text={big}
        style={{ fontSize: 56, fontWeight: '700', color, textAlign: 'center' }}
      />
      <TextWidget text={caption} style={{ fontSize: 13, fontWeight: '600', color }} />
      <TextWidget
        text={next.label}
        truncate="END"
        maxLines={1}
        style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 6 }}
      />
      <TextWidget text={next.amount} style={{ fontSize: 11, color: COLORS.muted, marginTop: 1 }} />
    </FlexWidget>
  );
}
