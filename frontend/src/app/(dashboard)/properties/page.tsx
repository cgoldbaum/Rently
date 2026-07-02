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
import { useTranslation } from 'react-i18next';

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
  parentPropertyId?: string | null;
  parentProperty?: { id: string; name?: string | null; address: string } | null;
}

const filters: [string, string][] = [
  ['all', 'all'], ['OCCUPIED', 'occupied'], ['VACANT', 'vacant'],
  ['IN_ARREARS', 'inArrears'], ['EXPIRING_SOON', 'expiringSoon'],
];

export default function PropertiesPage() {
  const { t } = useTranslation('properties');
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', address: '', country: 'AR', type: 'APARTMENT', surface: '', antiquity: '', parentPropertyId: '' });

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
      parentPropertyId: form.type === 'GARAGE' && form.parentPropertyId ? form.parentPropertyId : undefined,
    }),
    onSuccess: () => {
      setShowAdd(false);
      setForm({ name: '', address: '', country: 'AR', type: 'APARTMENT', surface: '', antiquity: '', parentPropertyId: '' });
      useToastStore.getState().showToast(t('toast.propertyCreated'));
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
        useToastStore.getState().showToast(t('toast.createError'));
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
            <button key={v} className={`tab${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>{t(`filters.${l}`)}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={handleNewPropertyClick}>
          <Icon name="plus" size={16} /> {t('page.newProperty')}
        </button>
      </div>

      {subscription && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {subscription.subscription ? t('subscription.planLabel', { name: subscription.subscription.plan.name }) : t('subscription.noPlan')}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
              {subscription.usage.propertyLimit == null
                ? t('subscription.usageCountNoLimit', { used: subscription.usage.properties })
                : t('subscription.usageCount', { used: subscription.usage.properties, limit: subscription.usage.propertyLimit })}
            </div>
          </div>
          {!subscription.usage.canCreateProperty && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setUpgradeReason(subscription.usage.blockingReason); setShowUpgrade(true); }}>
              {t('subscription.viewPlans')}
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="building" size={32} /></div>
            <div className="empty-text">{filter === 'all' ? t('empty.noProperties') : t('empty.noPropertiesInFilter')}</div>
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
                  {p.parentProperty && (
                    <div className="property-address">{t('card.unitOf', { address: p.parentProperty.name ?? p.parentProperty.address })}</div>
                  )}
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
                <span className="property-detail"><Icon name="building" size={14} />{t(`type.${p.type}`)}</span>
                {p.type !== 'GARAGE' && <span className="property-detail">{t('card.surface', { value: p.surface })}</span>}
                {p.openClaims > 0 && (
                  <span className="property-detail" style={{ color: 'var(--warning)' }}>
                    <Icon name="alert" size={14} /> {p.openClaims}
                  </span>
                )}
              </div>
              {p.contract?.endDate && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                  {t('card.contractUntil', { date: new Date(p.contract.endDate).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' }) })}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title={t('create.title')} onClose={() => setShowAdd(false)} footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t('create.cancel')}</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={createMutation.isPending || !form.address || !form.surface}>
              {createMutation.isPending ? t('create.creating') : t('create.save')}
            </button>
          </>
        }>
          <form onSubmit={handleCreate}>
            <div className="grid-2">
              <div className="input-group">
                <label htmlFor="prop-name">{t('form.name')}</label>
                <input id="prop-name" className="input" placeholder={t('form.namePlaceholder')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="input-group">
                <label htmlFor="prop-address">{t('form.address')}</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    id="prop-address"
                    className="input"
                    style={{ flex: 1 }}
                    placeholder={t('form.addressPlaceholder')}
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0 10px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => setShowMap(true)}
                    title={t('form.mapTitle')}
                  >
                    <MapPin size={15} />
                    <span style={{ fontSize: 12 }}>{t('form.map')}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="prop-country">{t('form.country')}</label>
              <select id="prop-country" className="rently-select" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
                <option value="AR">{t('country.AR')}</option>
                <option value="CL">{t('country.CL')}</option>
                <option value="CO">{t('country.CO')}</option>
                <option value="UY">{t('country.UY')}</option>
              </select>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label htmlFor="prop-type">{t('form.type')}</label>
            <select id="prop-type" className="rently-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, surface: e.target.value === 'GARAGE' ? '1' : f.surface, antiquity: e.target.value === 'GARAGE' ? '' : f.antiquity }))}>
                <option value="APARTMENT">{t('type.APARTMENT')}</option>
                <option value="HOUSE">{t('type.HOUSE')}</option>
                <option value="COMMERCIAL">{t('type.COMMERCIAL')}</option>
                <option value="PH">{t('type.PH')}</option>
                <option value="GARAGE">{t('type.GARAGE')}</option>
                <option value="DUPLEX">{t('type.DUPLEX')}</option>
              </select>
            </div>
            <div className="input-group" style={{ visibility: form.type === 'GARAGE' ? 'hidden' : 'visible' }}>
              <label htmlFor="prop-surface">{t('form.surface')}</label>
              <input id="prop-surface" className="input" type="number" placeholder={t('form.surfacePlaceholder')} value={form.surface} onChange={e => setForm(f => ({ ...f, surface: e.target.value }))} required tabIndex={form.type === 'GARAGE' ? -1 : 0} />
            </div>
          </div>
          <div className="input-group" style={{ visibility: form.type === 'GARAGE' ? 'hidden' : 'visible' }}>
            <label htmlFor="prop-antiquity">{t('form.antiquity')}</label>
            <input id="prop-antiquity" className="input" type="number" min="0" placeholder={t('form.antiquityPlaceholder')} value={form.antiquity} onChange={e => setForm(f => ({ ...f, antiquity: e.target.value }))} tabIndex={form.type === 'GARAGE' ? -1 : 0} />
          </div>
          {form.type === 'GARAGE' && (
            <div className="input-group">
              <label htmlFor="prop-parent">{t('form.parentProperty')}</label>
              <select
                id="prop-parent"
                className="rently-select"
                value={form.parentPropertyId}
                onChange={e => setForm(f => ({ ...f, parentPropertyId: e.target.value }))}
              >
                <option value="">{t('form.parentPropertyNone')}</option>
                {properties.filter(p => p.type !== 'GARAGE' && !p.parentPropertyId).map(p => (
                  <option key={p.id} value={p.id}>{p.name ?? p.address}</option>
                ))}
              </select>
            </div>
          )}
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
