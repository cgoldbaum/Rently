'use client';

import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatMoney, formatDate } from '@rently/shared';

type ReceiptData = {
  receiptNumber: string;
  issuedAt: string;
  amount: number;
  currency?: 'ARS' | 'USD';
  period: string;
  paidDate?: string;
  method?: string;
  mp?: {
    paymentId: string;
    status: string;
    statusDetail?: string;
    paymentMethodId?: string;
    paymentTypeId?: string;
    transactionAmount?: number;
    currencyId?: string;
    payerEmail?: string;
    dateApproved?: string;
  } | null;
};

type PaymentReceiptModalProps = {
  paymentId: string;
  onClose: () => void;
};

export default function PaymentReceiptModal({ paymentId, onClose }: PaymentReceiptModalProps) {
  const { t } = useTranslation('payments');
  const { data: receipt, isLoading, isError } = useQuery<ReceiptData>({
    queryKey: ['receipt', paymentId],
    queryFn: async () => {
      const res = await api.get(`/tenant/payments/${paymentId}/receipt`);
      return res.data.data;
    },
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, maxWidth: 430, width: '100%', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,.25)', border: '1px solid #e8e4dc' }}>
        <div style={{ background: '#5f835f', padding: '18px 22px 16px', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 34, marginBottom: 4 }}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0 }}>{t('receipt.title')}</div>
        </div>
        <div style={{ padding: '18px 20px', background: '#f9f7f3' }}>
          {isLoading && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{t('receipt.loading')}</p>}
          {isError && <p style={{ textAlign: 'center', color: 'var(--danger)' }}>{t('receipt.noReceipt')}</p>}
          {receipt && [
            [t('receipt.operationId'), receipt.mp?.paymentId ?? receipt.receiptNumber.slice(0, 8).toUpperCase()],
            [t('receipt.period'), receipt.period],
            [t('receipt.amount'), formatMoney(receipt.amount, receipt.currency ?? 'ARS')],
            [t('receipt.method'), receipt.method ?? 'Efectivo'],
            [t('receipt.paymentDate'), receipt.paidDate ? formatDate(receipt.paidDate) : '—'],
            ...(receipt.mp?.status !== 'approved' ? [[t('receipt.mpStatus'), receipt.mp?.status ?? '—']] : []),
            ...(receipt.mp?.statusDetail && receipt.mp.statusDetail !== 'accredited' ? [[t('receipt.mpDetail'), receipt.mp.statusDetail]] : []),
            ...(receipt.mp?.payerEmail ? [[t('receipt.paidBy'), receipt.mp.payerEmail]] : []),
            ...(receipt.mp?.dateApproved ? [[t('receipt.accreditationDate'), formatDate(receipt.mp.dateApproved)]] : []),
          ].map(([k, v]) => (
            <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px solid #e5e0d8', fontSize: 14 }}>
              <span style={{ color: '#7b7468', fontWeight: 600 }}>{k as string}</span>
              <span style={{ fontWeight: 700, color: '#2f2b26', textAlign: 'right' }}>{v as string}</span>
            </div>
          ))}
          <button
            onClick={onClose}
            style={{ width: '100%', marginTop: 16, padding: 12, background: '#e5ded3', border: '1px solid #d8d0c4', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', color: '#2f2b26' }}
          >
            {t('actions.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
