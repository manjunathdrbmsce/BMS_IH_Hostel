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
import { formatDate, formatDateRange, formatDateTime } from '@/utils';

export default function ParentLeaveDetail() {
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
    Alert.alert('Approve Leave', 'Are you sure you want to approve this leave request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            setApproving(true);
            await leaveApi.parentApprove(id);
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
      await leaveApi.parentReject(id, rejectionReason.trim());
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

  const canApprove = leave.status === 'PENDING';

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
            <Ionicons name="person-circle-outline" size={40} color={colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.studentName, { color: colors.text }]}>
                {leave.student?.user?.firstName} {leave.student?.user?.lastName}
              </Text>
              <Text style={[styles.studentInfo, { color: colors.textSecondary }]}>
                {leave.student?.user?.usn || 'N/A'}
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* Leave Details */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Card variant="outlined" style={styles.infoCard}>
            <InfoRow icon="document-text-outline" label="Type" value={leave.type} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow icon="calendar-outline" label="Duration" value={formatDateRange(leave.fromDate, leave.toDate)} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={{ paddingVertical: 12 }}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Reason</Text>
              <Text style={[styles.reasonText, { color: colors.text }]}>{leave.reason}</Text>
            </View>
          </Card>
        </Animated.View>

        {/* Approval Buttons */}
        {canApprove && (
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            {!showReject ? (
              <View style={styles.buttonRow}>
                <Button
                  title="Approve"
                  fullWidth
                  loading={approving}
                  onPress={handleApprove}
                  icon={<Ionicons name="checkmark-circle" size={18} color="#FFF" />}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Reject"
                  variant="danger"
                  fullWidth
                  onPress={() => setShowReject(true)}
                  icon={<Ionicons name="close-circle" size={18} color="#FFF" />}
                  style={{ flex: 1 }}
                />
              </View>
            ) : (
              <Card variant="outlined" style={styles.rejectCard}>
                <Text style={[styles.rejectTitle, { color: colors.error }]}>Rejection Reason</Text>
                <Input
                  placeholder="Why are you rejecting this leave?"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                />
                <View style={styles.buttonRow}>
                  <Button title="Cancel" variant="ghost" onPress={() => setShowReject(false)} style={{ flex: 1 }} />
                  <Button
                    title="Confirm Reject"
                    variant="danger"
                    loading={rejecting}
                    onPress={handleReject}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: any }) {
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
  errorTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  studentCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  studentName: { fontSize: 16, fontWeight: '700' },
  studentInfo: { fontSize: 13, marginTop: 2 },
  infoCard: { padding: 20, marginTop: 16 },
  infoLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  reasonText: { fontSize: 14, lineHeight: 20 },
  divider: { height: 1 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  rejectCard: { padding: 16, marginTop: 20 },
  rejectTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
});
