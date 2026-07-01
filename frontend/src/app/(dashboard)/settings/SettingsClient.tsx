'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useLocaleStore } from '@/store/locale';
import { useThemeStore, type ThemePreference } from '@/store/theme';
import { useToastStore } from '@/store/toast';
import Modal from '@/components/Modal';
import Icon from '@/components/Icon';
import { profileSchema, getFieldErrors } from '@/lib/validations';
import type { LanguagePreference } from '@rently/shared';
import type { SubscriptionSummary } from '@/types/subscription';

const LANGUAGE_OPTIONS: LanguagePreference[] = ['system', 'es', 'en'];
const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

const NOTIFICATION_KEYS = [
  'paymentReceived',
  'paymentLate',
  'newClaim',
  'adjustmentApplied',
  'contractExpiry',
];

export default function SettingsClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clearAuth } = useAuthStore();
  const { t } = useTranslation('settings');
  const languagePref = useLocaleStore(s => s.preference);
  const setLanguagePref = useLocaleStore(s => s.setPreference);
  const themePref = useThemeStore(s => s.preference);
  const setThemePref = useThemeStore(s => s.setPreference);
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [notifications, setNotifications] = useState([true, true, true, true, false]);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  const { data: subscription } = useQuery<SubscriptionSummary | null>({
    queryKey: ['owner-subscription-summary'],
    queryFn: () => api.get('/owner/subscription').then(r => r.data.data),
  });

  const saveProfileMutation = useMutation({
    mutationFn: () => api.patch('/auth/me', { name: profile.name, phone: profile.phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      useToastStore.getState().showToast(t('profile.updated'));
    },
    onError: () => {
      useToastStore.getState().showToast(t('profile.saveError'));
    },
  });

  function fmtMoney(amount: number, currency: string) {
    return amount.toLocaleString('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 });
  }

  function limitLabel(limit: number | null) {
    return limit == null ? t('subscription.unlimited') : t('subscription.upTo', { limit });
  }

  async function startCheckout(planCode: string) {
    setCheckoutPlan(planCode);
    useToastStore.getState().clearToast();
    try {
      const { data } = await api.post('/owner/subscription/checkout', { planCode });
      if (data.data.initPoint) {
        if (typeof window !== 'undefined') {
          window.location.href = data.data.initPoint;
        }
        return;
      }
      useToastStore.getState().showToast(t('subscription.noPaymentLink'));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      useToastStore.getState().showToast(msg ?? t('subscription.checkoutError'));
    } finally {
      setCheckoutPlan(null);
    }
  }

  const { data: authUser } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get('/auth/me').then(r => r.data.data ?? r.data),
  });

  useEffect(() => {
    if (authUser) {
      setProfile({ name: authUser.name ?? '', email: authUser.email ?? '', phone: authUser.phone ?? '' });
    }
  }, [authUser]);

  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get('subscription') === 'success') {
      useToastStore.getState().showToast(t('subscription.activated'));
      queryClient.invalidateQueries({ queryKey: ['owner-subscription-summary'] });
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('subscription');
        const newUrl = window.location.pathname + (params.toString() ? `?${params}` : '');
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [searchParams, queryClient]);

  const deleteMutation = useMutation({
    mutationFn: () => api.delete('/auth/me'),
    onSuccess: () => {
      clearAuth();
      router.replace('/login');
    },
    onError: () => {
      useToastStore.getState().showToast(t('danger.deleteError'));
    },
  });

  function saveProfile(e: React.SyntheticEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse({ name: profile.name, phone: profile.phone });
    if (!parsed.success) {
      setProfileErrors(getFieldErrors(parsed.error));
      return;
    }
    setProfileErrors({});
    saveProfileMutation.mutate();
  }

  function handleDeleteAccount() {
    deleteMutation.mutate();
  }

  function toggleNotification(i: number) {
    setNotifications(prev => prev.map((v, idx) => idx === i ? !v : v));
  }

  const languageMutation = useMutation({
    mutationFn: (language: LanguagePreference) => api.patch('/auth/me', { language }),
    onError: () => useToastStore.getState().showToast(t('language.saveError')),
  });

  function changeLanguage(pref: LanguagePreference) {
    setLanguagePref(pref);
    languageMutation.mutate(pref);
  }

  return (
    <>
      <div className="grid-2">
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
            <button type="submit" className="btn btn-primary" disabled={saveProfileMutation.isPending}>
              {saveProfileMutation.isPending ? t('profile.saving') : t('profile.save')}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>{t('subscription.title')}</div>
          <div style={{ padding: 16, background: 'var(--accent-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(91,123,94,0.2)', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {subscription?.subscription ? t('subscription.planName', { name: subscription.subscription.plan.name }) : t('subscription.noPlan')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {subscription?.subscription ? limitLabel(subscription.subscription.plan.propertyLimit) : t('subscription.choosePlan')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 20, color: 'var(--accent)' }}>
                  {subscription?.subscription ? fmtMoney(subscription.subscription.plan.price, subscription.subscription.plan.currency) : '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('subscription.perMonth')}</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {t('subscription.currentUsage')} <strong style={{ color: 'var(--accent)' }}>
              {subscription
                ? subscription.usage.propertyLimit == null
                  ? t('subscription.propertiesCount', { count: subscription.usage.properties })
                  : t('subscription.propertiesUsage', { used: subscription.usage.properties, limit: subscription.usage.propertyLimit })
                : t('subscription.loading')}
            </strong>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            {t('subscription.status')} <strong>{subscription?.subscription?.status ?? t('subscription.noSubscription')}</strong>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {(subscription?.plans ?? []).map(plan => {
              const isCurrent = subscription?.subscription?.plan.code === plan.code;
              return (
                <button
                  key={plan.id}
                  className={isCurrent ? 'btn' : 'btn btn-secondary'}
                  disabled={checkoutPlan === plan.code || isCurrent}
                  onClick={() => startCheckout(plan.code)}
                  style={
                    isCurrent
                      ? { justifyContent: 'space-between', background: 'var(--accent)', color: '#fff', opacity: 1, cursor: 'default', border: '1px solid var(--accent)', boxShadow: '0 2px 8px rgba(91,123,94,0.28)' }
                      : { justifyContent: 'space-between' }
                  }
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    {isCurrent && <Icon name="check" size={15} />}
                    {plan.name} · {limitLabel(plan.propertyLimit)}{isCurrent ? ` · ${t('subscription.currentPlan')}` : ''}
                  </span>
                  <span>{checkoutPlan === plan.code ? t('subscription.opening') : fmtMoney(plan.price, plan.currency)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>{t('notifications.title')}</div>
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
        <div className="card-title" style={{ marginBottom: 4 }}>{t('language.label')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{t('language.description')}</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {LANGUAGE_OPTIONS.map(opt => {
            const active = languagePref === opt;
            return (
              <button
                key={opt}
                type="button"
                className={active ? 'btn' : 'btn btn-secondary'}
                aria-pressed={active}
                onClick={() => changeLanguage(opt)}
                style={
                  active
                    ? { justifyContent: 'space-between', background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)', boxShadow: '0 2px 8px rgba(91,123,94,0.28)' }
                    : { justifyContent: 'space-between' }
                }
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  {active && <Icon name="check" size={15} />}
                  {t(`language.${opt}`)}
                </span>
              </button>
            );
          })}
        </div>
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

      {/* Danger zone */}
      <div className="card" style={{ marginTop: 16, border: '1px solid var(--danger-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--danger)' }}>{t('danger.title')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              {t('danger.description')}
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
                disabled={deleteConfirm !== t('danger.confirmWord') || deleteMutation.isPending}
                onClick={handleDeleteAccount}
              >
                {deleteMutation.isPending ? t('danger.deleting') : t('danger.confirm')}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
            {t('danger.modalBody')}
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
