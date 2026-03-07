import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme, type ThemeMode } from '@/theme';
import { useAuthStore } from '@/store';
import { Avatar, Card } from '@/components';

export default function SecurityProfile() {
  const { colors, mode, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const themes: { label: string; value: ThemeMode; icon: string }[] = [
    { label: 'Light', value: 'light', icon: 'sunny-outline' },
    { label: 'Dark', value: 'dark', icon: 'moon-outline' },
    { label: 'System', value: 'system', icon: 'phone-portrait-outline' },
  ];

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        {/* Profile Card */}
        <Animated.View entering={FadeInDown.duration(500)}>
          <Card variant="elevated" style={styles.profileCard}>
            <Avatar name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} size={72} />
            <Text style={[styles.name, { color: colors.text }]}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: '#10B98118' }]}>
              <Ionicons name="shield-checkmark" size={14} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>SECURITY</Text>
            </View>
          </Card>
        </Animated.View>

        {/* Theme */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
          <Card variant="outlined" style={styles.themeCard}>
            <View style={styles.themeRow}>
              {themes.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTheme(t.value);
                  }}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: mode === t.value ? colors.primary : colors.surface,
                      borderColor: mode === t.value ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={18}
                    color={mode === t.value ? '#FFF' : colors.textSecondary}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: mode === t.value ? '#FFF' : colors.textSecondary,
                      marginTop: 4,
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <TouchableOpacity onPress={handleLogout} style={[styles.logoutBtn, { borderColor: colors.error }]}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.error, marginLeft: 8 }}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={[styles.version, { color: colors.textTertiary }]}>BMS Hostel v0.2.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  profileCard: { alignItems: 'center', padding: 28, marginBottom: 8 },
  name: { fontSize: 20, fontWeight: '800', marginTop: 12 },
  email: { fontSize: 13, marginTop: 4 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginTop: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  themeCard: { padding: 12 },
  themeRow: { flexDirection: 'row', gap: 10 },
  themeOption: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 32,
  },
  version: { fontSize: 11, textAlign: 'center', marginTop: 18 },
});
