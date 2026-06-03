'use client';

import { useRef, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getApiBaseUrl } from '@/lib/api';
import Icon from '@/components/Icon';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';

interface PhotoTag {
  id: string;
  name: string;
  color?: string;
  isDefault: boolean;
}

interface PhotoTagRel {
  tag: PhotoTag;
}

interface PropertyPhoto {
  id: string;
  fileUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  folderId?: string | null;
  uploadedAt: string;
  tags: PhotoTagRel[];
}

interface PhotoFolder {
  id: string;
  name: string;
  description?: string | null;
  _count?: { photos: number };
}

interface Property {
  id: string;
  name?: string;
  address: string;
}

export default function PhotosPage() {
  const queryClient = useQueryClient();
  const API_BASE = getApiBaseUrl();
  const [toast, setToast] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ propertyId: string; photoId: string } | null>(null);

  // Folder y tag filter per property
  const [activeFolders, setActiveFolders] = useState<Record<string, string>>({});

  // Upload modal state
  const [uploadModal, setUploadModal] = useState<{ propertyId: string } | null>(null);
  const [uploadFolder, setUploadFolder] = useState('');
  const [uploadTags, setUploadTags] = useState<string[]>([]);
  const uploadFileRef = useRef<HTMLInputElement>(null);

  // Folder management modal
  const [folderModal, setFolderModal] = useState<{ propertyId: string } | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Tag management modal
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
      setToast(`${variables.files.length} foto${variables.files.length !== 1 ? 's' : ''} cargada${variables.files.length !== 1 ? 's' : ''}`);
      setUploadModal(null);
      setUploadFolder('');
      setUploadTags([]);
    },
    onError: () => setToast('Error al cargar las fotos'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ propertyId, photoId }: { propertyId: string; photoId: string }) =>
      api.delete(`/properties/${propertyId}/photos/${photoId}`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-photos'] });
      setToast(data.data.data?.notifiedTenant ? 'Foto eliminada. Se notificó al inquilino.' : 'Foto eliminada.');
    },
    onError: () => setToast('Error al eliminar'),
    onSettled: () => setPendingDelete(null),
  });

  const createFolderMut = useMutation({
    mutationFn: ({ propertyId, name, description }: { propertyId: string; name: string; description?: string }) =>
      api.post(`/properties/${propertyId}/folders`, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-folders'] });
      setToast('Carpeta creada');
      setNewFolderName('');
      setNewFolderDesc('');
      setCreatingFolder(false);
    },
    onError: () => setToast('Error al crear la carpeta'),
  });

  const deleteFolderMut = useMutation({
    mutationFn: ({ propertyId, folderId }: { propertyId: string; folderId: string }) =>
      api.delete(`/properties/${propertyId}/folders/${folderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-folders'] });
      queryClient.invalidateQueries({ queryKey: ['property-photos'] });
      setToast('Carpeta eliminada');
    },
    onError: () => setToast('Error al eliminar la carpeta'),
  });

  const createTagMut = useMutation({
    mutationFn: ({ name, color }: { name: string; color?: string }) =>
      api.post('/tags', { name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-tags'] });
      setToast('Etiqueta creada');
      setNewTagName('');
      setNewTagColor('#6b7280');
      setCreatingTag(false);
    },
    onError: () => setToast('Error al crear la etiqueta'),
  });

  const deleteTagMut = useMutation({
    mutationFn: (tagId: string) => api.delete(`/tags/${tagId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-tags'] });
      setToast('Etiqueta eliminada');
    },
    onError: () => setToast('Error al eliminar la etiqueta'),
  });

  const handleUpload = useCallback(() => {
    const files = uploadFileRef.current?.files;
    if (!files || !files.length || !uploadModal) return;
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

            {/* Folder filters */}
            {folders.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                <button
                  className={`btn btn-sm ${!activeFolder ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveFolders(prev => ({ ...prev, [p.id]: '' }))}
                >
                  Todas
                </button>
                {folders.map(f => (
                  <button
                    key={f.id}
                    className={`btn btn-sm ${activeFolder === f.id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveFolders(prev => ({ ...prev, [p.id]: f.id }))}
                  >
                    <Icon name="folder" size={12} /> {f.name}
                    {f._count ? <span style={{ marginLeft: 4, opacity: 0.7 }}>({f._count.photos})</span> : null}
                  </button>
                ))}
              </div>
            )}

            {photos.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin fotos en esta carpeta</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginTop: 4 }}>
                {photos.map(photo => (
                  <div key={photo.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-elevated)' }}>
                    <img
                      src={`${API_BASE}${photo.thumbnailUrl ?? photo.fileUrl}`}
                      alt="Foto"
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
                      onClick={() => setPendingDelete({ propertyId: p.id, photoId: photo.id })}
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
            )}
          </div>
        );
      })}

      {/* Upload Modal */}
      {uploadModal && (
        <Modal
          title="Agregar fotos"
          onClose={() => { setUploadModal(null); setUploadFolder(''); setUploadTags([]); }}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => { setUploadModal(null); setUploadFolder(''); setUploadTags([]); }}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={() => uploadFileRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? 'Subiendo...' : 'Seleccionar fotos'}
              </button>
            </>
          }
        >
          <input
            ref={uploadFileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleUpload}
          />

          {/* Folder selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Carpeta (opcional)
            </label>
            <select
              value={uploadFolder}
              onChange={e => setUploadFolder(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">Sin carpeta</option>
              {(foldersMap[uploadModal.propertyId] ?? []).map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Tags selector */}
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
                  onClick={() => toggleTag(t.id)}
                  style={uploadTags.includes(t.id) && t.color ? { background: t.color, borderColor: t.color } : undefined}
                >
                  {t.name}
                </button>
              ))}
              {tags.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin etiquetas disponibles</span>}
            </div>
          </div>
        </Modal>
      )}

      {/* Folder management modal */}
      {folderModal && (
        <Modal
          title="Carpetas de fotos"
          onClose={() => { setFolderModal(null); setCreatingFolder(false); setNewFolderName(''); setNewFolderDesc(''); }}
          footer={
            creatingFolder ? (
              <>
                <button className="btn btn-secondary" onClick={() => { setCreatingFolder(false); setNewFolderName(''); setNewFolderDesc(''); }}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    createFolderMut.mutate({
                      propertyId: folderModal.propertyId,
                      name: newFolderName,
                      description: newFolderDesc || undefined,
                    });
                  }}
                  disabled={!newFolderName.trim()}
                >
                  Crear
                </button>
              </>
            ) : undefined
          }
        >
          {(foldersMap[folderModal.propertyId] ?? []).length === 0 && !creatingFolder ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Sin carpetas aún</div>
              <button className="btn btn-secondary btn-sm" onClick={() => setCreatingFolder(true)}>
                <Icon name="plus" size={14} /> Crear carpeta
              </button>
            </div>
          ) : (
            <div>
              {(foldersMap[folderModal.propertyId] ?? []).map(f => (
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
                        deleteFolderMut.mutate({ propertyId: folderModal.propertyId, folderId: f.id });
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
                    onChange={e => setNewFolderName(e.target.value)}
                    style={{ width: '100%', marginBottom: 8 }}
                    autoFocus
                  />
                  <input
                    className="input"
                    placeholder="Descripción (opcional)"
                    value={newFolderDesc}
                    onChange={e => setNewFolderDesc(e.target.value)}
                    style={{ width: '100%', marginBottom: 8 }}
                  />
                </div>
              ) : (
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setCreatingFolder(true)}>
                  <Icon name="plus" size={14} /> Crear carpeta
                </button>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Tag management modal */}
      {showTagModal && (
        <Modal
          title="Gestionar etiquetas"
          onClose={() => { setShowTagModal(false); setCreatingTag(false); setNewTagName(''); }}
          footer={
            creatingTag ? (
              <>
                <button className="btn btn-secondary" onClick={() => { setCreatingTag(false); setNewTagName(''); }}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => createTagMut.mutate({ name: newTagName, color: newTagColor })}
                  disabled={!newTagName.trim()}
                >
                  Crear
                </button>
              </>
            ) : undefined
          }
        >
          {tags.length === 0 && !creatingTag ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Sin etiquetas</div>
              <button className="btn btn-secondary btn-sm" onClick={() => setCreatingTag(true)}>
                <Icon name="plus" size={14} /> Crear etiqueta
              </button>
            </div>
          ) : (
            <div>
              {tags.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.color ?? '#ccc', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                    {t.isDefault && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>(por defecto)</span>}
                  </div>
                  {!t.isDefault && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        if (confirm(`¿Eliminar la etiqueta "${t.name}"?`)) {
                          deleteTagMut.mutate(t.id);
                        }
                      }}
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  )}
                </div>
              ))}
              {creatingTag ? (
                <div style={{ marginTop: 12 }}>
                  <input
                    className="input"
                    placeholder="Nombre de la etiqueta"
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    style={{ width: '100%', marginBottom: 8 }}
                    autoFocus
                  />
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Color
                  </label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['#6b7280', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewTagColor(c)}
                        style={{
                          width: 28, height: 28, borderRadius: '50%', background: c, border: newTagColor === c ? '2px solid #2d2d2d' : '2px solid transparent',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setCreatingTag(true)}>
                  <Icon name="plus" size={14} /> Crear etiqueta
                </button>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Delete confirmation */}
      {pendingDelete && (
        <Modal
          title="Eliminar foto"
          onClose={() => setPendingDelete(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPendingDelete(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={() => deleteMutation.mutate(pendingDelete)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <Icon name="alert" size={24} color="var(--danger)" />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>¿Eliminar esta foto del registro?</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                La foto dejará de verse en la galería, quedará guardada como registro en la base de datos y se le avisará al inquilino.
              </div>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}
