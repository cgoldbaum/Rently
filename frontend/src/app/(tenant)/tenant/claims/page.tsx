'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pencil, X } from 'lucide-react';
import api from '@/lib/api';
import { useToastStore } from '@/store/toast';
import { claimSchema, claimDescriptionSchema, getFieldErrors } from '@/lib/validations';
import { formatDate } from '@rently/shared';

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

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  OPEN:        { color: 'var(--info)', bg: 'var(--info-bg)' },
  IN_PROGRESS: { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  RESOLVED:    { color: 'var(--accent)', bg: 'var(--accent-bg)' },
};
const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
  HIGH:   { color: 'var(--danger)', bg: 'var(--danger-bg)' },
  MEDIUM: { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  LOW:    { color: 'var(--accent)', bg: 'var(--accent-bg)' },
};

export default function TenantClaimsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('claims');
  const [showForm, setShowForm] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [editDescription, setEditDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [aiDrafting, setAiDrafting] = useState(false);

  const { data: claims = [], isLoading } = useQuery<Claim[]>({
    queryKey: ['tenant-claims'],
    queryFn: async () => {
      const res = await api.get('/tenant/claims');
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description: string; priority: string }) =>
      api.post('/tenant/claims', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-claims'] });
      setShowForm(false);
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
    },
    onError: () => useToastStore.getState().showToast(t('errors.createFailed')),
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
    onError: () => useToastStore.getState().showToast(t('errors.saveFailed')),
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
    onError: () => useToastStore.getState().showToast(t('errors.deleteFailed')),
  });

  async function handleAiDraft() {
    const notes = description.trim();
    if (!notes || aiDrafting) return;
    setAiDrafting(true);
    try {
      const res = await api.post('/ai/draft-claim', { title: title.trim() || undefined, notes });
      const text: string = res.data.data.text?.trim() ?? '';
      if (text) {
        setDescription(text);
        setFormErrors(prev => { const n = { ...prev }; delete n.description; return n; });
      }
    } catch {
      useToastStore.getState().showToast(t('errors.aiDraftFailed'));
    } finally {
      setAiDrafting(false);
    }
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const parsed = claimSchema.safeParse({ title, description });
    if (!parsed.success) { setFormErrors(getFieldErrors(parsed.error)); return; }
    setFormErrors({});
    createMutation.mutate({ title, description, priority });
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
    setEditErrors({});
  }

  function handleUpdateDescription(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!selectedClaim) return;
    const parsed = claimDescriptionSchema.safeParse({ description: editDescription });
    if (!parsed.success) { setEditErrors(getFieldErrors(parsed.error)); return; }
    setEditErrors({});
    updateMutation.mutate({ id: selectedClaim.id, description: editDescription.trim() });
  }

  function handleDeleteClaim() {
    if (!selectedClaim) return;
    deleteMutation.mutate(selectedClaim.id);
  }

  const open = claims.filter(c => c.status !== 'RESOLVED').length;
  const resolved = claims.filter(c => c.status === 'RESOLVED').length;

  const PRIORITY_KEYS = ['HIGH', 'MEDIUM', 'LOW'] as const;
  const PRIORITY_COLOR: Record<string, string> = {
    HIGH: 'var(--danger)', MEDIUM: 'var(--warning)', LOW: 'var(--text-muted)',
  };
  const PRIORITY_COLOR_BG: Record<string, string> = {
    HIGH: 'var(--danger-bg)', MEDIUM: 'var(--warning-bg)', LOW: 'var(--bg-elevated)',
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Claim detail modal */}
      {selectedClaim && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={closeClaimDetail}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', maxWidth: 520, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: 28, boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
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
                  title={t('actions.editDescription')}
                  aria-label={t('actions.editDescription')}
                  style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isEditing ? 'var(--bg-elevated)' : 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={closeClaimDetail}
                  title={t('common:close')}
                  aria-label={t('common:close')}
                  style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_STYLE[selectedClaim.status]?.color ?? 'var(--text-muted)', background: STATUS_STYLE[selectedClaim.status]?.bg ?? 'var(--bg-elevated)', padding: '3px 10px', borderRadius: 6 }}>
                {t(`domain:claimStatus.${selectedClaim.status}`)}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_STYLE[selectedClaim.priority]?.color ?? 'var(--text-muted)', background: PRIORITY_STYLE[selectedClaim.priority]?.bg ?? 'var(--bg-elevated)', padding: '3px 10px', borderRadius: 6 }}>
                {t('detail.priorityBadge', { priority: t(`domain:claimPriority.${selectedClaim.priority}`) })}
              </span>
            </div>
            {isEditing ? (
              <form onSubmit={handleUpdateDescription} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {t('detail.description')}
                </label>
                <textarea
                  value={editDescription}
                  onChange={e => { setEditDescription(e.target.value); setEditErrors(prev => { const n = { ...prev }; delete n.description; return n; }); }}
                  rows={5}
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${editErrors.description ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font)', lineHeight: 1.5, resize: 'vertical' }}
                />
                {editErrors.description && <span style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{editErrors.description}</span>}
                {updateMutation.isError && (
                  <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                    {t('errors.updateDescriptionFailed')}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending || !editDescription.trim() || editDescription.trim() === selectedClaim.description}
                    style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    {updateMutation.isPending ? t('common:saving') : t('actions.saveChanges')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditDescription(selectedClaim.description);
                    }}
                    style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    {t('common:cancel')}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {t('detail.description')}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{selectedClaim.description}</p>
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              {t('detail.reportedOn', { date: formatDate(selectedClaim.createdAt) })}
            </div>
            {selectedClaim.history.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{t('detail.history')}</div>
                {selectedClaim.history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', borderTop: '1px solid var(--border-light)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span>{formatDate(h.changedAt)}</span>
                    <span>·</span>
                    <span>
                      {t(`domain:claimStatus.${h.oldStatus}`)} → <strong>{t(`domain:claimStatus.${h.newStatus}`)}</strong>
                    </span>
                    {h.comment && <span>· &ldquo;{h.comment}&rdquo;</span>}
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
                    {deleteMutation.isPending ? t('actions.deleting') : t('actions.confirmDelete')}
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    {t('common:cancel')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    style={{ flex: 1, padding: '10px', background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    {t('actions.deleteClaim')}
                  </button>
                  <button
                    onClick={closeClaimDetail}
                    style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    {t('common:close')}
                  </button>
                </>
              )}
            </div>
            {deleteMutation.isError && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginTop: 10 }}>
                {t('errors.deleteFailed')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New claim modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => { setShowForm(false); setTitle(''); setDescription(''); setPriority('MEDIUM'); }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', maxWidth: 480, width: '100%', padding: 28, boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{t('newClaim.title')}</div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                  {t('form.titleLabel')} *
                </label>
                <input
                  type="text"
                  placeholder={t('form.titlePlaceholder')}
                  value={title}
                  onChange={e => { setTitle(e.target.value); setFormErrors(prev => { const n = { ...prev }; delete n.title; return n; }); }}
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${formErrors.title ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font)' }}
                />
                {formErrors.title && <span style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{formErrors.title}</span>}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {t('form.descriptionLabel')} *
                  </label>
                  <button
                    type="button"
                    onClick={handleAiDraft}
                    disabled={aiDrafting || !description.trim()}
                    title={t('form.aiDraftHint')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', fontSize: 12, fontWeight: 600,
                      background: 'var(--accent-bg)', color: 'var(--accent)',
                      border: '1px solid var(--accent)', borderRadius: 999,
                      cursor: aiDrafting || !description.trim() ? 'not-allowed' : 'pointer',
                      opacity: aiDrafting || !description.trim() ? 0.5 : 1,
                      fontFamily: 'var(--font)',
                    }}
                  >
                    {aiDrafting ? t('form.aiDrafting') : t('form.aiDraft')}
                  </button>
                </div>
                <textarea
                  placeholder={t('form.descriptionPlaceholder')}
                  value={description}
                  onChange={e => { setDescription(e.target.value); setFormErrors(prev => { const n = { ...prev }; delete n.description; return n; }); }}
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${formErrors.description ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font)', resize: 'vertical' }}
                />
                {formErrors.description && <span style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, display: 'block' }}>{formErrors.description}</span>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
                  {t('form.priorityLabel')} *
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {PRIORITY_KEYS.map(key => {
                    const color = PRIORITY_COLOR[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPriority(key)}
                        style={{
                          flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)',
                          border: `2px solid ${priority === key ? color : 'var(--border)'}`,
                          background: priority === key ? PRIORITY_COLOR_BG[key] : 'var(--bg-card)',
                          color: priority === key ? color : 'var(--text-secondary)',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
                        }}
                      >
                        {t(`domain:claimPriority.${key}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
              {createMutation.isError && (
                <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                  {t('errors.submitFailed')}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !title.trim() || !description.trim()}
                  style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  {createMutation.isPending ? t('actions.submitting') : t('actions.submitClaim')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setTitle(''); setDescription(''); setPriority('MEDIUM'); }}
                  style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  {t('common:cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
            {t('stats.active')}
          </div>
          <div style={{ fontWeight: 700, fontSize: 24, color: open > 0 ? 'var(--warning)' : 'var(--accent)' }}>{open}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
            {t('stats.resolved')}
          </div>
          <div style={{ fontWeight: 700, fontSize: 24, color: 'var(--accent)' }}>{resolved}</div>
        </div>
      </div>

      {/* Header + button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{t('tenant.myClaims')}</div>
        <button
          onClick={() => setShowForm(true)}
          style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
        >
          {t('actions.newClaim')}
        </button>
      </div>

      {/* Claim list */}
      {isLoading ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          {t('loading.claims')}
        </div>
      ) : claims.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{t('empty.noClaimsTitle')}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('empty.noClaimsDesc')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {claims.map(c => {
            const st = STATUS_STYLE[c.status] ?? { color: 'var(--text-muted)', bg: 'var(--bg-elevated)' };
            const pr = PRIORITY_STYLE[c.priority] ?? { color: 'var(--text-muted)', bg: 'var(--bg-elevated)' };
            return (
              <div
                key={c.id}
                onClick={() => openClaimDetail(c)}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow var(--transition)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{c.title ?? c.category}</div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 6 }}>
                      {t(`domain:claimStatus.${c.status}`)}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: pr.color, background: pr.bg, padding: '2px 8px', borderRadius: 6 }}>
                      {t(`domain:claimPriority.${c.priority}`)}
                    </span>
                  </div>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 8px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {c.description}
                </p>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {t('detail.reportedOnWithLink', { date: formatDate(c.createdAt) })}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
