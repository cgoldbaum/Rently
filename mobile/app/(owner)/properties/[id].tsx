import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../src/lib/api';

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
  contract?: {
    id: string;
    startDate: string;
    endDate: string;
    initialAmount: number;
    currentAmount: number;
    currency?: 'ARS' | 'USD';
    paymentDay: number;
    indexType: string;
    tenant?: { id: string; name: string; email: string; phone?: string };
  };
  openClaims: number;
};

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

export default function PropertyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'contract' | 'claims'>('overview');

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: ['property', id],
    queryFn: () => api.get(`/properties/${id}`).then((r) => r.data.data),
    enabled: !!id,
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Volver</Text>
        </TouchableOpacity>
        <View style={[styles.badge, { backgroundColor: statusColor }]}>
          <Text style={styles.badgeText}>{statusLabel}</Text>
        </View>
      </View>

      {/* Title and Address */}
      <Text style={styles.title}>{property.name || property.address}</Text>
      {property.name && <Text style={styles.address}>{property.address}</Text>}

      {/* Key Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Tipo</Text>
          <Text style={styles.statValue}>{TYPE_LABELS[property.type] || property.type}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Superficie</Text>
          <Text style={styles.statValue}>{property.surface}m²</Text>
        </View>
        {property.antiquity !== undefined && (
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Antigüedad</Text>
            <Text style={styles.statValue}>{property.antiquity} años</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['overview', 'contract', 'claims'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab === 'overview' && 'General'}
              {tab === 'contract' && 'Contrato'}
              {tab === 'claims' && `Reclamos (${property.openClaims})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <View style={styles.section}>
          {property.description && (
            <>
              <Text style={styles.sectionTitle}>Descripción</Text>
              <Text style={styles.description}>{property.description}</Text>
            </>
          )}
          <InfoRow label="País" value={property.country || 'Argentina'} />
          <InfoRow label="Dirección" value={property.address} />
          <InfoRow label="Tipo" value={TYPE_LABELS[property.type] || property.type} />
          <InfoRow label="Superficie" value={`${property.surface}m²`} />
        </View>
      )}

      {/* Contract Tab */}
      {activeTab === 'contract' && (
        <View style={styles.section}>
          {property.contract ? (
            <>
              <InfoRow
                label="Inquilino"
                value={property.contract.tenant?.name || 'Sin asignar'}
              />
              <InfoRow label="Inicio" value={fmtDate(property.contract.startDate)} />
              <InfoRow label="Vencimiento" value={fmtDate(property.contract.endDate)} />
              <InfoRow
                label="Monto actual"
                value={fmtMoney(
                  property.contract.currentAmount,
                  property.contract.currency ?? 'ARS'
                )}
              />
              <InfoRow
                label="Monto inicial"
                value={fmtMoney(
                  property.contract.initialAmount,
                  property.contract.currency ?? 'ARS'
                )}
              />
              <InfoRow label="Día de pago" value={`Día ${property.contract.paymentDay}`} />
              <InfoRow label="Índice" value={property.contract.indexType} />

              {property.contract.tenant?.email && (
                <InfoRow label="Email" value={property.contract.tenant.email} />
              )}
              {property.contract.tenant?.phone && (
                <InfoRow label="Teléfono" value={property.contract.tenant.phone} />
              )}
            </>
          ) : (
            <Text style={styles.empty}>No hay contrato activo</Text>
          )}
        </View>
      )}

      {/* Claims Tab */}
      {activeTab === 'claims' && (
        <View style={styles.section}>
          {property.openClaims > 0 ? (
            <Text style={styles.empty}>{property.openClaims} reclamos abiertos</Text>
          ) : (
            <Text style={styles.empty}>Sin reclamos abiertos</Text>
          )}
        </View>
      )}
    </ScrollView>
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
  address: { fontSize: 14, color: '#888', paddingHorizontal: 20, marginBottom: 20 },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statLabel: { fontSize: 11, color: '#aaa', fontWeight: '600', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#2d2d2d' },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e0dbd4', marginBottom: 20 },
  tab: { flex: 1, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#6b5b45' },
  tabText: { textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#6b5b45' },

  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#2d2d2d', marginBottom: 12 },
  description: { fontSize: 14, color: '#555', marginBottom: 20, lineHeight: 20 },

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

  empty: { textAlign: 'center', color: '#aaa', marginTop: 20, fontSize: 14 },
});
