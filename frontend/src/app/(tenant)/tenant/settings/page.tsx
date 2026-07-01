'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useThemeStore, type ThemePreference } from '@/store/theme';
import { useToastStore } from '@/store/toast';
import Modal from '@/components/Modal';
import Icon from '@/components/Icon';
import { profileSchema, getFieldErrors } from '@/lib/validations';

const NOTIFICATION_KEYS = [
  'paymentReceived',
  'paymentLate',
  'newClaim',
  'adjustmentApplied',
  'contractExpiry',
];

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

export default function TenantSettingsPage() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const { t } = useTranslation('settings');
  const themePref = useThemeStore(s => s.preference);
  const setThemePref = useThemeStore(s => s.setPreference);
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
      useToastStore.getState().showToast(t('profile.updated'));
    } catch {
      useToastStore.getState().showToast(t('profile.saveError'));
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
      useToastStore.getState().showToast(t('danger.deleteError'));
      setDeleting(false);
    }
  }

  function toggleNotification(i: number) {
    setNotifications(prev => prev.map((v, idx) => idx === i ? !v : v));
  }

  return (
    <>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>{t('profile.title')}</div>
        <form onSubmit={saveProfile}>
          <div className="input-group">
            <label htmlFor="profile-name">{t('profile.name')}</label>
            <input
              id="profile-name"
              className="input"
              autoComplete="name"
              value={profile.name}
              onChange={e => { setProfile(p => ({ ...p, name: e.target.value })); setProfileErrors(prev => { const n = { ...prev }; delete n.name; return n; }); }}
              placeholder={t('profile.namePlaceholder')}
              aria-invalid={profileErrors.name ? true : undefined}
              aria-describedby={profileErrors.name ? 'profile-name-error' : undefined}
              style={{ borderColor: profileErrors.name ? 'var(--danger)' : undefined }}
            />
            {profileErrors.name && <span id="profile-name-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{profileErrors.name}</span>}
          </div>
          <div className="input-group">
            <label htmlFor="profile-email">{t('profile.email')}</label>
            <input id="profile-email" className="input" type="email" autoComplete="email" value={profile.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <div className="input-group">
            <label htmlFor="profile-phone">{t('profile.phone')}</label>
            <input
              id="profile-phone"
              className="input"
              type="tel"
              autoComplete="tel"
              value={profile.phone}
              onChange={e => { setProfile(p => ({ ...p, phone: e.target.value })); setProfileErrors(prev => { const n = { ...prev }; delete n.phone; return n; }); }}
              placeholder={t('profile.phonePlaceholder')}
              aria-invalid={profileErrors.phone ? true : undefined}
              aria-describedby={profileErrors.phone ? 'profile-phone-error' : undefined}
              style={{ borderColor: profileErrors.phone ? 'var(--danger)' : undefined }}
            />
            {profileErrors.phone && <span id="profile-phone-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{profileErrors.phone}</span>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t('profile.saving') : t('profile.save')}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>{t('notifications.preferencesTitle')}</div>
        {NOTIFICATION_KEYS.map((key, i) => (
          <div
            key={key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: i < NOTIFICATION_KEYS.length - 1 ? '1px solid var(--border-light)' : 'none',
            }}
          >
            <span id={`notif-label-${i}`} style={{ fontSize: 14 }}>{t(`domain:notification.${key}`)}</span>
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

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title" style={{ marginBottom: 4 }}>{t('theme.label')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{t('theme.description')}</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {THEME_OPTIONS.map(opt => {
            const active = themePref === opt;
            return (
              <button
                key={opt}
                type="button"
                className={active ? 'btn' : 'btn btn-secondary'}
                aria-pressed={active}
                onClick={() => setThemePref(opt)}
                style={
                  active
                    ? { justifyContent: 'space-between', background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)', boxShadow: '0 2px 8px rgba(91,123,94,0.28)' }
                    : { justifyContent: 'space-between' }
                }
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  {active && <Icon name="check" size={15} />}
                  {t(`theme.${opt}`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16, border: '1px solid var(--danger-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--danger)' }}>{t('danger.title')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              {t('danger.tenantDescription')}
            </div>
          </div>
          <button
            className="btn"
            style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)', flexShrink: 0, marginLeft: 16 }}
            onClick={() => { setDeleteConfirm(''); setShowDeleteModal(true); }}
          >
            {t('danger.button')}
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <Modal
          title={t('danger.modalTitle')}
          onClose={() => setShowDeleteModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>{t('danger.cancel')}</button>
              <button
                className="btn"
                style={{ background: 'var(--danger)', color: '#fff' }}
                disabled={deleteConfirm !== t('danger.confirmWord') || deleting}
                onClick={handleDeleteAccount}
              >
                {deleting ? t('danger.deleting') : t('danger.confirm')}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
            {t('danger.tenantModalBody')}
          </p>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label htmlFor="delete-confirm">{t('danger.confirmLabel')}</label>
            <input
              id="delete-confirm"
              className="input"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={t('danger.confirmWord')}
              autoFocus
              style={{ borderColor: deleteConfirm && deleteConfirm !== t('danger.confirmWord') ? 'var(--danger)' : undefined }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
