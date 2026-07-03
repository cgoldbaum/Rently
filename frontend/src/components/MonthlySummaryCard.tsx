'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import Icon from '@/components/Icon';

// Tarjeta del dashboard: bajo demanda, la IA arma un resumen del estado del mes.
// On-demand (no en cada carga) para no gastar la API de IA innecesariamente.
export default function MonthlySummaryCard() {
  const { t } = useTranslation('dashboard');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await api.get('/ai/monthly-summary');
      setText(res.data.data.text?.trim() ?? '');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="card"
      style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🤖</span>
          <div className="section-label">{t('aiSummary.title')}</div>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', fontSize: 13, fontWeight: 600,
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 'var(--radius-sm)', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1, fontFamily: 'var(--font)',
          }}
        >
          <Icon name="star" size={14} color="#fff" />
          {loading ? t('aiSummary.generating') : text ? t('aiSummary.regenerate') : t('aiSummary.generate')}
        </button>
      </div>

      {error ? (
        <div style={{ fontSize: 13, color: 'var(--danger)' }}>{t('aiSummary.error')}</div>
      ) : text ? (
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {text}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('aiSummary.hint')}</div>
      )}
    </div>
  );
}
