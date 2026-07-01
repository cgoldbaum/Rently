import { View, Text, FlatList, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { api } from '../../src/lib/api';
import { formatDateShort } from '@rently/shared';

type ExpenseReceipt = {
  id: string;
  period: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
};

export default function ExpensasScreen() {
  const { t } = useTranslation('payments');
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery<ExpenseReceipt[]>({
    queryKey: ['tenant-expensas'],
    queryFn: () => api.get('/tenant/expensas').then((r: { data: { data: ExpenseReceipt[] } }) => r.data.data),
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>{t('expensas.screenTitle')}</Text>
      {isLoading ? (
        <Text style={styles.loading}>{t('expensas.loading')}</Text>
      ) : !data?.length ? (
        <Text style={styles.empty}>{t('expensas.empty')}</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.period}>{item.period}</Text>
                <Text style={styles.date}>
                  {formatDateShort(item.uploadedAt)}
                </Text>
              </View>
              <Text style={styles.fileName} numberOfLines={1}>{item.fileName}</Text>
              <TouchableOpacity style={styles.button} onPress={() => Linking.openURL(`${api.defaults.baseURL}${item.fileUrl}`)}>
                <Text style={styles.buttonText}>{t('actions.viewReceipt')}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  title: { fontSize: 26, fontWeight: '800', color: '#2d2d2d', paddingHorizontal: 20, marginBottom: 16 },
  loading: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  period: { fontSize: 15, fontWeight: '700', color: '#2d2d2d' },
  date: { fontSize: 12, color: '#aaa' },
  fileName: { fontSize: 13, color: '#888', marginTop: 6 },
  button: {
    marginTop: 12,
    backgroundColor: '#6b5b45',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
