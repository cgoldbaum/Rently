'use client';

import Icon from '@/components/Icon';

interface EmptyClaimsProps {
  filter: string;
}

export default function EmptyClaims({ filter }: EmptyClaimsProps) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 40, textAlign: 'center' }}>
      <Icon name="clipboard" size={32} color="var(--text-muted)" />
      <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 14 }}>
        No hay reclamos{filter !== 'all' ? ' en este estado' : ''}
      </div>
    </div>
  );
}
