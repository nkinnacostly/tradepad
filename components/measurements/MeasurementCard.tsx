import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  COLORS,
  FONTS,
  FONT_SIZE,
  RADIUS,
  SPACING,
} from "../../constants";
import type { Measurement } from "../../types";

const FIELD_LABELS: Record<string, string> = {
  chest: "Chest",
  waist: "Waist",
  hips: "Hips",
  shoulder: "Shoulder",
  sleeve_length: "Sleeve",
  trouser_length: "Trouser",
  neck: "Neck",
};

const STANDARD_FIELD_KEYS = [
  "chest",
  "waist",
  "hips",
  "shoulder",
  "sleeve_length",
  "trouser_length",
  "neck",
] as const;

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const hasDisplayValue = (value: number | null): boolean => {
  if (value === null) {
    return false;
  }
  if (typeof value !== "number" || Number.isNaN(value)) {
    return false;
  }
  if (value === 0) {
    return false;
  }
  return true;
};

const formatMeasurementDate = (createdAt: string): string => {
  return new Date(createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatCustomFieldLabel = (key: string): string => {
  return key
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

interface MeasurementCardProps {
  measurement: Measurement;
  unitLabel: string;
  onPress?: (id: string) => void;
  isLatest?: boolean;
}

export const MeasurementCard = ({
  measurement,
  unitLabel,
  onPress,
  isLatest = false,
}: MeasurementCardProps): React.JSX.Element => {
  const standardEntries = STANDARD_FIELD_KEYS.filter((key) =>
    hasDisplayValue(measurement[key]),
  ).map((key) => ({
    key,
    label: FIELD_LABELS[key] ?? key,
    value: measurement[key] as number,
  }));

  const customFields = measurement.custom_fields;
  const customEntries =
    customFields !== null
      ? Object.entries(customFields).filter(([, value]) => {
          if (typeof value === "number") {
            return hasDisplayValue(value);
          }
          if (typeof value === "string") {
            return value.trim().length > 0;
          }
          return false;
        })
      : [];

  const hasNotes = Boolean(measurement.notes?.trim());
  const showDividerBeforeCustom =
    standardEntries.length > 0 && customEntries.length > 0;
  const showDividerBeforeNotes =
    (standardEntries.length > 0 || customEntries.length > 0) && hasNotes;

  const inner = (
    <>
      <View style={styles.headerRow}>
        <Text
          numberOfLines={1}
          style={[styles.dateText, isLatest ? styles.dateTextWithBadge : null]}
        >
          {formatMeasurementDate(measurement.created_at)}
        </Text>
        {isLatest ? (
          <View
            style={[
              styles.latestBadge,
              { backgroundColor: hexToRgba(COLORS.success, 0.15) },
            ]}
          >
            <Text style={styles.latestBadgeText}>Latest</Text>
          </View>
        ) : null}
      </View>

      {standardEntries.length > 0 ? (
        <View style={styles.grid}>
          {standardEntries.map(({ key, label, value }) => (
            <View key={key} style={styles.gridCell}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <Text style={styles.fieldValue}>
                {value} {unitLabel}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {showDividerBeforeCustom ? <View style={styles.divider} /> : null}

      {customEntries.length > 0 ? (
        <View style={styles.customSection}>
          {customEntries.map(([key, value]) => (
            <View key={key} style={styles.customRow}>
              <Text style={styles.fieldLabel}>
                {formatCustomFieldLabel(key)}
              </Text>
              <Text style={styles.fieldValue}>
                {String(value)} {unitLabel}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {showDividerBeforeNotes ? <View style={styles.divider} /> : null}

      {hasNotes ? (
        <Text style={styles.notesText}>{measurement.notes?.trim()}</Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        style={styles.card}
        onPress={() => {
          onPress(measurement.id);
        }}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={styles.card}>{inner}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  dateText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
  dateTextWithBadge: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  latestBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  latestBadgeText: {
    color: COLORS.success,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.xs,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -SPACING.xs,
  },
  gridCell: {
    paddingHorizontal: SPACING.xs,
    width: "50%",
    marginBottom: SPACING.sm,
  },
  fieldLabel: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.xs,
    marginBottom: SPACING.xs,
    textTransform: "uppercase",
  },
  fieldValue: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.md,
  },
  divider: {
    backgroundColor: COLORS.border,
    height: 1,
    marginVertical: SPACING.sm,
  },
  customSection: {
    gap: SPACING.sm,
  },
  customRow: {
    marginBottom: SPACING.xs,
  },
  notesText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
  },
});
