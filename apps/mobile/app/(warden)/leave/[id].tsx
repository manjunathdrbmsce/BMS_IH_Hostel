import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { leaveApi, type LeaveRequest } from '@/api';
import { Card, LeaveStatusBadge, Button, Skeleton, Input } from '@/components';
import { formatDateRange, formatDateTime } from '@/utils';

export default function WardenLeaveDetail() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [leave, setLeave] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReject, setShowReject] = useState(false);

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

  const handleApprove = () => {
    Alert.alert('Approve Leave', 'Grant final approval for this leave request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            setApproving(true);
            await leaveApi.wardenApprove(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } finally {
            setApproving(false);
          }
        },
      },
    ]);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    try {
      setRejecting(true);
      await leaveApi.reject(id, rejectionReason.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
        <View style={{ paddingHorizontal: 20 }}>
          <Skeleton width="50%" height={24} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={250} style={{ borderRadius: 16 }} />
        </View>
      </View>
    );
  }

  if (!leave) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 }}>Leave Not Found</Text>
        <Button title="Go Back" variant="outlined" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const canApprove = leave.status === 'PARENT_APPROVED';

  const timeline = [
    { label: 'Applied', date: leave.createdAt, done: true },
    { label: 'Parent Approved', date: leave.parentApprovedAt, done: !!leave.parentApprovedAt },
    { label: 'Warden Decision', date: leave.wardenApprovedAt, done: leave.status === 'WARDEN_APPROVED', rejected: leave.status === 'REJECTED' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}>
        <View style={styles.topBar}>
          <Button title="Back" variant="ghost" size="sm" onPress={() => router.back()} icon={<Ionicons name="arrow-back" size={18} color={colors.primary} />} />
          <LeaveStatusBadge status={leave.status} />
        </View>

        {/* Student Info */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Card variant="elevated" style={styles.studentCard}>
            <Ionicons name="person-circle-outline" size={44} color={colors.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.studentName, { color: colors.text }]}>
                {leave.student?.user?.firstName} {leave.student?.user?.lastName}
              </Text>
              <Text style={[styles.studentInfo, { color: colors.textSecondary }]}>
                {leave.student?.user?.usn || 'N/A'}
              </Text>
              {leave.student?.user?.usn && (
                <Text style={[styles.studentInfo, { color: colors.textTertiary }]}>
                  USN: {leave.student.user.usn}
                </Text>
              )}
            </View>
          </Card>
        </Animated.View>

        {/* Leave Details */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Card variant="outlined" style={styles.detailCard}>
            <DetailRow icon="document-text-outline" label="Type" value={leave.type} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <DetailRow icon="calendar-outline" label="Duration" value={formatDateRange(leave.fromDate, leave.toDate)} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={{ paddingVertical: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 6 }}>Reason</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: colors.text }}>{leave.reason}</Text>
            </View>
          </Card>
        </Animated.View>

        {/* Timeline */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Approval Timeline</Text>
          <Card variant="outlined" style={{ padding: 20 }}>
            {timeline.map((step, i) => (
              <View key={step.label} style={styles.timelineStep}>
                <View style={styles.timelineDotCol}>
                  <View
                    style={[
                      styles.timelineDot,
                      {
                        backgroundColor: step.rejected ? colors.error : step.done ? colors.success : colors.border,
                      },
                    ]}
                  >
                    {step.done && <Ionicons name="checkmark" size={12} color="#FFF" />}
                    {step.rejected && <Ionicons name="close" size={12} color="#FFF" />}
                  </View>
                  {i < timeline.length - 1 && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{step.label}</Text>
                  <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
                    {step.date ? formatDateTime(step.date) : 'Pending'}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* Action Buttons */}
        {canApprove && (
          <Animated.View entering={FadeInDown.delay(400).duration(500)}>
            {!showReject ? (
              <View style={styles.buttonRow}>
                <Button title="Approve" fullWidth loading={approving} onPress={handleApprove} icon={<Ionicons name="checkmark-circle" size={18} color="#FFF" />} style={{ flex: 1 }} />
                <Button title="Reject" variant="danger" fullWidth onPress={() => setShowReject(true)} icon={<Ionicons name="close-circle" size={18} color="#FFF" />} style={{ flex: 1 }} />
              </View>
            ) : (
              <Card variant="outlined" style={{ padding: 16, marginTop: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.error, marginBottom: 12 }}>Rejection Reason</Text>
                <Input placeholder="Reason for rejection..." value={rejectionReason} onChangeText={setRejectionReason} multiline />
                <View style={styles.buttonRow}>
                  <Button title="Cancel" variant="ghost" onPress={() => setShowReject(false)} style={{ flex: 1 }} />
                  <Button title="Confirm Reject" variant="danger" loading={rejecting} onPress={handleReject} style={{ flex: 1 }} />
                </View>
              </Card>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function DetailRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 }}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary, width: 70 }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  studentCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  studentName: { fontSize: 16, fontWeight: '700' },
  studentInfo: { fontSize: 13, marginTop: 2 },
  detailCard: { padding: 20, marginTop: 16 },
  divider: { height: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  timelineStep: { flexDirection: 'row', minHeight: 48 },
  timelineDotCol: { alignItems: 'center', width: 24, marginRight: 14 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { width: 2, flex: 1, marginVertical: 4 },
  timelineContent: { flex: 1, paddingBottom: 16 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
});
