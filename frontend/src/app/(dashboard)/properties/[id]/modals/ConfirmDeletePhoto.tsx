'use client';

import { useTranslation } from 'react-i18next';
import Modal from '@/components/Modal';

interface ConfirmDeletePhotoProps {
  pendingPhotoId: string | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeletePhoto({ pendingPhotoId, deleting, onClose, onConfirm }: ConfirmDeletePhotoProps) {
  const { t } = useTranslation('properties');
  if (!pendingPhotoId) return null;

  return (
    <Modal title={t('deletePhoto.title')} onClose={onClose} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('deletePhoto.cancel')}</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
          {deleting ? t('deletePhoto.deleting') : t('deletePhoto.delete')}
        </button>
      </>
    }>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
        {t('deletePhoto.description')}
      </div>
    </Modal>
  );
}
