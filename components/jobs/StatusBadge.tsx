import { StyleSheet, Text, View } from "react-native";

import {
  COLORS,
  FONTS,
  FONT_SIZE,
  JOB_STATUS_COLORS,
  JOB_STATUS_LABELS,
  RADIUS,
  SPACING,
} from "../../constants";
import type { JobStatus } from "../../types";

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface StatusBadgeProps {
  status: JobStatus;
  size?: "sm" | "lg";
}

export const StatusBadge = ({
  status,
  size = "sm",
}: StatusBadgeProps): React.JSX.Element => {
  const color = JOB_STATUS_COLORS[status];
  const isLarge = size === "lg";

  return (
    <View
      style={[
        styles.badge,
        isLarge ? styles.badgeLg : styles.badgeSm,
        { backgroundColor: hexToRgba(color, 0.15) },
      ]}
    >
      <Text
        style={[
          styles.text,
          isLarge ? styles.textLg : styles.textSm,
          { color },
        ]}
      >
        {JOB_STATUS_LABELS[status]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: RADIUS.full,
  },
  badgeSm: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  badgeLg: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  text: {
    color: COLORS.textPrimary,
  },
  textSm: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.xs,
  },
  textLg: {
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
});
