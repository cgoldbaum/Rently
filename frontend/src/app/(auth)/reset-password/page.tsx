'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { resetPasswordSchema, getFieldErrors } from '@/lib/validations';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation('auth');
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

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
    if (!token) return;

    const parsed = resetPasswordSchema.safeParse({ newPassword, confirmPassword });
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg ?? t('resetPassword.invalidLink'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/rently_logo.svg" alt="Rently" style={{ height: 96, width: 96, objectFit: 'contain', borderRadius: 24, filter: 'invert(52%) sepia(78%) saturate(600%) hue-rotate(349deg) brightness(70%) contrast(95%)' }} />
        </div>

        <div className="auth-title">{t('resetPassword.title')}</div>
        <div className="auth-subtitle">{t('resetPassword.subtitle')}</div>

        {success ? (
          <div role="status" style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 15 }}>{t('resetPassword.successMessage')}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>{t('resetPassword.redirecting')}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="newPassword">{t('resetPassword.title')}</label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                placeholder={t('passwordPlaceholderRegister')}
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); clearFieldError('newPassword'); }}
                aria-invalid={fieldErrors.newPassword ? true : undefined}
                aria-describedby={fieldErrors.newPassword ? 'newPassword-error' : undefined}
                style={{ borderColor: fieldErrors.newPassword ? 'var(--danger)' : undefined }}
              />
              {fieldErrors.newPassword && (
                <span id="newPassword-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>
                  {fieldErrors.newPassword}
                </span>
              )}
            </div>
            <div className="auth-field">
              <label htmlFor="confirmPassword">{t('confirmPassword')}</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
                aria-invalid={fieldErrors.confirmPassword ? true : undefined}
                aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                style={{ borderColor: fieldErrors.confirmPassword ? 'var(--danger)' : undefined }}
              />
              {fieldErrors.confirmPassword && (
                <span id="confirmPassword-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>
                  {fieldErrors.confirmPassword}
                </span>
              )}
            </div>

            {error && (
              <div role="alert" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? t('resetPassword.saving') : t('resetPassword.submit')}
            </button>
          </form>
        )}

        <div className="auth-switch">
          <button type="button" onClick={() => router.push('/login')}>{t('backTo')} {t('loginLinkLower')}</button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
