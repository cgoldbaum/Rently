'use client';

import { formatMoney } from '@rently/shared';
import { useTranslation } from 'react-i18next';

type UpcomingPayment = {
  id: string;
  month: string;
  dueDate: string;
  amount: number;
  status: string;
  method?: string;
  hasAdjustment: boolean;
  adjustmentPct: number | null;
};

type OwnerPaymentInfo = {
  alias: string;
  cbu: string;
  email: string;
  whatsapp: string;
  ownerName: string;
};

type PaymentActionsProps = {
  isOpen: boolean;
  payModal: 'methods' | 'transfer' | 'cash' | null;
  nextPayment: UpcomingPayment;
  ownerInfo?: OwnerPaymentInfo | null;
  cashNote: string;
  onCashNoteChange: (note: string) => void;
  onClose: () => void;
  onSelectMethod: (method: 'methods' | 'transfer' | 'cash') => void;
  onMpPay: () => void;
  mpIsPending: boolean;
  onCashSubmit: (e: React.FormEvent) => void;
  cashIsPending: boolean;
  onCopy: (value: string) => void;
};

export default function PaymentActions({
  isOpen,
  payModal,
  nextPayment,
  ownerInfo,
  cashNote,
  onCashNoteChange,
  onClose,
  onSelectMethod,
  onMpPay,
  mpIsPending,
  onCashSubmit,
  cashIsPending,
  onCopy,
}: PaymentActionsProps) {
  const { t } = useTranslation('payments');
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 460, background: 'var(--bg-card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{t('payActions.title')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, textTransform: 'capitalize' }}>
              {nextPayment.month} · {formatMoney(nextPayment.amount)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common:close')}
            style={{ border: 0, background: 'transparent', fontSize: 22, lineHeight: 1, cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {payModal === 'methods' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={onMpPay}
              disabled={mpIsPending}
              style={{ textAlign: 'left', padding: 14, border: '1px solid var(--info)', background: 'var(--info-bg)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              <div style={{ fontWeight: 800, color: 'var(--info)' }}>{mpIsPending ? t('payActions.openingMp') : 'Mercado Pago'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{t('payActions.mpDesc')}</div>
            </button>
            <button
              type="button"
              onClick={() => onSelectMethod('transfer')}
              style={{ textAlign: 'left', padding: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              <div style={{ fontWeight: 800 }}>{t('payActions.transfer')}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{t('payActions.transferDesc')}</div>
            </button>
            <button
              type="button"
              onClick={() => onSelectMethod('cash')}
              style={{ textAlign: 'left', padding: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              <div style={{ fontWeight: 800 }}>{t('payActions.cash')}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{t('payActions.cashDesc')}</div>
            </button>
          </div>
        )}

        {payModal === 'transfer' && ownerInfo && (
          <div>
            {[
              [t('payActions.alias'), ownerInfo.alias],
              [t('payActions.cbu'), ownerInfo.cbu],
              [t('payActions.owner'), ownerInfo.ownerName],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, wordBreak: 'break-all' }}>{value || t('payActions.notConfigured')}</div>
                </div>
                {value && (
                  <button type="button" onClick={() => onCopy(value)} style={{ alignSelf: 'center', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {t('payActions.copy')}
                  </button>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <a
                href={`mailto:${ownerInfo.email}?subject=${encodeURIComponent(t('payActions.emailSubject', { period: nextPayment.month }))}&body=${encodeURIComponent(t('payActions.emailBody', { period: nextPayment.month, amount: formatMoney(nextPayment.amount) }))}`}
                style={{ flex: 1, textAlign: 'center', padding: 10, background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}
              >
                {t('payActions.mail')}
              </a>
              {ownerInfo.whatsapp && (
                <a
                  href={`https://wa.me/${ownerInfo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(t('payActions.emailBody', { period: nextPayment.month, amount: formatMoney(nextPayment.amount) }))}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ flex: 1, textAlign: 'center', padding: 10, background: '#25d366', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}
                >
                  WhatsApp
                </a>
              )}
            </div>
            <button type="button" onClick={() => onSelectMethod('methods')} style={{ width: '100%', marginTop: 12, padding: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer' }}>
              {t('payActions.back')}
            </button>
          </div>
        )}

        {payModal === 'cash' && (
          <form onSubmit={onCashSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {t('payActions.cashCoordinate')}
            </div>
            <textarea
              value={cashNote}
              onChange={e => onCashNoteChange(e.target.value)}
              rows={3}
              placeholder={t('payActions.notePlaceholder')}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font)', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => onSelectMethod('methods')} style={{ flex: 1, padding: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer' }}>
                {t('payActions.back')}
              </button>
              <button type="submit" disabled={cashIsPending} style={{ flex: 1, padding: 10, border: 0, background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 800, cursor: 'pointer' }}>
                {cashIsPending ? t('payActions.notifying') : t('payActions.notifyPayment')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
