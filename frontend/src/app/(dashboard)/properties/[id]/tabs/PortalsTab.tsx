'use client';

import { useTranslation } from 'react-i18next';
import { PortalListing } from '../types';
import { PORTALS } from '../constants';
import { formatDateShort } from '@rently/shared';

interface PortalsTabProps {
  listings: PortalListing[];
  portalBusy: string;
  onPublish: (portal: string) => void;
  onUnpublish: (portal: string) => void;
  onPreviewPortal: (portal: { key: string; name: string; color: string }) => void;
}

export default function PortalsTab({ listings, portalBusy, onPublish, onUnpublish, onPreviewPortal }: PortalsTabProps) {
  const { t } = useTranslation('properties');
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 6 }}>{t('portal.title')}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        {t('portal.description')}
      </div>
      {PORTALS.map(portal => {
        const listing = listings.find(l => l.portal === portal.key);
        const busy = portalBusy === portal.key;
        return (
          <div
            key={portal.key}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border-light)' }}
          >
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: portal.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{portal.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {listing
                  ? t('portal.publishedOn', { date: formatDateShort(listing.publishedAt) })
                  : t('portal.notPublished')}
              </div>
            </div>
            {listing ? (
              <>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onPreviewPortal(portal)}
                >
                  {t('portal.viewListing')}
                </button>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}
                  onClick={() => onUnpublish(portal.key)}
                  disabled={busy}
                >
                  {busy ? '...' : t('portal.unpublish')}
                </button>
              </>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onPublish(portal.key)}
                disabled={busy}
              >
                {busy ? t('portal.publishing') : t('portal.publish')}
              </button>
            )}
          </div>
        );
      })}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 14, fontStyle: 'italic' }}>
        {t('portal.disclaimer')}
      </div>
    </div>
  );
}
