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
import { registerSchema, getFieldErrors } from '@rently/shared';

type ApiError = {
  response?: { data?: { error?: { message?: string } } };
  request?: unknown;
};

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleRegister = async () => {
    setFormError('');
    const parsed = registerSchema.safeParse({ name, email, password, confirmPassword });
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      await api.post('/auth/register', {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        role: 'OWNER',
      });
      router.replace({
        pathname: '/(auth)/login',
        params: { registered: '1' },
      });
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
        <Text style={styles.subtitle}>Creá tu cuenta de propietario</Text>

        <Text style={styles.label}>Nombre completo</Text>
        <TextInput
          style={[styles.input, fieldErrors.name && styles.inputError]}
          placeholder="Ej: Martín García"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={(v) => {
            setName(v);
            clearFieldError('name');
          }}
        />
        {fieldErrors.name && <Text style={styles.errorText}>{fieldErrors.name}</Text>}

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
          placeholder="Mín. 8 caracteres, una mayúscula y un número"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            clearFieldError('password');
          }}
          secureTextEntry
        />
        {fieldErrors.password && <Text style={styles.errorText}>{fieldErrors.password}</Text>}

        <Text style={styles.label}>Confirmar contraseña</Text>
        <TextInput
          style={[styles.input, fieldErrors.confirmPassword && styles.inputError]}
          placeholder="••••••••"
          placeholderTextColor="#aaa"
          value={confirmPassword}
          onChangeText={(v) => {
            setConfirmPassword(v);
            clearFieldError('confirmPassword');
          }}
          secureTextEntry
        />
        {fieldErrors.confirmPassword && (
          <Text style={styles.errorText}>{fieldErrors.confirmPassword}</Text>
        )}

        {formError ? (
          <View style={styles.formErrorBox}>
            <Text style={styles.formErrorText}>{formError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Creando cuenta...' : 'Crear cuenta'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchRow}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.switchText}>
            ¿Ya tenés cuenta? <Text style={styles.switchLink}>Iniciá sesión</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#faf8f5' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  logo: { fontSize: 40, fontWeight: '800', color: '#e2712b', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 24 },
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
  switchRow: { marginTop: 20, alignItems: 'center' },
  switchText: { fontSize: 14, color: '#888' },
  switchLink: { color: '#e2712b', fontWeight: '700' },
});
