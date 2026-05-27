import { Ionicons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import { useCallback } from "react";

import { COLORS, FONTS, FONT_SIZE, ROUTES } from "../../constants";
import { signOut, useAuth } from "../../hooks/useAuth";
import { useBackgroundTimer } from "../../hooks/useBackgroundTimer";
import { usePushNotifications } from "../../hooks/usePushNotifications";

export default function AppLayout(): React.JSX.Element {
  useAuth();

  const handleBackgroundTimeout = useCallback(async (): Promise<void> => {
    try {
      await signOut();
      router.replace(ROUTES.login);
    } catch {
      router.replace(ROUTES.login);
    }
  }, []);

  useBackgroundTimer(handleBackgroundTimeout, 2 * 60 * 1000);
  usePushNotifications();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: "rgba(10, 15, 30, 0.95)",
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.08)",
          borderRadius: 28,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          paddingHorizontal: 8,
          position: "absolute",
          bottom: 24,
          left: 16,
          right: 16,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 24,
          elevation: 16,
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.medium,
          fontSize: FONT_SIZE.xs,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              color={color}
              name={focused ? "grid" : "grid-outline"}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "Clients",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              color={color}
              name={focused ? "people" : "people-outline"}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: "Jobs",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              color={color}
              name={focused ? "briefcase" : "briefcase-outline"}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              color={color}
              name={focused ? "settings" : "settings-outline"}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
