'use client';

import Icon from '@/components/Icon';
import { Property } from '../types';
import { INDEX_BY_COUNTRY, TYPE_LABELS } from '../constants';
import { formatMoney, formatDateShort } from '@rently/shared';

interface ContractTabProps {
  property: Property;
  contractDoc: { fileUrl: string; fileName?: string; uploadedAt: string } | null;
  uploadingDoc: boolean;
  apiBase: string;
  contractFileRef: React.RefObject<HTMLInputElement | null>;
  onOpenContractModal: () => void;
  onUploadDoc: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ContractTab({ property, contractDoc, uploadingDoc, apiBase, contractFileRef, onOpenContractModal, onUploadDoc }: ContractTabProps) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Contrato de alquiler</span>
        <button className="btn btn-primary btn-sm" onClick={onOpenContractModal}>
          <Icon name={property.contract ? 'edit' : 'plus'} size={14} />
          {property.contract ? 'Editar' : 'Crear contrato'}
        </button>
      </div>
      {property.contract ? (
        <>
          {[
            ['Inicio', formatDateShort(property.contract.startDate)],
            ['Vencimiento', formatDateShort(property.contract.endDate)],
            ['Monto inicial', formatMoney(property.contract.initialAmount, property.contract.currency ?? 'USD')],
            ['Monto actual', formatMoney(property.contract.currentAmount, property.contract.currency ?? 'USD')],
            ['Moneda', property.contract.currency ?? 'USD'],
            ['Día de pago', `Día ${property.contract.paymentDay}`],
            ['Índice de ajuste', INDEX_BY_COUNTRY[property.country || 'AR']?.find(idx => idx.value === property.contract!.indexType)?.label ?? property.contract.indexType],
            ...(property.contract.indexType !== 'MANUAL' ? [
              ['Frecuencia de ajuste', `Cada ${property.contract.adjustFrequency} meses`] as [string, string],
              ['Próximo ajuste', property.contract.nextAdjustDate ? formatDateShort(property.contract.nextAdjustDate) : '—'] as [string, string],
            ] : []),
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)', fontSize: 14 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
              <span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Documento del contrato</div>
            {contractDoc ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                <Icon name="file" size={20} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {contractDoc.fileName ?? 'contrato.pdf'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Cargado el {formatDateShort(contractDoc.uploadedAt)}
                  </div>
                </div>
                <a
                  href={`${apiBase}${contractDoc.fileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  Ver
                </a>
                <button className="btn btn-secondary btn-sm" onClick={() => contractFileRef.current?.click()} disabled={uploadingDoc}>
                  Reemplazar
                </button>
              </div>
            ) : (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => contractFileRef.current?.click()}
                disabled={uploadingDoc}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Icon name="plus" size={14} /> {uploadingDoc ? 'Cargando...' : 'Cargar PDF'}
              </button>
            )}
            <input
              ref={contractFileRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={onUploadDoc}
            />
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="file" size={32} /></div>
          <div className="empty-text">No hay contrato activo</div>
        </div>
      )}
    </div>
  );
}
