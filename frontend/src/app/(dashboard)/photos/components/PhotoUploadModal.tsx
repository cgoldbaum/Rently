'use client';

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { PhotoTag, PhotoFolder } from '@rently/shared';
import Modal from '@/components/Modal';

interface PhotoUploadModalProps {
  uploadFolder: string;
  onUploadFolderChange: (folderId: string) => void;
  uploadTags: string[];
  onToggleTag: (tagId: string) => void;
  tags: PhotoTag[];
  folders: PhotoFolder[];
  isPending: boolean;
  onUpload: (files: FileList) => void;
  onClose: () => void;
}

export default function PhotoUploadModal({
  uploadFolder,
  onUploadFolderChange,
  uploadTags,
  onToggleTag,
  tags,
  folders,
  isPending,
  onUpload,
  onClose,
}: PhotoUploadModalProps) {
  const { t } = useTranslation('photos');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFilesChange = () => {
    const files = fileRef.current?.files;
    if (files?.length) onUpload(files);
  };

  return (
    <Modal
      title={t('upload.title')}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            {t('upload.cancel')}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
          >
            {isPending ? t('upload.uploading') : t('upload.select')}
          </button>
        </>
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFilesChange}
      />

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
          {t('upload.folderLabel')}
        </label>
        <select
          value={uploadFolder}
          onChange={e => onUploadFolderChange(e.target.value)}
          className="input"
          style={{ width: '100%' }}
        >
          <option value="">{t('upload.noFolder')}</option>
          {folders.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
          {t('upload.tagsLabel')}
        </label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tags.map(tag => (
            <button
              key={tag.id}
              type="button"
              className={`btn btn-sm ${uploadTags.includes(tag.id) ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onToggleTag(tag.id)}
              style={uploadTags.includes(tag.id) && tag.color ? { background: tag.color, borderColor: tag.color } : undefined}
            >
              {tag.name}
            </button>
          ))}
          {tags.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('upload.noTags')}</span>}
        </div>
      </div>
    </Modal>
  );
}
