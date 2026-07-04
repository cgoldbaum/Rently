import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  Alert,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api } from '../../src/lib/api';
import { formatMoney, formatDate } from '@rently/shared';
import { syncStorage } from '../../src/storage';
import { useThemeColors } from '../../src/theme/useThemeColors';
import type { ThemeColors } from '../../src/theme/colors';

type Contract = {
  property: { address: string; type: string };
  startDate: string;
  endDate: string;
  monthlyAmount: number;
  currency?: 'ARS' | 'USD';
  initialAmount: number;
  adjustIndex: string;
  adjustFrequency: number;
  paymentDay: number;
  nextAdjustDate: string | null;
  lastAdjustPct: number | null;
  progress: number;
};

type Photo = { id: string; fileUrl: string; thumbnailUrl?: string };

type ContractDoc = { fileUrl: string; fileName?: string; uploadedAt: string } | null;

const INDEX: Record<string, string> = {
  IPC: 'IPC (INDEC)',
  ICL: 'ICL (BCRA)',
};

const SIDE = 20;
const GAP = 8;
const COLS = 3;

export default function ContractScreen() {
  const { t } = useTranslation('contracts');
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cellSize = useMemo(() => (width - SIDE * 2 - 36 - GAP * (COLS - 1)) / COLS, [width]);
  const baseUrl = api.defaults.baseURL ?? '';
  const [lightbox, setLightbox] = useState<string | null>(null);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data, isLoading, isError } = useQuery<Contract>({
    queryKey: ['tenant-contract'],
    queryFn: () => api.get('/tenant/contract').then((r) => r.data.data),
  });

  const { data: photos = [] } = useQuery<Photo[]>({
    queryKey: ['tenant-photos'],
    queryFn: () => api.get('/tenant/photos').then((r) => r.data.data),
  });

  const { data: contractDoc = null } = useQuery<ContractDoc>({
    queryKey: ['tenant-contract-document'],
    queryFn: () =>
      api.get('/tenant/contract/document').then((r) => r.data.data).catch(() => null),
  });

  const downloadDoc = useMutation({
    mutationFn: async () => {
      if (!contractDoc) return;
      const token = syncStorage.getItem('accessToken');
      const fileUri = `${FileSystem.cacheDirectory}${contractDoc.fileName ?? 'contrato.pdf'}`;
      const result = await FileSystem.downloadAsync(`${baseUrl}${contractDoc.fileUrl}`, fileUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('tenant.shareDialogTitle'),
        });
      } else {
        await Linking.openURL(result.uri);
      }
    },
    onError: () => Alert.alert(t('common:error'), t('tenant.downloadFailed')),
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6b5b45" size="large" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top }]}>
        <Text style={styles.title}>{t('tenant.title')}</Text>
        <View style={styles.card}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>{t('tenant.noAssigned')}</Text>
          <Text style={styles.emptyDesc}>{t('tenant.noAssignedDesc')}</Text>
        </View>
      </ScrollView>
    );
  }

  const { details, elapsedDays, progressColor, totalDays } = useMemo(() => {
    const cur = data.currency ?? 'ARS';
    const isManual = data.adjustIndex === 'MANUAL';

    const dets: [string, string][] = [
      [t('tenant.startLabel'), formatDate(data.startDate)],
      [t('tenant.endLabel'), formatDate(data.endDate)],
      [t('tenant.initialAmount'), formatMoney(data.initialAmount, cur)],
      [t('tenant.currentAmount'), formatMoney(data.monthlyAmount, cur)],
      [t('tenant.paymentDayLabel'), t('tenant.paymentDayValue', { day: data.paymentDay })],
      [t('tenant.indexLabel'), isManual ? t('tenant.indexManual') : (INDEX[data.adjustIndex] ?? data.adjustIndex)],
    ];
    if (!isManual) {
      dets.push([t('tenant.adjustFrequencyLabel'), t('tenant.everyNMonths', { months: data.adjustFrequency })]);
      if (data.nextAdjustDate) {
        dets.push([t('tenant.nextAdjust'), formatDate(data.nextAdjustDate)]);
      }
    }
    if (data.lastAdjustPct !== null) {
      dets.push([t('tenant.lastAdjust'), t('tenant.lastAdjustValue', { pct: data.lastAdjustPct.toFixed(2) })]);
    }

    const startMs = new Date(data.startDate).getTime();
    const endMs = new Date(data.endDate).getTime();
    const totalDays = Math.max(1, Math.ceil((endMs - startMs) / 86400000));
    const elapsed = Math.min(
      Math.max(Math.ceil((Date.now() - startMs) / 86400000), 0),
      totalDays
    );
    const color = data.progress >= 90 ? '#ef4444' : data.progress >= 70 ? '#f59e0b' : '#6b5b45';

    return { details: dets, elapsedDays: elapsed, progressColor: color, totalDays };
  }, [data, t]);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top }]}>
        <Text style={styles.title}>{t('tenant.title')}</Text>

        {/* 1 · Propiedad */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('tenant.propertyLabel')}</Text>
          <Text style={styles.propAddress}>{data.property.address}</Text>
          <Text style={styles.propType}>
            {t(`domain:propertyType.${data.property.type}`, data.property.type)}
          </Text>
        </View>

        {/* 2 · Detalles del contrato */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('tenant.detailsTitle')}</Text>
          {details.map(([k, v]) => (
            <View key={k} style={styles.detailRow}>
              <Text style={styles.detailKey}>{k}</Text>
              <Text style={styles.detailValue}>{v}</Text>
            </View>
          ))}
        </View>

        {/* 3 · Documento del contrato */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('tenant.docTitle')}</Text>
          {contractDoc ? (
            <View style={styles.docRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.docName} numberOfLines={1}>
                  {contractDoc.fileName ?? t('document.contractPdf')}
                </Text>
                <Text style={styles.docDate}>{t('document.uploadedOn', { date: formatDate(contractDoc.uploadedAt) })}</Text>
              </View>
              <TouchableOpacity
                style={[styles.docBtn, downloadDoc.isPending && styles.docBtnDisabled]}
                onPress={() => downloadDoc.mutate()}
                disabled={downloadDoc.isPending}
              >
                <Text style={styles.docBtnText}>
                  {downloadDoc.isPending ? t('tenant.downloading') : t('tenant.viewDownload')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.photoEmpty}>{t('tenant.noDoc')}</Text>
          )}
        </View>

        {/* 4 · Fotos del inmueble */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t('tenant.photosTitle')}
            {photos.length > 0 ? (
              <Text style={styles.photoCount}>  {t('tenant.photosCount', { count: photos.length })}</Text>
            ) : null}
          </Text>
          {photos.length === 0 ? (
            <Text style={styles.photoEmpty}>{t('tenant.noPhotos')}</Text>
          ) : (
            <View style={styles.photoGrid}>
              {photos.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.photoCell, { width: cellSize, height: cellSize }]}
                  onPress={() => setLightbox(`${baseUrl}${p.fileUrl}`)}
                >
                  <Image
                    source={{ uri: `${baseUrl}${p.thumbnailUrl ?? p.fileUrl}` }}
                    style={styles.photoImg}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 5 · Duración del contrato */}
        <View style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={styles.cardTitle}>{t('tenant.durationTitle')}</Text>
            <Text style={styles.progressPct}>{t('tenant.elapsedPct', { pct: data.progress })}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${data.progress}%`, backgroundColor: progressColor },
              ]}
            />
          </View>
          <View style={styles.progressFooter}>
            <Text style={styles.progressDate}>{formatDate(data.startDate)}</Text>
            <Text style={styles.progressDate}>
              {t('tenant.daysOfTotal', { elapsed: elapsedDays, total: totalDays })}
            </Text>
            <Text style={styles.progressDate}>{formatDate(data.endDate)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Lightbox */}
      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <TouchableOpacity style={styles.lightbox} activeOpacity={1} onPress={() => setLightbox(null)}>
          {lightbox ? (
            <Image source={{ uri: lightbox }} style={styles.lightboxImg} contentFit="contain" />
          ) : null}
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: SIDE, paddingBottom: 32 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

    title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 16 },

    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 18,
      marginBottom: 14,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    cardLabel: {
      fontSize: 11,
      color: colors.placeholder,
      fontWeight: '700',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 14 },
    propAddress: { fontSize: 18, fontWeight: '700', color: colors.text },
    propType: { fontSize: 14, color: colors.textMuted, marginTop: 2 },

    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      gap: 12,
    },
    detailKey: { fontSize: 13, color: colors.textMuted },
    detailValue: { fontSize: 14, fontWeight: '700', color: colors.text, flexShrink: 1, textAlign: 'right' },

    docRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.backgroundElevated,
      borderRadius: 10,
      padding: 12,
    },
    docName: { fontSize: 13, fontWeight: '700', color: colors.text },
    docDate: { fontSize: 11, color: colors.placeholder, marginTop: 2 },
    docBtn: {
      backgroundColor: '#6b5b45',
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    docBtnDisabled: { opacity: 0.5 },
    docBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    photoCount: { fontSize: 12, fontWeight: '400', color: colors.placeholder },
    photoEmpty: { fontSize: 13, color: colors.placeholder },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    photoCell: { borderRadius: 8, overflow: 'hidden', backgroundColor: colors.backgroundElevated },
    photoImg: { width: '100%', height: '100%' },

    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    progressPct: { fontSize: 13, color: colors.textMuted },
    progressTrack: {
      height: 8,
      backgroundColor: colors.borderLight,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: { height: '100%', borderRadius: 8 },
    progressFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    progressDate: { fontSize: 11, color: colors.placeholder },

    emptyEmoji: { fontSize: 40, textAlign: 'center', marginBottom: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 6 },
    emptyDesc: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

    lightbox: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    lightboxImg: { width: '100%', height: '80%' },
  });
}
