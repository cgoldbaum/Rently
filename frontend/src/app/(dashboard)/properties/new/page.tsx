'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import api from '@/lib/api';
import Icon from '@/components/Icon';
import { propertySchema, getFieldErrors } from '@/lib/validations';
import SubscriptionUpgradeModal from '@/components/SubscriptionUpgradeModal';
import type { SubscriptionSummary } from '@/types/subscription';

export default function NewPropertyPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', address: '', country: 'AR', type: 'APARTMENT', surface: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
      });
      router.push(`/properties/${data.data.id}`);
    } catch (err: unknown) {
      const apiError = (err as { response?: { status?: number; data?: { error?: { code?: string; message?: string; details?: SubscriptionSummary } } } })?.response;
      if (apiError?.status === 402) {
        setSubscription(apiError.data?.error?.details ?? null);
        setUpgradeReason(apiError.data?.error?.code ?? null);
        setError('');
      } else {
        setError('Error al crear la propiedad');
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
        <div style={{ fontSize: 20, fontWeight: 700 }}>Nueva Propiedad</div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="np-name">Nombre / Identificador</label>
            <input
              id="np-name"
              className="input"
              placeholder="Ej: Depto 3A - Palermo"
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); clearFieldError('name'); }}
              aria-invalid={fe.name ? true : undefined}
              aria-describedby={fe.name ? 'np-name-error' : undefined}
              style={{ borderColor: fe.name ? 'var(--danger)' : undefined }}
            />
            {fe.name && <span id="np-name-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{fe.name}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="np-address">Dirección *</label>
            <input
              id="np-address"
              className="input"
              placeholder="Ej: Thames 1842, CABA"
              value={form.address}
              onChange={e => { setForm(f => ({ ...f, address: e.target.value })); clearFieldError('address'); }}
              aria-invalid={fe.address ? true : undefined}
              aria-describedby={fe.address ? 'np-address-error' : undefined}
              style={{ borderColor: fe.address ? 'var(--danger)' : undefined }}
            />
            {fe.address && <span id="np-address-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{fe.address}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="np-country">País *</label>
            <select id="np-country" className="rently-select" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
              <option value="AR">🇦🇷 Argentina</option>
              <option value="CL">🇨🇱 Chile</option>
              <option value="CO">🇨🇴 Colombia</option>
              <option value="UY">🇺🇾 Uruguay</option>
            </select>
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label htmlFor="np-type">Tipo *</label>
              <select id="np-type" className="rently-select" value={form.type} onChange={e => { setForm(f => ({ ...f, type: e.target.value, surface: e.target.value === 'GARAGE' ? '1' : f.surface })); clearFieldError('surface'); }}>
                <option value="APARTMENT">Departamento</option>
                <option value="HOUSE">Casa</option>
                <option value="COMMERCIAL">Comercial</option>
                <option value="PH">PH</option>
                <option value="GARAGE">Cochera</option>
                <option value="DUPLEX">Dúplex</option>
              </select>
            </div>
            <div className="input-group" style={{ visibility: form.type === 'GARAGE' ? 'hidden' : 'visible' }}>
              <label htmlFor="np-surface">Superficie (m²) *</label>
              <input
                id="np-surface"
                className="input"
                type="number"
                placeholder="58"
                value={form.surface}
                onChange={e => { setForm(f => ({ ...f, surface: e.target.value })); clearFieldError('surface'); }}
                aria-invalid={fe.surface ? true : undefined}
                aria-describedby={fe.surface ? 'np-surface-error' : undefined}
                style={{ borderColor: fe.surface ? 'var(--danger)' : undefined }}
                tabIndex={form.type === 'GARAGE' ? -1 : 0}
              />
              {fe.surface && <span id="np-surface-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{fe.surface}</span>}
            </div>
          </div>

          {error && (
            <div role="alert" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creando...' : 'Crear Propiedad'}
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
