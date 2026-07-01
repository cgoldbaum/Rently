'use client';

import { useTranslation } from 'react-i18next';
import Icon from '@/components/Icon';
import { PropertyPhoto, PhotoFolder, PhotoTag } from '../types';

interface PhotosTabProps {
  photos: PropertyPhoto[];
  folders: PhotoFolder[];
  photoTags: PhotoTag[];
  uploadingPhotos: boolean;
  photoPreview: { url: string; name: string }[];
  photoFolderFilter: string;
  photoUploadFolder: string;
  photoUploadTags: string[];
  apiBase: string;
  photoFileRef: React.RefObject<HTMLInputElement | null>;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSetPhotoFolderFilter: (id: string) => void;
  onSetPhotoUploadFolder: (id: string) => void;
  onTogglePhotoUploadTag: (tagId: string) => void;
  onDeletePhoto: (photoId: string) => void;
  onAddPhotoClick: () => void;
}

export default function PhotosTab({
  photos, folders, photoTags, uploadingPhotos, photoPreview,
  photoFolderFilter, photoUploadFolder, photoUploadTags, apiBase,
  photoFileRef, onPhotoSelect, onSetPhotoFolderFilter,
  onSetPhotoUploadFolder, onTogglePhotoUploadTag, onDeletePhoto, onAddPhotoClick,
}: PhotosTabProps) {
  const { t } = useTranslation('properties');
  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">{t('photos.title', { count: photos.length })}</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onAddPhotoClick}
            disabled={uploadingPhotos}
          >
            <Icon name="camera" size={14} /> {uploadingPhotos ? t('photos.uploading') : t('photos.add')}
          </button>
        </div>
        <input
          ref={photoFileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={onPhotoSelect}
        />

        {folders.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${!photoFolderFilter ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onSetPhotoFolderFilter('')}
            >
              {t('photos.filterAll')}
            </button>
            {folders.map(f => (
              <button
                key={f.id}
                className={`btn btn-sm ${photoFolderFilter === f.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onSetPhotoFolderFilter(f.id)}
              >
                <Icon name="folder" size={12} /> {f.name}
              </button>
            ))}
          </div>
        )}

        {photoPreview.length > 0 && (
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{t('photos.selectPhotos')}:</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    {t('photos.folderLabel')}
                  </label>
                <select
                  value={photoUploadFolder}
                  onChange={e => onSetPhotoUploadFolder(e.target.value)}
                  className="input"
                  style={{ width: '100%', fontSize: 12, padding: '6px 8px' }}
                >
                  <option value="">{t('photos.noFolder')}</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 2, minWidth: 200 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  {t('photos.tagsLabel')}
                </label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {photoTags.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      className={`btn btn-sm ${photoUploadTags.includes(t.id) ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => onTogglePhotoUploadTag(t.id)}
                      style={photoUploadTags.includes(t.id) && t.color ? { background: t.color, borderColor: t.color, fontSize: 11 } : { fontSize: 11 }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {photoPreview.map((p, i) => (
                <div key={i} style={{ width: 60, height: 60, borderRadius: 6, overflow: 'hidden', opacity: 0.7 }}>
                  <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadingPhotos && photoPreview.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{t('photos.uploading')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
              {photoPreview.map((p, i) => (
                <div key={i} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', opacity: 0.5 }}>
                  <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {photos.length === 0 && !uploadingPhotos ? (
          <div className="empty-state">
            <div className="empty-icon"><Icon name="camera" size={32} /></div>
            <div className="empty-text">{t('empty.noPhotos')}</div>
            <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={onAddPhotoClick}>
              <Icon name="plus" size={14} /> {t('photos.selectPhotos')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {photos.map(photo => (
              <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-elevated)' }}>
                <img
                  src={`${apiBase}${photo.thumbnailUrl ?? photo.fileUrl}`}
                  alt="Foto"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {photo.tags?.length > 0 && (
                  <div style={{ position: 'absolute', bottom: 4, left: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {photo.tags.map(t => (
                      <span key={t.tag.id} style={{
                        fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
                        background: 'rgba(0,0,0,0.5)', color: '#fff',
                      }}>
                        {t.tag.name}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => onDeletePhoto(photo.id)}
                  style={{
                    position: 'absolute', top: 4, right: 4, width: 24, height: 24,
                    borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff',
                    border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <div
              onClick={onAddPhotoClick}
              style={{
                aspectRatio: '1', borderRadius: 8, border: '2px dashed var(--border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)',
                fontSize: 12, gap: 4,
              }}
            >
              <Icon name="plus" size={20} color="var(--text-muted)" />
              {t('photos.add')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
