import { Stack } from "expo-router";

import { COLORS } from "../../../../../constants";

export default function MeasurementsLayout(): React.JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: "slide_from_right",
      }}
    />
  );
}
