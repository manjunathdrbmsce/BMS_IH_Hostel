import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { gateApi } from '@/api';
import { Button, Input } from '@/components';

export default function RequestGatePass() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [reason, setReason] = useState('');
  const [destination, setDestination] = useState('');
  const [expectedOut, setExpectedOut] = useState('');
  const [expectedIn, setExpectedIn] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!reason.trim()) { setError('Please enter a reason'); return; }
    if (!destination.trim()) { setError('Please enter a destination'); return; }
    if (!expectedOut) { setError('Please enter expected out time'); return; }
    if (!expectedIn) { setError('Please enter expected in time'); return; }

    try {
      setSubmitting(true);
      setError('');
      await gateApi.createPass({
        purpose: reason.trim(),
        validFrom: new Date(expectedOut).toISOString(),
        validTo: new Date(expectedIn).toISOString(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to request gate pass');
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
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Request Gate Pass</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Illustration */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={[styles.illustration, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="exit-outline" size={48} color={colors.primary} />
          <Text style={[styles.illustrationText, { color: colors.primary }]}>
            Request permission to leave the hostel premises
          </Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Input
            label="Reason"
            placeholder="Why do you need to go out?"
            value={reason}
            onChangeText={setReason}
            leftIcon="document-text-outline"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Input
            label="Destination"
            placeholder="Where are you going?"
            value={destination}
            onChangeText={setDestination}
            leftIcon="location-outline"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Expected Out Time</Text>
          <TextInput
            style={[styles.dateInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={expectedOut}
            onChangeText={setExpectedOut}
            placeholder="YYYY-MM-DD HH:mm"
            placeholderTextColor={colors.textTertiary}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(500)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Expected Return Time</Text>
          <TextInput
            style={[styles.dateInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={expectedIn}
            onChangeText={setExpectedIn}
            placeholder="YYYY-MM-DD HH:mm"
            placeholderTextColor={colors.textTertiary}
          />
        </Animated.View>

        {/* Error */}
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={{ color: colors.error, fontSize: 13, marginLeft: 8, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <Button
          title="Submit Request"
          fullWidth
          loading={submitting}
          onPress={handleSubmit}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  illustration: { alignItems: 'center', padding: 24, borderRadius: 16, marginBottom: 24 },
  illustrationText: { fontSize: 13, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 16 },
  dateInput: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 16 },
});
