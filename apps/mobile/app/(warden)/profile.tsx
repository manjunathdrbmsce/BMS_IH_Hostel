import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme, type ThemeMode } from '@/theme';
import { useAuthStore } from '@/store';
import { Avatar, Card } from '@/components';

export default function WardenProfile() {
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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
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
            <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>WARDEN</Text>
            </View>
          </Card>
        </Animated.View>

        {/* Theme Selector */}
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

        {/* Menu */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
          <Card variant="elevated" style={{ padding: 4 }}>
            {[
              { icon: 'notifications-outline' as const, label: 'Notifications', route: '/(warden)/notifications' },
              { icon: 'help-circle-outline' as const, label: 'Help & Support', route: null },
              { icon: 'document-text-outline' as const, label: 'Terms & Conditions', route: null },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  Haptics.selectionAsync();
                  if (item.route) router.push(item.route as any);
                }}
                style={[
                  styles.menuItem,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                ]}
              >
                <View style={[styles.menuIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name={item.icon} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </Card>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  profileCard: { alignItems: 'center', padding: 28, marginBottom: 8 },
  name: { fontSize: 20, fontWeight: '800', marginTop: 12 },
  email: { fontSize: 13, marginTop: 4 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  themeCard: { padding: 12 },
  themeRow: { flexDirection: 'row', gap: 10 },
  themeOption: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12 },
  menuIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 28,
  },
  version: { fontSize: 11, textAlign: 'center', marginTop: 18 },
});
