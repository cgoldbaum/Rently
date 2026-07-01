'use client';

import { useTranslation } from 'react-i18next';
import type { PhotoTag } from '@rently/shared';
import Modal from '@/components/Modal';
import Icon from '@/components/Icon';

interface TagManagementModalProps {
  tags: PhotoTag[];
  creatingTag: boolean;
  newTagName: string;
  newTagColor: string;
  onNewTagNameChange: (name: string) => void;
  onNewTagColorChange: (color: string) => void;
  onCreateTag: () => void;
  onDeleteTag: (tagId: string) => void;
  onStartCreating: () => void;
  onCancelCreating: () => void;
  onClose: () => void;
}

const TAG_COLORS = ['#6b7280', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function TagManagementModal({
  tags,
  creatingTag,
  newTagName,
  newTagColor,
  onNewTagNameChange,
  onNewTagColorChange,
  onCreateTag,
  onDeleteTag,
  onStartCreating,
  onCancelCreating,
  onClose,
}: TagManagementModalProps) {
  const { t } = useTranslation('photos');
  return (
    <Modal
      title={t('tags.title')}
      onClose={onClose}
      footer={
        creatingTag ? (
          <>
            <button className="btn btn-secondary" onClick={onCancelCreating}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={onCreateTag}
              disabled={!newTagName.trim()}
            >
              {t('tags.create')}
            </button>
          </>
        ) : undefined
      }
    >
      {tags.length === 0 && !creatingTag ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{t('tags.empty')}</div>
          <button className="btn btn-secondary btn-sm" onClick={onStartCreating}>
            <Icon name="plus" size={14} /> {t('tags.create')}
          </button>
        </div>
      ) : (
        <div>
          {tags.map(tag => (
            <div key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: tag.color ?? '#ccc', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{tag.name}</span>
                {tag.isDefault && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{t('tags.default')}</span>}
              </div>
              {!tag.isDefault && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (confirm(t('tags.deleteConfirm', { name: tag.name }))) {
                      onDeleteTag(tag.id);
                    }
                  }}
                >
                  <Icon name="trash" size={12} />
                </button>
              )}
            </div>
          ))}
          {creatingTag ? (
            <div style={{ marginTop: 12 }}>
              <input
                className="input"
                placeholder={t('tags.namePlaceholder')}
                value={newTagName}
                onChange={e => onNewTagNameChange(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }}
                autoFocus
              />
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                {t('tags.color')}
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TAG_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onNewTagColorChange(c)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c, border: newTagColor === c ? '2px solid #2d2d2d' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={onStartCreating}>
              <Icon name="plus" size={14} /> {t('tags.create')}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
