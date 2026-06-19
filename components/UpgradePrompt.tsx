import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import {
  COLORS,
  FONTS,
  FONT_SIZE,
  RADIUS,
  ROUTES,
  SPACING,
} from "../constants";
import { Button } from "./ui/Button";

interface UpgradePromptProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

// Absorbs taps on the sheet so they don't fall through to the backdrop.
const absorbPress = (): void => {};

export const UpgradePrompt = ({
  visible,
  onClose,
  title,
  message,
}: UpgradePromptProps): React.JSX.Element => {
  const handleUpgrade = (): void => {
    onClose();
    router.push(ROUTES.upgrade);
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        style={styles.backdrop}
        onPress={onClose}
      >
        <Pressable style={styles.sheet} onPress={absorbPress}>
          <View style={styles.iconBadge}>
            <Ionicons color={COLORS.primary} name="sparkles" size={26} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Button label="Upgrade to Pro" onPress={handleUpgrade} />

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.dismissButton}
          >
            <Text style={styles.dismissText}>Not now</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(8, 13, 26, 0.8)",
    flex: 1,
    justifyContent: "flex-end",
    padding: SPACING.md,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full,
    height: 56,
    justifyContent: "center",
    marginBottom: SPACING.md,
    width: 56,
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.xl,
    marginBottom: SPACING.sm,
  },
  message: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  dismissButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.sm,
    minHeight: 44,
  },
  dismissText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
});
