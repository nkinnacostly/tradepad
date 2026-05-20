import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import {
  COLORS,
  FONTS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
} from "../../constants";

const INPUT_BG = "#0D1526";
const INPUT_BORDER = "#1E293B";

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      isPassword = false,
      style,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ): React.JSX.Element => {
    const [isFocused, setIsFocused] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
        <View style={styles.inputRow}>
          <TextInput
            ref={ref}
            autoCapitalize="none"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={isPassword && !isVisible}
            style={[
              styles.input,
              isFocused && styles.inputFocused,
              error ? styles.inputError : null,
              isPassword && styles.inputWithToggle,
              style,
            ]}
            onBlur={(event) => {
              setIsFocused(false);
              onBlur?.(event);
            }}
            onFocus={(event) => {
              setIsFocused(true);
              onFocus?.(event);
            }}
            {...props}
          />
          {isPassword ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isVisible ? "Hide password" : "Show password"}
              hitSlop={8}
              onPress={() => setIsVisible((current) => !current)}
              style={styles.toggle}
            >
              <Ionicons
                color={COLORS.textMuted}
                name={isVisible ? "eye-off-outline" : "eye-outline"}
                size={20}
              />
            </Pressable>
          ) : null}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  },
);

Input.displayName = "Input";

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.md,
  },
  label: {
    color: COLORS.textMuted,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  inputRow: {
    position: "relative",
  },
  input: {
    backgroundColor: INPUT_BG,
    borderColor: INPUT_BORDER,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    height: 56,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
  },
  inputFocused: {
    borderColor: INPUT_BORDER,
    borderLeftColor: COLORS.primary,
    borderLeftWidth: 3,
  },
  inputError: {
    borderColor: COLORS.error,
    borderLeftColor: COLORS.error,
  },
  inputWithToggle: {
    paddingRight: SPACING.xxl,
  },
  toggle: {
    alignItems: "center",
    bottom: 0,
    height: 44,
    justifyContent: "center",
    minWidth: 44,
    position: "absolute",
    right: SPACING.xs,
    top: 6,
  },
  error: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
});
