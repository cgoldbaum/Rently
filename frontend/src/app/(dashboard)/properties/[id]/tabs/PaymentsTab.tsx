'use client';

import { useTranslation } from 'react-i18next';
import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/Icon';
import { Payment, Property } from '../types';
import { formatMoney, formatDateShort } from '@rently/shared';

interface PaymentsTabProps {
  payments: Payment[];
  property: Property;
  onOpenPaymentModal: () => void;
}

export default function PaymentsTab({ payments, property, onOpenPaymentModal }: PaymentsTabProps) {
  const { t } = useTranslation('payments');
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{t('stats.paidCharges')}</span>
        {property.contract && (
          <button className="btn btn-primary btn-sm" onClick={onOpenPaymentModal}>
            <Icon name="plus" size={14} /> {t('actions.registerPayment')}
          </button>
        )}
      </div>
      {payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="dollar" size={32} /></div>
          <div className="empty-text">{t('empty.noPaymentsRegistered')}</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('table.period')}</th><th>{t('table.amount')}</th><th>{t('table.dueDate')}</th><th>{t('table.method')}</th><th>{t('table.status')}</th></tr></thead>
            <tbody>
              {payments.map(pay => (
                <tr key={pay.id}>
                  <td style={{ fontWeight: 500 }}>{pay.period}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{formatMoney(pay.amount, pay.currency ?? property.contract?.currency ?? 'USD')}</td>
                  <td>{formatDateShort(pay.dueDate)}</td>
                  <td>{pay.method ?? '—'}</td>
                  <td><StatusBadge status={pay.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
