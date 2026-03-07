import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Dimensions } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { attendanceApi, type AttendanceSession, type QRToken } from '@/api';
import { Card, Badge, Button, Skeleton } from '@/components';

const SCREEN_WIDTH = Dimensions.get('window').width;
const QR_SIZE = SCREEN_WIDTH - 100;

export default function RollCallDetail() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [qr, setQr] = useState<QRToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(withTiming(1.05, { duration: 1500 }), -1, true);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const loadSession = useCallback(async () => {
    try {
      const [sessionRes, qrRes] = await Promise.all([
        attendanceApi.getLive(id),
        attendanceApi.getQR(id),
      ]);
      // Set session from live data
      const liveData = sessionRes.data.data;
      if (liveData?.session) setSession(liveData.session);
      setQr(qrRes.data.data);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadSession(); }, [loadSession]);

  // Auto-refresh QR every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data } = await attendanceApi.getQR(id);
        setQr(data.data);
      } catch {
        //
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const handleCancel = () => {
    Alert.alert('End Session', 'Are you sure you want to end this roll call session?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'End Session',
        style: 'destructive',
        onPress: async () => {
          try {
            setCancelling(true);
            await attendanceApi.cancelSession(id);
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
        <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
          <Skeleton width={QR_SIZE} height={QR_SIZE} style={{ borderRadius: 20, marginTop: 40 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}>
        {/* Header */}
        <View style={styles.topBar}>
          <Button title="Back" variant="ghost" size="sm" onPress={() => router.back()} icon={<Ionicons name="arrow-back" size={18} color={colors.primary} />} />
          <Badge label="Live" variant="success" />
        </View>

        {/* QR Code Display */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.qrContainer}>
          <Animated.View style={[styles.qrWrapper, { backgroundColor: '#FFFFFF', borderColor: colors.border }, pulseStyle]}>
            {qr?.token ? (
              <QRCode
                value={qr.token}
                size={QR_SIZE}
                backgroundColor="#FFFFFF"
                color="#000000"
              />
            ) : (
              <View style={[styles.qrPlaceholder, { width: QR_SIZE, height: QR_SIZE }]}>
                <Ionicons name="qr-code-outline" size={64} color={colors.textTertiary} />
                <Text style={[styles.placeholderText, { color: colors.textTertiary }]}>
                  QR Code not available
                </Text>
              </View>
            )}
          </Animated.View>
          <Text style={[styles.qrHint, { color: colors.textSecondary }]}>
            Show this QR code to students for scanning
          </Text>
          {qr?.expiresIn && (
            <Text style={[styles.qrExpiry, { color: colors.textTertiary }]}>
              Refreshes automatically every 30 seconds
            </Text>
          )}
        </Animated.View>

        {/* Session Stats */}
        {session && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <Card variant="outlined" style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statBlock}>
                  <Text style={[styles.statValue, { color: '#10B981' }]}>{session.presentCount || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Present</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statBlock}>
                  <Text style={[styles.statValue, { color: '#EF4444' }]}>{session.absentCount || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Absent</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statBlock}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{session.totalStudents || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total</Text>
                </View>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* End Session */}
        <Button
          title="End Session"
          variant="danger"
          fullWidth
          loading={cancelling}
          onPress={handleCancel}
          style={{ marginTop: spacing.lg }}
          icon={<Ionicons name="stop-circle-outline" size={18} color="#FFF" />}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  qrContainer: { alignItems: 'center', marginBottom: 24 },
  qrWrapper: { padding: 16, borderRadius: 20, borderWidth: 1, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  qrPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 14, marginTop: 12 },
  qrHint: { fontSize: 14, fontWeight: '600', marginTop: 16 },
  qrExpiry: { fontSize: 12, marginTop: 4 },
  statsCard: { padding: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  statDivider: { width: 1, height: 40 },
});
