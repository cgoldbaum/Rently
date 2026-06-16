'use client';

import Modal from '@/components/Modal';
import { Property } from '../types';
import { INDEX_BY_COUNTRY } from '../constants';

interface ContractModalProps {
  show: boolean;
  property: Property;
  form: { startDate: string; endDate: string; initialAmount: string; paymentDay: string; indexType: string; adjustFrequency: string; currency: 'ARS' | 'USD' };
  errors: Record<string, string>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.SyntheticEvent) => void;
  onFieldChange: (field: string, value: string) => void;
}

export default function ContractModal({ show, property, form, errors, saving, onClose, onSubmit, onFieldChange }: ContractModalProps) {
  if (!show) return null;

  return (
    <Modal title={property.contract ? 'Editar Contrato' : 'Nuevo Contrato'} onClose={onClose} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={onSubmit} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </>
    }>
      <form onSubmit={onSubmit}>
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor="c-startDate">Fecha inicio</label>
            <input id="c-startDate" className="input" type="date" lang="es-AR" value={form.startDate} onChange={e => onFieldChange('startDate', e.target.value)} aria-invalid={errors.startDate ? true : undefined} aria-describedby={errors.startDate ? 'c-startDate-error' : undefined} style={{ borderColor: errors.startDate ? 'var(--danger)' : undefined }} />
            {errors.startDate && <span id="c-startDate-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.startDate}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="c-endDate">Fecha fin</label>
            <input id="c-endDate" className="input" type="date" lang="es-AR" value={form.endDate} onChange={e => onFieldChange('endDate', e.target.value)} aria-invalid={errors.endDate ? true : undefined} aria-describedby={errors.endDate ? 'c-endDate-error' : undefined} style={{ borderColor: errors.endDate ? 'var(--danger)' : undefined }} />
            {errors.endDate && <span id="c-endDate-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.endDate}</span>}
          </div>
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor="c-initialAmount">Monto inicial</label>
            <input id="c-initialAmount" className="input" type="number" placeholder="400" value={form.initialAmount} onChange={e => onFieldChange('initialAmount', e.target.value)} aria-invalid={errors.initialAmount ? true : undefined} aria-describedby={errors.initialAmount ? 'c-initialAmount-error' : undefined} style={{ borderColor: errors.initialAmount ? 'var(--danger)' : undefined }} />
            {errors.initialAmount && <span id="c-initialAmount-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.initialAmount}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="c-currency">Moneda</label>
            <select id="c-currency" className="rently-select" value={form.currency} onChange={e => onFieldChange('currency', e.target.value)}>
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor="c-paymentDay">Día de pago (1–28)</label>
            <input id="c-paymentDay" className="input" type="number" min="1" max="28" placeholder="15" value={form.paymentDay} onChange={e => onFieldChange('paymentDay', e.target.value)} aria-invalid={errors.paymentDay ? true : undefined} aria-describedby={errors.paymentDay ? 'c-paymentDay-error' : undefined} style={{ borderColor: errors.paymentDay ? 'var(--danger)' : undefined }} />
            {errors.paymentDay && <span id="c-paymentDay-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.paymentDay}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="c-indexType">Índice de ajuste</label>
            <select id="c-indexType" className="rently-select" value={form.indexType} onChange={e => onFieldChange('indexType', e.target.value)}>
              {property && INDEX_BY_COUNTRY[property.country || 'AR']?.map(idx => (
                <option key={idx.value} value={idx.value}>{idx.label}</option>
              ))}
            </select>
            {form.indexType === 'MANUAL' && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Sin ajuste automático. El precio solo cambia si lo ajustás manualmente.
              </span>
            )}
          </div>
          {form.indexType !== 'MANUAL' && (
            <div className="input-group">
              <label htmlFor="c-adjustFrequency">Frecuencia (meses)</label>
              <input id="c-adjustFrequency" className="input" type="number" min="1" max="24" placeholder="3" value={form.adjustFrequency} onChange={e => onFieldChange('adjustFrequency', e.target.value)} aria-invalid={errors.adjustFrequency ? true : undefined} aria-describedby={errors.adjustFrequency ? 'c-adjustFrequency-error' : undefined} style={{ borderColor: errors.adjustFrequency ? 'var(--danger)' : undefined }} />
              {errors.adjustFrequency && <span id="c-adjustFrequency-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.adjustFrequency}</span>}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
