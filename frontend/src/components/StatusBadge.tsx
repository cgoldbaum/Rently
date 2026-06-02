import { memo } from 'react';

const labels: Record<string, string> = {
  OCCUPIED: 'Ocupado',
  VACANT: 'Vacante',
  IN_ARREARS: 'En mora',
  EXPIRING_SOON: 'Próx. vto.',
  OPEN: 'Abierto',
  IN_PROGRESS: 'En curso',
  RESOLVED: 'Resuelto',
  PAID: 'Pagado',
  PENDING: 'Pendiente',
  PENDING_CONFIRMATION: 'Pend. confirmación',
  LATE: 'En mora',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status status-${status}`}>
      <span className="status-dot" />
      {labels[status] ?? status}
    </span>
  );
});

export default StatusBadge;
