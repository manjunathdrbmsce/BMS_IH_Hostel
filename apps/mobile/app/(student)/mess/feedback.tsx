import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { messApi, type MealType } from '@/api';
import { Button } from '@/components';

const MEALS: { type: MealType; label: string; icon: string; color: string }[] = [
  { type: 'BREAKFAST', label: 'Breakfast', icon: 'sunny-outline', color: '#F59E0B' },
  { type: 'LUNCH', label: 'Lunch', icon: 'restaurant-outline', color: '#3B82F6' },
  { type: 'SNACKS', label: 'Snacks', icon: 'cafe-outline', color: '#8B5CF6' },
  { type: 'DINNER', label: 'Dinner', icon: 'moon-outline', color: '#6366F1' },
];

export default function FeedbackScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedMeal, setSelectedMeal] = useState<MealType | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedMeal || !rating) return;
    setSubmitting(true);
    try {
      await messApi.submitFeedback({
        mealType: selectedMeal,
        rating,
        comment: comment.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to submit feedback';
      Alert.alert('Error', msg);
    }
    setSubmitting(false);
  };

  const reset = () => {
    setSelectedMeal(null);
    setRating(0);
    setComment('');
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.successContainer, { paddingTop: insets.top + 60 }]}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>Thank You!</Text>
            <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
              Your feedback has been submitted successfully.
            </Text>
            <View style={{ gap: 12, marginTop: 32 }}>
              <Button title="Submit Another" onPress={reset} />
              <Button title="Go Back" variant="outlined" onPress={() => router.back()} />
            </View>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Meal Feedback</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}>
        {/* Step 1: Select Meal */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>Which meal?</Text>
          <View style={styles.mealGrid}>
            {MEALS.map(meal => (
              <TouchableOpacity
                key={meal.type}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedMeal(meal.type);
                }}
                style={[
                  styles.mealOption,
                  {
                    backgroundColor: selectedMeal === meal.type ? meal.color + '18' : colors.card,
                    borderColor: selectedMeal === meal.type ? meal.color : colors.border,
                  },
                ]}
              >
                <Ionicons name={meal.icon as any} size={24} color={selectedMeal === meal.type ? meal.color : colors.textTertiary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: selectedMeal === meal.type ? meal.color : colors.text, marginTop: 6 }}>
                  {meal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Step 2: Rating */}
        {selectedMeal && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={[styles.stepLabel, { color: colors.textSecondary, marginTop: 24 }]}>How was it?</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRating(star);
                  }}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= rating ? '#F59E0B' : colors.textTertiary}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>
                {['', 'Poor', 'Below Average', 'Good', 'Very Good', 'Excellent'][rating]}
              </Text>
            )}
          </Animated.View>
        )}

        {/* Step 3: Comment */}
        {rating > 0 && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={[styles.stepLabel, { color: colors.textSecondary, marginTop: 24 }]}>Any comments? (optional)</Text>
            <TextInputField
              value={comment}
              onChangeText={setComment}
              placeholder="Share your thoughts about the food..."
              colors={colors}
            />
            <View style={{ marginTop: 24 }}>
              <Button
                title={submitting ? 'Submitting...' : 'Submit Feedback'}
                onPress={handleSubmit}
                disabled={submitting}
              />
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function TextInputField({ value, onChangeText, placeholder, colors }: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  colors: any;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      multiline
      numberOfLines={4}
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        padding: 14,
        fontSize: 14,
        color: colors.text,
        minHeight: 100,
        textAlignVertical: 'top',
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  stepLabel: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  mealGrid: { flexDirection: 'row', gap: 10 },
  mealOption: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1.5 },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  ratingLabel: { textAlign: 'center', fontSize: 14, fontWeight: '600', marginTop: 4 },
  textInput: { minHeight: 100, padding: 14, fontSize: 14, textAlignVertical: 'top' },
  successContainer: { alignItems: 'center', paddingHorizontal: 40 },
  successIcon: { alignSelf: 'center', marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  successDesc: { fontSize: 15, textAlign: 'center', marginTop: 8 },
});
