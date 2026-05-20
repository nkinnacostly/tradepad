import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  COLORS,
  FONTS,
  FONT_SIZE,
  JOB_STATUS_COLORS,
  JOB_STATUS_LABELS,
  RADIUS,
  SPACING,
} from "../../constants";
import type { RecentJob } from "../../hooks/useDashboard";

interface JobListItemProps {
  job: RecentJob;
  onPress: (id: string) => void;
}

const formatDueDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
};

const formatAmount = (value: number): string => {
  return `₦${value.toLocaleString("en-NG")}`;
};

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const JobListItem = ({
  job,
  onPress,
}: JobListItemProps): React.JSX.Element => {
  const statusColor = JOB_STATUS_COLORS[job.status];
  const balance = job.total_amount - job.amount_paid;
  const isFullyPaid = balance <= 0;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(job.id)}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.clientName}>
            {job.clients?.full_name ?? "Unknown client"}
          </Text>
          <Text style={styles.jobTitle}>{job.title}</Text>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: hexToRgba(statusColor, 0.15) },
          ]}
        >
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {JOB_STATUS_LABELS[job.status]}
          </Text>
        </View>
      </View>

      <View style={styles.rowBottom}>
        <View>
          {job.due_date ? (
            <Text style={styles.dueDate}>
              Due {formatDueDate(job.due_date)}
            </Text>
          ) : null}
        </View>
        <Text
          style={[
            styles.balance,
            isFullyPaid ? styles.balancePaid : styles.balanceOutstanding,
          ]}
        >
          {isFullyPaid ? "Paid" : formatAmount(balance)}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  pressed: {
    opacity: 0.8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  left: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  clientName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
  jobTitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.xs,
  },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
  },
  dueDate: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.xs,
  },
  balance: {
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.sm,
  },
  balanceOutstanding: {
    color: COLORS.warning,
  },
  balancePaid: {
    color: COLORS.success,
  },
});
