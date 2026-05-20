import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING } from "../../constants";

interface ScreenWrapperProps {
  children: React.ReactNode;
  decorative?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export const ScreenWrapper = ({
  children,
  decorative = true,
  refreshControl,
}: ScreenWrapperProps): React.JSX.Element => {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {decorative ? (
          <>
            <View pointerEvents="none" style={styles.glowLarge} />
            <View pointerEvents="none" style={styles.glowSmall} />
          </>
        ) : null}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  container: {
    flex: 1,
    overflow: "hidden",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.md,
    paddingBottom: 100,
  },
  glowLarge: {
    backgroundColor: "rgba(245, 166, 35, 0.04)",
    borderRadius: 250,
    height: 500,
    position: "absolute",
    right: -150,
    top: -100,
    width: 500,
  },
  glowSmall: {
    backgroundColor: "rgba(245, 166, 35, 0.03)",
    borderRadius: 150,
    bottom: 100,
    height: 300,
    left: -100,
    position: "absolute",
    width: 300,
  },
});
