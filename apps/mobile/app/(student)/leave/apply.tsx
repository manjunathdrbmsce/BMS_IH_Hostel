import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/store';
import { leaveApi, type LeaveEligibility } from '@/api';
import { Button, Input, Card } from '@/components';
import { LeaveType, type LeaveTypeName } from '@/constants';

const LEAVE_TYPES: { key: LeaveTypeName; label: string; icon: string }[] = [
  { key: 'HOME', label: 'Home', icon: 'home-outline' },
  { key: 'MEDICAL', label: 'Medical', icon: 'medkit-outline' },
  { key: 'EMERGENCY', label: 'Emergency', icon: 'warning-outline' },
  { key: 'OTHER', label: 'Other', icon: 'document-text-outline' },
];

export default function ApplyLeave() {
  const { colors, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [eligibility, setEligibility] = useState<LeaveEligibility | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [leaveType, setLeaveType] = useState<LeaveTypeName>('HOME');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await leaveApi.eligibility();
        setEligibility(data.data);
      } catch {
        //
      } finally {
        setCheckingEligibility(false);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!fromDate.trim() || !toDate.trim()) {
      setError('Please enter both from and to dates (YYYY-MM-DD)');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for your leave');
      return;
    }
    if (!eligibility?.hostel?.id) {
      setError('Unable to determine your hostel. Please contact admin.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await leaveApi.apply({
        studentId: user?.id ?? '',
        hostelId: eligibility.hostel.id,
        type: leaveType,
        fromDate: fromDate.trim(),
        toDate: toDate.trim(),
        reason: reason.trim(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Leave request submitted successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit leave request';
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  if (checkingEligibility) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Checking eligibility...
        </Text>
      </View>
    );
  }

  if (eligibility && !eligibility.eligible) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={56} color={colors.error} />
        <Text style={[styles.ineligibleTitle, { color: colors.text }]}>Not Eligible</Text>
        <Text style={[styles.ineligibleText, { color: colors.textSecondary }]}>
          You're currently not eligible to apply for leave. Please contact your warden.
        </Text>
        <Button title="Go Back" variant="outlined" onPress={() => router.back()} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Apply for Leave</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Leave Type Selector */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={[styles.label, { color: colors.text }]}>Leave Type</Text>
            <View style={styles.typeGrid}>
              {LEAVE_TYPES.map((type) => (
                <Pressable
                  key={type.key}
                  onPress={() => setLeaveType(type.key)}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: leaveType === type.key ? `${colors.primary}14` : colors.card,
                      borderColor: leaveType === type.key ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={22}
                    color={leaveType === type.key ? colors.primary : colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      { color: leaveType === type.key ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {type.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* Date Fields */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Input
              label="From Date"
              placeholder="YYYY-MM-DD"
              leftIcon="calendar-outline"
              value={fromDate}
              onChangeText={setFromDate}
              keyboardType="numbers-and-punctuation"
            />
            <Input
              label="To Date"
              placeholder="YYYY-MM-DD"
              leftIcon="calendar-outline"
              value={toDate}
              onChangeText={setToDate}
              keyboardType="numbers-and-punctuation"
            />
          </Animated.View>

          {/* Reason */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Input
              label="Reason"
              placeholder="Why do you need leave?"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
            />
          </Animated.View>

          {/* Error */}
          {error && (
            <View style={[styles.errorBox, { backgroundColor: `${colors.error}10` }]}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <Button
            title="Submit Leave Request"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleSubmit}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { fontSize: 16, fontWeight: '500' },
  ineligibleTitle: { fontSize: 22, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  ineligibleText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  typeCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  typeLabel: { fontSize: 14, fontWeight: '600' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },
});
