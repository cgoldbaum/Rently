'use client';

import { useTranslation } from 'react-i18next';
import Modal from '@/components/Modal';

interface ConfirmDeletePropertyProps {
  show: boolean;
  propertyName: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteProperty({ show, propertyName, deleting, onClose, onConfirm }: ConfirmDeletePropertyProps) {
  const { t } = useTranslation('properties');
  if (!show) return null;

  return (
    <Modal title={t('delete.title')} onClose={onClose} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('delete.cancel')}</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
          {deleting ? t('delete.deleting') : t('delete.delete')}
        </button>
      </>
    }>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
        {t('delete.confirm', { name: propertyName })}
      </div>
    </Modal>
  );
}
