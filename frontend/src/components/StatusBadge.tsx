import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const STATUS_NS: Record<string, string> = {
  OCCUPIED: 'domain:propertyStatus',
  VACANT: 'domain:propertyStatus',
  IN_ARREARS: 'domain:propertyStatus',
  EXPIRING_SOON: 'domain:propertyStatus',
  OPEN: 'domain:claimStatus',
  IN_PROGRESS: 'domain:claimStatus',
  RESOLVED: 'domain:claimStatus',
  PAID: 'domain:paymentStatus',
  PENDING: 'domain:paymentStatus',
  PENDING_CONFIRMATION: 'domain:paymentStatus',
  LATE: 'domain:paymentStatus',
  HIGH: 'domain:claimPriority',
  MEDIUM: 'domain:claimPriority',
  LOW: 'domain:claimPriority',
};

const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const ns = STATUS_NS[status];
  if (!ns) return (
    <span className={`status status-${status}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
  return (
    <span className={`status status-${status}`}>
      <span className="status-dot" />
      {t(`${ns}.${status}`)}
    </span>
  );
});

export default StatusBadge;
