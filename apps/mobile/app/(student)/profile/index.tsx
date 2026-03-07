import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeMode } from '@/theme';
import { useAuthStore } from '@/store';
import type { RoleName } from '@/constants';
import { Avatar, Card, Button, Badge } from '@/components';
import { getRoleLabel } from '@/utils';

export default function ProfileScreen() {
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

  const menuItems = [
    { icon: 'shield-checkmark-outline', label: 'Violations', color: '#EF4444', onPress: () => router.push('/(student)/violations') },
    { icon: 'notifications-outline', label: 'Notifications', color: '#6366F1', onPress: () => router.push('/(student)/notifications') },
    { icon: 'help-circle-outline', label: 'Help & Support', color: '#3B82F6', onPress: () => {} },
    { icon: 'document-text-outline', label: 'Terms of Service', color: '#6B7280', onPress: () => {} },
  ];

  if (!user) return null;

  const studentProfile = user.studentProfile;
  const roles = user.roles?.map((r: any) => r.role || r) || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}>
        {/* Header */}
        <View style={styles.headerRow}>

          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Profile Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Card variant="elevated" style={styles.profileCard}>
            <Avatar name={`${user.firstName} ${user.lastName}`} size={72} />
            <Text style={[styles.userName, { color: colors.text }]}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
            <View style={styles.badgeRow}>
              {roles.map((r: string) => (
                <Badge key={r} label={getRoleLabel(r as RoleName)} variant="info" size="sm" />
              ))}
            </View>
          </Card>
        </Animated.View>

        {/* Student Info */}
        {studentProfile && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <Card variant="outlined" style={styles.infoCard}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Student Details</Text>
              <InfoRow icon="id-card-outline" label="Roll No" value={studentProfile.rollNumber || ''} colors={colors} />
              <InfoRow icon="school-outline" label="Department" value={studentProfile.department || ''} colors={colors} />
              <InfoRow icon="calendar-outline" label="Year" value={String(studentProfile.year || '')} colors={colors} />
              {studentProfile.roomNumber && (
                <InfoRow icon="bed-outline" label="Room" value={studentProfile.roomNumber} colors={colors} />
              )}
              {studentProfile.hostelName && (
                <InfoRow icon="business-outline" label="Hostel" value={studentProfile.hostelName} colors={colors} />
              )}
            </Card>
          </Animated.View>
        )}

        {/* Theme Selector */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
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
                  size={20}
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

        {/* Menu Items */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <Card variant="outlined" style={{ padding: 0, overflow: 'hidden' }}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.menuItem,
                  i < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </Card>
        </Animated.View>

        {/* Logout */}
        <Button
          title="Logout"
          variant="danger"
          fullWidth
          onPress={handleLogout}
          style={{ marginTop: spacing.xl }}
          icon={<Ionicons name="log-out-outline" size={18} color="#FFF" />}
        />

        {/* App Version */}
        <Text style={[styles.versionText, { color: colors.textTertiary }]}>
          BMS Hostel v0.2.0
        </Text>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: any }) {
  return (
    <View style={infoStyles.row}>
      <Ionicons name={icon as any} size={16} color={colors.textTertiary} />
      <Text style={[infoStyles.label, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[infoStyles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  label: { fontSize: 13, width: 90 },
  value: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  profileCard: { alignItems: 'center', padding: 24 },
  userName: { fontSize: 20, fontWeight: '800', marginTop: 12 },
  userEmail: { fontSize: 14, marginTop: 4 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 24 },
  infoCard: { padding: 16, marginTop: 16 },
  themeRow: { flexDirection: 'row', gap: 12 },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  versionText: { fontSize: 12, textAlign: 'center', marginTop: 24 },
});
