'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import { profileSchema, getFieldErrors } from '@/lib/validations';
import type { SubscriptionSummary } from '@/types/subscription';

const NOTIFICATION_ITEMS = [
  'Pago recibido',
  'Pago en mora',
  'Nuevo reclamo',
  'Ajuste aplicado',
  'Vencimiento de contrato',
];

export default function SettingsPage() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [notifications, setNotifications] = useState([true, true, true, true, false]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  useEffect(() => {
    api.get('/owner/subscription').then(r => setSubscription(r.data.data)).catch(() => {});
  }, []);

  function fmtMoney(amount: number, currency: string) {
    return amount.toLocaleString('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 });
  }

  function limitLabel(limit: number | null) {
    return limit == null ? 'Propiedades ilimitadas' : `Hasta ${limit} propiedades`;
  }

  async function startCheckout(planCode: string) {
    setCheckoutPlan(planCode);
    setToast('');
    try {
      const { data } = await api.post('/owner/subscription/checkout', { planCode });
      if (data.data.initPoint) {
        window.location.href = data.data.initPoint;
        return;
      }
      setToast('Mercado Pago no devolvió un link de pago');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setToast(msg ?? 'No se pudo iniciar el checkout');
    } finally {
      setCheckoutPlan(null);
    }
  }

  useEffect(() => {
    api.get('/auth/me').then(r => {
      const u = r.data.data ?? r.data;
      setProfile({ name: u.name ?? '', email: u.email ?? '', phone: u.phone ?? '' });
    }).catch(() => {});
  }, []);

  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get('subscription') === 'success') {
      setToast('Suscripción activada correctamente');
      api.get('/owner/subscription').then(r => setSubscription(r.data.data)).catch(() => {});
      const params = new URLSearchParams(searchParams.toString());
      params.delete('subscription');
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : '');
      window.history.replaceState(null, '', newUrl);
    }
  }, [searchParams]);

  async function saveProfile(e: React.SyntheticEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse({ name: profile.name, phone: profile.phone });
    if (!parsed.success) {
      setProfileErrors(getFieldErrors(parsed.error));
      return;
    }
    setProfileErrors({});
    setSaving(true);
    try {
      await api.patch('/auth/me', { name: profile.name, phone: profile.phone });
      setToast('Perfil actualizado');
    } catch {
      setToast('Error al guardar el perfil');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await api.delete('/auth/me');
      clearAuth();
      router.replace('/login');
    } catch {
      setToast('Error al eliminar la cuenta');
      setDeleting(false);
    }
  }

  function toggleNotification(i: number) {
    setNotifications(prev => prev.map((v, idx) => idx === i ? !v : v));
  }

  return (
    <>
      <div className="grid-2">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Perfil</div>
          <form onSubmit={saveProfile}>
            <div className="input-group">
              <label>Nombre</label>
              <input
                className="input"
                value={profile.name}
                onChange={e => { setProfile(p => ({ ...p, name: e.target.value })); setProfileErrors(prev => { const n = { ...prev }; delete n.name; return n; }); }}
                style={{ borderColor: profileErrors.name ? 'var(--danger)' : undefined }}
              />
              {profileErrors.name && <span style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{profileErrors.name}</span>}
            </div>
            <div className="input-group">
              <label>Email</label>
              <input className="input" type="email" value={profile.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
            <div className="input-group">
              <label>Teléfono</label>
              <input
                className="input"
                value={profile.phone}
                onChange={e => { setProfile(p => ({ ...p, phone: e.target.value })); setProfileErrors(prev => { const n = { ...prev }; delete n.phone; return n; }); }}
                placeholder="+54 11 0000-0000"
                style={{ borderColor: profileErrors.phone ? 'var(--danger)' : undefined }}
              />
              {profileErrors.phone && <span style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{profileErrors.phone}</span>}
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Suscripción</div>
          <div style={{ padding: 16, background: 'var(--accent-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(91,123,94,0.2)', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {subscription?.subscription ? `Plan ${subscription.subscription.plan.name}` : 'Sin plan activo'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {subscription?.subscription ? limitLabel(subscription.subscription.plan.propertyLimit) : 'Elegí un plan para crear propiedades'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 20, color: 'var(--accent)' }}>
                  {subscription?.subscription ? fmtMoney(subscription.subscription.plan.price, subscription.subscription.plan.currency) : '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ mes</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Uso actual: <strong style={{ color: 'var(--accent)' }}>
              {subscription
                ? subscription.usage.propertyLimit == null
                  ? `${subscription.usage.properties} propiedades`
                  : `${subscription.usage.properties} / ${subscription.usage.propertyLimit} propiedades`
                : 'Cargando...'}
            </strong>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Estado: <strong>{subscription?.subscription?.status ?? 'Sin suscripción'}</strong>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {(subscription?.plans ?? []).map(plan => (
              <button
                key={plan.id}
                className={subscription?.subscription?.plan.code === plan.code ? 'btn btn-secondary' : 'btn btn-primary'}
                disabled={checkoutPlan === plan.code || subscription?.subscription?.plan.code === plan.code}
                onClick={() => startCheckout(plan.code)}
                style={{ justifyContent: 'space-between' }}
              >
                <span>{plan.name} · {limitLabel(plan.propertyLimit)}</span>
                <span>{checkoutPlan === plan.code ? 'Abriendo...' : fmtMoney(plan.price, plan.currency)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Notificaciones</div>
        {NOTIFICATION_ITEMS.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: i < NOTIFICATION_ITEMS.length - 1 ? '1px solid var(--border-light)' : 'none',
            }}
          >
            <span style={{ fontSize: 14 }}>{item}</span>
            <div
              onClick={() => toggleNotification(i)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: notifications[i] ? 'var(--accent)' : 'var(--bg-elevated)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: 3,
                left: notifications[i] ? 23 : 3,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="card" style={{ marginTop: 16, border: '1px solid #fecaca' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--danger)' }}>Eliminar cuenta</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Se eliminarán permanentemente tu cuenta, propiedades, contratos y todos los datos asociados.
            </div>
          </div>
          <button
            className="btn"
            style={{ background: '#fee2e2', color: 'var(--danger)', border: '1px solid #fecaca', flexShrink: 0, marginLeft: 16 }}
            onClick={() => { setDeleteConfirm(''); setShowDeleteModal(true); }}
          >
            Eliminar cuenta
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <Modal
          title="Eliminar cuenta"
          onClose={() => setShowDeleteModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
              <button
                className="btn"
                style={{ background: 'var(--danger)', color: '#fff' }}
                disabled={deleteConfirm !== 'ELIMINAR' || deleting}
                onClick={handleDeleteAccount}
              >
                {deleting ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
            Esta acción es <strong>irreversible</strong>. Se borrarán todas tus propiedades, contratos, inquilinos y cobros.
          </p>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Escribí <strong>ELIMINAR</strong> para confirmar</label>
            <input
              className="input"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="ELIMINAR"
              style={{ borderColor: deleteConfirm && deleteConfirm !== 'ELIMINAR' ? 'var(--danger)' : undefined }}
            />
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}
