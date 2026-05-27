import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

export const useBackgroundTimer = (
  onTimeout: () => void,
  timeoutMs: number = 2 * 60 * 1000,
): void => {
  const backgroundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus): void => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (
        (previousState === "active" || previousState === "inactive") &&
        nextAppState === "background"
      ) {
        backgroundTimerRef.current = setTimeout(() => {
          onTimeout();
        }, timeoutMs);
      }

      if (nextAppState === "active" && previousState === "background") {
        if (backgroundTimerRef.current !== null) {
          clearTimeout(backgroundTimerRef.current);
          backgroundTimerRef.current = null;
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return (): void => {
      subscription.remove();
      if (backgroundTimerRef.current !== null) {
        clearTimeout(backgroundTimerRef.current);
      }
    };
  }, [onTimeout, timeoutMs]);
};
