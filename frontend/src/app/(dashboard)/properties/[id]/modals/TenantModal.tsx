'use client';

import Modal from '@/components/Modal';

interface TenantModalProps {
  show: boolean;
  form: { name: string; email: string; phone: string };
  errors: Record<string, string>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.SyntheticEvent) => void;
  onFieldChange: (field: string, value: string) => void;
}

export default function TenantModal({ show, form, errors, saving, onClose, onSubmit, onFieldChange }: TenantModalProps) {
  if (!show) return null;

  return (
    <Modal title="Vincular Inquilino" onClose={onClose} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={onSubmit} disabled={saving}>
          {saving ? 'Vinculando...' : 'Vincular'}
        </button>
      </>
    }>
      <form onSubmit={onSubmit}>
        <div className="input-group">
          <label htmlFor="t-name">Nombre completo</label>
          <input id="t-name" className="input" placeholder="Nombre del inquilino" value={form.name} onChange={e => onFieldChange('name', e.target.value)} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? 't-name-error' : undefined} style={{ borderColor: errors.name ? 'var(--danger)' : undefined }} />
          {errors.name && <span id="t-name-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.name}</span>}
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor="t-email">Email</label>
            <input id="t-email" className="input" type="email" placeholder="email@ejemplo.com" value={form.email} onChange={e => onFieldChange('email', e.target.value)} aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? 't-email-error' : undefined} style={{ borderColor: errors.email ? 'var(--danger)' : undefined }} />
            {errors.email && <span id="t-email-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.email}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="t-phone">Teléfono</label>
            <input id="t-phone" className="input" type="tel" placeholder="+54 11 ..." value={form.phone} onChange={e => onFieldChange('phone', e.target.value)} aria-invalid={errors.phone ? true : undefined} aria-describedby={errors.phone ? 't-phone-error' : undefined} style={{ borderColor: errors.phone ? 'var(--danger)' : undefined }} />
            {errors.phone && <span id="t-phone-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.phone}</span>}
          </div>
        </div>
      </form>
    </Modal>
  );
}
