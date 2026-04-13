'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

interface ClaimHistory {
  oldStatus: string;
  newStatus: string;
  comment?: string;
  changedAt: string;
}

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
  history: ClaimHistory[];
}

const CAT_LABELS: Record<string, string> = {
  PLUMBING: 'Plomería', ELECTRICITY: 'Electricidad', STRUCTURE: 'Estructura', OTHER: 'Otro',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierto', IN_PROGRESS: 'En curso', RESOLVED: 'Resuelto',
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  HIGH:   { label: 'Alta',  color: '#dc2626' },
  MEDIUM: { label: 'Media', color: '#d97706' },
  LOW:    { label: 'Baja',  color: '#6b7280' },
};

const filters = [
  ['all', 'Todos'], ['OPEN', 'Abiertos'], ['IN_PROGRESS', 'En curso'], ['RESOLVED', 'Resueltos'],
];

function nextStatuses(current: string): { value: string; label: string }[] {
  if (current === 'OPEN')        return [{ value: 'IN_PROGRESS', label: 'En curso' }, { value: 'RESOLVED', label: 'Resuelto' }];
  if (current === 'IN_PROGRESS') return [{ value: 'OPEN', label: 'Reabrir' }, { value: 'RESOLVED', label: 'Resuelto' }];
  return [];
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState('all');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [claimUpdate, setClaimUpdate] = useState({ status: '', comment: '', priority: '' });
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    api.get('/claims').then(r => setClaims(r.data.data)).catch(() => {});
  }, []);

  const filtered = filter === 'all' ? claims : claims.filter(c => c.status === filter);

  function openClaim(c: Claim) {
    setSelectedClaim(c);
    setClaimUpdate({ status: '', comment: '', priority: c.priority });
  }

  async function handleUpdate() {
    if (!selectedClaim || !claimUpdate.status) return;
    setUpdating(true);
    try {
      const { data } = await api.patch(`/claims/${selectedClaim.id}`, {
        status: claimUpdate.status,
        comment: claimUpdate.comment || undefined,
        priority: claimUpdate.priority || undefined,
      });
      const updated = data.data as Claim;
      setClaims(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
      setSelectedClaim(updated);
      setClaimUpdate({ status: '', comment: '', priority: updated.priority });
      setToast('Reclamo actualizado');
    } catch {
      setToast('Error al actualizar el reclamo');
    } finally {
      setUpdating(false);
    }
  }

  const options = selectedClaim ? nextStatuses(selectedClaim.status) : [];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="tabs">
          {filters.map(([v, l]) => (
            <button key={v} className={`tab${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>
              {l}
              {v !== 'all' && (
                <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--bg-elevated)', borderRadius: 999, padding: '1px 6px' }}>
                  {claims.filter(c => c.status === v).length}
                </span>
              )}
            </button>
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
      ) : filtered.map(c => {
        const prio = PRIORITY_LABELS[c.priority] ?? PRIORITY_LABELS.MEDIUM;
        return (
          <div
            key={c.id}
            className={`claim-card priority-${c.priority}`}
            onClick={() => openClaim(c)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <div className="claim-title">{CAT_LABELS[c.category] ?? c.category}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: prio.color, background: `${prio.color}18`, borderRadius: 4, padding: '1px 6px' }}>
                    {prio.label}
                  </span>
                </div>
                <div className="claim-meta">
                  {c.tenant.contract.property.name ?? c.tenant.contract.property.address} · {c.tenant.name} · {new Date(c.createdAt).toLocaleDateString('es-AR')}
                </div>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <div className="claim-desc">{c.description}</div>
            {c.history.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                Última actualización: {new Date(c.history[0].changedAt).toLocaleDateString('es-AR')}
              </div>
            )}
          </div>
        );
      })}

      {selectedClaim && (
        <Modal
          title={`${CAT_LABELS[selectedClaim.category] ?? selectedClaim.category} — ${selectedClaim.tenant.name}`}
          onClose={() => setSelectedClaim(null)}
          footer={
            selectedClaim.status !== 'RESOLVED' ? (
              <button className="btn btn-primary" onClick={handleUpdate} disabled={updating || !claimUpdate.status}>
                {updating ? 'Guardando...' : 'Guardar cambios'}
              </button>
            ) : undefined
          }
        >
          {/* Estado y propiedad */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <StatusBadge status={selectedClaim.status} />
            <span style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_LABELS[selectedClaim.priority]?.color ?? '#6b7280' }}>
              Prioridad {PRIORITY_LABELS[selectedClaim.priority]?.label ?? selectedClaim.priority}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
            {selectedClaim.tenant.contract.property.name ?? selectedClaim.tenant.contract.property.address} · {selectedClaim.tenant.name}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>{selectedClaim.description}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Registrado: {new Date(selectedClaim.createdAt).toLocaleDateString('es-AR')}
          </div>

          {/* Historial completo */}
          {selectedClaim.history.length > 0 && (
            <div style={{ marginBottom: 20, padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
                Historial de cambios
              </div>
              {selectedClaim.history.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 8, marginBottom: i < selectedClaim.history.length - 1 ? 8 : 0, borderBottom: i < selectedClaim.history.length - 1 ? '1px solid var(--border-light)' : 'none', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontSize: 12 }}>
                    {new Date(h.changedAt).toLocaleDateString('es-AR')}
                  </span>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {STATUS_LABELS[h.oldStatus] ?? h.oldStatus}
                    </span>
                    <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>→</span>
                    <span style={{ fontWeight: 600 }}>
                      {STATUS_LABELS[h.newStatus] ?? h.newStatus}
                    </span>
                    {h.comment && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>"{h.comment}"</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Controles de actualización */}
          {selectedClaim.status !== 'RESOLVED' && (
            <>
              <div className="grid-2">
                <div className="input-group">
                  <label>Cambiar estado</label>
                  <select
                    className="rently-select"
                    value={claimUpdate.status}
                    onChange={e => setClaimUpdate(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="">Seleccioná...</option>
                    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Prioridad</label>
                  <select
                    className="rently-select"
                    value={claimUpdate.priority}
                    onChange={e => setClaimUpdate(f => ({ ...f, priority: e.target.value }))}
                  >
                    <option value="HIGH">Alta</option>
                    <option value="MEDIUM">Media</option>
                    <option value="LOW">Baja</option>
                  </select>
                </div>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Comentario (opcional)</label>
                <textarea
                  className="rently-textarea"
                  placeholder="Agregar un comentario sobre el cambio..."
                  value={claimUpdate.comment}
                  onChange={e => setClaimUpdate(f => ({ ...f, comment: e.target.value }))}
                />
              </div>
            </>
          )}
        </Modal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}
