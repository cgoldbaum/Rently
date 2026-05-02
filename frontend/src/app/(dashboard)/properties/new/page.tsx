'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import api from '@/lib/api';
import Icon from '@/components/Icon';

export default function NewPropertyPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', address: '', country: 'AR', type: 'APARTMENT', surface: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    } catch {
      setError('Error al crear la propiedad');
      setSaving(false);
    }
  }

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
            <label>Nombre / Identificador</label>
            <input className="input" placeholder="Ej: Depto 3A - Palermo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="input-group">
            <label>Dirección *</label>
            <input className="input" placeholder="Ej: Thames 1842, CABA" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required />
          </div>
          <div className="input-group">
            <label>País *</label>
            <select className="rently-select" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
              <option value="AR">🇦🇷 Argentina</option>
              <option value="CL">🇨🇱 Chile</option>
              <option value="CO">🇨🇴 Colombia</option>
              <option value="UY">🇺🇾 Uruguay</option>
            </select>
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label>Tipo *</label>
              <select className="rently-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="APARTMENT">Departamento</option>
                <option value="HOUSE">Casa</option>
                <option value="COMMERCIAL">Comercial</option>
                <option value="PH">PH</option>
              </select>
            </div>
            <div className="input-group">
              <label>Superficie (m²) *</label>
              <input className="input" type="number" placeholder="58" value={form.surface} onChange={e => setForm(f => ({ ...f, surface: e.target.value }))} required />
            </div>
          </div>

          {error && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !form.address || !form.surface}>
              {saving ? 'Creando...' : 'Crear Propiedad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
