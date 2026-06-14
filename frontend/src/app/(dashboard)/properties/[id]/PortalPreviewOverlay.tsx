'use client';

import { Property, PropertyPhoto } from './types';
import { TYPE_LABELS } from './constants';
import { formatMoney } from '@rently/shared';

interface PortalPreviewOverlayProps {
  portal: { key: string; name: string; color: string } | null;
  property: Property;
  photos: PropertyPhoto[];
  apiBase: string;
  onClose: () => void;
}

export default function PortalPreviewOverlay({ portal, property, photos, apiBase, onClose }: PortalPreviewOverlayProps) {
  if (!portal) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, maxWidth: 480, width: '100%', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: portal.color, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#2d2d2d' }}>{portal.name}</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 700, color: '#2d2d2d' }}>✕</button>
        </div>
        <div style={{ padding: 20, overflowY: 'auto' }}>
          {photos.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
              {photos.map(p => (
                <img
                  key={p.id}
                  src={`${apiBase}${p.thumbnailUrl ?? p.fileUrl}`}
                  alt="Foto del inmueble"
                  style={{ width: 240, height: 170, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
                />
              ))}
            </div>
          ) : (
            <div style={{ height: 140, background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Sin fotos cargadas
            </div>
          )}
          {property.contract && (
            <div style={{ fontSize: 26, fontWeight: 800 }}>
              {formatMoney(property.contract.currentAmount, property.contract.currency ?? 'USD')}
              <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}> / mes</span>
            </div>
          )}
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{property.name ?? property.address}</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>{property.address}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 12, fontWeight: 600 }}>
            {TYPE_LABELS[property.type] ?? property.type} · {property.surface} m²
            {property.antiquity != null ? ` · ${property.antiquity} años` : ''}
          </div>
          {property.description && (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 16, marginBottom: 6 }}>Descripción</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{property.description}</div>
            </>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 20, fontStyle: 'italic' }}>
            Vista previa simulada de cómo se vería el aviso publicado en {portal.name}.
          </div>
        </div>
      </div>
    </div>
  );
}
