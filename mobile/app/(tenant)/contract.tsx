import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';

export default function ContractScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-contract'],
    queryFn: () => api.get('/tenant/contract').then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loading}>Cargando contrato...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mi Contrato</Text>

      {data ? (
        <>
          <InfoRow label="Propiedad" value={data.propertyName} />
          <InfoRow label="Inicio" value={data.startDate} />
          <InfoRow label="Vencimiento" value={data.endDate} />
          <InfoRow label="Monto" value={`${data.currency} ${data.initialAmount?.toLocaleString('es-AR')}`} />
          <InfoRow label="Día de pago" value={`Día ${data.paymentDay}`} />
          <InfoRow label="Índice" value={data.indexType} />
        </>
      ) : (
        <Text style={styles.empty}>No tenés un contrato activo.</Text>
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
  content: { padding: 20, paddingTop: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf8f5' },
  title: { fontSize: 26, fontWeight: '800', color: '#2d2d2d', marginBottom: 20 },
  loading: { color: '#aaa' },
  empty: { color: '#aaa', textAlign: 'center', marginTop: 40 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: { fontSize: 12, color: '#aaa', fontWeight: '600', marginBottom: 4 },
  value: { fontSize: 16, color: '#2d2d2d', fontWeight: '600' },
});
