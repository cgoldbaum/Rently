'use client';

import { useTranslation } from 'react-i18next';
import Modal from '@/components/Modal';

interface PaymentModalProps {
  show: boolean;
  form: { amount: string; period: string; dueDate: string; method: string; currency: 'ARS' | 'USD' };
  errors: Record<string, string>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.SyntheticEvent) => void;
  onFieldChange: (field: string, value: string) => void;
}

export default function PaymentModal({ show, form, errors, saving, onClose, onSubmit, onFieldChange }: PaymentModalProps) {
  const { t } = useTranslation('payments');
  if (!show) return null;

  return (
    <Modal title={t('actions.registerPayment')} onClose={onClose} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.cancel')}</button>
        <button className="btn btn-primary" onClick={onSubmit} disabled={saving}>
          {saving ? t('actions.saving') : t('actions.save')}
        </button>
      </>
    }>
      <form onSubmit={onSubmit}>
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor="p-period">{t('table.period')} (ej: 2026-04)</label>
            <input id="p-period" className="input" placeholder="2026-04" value={form.period} onChange={e => onFieldChange('period', e.target.value)} aria-invalid={errors.period ? true : undefined} aria-describedby={errors.period ? 'p-period-error' : undefined} style={{ borderColor: errors.period ? 'var(--danger)' : undefined }} />
            {errors.period && <span id="p-period-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.period}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="p-amount">{t('table.amount')}</label>
            <input id="p-amount" className="input" type="number" placeholder="400" value={form.amount} onChange={e => onFieldChange('amount', e.target.value)} aria-invalid={errors.amount ? true : undefined} aria-describedby={errors.amount ? 'p-amount-error' : undefined} style={{ borderColor: errors.amount ? 'var(--danger)' : undefined }} />
            {errors.amount && <span id="p-amount-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.amount}</span>}
          </div>
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor="p-currency">Moneda</label>
            <select id="p-currency" className="rently-select" value={form.currency} onChange={e => onFieldChange('currency', e.target.value)}>
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="p-dueDate">{t('table.dueDate')}</label>
            <input id="p-dueDate" className="input" type="date" lang="es-AR" value={form.dueDate} onChange={e => onFieldChange('dueDate', e.target.value)} aria-invalid={errors.dueDate ? true : undefined} aria-describedby={errors.dueDate ? 'p-dueDate-error' : undefined} style={{ borderColor: errors.dueDate ? 'var(--danger)' : undefined }} />
            {errors.dueDate && <span id="p-dueDate-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.dueDate}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="p-method">{t('table.method')}</label>
            <input id="p-method" className="input" placeholder={t('domain:paymentMethod.TRANSFER')} value={form.method} onChange={e => onFieldChange('method', e.target.value)} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
