'use client';

import { useTranslation } from 'react-i18next';
import Icon from '@/components/Icon';
import { Property } from '../types';
import { INDEX_BY_COUNTRY } from '../constants';
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
  const { t } = useTranslation('properties');
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{t('contract.title')}</span>
        <button className="btn btn-primary btn-sm" onClick={onOpenContractModal}>
          <Icon name={property.contract ? 'edit' : 'plus'} size={14} />
          {property.contract ? t('contract.edit') : t('contract.create')}
        </button>
      </div>
      {property.contract ? (
        <>
          {[
            [t('contract.startDate'), formatDateShort(property.contract.startDate)],
            [t('contract.endDate'), formatDateShort(property.contract.endDate)],
            [t('contract.initialAmount'), formatMoney(property.contract.initialAmount, property.contract.currency ?? 'USD')],
            [t('contract.currentAmount'), formatMoney(property.contract.currentAmount, property.contract.currency ?? 'USD')],
            [t('contract.currency'), property.contract.currency ?? 'USD'],
            [t('contract.paymentDay'), t('contract.dayFormat', { day: property.contract.paymentDay })],
            [t('contract.indexType'), INDEX_BY_COUNTRY[property.country || 'AR']?.find(idx => idx.value === property.contract!.indexType)?.label ?? property.contract.indexType],
            ...(property.contract.indexType !== 'MANUAL' ? [
              [t('contract.adjustFrequency'), t('contract.everyNMonths', { months: property.contract.adjustFrequency })] as [string, string],
              [t('contract.nextAdjust'), property.contract.nextAdjustDate ? formatDateShort(property.contract.nextAdjustDate) : '—'] as [string, string],
            ] : []),
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)', fontSize: 14 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
              <span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{t('contract.document')}</div>
            {contractDoc ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                <Icon name="file" size={20} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {contractDoc.fileName ?? t('contracts:document.contractPdf')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {formatDateShort(contractDoc.uploadedAt)}
                  </div>
                </div>
                <a
                  href={`${apiBase}${contractDoc.fileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  {t('contract.viewDoc')}
                </a>
                <button className="btn btn-secondary btn-sm" onClick={() => contractFileRef.current?.click()} disabled={uploadingDoc}>
                  {t('contract.replaceDoc')}
                </button>
              </div>
            ) : (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => contractFileRef.current?.click()}
                disabled={uploadingDoc}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Icon name="plus" size={14} /> {uploadingDoc ? t('contract.uploadingDoc') : t('contract.uploadDoc')}
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
          <div className="empty-text">{t('contract.noContract')}</div>
        </div>
      )}
    </div>
  );
}
