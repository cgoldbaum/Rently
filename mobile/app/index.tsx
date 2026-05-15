import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/auth';

export default function Index() {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role === 'OWNER') return <Redirect href="/(owner)" />;
  return <Redirect href="/(tenant)" />;
}
