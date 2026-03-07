import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

// ── Types ──

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

// ── Component ──

export function Input({
  label,
  error,
  hint,
  leftIcon,
  isPassword = false,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const { colors, spacing, borderRadius, textStyles } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const focusAnim = useSharedValue(0);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusAnim.value,
      [0, 1],
      [error ? colors.error : colors.border, error ? colors.error : colors.primary],
    ),
    borderWidth: focusAnim.value > 0.5 ? 2 : 1.5,
  }));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    focusAnim.value = withTiming(1, { duration: 200 });
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    focusAnim.value = withTiming(0, { duration: 200 });
    onBlur?.(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            textStyles.label,
            { color: error ? colors.error : isFocused ? colors.primary : colors.textSecondary },
          ]}
        >
          {label}
        </Text>
      )}

      <Animated.View
        style={[
          styles.inputContainer,
          { backgroundColor: colors.surface, borderRadius: borderRadius.lg },
          borderStyle,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={isFocused ? colors.primary : colors.textTertiary}
            style={{ marginLeft: spacing.sm }}
          />
        )}

        <TextInput
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          secureTextEntry={isPassword && !showPassword}
          style={[
            styles.input,
            textStyles.body,
            {
              color: colors.text,
              paddingHorizontal: leftIcon ? spacing.xs : spacing.md,
              paddingVertical: spacing.sm,
            },
          ]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />

        {isPassword && (
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={12}
            style={{ marginRight: spacing.sm }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textTertiary}
            />
          </Pressable>
        )}
      </Animated.View>

      {(error || hint) && (
        <Text
          style={[
            styles.helper,
            { color: error ? colors.error : colors.textTertiary, fontSize: 12, marginTop: 4 },
          ]}
        >
          {error || hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    minHeight: 48,
  },
  helper: {
    marginLeft: 4,
  },
});
