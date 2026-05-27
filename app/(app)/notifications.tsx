import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import {
  COLORS,
  FONTS,
  FONT_SIZE,
  RADIUS,
  SPACING,
} from "../../constants";
import {
  useNotifications,
  type Notification,
} from "../../hooks/useNotifications";

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getRelativeTime = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
};

const getNotificationIcon = (
  type: string,
): { name: keyof typeof Ionicons.glyphMap; color: string } => {
  if (type === "due_reminder") {
    return { name: "calendar-outline", color: COLORS.warning };
  }
  return { name: "notifications-outline", color: COLORS.primary };
};

export default function NotificationsScreen(): React.JSX.Element {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const handleNotificationPress = (notification: Notification): void => {
    void markAsRead(notification.id);
    if (notification.job_id) {
      router.push(`/(app)/jobs/${notification.job_id}`);
    }
  };

  const renderItem = ({ item }: { item: Notification }): React.JSX.Element => {
    const icon = getNotificationIcon(item.type);

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => handleNotificationPress(item)}
        style={({ pressed }) => [
          styles.card,
          item.is_read ? styles.cardRead : styles.cardUnread,
          pressed && styles.cardPressed,
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: hexToRgba(icon.color, 0.15) },
          ]}
        >
          <Ionicons color={icon.color} name={icon.name} size={18} />
        </View>

        <View style={styles.cardMiddle}>
          <Text
            style={[
              styles.cardTitle,
              item.is_read ? styles.cardTitleRead : styles.cardTitleUnread,
            ]}
          >
            {item.title}
          </Text>
          <Text numberOfLines={2} style={styles.cardBody}>
            {item.body}
          </Text>
          <Text style={styles.cardTime}>
            {getRelativeTime(item.created_at)}
          </Text>
        </View>

        <View style={styles.cardRight}>
          {!item.is_read ? <View style={styles.unreadDot} /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete notification"
            hitSlop={8}
            onPress={() => {
              void deleteNotification(item.id);
            }}
            style={styles.deleteButton}
          >
            <Ionicons color={COLORS.textMuted} name="trash-outline" size={16} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderEmpty = (): React.JSX.Element | null => {
    if (isLoading) {
      return (
        <ActivityIndicator
          color={COLORS.primary}
          size="large"
          style={styles.centeredLoader}
        />
      );
    }

    if (error) {
      return (
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            label="Retry"
            style={styles.retryButton}
            variant="outline"
            onPress={() => {
              void refetch();
            }}
          />
        </View>
      );
    }

    return (
      <View style={styles.centeredState}>
        <Ionicons
          color={COLORS.textMuted}
          name="notifications-outline"
          size={48}
        />
        <Text style={styles.emptyTitle}>No notifications yet</Text>
        <Text style={styles.emptySubtitle}>
          You&apos;ll see job reminders and updates here
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons color={COLORS.textPrimary} name="arrow-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void markAllAsRead();
            }}
            style={styles.markAllButton}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={styles.markAllPlaceholder} />
        )}
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={notifications}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        renderItem={renderItem}
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
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.sm,
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
  markAllButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: SPACING.xs,
  },
  markAllPlaceholder: {
    width: 88,
  },
  markAllText: {
    color: COLORS.primary,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.sm,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
    paddingHorizontal: SPACING.md,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  cardUnread: {
    backgroundColor: COLORS.surface,
    borderColor: hexToRgba(COLORS.primary, 0.3),
  },
  cardRead: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
  },
  cardPressed: {
    opacity: 0.85,
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  cardMiddle: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  cardTitle: {
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
  cardTitleUnread: {
    color: COLORS.textPrimary,
  },
  cardTitleRead: {
    color: COLORS.textSecondary,
  },
  cardBody: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },
  cardTime: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs,
  },
  cardRight: {
    alignItems: "flex-end",
    marginLeft: SPACING.sm,
  },
  unreadDot: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  deleteButton: {
    marginTop: SPACING.xs,
    minHeight: 32,
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  centeredLoader: {
    marginVertical: SPACING.xxl,
  },
  centeredState: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
  },
  errorText: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  retryButton: {
    minWidth: 120,
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
});
