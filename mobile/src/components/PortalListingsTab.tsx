import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatMoney, formatDate } from '@rently/shared';
import { api } from '../lib/api';
import { shadowStyles } from '../styles/shared';
import { useThemeColors } from '../theme/useThemeColors';
import type { ThemeColors } from '../theme/colors';

type Listing = {
  id: string;
  portal: string;
  status: string;
  listingUrl: string;
  publishedAt: string;
};

type Photo = { id: string; fileUrl: string; thumbnailUrl?: string };

export type PropertyPreview = {
  name?: string;
  address: string;
  type: string;
  surface: number;
  antiquity?: number;
  description?: string;
  contract?: { currentAmount: number; currency?: 'ARS' | 'USD' };
};

const PORTALS: { key: string; name: string; color: string }[] = [
  { key: 'ZONAPROP', name: 'ZonaProp', color: '#ffc800' },
  { key: 'ARGENPROP', name: 'ArgenProp', color: '#e4002b' },
  { key: 'MERCADOLIBRE', name: 'MercadoLibre', color: '#3483fa' },
];

export function PortalListingsTab({
  propertyId,
  property,
}: {
  propertyId: string;
  property: PropertyPreview;
}) {
  const { t } = useTranslation('portal');
  const qc = useQueryClient();
  const baseUrl = api.defaults.baseURL ?? '';
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [preview, setPreview] = useState<{ key: string; name: string; color: string } | null>(null);

  const { data: listings = [], isLoading } = useQuery<Listing[]>({
    queryKey: ['property-listings', propertyId],
    queryFn: () => api.get(`/properties/${propertyId}/listings`).then((r) => r.data.data),
  });

  const { data: photos = [] } = useQuery<Photo[]>({
    queryKey: ['property-photos', propertyId],
    queryFn: () => api.get(`/properties/${propertyId}/photos`).then((r) => r.data.data),
  });

  const publish = useMutation({
    mutationFn: (portal: string) => api.post(`/properties/${propertyId}/listings`, { portal }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['property-listings', propertyId] }),
    onError: () => Alert.alert(t('common:error'), t('listings.publishError')),
  });

  const unpublish = useMutation({
    mutationFn: (portal: string) => api.delete(`/properties/${propertyId}/listings/${portal}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['property-listings', propertyId] }),
    onError: () => Alert.alert(t('common:error'), t('listings.unpublishError')),
  });

  const pending = publish.isPending || unpublish.isPending;
  const price = property.contract?.currentAmount;
  const currency = property.contract?.currency ?? 'ARS';

  if (isLoading) {
    return <ActivityIndicator color="#6b5b45" style={{ marginTop: 30 }} />;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.intro}>
        {t('listings.intro')}
      </Text>

      {PORTALS.map((portal) => {
        const listing = listings.find((l) => l.portal === portal.key);
        return (
          <View key={portal.key} style={[styles.card, shadowStyles.card]}>
            <View style={styles.cardTop}>
              <View style={styles.portalName}>
                <View style={[styles.dot, { backgroundColor: portal.color }]} />
                <Text style={styles.portalText}>{portal.name}</Text>
              </View>
              {listing ? (
                <View style={styles.publishedBadge}>
                  <Text style={styles.publishedBadgeText}>{t('listings.published')}</Text>
                </View>
              ) : (
                <View style={styles.draftBadge}>
                  <Text style={styles.draftBadgeText}>{t('listings.draft')}</Text>
                </View>
              )}
            </View>

            {listing ? (
              <>
                <Text style={styles.meta}>{t('listings.publishedOn', { date: formatDate(listing.publishedAt) })}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.linkBtn}
                    onPress={() => setPreview(portal)}
                  >
                    <Text style={styles.linkBtnText}>{t('listings.view')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.removeBtn, pending && styles.disabled]}
                    onPress={() => unpublish.mutate(portal.key)}
                    disabled={pending}
                  >
                    <Text style={styles.removeBtnText}>{t('listings.unpublish')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.publishBtn, pending && styles.disabled]}
                onPress={() => publish.mutate(portal.key)}
                disabled={pending}
              >
                <Text style={styles.publishBtnText}>{t('listings.publishIn', { name: portal.name })}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <Text style={styles.note}>
        {t('listings.apiNote')}
      </Text>

      {/* Listing preview */}
      <Modal
        visible={!!preview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPreview(null)}
      >
        {preview ? (
          <View style={styles.previewRoot}>
            <View style={[styles.previewHeader, { backgroundColor: preview.color }]}>
              <Text style={styles.previewHeaderText}>{preview.name}</Text>
              <TouchableOpacity onPress={() => setPreview(null)}>
                <Text style={styles.previewClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.previewBody}>
              {photos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
                  {photos.map((p) => (
                    <Image
                      key={p.id}
                      source={{ uri: `${baseUrl}${p.thumbnailUrl ?? p.fileUrl}` }}
                      style={styles.previewPhoto}
                      contentFit="cover"
                    />
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.noPhoto}>
                  <Text style={styles.noPhotoText}>{t('listings.noPhotos')}</Text>
                </View>
              )}

              {price != null ? (
                <Text style={styles.previewPrice}>
                  {formatMoney(price, currency)} <Text style={styles.previewPriceMonth}>{t('listings.perMonth')}</Text>
                </Text>
              ) : null}
              <Text style={styles.previewTitle}>{property.name || property.address}</Text>
              <Text style={styles.previewAddress}>{property.address}</Text>

              <View style={styles.specsRow}>
                <Text style={styles.spec}>{t(`domain:propertyType.${property.type}`, { defaultValue: property.type })}</Text>
                <Text style={styles.specDot}>·</Text>
                <Text style={styles.spec}>{property.surface} m²</Text>
                {property.antiquity != null ? (
                  <>
                    <Text style={styles.specDot}>·</Text>
                    <Text style={styles.spec}>{t('listings.years', { count: property.antiquity })}</Text>
                  </>
                ) : null}
              </View>

              {property.description ? (
                <>
                  <Text style={styles.descTitle}>{t('listings.descriptionTitle')}</Text>
                  <Text style={styles.descText}>{property.description}</Text>
                </>
              ) : null}

              <Text style={styles.simNote}>
                {t('listings.simNote', { name: preview.name })}
              </Text>
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    section: { paddingHorizontal: 20 },
    intro: { fontSize: 14, color: colors.textSecondary, marginBottom: 14, lineHeight: 20 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    portalName: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 12, height: 12, borderRadius: 6 },
    portalText: { fontSize: 15, fontWeight: '700', color: colors.text },
    publishedBadge: { backgroundColor: '#dcfce7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    publishedBadgeText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
    draftBadge: { backgroundColor: colors.backgroundElevated, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    draftBadgeText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
    meta: { fontSize: 12, color: colors.placeholder, marginTop: 8 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
    linkBtn: {
      flex: 1,
      backgroundColor: colors.backgroundElevated,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    linkBtnText: { fontSize: 13, fontWeight: '700', color: '#6b5b45' },
    removeBtn: {
      flex: 1,
      backgroundColor: '#fee2e2',
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    removeBtnText: { fontSize: 13, fontWeight: '700', color: '#ef4444' },
    publishBtn: {
      backgroundColor: '#6b5b45',
      borderRadius: 8,
      paddingVertical: 11,
      alignItems: 'center',
      marginTop: 12,
    },
    publishBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    disabled: { opacity: 0.5 },
    note: { fontSize: 11, color: colors.placeholder, marginTop: 10, lineHeight: 16, fontStyle: 'italic' },

    previewRoot: { flex: 1, backgroundColor: colors.background },
    previewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    previewHeaderText: { fontSize: 17, fontWeight: '800', color: colors.text },
    previewClose: { fontSize: 18, fontWeight: '700', color: colors.text },
    previewBody: { padding: 20 },
    photoStrip: { marginBottom: 16 },
    previewPhoto: { width: 240, height: 170, borderRadius: 12, marginRight: 10 },
    noPhoto: {
      height: 140,
      borderRadius: 12,
      backgroundColor: colors.backgroundElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    noPhotoText: { color: colors.placeholder, fontSize: 13 },
    previewPrice: { fontSize: 26, fontWeight: '800', color: colors.text },
    previewPriceMonth: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
    previewTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 6 },
    previewAddress: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
    specsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
    spec: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
    specDot: { fontSize: 13, color: '#ccc' },
    descTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 18, marginBottom: 6 },
    descText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    simNote: { fontSize: 11, color: colors.placeholder, marginTop: 20, fontStyle: 'italic', lineHeight: 16 },
  });
}
