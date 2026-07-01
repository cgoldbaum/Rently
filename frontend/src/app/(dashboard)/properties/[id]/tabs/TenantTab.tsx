'use client';

import { useTranslation } from 'react-i18next';
import Icon from '@/components/Icon';
import { Property, Tenant } from '../types';

interface TenantTabProps {
  property: Property;
  onOpenTenantModal: () => void;
  onDeleteTenant: (tenant: Tenant) => void;
}

export default function TenantTab({ property, onOpenTenantModal, onDeleteTenant }: TenantTabProps) {
  const { t } = useTranslation('properties');
  const tenants = property.contract?.tenants ?? [];

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{t('tenant.title')}</span>
        {property.contract && (
          <button className="btn btn-primary btn-sm" onClick={onOpenTenantModal}>
            <Icon name="plus" size={14} /> {t('tenant.add')}
          </button>
        )}
      </div>

      {!property.contract ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="file" size={32} /></div>
          <div className="empty-text">{t('tenant.noContract')}</div>
        </div>
      ) : tenants.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="users" size={32} /></div>
          <div className="empty-text">{t('tenant.noTenants')}</div>
        </div>
      ) : (
        tenants.map((tenant) => (
          <div
            key={tenant.id}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{tenant.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tenant.email}</div>
              {tenant.phone && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tenant.phone}</div>}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onDeleteTenant(tenant)} aria-label={t('tenant.removeAria', { name: tenant.name })}>
              <Icon name="trash" size={14} /> {t('tenant.remove')}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
