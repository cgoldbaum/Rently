'use client';

import { formatMoney } from '@rently/shared';

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
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Pagar alquiler</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, textTransform: 'capitalize' }}>
              {nextPayment.month} · {formatMoney(nextPayment.amount)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
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
              style={{ textAlign: 'left', padding: 14, border: '1px solid #bae6fd', background: '#f0f9ff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              <div style={{ fontWeight: 800, color: '#0369a1' }}>{mpIsPending ? 'Abriendo Mercado Pago...' : 'Mercado Pago'}</div>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Pago online de prueba. Se acredita automáticamente.</div>
            </button>
            <button
              type="button"
              onClick={() => onSelectMethod('transfer')}
              style={{ textAlign: 'left', padding: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              <div style={{ fontWeight: 800 }}>Transferencia</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Copiá alias/CBU y enviá el comprobante al propietario.</div>
            </button>
            <button
              type="button"
              onClick={() => onSelectMethod('cash')}
              style={{ textAlign: 'left', padding: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              <div style={{ fontWeight: 800 }}>Efectivo</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Coordiná con el propietario. Él lo marcará como pagado cuando lo reciba.</div>
            </button>
          </div>
        )}

        {payModal === 'transfer' && ownerInfo && (
          <div>
            {[
              ['Alias', ownerInfo.alias],
              ['CBU/CVU', ownerInfo.cbu],
              ['Titular', ownerInfo.ownerName],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, wordBreak: 'break-all' }}>{value || 'No configurado'}</div>
                </div>
                {value && (
                  <button type="button" onClick={() => onCopy(value)} style={{ alignSelf: 'center', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Copiar
                  </button>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <a
                href={`mailto:${ownerInfo.email}?subject=Comprobante de pago ${encodeURIComponent(nextPayment.month)}&body=Hola, te envio el comprobante del pago de ${encodeURIComponent(nextPayment.month)} por ${encodeURIComponent(formatMoney(nextPayment.amount))}.`}
                style={{ flex: 1, textAlign: 'center', padding: 10, background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}
              >
                Mail
              </a>
              {ownerInfo.whatsapp && (
                <a
                  href={`https://wa.me/${ownerInfo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, te envio el comprobante del pago de ${nextPayment.month} por ${formatMoney(nextPayment.amount)}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ flex: 1, textAlign: 'center', padding: 10, background: '#25d366', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}
                >
                  WhatsApp
                </a>
              )}
            </div>
            <button type="button" onClick={() => onSelectMethod('methods')} style={{ width: '100%', marginTop: 12, padding: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer' }}>
              Volver
            </button>
          </div>
        )}

        {payModal === 'cash' && (
          <form onSubmit={onCashSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Coordiná el pago con el propietario. Al avisar pago, el propietario recibe la notificación y lo confirma cuando tenga el dinero.
            </div>
            <textarea
              value={cashNote}
              onChange={e => onCashNoteChange(e.target.value)}
              rows={3}
              placeholder="Nota opcional"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font)', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => onSelectMethod('methods')} style={{ flex: 1, padding: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer' }}>
                Volver
              </button>
              <button type="submit" disabled={cashIsPending} style={{ flex: 1, padding: 10, border: 0, background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 800, cursor: 'pointer' }}>
                {cashIsPending ? 'Avisando...' : 'Avisar pago'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
