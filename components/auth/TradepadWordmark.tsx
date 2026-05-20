import { StyleSheet, Text, View } from "react-native";

import { COLORS, FONTS, FONT_WEIGHT, RADIUS, SPACING } from "../../constants";

export const TradepadWordmark = (): React.JSX.Element => {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>BUSINESS</Text>
      </View>
      <Text style={styles.wordmark}>
        <Text style={styles.accent}>T</Text>
        radepad
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xl,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(245, 166, 35, 0.25)",
    borderColor: "rgba(245, 166, 35, 0.4)",
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: COLORS.primary,
    fontFamily: FONTS.extrabold,
    fontSize: 10,
    fontWeight: FONT_WEIGHT.extrabold,
    letterSpacing: 2,
  },
  wordmark: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.extrabold,
    fontSize: 32,
    fontWeight: FONT_WEIGHT.extrabold,
  },
  accent: {
    color: COLORS.primary,
  },
});
