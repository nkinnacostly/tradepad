import { useEffect } from "react";
import Constants from "expo-constants";
import { supabase } from "../lib/supabase";

const isExpoGo = Constants.appOwnership === "expo";

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
    if (isExpoGo) {
      console.log("Push notifications skipped in Expo Go");
      return;
    }

    const setup = async (): Promise<void> => {
      try {
        const Notifications = await import("expo-notifications");

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") return;

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: "5355851b-2c91-4c85-94bc-b077e40a1d68",
        });

        await savePushToken(tokenData.data);
      } catch (err) {
        console.log("Push notifications unavailable:", err);
      }
    };

    void setup();
  }, []);
};