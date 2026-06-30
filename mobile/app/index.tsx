import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/auth';

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const activeView = useAuthStore((s) => s.activeView);

  if (!user) return <Redirect href="/(auth)/login" />;
  const canOwner = user.canOwner ?? user.role === 'OWNER';
  if (activeView === 'tenant' || !canOwner) return <Redirect href="/(tenant)" />;
  return <Redirect href="/(owner)" />;
}
