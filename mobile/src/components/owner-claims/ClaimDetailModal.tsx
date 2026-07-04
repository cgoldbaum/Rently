import { useState } from 'react';
import { View, Text, Modal, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@rently/shared';
import { api } from '../../lib/api';
import { claimStatusStyle } from '../../lib/claimStatus';
import { useThemeColors } from '../../theme/useThemeColors';
import { useOwnerClaimsStyles } from './styles';
import { PRIORITY_STYLE, claimLabel } from './constants';
import type { Claim, PhotoAsset } from './types';

type Props = {
  claim: Claim | null;
  resolveOpen: boolean;
  comment: string;
  photo: PhotoAsset | null;
  resolving: boolean;
  onClose: () => void;
  onOpenResolveForm: () => void;
  onCancelResolve: () => void;
  onCommentChange: (comment: string) => void;
  onPickPhoto: () => void;
  onConfirmResolve: () => void;
};

export function ClaimDetailModal({
  claim,
  resolveOpen,
  comment,
  photo,
  resolving,
  onClose,
  onOpenResolveForm,
  onCancelResolve,
  onCommentChange,
  onPickPhoto,
  onConfirmResolve,
}: Props) {
  const { t } = useTranslation('claims');
  const styles = useOwnerClaimsStyles();
  const colors = useThemeColors();
  const [suggesting, setSuggesting] = useState(false);

  const handleSuggestReply = async () => {
    if (!claim || suggesting) return;
    setSuggesting(true);
    try {
      const res = await api.post('/ai/suggest-claim-reply', {
        title: claim.title,
        description: claim.description,
      });
      const text: string = res.data.data.text?.trim() ?? '';
      if (text) onCommentChange(text);
    } catch {
      Alert.alert(t('common:error'), t('errors.aiSuggestFailed'));
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <Modal
      visible={!!claim}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {claim && (
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {claimLabel(claim, t)}
              </Text>
              <Text style={styles.modalSub}>
                {claim.tenant.contract.property.name ?? claim.tenant.contract.property.address}{' '}
                · {claim.tenant.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Badges */}
            {(() => {
              const st = claimStatusStyle(claim.status);
              const pr = PRIORITY_STYLE[claim.priority] ?? PRIORITY_STYLE.MEDIUM;
              return (
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.color }]}>
                      {t(`domain:claimStatus.${claim.status}`)}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: `${pr.color}18` }]}>
                    <Text style={[styles.badgeText, { color: pr.color }]}>
                      {t('detail.priorityBadge', { priority: t(`domain:claimPriority.${claim.priority}`) })}
                    </Text>
                  </View>
                </View>
              );
            })()}

            {/* Description */}
            <Text style={styles.sectionLabel}>{t('detail.description')}</Text>
            <Text style={styles.descriptionFull}>{claim.description}</Text>
            <Text style={styles.dateText}>{t('detail.reportedOn', { date: formatDate(claim.createdAt) })}</Text>

            {/* History */}
            {claim.history.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>{t('detail.history')}</Text>
                {claim.history.map((h, i) => {
                  const st = claimStatusStyle(h.newStatus);
                  return (
                    <View key={i} style={styles.historyItem}>
                      <View style={styles.historyTop}>
                        <Text style={[styles.historyStatus, { color: st.color }]}>
                          {t(`domain:claimStatus.${h.newStatus}`)}
                        </Text>
                        <Text style={styles.historyDate}>{formatDate(h.changedAt)}</Text>
                      </View>
                      {h.comment ? <Text style={styles.historyComment}>{h.comment}</Text> : null}
                      {h.photoUrl ? (
                        <Image
                          source={{ uri: `${api.defaults.baseURL}${h.photoUrl}` }}
                          style={styles.historyPhoto}
                          contentFit="cover"
                        />
                      ) : null}
                    </View>
                  );
                })}
              </>
            )}

            {/* Resolve button */}
            {claim.status !== 'RESOLVED' && !resolveOpen && (
              <TouchableOpacity style={styles.resolveBtn} onPress={onOpenResolveForm}>
                <Text style={styles.resolveBtnText}>{t('actions.markResolved')}</Text>
              </TouchableOpacity>
            )}

            {/* Resolve form */}
            {resolveOpen && (
              <View style={styles.resolveForm}>
                <Text style={styles.resolveFormTitle}>{t('actions.registerResolution')}</Text>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.inputLabel}>{t('form.commentOptional')}</Text>
                  <TouchableOpacity
                    onPress={handleSuggestReply}
                    disabled={suggesting}
                    style={{
                      backgroundColor: '#efe9df', borderWidth: 1, borderColor: '#6b5b45',
                      borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
                      opacity: suggesting ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ color: '#6b5b45', fontSize: 12, fontWeight: '700' }}>
                      {suggesting ? t('ai.suggesting') : t('ai.suggestReply')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.textInput}
                  multiline
                  numberOfLines={3}
                  placeholder={t('form.resolveCommentPlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  value={comment}
                  onChangeText={onCommentChange}
                  textAlignVertical="top"
                />

                <Text style={styles.inputLabel}>{t('form.photoOptional')}</Text>
                <TouchableOpacity style={styles.photoPickerBtn} onPress={onPickPhoto}>
                  <Text style={styles.photoPickerText}>
                    {photo ? t('form.changePhoto') : t('form.attachPhoto')}
                  </Text>
                </TouchableOpacity>
                {photo ? (
                  <Image source={{ uri: photo.uri }} style={styles.photoPreview} contentFit="cover" />
                ) : null}

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.confirmBtn, resolving && styles.disabledBtn]}
                    onPress={onConfirmResolve}
                    disabled={resolving}
                  >
                    <Text style={styles.confirmBtnText}>
                      {resolving ? t('common:saving') : t('actions.confirmResolution')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={onCancelResolve}>
                    <Text style={styles.cancelBtnText}>{t('common:cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </Modal>
  );
}
