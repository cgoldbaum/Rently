import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

const ACCENT = '#6b5b45';

export default function TenantLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#f0ebe4' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="contract"
        options={{
          title: 'Contrato',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Pagos',
          tabBarIcon: ({ color, size }) => <Ionicons name="card-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="claims"
        options={{
          title: 'Reclamos',
          tabBarIcon: ({ color, size }) => <Ionicons name="alert-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="expensas"
        options={{
          title: 'Expensas',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
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
