import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../src/theme/useThemeColors';

const ACCENT = '#6b5b45';

export default function OwnerLayout() {
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
        name="properties/index"
        options={{
          title: t('nav.properties'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="office-building" size={size} color={color} />,
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
        name="calendar"
        options={{
          title: t('nav.calendar'),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
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
        name="chat"
        options={{
          title: t('nav.chat'),
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-outline" size={size} color={color} />,
        }}
      />
      {/* Asistente IA: accesible desde el ícono del home, oculto de la tab bar */}
      <Tabs.Screen name="ai-chat" options={{ href: null }} />
      {/* Detalle de propiedad: ruta interna, oculta de la tab bar */}
      <Tabs.Screen name="properties/[id]" options={{ href: null }} />
      {/* Ajustes: accesible desde el engranaje del home, oculto de la tab bar */}
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
