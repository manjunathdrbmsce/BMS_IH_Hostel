import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

export default function MessLayout() {
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
      <Stack.Screen name="week" />
      <Stack.Screen name="history" />
      <Stack.Screen name="feedback" />
    </Stack>
  );
}
