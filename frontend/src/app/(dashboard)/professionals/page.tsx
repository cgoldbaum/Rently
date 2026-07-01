'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import { useToastStore } from '@/store/toast';

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
  { id: 1, name: 'Carlos Eléctrica SRL', category: 'ELECTRICIAN', rating: 4.8, jobs: 47, phone: '+54 11 5555-1234', verified: true },
  { id: 2, name: 'Plomería Express', category: 'PLUMBER', rating: 4.6, jobs: 63, phone: '+54 11 5555-5678', verified: true },
  { id: 3, name: 'Gasista Martín López', category: 'GASFITTER', rating: 4.9, jobs: 31, phone: '+54 11 5555-9012', verified: true },
  { id: 4, name: 'Cerrajería 24hs', category: 'LOCKSMITH', rating: 4.3, jobs: 89, phone: '+54 11 5555-3456', verified: true },
  { id: 5, name: 'Pinturas del Sur', category: 'PAINTER', rating: 4.7, jobs: 55, phone: '+54 11 5555-7890', verified: true },
];

const CATEGORIES = ['ALL', 'ELECTRICIAN', 'PLUMBER', 'GASFITTER', 'LOCKSMITH', 'PAINTER'];
const URGENCIES = ['NORMAL', 'URGENT', 'EMERGENCY'];

export default function ProfessionalsPage() {
  const { t } = useTranslation('professionals');
  const [category, setCategory] = useState('ALL');
  const [showRequest, setShowRequest] = useState<Professional | null>(null);
  const [requestForm, setRequestForm] = useState({ description: '', urgency: 'NORMAL' });

  const filtered = category === 'ALL' ? PROFESSIONALS : PROFESSIONALS.filter(p => p.category === category);

  function sendRequest() {
    setShowRequest(null);
    setRequestForm({ description: '', urgency: 'NORMAL' });
    useToastStore.getState().showToast(t('toastSent'));
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          {t('intro')}
        </p>
        <div className="tabs">
          {CATEGORIES.map(c => (
            <button key={c} className={`tab${category === c ? ' active' : ''}`} onClick={() => setCategory(c)}>{t(`category.${c}`)}</button>
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
              {pro.verified && <span style={{ color: 'var(--accent)', fontSize: 12, marginLeft: 6 }}>{t('verified')}</span>}
            </div>
            <div className="pro-category">{t(`category.${pro.category}`)}</div>
            <div className="pro-stats">
              <span className="pro-stat"><span className="star">★</span> {pro.rating}</span>
              <span className="pro-stat">{t('jobs', { count: pro.jobs })}</span>
              <span className="pro-stat">{pro.phone}</span>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowRequest(pro); setRequestForm({ description: '', urgency: 'NORMAL' }); }}>
            {t('request')}
          </button>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="wrench" size={32} /></div>
            <div className="empty-text">{t('empty')}</div>
          </div>
        </div>
      )}

      {showRequest && (
        <Modal
          title={t('modal.title', { name: showRequest.name })}
          onClose={() => setShowRequest(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowRequest(null)}>{t('modal.cancel')}</button>
              <button className="btn btn-primary" onClick={sendRequest}>{t('modal.send')}</button>
            </>
          }
        >
          <div className="input-group">
            <label htmlFor="prof-description">{t('modal.description')}</label>
            <textarea
              id="prof-description"
              className="rently-textarea"
              placeholder={t('modal.descriptionPlaceholder')}
              value={requestForm.description}
              onChange={e => setRequestForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="input-group">
            <label htmlFor="prof-urgency">{t('modal.urgency')}</label>
            <select
              id="prof-urgency"
              className="rently-select"
              value={requestForm.urgency}
              onChange={e => setRequestForm(f => ({ ...f, urgency: e.target.value }))}
            >
              {URGENCIES.map(u => <option key={u} value={u}>{t(`urgency.${u}`)}</option>)}
            </select>
          </div>
        </Modal>
      )}

    </>
  );
}
