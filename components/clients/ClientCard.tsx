import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  COLORS,
  FONTS,
  FONT_SIZE,
  RADIUS,
  SPACING,
} from "../../constants";
import type { Client } from "../../types";

interface ClientCardProps {
  client: Client;
  onPress: (id: string) => void;
}

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const ClientCard = ({
  client,
  onPress,
}: ClientCardProps): React.JSX.Element => {
  const initial = client.full_name.trim().charAt(0).toUpperCase() || "?";
  const hasPhone = client.phone.trim().length > 0;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(client.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: hexToRgba(COLORS.primary, 0.15) },
        ]}
      >
        <Text style={styles.avatarText}>{initial}</Text>
      </View>

      <View style={styles.middle}>
        <Text style={styles.name}>{client.full_name}</Text>
        <Text style={hasPhone ? styles.phone : styles.phoneMuted}>
          {hasPhone ? client.phone : "No phone"}
        </Text>
      </View>

      <Ionicons color={COLORS.textMuted} name="chevron-forward" size={18} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  pressed: {
    opacity: 0.8,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.lg,
  },
  middle: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  name: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
  phone: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },
  phoneMuted: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },
});
