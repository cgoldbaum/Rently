'use client';

import Icon from '@/components/Icon';
import StatusBadge from '@/components/StatusBadge';
import { Property } from './types';

interface PropertyHeaderProps {
  property: Property;
  onBack: () => void;
  onExportPdf: () => void;
  onEdit: () => void;
  onDelete: () => void;
  exportingPdf: boolean;
}

export default function PropertyHeader({ property, onBack, onExportPdf, onEdit, onDelete, exportingPdf }: PropertyHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <button className="btn-icon" onClick={onBack}>
        <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="chevron" size={16} /></span>
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{property.name ?? property.address}</div>
        {property.name && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{property.address}</div>}
      </div>
      <StatusBadge status={property.status} />
      <button className="btn btn-secondary btn-sm" onClick={onExportPdf} disabled={exportingPdf}>
        <Icon name="file" size={14} /> {exportingPdf ? 'Exportando...' : 'Exportar PDF'}
      </button>
      <button className="btn btn-secondary btn-sm" onClick={onEdit}>
        <Icon name="edit" size={14} /> Editar
      </button>
      <button className="btn btn-danger btn-sm" onClick={onDelete}>
        <Icon name="trash" size={14} /> Eliminar
      </button>
    </div>
  );
}
