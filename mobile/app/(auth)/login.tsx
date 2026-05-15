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
import { useAuthStore } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { loginSchema, getFieldErrors } from '@rently/shared';

type ApiError = {
  response?: { data?: { error?: { message?: string } } };
  request?: unknown;
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleLogin = async () => {
    setFormError('');
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', parsed.data);
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      router.replace(data.data.user.role === 'OWNER' ? '/(owner)' : '/(tenant)');
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
        <Text style={styles.subtitle}>Gestioná tus propiedades</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, fieldErrors.email && styles.inputError]}
          placeholder="tu@email.com"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            clearFieldError('email');
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        {fieldErrors.email && <Text style={styles.errorText}>{fieldErrors.email}</Text>}

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={[styles.input, fieldErrors.password && styles.inputError]}
          placeholder="••••••••"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            clearFieldError('password');
          }}
          secureTextEntry
          autoComplete="password"
        />
        {fieldErrors.password && <Text style={styles.errorText}>{fieldErrors.password}</Text>}

        {formError ? (
          <View style={styles.formErrorBox}>
            <Text style={styles.formErrorText}>{formError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Ingresando...' : 'Ingresar'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#faf8f5' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  logo: { fontSize: 40, fontWeight: '800', color: '#e2712b', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 36 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 14 },
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
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 4, marginBottom: 8 },
  formErrorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  formErrorText: { color: '#ef4444', fontSize: 13 },
  button: {
    backgroundColor: '#6b5b45',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
