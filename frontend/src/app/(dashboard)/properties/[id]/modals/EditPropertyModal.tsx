'use client';

import Modal from '@/components/Modal';

interface EditPropertyModalProps {
  show: boolean;
  form: { name: string; address: string; country: string; type: string; surface: string; antiquity: string; description: string };
  errors: Record<string, string>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.SyntheticEvent) => void;
  onFieldChange: (field: string, value: string) => void;
}

export default function EditPropertyModal({ show, form, errors, saving, onClose, onSubmit, onFieldChange }: EditPropertyModalProps) {
  if (!show) return null;

  return (
    <Modal title="Editar propiedad" onClose={onClose} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={onSubmit} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </>
    }>
      <form onSubmit={onSubmit}>
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor="e-name">Nombre / Identificador</label>
            <input id="e-name" className="input" placeholder="Ej: Depto 3A - Palermo" value={form.name} onChange={e => onFieldChange('name', e.target.value)} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? 'e-name-error' : undefined} style={{ borderColor: errors.name ? 'var(--danger)' : undefined }} />
            {errors.name && <span id="e-name-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.name}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="e-address">Dirección *</label>
            <input id="e-address" className="input" placeholder="Ej: Thames 1842, CABA" value={form.address} onChange={e => onFieldChange('address', e.target.value)} aria-invalid={errors.address ? true : undefined} aria-describedby={errors.address ? 'e-address-error' : undefined} style={{ borderColor: errors.address ? 'var(--danger)' : undefined }} />
            {errors.address && <span id="e-address-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.address}</span>}
          </div>
        </div>
        <div className="input-group">
          <label htmlFor="e-country">País *</label>
          <select id="e-country" className="rently-select" value={form.country} onChange={e => onFieldChange('country', e.target.value)}>
            <option value="AR">🇦🇷 Argentina</option>
            <option value="CL">🇨🇱 Chile</option>
            <option value="CO">🇨🇴 Colombia</option>
            <option value="UY">🇺🇾 Uruguay</option>
          </select>
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor="e-type">Tipo *</label>
            <select id="e-type" className="rently-select" value={form.type} onChange={e => onFieldChange('type', e.target.value)}>
              <option value="APARTMENT">Departamento</option>
              <option value="HOUSE">Casa</option>
              <option value="COMMERCIAL">Comercial</option>
              <option value="PH">PH</option>
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="e-surface">Superficie (m²) *</label>
            <input id="e-surface" className="input" type="number" placeholder="58" value={form.surface} onChange={e => onFieldChange('surface', e.target.value)} aria-invalid={errors.surface ? true : undefined} aria-describedby={errors.surface ? 'e-surface-error' : undefined} style={{ borderColor: errors.surface ? 'var(--danger)' : undefined }} />
            {errors.surface && <span id="e-surface-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.surface}</span>}
          </div>
        </div>
        <div className="input-group">
          <label htmlFor="e-antiquity">Antigüedad (años)</label>
          <input id="e-antiquity" className="input" type="number" min="0" placeholder="10" value={form.antiquity} onChange={e => onFieldChange('antiquity', e.target.value)} aria-invalid={errors.antiquity ? true : undefined} aria-describedby={errors.antiquity ? 'e-antiquity-error' : undefined} style={{ borderColor: errors.antiquity ? 'var(--danger)' : undefined }} />
          {errors.antiquity && <span id="e-antiquity-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.antiquity}</span>}
        </div>
        <div className="input-group">
          <label htmlFor="e-description">Descripción</label>
          <textarea id="e-description" className="rently-textarea" placeholder="Descripción libre de la propiedad..." value={form.description} onChange={e => onFieldChange('description', e.target.value)} rows={3} aria-invalid={errors.description ? true : undefined} aria-describedby={errors.description ? 'e-description-error' : undefined} style={{ borderColor: errors.description ? 'var(--danger)' : undefined }} />
          {errors.description && <span id="e-description-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.description}</span>}
        </div>
      </form>
    </Modal>
  );
}
