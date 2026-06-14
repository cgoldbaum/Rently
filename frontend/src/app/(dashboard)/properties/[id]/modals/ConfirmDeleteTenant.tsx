'use client';

import Modal from '@/components/Modal';

interface ConfirmDeleteTenantProps {
  show: boolean;
  tenantName: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteTenant({ show, tenantName, deleting, onClose, onConfirm }: ConfirmDeleteTenantProps) {
  if (!show || !tenantName) return null;

  return (
    <Modal title="Quitar inquilino" onClose={onClose} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
          {deleting ? 'Quitando...' : 'Quitar'}
        </button>
      </>
    }>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
        Se va a quitar a {tenantName} de este inmueble. El contrato y los cobros quedan en la propiedad.
      </div>
    </Modal>
  );
}
