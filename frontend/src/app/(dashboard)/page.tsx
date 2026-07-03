'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/Icon';
import MonthlySummaryCard from '@/components/MonthlySummaryCard';
import { formatMoney, propertyTypeLabel } from '@rently/shared';

interface DashboardStats {
  totalProperties: number;
  occupiedProperties: number;
  vacantProperties: number;
  expiringProperties: number;
  openClaims: number;
  rentTotals?: {
    ars: number;
    usd: number;
    arsEstimatedFromUsd: number;
    usdArsRate: number;
  };
}

interface Property {
  id: string;
  name?: string;
  address: string;
  type: string;
  surface: number;
  status: string;
  openClaims: number;
  contract?: { currentAmount: number; currency?: 'ARS' | 'USD'; tenants?: { name: string }[] };
}

export default function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const { data: stats } = useQuery<DashboardStats | null>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data.data),
  });
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties').then(r => r.data.data),
  });
  const [viewCurrency, setViewCurrency] = useState<'USD' | 'ARS'>('USD');

  const totalArs = useMemo(() => properties.reduce((s, p) => s + (p.contract?.currency === 'ARS' ? (p.contract.currentAmount ?? 0) : 0), 0), [properties]);
  const totalUsd = useMemo(() => properties.reduce((s, p) => s + (p.contract?.currency === 'USD' || !p.contract?.currency ? (p.contract?.currentAmount ?? 0) : 0), 0), [properties]);

  return (
    <>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card hero">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginTop: -6, marginBottom: 10 }}>
            <div className="stat-label">{t('stats.monthlyIncome')}</div>
            <div style={{ display: 'inline-flex', background: 'color-mix(in srgb, var(--bg) 12%, transparent)', borderRadius: 999, padding: 3, marginTop: -8, marginRight: -6 }}>
              <button
                type="button"
                onClick={() => setViewCurrency('USD')}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: viewCurrency === 'USD' ? 'var(--bg)' : 'transparent',
                  color: viewCurrency === 'USD' ? 'var(--text)' : 'color-mix(in srgb, var(--bg) 80%, transparent)',
                }}
              >
                USD
              </button>
              <button
                type="button"
                onClick={() => setViewCurrency('ARS')}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: viewCurrency === 'ARS' ? 'var(--bg)' : 'transparent',
                  color: viewCurrency === 'ARS' ? 'var(--text)' : 'color-mix(in srgb, var(--bg) 80%, transparent)',
                }}
              >
                ARS
              </button>
            </div>
          </div>
          <div className="stat-value">
            {viewCurrency === 'USD' ? formatMoney(totalUsd, 'USD') : formatMoney(totalArs, 'ARS')}
          </div>
          <div className="stat-sub">
            {viewCurrency === 'USD'
              ? `${formatMoney(totalArs, 'ARS')} + en pesos`
              : `${formatMoney(totalUsd, 'USD')} + en dólares`}
          </div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">{t('stats.properties')}</div>
          <div className="stat-value">
            {stats?.occupiedProperties ?? '—'}
            <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>
              /{stats?.totalProperties ?? '—'}
            </span>
          </div>
          <div className="stat-sub">{t('stats.occupied')}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">{t('stats.vacant')}</div>
          <div className="stat-value" style={{ color: (stats?.vacantProperties ?? 0) > 0 ? 'var(--danger)' : 'inherit' }}>
            {stats?.vacantProperties ?? '—'}
          </div>
          <div className="stat-sub">{(stats?.vacantProperties ?? 0) > 0 ? t('stats.vacantCount') : t('stats.allOccupied')}</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">{t('stats.claims')}</div>
          <div className="stat-value" style={{ color: (stats?.openClaims ?? 0) > 0 ? 'var(--warning)' : 'inherit' }}>{stats?.openClaims ?? '—'}</div>
          <div className="stat-sub">{(stats?.openClaims ?? 0) > 0 ? t('stats.claimsAttention') : t('stats.noClaims')}</div>
        </div>
      </div>

      {/* Resumen inteligente (IA) */}
      <MonthlySummaryCard />

      {/* Resumen */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div className="section-label" style={{ marginBottom: 16 }}>{t('summary.title')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { text: t('summary.occupiedProperties'), sub: t('summary.occupiedCount', { count: stats?.occupiedProperties ?? 0, total: stats?.totalProperties ?? 0 }), color: 'var(--accent)' },
            { text: t('summary.expiringContracts'), sub: t('summary.expiringCount', { count: stats?.expiringProperties ?? 0 }), color: 'var(--purple)' },
            { text: t('summary.openClaims'), sub: t('summary.openClaimsCount', { count: stats?.openClaims ?? 0 }), color: 'var(--warning)' },
            { text: t('summary.vacantProperties'), sub: t('summary.vacantCount', { count: stats?.vacantProperties ?? 0 }), color: 'var(--info)' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, marginTop: 5, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{item.text}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick view properties */}
      <div className="section-heading-row">
        <div>
          <div className="section-label">{t('quickView.myProperties')}</div>
          <div className="section-heading">{t('quickView.title')}</div>
        </div>
        <Link href="/properties" className="section-link">{t('quickView.viewAll')}</Link>
      </div>

      {properties.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="building" size={32} /></div>
            <div className="empty-text">{t('quickView.noProperties')}</div>
            <Link href="/properties" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
              <Icon name="plus" size={16} /> {t('quickView.addProperty')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="properties-grid">
          {properties.slice(0, 3).map(p => (
            <Link key={p.id} href={`/properties/${p.id}`} className="property-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div className="property-name">{p.name ?? p.address}</div>
                  {p.name && <div className="property-address">{p.address}</div>}
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 20, color: 'var(--text)' }}>
                  {p.contract?.currentAmount
                    ? `${formatMoney(p.contract.currentAmount, p.contract.currency ?? 'USD')}`
                    : '—'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {p.contract?.tenants?.map(t => t.name).join(', ') || t('quickView.noTenant')}
                </span>
              </div>
              <div className="property-details">
                <span className="property-detail"><Icon name="building" size={14} />{propertyTypeLabel(p.type)}</span>
                {p.type !== 'GARAGE' && <span className="property-detail">{p.surface} m²</span>}
                {p.openClaims > 0 && (
                  <span className="property-detail" style={{ color: 'var(--warning)' }}>
                    <Icon name="clipboard" size={14} /> {p.openClaims} reclamo{p.openClaims !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
