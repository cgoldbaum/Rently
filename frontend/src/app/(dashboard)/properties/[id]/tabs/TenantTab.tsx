'use client';

import Icon from '@/components/Icon';
import { Property } from '../types';

interface TenantTabProps {
  property: Property;
  onOpenTenantModal: () => void;
  onConfirmDeleteTenant: () => void;
}

export default function TenantTab({ property, onOpenTenantModal, onConfirmDeleteTenant }: TenantTabProps) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Inquilino</span>
        {property.contract && !property.contract.tenant && (
          <button className="btn btn-primary btn-sm" onClick={onOpenTenantModal}>
            <Icon name="plus" size={14} /> Vincular inquilino
          </button>
        )}
        {property.contract?.tenant && (
          <button className="btn btn-secondary btn-sm" onClick={onConfirmDeleteTenant}>
            <Icon name="trash" size={14} /> Quitar
          </button>
        )}
      </div>
      {property.contract?.tenant ? (
        [
          ['Nombre', property.contract.tenant.name],
          ['Email', property.contract.tenant.email],
          ['Teléfono', property.contract.tenant.phone ?? '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)', fontSize: 14 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
            <span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))
      ) : !property.contract ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="file" size={32} /></div>
          <div className="empty-text">Primero creá un contrato</div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="users" size={32} /></div>
          <div className="empty-text">Sin inquilino asignado</div>
        </div>
      )}
    </div>
  );
}
