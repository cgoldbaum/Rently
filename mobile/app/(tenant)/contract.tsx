import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';

type Contract = {
  id: string;
  propertyName: string;
  startDate: string;
  endDate: string;
  currency?: 'ARS' | 'USD';
  initialAmount: number;
  currentAmount?: number;
  paymentDay: number;
  indexType: string;
  adjustFrequency?: number;
  ownerName?: string;
  ownerEmail?: string;
  nextAdjustDate?: string;
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

export default function ContractScreen() {
  const { data, isLoading } = useQuery<Contract>({
    queryKey: ['tenant-contract'],
    queryFn: () => api.get('/tenant/contract').then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6b5b45" size="large" />
      </View>
    );
  }

  if (!data) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mi Contrato</Text>
        <Text style={styles.empty}>No tenés un contrato activo.</Text>
      </ScrollView>
    );
  }

  const now = new Date();
  const endDate = new Date(data.endDate);
  const isExpiring = (endDate.getTime() - now.getTime()) < 90 * 24 * 60 * 60 * 1000;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mi Contrato</Text>

      {/* Property info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{data.propertyName}</Text>
        <View style={[styles.badge, isExpiring && styles.badgeExpiring]}>
          <Text style={styles.badgeText}>{isExpiring ? '⚠ Por vencer' : '✓ Vigente'}</Text>
        </View>
      </View>

      {/* Key dates */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vigencia</Text>
        <InfoRow label="Inicio" value={fmtDate(data.startDate)} />
        <InfoRow label="Vencimiento" value={fmtDate(data.endDate)} />
        {data.nextAdjustDate && (
          <InfoRow label="Próximo ajuste" value={fmtDate(data.nextAdjustDate)} />
        )}
      </View>

      {/* Payment info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información de Pago</Text>
        <InfoRow label="Monto inicial" value={fmtMoney(data.initialAmount, data.currency ?? 'ARS')} />
        {data.currentAmount && (
          <InfoRow label="Monto actual" value={fmtMoney(data.currentAmount, data.currency ?? 'ARS')} />
        )}
        <InfoRow label="Día de pago" value={`Día ${data.paymentDay} de cada mes`} />
        <InfoRow label="Moneda" value={data.currency ?? 'ARS'} />
      </View>

      {/* Adjustment info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ajustes</Text>
        <InfoRow label="Índice" value={data.indexType} />
        {data.adjustFrequency && (
          <InfoRow label="Frecuencia" value={`Cada ${data.adjustFrequency} meses`} />
        )}
      </View>

      {/* Owner info */}
      {(data.ownerName || data.ownerEmail) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Propietario</Text>
          {data.ownerName && <InfoRow label="Nombre" value={data.ownerName} />}
          {data.ownerEmail && <InfoRow label="Email" value={data.ownerEmail} />}
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf8f5' },

  title: { fontSize: 26, fontWeight: '800', color: '#2d2d2d', marginBottom: 20 },
  empty: { color: '#aaa', textAlign: 'center', marginTop: 40 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#2d2d2d', marginBottom: 12 },
  badge: {
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  badgeExpiring: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#2d2d2d', marginBottom: 12 },

  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  label: { fontSize: 11, color: '#aaa', fontWeight: '600', marginBottom: 4 },
  value: { fontSize: 15, color: '#2d2d2d', fontWeight: '600' },
});
