'use client';

import Icon from '@/components/Icon';
import { Property, Tenant } from '../types';

interface TenantTabProps {
  property: Property;
  onOpenTenantModal: () => void;
  onDeleteTenant: (tenant: Tenant) => void;
}

export default function TenantTab({ property, onOpenTenantModal, onDeleteTenant }: TenantTabProps) {
  const tenants = property.contract?.tenants ?? [];

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Inquilinos</span>
        {property.contract && (
          <button className="btn btn-primary btn-sm" onClick={onOpenTenantModal}>
            <Icon name="plus" size={14} /> Agregar inquilino
          </button>
        )}
      </div>

      {!property.contract ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="file" size={32} /></div>
          <div className="empty-text">Primero creá un contrato</div>
        </div>
      ) : tenants.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="users" size={32} /></div>
          <div className="empty-text">Sin inquilinos asignados</div>
        </div>
      ) : (
        tenants.map((t) => (
          <div
            key={t.id}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.email}</div>
              {t.phone && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.phone}</div>}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onDeleteTenant(t)} aria-label={`Quitar a ${t.name}`}>
              <Icon name="trash" size={14} /> Quitar
            </button>
          </div>
        ))
      )}
    </div>
  );
}
