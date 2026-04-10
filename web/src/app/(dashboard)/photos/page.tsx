'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Icon from '@/components/Icon';

interface Property {
  id: string;
  name?: string;
  address: string;
}

export default function PhotosPage() {
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    api.get('/properties').then(r => setProperties(r.data.data)).catch(() => {});
  }, []);

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
      ) : properties.map(p => (
        <div className="card" key={p.id} style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div>
              <span className="card-title">{p.name ?? p.address}</span>
              {p.name && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{p.address}</span>}
            </div>
            <button className="btn btn-secondary btn-sm">
              <Icon name="camera" size={14} /> Agregar
            </button>
          </div>
          <div className="photo-grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="photo-placeholder photo-filled">
                <Icon name="photo" size={18} color="var(--text-muted)" />
                <span style={{ fontSize: 10 }}>Foto {i}</span>
              </div>
            ))}
            <div className="photo-placeholder" style={{ borderStyle: 'dashed', cursor: 'pointer' }}>
              <Icon name="plus" size={18} color="var(--text-muted)" />
              <span style={{ fontSize: 10 }}>Agregar</span>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            Las fotos se cargan al registrar el contrato · Firmadas digitalmente
          </div>
        </div>
      ))}
    </>
  );
}
