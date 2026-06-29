'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import { useToastStore } from '@/store/toast';
import { MapPin } from 'lucide-react';
import SubscriptionUpgradeModal from '@/components/SubscriptionUpgradeModal';
import type { SubscriptionSummary } from '@/types/subscription';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

interface Property {
  id: string;
  name?: string;
  address: string;
  country?: string;
  type: string;
  surface: number;
  status: string;
  openClaims: number;
  contract?: { currentAmount: number; endDate: string; tenants?: { name: string }[] };
}

const TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Departamento', HOUSE: 'Casa', COMMERCIAL: 'Comercial', PH: 'PH', GARAGE: 'Cochera', DUPLEX: 'Dúplex',
};
const filters = [
  ['all', 'Todas'], ['OCCUPIED', 'Ocupadas'], ['VACANT', 'Vacantes'],
  ['IN_ARREARS', 'En mora'], ['EXPIRING_SOON', 'Por vencer'],
];

export default function PropertiesPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', address: '', country: 'AR', type: 'APARTMENT', surface: '', antiquity: '' });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties').then(r => r.data.data),
  });
  const { data: subscription } = useQuery<SubscriptionSummary | null>({
    queryKey: ['owner-subscription-summary'],
    queryFn: () => api.get('/owner/subscription').then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/properties', {
      name: form.name || undefined,
      address: form.address,
      country: form.country,
      type: form.type,
      surface: parseFloat(form.surface),
      antiquity: form.antiquity ? parseInt(form.antiquity) : undefined,
    }),
    onSuccess: () => {
      setShowAdd(false);
      setForm({ name: '', address: '', country: 'AR', type: 'APARTMENT', surface: '', antiquity: '' });
      useToastStore.getState().showToast('Propiedad creada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['owner-subscription-summary'] });
    },
    onError: (err: unknown) => {
      const apiError = (err as { response?: { status?: number; data?: { error?: { code?: string; message?: string; details?: SubscriptionSummary } } } })?.response;
      if (apiError?.status === 402) {
        setUpgradeReason(apiError.data?.error?.code ?? null);
        setShowAdd(false);
        setShowUpgrade(true);
      } else {
        useToastStore.getState().showToast('Error al crear la propiedad');
      }
    },
  });

  const filtered = filter === 'all' ? properties : properties.filter(p => p.status === filter);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  function handleNewPropertyClick() {
    if (subscription && !subscription.usage.canCreateProperty) {
      setUpgradeReason(subscription.usage.blockingReason);
      setShowUpgrade(true);
      return;
    }
    setShowAdd(true);
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="tabs">
          {filters.map(([v, l]) => (
            <button key={v} className={`tab${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={handleNewPropertyClick}>
          <Icon name="plus" size={16} /> Nueva Propiedad
        </button>
      </div>

      {subscription && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {subscription.subscription ? `Plan ${subscription.subscription.plan.name}` : 'Sin plan activo'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
              {subscription.usage.propertyLimit == null
                ? `${subscription.usage.properties} propiedades cargadas`
                : `${subscription.usage.properties} de ${subscription.usage.propertyLimit} propiedades usadas`}
            </div>
          </div>
          {!subscription.usage.canCreateProperty && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setUpgradeReason(subscription.usage.blockingReason); setShowUpgrade(true); }}>
              Ver planes
            </button>
          )}
        </div>
      )}

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
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.contract?.tenants?.map(t => t.name).join(', ') || '—'}</span>
              </div>
              <div className="property-details">
                <span className="property-detail"><Icon name="building" size={14} />{TYPE_LABELS[p.type] ?? p.type}</span>
                {p.type !== 'GARAGE' && <span className="property-detail">{p.surface} m²</span>}
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
            <button className="btn btn-primary" onClick={handleCreate} disabled={createMutation.isPending || !form.address || !form.surface}>
              {createMutation.isPending ? 'Creando...' : 'Crear Propiedad'}
            </button>
          </>
        }>
          <form onSubmit={handleCreate}>
            <div className="grid-2">
              <div className="input-group">
                <label htmlFor="prop-name">Nombre / Identificador</label>
                <input id="prop-name" className="input" placeholder="Ej: Depto 3A - Palermo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="input-group">
                <label htmlFor="prop-address">Dirección *</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    id="prop-address"
                    className="input"
                    style={{ flex: 1 }}
                    placeholder="Ej: Thames 1842, CABA"
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0 10px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => setShowMap(true)}
                    title="Elegir en mapa"
                  >
                    <MapPin size={15} />
                    <span style={{ fontSize: 12 }}>Mapa</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="prop-country">País *</label>
              <select id="prop-country" className="rently-select" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
                <option value="AR">🇦🇷 Argentina</option>
                <option value="CL">🇨🇱 Chile</option>
                <option value="CO">🇨🇴 Colombia</option>
                <option value="UY">🇺🇾 Uruguay</option>
              </select>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label htmlFor="prop-type">Tipo *</label>
            <select id="prop-type" className="rently-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, surface: e.target.value === 'GARAGE' ? '1' : f.surface, antiquity: e.target.value === 'GARAGE' ? '' : f.antiquity }))}>
                <option value="APARTMENT">Departamento</option>
                <option value="HOUSE">Casa</option>
                <option value="COMMERCIAL">Comercial</option>
                <option value="PH">PH</option>
                <option value="GARAGE">Cochera</option>
                <option value="DUPLEX">Dúplex</option>
              </select>
            </div>
            <div className="input-group" style={{ visibility: form.type === 'GARAGE' ? 'hidden' : 'visible' }}>
              <label htmlFor="prop-surface">Superficie (m²) *</label>
              <input id="prop-surface" className="input" type="number" placeholder="58" value={form.surface} onChange={e => setForm(f => ({ ...f, surface: e.target.value }))} required tabIndex={form.type === 'GARAGE' ? -1 : 0} />
            </div>
          </div>
          <div className="input-group" style={{ visibility: form.type === 'GARAGE' ? 'hidden' : 'visible' }}>
            <label htmlFor="prop-antiquity">Antigüedad (años)</label>
            <input id="prop-antiquity" className="input" type="number" min="0" placeholder="10" value={form.antiquity} onChange={e => setForm(f => ({ ...f, antiquity: e.target.value }))} tabIndex={form.type === 'GARAGE' ? -1 : 0} />
          </div>
          </form>
        </Modal>
      )}

      {showMap && (
        <LocationPicker
          initialAddress={form.address}
          onConfirm={(address) => {
            setForm(f => ({ ...f, address }));
            setShowMap(false);
          }}
          onClose={() => setShowMap(false)}
        />
      )}

      {showUpgrade && (
        <SubscriptionUpgradeModal
           summary={subscription ?? null}
          reason={upgradeReason}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </>
  );
}
