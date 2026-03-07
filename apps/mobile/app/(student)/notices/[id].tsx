import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { noticesApi, type Notice } from '@/api';
import { Card, Badge, Button, Skeleton, SkeletonLines } from '@/components';
import { formatDateTime } from '@/utils';

export default function NoticeDetail() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await noticesApi.get(id);
        setNotice(data.data);
        // Mark as read
        noticesApi.markRead(id).catch(() => {});
      } catch {
        //
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
        <View style={{ paddingHorizontal: 20 }}>
          <Skeleton width="60%" height={28} style={{ marginBottom: 12 }} />
          <Skeleton width="30%" height={20} style={{ marginBottom: 24 }} />
          <SkeletonLines lines={8} />
        </View>
      </View>
    );
  }

  if (!notice) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Notice Not Found</Text>
        <Button title="Go Back" variant="outlined" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const priorityVariant = {
    URGENT: 'error' as const,
    WARNING: 'warning' as const,
    INFO: 'info' as const,
  }[notice.priority] || 'default' as const;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}>
        {/* Back */}
        <Button
          title="Back"
          variant="ghost"
          size="sm"
          onPress={() => router.back()}
          icon={<Ionicons name="arrow-back" size={18} color={colors.primary} />}
          style={{ alignSelf: 'flex-start', marginBottom: 12 }}
        />

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[styles.title, { color: colors.text }]}>{notice.title}</Text>
          <View style={styles.metaRow}>
            <Badge label={notice.priority} variant={priorityVariant} size="sm" />
            <Text style={[styles.dateText, { color: colors.textTertiary }]}>
              {formatDateTime(notice.createdAt)}
            </Text>
          </View>
        </Animated.View>

        {/* Content */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Card variant="outlined" style={styles.contentCard}>
            <Text style={[styles.contentText, { color: colors.text }]}>{notice.content}</Text>
          </Card>
        </Animated.View>

        {/* Author */}
        {notice.author && (
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <View style={[styles.authorBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={16} color={colors.textTertiary} />
              <Text style={[styles.authorText, { color: colors.textSecondary }]}>
                Posted by {notice.author.firstName} {notice.author.lastName}
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  scrollContent: { paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: '800', lineHeight: 32, marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  dateText: { fontSize: 13 },
  contentCard: { padding: 20 },
  contentText: { fontSize: 15, lineHeight: 24 },
  authorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
    gap: 8,
  },
  authorText: { fontSize: 13 },
});
