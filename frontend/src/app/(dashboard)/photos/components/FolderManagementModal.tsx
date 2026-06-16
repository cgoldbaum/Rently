'use client';

import type { PhotoFolder } from '@rently/shared';
import Modal from '@/components/Modal';
import Icon from '@/components/Icon';

interface FolderManagementModalProps {
  folders: PhotoFolder[];
  creatingFolder: boolean;
  newFolderName: string;
  newFolderDesc: string;
  onNewFolderNameChange: (name: string) => void;
  onNewFolderDescChange: (desc: string) => void;
  onCreateFolder: () => void;
  onDeleteFolder: (folderId: string) => void;
  onStartCreating: () => void;
  onCancelCreating: () => void;
  onClose: () => void;
}

export default function FolderManagementModal({
  folders,
  creatingFolder,
  newFolderName,
  newFolderDesc,
  onNewFolderNameChange,
  onNewFolderDescChange,
  onCreateFolder,
  onDeleteFolder,
  onStartCreating,
  onCancelCreating,
  onClose,
}: FolderManagementModalProps) {
  return (
    <Modal
      title="Carpetas de fotos"
      onClose={onClose}
      footer={
        creatingFolder ? (
          <>
            <button className="btn btn-secondary" onClick={onCancelCreating}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={onCreateFolder}
              disabled={!newFolderName.trim()}
            >
              Crear
            </button>
          </>
        ) : undefined
      }
    >
      {folders.length === 0 && !creatingFolder ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Sin carpetas aún</div>
          <button className="btn btn-secondary btn-sm" onClick={onStartCreating}>
            <Icon name="plus" size={14} /> Crear carpeta
          </button>
        </div>
      ) : (
        <div>
          {folders.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
              <Icon name="folder" size={16} color="var(--text-secondary)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                {f.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.description}</div>}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f._count?.photos ?? 0} fotos</span>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  if (confirm(`¿Eliminar la carpeta "${f.name}"? Las fotos dentro no se eliminarán.`)) {
                    onDeleteFolder(f.id);
                  }
                }}
              >
                <Icon name="trash" size={12} />
              </button>
            </div>
          ))}
          {creatingFolder ? (
            <div style={{ marginTop: 12 }}>
              <input
                className="input"
                placeholder="Nombre de la carpeta"
                value={newFolderName}
                onChange={e => onNewFolderNameChange(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }}
                autoFocus
              />
              <input
                className="input"
                placeholder="Descripción (opcional)"
                value={newFolderDesc}
                onChange={e => onNewFolderDescChange(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }}
              />
            </div>
          ) : (
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={onStartCreating}>
              <Icon name="plus" size={14} /> Crear carpeta
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
