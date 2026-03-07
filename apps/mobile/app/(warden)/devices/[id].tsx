import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { attendanceApi, type DeviceChangeRequest } from '@/api';
import { Card, Badge, Button, Skeleton } from '@/components';
import { formatDateTime } from '@/utils';

export default function DeviceRequestDetail() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [request, setRequest] = useState<DeviceChangeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Use list with pending and find
        const { data } = await attendanceApi.pendingDeviceRequests({ page: 1, limit: 100 });
        const found = data.data?.find?.((r: any) => r.id === id);
        if (found) setRequest(found);
      } catch {
        //
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleApprove = () => {
    Alert.alert('Approve Device', 'Allow this student to use the new device for attendance?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            setApproving(true);
            await attendanceApi.approveDevice(id);
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

  const handleReject = () => {
    Alert.alert('Reject Device', 'Deny this device change request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            setRejecting(true);
            await attendanceApi.rejectDevice(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } finally {
            setRejecting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
        <View style={{ paddingHorizontal: 20 }}>
          <Skeleton width="50%" height={24} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={200} style={{ borderRadius: 16 }} />
        </View>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 }}>Request Not Found</Text>
        <Button title="Go Back" variant="outlined" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}>
        <Button title="Back" variant="ghost" size="sm" onPress={() => router.back()} icon={<Ionicons name="arrow-back" size={18} color={colors.primary} />} style={{ alignSelf: 'flex-start', marginBottom: 16 }} />

        {/* Student Info */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Card variant="elevated" style={styles.studentCard}>
            <Ionicons name="person-circle-outline" size={44} color={colors.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.studentName, { color: colors.text }]}>
                {request.student?.user?.firstName} {request.student?.user?.lastName}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                {request.student?.user?.usn}
              </Text>
            </View>
            <Badge
              label={request.status}
              variant={request.status === 'PENDING' ? 'warning' : request.status === 'APPROVED' ? 'success' : 'error'}
            />
          </Card>
        </Animated.View>

        {/* Device Details */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Card variant="outlined" style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
              <Text style={{ fontSize: 13, color: colors.textSecondary, width: 100 }}>New Device</Text>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' }}>
                {request.newDeviceName || 'Unknown'}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={{ fontSize: 13, color: colors.textSecondary, width: 100 }}>Requested</Text>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' }}>
                {formatDateTime(request.createdAt)}
              </Text>
            </View>
            {request.reason && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={{ paddingVertical: 12 }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 6 }}>Reason</Text>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: colors.text }}>{request.reason}</Text>
                </View>
              </>
            )}
          </Card>
        </Animated.View>

        {/* Actions */}
        {request.status === 'PENDING' && (
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.buttonRow}>
            <Button title="Approve" fullWidth loading={approving} onPress={handleApprove} icon={<Ionicons name="checkmark-circle" size={18} color="#FFF" />} style={{ flex: 1 }} />
            <Button title="Reject" variant="danger" fullWidth loading={rejecting} onPress={handleReject} icon={<Ionicons name="close-circle" size={18} color="#FFF" />} style={{ flex: 1 }} />
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  studentCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  studentName: { fontSize: 16, fontWeight: '700' },
  detailCard: { padding: 20, marginTop: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  divider: { height: 1 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
});
