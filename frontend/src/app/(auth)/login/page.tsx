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
          {tab === 'login' ? 'Bienvenido' : tab === 'register' ? 'Crear cuenta' : 'Recuperar contraseña'}
        </div>
        <div className="auth-subtitle">
          {tab === 'login'
            ? 'Ingresá tus datos para continuar'
            : tab === 'register'
            ? 'Registrate como propietario o inquilino'
            : 'Te enviaremos un link para restablecer tu contraseña'}
        </div>

        {tab !== 'forgot' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={role === 'OWNER'}
              onChange={e => setRole(e.target.checked ? 'OWNER' : 'TENANT')}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Soy propietario</span>
          </label>
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
