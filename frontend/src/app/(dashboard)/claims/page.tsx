'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api, { getApiBaseUrl } from '@/lib/api';
import { useToastStore } from '@/store/toast';
import ClaimList from './components/ClaimList';
import ClaimDetailModal from './components/ClaimDetailModal';
import EmptyClaims from './components/EmptyClaims';

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

const FILTER_KEYS = ['all', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const;

export default function ClaimsPage() {
  const queryClient = useQueryClient();
  const API_BASE = getApiBaseUrl();
  const { t } = useTranslation('claims');
  const [filter, setFilter] = useState('all');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [inProgressOpen, setInProgressOpen] = useState(false);
  const [inProgressComment, setInProgressComment] = useState('');

  const { data: claims = [] } = useQuery<Claim[]>({
    queryKey: ['claims'],
    queryFn: async () => {
      const res = await api.get('/claims');
      return res.data.data;
    },
  });

  const inProgressMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      const res = await api.patch(`/claims/${id}/in-progress`, { comment });
      return res.data.data as Claim;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Claim[]>(['claims'], prev =>
        (prev ?? []).map(c => c.id === updated.id ? updated : c)
      );
      setSelectedClaim(updated);
      setInProgressOpen(false);
      setInProgressComment('');
    },
    onError: () => useToastStore.getState().showToast(t('errors.updateFailed')),
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
    onError: () => useToastStore.getState().showToast(t('errors.resolveFailed')),
  });

  function openResolveModal() {
    setComment('');
    setPhoto(null);
    setPhotoPreview(null);
    setResolveOpen(true);
  }

  function openInProgressModal() {
    setInProgressComment('');
    setInProgressOpen(true);
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
          {FILTER_KEYS.map(key => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '6px 14px', borderRadius: 20,
                border: `1.5px solid ${filter === key ? 'var(--accent)' : 'var(--border)'}`,
                background: filter === key ? 'var(--accent-bg)' : 'var(--bg-card)',
                color: filter === key ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
              }}
            >
              {t(`filters.${key}`)}
              {key !== 'all' && (
                <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--bg-elevated)', borderRadius: 999, padding: '1px 6px' }}>
                  {claims.filter(c => c.status === key).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {t('claimCount', { count: filtered.length })}
        </span>
      </div>

      {/* Claim list */}
      {filtered.length === 0 ? (
        <EmptyClaims filter={filter} />
      ) : (
        <ClaimList claims={filtered} onSelectClaim={setSelectedClaim} />
      )}

      <ClaimDetailModal
        selectedClaim={selectedClaim}
        onClose={() => setSelectedClaim(null)}
        apiBase={API_BASE}
        resolveOpen={resolveOpen}
        setResolveOpen={setResolveOpen}
        comment={comment}
        setComment={setComment}
        photo={photo}
        setPhoto={setPhoto}
        photoPreview={photoPreview}
        setPhotoPreview={setPhotoPreview}
        inProgressOpen={inProgressOpen}
        setInProgressOpen={setInProgressOpen}
        inProgressComment={inProgressComment}
        setInProgressComment={setInProgressComment}
        inProgressPending={inProgressMutation.isPending}
        inProgressError={inProgressMutation.isError}
        onInProgressConfirm={(id, comment) => inProgressMutation.mutate({ id, comment })}
        resolvePending={resolveMutation.isPending}
        resolveError={resolveMutation.isError}
        onResolveConfirm={(id, comment, photo) => resolveMutation.mutate({ id, comment, photo })}
        onOpenResolve={openResolveModal}
        onOpenInProgress={openInProgressModal}
        onPhotoChange={handlePhotoChange}
      />

    </>
  );
}
