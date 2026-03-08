import React, { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { ThemeProvider, useTheme } from '@/theme';
import { useAuthStore } from '@/store';
import { ErrorBoundary } from '@/components';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

/** Redirect to correct route group based on auth state, preserving deep links. */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized, isLoading } = useAuthStore();
  const getNavigatorGroup = useAuthStore((s) => s.getNavigatorGroup);
  const initialize = useAuthStore((s) => s.initialize);
  const segments = useSegments();
  const router = useRouter();
  const pendingDeepLink = useRef<string | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  // Capture initial deep link URL on cold start
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) {
        const parsed = Linking.parse(url);
        if (parsed.path && parsed.path !== '' && !parsed.path.startsWith('expo-development-client')) {
          pendingDeepLink.current = '/' + parsed.path;
        }
      }
    });
  }, []);

  // Listen for deep links while app is open
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const parsed = Linking.parse(url);
      if (parsed.path && parsed.path !== '' && !parsed.path.startsWith('expo-development-client')) {
        if (isAuthenticated) {
          const group = getNavigatorGroup();
          router.push(`/${group}/${parsed.path}` as any);
        } else {
          pendingDeepLink.current = '/' + parsed.path;
        }
      }
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      const group = getNavigatorGroup();
      if (pendingDeepLink.current) {
        const target = pendingDeepLink.current;
        pendingDeepLink.current = null;
        router.replace(`/${group}${target}` as any);
      } else {
        router.replace(`/${group}/home` as any);
      }
    }
  }, [isAuthenticated, isInitialized, isLoading, segments]);

  useEffect(() => {
    if (isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [isInitialized]);

  return <>{children}</>;
}

function RootLayoutContent() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthGuard>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(student)" />
          <Stack.Screen name="(parent)" />
          <Stack.Screen name="(warden)" />
          <Stack.Screen name="(security)" />
        </Stack>
      </AuthGuard>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ErrorBoundary>
            <RootLayoutContent />
          </ErrorBoundary>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
