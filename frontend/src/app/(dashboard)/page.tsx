'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/Icon';

interface DashboardStats {
  totalProperties: number;
  occupiedProperties: number;
  vacantProperties: number;
  expiringProperties: number;
  openClaims: number;
}

interface Property {
  id: string;
  name?: string;
  address: string;
  type: string;
  surface: number;
  status: string;
  openClaims: number;
  contract?: { currentAmount: number; tenant?: { name: string } };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    api.get('/dashboard').then(r => setStats(r.data.data)).catch(() => {});
    api.get('/properties').then(r => setProperties(r.data.data)).catch(() => {});
  }, []);

  const totalRent = properties.reduce((s, p) => s + (p.contract?.currentAmount ?? 0), 0);

  return (
    <>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card hero">
          <div className="stat-label">Ingreso mensual estimado</div>
          <div className="stat-value">USD {totalRent.toLocaleString('es-AR')}</div>
          <div className="stat-sub">↑ de propiedades activas</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Propiedades</div>
          <div className="stat-value">
            {stats?.occupiedProperties ?? '—'}
            <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>
              /{stats?.totalProperties ?? '—'}
            </span>
          </div>
          <div className="stat-sub">ocupadas ahora</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Vacantes</div>
          <div className="stat-value" style={{ color: (stats?.vacantProperties ?? 0) > 0 ? 'var(--danger)' : 'inherit' }}>
            {stats?.vacantProperties ?? '—'}
          </div>
          <div className="stat-sub">{(stats?.vacantProperties ?? 0) > 0 ? 'sin inquilino' : 'todo ocupado ✓'}</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Reclamos</div>
          <div className="stat-value">{stats?.openClaims ?? '—'}</div>
          <div className="stat-sub">abiertos</div>
        </div>
      </div>

      {/* Resumen */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div className="section-label" style={{ marginBottom: 16 }}>Resumen</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { text: 'Propiedades ocupadas', sub: `${stats?.occupiedProperties ?? 0} de ${stats?.totalProperties ?? 0}`, color: 'var(--accent)' },
            { text: 'Contratos por vencer', sub: `${stats?.expiringProperties ?? 0} en los próximos 30 días`, color: 'var(--purple)' },
            { text: 'Reclamos abiertos', sub: `${stats?.openClaims ?? 0} requieren atención`, color: 'var(--warning)' },
            { text: 'Propiedades vacantes', sub: `${stats?.vacantProperties ?? 0} sin inquilino`, color: 'var(--info)' },
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
          <div className="section-label">Mis propiedades</div>
          <div className="section-heading">Vista rápida</div>
        </div>
        <Link href="/properties" className="section-link">Ver todas →</Link>
      </div>

      {properties.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="building" size={32} /></div>
            <div className="empty-text">No tenés propiedades aún</div>
            <Link href="/properties" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
              <Icon name="plus" size={16} /> Agregar propiedad
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
                  {p.contract?.currentAmount ? `USD ${p.contract.currentAmount.toLocaleString('es-AR')}` : '—'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {p.contract?.tenant?.name ?? 'Sin inquilino'}
                </span>
              </div>
              <div className="property-details">
                <span className="property-detail"><Icon name="building" size={14} />{p.type}</span>
                <span className="property-detail">{p.surface} m²</span>
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
