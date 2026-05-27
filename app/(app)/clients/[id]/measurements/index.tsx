import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MeasurementCard } from "../../../../../components/measurements/MeasurementCard";
import { Button } from "../../../../../components/ui/Button";
import {
  COLORS,
  FONTS,
  FONT_SIZE,
  RADIUS,
  SPACING,
} from "../../../../../constants";
import { useClient } from "../../../../../hooks/useClients";
import {
  updateUnitPreference,
  useMeasurements,
  useProfileUnitPreference,
} from "../../../../../hooks/useMeasurements";
import type { MeasurementUnitPreference } from "../../../../../types";

const unitPreferenceToLabel = (
  preference: MeasurementUnitPreference,
): string => {
  return preference === "inches" ? "in" : "cm";
};

export default function ClientMeasurementsScreen(): React.JSX.Element {
  const { id: clientId } = useLocalSearchParams<{ id: string }>();
  const { client, isLoading: clientLoading, error: clientError } = useClient(
    clientId ?? "",
  );
  const {
    measurements,
    isLoading: measurementsLoading,
    error: measurementsError,
    refetch,
  } = useMeasurements(clientId ?? "");
  const {
    unitPreference,
    isLoading: prefsLoading,
    refetch: refetchPrefs,
  } = useProfileUnitPreference();
  const [activeUnit, setActiveUnit] =
    useState<MeasurementUnitPreference>("inches");
  const [unitUpdateError, setUnitUpdateError] = useState<string | null>(null);

  useEffect(() => {
    if (!prefsLoading) {
      setActiveUnit(unitPreference);
    }
  }, [prefsLoading, unitPreference]);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const handleShareMeasurements = async (): Promise<void> => {
    if (measurements.length === 0) return;

    const latest = measurements[0];
    const unitLabel = unitPreferenceToLabel(activeUnit);
    const clientName = client?.full_name ?? "Client";

    const FIELD_LABELS: Record<string, string> = {
      chest: "Chest",
      waist: "Waist",
      hips: "Hips",
      shoulder: "Shoulder",
      sleeve_length: "Sleeve",
      trouser_length: "Trouser",
      neck: "Neck",
    };

    const STANDARD_FIELDS = [
      "chest",
      "waist",
      "hips",
      "shoulder",
      "sleeve_length",
      "trouser_length",
      "neck",
    ] as const;

    const lines: string[] = [];
    lines.push(`📏 *${clientName}'s Measurements*`);
    lines.push(`─────────────────`);
    lines.push(
      `Recorded: ${new Date(latest.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`,
    );
    lines.push(`Unit: ${activeUnit}`);
    lines.push(``);

    const standardLines: string[] = [];
    for (const key of STANDARD_FIELDS) {
      const value = latest[key];
      if (value !== null && value !== undefined && value !== 0) {
        standardLines.push(`${FIELD_LABELS[key]}: ${value} ${unitLabel}`);
      }
    }

    if (standardLines.length > 0) {
      lines.push("*Standard Measurements*");
      lines.push(...standardLines);
    }

    if (
      latest.custom_fields &&
      Object.keys(latest.custom_fields).length > 0
    ) {
      lines.push("");
      lines.push("*Custom Measurements*");
      for (const [key, value] of Object.entries(latest.custom_fields)) {
        if (value !== null && value !== 0 && value !== "") {
          const label = key
            .replace(/_/g, " ")
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          lines.push(`${label}: ${value} ${unitLabel}`);
        }
      }
    }

    if (latest.notes?.trim()) {
      lines.push("");
      lines.push(`*Notes*`);
      lines.push(latest.notes.trim());
    }

    lines.push("");
    lines.push("_Shared via Tradepad_");

    const message = lines.join("\n");

    try {
      await Share.share({ message });
    } catch (err) {
      console.error("Share measurements error:", err);
    }
  };

  const handleUnitChange = async (
    next: MeasurementUnitPreference,
  ): Promise<void> => {
    setUnitUpdateError(null);
    try {
      await updateUnitPreference(next);
      setActiveUnit(next);
      await refetchPrefs();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not update units. Please try again.";
      setUnitUpdateError(message);
    }
  };

  const unitLabel = unitPreferenceToLabel(activeUnit);

  const listHeader = (
    <View>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons color={COLORS.textPrimary} name="arrow-back" size={24} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {client ? `${client.full_name}'s Measurements` : "Measurements"}
        </Text>
        {measurements.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share measurements"
            onPress={() => {
              void handleShareMeasurements();
            }}
            style={styles.shareButton}
          >
            <Ionicons
              color={COLORS.textSecondary}
              name="share-social-outline"
              size={22}
            />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add measurement"
          onPress={() => {
            router.push(`/(app)/clients/${clientId}/measurements/new`);
          }}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
        >
          <Ionicons color={COLORS.background} name="add" size={24} />
        </Pressable>
      </View>

      <View style={styles.unitRow}>
        <Text style={styles.unitLabel}>Units:</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: activeUnit === "inches" }}
          style={({ pressed }) => [
            styles.unitChip,
            activeUnit === "inches" ? styles.unitChipSelected : styles.unitChipIdle,
            pressed && styles.unitChipPressed,
          ]}
          onPress={() => {
            void handleUnitChange("inches");
          }}
        >
          <Text
            style={
              activeUnit === "inches"
                ? styles.unitChipTextSelected
                : styles.unitChipTextIdle
            }
          >
            inches
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: activeUnit === "cm" }}
          style={({ pressed }) => [
            styles.unitChip,
            activeUnit === "cm" ? styles.unitChipSelected : styles.unitChipIdle,
            pressed && styles.unitChipPressed,
          ]}
          onPress={() => {
            void handleUnitChange("cm");
          }}
        >
          <Text
            style={
              activeUnit === "cm"
                ? styles.unitChipTextSelected
                : styles.unitChipTextIdle
            }
          >
            cm
          </Text>
        </Pressable>
      </View>

      {unitUpdateError ? (
        <Text style={styles.unitError}>{unitUpdateError}</Text>
      ) : null}
    </View>
  );

  const renderEmpty = (): React.JSX.Element | null => {
    if (clientLoading || measurementsLoading) {
      return (
        <ActivityIndicator
          color={COLORS.primary}
          size="large"
          style={styles.loader}
        />
      );
    }

    if (clientError) {
      return <Text style={styles.errorText}>{clientError}</Text>;
    }

    if (measurementsError) {
      return <Text style={styles.errorText}>{measurementsError}</Text>;
    }

    if (!client) {
      return <Text style={styles.errorText}>Client not found.</Text>;
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons color={COLORS.textMuted} name="resize-outline" size={48} />
        <Text style={styles.emptyTitle}>No measurements yet</Text>
        <Text style={styles.emptySubtitle}>
          Tap + to record the first measurement
        </Text>
        <Button
          label="Add Measurement"
          style={styles.emptyButton}
          onPress={() => {
            router.push(`/(app)/clients/${clientId}/measurements/new`);
          }}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={measurements}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            colors={[COLORS.primary]}
            refreshing={measurementsLoading}
            tintColor={COLORS.primary}
            onRefresh={() => {
              void refetch();
            }}
          />
        }
        renderItem={({ item, index }) => (
          <MeasurementCard
            isLatest={index === 0}
            measurement={item}
            unitLabel={unitLabel}
            onPress={(measurementId: string) => {
              console.log("measurement pressed:", measurementId);
            }}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    padding: SPACING.md,
    paddingBottom: 100,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: SPACING.md,
  },
  backButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.lg,
    marginHorizontal: SPACING.sm,
  },
  shareButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    marginRight: SPACING.xs,
    width: 44,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  unitRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  unitLabel: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.sm,
    marginRight: SPACING.xs,
  },
  unitChip: {
    alignItems: "center",
    borderRadius: RADIUS.md,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: SPACING.md,
  },
  unitChipIdle: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  unitChipSelected: {
    backgroundColor: COLORS.primary,
  },
  unitChipPressed: {
    opacity: 0.9,
  },
  unitChipTextIdle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.sm,
  },
  unitChipTextSelected: {
    color: COLORS.background,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.sm,
  },
  unitError: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.sm,
  },
  loader: {
    marginVertical: SPACING.xxl,
  },
  errorText: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginVertical: SPACING.lg,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.lg,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
  emptyButton: {
    alignSelf: "center",
    marginTop: SPACING.lg,
    width: 220,
  },
});
