'use client';

import Modal from '@/components/Modal';
import Icon from '@/components/Icon';

interface PhotoDetailModalProps {
  pendingDelete: { propertyId: string; photoId: string } | null;
  isPending: boolean;
  onConfirm: (data: { propertyId: string; photoId: string }) => void;
  onClose: () => void;
}

export default function PhotoDetailModal({ pendingDelete, isPending, onConfirm, onClose }: PhotoDetailModalProps) {
  if (!pendingDelete) return null;

  return (
    <Modal
      title="Eliminar foto"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={() => onConfirm(pendingDelete)}
            disabled={isPending}
          >
            {isPending ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Icon name="alert" size={24} color="var(--danger)" />
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>¿Eliminar esta foto del registro?</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            La foto dejará de verse en la galería, quedará guardada como registro en la base de datos y se le avisará al inquilino.
          </div>
        </div>
      </div>
    </Modal>
  );
}
