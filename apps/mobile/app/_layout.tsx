import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
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

/** Redirect to correct route group based on auth state. */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized, isLoading } = useAuthStore();
  const getNavigatorGroup = useAuthStore((s) => s.getNavigatorGroup);
  const initialize = useAuthStore((s) => s.initialize);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      const group = getNavigatorGroup();
      router.replace(`/${group}/home` as any);
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
