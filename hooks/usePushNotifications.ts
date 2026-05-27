import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import { supabase } from "../lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission denied");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "5355851b-2c91-4c85-94bc-b077e40a1d68",
    });

    return tokenData.data;
  } catch (error) {
    console.error("registerForPushNotifications error:", error);
    return null;
  }
};

const savePushToken = async (token: string): Promise<void> => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) return;

    await supabase
      .from("profiles")
      .update({ push_token: token })
      .eq("id", userId);
  } catch (error) {
    console.error("savePushToken error:", error);
  }
};

export const usePushNotifications = (): void => {
  useEffect(() => {
    const setup = async (): Promise<void> => {
      const token = await registerForPushNotifications();
      if (token) {
        await savePushToken(token);
      }
    };

    void setup();
  }, []);
};
