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
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { complaintsApi } from '@/api';
import type { ComplaintCategoryName } from '@/constants';
import { Button, Card } from '@/components';

const CATEGORIES: { value: ComplaintCategoryName; label: string; icon: string }[] = [
  { value: 'MAINTENANCE', label: 'Maintenance', icon: 'build-outline' },
  { value: 'ELECTRICAL', label: 'Electrical', icon: 'flash-outline' },
  { value: 'PLUMBING', label: 'Plumbing', icon: 'water-outline' },
  { value: 'MESS', label: 'Mess/Food', icon: 'restaurant-outline' },
  { value: 'HYGIENE', label: 'Hygiene', icon: 'sparkles-outline' },
  { value: 'SECURITY', label: 'Security', icon: 'shield-outline' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
];

export default function CreateComplaint() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [category, setCategory] = useState<ComplaintCategoryName | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    if (photos.length >= 3) {
      Alert.alert('Limit Reached', 'You can attach up to 3 photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleSubmit = async () => {
    if (!category) { setError('Please select a category'); return; }
    if (!title.trim()) { setError('Please enter a title'); return; }
    if (!description.trim()) { setError('Please describe the issue'); return; }

    try {
      setSubmitting(true);
      setError('');
      await complaintsApi.create({ category, subject: title.trim(), description: description.trim(), isAnonymous });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to submit complaint');
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>File Complaint</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Category Selector */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryItem,
                  {
                    backgroundColor: category === cat.value ? colors.primary : colors.card,
                    borderColor: category === cat.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setCategory(cat.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={20}
                  color={category === cat.value ? '#FFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.categoryLabel,
                    { color: category === cat.value ? '#FFF' : colors.textSecondary },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Brief title for your complaint"
            placeholderTextColor={colors.textTertiary}
            maxLength={100}
          />
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Description</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue in detail..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={[styles.charCount, { color: colors.textTertiary }]}>{description.length}/1000</Text>
        </Animated.View>

        {/* Photos */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Photos (Optional)</Text>
          <View style={styles.photoRow}>
            {photos.map((uri, i) => (
              <View key={i} style={[styles.photoThumb, { borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 3 && (
              <TouchableOpacity
                style={[styles.addPhoto, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={pickImage}
              >
                <Ionicons name="camera-outline" size={24} color={colors.textTertiary} />
                <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 4 }}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Anonymous Toggle */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)}>
          <TouchableOpacity
            style={[styles.toggle, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setIsAnonymous(!isAnonymous)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isAnonymous ? 'checkbox' : 'square-outline'}
              size={22}
              color={isAnonymous ? colors.primary : colors.textTertiary}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.toggleTitle, { color: colors.text }]}>Submit Anonymously</Text>
              <Text style={{ fontSize: 12, color: colors.textTertiary }}>
                Your identity will be hidden from wardens
              </Text>
            </View>
          </TouchableOpacity>
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
          title="Submit Complaint"
          fullWidth
          loading={submitting}
          onPress={handleSubmit}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  sectionLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 20 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 6 },
  categoryLabel: { fontSize: 13, fontWeight: '600' },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  textArea: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, minHeight: 120 },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },
  photoRow: { flexDirection: 'row', gap: 12 },
  photoThumb: { width: 72, height: 72, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  removePhoto: { position: 'absolute', top: -6, right: -6, zIndex: 1 },
  addPhoto: { width: 72, height: 72, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 20 },
  toggleTitle: { fontSize: 14, fontWeight: '600' },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 16 },
});
