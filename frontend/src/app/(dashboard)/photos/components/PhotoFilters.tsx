'use client';

import { useTranslation } from 'react-i18next';
import type { PhotoFolder } from '@rently/shared';
import Icon from '@/components/Icon';

interface PhotoFiltersProps {
  folders: PhotoFolder[];
  activeFolder: string;
  onFilterChange: (folderId: string) => void;
}

export default function PhotoFilters({ folders, activeFolder, onFilterChange }: PhotoFiltersProps) {
  const { t } = useTranslation('photos');
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
      <button
        className={`btn btn-sm ${!activeFolder ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => onFilterChange('')}
      >
        {t('filters.all')}
      </button>
      {folders.map(f => (
        <button
          key={f.id}
          className={`btn btn-sm ${activeFolder === f.id ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onFilterChange(f.id)}
        >
          <Icon name="folder" size={12} /> {f.name}
          {f._count ? <span style={{ marginLeft: 4, opacity: 0.7 }}>({f._count.photos})</span> : null}
        </button>
      ))}
    </div>
  );
}
