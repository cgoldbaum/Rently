'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canSubmit = email.trim() && password.trim() && (tab === 'login' || name.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (tab === 'login') {
        const { data } = await api.post('/auth/login', { email, password });
        setAuth(data.data.user, data.data.accessToken);
        router.push('/');
      } else {
        await api.post('/auth/register', { name, email, password });
        setSuccess('Cuenta creada. Podés iniciar sesión.');
        setTab('login');
        setName('');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg ?? 'Ocurrió un error, intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">R</div>
          <span className="auth-logo-text">Rently</span>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); setError(''); setSuccess(''); }}>
            Iniciar sesión
          </button>
          <button className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => { setTab('register'); setError(''); setSuccess(''); }}>
            Registrarse
          </button>
        </div>

        <div className="auth-title">{tab === 'login' ? 'Bienvenido de nuevo' : 'Crear cuenta'}</div>
        <div className="auth-subtitle">Gestioná tus propiedades con Rently</div>

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
          <div className="auth-field">
            <label>Contraseña</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

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
            {loading ? 'Cargando...' : tab === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>

        <div className="auth-switch">
          {tab === 'login'
            ? <>¿No tenés cuenta? <span onClick={() => setTab('register')}>Registrate</span></>
            : <>¿Ya tenés cuenta? <span onClick={() => setTab('login')}>Iniciá sesión</span></>
          }
        </div>
      </div>
    </div>
  );
}
