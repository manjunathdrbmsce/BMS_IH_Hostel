import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { gateApi } from '@/api';
import { Button, Card } from '@/components';
import { useApi } from '@/hooks';
import { formatTime, formatDate } from '@/utils';

export default function SecurityGate() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [rollNumber, setRollNumber] = useState('');
  const [direction, setDirection] = useState<'IN' | 'OUT'>('OUT');
  const [notes, setNotes] = useState('');
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  const createEntry = useApi(gateApi.createEntry);

  const handleSubmit = async () => {
    if (!rollNumber.trim()) {
      Alert.alert('Error', 'Please enter a roll number or scan ID');
      return;
    }

    try {
      await createEntry.execute({
        rollNumber: rollNumber.trim(),
        direction,
        notes: notes.trim() || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setRecentEntries((prev) => [
        {
          rollNumber: rollNumber.trim(),
          direction,
          time: new Date().toISOString(),
          notes: notes.trim(),
        },
        ...prev.slice(0, 9),
      ]);

      setRollNumber('');
      setNotes('');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Failed', err?.response?.data?.message || 'Could not log entry');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Gate Entry</Text>
        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
          {formatDate(new Date().toISOString())}
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
          {/* Direction Toggle */}
          <Animated.View entering={FadeInDown.duration(500)}>
            <Card variant="elevated" style={styles.directionCard}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Direction</Text>
              <View style={styles.directionRow}>
                {(['OUT', 'IN'] as const).map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDirection(d);
                    }}
                    style={[
                      styles.dirBtn,
                      {
                        backgroundColor: direction === d
                          ? (d === 'OUT' ? '#F59E0B' : '#10B981')
                          : colors.surface,
                        borderColor: direction === d
                          ? (d === 'OUT' ? '#F59E0B' : '#10B981')
                          : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={d === 'OUT' ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                      size={24}
                      color={direction === d ? '#FFF' : colors.textSecondary}
                    />
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: direction === d ? '#FFF' : colors.textSecondary,
                        marginTop: 4,
                      }}
                    >
                      {d === 'OUT' ? 'Going Out' : 'Coming In'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          </Animated.View>

          {/* Roll Number */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <Card variant="elevated" style={styles.inputCard}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Roll Number / ID</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Ionicons name="card-outline" size={20} color={colors.textTertiary} />
                <TextInput
                  value={rollNumber}
                  onChangeText={setRollNumber}
                  placeholder="Enter roll number"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.input, { color: colors.text }]}
                  autoCapitalize="characters"
                  returnKeyType="done"
                />
              </View>

              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>Notes (Optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Any remarks..."
                placeholderTextColor={colors.textTertiary}
                style={[styles.notesInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                multiline
                numberOfLines={2}
              />
            </Card>
          </Animated.View>

          {/* Submit */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <Button
              title={`Log ${direction === 'OUT' ? 'Exit' : 'Entry'}`}
              onPress={handleSubmit}
              loading={createEntry.isLoading}
              icon={direction === 'OUT' ? 'arrow-up-circle' : 'arrow-down-circle'}
              style={{ marginTop: 16 }}
            />
          </Animated.View>

          {/* Recent Entries */}
          {recentEntries.length > 0 && (
            <Animated.View entering={FadeInUp.delay(100).duration(400)}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recent Entries</Text>
              {recentEntries.map((entry, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.recentItem,
                    { borderBottomColor: colors.border },
                    idx === recentEntries.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View
                    style={[
                      styles.dirIndicator,
                      { backgroundColor: entry.direction === 'OUT' ? '#F59E0B20' : '#10B98120' },
                    ]}
                  >
                    <Ionicons
                      name={entry.direction === 'OUT' ? 'arrow-up' : 'arrow-down'}
                      size={14}
                      color={entry.direction === 'OUT' ? '#F59E0B' : '#10B981'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recentRoll, { color: colors.text }]}>{entry.rollNumber}</Text>
                    {entry.notes ? (
                      <Text style={{ fontSize: 11, color: colors.textTertiary }}>{entry.notes}</Text>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textTertiary }}>{formatTime(entry.time)}</Text>
                </View>
              ))}
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingBottom: 16 },
  headerIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  headerSub: { fontSize: 13, marginTop: 2 },
  directionCard: { padding: 16, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  directionRow: { flexDirection: 'row', gap: 12 },
  dirBtn: { flex: 1, alignItems: 'center', paddingVertical: 20, borderRadius: 14, borderWidth: 1.5 },
  inputCard: { padding: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48 },
  input: { flex: 1, fontSize: 15, fontWeight: '600' },
  notesInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 56, textAlignVertical: 'top' },
  sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginTop: 28, marginBottom: 12, marginLeft: 4 },
  recentItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  dirIndicator: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  recentRoll: { fontSize: 14, fontWeight: '700' },
});
