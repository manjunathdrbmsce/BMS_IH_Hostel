import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { attendanceApi } from '@/api';
import { Button, Input, Card } from '@/components';

export default function CreateRollCall() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [name, setName] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState('15');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const durations = [
    { label: '5 min', value: '5' },
    { label: '10 min', value: '10' },
    { label: '15 min', value: '15' },
    { label: '30 min', value: '30' },
    { label: '60 min', value: '60' },
  ];

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      setError('');
      const { data } = await attendanceApi.createSession({
        title: name.trim() || undefined,
        durationMin: parseInt(expiryMinutes, 10),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/(warden)/roll-call/${data.data.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create session');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>New Roll Call</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Illustration */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Card variant="elevated" style={styles.illustration}>
            <View style={[styles.qrPreview, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="qr-code" size={64} color={colors.primary} />
            </View>
            <Text style={[styles.illustrationText, { color: colors.textSecondary }]}>
              Create a session and display the QR code for students to scan
            </Text>
          </Card>
        </Animated.View>

        {/* Session Name */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Input
            label="Session Name (Optional)"
            placeholder="e.g., Morning Roll Call"
            value={name}
            onChangeText={setName}
            leftIcon="text-outline"
          />
        </Animated.View>

        {/* Duration */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>QR Expiry Duration</Text>
          <View style={styles.durationRow}>
            {durations.map((d) => (
              <TouchableOpacity
                key={d.value}
                style={[
                  styles.durationChip,
                  {
                    backgroundColor: expiryMinutes === d.value ? colors.primary : colors.card,
                    borderColor: expiryMinutes === d.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setExpiryMinutes(d.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: expiryMinutes === d.value ? '#FFF' : colors.textSecondary,
                  }}
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={{ color: colors.error, fontSize: 13, marginLeft: 8, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        <Button
          title="Create Session & Show QR"
          fullWidth
          loading={submitting}
          onPress={handleCreate}
          style={{ marginTop: spacing.xl }}
          icon={<Ionicons name="qr-code-outline" size={18} color="#FFF" />}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  illustration: { alignItems: 'center', padding: 24, marginBottom: 8 },
  qrPreview: { width: 120, height: 120, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  illustrationText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  sectionLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 20 },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  durationChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 16 },
});
