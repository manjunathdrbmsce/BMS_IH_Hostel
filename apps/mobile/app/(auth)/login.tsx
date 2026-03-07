import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/store';
import { Button, Input } from '@/components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LoginScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const clearError = useAuthStore((s) => s.clearError);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shake animation on error
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your credentials');
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      clearError();
      await login(identifier.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigation is handled by AuthGuard in root layout
    } catch (err: any) {
      setError(err.message || 'Login failed');
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#4F46E5', '#7C3AED', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="business" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle}>BMS Hostel</Text>
          <Text style={styles.headerSubtitle}>Building Management System</Text>
        </Animated.View>
      </LinearGradient>

      {/* Form Card */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formWrapper}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInUp.delay(300).duration(600)}
            style={[
              styles.formCard,
              {
                backgroundColor: colors.card,
                borderRadius: borderRadius['2xl'],
              },
            ]}
          >
            <Text style={[styles.formTitle, { color: colors.text }]}>Welcome back</Text>
            <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
              Sign in to your account to continue
            </Text>

            <Animated.View style={shakeStyle}>
              {error && (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  style={[styles.errorBox, { backgroundColor: `${colors.error}10` }]}
                >
                  <Ionicons name="alert-circle" size={18} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </Animated.View>
              )}

              <Input
                label="Email, Mobile or USN"
                placeholder="Enter your identifier"
                leftIcon="person-outline"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                leftIcon="lock-closed-outline"
                isPassword
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </Animated.View>

            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotButton}
            >
              <Text style={[styles.forgotText, { color: colors.primary }]}>
                Forgot password?
              </Text>
            </Pressable>

            <Button
              title="Sign In"
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleLogin}
              style={{ marginTop: spacing.md }}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 80,
    paddingBottom: 64,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  formWrapper: {
    flex: 1,
    marginTop: -32,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  formCard: {
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
