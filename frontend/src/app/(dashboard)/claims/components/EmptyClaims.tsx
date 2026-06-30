'use client';

import { useTranslation } from 'react-i18next';
import Icon from '@/components/Icon';

interface EmptyClaimsProps {
  filter: string;
}

export default function EmptyClaims({ filter }: EmptyClaimsProps) {
  const { t } = useTranslation('claims');

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 40, textAlign: 'center' }}>
      <Icon name="clipboard" size={32} color="var(--text-muted)" />
      <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 14 }}>
        {filter !== 'all' ? t('empty.noClaimsFiltered') : t('empty.noClaims')}
      </div>
    </div>
  );
}
