import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

// Tarjeta del dashboard del propietario: bajo demanda, la IA arma un resumen
// del estado del mes. On-demand para no gastar la API de IA en cada carga.
export function MonthlySummaryCard() {
  const { t } = useTranslation('dashboard');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await api.get('/ai/monthly-summary');
      setText(res.data.data.text?.trim() ?? '');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>🤖  {t('aiSummary.title')}</Text>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={generate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>
              {text ? t('aiSummary.regenerate') : t('aiSummary.generate')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {error ? (
        <Text style={styles.error}>{t('aiSummary.error')}</Text>
      ) : text ? (
        <Text style={styles.body}>{text}</Text>
      ) : (
        <Text style={styles.hint}>{t('aiSummary.hint')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  title: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', flex: 1 },
  button: {
    backgroundColor: '#6b5b45',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  body: { fontSize: 14, color: '#555', lineHeight: 21, marginTop: 12 },
  hint: { fontSize: 13, color: '#aaa', marginTop: 12 },
  error: { fontSize: 13, color: '#dc2626', marginTop: 12 },
});
