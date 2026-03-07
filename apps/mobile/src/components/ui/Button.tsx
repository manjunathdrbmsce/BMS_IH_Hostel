import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type PressableProps,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';

// ── Types ──

type ButtonVariant = 'filled' | 'outlined' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ── Component ──

export function Button({
  title,
  variant = 'filled',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = false,
  haptic = true,
  style,
  textStyle,
  onPress,
  ...rest
}: ButtonProps) {
  const { colors, borderRadius, spacing } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = (e: any) => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(e);
  };

  // ── Variant styles ──
  const isDisabled = disabled || loading;

  const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
    filled: {
      container: {
        backgroundColor: isDisabled ? colors.border : colors.primary,
      },
      text: { color: '#FFFFFF' },
    },
    outlined: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: isDisabled ? colors.border : colors.primary,
      },
      text: { color: isDisabled ? colors.textTertiary : colors.primary },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      text: { color: isDisabled ? colors.textTertiary : colors.primary },
    },
    danger: {
      container: {
        backgroundColor: isDisabled ? colors.border : colors.error,
      },
      text: { color: '#FFFFFF' },
    },
  };

  // ── Size styles ──
  const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
    sm: {
      container: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, minHeight: 36 },
      text: { fontSize: 13, fontWeight: '600' },
    },
    md: {
      container: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, minHeight: 44 },
      text: { fontSize: 15, fontWeight: '600' },
    },
    lg: {
      container: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, minHeight: 52 },
      text: { fontSize: 16, fontWeight: '700' },
    },
  };

  const vs = variantStyles[variant];
  const ss = sizeStyles[size];

  return (
    <AnimatedPressable
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[
        styles.base,
        { borderRadius: borderRadius.lg },
        vs.container,
        ss.container,
        fullWidth && styles.fullWidth,
        animatedStyle,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.text.color as string} />
      ) : (
        <>
          {icon}
          <Animated.Text
            style={[styles.text, vs.text, ss.text, icon ? { marginLeft: spacing.xs } : undefined, textStyle]}
          >
            {title}
          </Animated.Text>
          {iconRight}
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
