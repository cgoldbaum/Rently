'use client';

import { useTranslation } from 'react-i18next';
import Modal from '@/components/Modal';

interface ConfirmDeleteTenantProps {
  show: boolean;
  tenantName: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteTenant({ show, tenantName, deleting, onClose, onConfirm }: ConfirmDeleteTenantProps) {
  const { t } = useTranslation('properties');
  if (!show || !tenantName) return null;

  return (
    <Modal title={t('tenant.remove')} onClose={onClose} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('common:cancel')}</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
          {deleting ? t('common:saving') : t('tenant.remove')}
        </button>
      </>
    }>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
        Se va a quitar a {tenantName} de este inmueble. El contrato y los cobros quedan en la propiedad.
      </div>
    </Modal>
  );
}
