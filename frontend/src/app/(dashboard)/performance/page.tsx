'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Icon from '@/components/Icon';

type RecommendationType = 'raise_rent' | 'lower_risk' | 'renew_soon' | 'vacant' | 'maintain';

interface PropertyPerf {
  propertyId: string;
  propertyName: string;
  address: string;
  status: string;
  currency: string;
  currentRent: number;
  rentGrowthPct: number;
  contractMonths: number;
  tenantName: string | null;
  totalIncome12m: number;
  paidOnTimeCount: number;
  paidLateCount: number;
  lateUnpaidCount: number;
  onTimeRate: number;
  claimsLast12m: number;
  openClaims: number;
  recommendation: RecommendationType;
  recommendationDetail: string;
}

interface Summary {
  totalIncome12m: number;
  avgOnTimeRate: number;
  propertiesWithAlerts: number;
  topPropertyName: string | null;
}

interface PerformanceData {
  summary: Summary;
  properties: PropertyPerf[];
}

const REC_CONFIG: Record<RecommendationType, { label: string; color: string; bg: string; icon: string }> = {
  raise_rent:  { label: 'Subir alquiler',      color: '#15803d', bg: '#dcfce7', icon: '↑' },
  lower_risk:  { label: 'Revisar condiciones', color: '#b91c1c', bg: '#fee2e2', icon: '⚠' },
  renew_soon:  { label: 'Renovar contrato',    color: '#6d28d9', bg: '#ede9fe', icon: '↻' },
  vacant:      { label: 'Desocupada',          color: '#6b7280', bg: '#f3f4f6', icon: '○' },
  maintain:    { label: 'Estable',             color: '#0369a1', bg: '#e0f2fe', icon: '✓' },
};

function OnTimeBar({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const color = pct >= 90 ? '#15803d' : pct >= 70 ? '#d97706' : '#b91c1c';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: 'var(--text-secondary)' }}>Pago puntual</span>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const { data, isPending } = useQuery<PerformanceData | null>({
    queryKey: ['reports', 'performance'],
    queryFn: () => api.get('/owner/reports/performance').then(r => r.data.data),
  });
  const [sortBy, setSortBy] = useState<'income' | 'ontime' | 'rent'>('income');

  const properties = [...(data?.properties ?? [])].sort((a, b) => {
    if (sortBy === 'income') return b.totalIncome12m - a.totalIncome12m;
    if (sortBy === 'ontime') return b.onTimeRate - a.onTimeRate;
    return b.currentRent - a.currentRent;
  });

  const summary = data?.summary;
  const alertCount = summary?.propertiesWithAlerts ?? 0;

  function fmtAmt(amount: number, currency: string) {
    return `${currency === 'ARS' ? '$' : 'USD'} ${Math.round(amount).toLocaleString('es-AR')}`;
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Análisis de rentabilidad por propiedad. Identifica las más rentables y recibe recomendaciones para optimizar tus ingresos.
        </p>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="stat-card green">
          <div className="stat-label">Ingresos (12 meses)</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--accent)' }}>
            {isPending ? '…' : `USD ${Math.round(summary?.totalIncome12m ?? 0).toLocaleString('es-AR')}`}
          </div>
          <div className="stat-sub">cobrados en el último año</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Tasa de cobro promedio</div>
          <div className="stat-value" style={{ fontSize: 20 }}>
            {isPending ? '…' : `${Math.round((summary?.avgOnTimeRate ?? 0) * 100)}%`}
          </div>
          <div className="stat-sub">pagos en fecha</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Mejor propiedad</div>
          <div className="stat-value" style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {isPending ? '…' : (summary?.topPropertyName ?? '—')}
          </div>
          <div className="stat-sub">mayor ingreso en 12 meses</div>
        </div>
        <div className={`stat-card ${alertCount > 0 ? 'red' : 'green'}`}>
          <div className="stat-label">Alertas activas</div>
          <div className="stat-value" style={{ fontSize: 20, color: alertCount > 0 ? 'var(--danger)' : 'var(--accent)' }}>
            {isPending ? '…' : alertCount}
          </div>
          <div className="stat-sub">propiedades con riesgo</div>
        </div>
      </div>

      {/* Sort controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginRight: 4 }}>Ordenar por:</span>
        {(['income', 'ontime', 'rent'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`btn btn-sm ${sortBy === s ? 'btn-primary' : 'btn-secondary'}`}
          >
            {s === 'income' ? 'Ingresos (12m)' : s === 'ontime' ? 'Puntualidad' : 'Alquiler actual'}
          </button>
        ))}
      </div>

      {/* Property cards */}
      {isPending ? (
        <div className="empty-state">
          <div className="empty-text">Cargando análisis…</div>
        </div>
      ) : properties.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="chart" size={32} /></div>
          <div className="empty-text">No hay propiedades para analizar</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {properties.map((p, idx) => {
            const rec = REC_CONFIG[p.recommendation];
            return (
              <div key={p.propertyId} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

                  {/* Rank badge */}
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: idx === 0 ? '#fef9c3' : 'var(--bg-elevated)', color: idx === 0 ? '#a16207' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0, marginTop: 2 }}>
                    #{idx + 1}
                  </div>

                  {/* Main info */}
                  <div style={{ flex: '2 1 200px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.propertyName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      {p.tenantName ? `Inquilino: ${p.tenantName}` : 'Sin inquilino'}
                      {p.contractMonths > 0 && ` · ${p.contractMonths} meses de contrato`}
                    </div>
                    <OnTimeBar rate={p.onTimeRate} />
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', flex: '1 1 320px' }}>
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Alquiler actual</div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14 }}>
                        {p.currentRent > 0 ? fmtAmt(p.currentRent, p.currency) : '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Ingresos 12m</div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>
                        {p.totalIncome12m > 0 ? fmtAmt(p.totalIncome12m, p.currency) : '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 60 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Mora actual</div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: p.lateUnpaidCount > 0 ? 'var(--danger)' : 'var(--text)' }}>
                        {p.lateUnpaidCount}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 60 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Reclamos (12m)</div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: p.claimsLast12m > 2 ? 'var(--danger)' : 'var(--text)' }}>
                        {p.claimsLast12m}
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, minWidth: 160 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, background: rec.bg, color: rec.color, fontSize: 12, fontWeight: 700 }}>
                      <span>{rec.icon}</span>
                      {rec.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'right', lineHeight: 1.4, maxWidth: 200 }}>
                      {p.recommendationDetail}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
