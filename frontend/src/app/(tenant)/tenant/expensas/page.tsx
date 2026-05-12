'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import api, { getApiBaseUrl } from '@/lib/api';

type ExpenseReceipt = {
  id: string;
  period: string;
  fileUrl: string;
  fileName: string | null;
  uploadedAt: string;
};

function periodLabel(period: string) {
  const [year, month] = period.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function buildMonths(count = 18): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${d.getFullYear()}-${m}`);
  }
  return months;
}

export default function ExpensasPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPeriod, setUploadingPeriod] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ExpenseReceipt | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: receipts = [], isLoading } = useQuery<ExpenseReceipt[]>({
    queryKey: ['tenant-expensas'],
    queryFn: async () => {
      const res = await api.get('/tenant/expensas');
      return res.data.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ period, file }: { period: string; file: File }) => {
      const form = new FormData();
      form.append('period', period);
      form.append('file', file);
      return api.post('/tenant/expensas', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-expensas'] });
      setUploadingPeriod(null);
      setUploadError(null);
    },
    onError: () => {
      setUploadError('No se pudo subir el archivo. Intentá de nuevo.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tenant/expensas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-expensas'] });
      setConfirmDelete(null);
    },
  });

  function handleUploadClick(period: string) {
    setUploadingPeriod(period);
    setUploadError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadingPeriod) return;
    uploadMutation.mutate({ period: uploadingPeriod, file });
    e.target.value = '';
  }

  const receiptByPeriod = new Map(receipts.map(r => [r.period, r]));
  const months = buildMonths(18);
  const uploadedCount = receipts.length;

  function fileUrl(receipt: ExpenseReceipt) {
    const base = getApiBaseUrl().replace(/\/$/, '');
    return `${base}${receipt.fileUrl}`;
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', maxWidth: 400, width: '100%', padding: 28, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>Eliminar factura</div>
              <button onClick={() => setConfirmDelete(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
              ¿Eliminar la factura de <strong>{periodLabel(confirmDelete.period)}</strong>? Esta acción no se puede deshacer.
            </p>
            {deleteMutation.isError && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 12 }}>
                No se pudo eliminar. Intentá de nuevo.
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
                style={{ flex: 1, padding: '10px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Facturas subidas</div>
          <div style={{ fontWeight: 700, fontSize: 24, color: 'var(--accent)' }}>{uploadedCount}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Pendientes</div>
          <div style={{ fontWeight: 700, fontSize: 24, color: months.filter(m => !receiptByPeriod.has(m)).length > 0 ? 'var(--warning)' : 'var(--accent)' }}>
            {months.filter(m => !receiptByPeriod.has(m)).length}
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{ fontSize: 14, fontWeight: 700 }}>Facturas de expensas</div>

      {uploadError && (
        <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
          {uploadError}
        </div>
      )}

      {/* Month list */}
      {isLoading ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {months.map(period => {
            const receipt = receiptByPeriod.get(period);
            const isUploading = uploadMutation.isPending && uploadingPeriod === period;
            return (
              <div
                key={period}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, textTransform: 'capitalize' }}>
                    {periodLabel(period)}
                  </div>
                  {receipt ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {receipt.fileName ?? 'Factura subida'}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Sin factura</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {receipt ? (
                    <>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '2px 8px', borderRadius: 6 }}>
                        Subida
                      </span>
                      <a
                        href={fileUrl(receipt)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ padding: '7px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', textDecoration: 'none', color: 'var(--text)' }}
                      >
                        Ver
                      </a>
                      <button
                        onClick={() => handleUploadClick(period)}
                        disabled={isUploading}
                        style={{ padding: '7px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--text-secondary)' }}
                      >
                        {isUploading ? 'Subiendo...' : 'Reemplazar'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(receipt)}
                        style={{ padding: '7px 10px', background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                        title="Eliminar factura"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleUploadClick(period)}
                      disabled={isUploading}
                      style={{ padding: '7px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                    >
                      {isUploading ? 'Subiendo...' : '+ Subir factura'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
