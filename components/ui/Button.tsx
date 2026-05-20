import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

import {
  COLORS,
  FONTS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
} from "../../constants";

interface ButtonProps {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "outline";
  style?: ViewStyle;
}

export const Button = ({
  label,
  onPress,
  isLoading = false,
  disabled = false,
  variant = "primary",
  style,
}: ButtonProps): React.JSX.Element => {
  const isDisabled = disabled || isLoading;
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.outline,
        isPrimary && styles.primaryGlow,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          color={isPrimary ? COLORS.background : COLORS.primary}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.label,
            isPrimary ? styles.primaryLabel : styles.outlineLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: RADIUS.lg,
    height: 56,
    justifyContent: "center",
    width: "100%",
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  primaryGlow: {
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  outline: {
    backgroundColor: "transparent",
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.extrabold,
    letterSpacing: 0.5,
  },
  primaryLabel: {
    color: COLORS.background,
    fontFamily: FONTS.extrabold,
  },
  outlineLabel: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
});
