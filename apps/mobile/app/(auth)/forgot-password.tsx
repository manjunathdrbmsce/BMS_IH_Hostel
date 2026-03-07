import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { authApi } from '@/api';
import { Button, Input } from '@/components';

export default function ForgotPasswordScreen() {
  const { colors, borderRadius, spacing } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await authApi.forgotPassword(email.trim());
      setSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send reset link. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#4F46E5', '#7C3AED', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <Text style={styles.headerSubtitle}>We'll send you a reset link</Text>
        </Animated.View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formWrapper}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={FadeInUp.delay(300).duration(600)}
            style={[styles.card, { backgroundColor: colors.card, borderRadius: borderRadius['2xl'] }]}
          >
            {sent ? (
              <View style={styles.successContainer}>
                <View style={[styles.successIcon, { backgroundColor: `${colors.success}14` }]}>
                  <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                </View>
                <Text style={[styles.successTitle, { color: colors.text }]}>Email Sent!</Text>
                <Text style={[styles.successText, { color: colors.textSecondary }]}>
                  Check your inbox for {email} and follow the instructions to reset your password.
                </Text>
                <Button
                  title="Back to Login"
                  variant="outlined"
                  fullWidth
                  onPress={() => router.back()}
                  style={{ marginTop: spacing.lg }}
                />
              </View>
            ) : (
              <>
                <Text style={[styles.formTitle, { color: colors.text }]}>Forgot your password?</Text>
                <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
                  Enter your email address and we'll send you instructions to reset your password.
                </Text>

                {error && (
                  <View style={[styles.errorBox, { backgroundColor: `${colors.error}10` }]}>
                    <Ionicons name="alert-circle" size={18} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                  </View>
                )}

                <Input
                  label="Email Address"
                  placeholder="you@example.com"
                  leftIcon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />

                <Button
                  title="Send Reset Link"
                  size="lg"
                  fullWidth
                  loading={loading}
                  onPress={handleSubmit}
                  style={{ marginTop: spacing.sm }}
                />

                <Pressable onPress={() => router.back()} style={styles.backLink}>
                  <Ionicons name="arrow-back" size={16} color={colors.primary} />
                  <Text style={[styles.backLinkText, { color: colors.primary }]}>Back to login</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 64, alignItems: 'center' },
  backButton: { position: 'absolute', top: 52, left: 20, padding: 8 },
  headerContent: { alignItems: 'center' },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  formWrapper: { flex: 1, marginTop: -32 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  formTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  formSubtitle: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 4,
  },
  backLinkText: { fontSize: 14, fontWeight: '600' },
  successContainer: { alignItems: 'center', paddingVertical: 16 },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  successText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
