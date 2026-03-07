import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { leaveApi, type LeaveRequest } from '@/api';
import { Card, LeaveStatusBadge, Button, Skeleton } from '@/components';
import { formatDate, formatDateRange, formatDateTime } from '@/utils';

export default function LeaveDetail() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [leave, setLeave] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await leaveApi.get(id);
        setLeave(data.data);
      } catch {
        //
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleCancel = () => {
    Alert.alert('Cancel Leave', 'Are you sure you want to cancel this leave request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setCancelling(true);
            await leaveApi.cancel(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
        <View style={{ paddingHorizontal: 20 }}>
          <Skeleton width="40%" height={24} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={200} style={{ borderRadius: 16 }} />
        </View>
      </View>
    );
  }

  if (!leave) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Leave Not Found</Text>
        <Button title="Go Back" variant="outlined" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const timeline = [
    { label: 'Applied', date: leave.createdAt, done: true },
    {
      label: 'Parent Approval',
      date: leave.parentApprovedAt,
      done: ['PARENT_APPROVED', 'WARDEN_APPROVED'].includes(leave.status),
      rejected: leave.status === 'PARENT_REJECTED',
    },
    {
      label: 'Warden Approval',
      date: leave.wardenApprovedAt,
      done: leave.status === 'WARDEN_APPROVED',
      rejected: leave.status === 'REJECTED',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}>
        {/* Back + Status */}
        <View style={styles.topBar}>
          <Button title="Back" variant="ghost" size="sm" onPress={() => router.back()} icon={<Ionicons name="arrow-back" size={18} color={colors.primary} />} />
          <LeaveStatusBadge status={leave.status} />
        </View>

        {/* Leave Info Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Card variant="elevated" style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Type</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{leave.type}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Duration</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {formatDateRange(leave.fromDate, leave.toDate)}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={{ paddingVertical: 12 }}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary, marginBottom: 6 }]}>Reason</Text>
              <Text style={[styles.reasonText, { color: colors.text }]}>{leave.reason}</Text>
            </View>
            {leave.rejectionReason && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={{ paddingVertical: 12 }}>
                  <Text style={[styles.infoLabel, { color: colors.error, marginBottom: 6 }]}>Rejection Reason</Text>
                  <Text style={[styles.reasonText, { color: colors.error }]}>{leave.rejectionReason}</Text>
                </View>
              </>
            )}
          </Card>
        </Animated.View>

        {/* Timeline */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Approval Timeline</Text>
          <Card variant="outlined" style={styles.timelineCard}>
            {timeline.map((step, i) => (
              <View key={step.label} style={styles.timelineStep}>
                <View style={styles.timelineDotCol}>
                  <View
                    style={[
                      styles.timelineDot,
                      {
                        backgroundColor: step.rejected
                          ? colors.error
                          : step.done
                            ? colors.success
                            : colors.border,
                      },
                    ]}
                  >
                    {step.done && <Ionicons name="checkmark" size={12} color="#FFF" />}
                    {step.rejected && <Ionicons name="close" size={12} color="#FFF" />}
                  </View>
                  {i < timeline.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, { color: colors.text }]}>{step.label}</Text>
                  <Text style={[styles.timelineDate, { color: colors.textTertiary }]}>
                    {step.date ? formatDateTime(step.date) : 'Pending'}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* Cancel Button */}
        {leave.status === 'PENDING' && (
          <Button
            title="Cancel Leave Request"
            variant="danger"
            fullWidth
            loading={cancelling}
            onPress={handleCancel}
            style={{ marginTop: spacing.lg }}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  infoCard: { padding: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  infoLabel: { fontSize: 13, fontWeight: '500', width: 70 },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  divider: { height: 1 },
  reasonText: { fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  timelineCard: { padding: 20 },
  timelineStep: { flexDirection: 'row', minHeight: 48 },
  timelineDotCol: { alignItems: 'center', width: 24, marginRight: 14 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { width: 2, flex: 1, marginVertical: 4 },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineLabel: { fontSize: 14, fontWeight: '600' },
  timelineDate: { fontSize: 12, marginTop: 2 },
});
