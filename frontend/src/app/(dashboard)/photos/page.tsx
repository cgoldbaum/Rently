'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getApiBaseUrl } from '@/lib/api';
import Icon from '@/components/Icon';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';

interface PropertyPhoto {
  id: string;
  fileUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  uploadedAt: string;
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
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties').then(r => r.data.data),
  });

  const { data: photosMap = {} } = useQuery<Record<string, PropertyPhoto[]>>({
    queryKey: ['property-photos'],
    queryFn: async () => {
      const map: Record<string, PropertyPhoto[]> = {};
      await Promise.all(properties.map(async p => {
        try {
          const res = await api.get(`/properties/${p.id}/photos`);
          map[p.id] = res.data.data;
        } catch {
          map[p.id] = [];
        }
      }));
      return map;
    },
    enabled: properties.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ propertyId, files }: { propertyId: string; files: FileList }) => {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('images[]', f));
      return api.post(`/properties/${propertyId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['property-photos'] });
      setToast(`${variables.files.length} foto${variables.files.length !== 1 ? 's' : ''} cargada${variables.files.length !== 1 ? 's' : ''}`);
      const ref = fileRefs.current[variables.propertyId];
      if (ref) ref.value = '';
    },
    onError: () => {
      setToast('Error al cargar las fotos');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ propertyId, photoId }: { propertyId: string; photoId: string }) =>
      api.delete(`/properties/${propertyId}/photos/${photoId}`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-photos'] });
      setToast(data.data.data?.notifiedTenant ? 'Foto eliminada. Se notificó al inquilino.' : 'Foto eliminada.');
    },
    onError: () => {
      setToast('Error al eliminar');
    },
    onSettled: () => {
      setPendingDelete(null);
    },
  });

  function handleUpload(propertyId: string, files: FileList) {
    if (!files.length) return;
    uploadMutation.mutate({ propertyId, files });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteMutation.mutate(pendingDelete);
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Registro fotográfico del estado de cada inmueble al inicio del contrato. Fotos firmadas digitalmente para eliminar conflictos al devolver el depósito.
        </p>
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
        const isUploading = uploadMutation.isPending && uploadMutation.variables?.propertyId === p.id;
        return (
          <div className="card" key={p.id} style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div>
                <span className="card-title">{p.name ?? p.address}</span>
                {p.name && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{p.address}</span>}
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>({photos.length} foto{photos.length !== 1 ? 's' : ''})</span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fileRefs.current[p.id]?.click()}
                disabled={isUploading}
              >
                <Icon name="camera" size={14} /> {isUploading ? 'Subiendo...' : 'Agregar'}
              </button>
            </div>

            <input
              ref={el => { fileRefs.current[p.id] = el; }}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => e.target.files && handleUpload(p.id, e.target.files)}
            />

            {photos.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 8 }}>
                <div
                  onClick={() => fileRefs.current[p.id]?.click()}
                  style={{ width: 80, height: 80, borderRadius: 12, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 4 }}
                >
                  <Icon name="plus" size={20} color="var(--text-muted)" />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin fotos aún</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginTop: 4 }}>
                {photos.map(photo => (
                  <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-elevated)' }}>
                    <img
                      src={`${API_BASE}${photo.thumbnailUrl ?? photo.fileUrl}`}
                      alt="Foto"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
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
                <div
                  onClick={() => fileRefs.current[p.id]?.click()}
                  style={{
                    aspectRatio: '1', borderRadius: 8, border: '2px dashed var(--border)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)',
                    fontSize: 11, gap: 4,
                  }}
                >
                  <Icon name="plus" size={18} color="var(--text-muted)" />
                  Agregar
                </div>
              </div>
            )}
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
              Registro fotográfico del estado del inmueble · Firmadas digitalmente
            </div>
          </div>
        );
      })}

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
                onClick={confirmDelete}
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
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                ¿Eliminar esta foto del registro?
              </div>
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
