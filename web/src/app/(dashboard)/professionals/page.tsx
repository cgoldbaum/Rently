'use client';

import { useState } from 'react';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

interface Professional {
  id: number;
  name: string;
  category: string;
  rating: number;
  jobs: number;
  phone: string;
  verified: boolean;
}

const PROFESSIONALS: Professional[] = [
  { id: 1, name: 'Carlos Eléctrica SRL', category: 'Electricista', rating: 4.8, jobs: 47, phone: '+54 11 5555-1234', verified: true },
  { id: 2, name: 'Plomería Express', category: 'Plomero', rating: 4.6, jobs: 63, phone: '+54 11 5555-5678', verified: true },
  { id: 3, name: 'Gasista Martín López', category: 'Gasista', rating: 4.9, jobs: 31, phone: '+54 11 5555-9012', verified: true },
  { id: 4, name: 'Cerrajería 24hs', category: 'Cerrajero', rating: 4.3, jobs: 89, phone: '+54 11 5555-3456', verified: true },
  { id: 5, name: 'Pinturas del Sur', category: 'Pintor', rating: 4.7, jobs: 55, phone: '+54 11 5555-7890', verified: true },
];

const CATEGORIES = ['Todos', 'Electricista', 'Plomero', 'Gasista', 'Cerrajero', 'Pintor'];

export default function ProfessionalsPage() {
  const [category, setCategory] = useState('Todos');
  const [showRequest, setShowRequest] = useState<Professional | null>(null);
  const [requestForm, setRequestForm] = useState({ description: '', urgency: 'Normal (48hs)' });
  const [toast, setToast] = useState('');

  const filtered = category === 'Todos' ? PROFESSIONALS : PROFESSIONALS.filter(p => p.category === category);

  function sendRequest() {
    setShowRequest(null);
    setRequestForm({ description: '', urgency: 'Normal (48hs)' });
    setToast('Solicitud enviada al profesional');
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          Red verificada de profesionales que conocen tus propiedades y su historial. El profesional llega con contexto, no a ciegas.
        </p>
        <div className="tabs">
          {CATEGORIES.map(c => (
            <button key={c} className={`tab${category === c ? ' active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
      </div>

      {filtered.map(pro => (
        <div className="pro-card" key={pro.id}>
          <div className="pro-avatar">
            <Icon name="wrench" size={20} color="var(--text-muted)" />
          </div>
          <div className="pro-info">
            <div className="pro-name">
              {pro.name}
              {pro.verified && <span style={{ color: 'var(--accent)', fontSize: 12, marginLeft: 6 }}>✓ Verificado</span>}
            </div>
            <div className="pro-category">{pro.category}</div>
            <div className="pro-stats">
              <span className="pro-stat"><span className="star">★</span> {pro.rating}</span>
              <span className="pro-stat">{pro.jobs} trabajos</span>
              <span className="pro-stat">{pro.phone}</span>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowRequest(pro); setRequestForm({ description: '', urgency: 'Normal (48hs)' }); }}>
            Solicitar
          </button>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="wrench" size={32} /></div>
            <div className="empty-text">No hay profesionales en esta categoría</div>
          </div>
        </div>
      )}

      {showRequest && (
        <Modal
          title={`Solicitar servicio — ${showRequest.name}`}
          onClose={() => setShowRequest(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowRequest(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={sendRequest}>Enviar solicitud</button>
            </>
          }
        >
          <div className="input-group">
            <label>Descripción del trabajo</label>
            <textarea
              className="rently-textarea"
              placeholder="Describí qué necesitás que haga el profesional..."
              value={requestForm.description}
              onChange={e => setRequestForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="input-group">
            <label>Urgencia</label>
            <select
              className="rently-select"
              value={requestForm.urgency}
              onChange={e => setRequestForm(f => ({ ...f, urgency: e.target.value }))}
            >
              <option>Normal (48hs)</option>
              <option>Urgente (24hs)</option>
              <option>Emergencia (hoy)</option>
            </select>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}
