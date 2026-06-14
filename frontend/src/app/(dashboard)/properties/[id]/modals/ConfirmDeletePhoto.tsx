'use client';

import Modal from '@/components/Modal';

interface ConfirmDeletePhotoProps {
  pendingPhotoId: string | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeletePhoto({ pendingPhotoId, deleting, onClose, onConfirm }: ConfirmDeletePhotoProps) {
  if (!pendingPhotoId) return null;

  return (
    <Modal title="Eliminar foto" onClose={onClose} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
          {deleting ? 'Eliminando...' : 'Eliminar'}
        </button>
      </>
    }>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
        Esta foto dejará de verse en la galería, quedará guardada como registro en la base de datos y se le avisará al inquilino.
      </div>
    </Modal>
  );
}
