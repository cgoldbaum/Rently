'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import Modal from '@/components/Modal';
import { profileSchema, getFieldErrors } from '@/lib/validations';

const NOTIFICATION_ITEMS = [
  'Pago recibido',
  'Pago en mora',
  'Nuevo reclamo',
  'Ajuste aplicado',
  'Vencimiento de contrato',
];

export default function TenantSettingsPage() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [notifications, setNotifications] = useState([true, true, true, true, false]);
  const [saving, setSaving] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(r => {
      const u = r.data.data ?? r.data;
      setProfile({ name: u.name ?? '', email: u.email ?? '', phone: u.phone ?? '' });
    }).catch(() => {});
  }, []);

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
      useToastStore.getState().showToast('Perfil actualizado');
    } catch {
      useToastStore.getState().showToast('Error al guardar el perfil');
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
      useToastStore.getState().showToast('Error al eliminar la cuenta');
      setDeleting(false);
    }
  }

  function toggleNotification(i: number) {
    setNotifications(prev => prev.map((v, idx) => idx === i ? !v : v));
  }

  return (
    <>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Perfil</div>
        <form onSubmit={saveProfile}>
          <div className="input-group">
            <label htmlFor="profile-name">Nombre</label>
            <input
              id="profile-name"
              className="input"
              autoComplete="name"
              value={profile.name}
              onChange={e => { setProfile(p => ({ ...p, name: e.target.value })); setProfileErrors(prev => { const n = { ...prev }; delete n.name; return n; }); }}
              aria-invalid={profileErrors.name ? true : undefined}
              aria-describedby={profileErrors.name ? 'profile-name-error' : undefined}
              style={{ borderColor: profileErrors.name ? 'var(--danger)' : undefined }}
            />
            {profileErrors.name && <span id="profile-name-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{profileErrors.name}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="profile-email">Email</label>
            <input id="profile-email" className="input" type="email" autoComplete="email" value={profile.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <div className="input-group">
            <label htmlFor="profile-phone">Teléfono</label>
            <input
              id="profile-phone"
              className="input"
              type="tel"
              autoComplete="tel"
              value={profile.phone}
              onChange={e => { setProfile(p => ({ ...p, phone: e.target.value })); setProfileErrors(prev => { const n = { ...prev }; delete n.phone; return n; }); }}
              placeholder="+54 11 0000-0000"
              aria-invalid={profileErrors.phone ? true : undefined}
              aria-describedby={profileErrors.phone ? 'profile-phone-error' : undefined}
              style={{ borderColor: profileErrors.phone ? 'var(--danger)' : undefined }}
            />
            {profileErrors.phone && <span id="profile-phone-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{profileErrors.phone}</span>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Preferencias de notificaciones</div>
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
            <span id={`notif-label-${i}`} style={{ fontSize: 14 }}>{item}</span>
            <button
              type="button"
              role="switch"
              aria-checked={notifications[i]}
              aria-labelledby={`notif-label-${i}`}
              onClick={() => toggleNotification(i)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 'none',
                padding: 0,
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
            </button>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16, border: '1px solid #fecaca' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--danger)' }}>Eliminar cuenta</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Se eliminará permanentemente tu cuenta y todos los datos asociados.
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
            Esta acción es <strong>irreversible</strong>. Se borrarán todos tus datos.
          </p>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label htmlFor="delete-confirm">Escribí <strong>ELIMINAR</strong> para confirmar</label>
            <input
              id="delete-confirm"
              className="input"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="ELIMINAR"
              autoFocus
              style={{ borderColor: deleteConfirm && deleteConfirm !== 'ELIMINAR' ? 'var(--danger)' : undefined }}
            />
          </div>
        </Modal>
      )}

    </>
  );
}
