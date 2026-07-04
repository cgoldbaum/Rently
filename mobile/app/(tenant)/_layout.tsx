import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../src/theme/useThemeColors';

const ACCENT = '#6b5b45';

export default function TenantLayout() {
  const { t } = useTranslation('dashboard');
  const colors = useThemeColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.borderLight },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.dashboard'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="contract"
        options={{
          title: t('nav.contract'),
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: t('nav.payments'),
          tabBarIcon: ({ color, size }) => <Ionicons name="card-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="claims"
        options={{
          title: t('nav.claims'),
          tabBarIcon: ({ color, size }) => <Ionicons name="alert-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="expensas"
        options={{
          title: t('nav.expensas'),
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('nav.chat'),
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-outline" size={size} color={color} />,
        }}
      />
      {/* Asistente IA: accesible desde el ícono del home, oculto de la tab bar */}
      <Tabs.Screen name="ai-chat" options={{ href: null }} />
      {/* Ajustes: accesible desde el engranaje del home, oculto de la tab bar */}
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
