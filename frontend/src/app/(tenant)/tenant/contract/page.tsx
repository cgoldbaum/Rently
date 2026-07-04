'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api, { getApiBaseUrl } from '@/lib/api';
import Icon from '@/components/Icon';
import { formatMoney, formatDate, propertyTypeLabel } from '@rently/shared';

type Contract = {
  property: { address: string; type: string };
  startDate: string;
  endDate: string;
  monthlyAmount: number;
  initialAmount: number;
  adjustIndex: string;
  adjustFrequency: number;
  paymentDay: number;
  nextAdjustDate: string | null;
  lastAdjustPct: number | null;
  progress: number;
};

type Photo = {
  id: string;
  fileUrl: string;
  thumbnailUrl?: string;
  caption?: string;
};

const INDEX_LABELS: Record<string, string> = { IPC: 'IPC (INDEC)', ICL: 'ICL (BCRA)' };

export default function TenantContractPage() {
  const { t } = useTranslation('contracts');
  const API_BASE = getApiBaseUrl();
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  // Momento de referencia para calcular el progreso del contrato (capturado una vez en el render inicial).
  const [now] = useState(() => Date.now());

  const { data: contract, isLoading, isError } = useQuery<Contract>({
    queryKey: ['tenant-contract'],
    queryFn: async () => {
      const res = await api.get('/tenant/contract');
      return res.data.data;
    },
  });

  const { data: photos = [] } = useQuery<Photo[]>({
    queryKey: ['tenant-photos'],
    queryFn: async () => {
      const res = await api.get('/tenant/photos');
      return res.data.data;
    },
  });

  const { data: contractDoc } = useQuery<{ fileUrl: string; fileName?: string; uploadedAt: string } | null>({
    queryKey: ['tenant-contract-document'],
    queryFn: async () => {
      try {
        const res = await api.get('/tenant/contract/document');
        return res.data.data;
      } catch {
        return null;
      }
    },
  });

  if (isLoading) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          {t('tenant.loading')}
        </div>
      </div>
    );
  }

  if (isError || !contract) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{t('tenant.noContract')}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('tenant.noAssignedDesc')}</div>
        </div>
      </div>
    );
  }

  const totalDays = Math.ceil((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / 86400000);
  const elapsed = Math.ceil((now - new Date(contract.startDate).getTime()) / 86400000);

  const details = [
    [t('tenant.startLabel'), formatDate(contract.startDate)],
    [t('tenant.endLabel'), formatDate(contract.endDate)],
    [t('tenant.initialAmount'), formatMoney(contract.initialAmount)],
    [t('tenant.currentAmount'), formatMoney(contract.monthlyAmount)],
    [t('tenant.paymentDayLabel'), t('tenant.paymentDayValue', { day: contract.paymentDay })],
    [t('tenant.indexLabel'), contract.adjustIndex === 'MANUAL' ? t('tenant.indexManual') : (INDEX_LABELS[contract.adjustIndex] ?? contract.adjustIndex)],
    ...(contract.adjustIndex !== 'MANUAL' ? [
      [t('tenant.adjustFrequencyLabel'), t('tenant.everyNMonths', { months: contract.adjustFrequency })],
      ...(contract.nextAdjustDate ? [[t('tenant.nextAdjust'), formatDate(contract.nextAdjustDate)]] : []),
    ] : []),
  ];

  if (contract.lastAdjustPct !== null) {
    details.push([t('tenant.lastAdjust'), t('tenant.lastAdjustValue', { pct: contract.lastAdjustPct.toFixed(2) })]);
  }

  return (
    <>
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Property info */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 6 }}>{t('tenant.propertyLabel')}</div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{contract.property.address}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 2 }}>{propertyTypeLabel(contract.property.type)}</div>
      </div>

      {/* Contract details grid */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{t('tenant.detailsTitle')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
          {details.map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contract document */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{t('tenant.docTitle')}</div>
        {contractDoc ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
            <Icon name="file" size={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {contractDoc.fileName ?? t('document.contractPdf')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {t('document.uploadedOn', { date: formatDate(contractDoc.uploadedAt) })}
              </div>
            </div>
            <a
              href={`${API_BASE.replace(/\/$/, '')}${contractDoc.fileUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: 'none', flexShrink: 0 }}
            >
              {t('document.view')}
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            <Icon name="file" size={18} color="var(--text-muted)" />
            {t('tenant.noDoc')}
          </div>
        )}
      </div>

      {/* Property photos */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          {t('photos:tenant.title')}
          {photos.length > 0 && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>{t('photos:grid.photoCount', { count: photos.length })}</span>}
        </div>
        {photos.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            <Icon name="photo" size={18} color="var(--text-muted)" />
            {t('photos:tenant.emptyDescription')}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
            {photos.map(photo => (
              <div
                key={photo.id}
                onClick={() => setLightbox(photo)}
                style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-elevated)', cursor: 'pointer' }}
              >
                <img
                  src={`${API_BASE}${photo.thumbnailUrl ?? photo.fileUrl}`}
                  alt={t('properties:photoAlt')}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Duration progress */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{t('tenant.durationTitle')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('tenant.elapsedPct', { pct: contract.progress })}</div>
        </div>
        <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ height: '100%', background: contract.progress >= 90 ? 'var(--danger)' : contract.progress >= 70 ? 'var(--warning)' : 'var(--accent)', width: `${contract.progress}%`, borderRadius: 8, transition: 'width 0.3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
          <span>{formatDate(contract.startDate)}</span>
          <span>{t('tenant.daysOfTotal', { elapsed, total: totalDays })}</span>
          <span>{formatDate(contract.endDate)}</span>
        </div>
      </div>

    </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <Icon name="x" size={24} color="#fff" />
          </button>
          <img
            src={`${API_BASE}${lightbox.fileUrl}`}
            alt={t('properties:photoAlt')}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 10, objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
          />
        </div>
      )}
    </>
  );
}
