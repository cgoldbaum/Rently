'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { loginSchema, registerSchema, forgotPasswordSchema, getFieldErrors } from '@/lib/validations';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    setError('');
    setSuccess('');

    let parsed;
    if (tab === 'login') {
      parsed = loginSchema.safeParse({ email, password });
    } else if (tab === 'register') {
      parsed = registerSchema.safeParse({ name, email, password, confirmPassword });
    } else {
      parsed = forgotPasswordSchema.safeParse({ email });
    }

    if (!parsed.success) {
      const errs = getFieldErrors(parsed.error);
      setFieldErrors(errs);
      const firstInvalid = ['name', 'email', 'password', 'confirmPassword'].find(f => errs[f]);
      if (firstInvalid) document.getElementById(firstInvalid)?.focus();
      return;
    }
    setFieldErrors({});

    setLoading(true);
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

  function switchTab(next: 'login' | 'register' | 'forgot') {
    setTab(next);
    setError('');
    setSuccess('');
    setFieldErrors({});
  }

  const fe = fieldErrors;

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <img
            src="/rently_logo.svg"
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
              <label htmlFor="name">Nombre completo</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Ej: Martín García"
                value={name}
                onChange={e => { setName(e.target.value); clearFieldError('name'); }}
                aria-invalid={fe.name ? true : undefined}
                aria-describedby={fe.name ? 'name-error' : undefined}
                style={{ borderColor: fe.name ? 'var(--danger)' : undefined }}
              />
              {fe.name && <span id="name-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{fe.name}</span>}
            </div>
          )}
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); clearFieldError('email'); }}
              aria-invalid={fe.email ? true : undefined}
              aria-describedby={fe.email ? 'email-error' : undefined}
              style={{ borderColor: fe.email ? 'var(--danger)' : undefined }}
            />
            {fe.email && <span id="email-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{fe.email}</span>}
          </div>
          {tab !== 'forgot' && (
            <div className="auth-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label htmlFor="password" style={{ margin: 0 }}>Contraseña</label>
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
              <input
                id="password"
                type="password"
                autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                placeholder={tab === 'register' ? 'Mínimo 8 caracteres, una mayúscula y un número' : '••••••••'}
                value={password}
                onChange={e => { setPassword(e.target.value); clearFieldError('password'); }}
                aria-invalid={fe.password ? true : undefined}
                aria-describedby={fe.password ? 'password-error' : undefined}
                style={{ borderColor: fe.password ? 'var(--danger)' : undefined }}
              />
              {fe.password && <span id="password-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{fe.password}</span>}
            </div>
          )}
          {tab === 'register' && (
            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
                aria-invalid={fe.confirmPassword ? true : undefined}
                aria-describedby={fe.confirmPassword ? 'confirmPassword-error' : undefined}
                style={{ borderColor: fe.confirmPassword ? 'var(--danger)' : undefined }}
              />
              {fe.confirmPassword && (
                <span id="confirmPassword-error" style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>
                  {fe.confirmPassword}
                </span>
              )}
            </div>
          )}

          {error && (
            <div role="alert" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}
          {success && (
            <div role="status" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 12 }}>
              {success}
            </div>
          )}

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Cargando...' : tab === 'login' ? 'Ingresar' : tab === 'register' ? 'Crear cuenta' : 'Enviar link de recuperación'}
          </button>

        </form>

        <div className="auth-switch">
          {tab === 'login'
            ? <>¿No tenés cuenta? <button type="button" onClick={() => switchTab('register')}>Registrate</button></>
            : tab === 'register'
            ? <>¿Ya tenés cuenta? <button type="button" onClick={() => switchTab('login')}>Iniciá sesión</button></>
            : <>Volver al <button type="button" onClick={() => switchTab('login')}>inicio de sesión</button></>
          }
        </div>
      </div>
    </div>
  );
}
