'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileSearch, Plus, X } from 'lucide-react';
import api, { getApiBaseUrl } from '@/lib/api';

type ExpenseReceipt = {
  id: string;
  period: string;
  amount?: number | null;
  currency?: 'ARS' | 'USD' | null;
  dueDate?: string | null;
  issuer?: string | null;
  receiptNumber?: string | null;
  notes?: string | null;
  fileUrl: string;
  fileName: string | null;
  uploadedAt: string;
};

type ExpensePreview = {
  suggestions: {
    period?: string;
    amount?: string;
    currency?: 'ARS' | 'USD';
    dueDate?: string;
    issuer?: string;
    receiptNumber?: string;
    notes?: string;
  };
  confidence: number;
};

type ExpenseDraft = {
  file: File;
  period: string;
  amount: string;
  currency: 'ARS' | 'USD';
  dueDate: string;
  issuer: string;
  receiptNumber: string;
  notes: string;
};

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function periodLabel(period: string, locale: string) {
  const [year, month] = period.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

function dateInputValue(value?: string) {
  return value ? value.slice(0, 10) : '';
}

function formatCurrency(amount: number, currency: 'ARS' | 'USD' | null | undefined, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency ?? 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

function emptyDraft(file: File, period: string): ExpenseDraft {
  return {
    file,
    period,
    amount: '',
    currency: 'ARS',
    dueDate: '',
    issuer: '',
    receiptNumber: '',
    notes: '',
  };
}

export default function ExpensasPage() {
  const { t, i18n } = useTranslation('payments');
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ExpenseDraft | null>(null);
  const [fallbackPeriod, setFallbackPeriod] = useState(currentPeriod());
  const [confirmDelete, setConfirmDelete] = useState<ExpenseReceipt | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const locale = i18n.language === 'en' ? 'en-US' : 'es-AR';

  const { data: receipts = [], isLoading } = useQuery<ExpenseReceipt[]>({
    queryKey: ['tenant-expensas'],
    queryFn: async () => {
      const res = await api.get('/tenant/expensas');
      return res.data.data;
    },
  });

  const previewMutation = useMutation({
    mutationFn: async ({ file }: { file: File; period: string }) => {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/tenant/expensas/import-preview', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data as ExpensePreview;
    },
    onSuccess: (data, variables) => {
      const suggestions = data.suggestions;
      setDraft({
        file: variables.file,
        period: suggestions.period ?? variables.period,
        amount: suggestions.amount ?? '',
        currency: suggestions.currency ?? 'ARS',
        dueDate: dateInputValue(suggestions.dueDate),
        issuer: suggestions.issuer ?? '',
        receiptNumber: suggestions.receiptNumber ?? '',
        notes: suggestions.notes ?? '',
      });
      setUploadError(null);
    },
    onError: (_error, variables) => {
      setDraft(emptyDraft(variables.file, variables.period));
      setUploadError(t('expensas.previewError'));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (values: ExpenseDraft) => {
      const form = new FormData();
      form.append('period', values.period);
      form.append('file', values.file);
      form.append('currency', values.currency);
      if (values.amount) form.append('amount', values.amount);
      if (values.dueDate) form.append('dueDate', values.dueDate);
      if (values.issuer) form.append('issuer', values.issuer);
      if (values.receiptNumber) form.append('receiptNumber', values.receiptNumber);
      if (values.notes) form.append('notes', values.notes);
      return api.post('/tenant/expensas', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-expensas'] });
      setDraft(null);
      setUploadError(null);
    },
    onError: () => {
      setUploadError(t('expensas.uploadError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tenant/expensas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-expensas'] });
      setConfirmDelete(null);
    },
    onError: () => setUploadError(t('expensas.deleteToastError')),
  });

  function handleUploadClick(period = currentPeriod()) {
    setFallbackPeriod(period);
    setUploadError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    previewMutation.mutate({ file, period: fallbackPeriod });
    e.target.value = '';
  }

  function updateDraft(field: keyof Omit<ExpenseDraft, 'file'>, value: string) {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  }

  function handleDraftSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    uploadMutation.mutate(draft);
  }

  const sortedReceipts = [...receipts].sort((a, b) => b.period.localeCompare(a.period));
  const uploadedCount = receipts.length;

  function fileUrl(receipt: ExpenseReceipt) {
    const base = getApiBaseUrl().replace(/\/$/, '');
    return `${base}${receipt.fileUrl}`;
  }

  function receiptMeta(receipt: ExpenseReceipt) {
    return [
      receipt.amount ? formatCurrency(receipt.amount, receipt.currency, locale) : null,
      receipt.dueDate ? t('expensas.dueShort', { date: new Date(receipt.dueDate).toLocaleDateString(locale) }) : null,
      receipt.issuer,
    ].filter(Boolean).join(' - ');
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {draft && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleDraftSubmit} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', maxWidth: 520, width: '100%', padding: 28, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{t('expensas.reviewTitle')}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{draft.file.name}</div>
              </div>
              <button type="button" onClick={() => setDraft(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
                {t('table.period')}
                <input type="month" value={draft.period} onChange={(e) => updateDraft('period', e.target.value)} required style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
                {t('table.amount')}
                <input type="number" min="0" step="0.01" value={draft.amount} onChange={(e) => updateDraft('amount', e.target.value)} placeholder="0" style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
                {t('expensas.currency')}
                <select value={draft.currency} onChange={(e) => updateDraft('currency', e.target.value as 'ARS' | 'USD')} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)' }}>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
                {t('table.dueDate')}
                <input type="date" value={draft.dueDate} onChange={(e) => updateDraft('dueDate', e.target.value)} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)' }} />
              </label>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              {t('expensas.issuer')}
              <input value={draft.issuer} onChange={(e) => updateDraft('issuer', e.target.value)} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              {t('expensas.receiptNumber')}
              <input value={draft.receiptNumber} onChange={(e) => updateDraft('receiptNumber', e.target.value)} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              {t('expensas.notes')}
              <textarea value={draft.notes} onChange={(e) => updateDraft('notes', e.target.value)} rows={3} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)', resize: 'vertical' }} />
            </label>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="submit" disabled={uploadMutation.isPending} style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                {uploadMutation.isPending ? t('expensas.saving') : t('expensas.save')}
              </button>
              <button type="button" onClick={() => setDraft(null)} style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                {t('expensas.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', maxWidth: 400, width: '100%', padding: 28, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{t('expensas.deleteTitle')}</div>
              <button onClick={() => setConfirmDelete(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }} dangerouslySetInnerHTML={{ __html: t('expensas.deleteConfirm', { period: periodLabel(confirmDelete.period, locale) }) }} />
            {deleteMutation.isError && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 12 }}>
                {t('expensas.deleteError')}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending} style={{ flex: 1, padding: '10px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                {deleteMutation.isPending ? t('expensas.deleting') : t('expensas.delete')}
              </button>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                {t('expensas.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{t('expensas.title')}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {t('stats.invoicesUploaded')}: {uploadedCount}
          </div>
        </div>
        <button onClick={() => handleUploadClick()} disabled={previewMutation.isPending} style={{ padding: '8px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {previewMutation.isPending ? <FileSearch size={15} /> : <Plus size={15} />}
          {previewMutation.isPending ? t('expensas.previewing') : t('expensas.upload')}
        </button>
      </div>

      {uploadError && (
        <div role="alert" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
          {uploadError}
        </div>
      )}

      {isLoading ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          {t('expensas.loading')}
        </div>
      ) : sortedReceipts.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t('expensas.empty')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sortedReceipts.map(receipt => {
            const meta = receiptMeta(receipt);
            return (
              <div key={receipt.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, textTransform: 'capitalize' }}>{periodLabel(receipt.period, locale)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {receipt.fileName ?? t('expensas.uploaded')}
                  </div>
                  {meta && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</div>}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '2px 8px', borderRadius: 6 }}>{t('expensas.uploaded')}</span>
                  <a href={fileUrl(receipt)} target="_blank" rel="noopener noreferrer" style={{ padding: '7px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', textDecoration: 'none', color: 'var(--text)' }}>
                    {t('expensas.view')}
                  </a>
                  <button onClick={() => handleUploadClick(receipt.period)} disabled={previewMutation.isPending} style={{ padding: '7px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--text-secondary)' }}>
                    {previewMutation.isPending ? t('expensas.previewing') : t('expensas.replace')}
                  </button>
                  <button onClick={() => setConfirmDelete(receipt)} style={{ padding: '7px 10px', background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--danger)', display: 'flex', alignItems: 'center' }} title={t('expensas.deleteTitle')}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}