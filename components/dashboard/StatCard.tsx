import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import {
  COLORS,
  FONTS,
  FONT_SIZE,
  RADIUS,
  SPACING,
} from "../../constants";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  isAmount?: boolean;
}

const formatAmount = (value: number): string => {
  return `₦${value.toLocaleString("en-NG")}`;
};

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const StatCard = ({
  label,
  value,
  icon,
  iconColor = COLORS.primary,
  isAmount = false,
}: StatCardProps): React.JSX.Element => {
  const displayValue =
    isAmount && typeof value === "number" ? formatAmount(value) : value;

  return (
    <View style={styles.card}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: hexToRgba(iconColor, 0.15) },
        ]}
      >
        <Ionicons color={iconColor} name={icon} size={20} />
      </View>
      <Text style={styles.value}>{displayValue}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flex: 1,
    padding: SPACING.md,
  },
  iconContainer: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  value: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.xl,
    marginTop: SPACING.xs,
  },
  label: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
});
