'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api, { getApiBaseUrl } from '@/lib/api';
import Icon from '@/components/Icon';

interface PropertyPhoto {
  id: string;
  fileUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  uploadedAt: string;
}

export default function TenantPhotosPage() {
  const { t } = useTranslation('photos');
  const API_BASE = getApiBaseUrl();
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<PropertyPhoto | null>(null);

  useEffect(() => {
    api.get('/tenant/photos')
      .then(r => setPhotos(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{t('tenant.title')}</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {t('tenant.description')}
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: 14 }}>
          {t('tenant.loading')}
        </div>
      ) : photos.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{t('tenant.emptyTitle')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {t('tenant.emptyDescription')}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            {t('grid.photoCount', { count: photos.length })} · {t('grid.clickToEnlarge')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {photos.map(photo => (
              <div
                key={photo.id}
                onClick={() => setLightbox(photo)}
                style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-elevated)', cursor: 'pointer', position: 'relative' }}
              >
                <img
                  src={`${API_BASE}${photo.thumbnailUrl ?? photo.fileUrl}`}
                  alt={t('tenant.title')}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'opacity 0.15s' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}
          >
            <Icon name="x" size={24} color="#fff" />
          </button>
          <img
            src={`${API_BASE}${lightbox.fileUrl}`}
            alt={t('tenant.title')}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 10, objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
          />
          {lightbox.caption && (
            <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 13 }}>
              {lightbox.caption}
            </div>
          )}
        </div>
      )}
    </>
  );
}
