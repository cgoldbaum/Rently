'use client';

import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/Icon';
import { Claim } from '../types';
import { CAT_LABELS } from '../constants';
import { formatDateShort } from '@rently/shared';

interface ClaimsTabProps {
  claims: Claim[];
  onSelectClaim: (claim: Claim) => void;
}

export default function ClaimsTab({ claims, onSelectClaim }: ClaimsTabProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{claims.length} reclamo{claims.length !== 1 ? 's' : ''}</span>
      </div>
      {claims.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="clipboard" size={32} /></div>
            <div className="empty-text">Sin reclamos registrados</div>
          </div>
        </div>
      ) : claims.map(c => (
        <div
          key={c.id}
          className={`claim-card priority-${c.priority}`}
          role="button"
          tabIndex={0}
          onClick={() => { onSelectClaim(c); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectClaim(c); } }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="claim-title">{CAT_LABELS[c.category] ?? c.category}</div>
              <div className="claim-meta">{formatDateShort(c.createdAt)} · Prioridad {c.priority === 'HIGH' ? 'Alta' : c.priority === 'MEDIUM' ? 'Media' : 'Baja'}</div>
            </div>
            <StatusBadge status={c.status} />
          </div>
          <div className="claim-desc">{c.description}</div>
        </div>
      ))}
    </div>
  );
}
