import { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../src/lib/api';
import { SkeletonScreen } from '../../src/components/ui/Skeleton';
import { EmptyState } from '../../src/components/ui/EmptyState';
import {
  styles,
  ClaimCard,
  ClaimDetailModal,
  type Claim,
  type PhotoAsset,
} from '../../src/components/owner-claims';

const FILTER_KEYS = ['all', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const;

export default function ClaimsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { t } = useTranslation('claims');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Claim | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<PhotoAsset | null>(null);

  const { data: claims = [], isLoading } = useQuery<Claim[]>({
    queryKey: ['claims'],
    queryFn: () => api.get('/claims').then((r: { data: { data: Claim[] } }) => r.data.data),
  });

  const resolveMutation = useMutation({
    mutationFn: async ({
      id,
      comment,
      photo,
    }: {
      id: string;
      comment: string;
      photo: PhotoAsset | null;
    }) => {
      const form = new FormData();
      if (comment) form.append('comment', comment);
      if (photo) {
        form.append('photo', {
          uri: photo.uri,
          name: photo.name,
          type: photo.type,
        } as unknown as Blob);
      }
      const res = await api.patch(`/claims/${id}/resolve`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data as Claim;
    },
    onSuccess: (updated) => {
      qc.setQueryData<Claim[]>(['claims'], (prev) =>
        (prev ?? []).map((c) => (c.id === updated.id ? updated : c))
      );
      setSelected(updated);
      setResolveOpen(false);
      setComment('');
      setPhoto(null);
    },
    onError: () => Alert.alert(t('common:error'), t('errors.resolveMarkMobileFailed')),
  });

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPhoto({
        uri: asset.uri,
        name: asset.fileName ?? `foto-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      });
    }
  };

  const openDetail = (claim: Claim) => {
    setSelected(claim);
    setResolveOpen(false);
    setComment('');
    setPhoto(null);
  };

  const closeDetail = () => {
    setSelected(null);
    setResolveOpen(false);
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of claims) {
      counts[c.status] = (counts[c.status] ?? 0) + 1;
    }
    return counts;
  }, [claims]);

  const filtered = filter === 'all' ? claims : claims.filter((c) => c.status === filter);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>{t('title')}</Text>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filters}
      >
        {FILTER_KEYS.map((key) => {
          const count = key === 'all' ? claims.length : (statusCounts[key] ?? 0);
          const active = filter === key;
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={1}
              style={[styles.filterBtn, active && styles.filterBtnActive]}
              onPress={() => setFilter(key)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {t(`filters.${key}`)}
              </Text>
              {key !== 'all' && (
                <View style={[styles.filterCount, active && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <SkeletonScreen count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          emoji="✅"
          title={filter === 'all' ? t('empty.noClaims') : t('empty.nothingInState')}
          description={
            filter === 'all'
              ? t('empty.ownerDesc')
              : t('empty.ownerFilterDesc')
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          initialNumToRender={8}
          maxToRenderPerBatch={5}
          windowSize={7}
          renderItem={({ item }) => <ClaimCard item={item} onPress={() => openDetail(item)} />}
        />
      )}

      <ClaimDetailModal
        claim={selected}
        resolveOpen={resolveOpen}
        comment={comment}
        photo={photo}
        resolving={resolveMutation.isPending}
        onClose={closeDetail}
        onOpenResolveForm={() => {
          setComment('');
          setPhoto(null);
          setResolveOpen(true);
        }}
        onCancelResolve={() => setResolveOpen(false)}
        onCommentChange={setComment}
        onPickPhoto={pickPhoto}
        onConfirmResolve={() =>
          selected && resolveMutation.mutate({ id: selected.id, comment, photo })
        }
      />
    </View>
  );
}
