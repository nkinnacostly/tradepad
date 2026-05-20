import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { JobListItem } from "../../components/dashboard/JobListItem";
import { StatCard } from "../../components/dashboard/StatCard";
import { Button } from "../../components/ui/Button";
import { ScreenWrapper } from "../../components/ui/ScreenWrapper";
import { COLORS, FONTS, FONT_SIZE, ROUTES, SPACING } from "../../constants";
import { useDashboard } from "../../hooks/useDashboard";

const getTimeOfDay = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
};

const formatTodayDate = (): string => {
  return new Date().toLocaleDateString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export default function DashboardScreen(): React.JSX.Element {
  const {
    profile,
    activeJobs,
    dueToday,
    outstandingAmount,
    recentJobs,
    isLoading,
    error,
    refetch,
  } = useDashboard();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const handleJobPress = (id: string): void => {
    router.push(`/(app)/jobs/${id}`);
  };

  return (
    <ScreenWrapper
      refreshControl={
        <RefreshControl
          colors={[COLORS.primary]}
          refreshing={isLoading}
          tintColor={COLORS.primary}
          onRefresh={() => {
            void refetch();
          }}
        />
      }
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
          <Text numberOfLines={1} style={styles.businessName}>
            {profile?.business_name ?? "Your business"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          style={styles.bellButton}
        >
          <Ionicons
            color={COLORS.textSecondary}
            name="notifications-outline"
            size={24}
          />
        </Pressable>
      </View>

      <Text style={styles.dateText}>{formatTodayDate()}</Text>

      <View style={styles.statsRow}>
        <StatCard
          icon="briefcase-outline"
          label="Active Jobs"
          value={activeJobs}
        />
        <StatCard
          icon="time-outline"
          iconColor={COLORS.warning}
          label="Due Today"
          value={dueToday}
        />
        <StatCard
          icon="wallet-outline"
          iconColor={COLORS.error}
          isAmount
          label="Outstanding"
          value={outstandingAmount}
        />
      </View>

      <Text style={styles.sectionLabel}>Quick Actions</Text>
      <View style={styles.quickActionsRow}>
        <Button
          label="+ Add Client"
          style={styles.quickActionButton}
          variant="outline"
          onPress={() => router.push(ROUTES.newClient)}
        />
        <Button
          label="+ New Job"
          style={styles.quickActionButton}
          onPress={() => router.push(ROUTES.newJob)}
        />
      </View>

      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>Recent Jobs</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(ROUTES.jobs)}
        >
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!isLoading && !error && recentJobs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            color={COLORS.textMuted}
            name="briefcase-outline"
            size={48}
          />
          <Text style={styles.emptyTitle}>No jobs yet</Text>
          <Text style={styles.emptySubtitle}>
            Add your first client to get started
          </Text>
        </View>
      ) : null}

      {!isLoading && !error && recentJobs.length > 0
        ? recentJobs.map((job) => (
            <JobListItem key={job.id} job={job} onPress={handleJobPress} />
          ))
        : null}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  greeting: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
  },
  businessName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.xxl,
  },
  bellButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  dateText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.lg,
    marginTop: SPACING.xs,
  },
  statsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.sm,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  quickActionButton: {
    flex: 1,
  },
  recentHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  recentTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
  seeAll: {
    color: COLORS.primary,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.sm,
  },
  loader: {
    marginVertical: SPACING.lg,
  },
  errorText: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
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
  },
});
