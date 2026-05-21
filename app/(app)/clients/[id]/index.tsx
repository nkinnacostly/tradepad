import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { StatusBadge } from "../../../../components/jobs/StatusBadge";
import { MeasurementCard } from "../../../../components/measurements/MeasurementCard";
import { ScreenWrapper } from "../../../../components/ui/ScreenWrapper";
import {
  COLORS,
  FONTS,
  FONT_SIZE,
  JOB_STATUS_COLORS,
  JOB_STATUS_LABELS,
  RADIUS,
  SPACING,
} from "../../../../constants";
import { useClient } from "../../../../hooks/useClients";
import { useJobs, type JobWithClient } from "../../../../hooks/useJobs";
import { useLatestMeasurement } from "../../../../hooks/useMeasurements";
import type { MeasurementUnitPreference } from "../../../../types";

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatMemberSince = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("en-NG", {
    month: "short",
    year: "numeric",
  });
};

const unitPreferenceToLabel = (
  preference: MeasurementUnitPreference,
): string => {
  return preference === "inches" ? "in" : "cm";
};

export default function ClientDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { client, businessType, isLoading, error } = useClient(id ?? "");
  const {
    measurement,
    unitPreference,
    isLoading: measurementsLoading,
    error: measurementsError,
  } = useLatestMeasurement(client?.id ?? "");
  const { jobs, isLoading: jobsLoading } = useJobs();

  const handleEditPress = (): void => {
    router.push(`/(app)/clients/${id}/edit`);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (error || !client) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? "Client not found."}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backLink}
        >
          <Text style={styles.backLinkText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const clientJobs = jobs.filter((job) => job.client_id === client.id);

  const initial = client.full_name.trim().charAt(0).toUpperCase() || "?";
  const hasPhone = client.phone.trim().length > 0;
  const memberSince = formatMemberSince(client.created_at);
  const notesText = client.notes?.trim() ? client.notes : "No notes";
  const unitLabel = unitPreferenceToLabel(unitPreference);

  return (
    <ScreenWrapper decorative={false}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons color={COLORS.textPrimary} name="arrow-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Client</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit client"
          onPress={handleEditPress}
          style={styles.editButton}
        >
          <Ionicons color={COLORS.primary} name="create-outline" size={24} />
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.avatarSection}>
          <View
            style={[
              styles.avatarLarge,
              { backgroundColor: hexToRgba(COLORS.primary, 0.15) },
            ]}
          >
            <Text style={styles.avatarLargeText}>{initial}</Text>
          </View>
          <Text style={styles.clientName}>{client.full_name}</Text>
        </View>

        <View style={styles.infoRows}>
          <View style={styles.infoRow}>
            <Ionicons color={COLORS.textMuted} name="call-outline" size={18} />
            <Text style={styles.infoText}>
              {hasPhone ? client.phone : "No phone added"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons color={COLORS.textMuted} name="calendar-outline" size={18} />
            <Text style={styles.infoText}>Member since {memberSince}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              color={COLORS.textMuted}
              name="document-text-outline"
              size={18}
            />
            <Text style={styles.infoText}>{notesText}</Text>
          </View>
        </View>
      </View>

      {businessType === "tailor" ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Measurements</Text>
          {measurementsLoading ? (
            <ActivityIndicator
              color={COLORS.primary}
              size="small"
              style={styles.measurementsLoader}
            />
          ) : null}
          {measurementsError ? (
            <Text style={styles.measurementsError}>{measurementsError}</Text>
          ) : null}
          {!measurementsLoading && measurement ? (
            <>
              <MeasurementCard
                isLatest
                measurement={measurement}
                unitLabel={unitLabel}
              />
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                style={styles.viewAllLink}
                onPress={() => {
                  router.push(`/(app)/clients/${client.id}/measurements`);
                }}
              >
                <Text style={styles.viewAllLinkText}>
                  View all measurements →
                </Text>
              </Pressable>
            </>
          ) : null}
          {!measurementsLoading && !measurement ? (
            <>
              <Text style={styles.noMeasurementsText}>
                No measurements recorded yet
              </Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                style={styles.recordFirstLink}
                onPress={() => {
                  router.push(`/(app)/clients/${client.id}/measurements/new`);
                }}
              >
                <Text style={styles.recordFirstLinkText}>
                  + Record first measurement
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Jobs</Text>

        {jobsLoading ? (
          <ActivityIndicator color={COLORS.primary} size="small" />
        ) : null}

        {!jobsLoading && clientJobs.length === 0 ? (
          <Text style={styles.placeholder}>No jobs yet</Text>
        ) : null}

        {!jobsLoading &&
          clientJobs.map((job) => (
            <Pressable
              key={job.id}
              accessibilityRole="button"
              onPress={() => router.push(`/(app)/jobs/${job.id}`)}
              style={({ pressed }) => [
                styles.jobRow,
                pressed && styles.jobRowPressed,
              ]}
            >
              <View style={styles.jobRowLeft}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.jobAmount}>
                  ₦{job.total_amount.toLocaleString("en-NG")}
                </Text>
              </View>
              <StatusBadge status={job.status} size="sm" />
            </Pressable>
          ))}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center",
    padding: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    textAlign: "center",
  },
  backLink: {
    marginTop: SPACING.md,
    minHeight: 44,
    justifyContent: "center",
  },
  backLinkText: {
    color: COLORS.primary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: SPACING.lg,
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
    fontSize: FONT_SIZE.xl,
    marginLeft: SPACING.xs,
  },
  editButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  avatarLarge: {
    alignItems: "center",
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  avatarLargeText: {
    color: COLORS.primary,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.xxxl,
  },
  clientName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.xl,
    marginTop: SPACING.md,
    textAlign: "center",
  },
  infoRows: {
    gap: SPACING.md,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  infoText: {
    color: COLORS.textSecondary,
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    marginLeft: SPACING.sm,
  },
  section: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.sm,
  },
  placeholder: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
  },
  jobRow: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  jobRowPressed: {
    opacity: 0.8,
  },
  jobRowLeft: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  jobTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
  jobAmount: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },
  measurementsLoader: {
    alignSelf: "flex-start",
    marginBottom: SPACING.sm,
  },
  measurementsError: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.sm,
  },
  noMeasurementsText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
  },
  recordFirstLink: {
    marginTop: SPACING.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  recordFirstLinkText: {
    color: COLORS.primary,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.sm,
  },
  viewAllLink: {
    marginTop: SPACING.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  viewAllLinkText: {
    color: COLORS.primary,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.sm,
  },
});
