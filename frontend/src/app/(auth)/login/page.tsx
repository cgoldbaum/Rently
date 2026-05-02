'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { startAuthentication } from '@simplewebauthn/browser';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canSubmit =
    email.trim() &&
    (tab === 'forgot' || (password.trim() && (tab === 'login' || (name.trim() && password === confirmPassword))));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (tab === 'register' && password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (tab === 'login') {
        const { data } = await api.post('/auth/login', { email, password });
        setAuth(data.data.user, data.data.accessToken);
        router.push(data.data.user.role === 'TENANT' ? '/tenant' : '/');
      } else if (tab === 'register') {
        await api.post('/auth/register', { name, email, password, role: 'OWNER' });
        setSuccess('Cuenta creada. Ya podés iniciar sesión.');
        setTab('login');
        setName('');
        setConfirmPassword('');
      } else {
        await api.post('/auth/forgot-password', { email });
        setSuccess('Si el email está registrado, recibirás un link en breve.');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg ?? 'Ocurrió un error, intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometric() {
    if (!email.trim()) {
      setError('Ingresá tu email para usar biometría');
      return;
    }
    setBiometricLoading(true);
    setError('');
    try {
      const { data: optionsRes } = await api.post('/auth/webauthn/authenticate/start', { email });
      const assertionResponse = await startAuthentication({ optionsJSON: optionsRes.data });
      const { data: result } = await api.post('/auth/webauthn/authenticate/finish', {
        email,
        response: assertionResponse,
      });
      setAuth(result.data.user, result.data.accessToken);
      router.push(result.data.user.role === 'TENANT' ? '/tenant' : '/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      if (msg) {
        setError(msg);
      } else if ((err as Error)?.name === 'NotAllowedError') {
        setError('Autenticación cancelada por el usuario');
      } else {
        setError('No se pudo autenticar con biometría');
      }
    } finally {
      setBiometricLoading(false);
    }
  }

  function switchTab(next: 'login' | 'register' | 'forgot') {
    setTab(next);
    setError('');
    setSuccess('');
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <img
            src="/rently_logo.png"
            alt="Rently"
            style={{
              height: 75, width: 75, objectFit: 'contain', borderRadius: 16,
              filter: 'invert(52%) sepia(78%) saturate(600%) hue-rotate(349deg) brightness(70%) contrast(95%)',
            }}
          />
          <span style={{ color: '#e2712b', fontSize: 22, fontWeight: 700, letterSpacing: 1, marginTop: 8 }}>Rently</span>
        </div>

        <div className="auth-title">
          {tab === 'login' ? 'Bienvenido' : tab === 'register' ? 'Crear cuenta' : 'Recuperar contraseña'}
        </div>
        <div className="auth-subtitle">
          {tab === 'login'
            ? 'Ingresá tus datos para continuar'
            : tab === 'register'
            ? 'Completá tus datos para registrarte'
            : 'Te enviaremos un link para restablecer tu contraseña'}
        </div>

        <form onSubmit={handleSubmit}>
          {tab === 'register' && (
            <div className="auth-field">
              <label>Nombre completo</label>
              <input type="text" placeholder="Ej: Martín García" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}
          <div className="auth-field">
            <label>Email</label>
            <input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          {tab !== 'forgot' && (
            <div className="auth-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ margin: 0 }}>Contraseña</label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchTab('forgot')}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          )}
          {tab === 'register' && (
            <div className="auth-field">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{ borderColor: confirmPassword && confirmPassword !== password ? 'var(--danger)' : undefined }}
              />
              {confirmPassword && confirmPassword !== password && (
                <span style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>
                  Las contraseñas no coinciden
                </span>
              )}
            </div>
          )}

          {error && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'var(--accent-bg)', color: 'var(--accent)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 12 }}>
              {success}
            </div>
          )}

          <button className="auth-btn" type="submit" disabled={!canSubmit || loading}>
            {loading ? 'Cargando...' : tab === 'login' ? 'Ingresar' : tab === 'register' ? 'Crear cuenta' : 'Enviar link de recuperación'}
          </button>

          {tab === 'login' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>o</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <button
                type="button"
                onClick={handleBiometric}
                disabled={biometricLoading}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '11px 0', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)',
                  background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, fontWeight: 600,
                  cursor: biometricLoading ? 'not-allowed' : 'pointer', opacity: biometricLoading ? 0.6 : 1,
                  fontFamily: 'var(--font)', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 10a2 2 0 0 0-2 2c0 1.02.078 2.55.384 4" />
                  <path d="M10.188 4.187A8 8 0 0 1 20 12c0 2.4-.5 4.5-1.5 6" />
                  <path d="M6.527 6.527A6 6 0 0 0 6 9c0 4.5.5 6 2 9" />
                  <path d="M12 6a6 6 0 0 1 6 6c0 1-.1 2-.3 3" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
                {biometricLoading ? 'Verificando...' : 'Ingresar con biometría'}
              </button>
            </>
          )}
        </form>

        <div className="auth-switch">
          {tab === 'login'
            ? <>¿No tenés cuenta? <span onClick={() => switchTab('register')}>Registrate</span></>
            : tab === 'register'
            ? <>¿Ya tenés cuenta? <span onClick={() => switchTab('login')}>Iniciá sesión</span></>
            : <>Volver al <span onClick={() => switchTab('login')}>inicio de sesión</span></>
          }
        </div>
      </div>
    </div>
  );
}
