'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getApiBaseUrl } from '@/lib/api';
import Icon from '@/components/Icon';
import { useToastStore } from '@/store/toast';
import type { PhotoTag, PhotoFolder, PropertyPhoto } from '@rently/shared';

import PhotoGrid from './components/PhotoGrid';
import PhotoFilters from './components/PhotoFilters';
import PhotoUploadModal from './components/PhotoUploadModal';
import PhotoDetailModal from './components/PhotoDetailModal';
import FolderManagementModal from './components/FolderManagementModal';
import TagManagementModal from './components/TagManagementModal';

interface Property {
  id: string;
  name?: string;
  address: string;
}

export default function PhotosPage() {
  const queryClient = useQueryClient();
  const API_BASE = getApiBaseUrl();
  const [pendingDelete, setPendingDelete] = useState<{ propertyId: string; photoId: string } | null>(null);

  const [activeFolders, setActiveFolders] = useState<Record<string, string>>({});

  const [uploadModal, setUploadModal] = useState<{ propertyId: string } | null>(null);
  const [uploadFolder, setUploadFolder] = useState('');
  const [uploadTags, setUploadTags] = useState<string[]>([]);

  const [folderModal, setFolderModal] = useState<{ propertyId: string } | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6b7280');
  const [creatingTag, setCreatingTag] = useState(false);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties').then(r => r.data.data),
  });

  const { data: foldersMap = {} } = useQuery<Record<string, PhotoFolder[]>>({
    queryKey: ['property-folders'],
    queryFn: async () => {
      const map: Record<string, PhotoFolder[]> = {};
      await Promise.all(properties.map(async p => {
        try {
          const res = await api.get(`/properties/${p.id}/folders`);
          map[p.id] = res.data.data;
        } catch { map[p.id] = []; }
      }));
      return map;
    },
    enabled: properties.length > 0,
  });

  const { data: tags = [] } = useQuery<PhotoTag[]>({
    queryKey: ['photo-tags'],
    queryFn: () => api.get('/tags').then(r => r.data.data),
  });

  const { data: photosMap = {} } = useQuery<Record<string, PropertyPhoto[]>>({
    queryKey: ['property-photos'],
    queryFn: async () => {
      const map: Record<string, PropertyPhoto[]> = {};
      await Promise.all(properties.map(async p => {
        const folderId = activeFolders[p.id];
        const url = folderId
          ? `/properties/${p.id}/photos?folderId=${folderId}`
          : `/properties/${p.id}/photos`;
        try {
          const res = await api.get(url);
          map[p.id] = res.data.data;
        } catch { map[p.id] = []; }
      }));
      return map;
    },
    enabled: properties.length > 0,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ propertyId, files, folderId, tagIds }: { propertyId: string; files: FileList; folderId?: string; tagIds?: string[] }) => {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('images[]', f));
      if (folderId) formData.append('folderId', folderId);
      if (tagIds?.length) {
        tagIds.forEach(t => formData.append('tagIds[]', t));
      }
      return api.post(`/properties/${propertyId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['property-photos'] });
      useToastStore.getState().showToast(`${variables.files.length} foto${variables.files.length !== 1 ? 's' : ''} cargada${variables.files.length !== 1 ? 's' : ''}`);
      setUploadModal(null);
      setUploadFolder('');
      setUploadTags([]);
    },
    onError: () => useToastStore.getState().showToast('Error al cargar las fotos'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ propertyId, photoId }: { propertyId: string; photoId: string }) =>
      api.delete(`/properties/${propertyId}/photos/${photoId}`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-photos'] });
      useToastStore.getState().showToast(data.data.data?.notifiedTenant ? 'Foto eliminada. Se notificó al inquilino.' : 'Foto eliminada.');
    },
    onError: () => useToastStore.getState().showToast('Error al eliminar'),
    onSettled: () => setPendingDelete(null),
  });

  const createFolderMut = useMutation({
    mutationFn: ({ propertyId, name, description }: { propertyId: string; name: string; description?: string }) =>
      api.post(`/properties/${propertyId}/folders`, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-folders'] });
      useToastStore.getState().showToast('Carpeta creada');
      setNewFolderName('');
      setNewFolderDesc('');
      setCreatingFolder(false);
    },
    onError: () => useToastStore.getState().showToast('Error al crear la carpeta'),
  });

  const deleteFolderMut = useMutation({
    mutationFn: ({ propertyId, folderId }: { propertyId: string; folderId: string }) =>
      api.delete(`/properties/${propertyId}/folders/${folderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-folders'] });
      queryClient.invalidateQueries({ queryKey: ['property-photos'] });
      useToastStore.getState().showToast('Carpeta eliminada');
    },
    onError: () => useToastStore.getState().showToast('Error al eliminar la carpeta'),
  });

  const createTagMut = useMutation({
    mutationFn: ({ name, color }: { name: string; color?: string }) =>
      api.post('/tags', { name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-tags'] });
      useToastStore.getState().showToast('Etiqueta creada');
      setNewTagName('');
      setNewTagColor('#6b7280');
      setCreatingTag(false);
    },
    onError: () => useToastStore.getState().showToast('Error al crear la etiqueta'),
  });

  const deleteTagMut = useMutation({
    mutationFn: (tagId: string) => api.delete(`/tags/${tagId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-tags'] });
      useToastStore.getState().showToast('Etiqueta eliminada');
    },
    onError: () => useToastStore.getState().showToast('Error al eliminar la etiqueta'),
  });

  const handleUpload = useCallback((files: FileList) => {
    if (!uploadModal) return;
    const selectedTags = uploadTags.length > 0 ? uploadTags : undefined;
    uploadMutation.mutate({
      propertyId: uploadModal.propertyId,
      files,
      folderId: uploadFolder || undefined,
      tagIds: selectedTags,
    });
  }, [uploadModal, uploadFolder, uploadTags, uploadMutation]);

  function toggleTag(tagId: string) {
    setUploadTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId],
    );
  }

  return (
    <>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Registro fotográfico del estado de cada inmueble. Organizá las fotos en carpetas y etiquetas.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowTagModal(true)}>
          <Icon name="tag" size={14} /> Gestionar etiquetas
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="camera" size={32} /></div>
            <div className="empty-text">No hay propiedades registradas</div>
          </div>
        </div>
      ) : properties.map(p => {
        const photos = photosMap[p.id] ?? [];
        const folders = foldersMap[p.id] ?? [];
        const activeFolder = activeFolders[p.id];

        return (
          <div className="card" key={p.id} style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div>
                <span className="card-title">{p.name ?? p.address}</span>
                {p.name && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{p.address}</span>}
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>({photos.length} foto{photos.length !== 1 ? 's' : ''})</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setFolderModal({ propertyId: p.id })}
                >
                  <Icon name="folder" size={14} /> Carpetas
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setUploadModal({ propertyId: p.id })}
                >
                  <Icon name="camera" size={14} /> Agregar
                </button>
              </div>
            </div>

            {folders.length > 0 && (
              <PhotoFilters
                folders={folders}
                activeFolder={activeFolder ?? ''}
                onFilterChange={(folderId) =>
                  setActiveFolders(prev => ({ ...prev, [p.id]: folderId }))
                }
              />
            )}

            <PhotoGrid
              photos={photos}
              apiBase={API_BASE}
              propertyId={p.id}
              onDelete={(propertyId, photoId) => setPendingDelete({ propertyId, photoId })}
            />
          </div>
        );
      })}

      {uploadModal && (
        <PhotoUploadModal
          uploadFolder={uploadFolder}
          onUploadFolderChange={setUploadFolder}
          uploadTags={uploadTags}
          onToggleTag={toggleTag}
          tags={tags}
          folders={foldersMap[uploadModal.propertyId] ?? []}
          isPending={uploadMutation.isPending}
          onUpload={handleUpload}
          onClose={() => { setUploadModal(null); setUploadFolder(''); setUploadTags([]); }}
        />
      )}

      {folderModal && (
        <FolderManagementModal
          folders={foldersMap[folderModal.propertyId] ?? []}
          creatingFolder={creatingFolder}
          newFolderName={newFolderName}
          newFolderDesc={newFolderDesc}
          onNewFolderNameChange={setNewFolderName}
          onNewFolderDescChange={setNewFolderDesc}
          onCreateFolder={() => {
            createFolderMut.mutate({
              propertyId: folderModal.propertyId,
              name: newFolderName,
              description: newFolderDesc || undefined,
            });
          }}
          onDeleteFolder={(folderId) => {
            deleteFolderMut.mutate({ propertyId: folderModal.propertyId, folderId });
          }}
          onStartCreating={() => setCreatingFolder(true)}
          onCancelCreating={() => { setCreatingFolder(false); setNewFolderName(''); setNewFolderDesc(''); }}
          onClose={() => { setFolderModal(null); setCreatingFolder(false); setNewFolderName(''); setNewFolderDesc(''); }}
        />
      )}

      {showTagModal && (
        <TagManagementModal
          tags={tags}
          creatingTag={creatingTag}
          newTagName={newTagName}
          newTagColor={newTagColor}
          onNewTagNameChange={setNewTagName}
          onNewTagColorChange={setNewTagColor}
          onCreateTag={() => createTagMut.mutate({ name: newTagName, color: newTagColor })}
          onDeleteTag={(tagId) => deleteTagMut.mutate(tagId)}
          onStartCreating={() => setCreatingTag(true)}
          onCancelCreating={() => { setCreatingTag(false); setNewTagName(''); }}
          onClose={() => { setShowTagModal(false); setCreatingTag(false); setNewTagName(''); }}
        />
      )}

      <PhotoDetailModal
        pendingDelete={pendingDelete}
        isPending={deleteMutation.isPending}
        onConfirm={(data) => deleteMutation.mutate(data)}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
