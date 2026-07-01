'use client';

import { useTranslation } from 'react-i18next';
import type { PropertyPhoto } from '@rently/shared';

interface PhotoGridProps {
  photos: PropertyPhoto[];
  apiBase: string;
  propertyId: string;
  onDelete: (propertyId: string, photoId: string) => void;
}

export default function PhotoGrid({ photos, apiBase, propertyId, onDelete }: PhotoGridProps) {
  const { t } = useTranslation('photos');
  if (photos.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 8 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('grid.noPhotos')}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginTop: 4 }}>
      {photos.map(photo => (
        <div key={photo.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-elevated)' }}>
          <img
            src={`${apiBase}${photo.thumbnailUrl ?? photo.fileUrl}`}
            alt={t('grid.photoAlt')}
            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
          />
          {photo.tags?.length > 0 && (
            <div style={{ position: 'absolute', bottom: 4, left: 4, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {photo.tags.map(t => (
                <span
                  key={t.tag.id}
                  style={{
                    fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
                    background: t.tag.color ? `${t.tag.color}22` : 'rgba(0,0,0,0.5)',
                    color: '#fff', lineHeight: '16px',
                  }}
                >
                  {t.tag.name}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={() => onDelete(propertyId, photo.id)}
            style={{
              position: 'absolute', top: 4, right: 4, width: 22, height: 22,
              borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 13, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
