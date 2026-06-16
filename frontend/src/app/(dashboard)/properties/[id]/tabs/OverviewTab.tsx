'use client';

import Icon from '@/components/Icon';
import { Property, Claim } from '../types';
import { TYPE_LABELS } from '../constants';

interface OverviewTabProps {
  property: Property;
  claims: Claim[];
  onSetTab: (tab: string) => void;
  onOpenContractModal: () => void;
  onOpenTenantModal: () => void;
  onConfirmDeleteTenant: () => void;
}

export default function OverviewTab({ property, claims, onSetTab, onOpenContractModal, onOpenTenantModal, onConfirmDeleteTenant }: OverviewTabProps) {
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
          <div className="card-title">Inquilino</div>
          {property.contract && !property.contract.tenant && (
            <button className="btn btn-primary btn-sm" onClick={onOpenTenantModal}>
              <Icon name="plus" size={14} /> Vincular
            </button>
          )}
          {property.contract?.tenant && (
            <button className="btn btn-secondary btn-sm" onClick={onConfirmDeleteTenant}>
              <Icon name="trash" size={14} /> Quitar
            </button>
          )}
        </div>
        {property.contract?.tenant ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>
              {property.contract.tenant.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{property.contract.tenant.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{property.contract.tenant.email}</div>
            </div>
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
