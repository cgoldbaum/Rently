'use client';

import Modal from '@/components/Modal';

interface ConfirmDeletePropertyProps {
  show: boolean;
  propertyName: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteProperty({ show, propertyName, deleting, onClose, onConfirm }: ConfirmDeletePropertyProps) {
  if (!show) return null;

  return (
    <Modal title="Eliminar inmueble" onClose={onClose} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
          {deleting ? 'Eliminando...' : 'Eliminar'}
        </button>
      </>
    }>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
        Se va a eliminar {propertyName} junto con su contrato, cobros, fotos y reclamos.
      </div>
    </Modal>
  );
}
