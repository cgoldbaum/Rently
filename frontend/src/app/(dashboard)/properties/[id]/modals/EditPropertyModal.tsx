'use client';

import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import Modal from '@/components/Modal';
import api from '@/lib/api';

interface EditPropertyModalProps {
  show: boolean;
  propertyId: string;
  form: { name: string; address: string; country: string; type: string; surface: string; antiquity: string; description: string; parentPropertyId: string };
  errors: Record<string, string>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.SyntheticEvent) => void;
  onFieldChange: (field: string, value: string) => void;
}

interface ExistingProperty {
  id: string;
  name?: string | null;
  address: string;
  type: string;
  parentPropertyId?: string | null;
}

export default function EditPropertyModal({ show, propertyId, form, errors, saving, onClose, onSubmit, onFieldChange }: EditPropertyModalProps) {
  const { t } = useTranslation('properties');

  const { data: existingProperties = [] } = useQuery<ExistingProperty[]>({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties').then(r => r.data.data),
    enabled: show,
  });
  const parentCandidates = existingProperties.filter(p => p.id !== propertyId && p.type !== 'GARAGE' && !p.parentPropertyId);

  if (!show) return null;

  return (
    <Modal title={t('edit.title')} onClose={onClose} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('edit.cancel')}</button>
        <button className="btn btn-primary" onClick={onSubmit} disabled={saving}>
          {saving ? t('edit.saving') : t('edit.save')}
        </button>
      </>
    }>
      <form onSubmit={onSubmit}>
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor="e-name">{t('form.name')}</label>
            <input id="e-name" className="input" placeholder={t('form.namePlaceholder')} value={form.name} onChange={e => onFieldChange('name', e.target.value)} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? 'e-name-error' : undefined} style={{ borderColor: errors.name ? 'var(--danger)' : undefined }} />
            {errors.name && <span id="e-name-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.name}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="e-address">{t('form.address')}</label>
            <input id="e-address" className="input" placeholder={t('form.addressPlaceholder')} value={form.address} onChange={e => onFieldChange('address', e.target.value)} aria-invalid={errors.address ? true : undefined} aria-describedby={errors.address ? 'e-address-error' : undefined} style={{ borderColor: errors.address ? 'var(--danger)' : undefined }} />
            {errors.address && <span id="e-address-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.address}</span>}
          </div>
        </div>
        <div className="input-group">
          <label htmlFor="e-country">{t('form.country')}</label>
          <select id="e-country" className="rently-select" value={form.country} onChange={e => onFieldChange('country', e.target.value)}>
            <option value="AR">{t('country.AR')}</option>
            <option value="CL">{t('country.CL')}</option>
            <option value="CO">{t('country.CO')}</option>
            <option value="UY">{t('country.UY')}</option>
          </select>
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor="e-type">{t('form.type')}</label>
            <select id="e-type" className="rently-select" value={form.type} onChange={e => {
              onFieldChange('type', e.target.value);
              if (e.target.value === 'GARAGE') {
                onFieldChange('surface', '1');
                onFieldChange('antiquity', '');
              }
            }}>
              <option value="APARTMENT">{t('type.APARTMENT')}</option>
              <option value="HOUSE">{t('type.HOUSE')}</option>
              <option value="COMMERCIAL">{t('type.COMMERCIAL')}</option>
              <option value="PH">{t('type.PH')}</option>
              <option value="GARAGE">{t('type.GARAGE')}</option>
              <option value="DUPLEX">{t('type.DUPLEX')}</option>
            </select>
          </div>
          <div className="input-group" style={{ visibility: form.type === 'GARAGE' ? 'hidden' : 'visible' }}>
            <label htmlFor="e-surface">{t('form.surface')}</label>
            <input id="e-surface" className="input" type="number" placeholder={t('form.surfacePlaceholder')} value={form.surface} onChange={e => onFieldChange('surface', e.target.value)} aria-invalid={errors.surface ? true : undefined} aria-describedby={errors.surface ? 'e-surface-error' : undefined} style={{ borderColor: errors.surface ? 'var(--danger)' : undefined }} tabIndex={form.type === 'GARAGE' ? -1 : 0} />
            {errors.surface && <span id="e-surface-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.surface}</span>}
          </div>
        </div>
        {form.type !== 'GARAGE' ? (
          <div className="input-group">
            <label htmlFor="e-antiquity">{t('form.antiquity')}</label>
            <input id="e-antiquity" className="input" type="number" min="0" placeholder={t('form.antiquityPlaceholder')} value={form.antiquity} onChange={e => onFieldChange('antiquity', e.target.value)} aria-invalid={errors.antiquity ? true : undefined} aria-describedby={errors.antiquity ? 'e-antiquity-error' : undefined} style={{ borderColor: errors.antiquity ? 'var(--danger)' : undefined }} />
            {errors.antiquity && <span id="e-antiquity-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.antiquity}</span>}
          </div>
        ) : (
          <div className="input-group">
            <label htmlFor="e-parent">{t('form.parentProperty')}</label>
            <select
              id="e-parent"
              className="rently-select"
              value={form.parentPropertyId}
              onChange={e => {
                const parentId = e.target.value;
                onFieldChange('parentPropertyId', parentId);
                const parent = parentCandidates.find(p => p.id === parentId);
                if (parent) onFieldChange('address', parent.address);
              }}
            >
              <option value="">{t('form.parentPropertyNone')}</option>
              {parentCandidates.map(p => (
                <option key={p.id} value={p.id}>{p.name ?? p.address}</option>
              ))}
            </select>
          </div>
        )}
        <div className="input-group">
          <label htmlFor="e-description">{t('overview.description')}</label>
          <textarea id="e-description" className="rently-textarea" placeholder={t('overview.description')} value={form.description} onChange={e => onFieldChange('description', e.target.value)} rows={3} aria-invalid={errors.description ? true : undefined} aria-describedby={errors.description ? 'e-description-error' : undefined} style={{ borderColor: errors.description ? 'var(--danger)' : undefined }} />
          {errors.description && <span id="e-description-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.description}</span>}
        </div>
      </form>
    </Modal>
  );
}
