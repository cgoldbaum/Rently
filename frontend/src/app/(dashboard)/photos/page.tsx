'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import Icon from '@/components/Icon';
import Toast from '@/components/Toast';

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
  photos: PropertyPhoto[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function PhotosPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [photosMap, setPhotosMap] = useState<Record<string, PropertyPhoto[]>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    api.get('/properties').then(async r => {
      const props: Property[] = r.data.data;
      setProperties(props);
      const map: Record<string, PropertyPhoto[]> = {};
      await Promise.all(props.map(async p => {
        try {
          const res = await api.get(`/properties/${p.id}/photos`);
          map[p.id] = res.data.data;
        } catch {
          map[p.id] = [];
        }
      }));
      setPhotosMap(map);
    }).catch(() => {});
  }, []);

  async function handleUpload(propertyId: string, files: FileList) {
    if (!files.length) return;
    setUploading(prev => ({ ...prev, [propertyId]: true }));
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('images[]', f));
      const { data } = await api.post(`/properties/${propertyId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotosMap(prev => ({ ...prev, [propertyId]: data.data }));
      setToast(`${files.length} foto${files.length !== 1 ? 's' : ''} cargada${files.length !== 1 ? 's' : ''}`);
    } catch {
      setToast('Error al cargar las fotos');
    } finally {
      setUploading(prev => ({ ...prev, [propertyId]: false }));
      const ref = fileRefs.current[propertyId];
      if (ref) ref.value = '';
    }
  }

  async function handleDelete(propertyId: string, photoId: string) {
    if (!confirm('¿Eliminar esta foto?')) return;
    try {
      await api.delete(`/properties/${propertyId}/photos/${photoId}`);
      setPhotosMap(prev => ({ ...prev, [propertyId]: (prev[propertyId] ?? []).filter(p => p.id !== photoId) }));
      setToast('Foto eliminada');
    } catch {
      setToast('Error al eliminar');
    }
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
        const isUploading = uploading[p.id] ?? false;
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
                      onClick={() => handleDelete(p.id, photo.id)}
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

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}
