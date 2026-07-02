'use client';

import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import api from '@/lib/api';
import Icon from '@/components/Icon';
import { propertySchema, getFieldErrors } from '@/lib/validations';
import SubscriptionUpgradeModal from '@/components/SubscriptionUpgradeModal';
import type { SubscriptionSummary } from '@/types/subscription';
import { useQuery } from '@tanstack/react-query';

interface ExistingProperty {
  id: string;
  name?: string | null;
  address: string;
  type: string;
  parentPropertyId?: string | null;
}

export default function NewPropertyPage() {
  const { t } = useTranslation('properties');
  const router = useRouter();
  const [form, setForm] = useState({ name: '', address: '', country: 'AR', type: 'APARTMENT', surface: '', parentPropertyId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: existingProperties = [] } = useQuery<ExistingProperty[]>({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties').then(r => r.data.data),
  });
  const parentCandidates = existingProperties.filter(p => p.type !== 'GARAGE' && !p.parentPropertyId);

  function clearFieldError(field: string) {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();

    const parsed = propertySchema.safeParse({
      name: form.name,
      address: form.address,
      country: form.country,
      type: form.type,
      surface: form.surface,
      description: '',
    });

    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});

    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/properties', {
        name: form.name || undefined,
        address: form.address,
        country: form.country,
        type: form.type,
        surface: parseFloat(form.surface),
        parentPropertyId: form.type === 'GARAGE' && form.parentPropertyId ? form.parentPropertyId : undefined,
      });
      router.push(`/properties/${data.data.id}`);
    } catch (err: unknown) {
      const apiError = (err as { response?: { status?: number; data?: { error?: { code?: string; message?: string; details?: SubscriptionSummary } } } })?.response;
      if (apiError?.status === 402) {
        setSubscription(apiError.data?.error?.details ?? null);
        setUpgradeReason(apiError.data?.error?.code ?? null);
        setError('');
      } else {
        setError(t('create.error'));
      }
      setSaving(false);
    }
  }

  const fe = fieldErrors;

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn-icon" onClick={() => router.back()}>
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="chevron" size={16} /></span>
        </button>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{t('page.newProperty')}</div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="np-name">{t('form.name')}</label>
            <input
              id="np-name"
              className="input"
              placeholder={t('form.namePlaceholder')}
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); clearFieldError('name'); }}
              aria-invalid={fe.name ? true : undefined}
              aria-describedby={fe.name ? 'np-name-error' : undefined}
              style={{ borderColor: fe.name ? 'var(--danger)' : undefined }}
            />
            {fe.name && <span id="np-name-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{fe.name}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="np-address">{t('form.address')}</label>
            <input
              id="np-address"
              className="input"
              placeholder={t('form.addressPlaceholder')}
              value={form.address}
              onChange={e => { setForm(f => ({ ...f, address: e.target.value })); clearFieldError('address'); }}
              aria-invalid={fe.address ? true : undefined}
              aria-describedby={fe.address ? 'np-address-error' : undefined}
              style={{ borderColor: fe.address ? 'var(--danger)' : undefined }}
            />
            {fe.address && <span id="np-address-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{fe.address}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="np-country">{t('form.country')}</label>
            <select id="np-country" className="rently-select" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
              <option value="AR">{t('country.AR')}</option>
              <option value="CL">{t('country.CL')}</option>
              <option value="CO">{t('country.CO')}</option>
              <option value="UY">{t('country.UY')}</option>
            </select>
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label htmlFor="np-type">{t('form.type')}</label>
              <select id="np-type" className="rently-select" value={form.type} onChange={e => { setForm(f => ({ ...f, type: e.target.value, surface: e.target.value === 'GARAGE' ? '1' : f.surface })); clearFieldError('surface'); }}>
                <option value="APARTMENT">{t('type.APARTMENT')}</option>
                <option value="HOUSE">{t('type.HOUSE')}</option>
                <option value="COMMERCIAL">{t('type.COMMERCIAL')}</option>
                <option value="PH">{t('type.PH')}</option>
                <option value="GARAGE">{t('type.GARAGE')}</option>
                <option value="DUPLEX">{t('type.DUPLEX')}</option>
              </select>
            </div>
            {form.type !== 'GARAGE' ? (
              <div className="input-group">
                <label htmlFor="np-surface">{t('form.surface')}</label>
                <input
                  id="np-surface"
                  className="input"
                  type="number"
                  placeholder={t('form.surfacePlaceholder')}
                  value={form.surface}
                  onChange={e => { setForm(f => ({ ...f, surface: e.target.value })); clearFieldError('surface'); }}
                  aria-invalid={fe.surface ? true : undefined}
                  aria-describedby={fe.surface ? 'np-surface-error' : undefined}
                  style={{ borderColor: fe.surface ? 'var(--danger)' : undefined }}
                />
                {fe.surface && <span id="np-surface-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{fe.surface}</span>}
              </div>
            ) : (
              <div className="input-group">
                <label htmlFor="np-parent">{t('form.parentProperty')}</label>
                <select
                  id="np-parent"
                  className="rently-select"
                  value={form.parentPropertyId}
                  onChange={e => {
                    const parentId = e.target.value;
                    const parent = parentCandidates.find(p => p.id === parentId);
                    setForm(f => ({ ...f, parentPropertyId: parentId, address: parent ? parent.address : f.address }));
                  }}
                >
                  <option value="">{t('form.parentPropertyNone')}</option>
                  {parentCandidates.map(p => (
                    <option key={p.id} value={p.id}>{p.name ?? p.address}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && (
            <div role="alert" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={() => router.back()}>{t('create.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t('create.creating') : t('create.save')}
            </button>
          </div>
        </form>
      </div>

      {subscription && (
        <SubscriptionUpgradeModal
          summary={subscription}
          reason={upgradeReason}
          onClose={() => setSubscription(null)}
        />
      )}
    </div>
  );
}
