'use client';

import { useTranslation } from 'react-i18next';

type MercadoPagoPaymentProps = {
  paymentId: string;
  isLoading: boolean;
  onPay: (paymentId: string) => void;
};

export default function MercadoPagoPayment({ paymentId, isLoading, onPay }: MercadoPagoPaymentProps) {
  const { t } = useTranslation('payments');
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onPay(paymentId); }}
      disabled={isLoading}
      style={{ padding: '6px 10px', border: 0, borderRadius: 6, background: '#009ee3', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
    >
      {t('mp.title')}
    </button>
  );
}
