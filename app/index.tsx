import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { COLORS, ROUTES } from "../constants";
import { getSession } from "../hooks/useAuth";

export default function Index(): React.JSX.Element {
  useEffect(() => {
    const redirect = async (): Promise<void> => {
      // Small delay to ensure navigation container is mounted
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        const hasSession = await getSession();
        if (hasSession) {
          router.replace(ROUTES.dashboard);
        } else {
          router.replace(ROUTES.login);
        }
      } catch (error) {
        console.error("session redirect error:", error);
        router.replace(ROUTES.login);
      }
    };

    void redirect();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={COLORS.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center",
  },
});
