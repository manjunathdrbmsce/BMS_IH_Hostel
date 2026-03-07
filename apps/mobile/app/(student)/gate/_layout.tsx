import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

export default function GateLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="request" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
