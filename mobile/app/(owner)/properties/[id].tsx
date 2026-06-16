import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import {
  styles,
  TABS,
  STATUS_LABELS,
  STATUS_COLORS,
  OverviewTab,
  ContractTab,
  TenantTab,
  PaymentsTab,
  ClaimsTab,
  AdjustmentsTab,
  ExpensasTab,
  type Property,
  type Claim,
  type Payment,
  type Adjustment,
  type ContractDoc,
  type ExpenseReceipt,
  type TabKey,
} from '../../../src/components/property-detail';

export default function PropertyDetailScreen() {
  const insets = useSafeAreaInsets();
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
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

        {tab === 'overview' ? (
          <OverviewTab
            property={property}
            onEdit={() => setShowEdit(true)}
            onDelete={confirmDeleteProperty}
            deleting={deleteProperty.isPending}
          />
        ) : null}

        {tab === 'contract' ? (
          <ContractTab
            contract={contract}
            contractDoc={contractDoc}
            baseURL={api.defaults.baseURL}
            onEditContract={() => setShowContract(true)}
            onUploadDoc={() => uploadDoc.mutate()}
            uploadingDoc={uploadDoc.isPending}
          />
        ) : null}

        {tab === 'tenant' ? (
          <TenantTab
            contract={contract}
            onAddTenant={() => setShowTenant(true)}
            onRemoveTenant={confirmDeleteTenant}
            removingTenant={deleteTenant.isPending}
          />
        ) : null}

        {tab === 'payments' ? (
          <PaymentsTab
            contract={contract}
            payments={payments}
            onAddPayment={() => setShowPayment(true)}
          />
        ) : null}

        {tab === 'claims' ? <ClaimsTab claims={claims} /> : null}

        {tab === 'adjustments' ? (
          <AdjustmentsTab contract={contract} adjustments={adjustments} />
        ) : null}

        {tab === 'photos' && id ? <PropertyPhotosTab propertyId={id} /> : null}

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

        {tab === 'expensas' ? (
          <ExpensasTab
            contract={contract}
            expensas={expensas}
            downloadingReceiptId={downloadingReceiptId}
            onOpenReceipt={openReceipt}
          />
        ) : null}
      </ScrollView>

      {showEdit && (
        <PropertyFormModal
          visible
          property={property}
          onClose={() => setShowEdit(false)}
          onSaved={refresh}
        />
      )}
      {showContract && (
        <ContractFormModal
          visible
          propertyId={property.id}
          country={property.country}
          contract={contract ?? null}
          onClose={() => setShowContract(false)}
          onSaved={refresh}
        />
      )}
      {showTenant && contractId ? (
        <TenantFormModal
          visible
          contractId={contractId}
          onClose={() => setShowTenant(false)}
          onSaved={refresh}
        />
      ) : null}
      {showPayment && contractId ? (
        <AddPaymentModal
          visible
          contractId={contractId}
          defaultCurrency={contract?.currency ?? 'USD'}
          onClose={() => setShowPayment(false)}
          onSaved={refresh}
        />
      ) : null}
    </View>
  );
}
