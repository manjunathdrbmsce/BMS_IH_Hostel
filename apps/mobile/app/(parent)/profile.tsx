import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeMode } from '@/theme';
import { useAuthStore } from '@/store';
import { Avatar, Card, Button, Badge } from '@/components';
import { getRoleLabel } from '@/utils';

export default function ParentProfile() {
  const { colors, spacing, mode, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
        },
      },
    ]);
  };

  const themeOptions: { label: string; value: ThemeMode; icon: string }[] = [
    { label: 'Light', value: 'light', icon: 'sunny-outline' },
    { label: 'Dark', value: 'dark', icon: 'moon-outline' },
    { label: 'System', value: 'system', icon: 'phone-portrait-outline' },
  ];

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Profile</Text>

        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Card variant="elevated" style={styles.profileCard}>
            <Avatar name={`${user.firstName} ${user.lastName}`} size={72} />
            <Text style={[styles.userName, { color: colors.text }]}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
            <Badge label="Parent" variant="info" size="sm" />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Appearance</Text>
          <View style={styles.themeRow}>
            {themeOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: mode === opt.value ? colors.primary : colors.card,
                    borderColor: mode === opt.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setTheme(opt.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={18}
                  color={mode === opt.value ? '#FFF' : colors.textSecondary}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: mode === opt.value ? '#FFF' : colors.textSecondary,
                    marginTop: 4,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Button
          title="Logout"
          variant="danger"
          fullWidth
          onPress={handleLogout}
          style={{ marginTop: spacing.xl }}
          icon={<Ionicons name="log-out-outline" size={18} color="#FFF" />}
        />

        <Text style={[styles.versionText, { color: colors.textTertiary }]}>BMS Hostel v0.2.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 28, fontWeight: '800', marginBottom: 20 },
  profileCard: { alignItems: 'center', padding: 24 },
  userName: { fontSize: 20, fontWeight: '800', marginTop: 12 },
  userEmail: { fontSize: 14, marginTop: 4, marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 24 },
  themeRow: { flexDirection: 'row', gap: 12 },
  themeOption: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1 },
  versionText: { fontSize: 12, textAlign: 'center', marginTop: 24 },
});
