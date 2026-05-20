import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  COLORS,
  FONTS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
} from "../../constants";
import type { BusinessType } from "../../types";

const CARD_BG = "#0D1526";
const CARD_BORDER = "#1E293B";
const CARD_SELECTED_BG = "#1A1F35";

interface BusinessTypeSelectorProps {
  value: BusinessType | undefined;
  onChange: (value: BusinessType) => void;
  error?: string;
}

interface BusinessTypeOption {
  type: BusinessType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: BusinessTypeOption[] = [
  { type: "tailor", label: "Tailor", icon: "cut-outline" },
  { type: "laundry", label: "Laundry", icon: "shirt-outline" },
];

export const BusinessTypeSelector = ({
  value,
  onChange,
  error,
}: BusinessTypeSelectorProps): React.JSX.Element => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Business type</Text>
      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const isSelected = value === option.type;

          return (
            <Pressable
              key={option.type}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(option.type)}
              style={({ pressed }) => [
                styles.card,
                isSelected ? styles.cardSelected : styles.cardUnselected,
                pressed && styles.cardPressed,
              ]}
            >
              {isSelected ? (
                <View style={styles.checkBadge}>
                  <Ionicons
                    color={COLORS.background}
                    name="checkmark"
                    size={12}
                  />
                </View>
              ) : null}
              <Ionicons
                color={isSelected ? COLORS.primary : COLORS.textMuted}
                name={option.icon}
                size={32}
              />
              <Text
                style={[
                  styles.cardLabel,
                  isSelected ? styles.cardLabelSelected : styles.cardLabelUnselected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.md,
  },
  label: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  card: {
    alignItems: "center",
    borderRadius: RADIUS.lg,
    flex: 1,
    height: 104,
    justifyContent: "center",
    position: "relative",
  },
  cardUnselected: {
    backgroundColor: CARD_BG,
    borderColor: CARD_BORDER,
    borderWidth: 1,
  },
  cardSelected: {
    backgroundColor: CARD_SELECTED_BG,
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  cardPressed: {
    opacity: 0.85,
  },
  checkBadge: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 20,
  },
  cardLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.xs,
  },
  cardLabelUnselected: {
    color: COLORS.textSecondary,
  },
  cardLabelSelected: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  error: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
});
