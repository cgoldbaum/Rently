'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

interface Property {
  id: string;
  name?: string;
  address: string;
  type: string;
  surface: number;
  status: string;
  openClaims: number;
  contract?: { currentAmount: number; endDate: string; tenant?: { name: string } };
}

const TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Departamento', HOUSE: 'Casa', COMMERCIAL: 'Comercial', PH: 'PH',
};
const filters = [
  ['all', 'Todas'], ['OCCUPIED', 'Ocupadas'], ['VACANT', 'Vacantes'],
  ['IN_ARREARS', 'En mora'], ['EXPIRING_SOON', 'Por vencer'],
];

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ name: '', address: '', type: 'APARTMENT', surface: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/properties').then(r => setProperties(r.data.data)).catch(() => {});
  }, []);

  const filtered = filter === 'all' ? properties : properties.filter(p => p.status === filter);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/properties', {
        name: form.name || undefined,
        address: form.address,
        type: form.type,
        surface: parseFloat(form.surface),
      });
      setProperties(prev => [{ ...data.data, openClaims: 0 }, ...prev]);
      setShowAdd(false);
      setForm({ name: '', address: '', type: 'APARTMENT', surface: '' });
      setToast('Propiedad creada exitosamente');
    } catch {
      setToast('Error al crear la propiedad');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="tabs">
          {filters.map(([v, l]) => (
            <button key={v} className={`tab${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Icon name="plus" size={16} /> Nueva Propiedad
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="building" size={32} /></div>
            <div className="empty-text">{filter === 'all' ? 'No tenés propiedades aún' : 'No hay propiedades en este estado'}</div>
          </div>
        </div>
      ) : (
        <div className="properties-grid">
          {filtered.map(p => (
            <Link key={p.id} href={`/properties/${p.id}`} className="property-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <div className="property-name">{p.name ?? p.address}</div>
                  {p.name && <div className="property-address">{p.address}</div>}
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 20 }}>
                  {p.contract?.currentAmount ? `USD ${p.contract.currentAmount.toLocaleString('es-AR')}` : '—'}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.contract?.tenant?.name ?? '—'}</span>
              </div>
              <div className="property-details">
                <span className="property-detail"><Icon name="building" size={14} />{TYPE_LABELS[p.type] ?? p.type}</span>
                <span className="property-detail">{p.surface} m²</span>
                {p.openClaims > 0 && (
                  <span className="property-detail" style={{ color: 'var(--warning)' }}>
                    <Icon name="alert" size={14} /> {p.openClaims}
                  </span>
                )}
              </div>
              {p.contract?.endDate && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                  Contrato hasta {new Date(p.contract.endDate).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Nueva Propiedad" onClose={() => setShowAdd(false)} footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving || !form.address || !form.surface}>
              {saving ? 'Creando...' : 'Crear Propiedad'}
            </button>
          </>
        }>
          <form onSubmit={handleCreate}>
            <div className="grid-2">
              <div className="input-group">
                <label>Nombre / Identificador</label>
                <input className="input" placeholder="Ej: Depto 3A - Palermo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="input-group">
                <label>Dirección *</label>
                <input className="input" placeholder="Ej: Thames 1842, CABA" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required />
              </div>
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
          </form>
        </Modal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}
