'use client';

import { useTranslation } from 'react-i18next';
import Modal from '@/components/Modal';
import Icon from '@/components/Icon';

interface PhotoDetailModalProps {
  pendingDelete: { propertyId: string; photoId: string } | null;
  isPending: boolean;
  onConfirm: (data: { propertyId: string; photoId: string }) => void;
  onClose: () => void;
}

export default function PhotoDetailModal({ pendingDelete, isPending, onConfirm, onClose }: PhotoDetailModalProps) {
  const { t } = useTranslation('photos');
  if (!pendingDelete) return null;

  return (
    <Modal
      title={t('detail.title')}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            {t('detail.cancel')}
          </button>
          <button
            className="btn btn-primary"
            style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={() => onConfirm(pendingDelete)}
            disabled={isPending}
          >
            {isPending ? t('detail.deleting') : t('detail.delete')}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="alert" size={24} color="var(--danger)" />
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{t('detail.confirm')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {t('detail.description')}
          </div>
        </div>
      </div>
    </Modal>
  );
}
