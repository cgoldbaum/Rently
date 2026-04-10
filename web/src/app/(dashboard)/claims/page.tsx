'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

interface Claim {
  id: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  photoUrl?: string;
  createdAt: string;
  tenant: {
    name: string;
    contract: { property: { name?: string; address: string } };
  };
  history: { oldStatus: string; newStatus: string; comment?: string; changedAt: string }[];
}

const CAT_LABELS: Record<string, string> = {
  PLUMBING: 'Plomería', ELECTRICITY: 'Electricidad', STRUCTURE: 'Estructura', OTHER: 'Otro',
};

const filters = [
  ['all', 'Todos'], ['OPEN', 'Abiertos'], ['IN_PROGRESS', 'En curso'], ['RESOLVED', 'Resueltos'],
];

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState('all');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [claimUpdate, setClaimUpdate] = useState({ status: '', comment: '' });
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    api.get('/claims').then(r => setClaims(r.data.data)).catch(() => {});
  }, []);

  const filtered = filter === 'all' ? claims : claims.filter(c => c.status === filter);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClaim || !claimUpdate.status) return;
    setUpdating(true);
    try {
      const { data } = await api.patch(`/claims/${selectedClaim.id}`, {
        status: claimUpdate.status,
        comment: claimUpdate.comment || undefined,
      });
      setClaims(prev => prev.map(c => c.id === selectedClaim.id ? { ...c, status: data.data.status } : c));
      setSelectedClaim(null);
      setToast('Reclamo actualizado');
    } catch {
      setToast('Error al actualizar el reclamo');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="tabs">
          {filters.map(([v, l]) => (
            <button key={v} className={`tab${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} reclamo{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="clipboard" size={32} /></div>
            <div className="empty-text">No hay reclamos{filter !== 'all' ? ' en este estado' : ''}</div>
          </div>
        </div>
      ) : filtered.map(c => (
        <div
          key={c.id}
          className={`claim-card priority-${c.priority}`}
          onClick={() => { setSelectedClaim(c); setClaimUpdate({ status: c.status, comment: '' }); }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="claim-title">{CAT_LABELS[c.category] ?? c.category}</div>
              <div className="claim-meta">
                {c.tenant.contract.property.name ?? c.tenant.contract.property.address} · {c.tenant.name} · {new Date(c.createdAt).toLocaleDateString('es-AR')}
              </div>
            </div>
            <StatusBadge status={c.status} />
          </div>
          <div className="claim-desc">{c.description}</div>
        </div>
      ))}

      {selectedClaim && (
        <Modal
          title={`${CAT_LABELS[selectedClaim.category] ?? selectedClaim.category} — ${selectedClaim.tenant.name}`}
          onClose={() => setSelectedClaim(null)}
          footer={
            selectedClaim.status !== 'RESOLVED' ? (
              <button className="btn btn-primary" onClick={handleUpdate} disabled={updating || !claimUpdate.status}>
                {updating ? 'Guardando...' : 'Actualizar estado'}
              </button>
            ) : undefined
          }
        >
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <StatusBadge status={selectedClaim.status} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Prioridad {selectedClaim.priority === 'HIGH' ? 'Alta' : selectedClaim.priority === 'MEDIUM' ? 'Media' : 'Baja'}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
            {selectedClaim.tenant.contract.property.name ?? selectedClaim.tenant.contract.property.address} · {selectedClaim.tenant.name}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{selectedClaim.description}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Registrado: {new Date(selectedClaim.createdAt).toLocaleDateString('es-AR')}
          </div>

          {selectedClaim.history.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Historial</div>
              {selectedClaim.history.slice(0, 3).map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>{new Date(h.changedAt).toLocaleDateString('es-AR')}</span>
                  <span>{h.oldStatus} → {h.newStatus}</span>
                  {h.comment && <span style={{ color: 'var(--text-muted)' }}>{h.comment}</span>}
                </div>
              ))}
            </div>
          )}

          {selectedClaim.status !== 'RESOLVED' && (
            <>
              <div className="input-group">
                <label>Nuevo estado</label>
                <select className="rently-select" value={claimUpdate.status} onChange={e => setClaimUpdate(f => ({ ...f, status: e.target.value }))}>
                  <option value="">Seleccioná...</option>
                  {selectedClaim.status === 'OPEN' && <option value="IN_PROGRESS">En progreso</option>}
                  <option value="RESOLVED">Resuelto</option>
                </select>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Comentario (opcional)</label>
                <textarea className="rently-textarea" placeholder="Agregar un comentario..." value={claimUpdate.comment} onChange={e => setClaimUpdate(f => ({ ...f, comment: e.target.value }))} />
              </div>
            </>
          )}
        </Modal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}
