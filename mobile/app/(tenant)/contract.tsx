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
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api } from '../../src/lib/api';
import { syncStorage } from '../../src/storage';

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

const PROP_TYPE: Record<string, string> = {
  APARTMENT: 'Departamento',
  HOUSE: 'Casa',
  COMMERCIAL: 'Local comercial',
  PH: 'PH',
};
const INDEX: Record<string, string> = {
  IPC: 'IPC (INDEC)',
  ICL: 'ICL (BCRA)',
  MANUAL: 'Manual (sin ajuste automático)',
};

const SIDE = 20;
const GAP = 8;
const COLS = 3;

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
function fmtMoney(n: number, currency: 'ARS' | 'USD' = 'ARS') {
  const sep = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return currency === 'USD' ? `USD ${sep}` : `$ ${sep}`;
}

export default function ContractScreen() {
  const { width } = useWindowDimensions();
  const cellSize = useMemo(() => (width - SIDE * 2 - 36 - GAP * (COLS - 1)) / COLS, [width]);
  const baseUrl = api.defaults.baseURL ?? '';
  const [lightbox, setLightbox] = useState<string | null>(null);

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
          dialogTitle: 'Documento del contrato',
        });
      } else {
        await Linking.openURL(result.uri);
      }
    },
    onError: () => Alert.alert('Error', 'No se pudo descargar el documento.'),
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
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mi Contrato</Text>
        <View style={styles.card}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>Sin contrato asignado</Text>
          <Text style={styles.emptyDesc}>
            Tu propietario aún no te asignó un contrato en el sistema.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const { details, elapsedDays, progressColor, totalDays } = useMemo(() => {
    const cur = data.currency ?? 'ARS';
    const isManual = data.adjustIndex === 'MANUAL';

    const dets: [string, string][] = [
      ['Inicio del contrato', fmtDate(data.startDate)],
      ['Vencimiento', fmtDate(data.endDate)],
      ['Monto inicial', fmtMoney(data.initialAmount, cur)],
      ['Monto actual', fmtMoney(data.monthlyAmount, cur)],
      ['Día de pago', `Día ${data.paymentDay} de cada mes`],
      ['Índice de ajuste', INDEX[data.adjustIndex] ?? data.adjustIndex],
    ];
    if (!isManual) {
      dets.push(['Frecuencia de ajuste', `Cada ${data.adjustFrequency} meses`]);
      if (data.nextAdjustDate) {
        dets.push(['Próximo ajuste', fmtDate(data.nextAdjustDate)]);
      }
    }
    if (data.lastAdjustPct !== null) {
      dets.push(['Último ajuste', `+${data.lastAdjustPct.toFixed(2)}%`]);
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
  }, [data]);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mi Contrato</Text>

        {/* 1 · Propiedad */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>PROPIEDAD</Text>
          <Text style={styles.propAddress}>{data.property.address}</Text>
          <Text style={styles.propType}>
            {PROP_TYPE[data.property.type] ?? data.property.type}
          </Text>
        </View>

        {/* 2 · Detalles del contrato */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalles del contrato</Text>
          {details.map(([k, v]) => (
            <View key={k} style={styles.detailRow}>
              <Text style={styles.detailKey}>{k}</Text>
              <Text style={styles.detailValue}>{v}</Text>
            </View>
          ))}
        </View>

        {/* 3 · Documento del contrato */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Documento del contrato</Text>
          {contractDoc ? (
            <View style={styles.docRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.docName} numberOfLines={1}>
                  {contractDoc.fileName ?? 'contrato.pdf'}
                </Text>
                <Text style={styles.docDate}>Cargado el {fmtDate(contractDoc.uploadedAt)}</Text>
              </View>
              <TouchableOpacity
                style={[styles.docBtn, downloadDoc.isPending && styles.docBtnDisabled]}
                onPress={() => downloadDoc.mutate()}
                disabled={downloadDoc.isPending}
              >
                <Text style={styles.docBtnText}>
                  {downloadDoc.isPending ? 'Descargando...' : 'Ver / Descargar'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.photoEmpty}>
              El propietario aún no cargó el documento del contrato.
            </Text>
          )}
        </View>

        {/* 4 · Fotos del inmueble */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Fotos del inmueble
            {photos.length > 0 ? (
              <Text style={styles.photoCount}>  {photos.length} foto{photos.length !== 1 ? 's' : ''}</Text>
            ) : null}
          </Text>
          {photos.length === 0 ? (
            <Text style={styles.photoEmpty}>El propietario aún no cargó fotos del inmueble.</Text>
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
            <Text style={styles.cardTitle}>Duración del contrato</Text>
            <Text style={styles.progressPct}>{data.progress}% transcurrido</Text>
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
            <Text style={styles.progressDate}>{fmtDate(data.startDate)}</Text>
            <Text style={styles.progressDate}>
              {elapsedDays} de {totalDays} días
            </Text>
            <Text style={styles.progressDate}>{fmtDate(data.endDate)}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  content: { padding: SIDE, paddingTop: 60, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf8f5' },

  title: { fontSize: 26, fontWeight: '800', color: '#2d2d2d', marginBottom: 16 },

  card: {
    backgroundColor: '#fff',
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
    color: '#aaa',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#2d2d2d', marginBottom: 14 },
  propAddress: { fontSize: 18, fontWeight: '700', color: '#2d2d2d' },
  propType: { fontSize: 14, color: '#888', marginTop: 2 },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f0ebe4',
    gap: 12,
  },
  detailKey: { fontSize: 13, color: '#888' },
  detailValue: { fontSize: 14, fontWeight: '700', color: '#2d2d2d', flexShrink: 1, textAlign: 'right' },

  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f7f4ef',
    borderRadius: 10,
    padding: 12,
  },
  docName: { fontSize: 13, fontWeight: '700', color: '#2d2d2d' },
  docDate: { fontSize: 11, color: '#aaa', marginTop: 2 },
  docBtn: {
    backgroundColor: '#6b5b45',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  docBtnDisabled: { opacity: 0.5 },
  docBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  photoCount: { fontSize: 12, fontWeight: '400', color: '#aaa' },
  photoEmpty: { fontSize: 13, color: '#aaa' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  photoCell: { borderRadius: 8, overflow: 'hidden', backgroundColor: '#f0ede6' },
  photoImg: { width: '100%', height: '100%' },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressPct: { fontSize: 13, color: '#888' },
  progressTrack: {
    height: 8,
    backgroundColor: '#f0ebe4',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 8 },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  progressDate: { fontSize: 11, color: '#aaa' },

  emptyEmoji: { fontSize: 40, textAlign: 'center', marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#2d2d2d', textAlign: 'center', marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },

  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  lightboxImg: { width: '100%', height: '80%' },
});
