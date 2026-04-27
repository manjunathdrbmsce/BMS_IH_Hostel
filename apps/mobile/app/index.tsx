import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store';

function getDefaultRoute(group: string) {
  switch (group) {
    case '(warden)':
      return '/(warden)/dashboard';
    case '(security)':
      return '/(security)/gate';
    case '(parent)':
      return '/(parent)/home';
    case '(student)':
      return '/(student)/home';
    default:
      return '/(auth)/login';
  }
}

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
  return <Redirect href={getDefaultRoute(group) as any} />;
}
