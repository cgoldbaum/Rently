'use client';

import { useTranslation } from 'react-i18next';
import Icon from '@/components/Icon';
import { AdjustmentHistory, Property } from '../types';
import { INDEX_BY_COUNTRY } from '../constants';
import { formatMoney, formatDateShort } from '@rently/shared';

interface AdjustmentsTabProps {
  adjustments: AdjustmentHistory[];
  property: Property;
}

export default function AdjustmentsTab({ adjustments, property }: AdjustmentsTabProps) {
  const { t } = useTranslation('contracts');
  return (
    <div>
      {adjustments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="trending" size={32} /></div>
            <div className="empty-text">{t('adjustments.noAdjustments')}</div>
          </div>
        </div>
      ) : adjustments.map(a => {
        const indexInfo = INDEX_BY_COUNTRY[property?.country || 'AR']?.find(idx => idx.value === a.indexType);
        return (
          <div key={a.id} className="adjustment-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{indexInfo?.label || a.indexType}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDateShort(a.appliedAt)}</div>
              </div>
              <div className="adj-pct">+{a.variation.toFixed(1)}%</div>
            </div>
            <div className="adj-amounts">
              <span className="adj-old">{formatMoney(a.previousAmount, property.contract?.currency ?? 'USD')}</span>
              <span style={{ color: 'var(--text-muted)' }}>→</span>
              <span className="adj-new">{formatMoney(a.newAmount, property.contract?.currency ?? 'USD')}</span>
            </div>
            {a.notified && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)' }}>✓ {t('adjustments.notifiedTenant')}</div>}
          </div>
        );
      })}
    </div>
  );
}
