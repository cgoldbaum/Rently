'use client';

import Icon from '@/components/Icon';
import { Property, Claim, Tenant } from '../types';
import { TYPE_LABELS } from '../constants';

interface OverviewTabProps {
  property: Property;
  claims: Claim[];
  onSetTab: (tab: string) => void;
  onOpenContractModal: () => void;
  onOpenTenantModal: () => void;
  onDeleteTenant: (tenant: Tenant) => void;
}

export default function OverviewTab({ property, claims, onSetTab, onOpenContractModal, onOpenTenantModal, onDeleteTenant }: OverviewTabProps) {
  const tenants = property.contract?.tenants ?? [];
  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Datos del inmueble</div>
        {[
          ['Tipo', TYPE_LABELS[property.type] ?? property.type],
          ['Superficie', `${property.surface} m²`],
          ['Antigüedad', property.antiquity != null ? `${property.antiquity} años` : '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: 14 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
            <span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
        {property.description && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong>Descripción:</strong> {property.description}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onSetTab('contract')}>
            <Icon name="file" size={14} /> Contrato
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onSetTab('claims')}>
            <Icon name="clipboard" size={14} /> Reclamos ({claims.filter(c => c.status === 'OPEN').length})
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="card-title">{tenants.length > 1 ? 'Inquilinos' : 'Inquilino'}</div>
          {property.contract && (
            <button className="btn btn-primary btn-sm" onClick={onOpenTenantModal}>
              <Icon name="plus" size={14} /> Agregar
            </button>
          )}
        </div>
        {tenants.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tenants.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>
                  {t.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.email}</div>
                </div>
                <button className="btn-icon" onClick={() => onDeleteTenant(t)} aria-label={`Quitar a ${t.name}`}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : !property.contract ? (
          <div className="empty-state">
            <div className="empty-icon"><Icon name="file" size={32} /></div>
            <div className="empty-text">Primero creá un contrato</div>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onOpenContractModal}>
              <Icon name="plus" size={14} /> Crear contrato
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><Icon name="users" size={32} /></div>
            <div className="empty-text">Sin inquilino asignado</div>
          </div>
        )}
      </div>
    </div>
  );
}
