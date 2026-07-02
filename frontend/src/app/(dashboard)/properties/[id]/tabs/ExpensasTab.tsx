'use client';

import { useTranslation } from 'react-i18next';
import Icon from '@/components/Icon';
import { Property } from '../types';
import { formatDateShort } from '@rently/shared';

interface ExpensasTabProps {
  property: Property;
  expenseReceipts: { id: string; period: string; fileUrl: string; fileName: string | null; uploadedAt: string }[];
  apiBase: string;
}

export default function ExpensasTab({ property, expenseReceipts, apiBase }: ExpensasTabProps) {
  const { t } = useTranslation('payments');
  const receiptByPeriod = new Map(expenseReceipts.map(r => [r.period, r]));
  // Períodos desde el inicio del contrato hasta el mes actual (sin contrato: últimos 18 meses)
  const months: string[] = [];
  const now = new Date();
  const contractStart = property.contract?.startDate ? new Date(property.contract.startDate) : null;
  const firstMonth = contractStart
    ? new Date(contractStart.getFullYear(), contractStart.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth() - 17, 1);
  for (let d = new Date(now.getFullYear(), now.getMonth(), 1); d >= firstMonth; d.setMonth(d.getMonth() - 1)) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const uploaded = expenseReceipts.length;
  const pending = months.filter(m => !receiptByPeriod.has(m)).length;

  function periodLabel(period: string) {
    const [y, m] = period.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{t('stats.invoicesUploaded')}</div>
          <div style={{ fontWeight: 700, fontSize: 24, color: 'var(--accent)' }}>{uploaded}</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{t('stats.pendingTitle')}</div>
          <div style={{ fontWeight: 700, fontSize: 24, color: pending > 0 ? 'var(--warning)' : 'var(--accent)' }}>{pending}</div>
        </div>
      </div>

      {!property.contract?.tenants?.length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="users" size={32} /></div>
            <div className="empty-text">Sin inquilino asignado</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Las expensas aparecen cuando hay un inquilino vinculado.</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {months.map((period, i) => {
            const receipt = receiptByPeriod.get(period);
            return (
              <div key={period} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: i < months.length - 1 ? '1px solid var(--border-light)' : 'none', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{periodLabel(period)}</div>
                  {receipt && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {receipt.fileName ?? t('expensas.uploaded')} · {formatDateShort(receipt.uploadedAt)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {receipt ? (
                    <>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '2px 8px', borderRadius: 6 }}>{t('expensas.uploaded')}</span>
                      <a
                        href={`${apiBase.replace(/\/$/, '')}${receipt.fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ textDecoration: 'none' }}
                      >
                        {t('expensas.view')}
                      </a>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('expensas.pending')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
