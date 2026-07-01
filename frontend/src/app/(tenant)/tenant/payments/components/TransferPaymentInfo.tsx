'use client';

import { useTranslation } from 'react-i18next';
import { formatMoney } from '@rently/shared';

type Payment = {
  id: string;
  period: string;
  amount: number;
  currency?: 'ARS' | 'USD';
  dueDate: string;
  paidDate?: string;
  status: string;
  method?: string;
  cashNote?: string;
};

type OwnerPaymentInfo = {
  alias: string;
  cbu: string;
  email: string;
  whatsapp: string;
  ownerName: string;
};

type TransferPaymentInfoProps = {
  payment: Payment;
  ownerInfo: OwnerPaymentInfo;
  note: string;
  onNoteChange: (note: string) => void;
  onCopy: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isPending: boolean;
  isError: boolean;
  error?: unknown;
};

export default function TransferPaymentInfo({
  payment,
  ownerInfo,
  note,
  onNoteChange,
  onCopy,
  onSubmit,
  onClose,
  isPending,
  isError,
  error,
}: TransferPaymentInfoProps) {
  const { t } = useTranslation('payments');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius)', maxWidth: 440, width: '100%', padding: 28, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{t('transfer.title')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>
          {payment.period} · {formatMoney(payment.amount, payment.currency ?? 'ARS')}
        </div>
        <form onSubmit={onSubmit}>
          {[
            [t('transfer.alias'), ownerInfo.alias],
            [t('transfer.cbu'), ownerInfo.cbu],
            [t('transfer.owner'), ownerInfo.ownerName],
          ].map(([label, value]) => (
            <div key={label as string} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label as string}</div>
                <div style={{ fontSize: 14, fontWeight: 700, wordBreak: 'break-all' }}>{value || 'No configurado'}</div>
              </div>
              {value && (
                <button type="button" onClick={() => onCopy(value)} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {t('transfer.copy')}
                </button>
              )}
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>{t('transfer.note')}</label>
            <textarea
              placeholder={t('transfer.notePlaceholder')}
              value={note}
              onChange={e => onNoteChange(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font)', resize: 'vertical' }}
            />
          </div>
          {isError && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginTop: 10 }}>
              {(error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? t('transfer.toastError')}
            </div>
          )}
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button
              type="submit"
              disabled={isPending}
              style={{ flex: 1, padding: 10, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              {isPending ? t('transfer.submitting') : t('transfer.submit')}
            </button>
            <a
              href={`mailto:${ownerInfo.email}?subject=Comprobante de pago ${encodeURIComponent(payment.period)}&body=Hola, adjunto/envio el comprobante del pago de ${encodeURIComponent(payment.period)} por ${encodeURIComponent(formatMoney(payment.amount, payment.currency ?? 'ARS'))}.`}
              style={{ flex: 1, textAlign: 'center', padding: 10, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
            >
              {t('transfer.email')}
            </a>
            {ownerInfo.whatsapp && (
              <a
                href={`https://wa.me/${ownerInfo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, te envio el comprobante del pago de ${payment.period} por ${formatMoney(payment.amount, payment.currency ?? 'ARS')}.`)}`}
                target="_blank"
                rel="noreferrer"
                style={{ flex: 1, textAlign: 'center', padding: 10, background: '#25d366', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
              >
                {t('transfer.whatsapp')}
              </a>
            )}
          </div>
        </form>
        <button
          type="button"
          onClick={onClose}
          style={{ width: '100%', marginTop: 12, padding: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
        >
          {t('transfer.close')}
        </button>
      </div>
    </div>
  );
}
