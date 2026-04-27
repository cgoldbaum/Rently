'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, X } from 'lucide-react';
import api from '@/lib/api';

type ClaimHistory = { oldStatus: string; newStatus: string; comment?: string; changedAt: string };
type Claim = {
  id: string;
  title?: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  history: ClaimHistory[];
};

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  OPEN:        { label: 'Pendiente',  color: 'var(--info)' },
  IN_PROGRESS: { label: 'En curso',   color: 'var(--warning)' },
  RESOLVED:    { label: 'Resuelto',   color: 'var(--accent)' },
};
const PRIORITY_STYLE: Record<string, { label: string; color: string }> = {
  HIGH:   { label: 'Alta',  color: 'var(--danger)' },
  MEDIUM: { label: 'Media', color: 'var(--warning)' },
  LOW:    { label: 'Baja',  color: 'var(--accent)' },
};

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TenantClaimsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data: claims = [], isLoading } = useQuery<Claim[]>({
    queryKey: ['tenant-claims'],
    queryFn: async () => {
      const res = await api.get('/tenant/claims');
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description: string }) =>
      api.post('/tenant/claims', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-claims'] });
      setShowForm(false);
      setTitle('');
      setDescription('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; description: string }) =>
      api.patch(`/tenant/claims/${data.id}`, { description: data.description }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-claims'] });
      setSelectedClaim(res.data.data);
      setEditDescription(res.data.data.description);
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tenant/claims/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-claims'] });
      setSelectedClaim(null);
      setEditDescription('');
      setIsEditing(false);
      setConfirmingDelete(false);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    createMutation.mutate({ title, description });
  }

  function openClaimDetail(claim: Claim) {
    setSelectedClaim(claim);
    setEditDescription(claim.description);
    setIsEditing(false);
    setConfirmingDelete(false);
  }

  function closeClaimDetail() {
    setSelectedClaim(null);
    setEditDescription('');
    setIsEditing(false);
    setConfirmingDelete(false);
  }

  function handleUpdateDescription(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClaim || !editDescription.trim()) return;
    updateMutation.mutate({ id: selectedClaim.id, description: editDescription.trim() });
  }

  function handleDeleteClaim() {
    if (!selectedClaim) return;
    deleteMutation.mutate(selectedClaim.id);
  }

  const open = claims.filter(c => c.status !== 'RESOLVED').length;
  const resolved = claims.filter(c => c.status === 'RESOLVED').length;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Claim detail modal */}
      {selectedClaim && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', maxWidth: 520, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: 28, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{selectedClaim.title ?? selectedClaim.category}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setEditDescription(selectedClaim.description);
                    setConfirmingDelete(false);
                  }}
                  title="Editar descripción"
                  aria-label="Editar descripción"
                  style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isEditing ? 'var(--bg-elevated)' : 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={closeClaimDetail}
                  title="Cerrar"
                  aria-label="Cerrar"
                  style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_STYLE[selectedClaim.status]?.color ?? '#555', background: `${STATUS_STYLE[selectedClaim.status]?.color ?? '#555'}15`, padding: '3px 10px', borderRadius: 6 }}>
                {STATUS_STYLE[selectedClaim.status]?.label ?? selectedClaim.status}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_STYLE[selectedClaim.priority]?.color ?? '#555', background: `${PRIORITY_STYLE[selectedClaim.priority]?.color ?? '#555'}15`, padding: '3px 10px', borderRadius: 6 }}>
                Prioridad {PRIORITY_STYLE[selectedClaim.priority]?.label ?? selectedClaim.priority}
              </span>
            </div>
            {isEditing ? (
              <form onSubmit={handleUpdateDescription} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Descripción</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={5}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font)', lineHeight: 1.5, resize: 'vertical' }}
                />
                {updateMutation.isError && (
                  <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                    No se pudo actualizar la descripción.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending || !editDescription.trim() || editDescription.trim() === selectedClaim.description}
                    style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditDescription(selectedClaim.description);
                    }}
                    style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Descripción</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{selectedClaim.description}</p>
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Reportado el {fmtDate(selectedClaim.createdAt)}</div>
            {selectedClaim.history.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Historial</div>
                {selectedClaim.history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', borderTop: '1px solid var(--border-light)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span>{fmtDate(h.changedAt)}</span>
                    <span>·</span>
                    <span>{STATUS_STYLE[h.oldStatus]?.label ?? h.oldStatus} → <strong>{STATUS_STYLE[h.newStatus]?.label ?? h.newStatus}</strong></span>
                    {h.comment && <span>· "{h.comment}"</span>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {confirmingDelete ? (
                <>
                  <button
                    onClick={handleDeleteClaim}
                    disabled={deleteMutation.isPending}
                    style={{ flex: 1, padding: '10px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    {deleteMutation.isPending ? 'Eliminando...' : 'Confirmar eliminación'}
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    style={{ flex: 1, padding: '10px', background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    Eliminar reclamo
                  </button>
                  <button
                    onClick={closeClaimDetail}
                    style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    Cerrar
                  </button>
                </>
              )}
            </div>
            {deleteMutation.isError && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginTop: 10 }}>
                No se pudo eliminar el reclamo.
              </div>
            )}
          </div>
        </div>
      )}

      {/* New claim modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', maxWidth: 480, width: '100%', padding: 28, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Nuevo reclamo</div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Título *</label>
                <input
                  type="text"
                  placeholder="Ej: Pérdida de agua en el baño"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Descripción *</label>
                <textarea
                  placeholder="Describí el problema en detalle..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font)', resize: 'vertical' }}
                />
              </div>
              {createMutation.isError && (
                <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                  Error al enviar el reclamo. Intentá de nuevo.
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !title.trim() || !description.trim()}
                  style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  {createMutation.isPending ? 'Enviando...' : 'Enviar reclamo'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setTitle(''); setDescription(''); }}
                  style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Activos</div>
          <div style={{ fontWeight: 700, fontSize: 24, color: open > 0 ? 'var(--warning)' : 'var(--accent)' }}>{open}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Resueltos</div>
          <div style={{ fontWeight: 700, fontSize: 24, color: 'var(--accent)' }}>{resolved}</div>
        </div>
      </div>

      {/* Header + button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Mis reclamos</div>
        <button
          onClick={() => setShowForm(true)}
          style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
        >
          + Nuevo reclamo
        </button>
      </div>

      {/* Claim list */}
      {isLoading ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando reclamos...
        </div>
      ) : claims.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Sin reclamos</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Registrá un problema si necesitás atención.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {claims.map(c => {
            const st = STATUS_STYLE[c.status] ?? { label: c.status, color: '#555' };
            const pr = PRIORITY_STYLE[c.priority] ?? { label: c.priority, color: '#555' };
            return (
              <div
                key={c.id}
                onClick={() => openClaimDetail(c)}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow var(--transition)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{c.title ?? c.category}</div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: `${st.color}15`, padding: '2px 8px', borderRadius: 6 }}>{st.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: pr.color, background: `${pr.color}15`, padding: '2px 8px', borderRadius: 6 }}>{pr.label}</span>
                  </div>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 8px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {c.description}
                </p>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Reportado el {fmtDate(c.createdAt)} · Ver detalle →
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
