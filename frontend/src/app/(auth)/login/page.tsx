'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';

type Role = 'OWNER' | 'TENANT';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [role, setRole] = useState<Role>('OWNER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
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
        const { data } = await api.post('/auth/login', { email, password, role });
        setAuth(data.data.user, data.data.accessToken);
        router.push(data.data.user.role === 'TENANT' ? '/tenant' : '/');
      } else if (tab === 'register') {
        await api.post('/auth/register', { name, email, password, role });
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

  function switchTab(next: 'login' | 'register' | 'forgot') {
    setTab(next);
    setError('');
    setSuccess('');
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/rently_logo.png" alt="Rently" style={{ height: 96, width: 96, objectFit: 'contain', borderRadius: 24 }} />
        </div>

        {tab !== 'forgot' && (
          <div className="auth-tabs">
            <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => switchTab('login')}>
              Iniciar sesión
            </button>
            <button className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => switchTab('register')}>
              Registrarse
            </button>
          </div>
        )}

        <div className="auth-title">
          {tab === 'login' ? 'Bienvenido de nuevo' : tab === 'register' ? 'Crear cuenta' : 'Recuperar contraseña'}
        </div>
        <div className="auth-subtitle">
          {tab === 'login' ? 'Ingresá a tu cuenta de Rently' : tab === 'register' ? 'Registrate como propietario o inquilino' : 'Te enviaremos un link para restablecer tu contraseña'}
        </div>

        {/* Role selector — only for login/register */}
        {tab !== 'forgot' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['OWNER', 'TENANT'] as Role[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${role === r ? 'var(--accent)' : 'var(--border)'}`,
                  background: role === r ? 'var(--accent-bg)' : 'var(--bg-card)',
                  color: role === r ? 'var(--accent)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {r === 'OWNER' ? 'Soy propietario' : 'Soy inquilino'}
              </button>
            ))}
          </div>
        )}

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
              <label>Contraseña</label>
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
        </form>

        {tab === 'login' && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button
              type="button"
              onClick={() => switchTab('forgot')}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}

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
