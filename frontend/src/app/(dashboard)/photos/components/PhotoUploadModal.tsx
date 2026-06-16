'use client';

import { useRef } from 'react';
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
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFilesChange = () => {
    const files = fileRef.current?.files;
    if (files?.length) onUpload(files);
  };

  return (
    <Modal
      title="Agregar fotos"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
          >
            {isPending ? 'Subiendo...' : 'Seleccionar fotos'}
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
          Carpeta (opcional)
        </label>
        <select
          value={uploadFolder}
          onChange={e => onUploadFolderChange(e.target.value)}
          className="input"
          style={{ width: '100%' }}
        >
          <option value="">Sin carpeta</option>
          {folders.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
          Etiquetas (opcional)
        </label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tags.map(t => (
            <button
              key={t.id}
              type="button"
              className={`btn btn-sm ${uploadTags.includes(t.id) ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onToggleTag(t.id)}
              style={uploadTags.includes(t.id) && t.color ? { background: t.color, borderColor: t.color } : undefined}
            >
              {t.name}
            </button>
          ))}
          {tags.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin etiquetas disponibles</span>}
        </div>
      </div>
    </Modal>
  );
}
