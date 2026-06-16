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

function daysUntil(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

type HexColor = `#${string}`;

function rowMeta(item: WidgetItem): { color: HexColor; text: string } {
  if (item.paid) return { color: COLORS.ok, text: '✓ Pagado' };
  const days = daysUntil(item.dueDate);
  if (days < 0) return { color: COLORS.danger, text: `Vencido hace ${Math.abs(days)}d` };
  if (days === 0) return { color: COLORS.danger, text: 'Vence hoy' };
  if (days <= 5) return { color: COLORS.warn, text: `Vence en ${days} día${days !== 1 ? 's' : ''}` };
  return { color: COLORS.brand, text: `Vence en ${days} días` };
}

function Message({ text }: { text: string }) {
  return (
    <TextWidget
      text={text}
      style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}
    />
  );
}

export function UpcomingPaymentsWidget({ data }: { data: WidgetData }) {
  const items = data.items.slice(0, 3);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 14,
      }}
    >
      <TextWidget
        text="Próximos vencimientos"
        style={{ fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 }}
      />

      {!data.loggedIn ? (
        <Message text="Iniciá sesión en Rently" />
      ) : items.length === 0 ? (
        <Message text="Todo al día ✓" />
      ) : (
        items.map((item, i) => {
          const meta = rowMeta(item);
          return (
            <FlexWidget
              key={String(i)}
              style={{ flexDirection: 'column', width: 'match_parent', marginBottom: 6 }}
            >
              <FlexWidget
                style={{
                  flexDirection: 'row',
                  width: 'match_parent',
                  justifyContent: 'space-between',
                }}
              >
                <TextWidget
                  text={item.label}
                  truncate="END"
                  maxLines={1}
                  style={{ fontSize: 13, fontWeight: '600', color: COLORS.text }}
                />
                <TextWidget
                  text={item.amount}
                  style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}
                />
              </FlexWidget>
              <TextWidget text={meta.text} style={{ fontSize: 11, color: meta.color }} />
            </FlexWidget>
          );
        })
      )}
    </FlexWidget>
  );
}
