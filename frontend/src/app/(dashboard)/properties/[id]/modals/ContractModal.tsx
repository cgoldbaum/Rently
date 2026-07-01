'use client';

import { useTranslation } from 'react-i18next';
import Modal from '@/components/Modal';
import Icon from '@/components/Icon';
import { Property } from '../types';
import { INDEX_BY_COUNTRY } from '../constants';

interface ContractModalProps {
  show: boolean;
  property: Property;
  form: { startDate: string; endDate: string; initialAmount: string; paymentDay: string; indexType: string; adjustFrequency: string; currency: 'ARS' | 'USD' };
  errors: Record<string, string>;
  saving: boolean;
  importingContract: boolean;
  importFileRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onSubmit: (e: React.SyntheticEvent) => void;
  onFieldChange: (field: string, value: string) => void;
  onImportContract: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ContractModal({ show, property, form, errors, saving, importingContract, importFileRef, onClose, onSubmit, onFieldChange, onImportContract }: ContractModalProps) {
  const { t } = useTranslation('properties');
  if (!show) return null;

  return (
    <Modal title={property.contract ? t('contract.edit') : t('contract.create')} onClose={onClose} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('common:cancel')}</button>
        <button className="btn btn-primary" onClick={onSubmit} disabled={saving}>
          {saving ? t('common:saving') : t('common:save')}
        </button>
      </>
    }>
      <form onSubmit={onSubmit}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => importFileRef.current?.click()}
            disabled={importingContract || saving}
          >
            <Icon name="file" size={14} />
            {importingContract ? t('contract.importing') : t('contract.importPdf')}
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={onImportContract}
          />
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor="c-startDate">{t('contract.startDate')}</label>
            <input id="c-startDate" className="input" type="date" lang="es-AR" value={form.startDate} onChange={e => onFieldChange('startDate', e.target.value)} aria-invalid={errors.startDate ? true : undefined} aria-describedby={errors.startDate ? 'c-startDate-error' : undefined} style={{ borderColor: errors.startDate ? 'var(--danger)' : undefined }} />
            {errors.startDate && <span id="c-startDate-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.startDate}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="c-endDate">{t('contract.endDate')}</label>
            <input id="c-endDate" className="input" type="date" lang="es-AR" value={form.endDate} onChange={e => onFieldChange('endDate', e.target.value)} aria-invalid={errors.endDate ? true : undefined} aria-describedby={errors.endDate ? 'c-endDate-error' : undefined} style={{ borderColor: errors.endDate ? 'var(--danger)' : undefined }} />
            {errors.endDate && <span id="c-endDate-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.endDate}</span>}
          </div>
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor="c-initialAmount">{t('contract.initialAmount')}</label>
            <input id="c-initialAmount" className="input" type="number" placeholder="400" value={form.initialAmount} onChange={e => onFieldChange('initialAmount', e.target.value)} aria-invalid={errors.initialAmount ? true : undefined} aria-describedby={errors.initialAmount ? 'c-initialAmount-error' : undefined} style={{ borderColor: errors.initialAmount ? 'var(--danger)' : undefined }} />
            {errors.initialAmount && <span id="c-initialAmount-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.initialAmount}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="c-currency">{t('contract.currency')}</label>
            <select id="c-currency" className="rently-select" value={form.currency} onChange={e => onFieldChange('currency', e.target.value)}>
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor="c-paymentDay">{t('contract.paymentDay')}</label>
            <input id="c-paymentDay" className="input" type="number" min="1" max="28" placeholder="15" value={form.paymentDay} onChange={e => onFieldChange('paymentDay', e.target.value)} aria-invalid={errors.paymentDay ? true : undefined} aria-describedby={errors.paymentDay ? 'c-paymentDay-error' : undefined} style={{ borderColor: errors.paymentDay ? 'var(--danger)' : undefined }} />
            {errors.paymentDay && <span id="c-paymentDay-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.paymentDay}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="c-indexType">{t('contract.indexType')}</label>
            <select id="c-indexType" className="rently-select" value={form.indexType} onChange={e => onFieldChange('indexType', e.target.value)}>
              {property && INDEX_BY_COUNTRY[property.country || 'AR']?.map(idx => (
                <option key={idx.value} value={idx.value}>{idx.label}</option>
              ))}
            </select>
            {form.indexType === 'MANUAL' && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                {t('contracts:adjustments.manualAdjustHelp')}
              </span>
            )}
          </div>
          {form.indexType !== 'MANUAL' && (
            <div className="input-group">
              <label htmlFor="c-adjustFrequency">{t('contract.adjustFrequency')}</label>
              <input id="c-adjustFrequency" className="input" type="number" min="1" max="24" placeholder="3" value={form.adjustFrequency} onChange={e => onFieldChange('adjustFrequency', e.target.value)} aria-invalid={errors.adjustFrequency ? true : undefined} aria-describedby={errors.adjustFrequency ? 'c-adjustFrequency-error' : undefined} style={{ borderColor: errors.adjustFrequency ? 'var(--danger)' : undefined }} />
              {errors.adjustFrequency && <span id="c-adjustFrequency-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.adjustFrequency}</span>}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
