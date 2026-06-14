'use client';

import Icon from '@/components/Icon';
import { formatDate } from '@rently/shared';

interface ClaimHistory {
  oldStatus: string;
  newStatus: string;
  comment?: string;
  photoUrl?: string;
  changedAt: string;
}

interface Claim {
  id: string;
  title?: string;
  category: string;
  description: string;
  status: string;
  priority: string;
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

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:        { label: 'Abierto',  color: '#dc2626', bg: '#fef2f2' },
  IN_PROGRESS: { label: 'En curso', color: '#d97706', bg: '#fffbeb' },
  RESOLVED:    { label: 'Resuelto', color: '#16a34a', bg: '#f0fdf4' },
};

const PRIORITY_STYLE: Record<string, { label: string; color: string }> = {
  HIGH:   { label: 'Urgente', color: '#dc2626' },
  MEDIUM: { label: 'Media',   color: '#d97706' },
  LOW:    { label: 'Baja',    color: '#6b7280' },
};

interface ClaimDetailModalProps {
  selectedClaim: Claim | null;
  onClose: () => void;
  apiBase: string;
  resolveOpen: boolean;
  setResolveOpen: (open: boolean) => void;
  comment: string;
  setComment: (comment: string) => void;
  photo: File | null;
  setPhoto: (photo: File | null) => void;
  photoPreview: string | null;
  setPhotoPreview: (preview: string | null) => void;
  inProgressOpen: boolean;
  setInProgressOpen: (open: boolean) => void;
  inProgressComment: string;
  setInProgressComment: (comment: string) => void;
  inProgressPending: boolean;
  inProgressError: boolean;
  onInProgressConfirm: (id: string, comment: string) => void;
  resolvePending: boolean;
  resolveError: boolean;
  onResolveConfirm: (id: string, comment: string, photo: File | null) => void;
  onOpenResolve: () => void;
  onOpenInProgress: () => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ClaimDetailModal({
  selectedClaim,
  onClose,
  apiBase,
  resolveOpen,
  setResolveOpen,
  comment,
  setComment,
  photo,
  setPhoto,
  photoPreview,
  setPhotoPreview,
  inProgressOpen,
  setInProgressOpen,
  inProgressComment,
  setInProgressComment,
  inProgressPending,
  inProgressError,
  onInProgressConfirm,
  resolvePending,
  resolveError,
  onResolveConfirm,
  onOpenResolve,
  onOpenInProgress,
  onPhotoChange,
}: ClaimDetailModalProps) {
  if (!selectedClaim) return null;

  const st = STATUS_STYLE[selectedClaim.status] ?? STATUS_STYLE.OPEN;
  const pr = PRIORITY_STYLE[selectedClaim.priority] ?? PRIORITY_STYLE.MEDIUM;

  function handleClose() {
    onClose();
    setResolveOpen(false);
    setInProgressOpen(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={handleClose}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius)', maxWidth: 540, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>
              {selectedClaim.title ?? CAT_LABELS[selectedClaim.category] ?? selectedClaim.category}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
              {selectedClaim.tenant.contract.property.name ?? selectedClaim.tenant.contract.property.address} · {selectedClaim.tenant.name}
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: st.color, background: st.bg, padding: '3px 10px', borderRadius: 6 }}>{st.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: pr.color, background: `${pr.color}18`, padding: '3px 10px', borderRadius: 6 }}>Prioridad {pr.label}</span>
          </div>

          {/* Description */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descripción</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{selectedClaim.description}</p>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Reportado el {formatDate(selectedClaim.createdAt)}</div>

          {/* History */}
          {selectedClaim.history.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Historial</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedClaim.history.map((h, i) => {
                  const newSt = STATUS_STYLE[h.newStatus] ?? STATUS_STYLE.OPEN;
                  return (
                    <div key={i} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: h.comment || h.photoUrl ? 8 : 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: newSt.color }}>{newSt.label}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(h.changedAt)}</span>
                      </div>
                      {h.comment && (
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.5 }}>{h.comment}</p>
                      )}
                      {h.photoUrl && (
                        <img
                          src={`${apiBase}${h.photoUrl}`}
                          alt="Foto de resolución"
                          style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 6 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status actions */}
          {selectedClaim.status !== 'RESOLVED' && !resolveOpen && !inProgressOpen && (
            <div style={{ display: 'flex', gap: 10 }}>
              {selectedClaim.status === 'OPEN' && (
                <button
                  onClick={onOpenInProgress}
                  style={{ flex: 1, padding: '12px', background: 'var(--warning)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  ◎ Marcar en curso
                </button>
              )}
              <button
                onClick={onOpenResolve}
                style={{ flex: 1, padding: '12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
              >
                ✓ Marcar como resuelto
              </button>
            </div>
          )}

          {/* In progress form */}
          {inProgressOpen && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Marcar como en curso</div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Comentario (opcional)</label>
                <textarea
                  value={inProgressComment}
                  onChange={e => setInProgressComment(e.target.value)}
                  placeholder="Agregá un comentario..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font)', resize: 'vertical' }}
                />
              </div>
              {inProgressError && (
                <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                  No se pudo marcar como en curso. Intentá de nuevo.
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => onInProgressConfirm(selectedClaim.id, inProgressComment)}
                  disabled={inProgressPending}
                  style={{ flex: 1, padding: '10px', background: 'var(--warning)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  {inProgressPending ? 'Guardando...' : 'Confirmar'}
                </button>
                <button
                  onClick={() => setInProgressOpen(false)}
                  style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Resolve form */}
          {resolveOpen && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Registrar resolución</div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Comentario (opcional)</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Describí cómo se resolvió el problema..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font)', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Foto (opcional)</label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', background: photoPreview ? 'var(--accent-bg)' : 'var(--bg-elevated)' }}>
                  <Icon name="camera" size={18} color={photoPreview ? 'var(--accent)' : 'var(--text-muted)'} />
                  {photoPreview ? 'Cambiar foto' : 'Adjuntar foto'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhotoChange} style={{ display: 'none' }} />
                </label>
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" style={{ display: 'block', marginTop: 8, width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 6 }} />
                )}
              </div>
              {resolveError && (
                <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                  No se pudo marcar como resuelto. Intentá de nuevo.
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => onResolveConfirm(selectedClaim.id, comment, photo)}
                  disabled={resolvePending}
                  style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  {resolvePending ? 'Guardando...' : 'Confirmar resolución'}
                </button>
                <button
                  onClick={() => setResolveOpen(false)}
                  style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
