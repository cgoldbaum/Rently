'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  const canSubmit = newPassword.trim().length >= 6 && newPassword === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !token) return;
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
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div className="auth-field">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                placeholder="Repetí la contraseña"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{ borderColor: confirmPassword && confirmPassword !== newPassword ? 'var(--danger)' : undefined }}
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <span style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>
                  Las contraseñas no coinciden
                </span>
              )}
            </div>

            {error && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button className="auth-btn" type="submit" disabled={!canSubmit || loading}>
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
