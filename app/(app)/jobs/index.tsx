import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { JobCard } from "../../../components/jobs/JobCard";
import {
  COLORS,
  FONTS,
  FONT_SIZE,
  JOB_STATUS_LABELS,
  RADIUS,
  ROUTES,
  SPACING,
} from "../../../constants";
import type { JobWithClient } from "../../../hooks/useJobs";
import { useJobs } from "../../../hooks/useJobs";
import type { JobStatus } from "../../../types";

const SEARCH_BG = "#0D1526";
const SEARCH_BORDER = "#1E293B";

type FilterStatus = "all" | JobStatus;

const FILTER_ORDER: FilterStatus[] = [
  "all",
  "received",
  "in_progress",
  "ready",
  "delivered",
];

const filterLabel = (f: FilterStatus): string => {
  if (f === "all") return "All";
  return JOB_STATUS_LABELS[f];
};

export default function JobsScreen(): React.JSX.Element {
  const { jobs, isLoading, error, refetch } = useJobs();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");

  const statusFiltered = useMemo((): JobWithClient[] => {
    if (activeFilter === "all") return jobs;
    return jobs.filter((job) => job.status === activeFilter);
  }, [jobs, activeFilter]);

  const filteredJobs = useMemo((): JobWithClient[] => {
    const query = searchText.trim().toLowerCase();
    if (!query) return statusFiltered;

    return statusFiltered.filter((job) => {
      const titleMatch = job.title.toLowerCase().includes(query);
      const clientName = job.clients?.full_name?.toLowerCase() ?? "";
      const clientMatch = clientName.includes(query);
      return titleMatch || clientMatch;
    });
  }, [statusFiltered, searchText]);

  const handleJobPress = (jobId: string): void => {
    // router.push(ROUTES.job(jobId));
    router.push(`/(app)/jobs/${jobId}`);
  };

  const renderEmpty = (): React.JSX.Element | null => {
    if (isLoading) {
      return <ActivityIndicator color={COLORS.primary} style={styles.loader} />;
    }

    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }

    if (jobs.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons
            color={COLORS.textMuted}
            name="briefcase-outline"
            size={48}
          />
          <Text style={styles.emptyTitle}>No jobs yet</Text>
          <Text style={styles.emptySubtitle}>
            Create a job to track work and payments
          </Text>
        </View>
      );
    }

    if (statusFiltered.length === 0 && activeFilter !== "all") {
      return (
        <Text style={styles.filterEmpty}>
          No {filterLabel(activeFilter)} jobs
        </Text>
      );
    }

    if (filteredJobs.length === 0 && searchText.trim().length > 0) {
      return (
        <Text style={styles.filterEmpty}>
          No jobs found for &apos;{searchText.trim()}&apos;
        </Text>
      );
    }

    if (filteredJobs.length === 0) {
      return <Text style={styles.filterEmpty}>No jobs match your search</Text>;
    }

    return null;
  };

  const listHeader = (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Jobs</Text>
          <Text style={styles.subtitle}>
            {jobs.length} {jobs.length === 1 ? "job" : "jobs"} total
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New job"
          onPress={() => router.push(ROUTES.newJob)}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addPressed,
          ]}
        >
          <Ionicons color={COLORS.background} name="add" size={24} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.filterScroll}
        showsHorizontalScrollIndicator={false}
      >
        {FILTER_ORDER.map((filter) => {
          const selected = activeFilter === filter;

          return (
            <Pressable
              key={filter}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setActiveFilter(filter)}
              style={({ pressed }) => [
                styles.chip,
                selected ? styles.chipSelected : styles.chipUnselected,
                pressed && styles.chipPressed,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  selected
                    ? styles.chipTextSelected
                    : styles.chipTextUnselected,
                ]}
              >
                {filterLabel(filter)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.searchContainer}>
        <Ionicons
          color={COLORS.textMuted}
          name="search-outline"
          size={18}
          style={styles.searchIcon}
        />
        <TextInput
          placeholder="Search jobs or clients..."
          placeholderTextColor={COLORS.textMuted}
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={listHeader}
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
        renderItem={({ item }) => (
          <JobCard job={item} onPress={handleJobPress} />
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
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.xxl,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  addPressed: {
    opacity: 0.85,
  },
  filterScroll: {
    flexDirection: "row",
    marginBottom: SPACING.md,
    paddingRight: SPACING.md,
  },
  chip: {
    borderRadius: RADIUS.full,
    marginRight: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
  },
  chipUnselected: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    fontSize: FONT_SIZE.sm,
  },
  chipTextSelected: {
    color: COLORS.background,
    fontFamily: FONTS.semibold,
  },
  chipTextUnselected: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  searchContainer: {
    alignItems: "center",
    backgroundColor: SEARCH_BG,
    borderColor: SEARCH_BORDER,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: "row",
    height: 48,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    height: 48,
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
  filterEmpty: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    paddingVertical: SPACING.xl,
    textAlign: "center",
  },
});
