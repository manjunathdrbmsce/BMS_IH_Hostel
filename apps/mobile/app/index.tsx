import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store';

/**
 * Root index that redirects to the correct navigator group.
 */
export default function Index() {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const getNavigatorGroup = useAuthStore((s) => s.getNavigatorGroup);

  if (!isInitialized) return null;

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const group = getNavigatorGroup();
  return <Redirect href={`/${group}/home` as any} />;
}
