'use client';

import { useTranslation } from 'react-i18next';
import Icon from '@/components/Icon';
import { Property } from '../types';
import { formatDateShort } from '@rently/shared';

type ExpenseReceipt = {
  id: string;
  period: string;
  amount?: number | null;
  currency?: 'ARS' | 'USD' | null;
  dueDate?: string | null;
  issuer?: string | null;
  receiptNumber?: string | null;
  notes?: string | null;
  ocrConfidence?: number | null;
  fileUrl: string;
  fileName: string | null;
  uploadedAt: string;
};

interface ExpensasTabProps {
  property: Property;
  expenseReceipts: ExpenseReceipt[];
  apiBase: string;
}

function formatCurrency(amount: number, currency: 'ARS' | 'USD' | null | undefined, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency ?? 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ExpensasTab({ property, expenseReceipts, apiBase }: ExpensasTabProps) {
  const { t, i18n } = useTranslation('payments');
  const locale = i18n.language === 'en' ? 'en-US' : 'es-AR';
  const receiptByPeriod = new Map(expenseReceipts.map(r => [r.period, r]));
  const months: string[] = [];
  const now = new Date();
  const contractStart = property.contract?.startDate ? new Date(property.contract.startDate) : null;
  const firstMonth = contractStart
    ? new Date(contractStart.getFullYear(), contractStart.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth() - 17, 1);
  for (let d = new Date(now.getFullYear(), now.getMonth(), 1); d >= firstMonth; d.setMonth(d.getMonth() - 1)) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const periods = Array.from(new Set([...expenseReceipts.map(r => r.period), ...months])).sort((a, b) => b.localeCompare(a));
  const uploaded = expenseReceipts.length;
  const pending = periods.filter(m => !receiptByPeriod.has(m)).length;

  function periodLabel(period: string) {
    const [y, m] = period.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }

  function receiptDetails(receipt: ExpenseReceipt) {
    return [
      receipt.amount ? formatCurrency(receipt.amount, receipt.currency, locale) : null,
      receipt.dueDate ? t('expensas.dueShort', { date: new Date(receipt.dueDate).toLocaleDateString(locale) }) : null,
      receipt.issuer,
      receipt.receiptNumber ? t('expensas.receiptShort', { number: receipt.receiptNumber }) : null,
    ].filter(Boolean);
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
            <div className="empty-text">{t('expensas.noTenantTitle')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{t('expensas.noTenantDescription')}</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {periods.map((period, i) => {
            const receipt = receiptByPeriod.get(period);
            const details = receipt ? receiptDetails(receipt) : [];
            return (
              <div key={period} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: i < periods.length - 1 ? '1px solid var(--border-light)' : 'none', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{periodLabel(period)}</div>
                  {receipt && (
                    <>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {receipt.fileName ?? t('expensas.uploaded')} - {formatDateShort(receipt.uploadedAt)}
                      </div>
                      {details.length > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {details.join(' - ')}
                        </div>
                      )}
                      {receipt.notes && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {receipt.notes}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {receipt ? (
                    <>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '2px 8px', borderRadius: 6 }}>{t('expensas.uploaded')}</span>
                      <a href={`${apiBase.replace(/\/$/, '')}${receipt.fileUrl}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
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