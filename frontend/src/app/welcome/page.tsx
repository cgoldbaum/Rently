'use client';

import Link from 'next/link';

const INFO = [
  { n: '01', t: 'Cobros y expensas', d: 'Seguí alquileres, expensas y vencimientos sin planillas. Cada pago queda registrado.' },
  { n: '02', t: 'Reclamos con seguimiento', d: 'El inquilino reporta, vos ves prioridad y estado. Nada se pierde en el WhatsApp.' },
  { n: '03', t: 'Contratos y ajustes', d: 'Documentos, vencimientos y aumentos por índice, siempre al día.' },
];

export default function WelcomePage() {
  return (
    <div className="lp3d">
      {/* Primera pantalla: la foto */}
      <section className="lp3d-hero-screen">
        <div className="lp3d-bg" />
        <div className="lp3d-scrim" />

        <div className="lp3d-ui">
          <header className="lp3d-nav">
            <Link href="/welcome" className="lp3d-brand"><span className="lp3d-mark">R</span>Rently</Link>
            <Link href="/login" className="lp3d-navlink">Ingresar</Link>
          </header>

          <div className="lp3d-hero">
            <h1 className="lp3d-title">Rently</h1>
            <p className="lp3d-tag">Tus alquileres viven acá.<br />Cobros, reclamos y contratos, en un solo lugar.</p>
            <div className="lp3d-actions">
              <Link href="/register" className="lp3d-btn lp3d-btn-solid">Empezar</Link>
              <Link href="/login" className="lp3d-btn lp3d-btn-light">Iniciar sesión</Link>
            </div>
          </div>

          <footer className="lp3d-foot">
            <a href="#info" className="lp3d-scroll">Conocé más<span className="lp3d-arrow">↓</span></a>
          </footer>
        </div>
      </section>

      {/* Al scrollear: lo esencial */}
      <section className="lp-info" id="info">
        <div className="lp-info-wrap">
          <span className="lp-info-eyebrow">Qué es Rently</span>
          <h2 className="lp-info-title">Todo el alquiler, ordenado en un solo lugar.</h2>
          <p className="lp-info-sub">Una herramienta para propietarios e inquilinos: cobrar, reclamar y gestionar contratos sin planillas ni mensajes sueltos.</p>

          <div className="lp-info-grid">
            {INFO.map((c) => (
              <article key={c.n} className="lp-info-card">
                <div className="lp-info-num">{c.n}</div>
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </article>
            ))}
          </div>

          <div className="lp-info-cta">
            <Link href="/register" className="lp-info-btn lp-info-solid">Crear cuenta</Link>
            <Link href="/login" className="lp-info-btn lp-info-ghost">Ya tengo cuenta</Link>
          </div>

          <div className="lp-info-foot">© {new Date().getFullYear()} Rently · Gestión de alquileres</div>
        </div>
      </section>
    </div>
  );
}
