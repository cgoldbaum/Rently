'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import { startRegistration } from '@simplewebauthn/browser';
import { profileSchema, getFieldErrors } from '@/lib/validations';

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

  type Credential = { id: string; deviceType: string | null; backedUp: boolean; createdAt: string };
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [registeringBio, setRegisteringBio] = useState(false);

  useEffect(() => {
    api.get('/auth/webauthn/credentials').then(r => setCredentials(r.data.data)).catch(() => {});
  }, []);

  async function handleRegisterBiometric() {
    setRegisteringBio(true);
    setToast('');
    try {
      const { data: optionsRes } = await api.post('/auth/webauthn/register/start');
      const credential = await startRegistration({ optionsJSON: optionsRes.data });
      await api.post('/auth/webauthn/register/finish', credential);
      setToast('Biometría registrada correctamente');
      const { data: updated } = await api.get('/auth/webauthn/credentials');
      setCredentials(updated.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      if ((err as Error)?.name === 'NotAllowedError') {
        setToast('Registro cancelado');
      } else {
        setToast(msg ?? 'Error al registrar biometría');
      }
    } finally {
      setRegisteringBio(false);
    }
  }

  async function handleDeleteCredential(id: string) {
    try {
      await api.delete(`/auth/webauthn/credentials/${id}`);
      setCredentials(prev => prev.filter(c => c.id !== id));
      setToast('Dispositivo eliminado');
    } catch {
      setToast('Error al eliminar el dispositivo');
    }
  }

  function credentialLabel(c: Credential) {
    const type = c.deviceType === 'multiDevice' ? 'Multi-dispositivo' : 'Llave de hardware';
    const date = new Date(c.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${type} · Registrado el ${date}`;
  }

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
                <div style={{ fontWeight: 700, fontSize: 16 }}>Plan Pro</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>4–10 propiedades</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 20, color: 'var(--accent)' }}>USD 20</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ mes</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Ahorro estimado vs. inmobiliaria: <strong style={{ color: 'var(--accent)' }}>USD 160/mes</strong>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Próxima facturación: 1 de mayo, 2026
          </div>
          <button className="btn btn-secondary">Cambiar plan</button>
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

      {/* Biometría */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>Acceso biométrico</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Huella dactilar, Face ID o Windows Hello para iniciar sesión sin contraseña
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleRegisterBiometric}
            disabled={registeringBio}
            style={{ flexShrink: 0, marginLeft: 16 }}
          >
            {registeringBio ? 'Registrando...' : '+ Agregar dispositivo'}
          </button>
        </div>

        {credentials.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No hay dispositivos biométricos registrados
          </div>
        ) : credentials.map(c => (
          <div
            key={c.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: '1px solid var(--border-light)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 10a2 2 0 0 0-2 2c0 1.02.078 2.55.384 4" />
                  <path d="M10.188 4.187A8 8 0 0 1 20 12c0 2.4-.5 4.5-1.5 6" />
                  <path d="M6.527 6.527A6 6 0 0 0 6 9c0 4.5.5 6 2 9" />
                  <path d="M12 6a6 6 0 0 1 6 6c0 1-.1 2-.3 3" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{credentialLabel(c)}</div>
                {c.backedUp && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sincronizado en la nube</div>}
              </div>
            </div>
            <button
              onClick={() => handleDeleteCredential(c.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font)' }}
            >
              Eliminar
            </button>
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
