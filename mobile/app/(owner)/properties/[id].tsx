import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../../../src/lib/api';
import { syncStorage } from '../../../src/storage';
import { PropertyFormModal } from '../../../src/components/PropertyFormModal';
import { ContractFormModal } from '../../../src/components/ContractFormModal';
import { TenantFormModal } from '../../../src/components/TenantFormModal';
import { AddPaymentModal } from '../../../src/components/AddPaymentModal';
import { PropertyPhotosTab } from '../../../src/components/PropertyPhotosTab';
import { PortalListingsTab } from '../../../src/components/PortalListingsTab';

type Tenant = { id: string; name: string; email: string; phone?: string };
type Contract = {
  id: string;
  startDate: string;
  endDate: string;
  initialAmount: number;
  currentAmount: number;
  currency?: 'ARS' | 'USD';
  paymentDay: number;
  indexType: string;
  adjustFrequency: number;
  nextAdjustDate?: string;
  tenant?: Tenant;
};
type Property = {
  id: string;
  name?: string;
  address: string;
  country?: string;
  type: string;
  surface: number;
  status: string;
  description?: string;
  antiquity?: number;
  contract?: Contract;
  openClaims: number;
};
type Claim = {
  id: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
};
type Payment = {
  id: string;
  amount: number;
  currency?: 'ARS' | 'USD';
  period: string;
  dueDate: string;
  status: string;
  method?: string;
};
type Adjustment = {
  id: string;
  indexType: string;
  previousAmount: number;
  newAmount: number;
  variation: number;
  appliedAt: string;
  notified: boolean;
};
type ContractDoc = { fileUrl: string; fileName?: string; uploadedAt: string } | null;
type ExpenseReceipt = {
  id: string;
  period: string;
  fileUrl: string;
  fileName: string | null;
  uploadedAt: string;
};

type TabKey =
  | 'overview'
  | 'contract'
  | 'tenant'
  | 'payments'
  | 'claims'
  | 'adjustments'
  | 'photos'
  | 'expensas'
  | 'portals';
const TABS: [TabKey, string][] = [
  ['overview', 'General'],
  ['contract', 'Contrato'],
  ['tenant', 'Inquilino'],
  ['payments', 'Pagos'],
  ['claims', 'Reclamos'],
  ['adjustments', 'Ajustes'],
  ['photos', 'Fotos'],
  ['expensas', 'Expensas'],
  ['portals', 'Portales'],
];

const TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Departamento',
  HOUSE: 'Casa',
  COMMERCIAL: 'Comercial',
  PH: 'PH',
};
const STATUS_LABELS: Record<string, string> = {
  OCCUPIED: 'Ocupada',
  VACANT: 'Vacante',
  EXPIRING: 'Por vencer',
  ARREARS: 'En mora',
};
const STATUS_COLORS: Record<string, string> = {
  OCCUPIED: '#22c55e',
  VACANT: '#6b7280',
  EXPIRING: '#f59e0b',
  ARREARS: '#ef4444',
};
const INDEX_LABELS: Record<string, string> = { IPC: 'IPC', ICL: 'ICL', MANUAL: 'Manual' };
const PAY_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PAID: { label: 'Pagado', color: '#16a34a', bg: '#dcfce7' },
  PENDING: { label: 'Pendiente', color: '#b45309', bg: '#fef3c7' },
  LATE: { label: 'Vencido', color: '#dc2626', bg: '#fee2e2' },
  PENDING_CONFIRMATION: { label: 'A confirmar', color: '#c2410c', bg: '#ffedd5' },
};
const CLAIM_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Abierto', color: '#b45309', bg: '#fef3c7' },
  IN_PROGRESS: { label: 'En curso', color: '#1d4ed8', bg: '#dbeafe' },
  RESOLVED: { label: 'Resuelto', color: '#16a34a', bg: '#dcfce7' },
};
const CAT_LABELS: Record<string, string> = {
  PLUMBING: 'Plomería',
  ELECTRICITY: 'Electricidad',
  STRUCTURE: 'Estructura',
  OTHER: 'Otro',
};

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
function periodLabel(period: string) {
  const [y, m] = period.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });
}

export default function PropertyDetailScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<TabKey>('overview');
  const [showEdit, setShowEdit] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [showTenant, setShowTenant] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: ['property', id],
    queryFn: () => api.get(`/properties/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });
  const contract = property?.contract;
  const contractId = contract?.id;

  const { data: claims = [] } = useQuery<Claim[]>({
    queryKey: ['property-claims', id],
    queryFn: () => api.get(`/properties/${id}/claims`).then((r) => r.data.data),
    enabled: !!id,
  });
  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ['contract-payments', contractId],
    queryFn: () => api.get(`/contracts/${contractId}/payments`).then((r) => r.data.data),
    enabled: !!contractId,
  });
  const { data: adjustments = [] } = useQuery<Adjustment[]>({
    queryKey: ['contract-adjustments', contractId],
    queryFn: () => api.get(`/contracts/${contractId}/adjustments`).then((r) => r.data.data),
    enabled: !!contractId,
  });
  const { data: contractDoc = null } = useQuery<ContractDoc>({
    queryKey: ['contract-doc', contractId],
    queryFn: () =>
      api.get(`/contracts/${contractId}/document`).then((r) => r.data.data).catch(() => null),
    enabled: !!contractId,
  });
  const { data: expensas = [] } = useQuery<ExpenseReceipt[]>({
    queryKey: ['property-expensas', id],
    queryFn: () => api.get(`/properties/${id}/expensas`).then((r) => r.data.data),
    enabled: !!id,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['property', id] });
    qc.invalidateQueries({ queryKey: ['properties'] });
    qc.invalidateQueries({ queryKey: ['contract-payments', contractId] });
  };

  const deleteProperty = useMutation({
    mutationFn: () => api.delete(`/properties/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'No se pudo eliminar la propiedad.'),
  });

  const deleteTenant = useMutation({
    mutationFn: () => api.delete(`/contracts/${contractId}/tenant`),
    onSuccess: () => {
      refresh();
      Alert.alert('Listo', 'Inquilino quitado.');
    },
    onError: () => Alert.alert('Error', 'No se pudo quitar el inquilino.'),
  });

  const exportPdf = useMutation({
    mutationFn: async () => {
      const baseUrl = api.defaults.baseURL;
      const token = syncStorage.getItem('accessToken');
      const fileUri = `${FileSystem.cacheDirectory}propiedad-${id}.pdf`;
      const result = await FileSystem.downloadAsync(
        `${baseUrl}/properties/${id}/export-description`,
        fileUri,
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
      );
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Ficha de la propiedad',
        });
      } else {
        await Linking.openURL(result.uri);
      }
    },
    onError: () => Alert.alert('Error', 'No se pudo exportar el PDF.'),
  });

  const openReceipt = async (receipt: ExpenseReceipt) => {
    setDownloadingReceiptId(receipt.id);
    try {
      const token = syncStorage.getItem('accessToken');
      const ext = receipt.fileName?.split('.').pop() ?? 'pdf';
      const fileUri = `${FileSystem.cacheDirectory}expensa-${receipt.period}.${ext}`;
      const result = await FileSystem.downloadAsync(
        `${api.defaults.baseURL}${receipt.fileUrl}`,
        fileUri,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri);
      } else {
        await Linking.openURL(result.uri);
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir el comprobante.');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const uploadDoc = useMutation({
    mutationFn: async () => {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (res.canceled || !res.assets.length) return null;
      const asset = res.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.name,
        type: 'application/pdf',
      } as unknown as Blob);
      await api.post(`/contracts/${contractId}/document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return true;
    },
    onSuccess: (ok) => {
      if (ok) qc.invalidateQueries({ queryKey: ['contract-doc', contractId] });
    },
    onError: () => Alert.alert('Error', 'No se pudo cargar el documento.'),
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6b5b45" size="large" />
      </View>
    );
  }
  if (!property) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>No se pudo cargar la propiedad</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[property.status] ?? '#aaa';
  const statusLabel = STATUS_LABELS[property.status] ?? property.status;

  const confirmDeleteProperty = () =>
    Alert.alert('Eliminar propiedad', 'Se eliminará la propiedad y todos sus datos. Es irreversible.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteProperty.mutate() },
    ]);

  const confirmDeleteTenant = () =>
    Alert.alert('Quitar inquilino', '¿Desvincular al inquilino de este contrato?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => deleteTenant.mutate() },
    ]);

  // Last 18 months for the expensas view.
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const receiptByPeriod = new Map(expensas.map((r) => [r.period, r]));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>← Volver</Text>
          </TouchableOpacity>
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{statusLabel}</Text>
          </View>
        </View>

        <Text style={styles.title}>{property.name || property.address}</Text>
        {property.name ? <Text style={styles.address}>{property.address}</Text> : null}

        <TouchableOpacity
          style={[styles.exportBtn, exportPdf.isPending && styles.disabled]}
          onPress={() => exportPdf.mutate()}
          disabled={exportPdf.isPending}
        >
          <Text style={styles.exportBtnText}>
            {exportPdf.isPending ? 'Exportando...' : '⬇ Exportar PDF'}
          </Text>
        </TouchableOpacity>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabs}
        >
          {TABS.map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, tab === key && styles.tabActive]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
                {key === 'claims' ? `${label} (${claims.length})` : label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Overview */}
        {tab === 'overview' ? (
          <View style={styles.section}>
            {property.description ? (
              <>
                <Text style={styles.sectionTitle}>Descripción</Text>
                <Text style={styles.description}>{property.description}</Text>
              </>
            ) : null}
            <InfoRow label="País" value={property.country || 'AR'} />
            <InfoRow label="Dirección" value={property.address} />
            <InfoRow label="Tipo" value={TYPE_LABELS[property.type] || property.type} />
            <InfoRow label="Superficie" value={`${property.surface} m²`} />
            {property.antiquity != null ? (
              <InfoRow label="Antigüedad" value={`${property.antiquity} años`} />
            ) : null}
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowEdit(true)}>
              <Text style={styles.primaryBtnText}>Editar propiedad</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dangerBtn} onPress={confirmDeleteProperty}>
              <Text style={styles.dangerBtnText}>
                {deleteProperty.isPending ? 'Eliminando...' : 'Eliminar propiedad'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Contract */}
        {tab === 'contract' ? (
          <View style={styles.section}>
            {contract ? (
              <>
                <InfoRow label="Inicio" value={fmtDate(contract.startDate)} />
                <InfoRow label="Vencimiento" value={fmtDate(contract.endDate)} />
                <InfoRow
                  label="Monto inicial"
                  value={fmtMoney(contract.initialAmount, contract.currency ?? 'ARS')}
                />
                <InfoRow
                  label="Monto actual"
                  value={fmtMoney(contract.currentAmount, contract.currency ?? 'ARS')}
                />
                <InfoRow label="Moneda" value={contract.currency ?? 'ARS'} />
                <InfoRow label="Día de pago" value={`Día ${contract.paymentDay}`} />
                <InfoRow
                  label="Índice de ajuste"
                  value={INDEX_LABELS[contract.indexType] || contract.indexType}
                />
                {contract.indexType !== 'MANUAL' ? (
                  <>
                    <InfoRow
                      label="Frecuencia de ajuste"
                      value={`Cada ${contract.adjustFrequency} meses`}
                    />
                    <InfoRow
                      label="Próximo ajuste"
                      value={contract.nextAdjustDate ? fmtDate(contract.nextAdjustDate) : '—'}
                    />
                  </>
                ) : null}

                <Text style={styles.docTitle}>Documento del contrato</Text>
                {contractDoc ? (
                  <View style={styles.docCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docName}>{contractDoc.fileName ?? 'contrato.pdf'}</Text>
                      <Text style={styles.docDate}>Cargado el {fmtDate(contractDoc.uploadedAt)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.docBtn}
                      onPress={() =>
                        Linking.openURL(`${api.defaults.baseURL}${contractDoc.fileUrl}`)
                      }
                    >
                      <Text style={styles.docBtnText}>Ver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.docBtn} onPress={() => uploadDoc.mutate()}>
                      <Text style={styles.docBtnText}>
                        {uploadDoc.isPending ? '...' : 'Reemplazar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.outlineBtn} onPress={() => uploadDoc.mutate()}>
                    <Text style={styles.outlineBtnText}>
                      {uploadDoc.isPending ? 'Cargando...' : '+ Cargar PDF del contrato'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowContract(true)}>
                  <Text style={styles.primaryBtnText}>Editar contrato</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Esta propiedad no tiene contrato.</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowContract(true)}>
                  <Text style={styles.primaryBtnText}>Crear contrato</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

        {/* Tenant */}
        {tab === 'tenant' ? (
          <View style={styles.section}>
            {!contract ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  Creá primero un contrato para poder vincular un inquilino.
                </Text>
              </View>
            ) : contract.tenant ? (
              <>
                <InfoRow label="Nombre" value={contract.tenant.name} />
                <InfoRow label="Email" value={contract.tenant.email} />
                <InfoRow label="Teléfono" value={contract.tenant.phone || '—'} />
                <TouchableOpacity style={styles.dangerBtn} onPress={confirmDeleteTenant}>
                  <Text style={styles.dangerBtnText}>
                    {deleteTenant.isPending ? 'Quitando...' : 'Quitar inquilino'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>El contrato no tiene un inquilino vinculado.</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowTenant(true)}>
                  <Text style={styles.primaryBtnText}>Vincular inquilino</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

        {/* Payments */}
        {tab === 'payments' ? (
          <View style={styles.section}>
            {!contract ? (
              <Text style={styles.empty}>Creá un contrato para registrar cobros.</Text>
            ) : (
              <>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowPayment(true)}>
                  <Text style={styles.primaryBtnText}>+ Registrar cobro</Text>
                </TouchableOpacity>
                {payments.length === 0 ? (
                  <Text style={styles.empty}>Sin cobros registrados.</Text>
                ) : (
                  payments.map((p) => {
                    const st = PAY_STATUS[p.status] ?? PAY_STATUS.PENDING;
                    return (
                      <View key={p.id} style={styles.rowCard}>
                        <View style={styles.rowTop}>
                          <Text style={styles.rowTitle}>{p.period}</Text>
                          <View style={[styles.miniBadge, { backgroundColor: st.bg }]}>
                            <Text style={[styles.miniBadgeText, { color: st.color }]}>
                              {st.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.rowAmount}>
                          {fmtMoney(p.amount, p.currency ?? contract.currency ?? 'ARS')}
                        </Text>
                        <Text style={styles.rowMeta}>
                          Vence {fmtDate(p.dueDate)}
                          {p.method ? ` · ${p.method}` : ''}
                        </Text>
                      </View>
                    );
                  })
                )}
              </>
            )}
          </View>
        ) : null}

        {/* Claims */}
        {tab === 'claims' ? (
          <View style={styles.section}>
            {claims.length === 0 ? (
              <Text style={styles.empty}>Sin reclamos para esta propiedad.</Text>
            ) : (
              claims.map((c) => {
                const st = CLAIM_STATUS[c.status] ?? CLAIM_STATUS.OPEN;
                return (
                  <View key={c.id} style={styles.rowCard}>
                    <View style={styles.rowTop}>
                      <Text style={styles.rowTitle}>{CAT_LABELS[c.category] || c.category}</Text>
                      <View style={[styles.miniBadge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.miniBadgeText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.rowDesc}>{c.description}</Text>
                    <Text style={styles.rowMeta}>{fmtDate(c.createdAt)}</Text>
                  </View>
                );
              })
            )}
          </View>
        ) : null}

        {/* Adjustments */}
        {tab === 'adjustments' ? (
          <View style={styles.section}>
            {!contract ? (
              <Text style={styles.empty}>Creá un contrato para ver los ajustes.</Text>
            ) : adjustments.length === 0 ? (
              <Text style={styles.empty}>Todavía no se aplicaron ajustes.</Text>
            ) : (
              adjustments.map((a) => (
                <View key={a.id} style={styles.rowCard}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowTitle}>{INDEX_LABELS[a.indexType] || a.indexType}</Text>
                    <Text style={styles.adjPct}>+{a.variation.toFixed(1)}%</Text>
                  </View>
                  <Text style={styles.rowMeta}>{fmtDate(a.appliedAt)}</Text>
                  <Text style={styles.adjAmounts}>
                    {fmtMoney(a.previousAmount, contract.currency ?? 'ARS')} →{' '}
                    {fmtMoney(a.newAmount, contract.currency ?? 'ARS')}
                  </Text>
                  {a.notified ? (
                    <Text style={styles.adjNotified}>✓ Ambas partes notificadas</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        ) : null}

        {/* Photos */}
        {tab === 'photos' && id ? <PropertyPhotosTab propertyId={id} /> : null}

        {/* Portals */}
        {tab === 'portals' && id ? (
          <PortalListingsTab
            propertyId={id}
            property={{
              name: property.name,
              address: property.address,
              type: property.type,
              surface: property.surface,
              antiquity: property.antiquity,
              description: property.description,
              contract: contract
                ? { currentAmount: contract.currentAmount, currency: contract.currency }
                : undefined,
            }}
          />
        ) : null}

        {/* Expensas */}
        {tab === 'expensas' ? (
          <View style={styles.section}>
            {!contract?.tenant ? (
              <Text style={styles.empty}>
                Las expensas aparecen cuando hay un inquilino vinculado.
              </Text>
            ) : (
              months.map((period) => {
                const receipt = receiptByPeriod.get(period);
                if (receipt) {
                  const isLoading = downloadingReceiptId === receipt.id;
                  return (
                    <TouchableOpacity
                      key={period}
                      style={styles.rowCard}
                      onPress={() => openReceipt(receipt)}
                      disabled={isLoading}
                      activeOpacity={0.7}
                    >
                      <View style={styles.rowTop}>
                        <Text style={[styles.rowTitle, { textTransform: 'capitalize' }]}>
                          {periodLabel(period)}
                        </Text>
                        <Text style={styles.docBtnText}>
                          {isLoading ? 'Abriendo...' : 'Ver →'}
                        </Text>
                      </View>
                      <Text style={styles.rowMeta}>
                        {receipt.fileName ?? 'Comprobante'} · {fmtDate(receipt.uploadedAt)}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <View key={period} style={[styles.rowCard, styles.rowCardMuted]}>
                    <View style={styles.rowTop}>
                      <Text style={[styles.rowTitle, { textTransform: 'capitalize', color: '#bbb' }]}>
                        {periodLabel(period)}
                      </Text>
                      <Text style={styles.rowMeta}>Sin comprobante</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : null}
      </ScrollView>

      <PropertyFormModal
        visible={showEdit}
        property={property}
        onClose={() => setShowEdit(false)}
        onSaved={refresh}
      />
      <ContractFormModal
        visible={showContract}
        propertyId={property.id}
        country={property.country}
        contract={contract ?? null}
        onClose={() => setShowContract(false)}
        onSaved={refresh}
      />
      {contractId ? (
        <>
          <TenantFormModal
            visible={showTenant}
            contractId={contractId}
            onClose={() => setShowTenant(false)}
            onSaved={refresh}
          />
          <AddPaymentModal
            visible={showPayment}
            contractId={contractId}
            defaultCurrency={contract?.currency ?? 'USD'}
            onClose={() => setShowPayment(false)}
            onSaved={refresh}
          />
        </>
      ) : null}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  content: { paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf8f5' },
  error: { color: '#dc2626', textAlign: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backBtn: { fontSize: 14, color: '#6b5b45', fontWeight: '600' },
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  title: { fontSize: 26, fontWeight: '800', color: '#2d2d2d', paddingHorizontal: 20, marginBottom: 4 },
  address: { fontSize: 14, color: '#888', paddingHorizontal: 20, marginBottom: 12 },

  exportBtn: {
    marginHorizontal: 20,
    backgroundColor: '#f0ede6',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 14,
  },
  exportBtnText: { color: '#6b5b45', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.5 },

  tabsScroll: { borderBottomWidth: 1, borderBottomColor: '#e0dbd4', marginBottom: 18 },
  tabs: { paddingHorizontal: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#6b5b45' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#6b5b45' },

  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#2d2d2d', marginBottom: 8 },
  description: { fontSize: 14, color: '#555', marginBottom: 16, lineHeight: 20 },

  infoRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  infoLabel: { fontSize: 12, color: '#aaa', fontWeight: '600', marginBottom: 4 },
  infoValue: { fontSize: 15, color: '#2d2d2d', fontWeight: '600' },

  emptyBox: { alignItems: 'center', paddingVertical: 10 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 20, fontSize: 14 },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 14, marginBottom: 16, lineHeight: 20 },

  primaryBtn: {
    backgroundColor: '#6b5b45',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    alignSelf: 'stretch',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dangerBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  dangerBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: '#e0dbd4',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  outlineBtnText: { color: '#6b5b45', fontSize: 14, fontWeight: '700' },

  docTitle: { fontSize: 14, fontWeight: '700', color: '#2d2d2d', marginTop: 16, marginBottom: 8 },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  docName: { fontSize: 13, fontWeight: '600', color: '#2d2d2d' },
  docDate: { fontSize: 11, color: '#aaa', marginTop: 2 },
  docBtn: {
    backgroundColor: '#f0ede6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  docBtnText: { fontSize: 12, fontWeight: '700', color: '#6b5b45' },

  rowCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  rowCardMuted: { opacity: 0.55 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#2d2d2d', flexShrink: 1 },
  rowAmount: { fontSize: 17, fontWeight: '800', color: '#6b5b45', marginTop: 6 },
  rowDesc: { fontSize: 13, color: '#555', marginTop: 6, lineHeight: 18 },
  rowMeta: { fontSize: 12, color: '#aaa', marginTop: 4 },
  miniBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  miniBadgeText: { fontSize: 11, fontWeight: '700' },
  adjPct: { fontSize: 15, fontWeight: '800', color: '#16a34a' },
  adjAmounts: { fontSize: 13, color: '#555', marginTop: 6, fontWeight: '600' },
  adjNotified: { fontSize: 12, color: '#16a34a', marginTop: 6 },
});
