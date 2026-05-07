'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { resetPasswordSchema, getFieldErrors } from '@/lib/validations';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      setError(msg ?? 'El link es inválido o ya expiró.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/rently_logo.png" alt="Rently" style={{ height: 96, width: 96, objectFit: 'contain', borderRadius: 24, filter: 'invert(52%) sepia(78%) saturate(600%) hue-rotate(349deg) brightness(70%) contrast(95%)' }} />
        </div>

        <div className="auth-title">Nueva contraseña</div>
        <div className="auth-subtitle">Ingresá tu nueva contraseña para acceder a Rently</div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 15 }}>Contraseña actualizada correctamente</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>Redirigiendo al login...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>Nueva contraseña</label>
              <input
                type="password"
                placeholder="Mínimo 8 caracteres, una mayúscula y un número"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); clearFieldError('newPassword'); }}
                style={{ borderColor: fieldErrors.newPassword ? 'var(--danger)' : undefined }}
              />
              {fieldErrors.newPassword && (
                <span style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>
                  {fieldErrors.newPassword}
                </span>
              )}
            </div>
            <div className="auth-field">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                placeholder="Repetí la contraseña"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
                style={{ borderColor: fieldErrors.confirmPassword ? 'var(--danger)' : undefined }}
              />
              {fieldErrors.confirmPassword && (
                <span style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>
                  {fieldErrors.confirmPassword}
                </span>
              )}
            </div>

            {error && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Actualizar contraseña'}
            </button>
          </form>
        )}

        <div className="auth-switch">
          <span onClick={() => router.push('/login')} style={{ cursor: 'pointer' }}>Volver al inicio de sesión</span>
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
