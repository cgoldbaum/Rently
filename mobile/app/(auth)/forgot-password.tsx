import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { api } from '../../src/lib/api';
import { forgotPasswordSchema, getFieldErrors } from '@rently/shared';

type ApiError = {
  response?: { data?: { error?: { message?: string } } };
  request?: unknown;
};

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setFormError('');
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', parsed.data);
      setSent(true);
    } catch (err) {
      const apiErr = err as ApiError;
      const backendMsg = apiErr.response?.data?.error?.message;
      if (backendMsg) {
        setFormError(backendMsg);
      } else if (apiErr.request) {
        setFormError('No se pudo conectar con el servidor. Revisá tu conexión.');
      } else {
        setFormError('Ocurrió un error, intentá de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>Rently</Text>
        <Text style={styles.subtitle}>Recuperá tu contraseña</Text>

        {sent ? (
          <>
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                Si el email está registrado, vas a recibir un link para restablecer tu
                contraseña en breve.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.buttonText}>Volver al inicio de sesión</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.helper}>
              Ingresá tu email y te enviaremos un link para restablecer tu contraseña.
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, fieldErrors.email && styles.inputError]}
              placeholder="tu@email.com"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setFieldErrors({});
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            {fieldErrors.email && <Text style={styles.errorText}>{fieldErrors.email}</Text>}

            {formError ? (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Enviando...' : 'Enviar link de recuperación'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchRow}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.switchText}>
                Volver al <Text style={styles.switchLink}>inicio de sesión</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#faf8f5' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  logo: { fontSize: 40, fontWeight: '800', color: '#e2712b', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 24 },
  helper: { fontSize: 14, color: '#888', marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e0dbd4',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#2d2d2d',
  },
  inputError: { borderColor: '#ef4444' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  formErrorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  formErrorText: { color: '#ef4444', fontSize: 13 },
  successBox: {
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    padding: 14,
    marginBottom: 4,
  },
  successText: { color: '#16a34a', fontSize: 14, lineHeight: 20 },
  button: {
    backgroundColor: '#6b5b45',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchRow: { marginTop: 20, alignItems: 'center' },
  switchText: { fontSize: 14, color: '#888' },
  switchLink: { color: '#e2712b', fontWeight: '700' },
});
