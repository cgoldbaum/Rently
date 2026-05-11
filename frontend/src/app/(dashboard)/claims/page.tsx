'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getApiBaseUrl } from '@/lib/api';
import Icon from '@/components/Icon';

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

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'OPEN', label: 'Abiertos' },
  { key: 'IN_PROGRESS', label: 'En curso' },
  { key: 'RESOLVED', label: 'Resueltos' },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ClaimsPage() {
  const queryClient = useQueryClient();
  const API_BASE = getApiBaseUrl();
  const [filter, setFilter] = useState('all');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { data: claims = [] } = useQuery<Claim[]>({
    queryKey: ['claims'],
    queryFn: async () => {
      const res = await api.get('/claims');
      return res.data.data;
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, comment, photo }: { id: string; comment: string; photo: File | null }) => {
      const form = new FormData();
      if (comment) form.append('comment', comment);
      if (photo) form.append('photo', photo);
      const res = await api.patch(`/claims/${id}/resolve`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data as Claim;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Claim[]>(['claims'], prev =>
        (prev ?? []).map(c => c.id === updated.id ? updated : c)
      );
      setSelectedClaim(updated);
      setResolveOpen(false);
      setComment('');
      setPhoto(null);
      setPhotoPreview(null);
    },
  });

  function openResolveModal() {
    setComment('');
    setPhoto(null);
    setPhotoPreview(null);
    setResolveOpen(true);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  }

  const filtered = filter === 'all' ? claims : claims.filter(c => c.status === filter);

  return (
    <>
      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '6px 14px', borderRadius: 20,
                border: `1.5px solid ${filter === f.key ? 'var(--accent)' : 'var(--border)'}`,
                background: filter === f.key ? 'var(--accent-bg)' : 'var(--bg-card)',
                color: filter === f.key ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
              }}
            >
              {f.label}
              {f.key !== 'all' && (
                <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--bg-elevated)', borderRadius: 999, padding: '1px 6px' }}>
                  {claims.filter(c => c.status === f.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {filtered.length} reclamo{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Claim list */}
      {filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 40, textAlign: 'center' }}>
          <Icon name="clipboard" size={32} color="var(--text-muted)" />
          <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 14 }}>
            No hay reclamos{filter !== 'all' ? ' en este estado' : ''}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(c => {
            const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.OPEN;
            const pr = PRIORITY_STYLE[c.priority] ?? PRIORITY_STYLE.MEDIUM;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedClaim(c)}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {c.title ?? CAT_LABELS[c.category] ?? c.category}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {c.tenant.contract.property.name ?? c.tenant.contract.property.address} · {c.tenant.name} · {fmtDate(c.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: pr.color, background: `${pr.color}18`, padding: '2px 8px', borderRadius: 6 }}>
                      {pr.label}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 6 }}>
                      {st.label}
                    </span>
                  </div>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {c.description}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Claim detail modal */}
      {selectedClaim && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', maxWidth: 540, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-lg)' }}>
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
                onClick={() => { setSelectedClaim(null); setResolveOpen(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Badges */}
              <div style={{ display: 'flex', gap: 8 }}>
                {(() => {
                  const st = STATUS_STYLE[selectedClaim.status] ?? STATUS_STYLE.OPEN;
                  const pr = PRIORITY_STYLE[selectedClaim.priority] ?? PRIORITY_STYLE.MEDIUM;
                  return (
                    <>
                      <span style={{ fontSize: 12, fontWeight: 600, color: st.color, background: st.bg, padding: '3px 10px', borderRadius: 6 }}>{st.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: pr.color, background: `${pr.color}18`, padding: '3px 10px', borderRadius: 6 }}>Prioridad {pr.label}</span>
                    </>
                  );
                })()}
              </div>

              {/* Description */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descripción</div>
                <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{selectedClaim.description}</p>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Reportado el {fmtDate(selectedClaim.createdAt)}</div>

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
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(h.changedAt)}</span>
                          </div>
                          {h.comment && (
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.5 }}>{h.comment}</p>
                          )}
                          {h.photoUrl && (
                            <img
                              src={`${API_BASE}${h.photoUrl}`}
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

              {/* Resolve action */}
              {selectedClaim.status !== 'RESOLVED' && !resolveOpen && (
                <button
                  onClick={openResolveModal}
                  style={{ width: '100%', padding: '12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  ✓ Marcar como resuelto
                </button>
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
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} style={{ display: 'none' }} />
                    </label>
                    {photoPreview && (
                      <img src={photoPreview} alt="Preview" style={{ display: 'block', marginTop: 8, width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 6 }} />
                    )}
                  </div>
                  {resolveMutation.isError && (
                    <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                      No se pudo marcar como resuelto. Intentá de nuevo.
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => resolveMutation.mutate({ id: selectedClaim.id, comment, photo })}
                      disabled={resolveMutation.isPending}
                      style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                    >
                      {resolveMutation.isPending ? 'Guardando...' : 'Confirmar resolución'}
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
      )}
    </>
  );
}
