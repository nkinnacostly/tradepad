import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  COLORS,
  FONTS,
  FONT_SIZE,
  JOB_STATUS_COLORS,
  RADIUS,
  SPACING,
} from "../../constants";
import type { JobWithClient } from "../../hooks/useJobs";
import { StatusBadge } from "./StatusBadge";

interface JobCardProps {
  job: JobWithClient;
  onPress: (id: string) => void;
}

const formatDueDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
};

const formatAmount = (value: number): string => {
  return `₦${value.toLocaleString("en-NG")}`;
};

export const JobCard = ({
  job,
  onPress,
}: JobCardProps): React.JSX.Element => {
  const balance = job.total_amount - job.amount_paid;
  const isFullyPaid = balance <= 0;
  const accentColor = JOB_STATUS_COLORS[job.status];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(job.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.inner}>
        <View style={styles.row}>
          <View style={styles.left}>
            <Text style={styles.clientName}>
              {job.clients?.full_name ?? "Unknown client"}
            </Text>
            <Text style={styles.jobTitle}>{job.title}</Text>
          </View>
          <StatusBadge status={job.status} />
        </View>

        <View style={styles.rowBottom}>
          <View style={styles.dueRow}>
            {job.due_date ? (
              <>
                <Ionicons color={COLORS.textMuted} name="time-outline" size={14} />
                <Text style={styles.dueText}>
                  Due {formatDueDate(job.due_date)}
                </Text>
              </>
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
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    overflow: "hidden",
    position: "relative",
  },
  pressed: {
    opacity: 0.8,
  },
  accentBar: {
    borderBottomLeftRadius: RADIUS.lg,
    borderTopLeftRadius: RADIUS.lg,
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 3,
  },
  inner: {
    padding: SPACING.md,
    paddingLeft: SPACING.sm + 3,
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
  rowBottom: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
  },
  dueRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  dueText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.xs,
    marginLeft: 4,
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
