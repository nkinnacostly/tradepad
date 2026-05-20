import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ClientCard } from "../../../components/clients/ClientCard";
import { Button } from "../../../components/ui/Button";
import {
  COLORS,
  FONTS,
  FONT_SIZE,
  RADIUS,
  ROUTES,
  SPACING,
} from "../../../constants";
import { useClients } from "../../../hooks/useClients";
import type { Client } from "../../../types";

const SEARCH_BG = "#0D1526";
const SEARCH_BORDER = "#1E293B";

export default function ClientsScreen(): React.JSX.Element {
  const { clients, isLoading, error, refetch } = useClients();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const [searchText, setSearchText] = useState("");

  const filteredClients = useMemo((): Client[] => {
    const query = searchText.trim().toLowerCase();
    if (!query) return clients;

    return clients.filter((client) =>
      client.full_name.toLowerCase().includes(query),
    );
  }, [clients, searchText]);

  const handleClientPress = (clientId: string): void => {
    router.push(`/(app)/clients/${clientId}`);
  };

  const renderListEmpty = (): React.JSX.Element | null => {
    if (isLoading) {
      return (
        <ActivityIndicator
          color={COLORS.primary}
          style={styles.loader}
        />
      );
    }

    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }

    if (searchText.trim().length > 0) {
      return (
        <Text style={styles.emptySearchText}>
          No clients found for &apos;{searchText.trim()}&apos;
        </Text>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons color={COLORS.textMuted} name="people-outline" size={48} />
        <Text style={styles.emptyTitle}>No clients yet</Text>
        <Text style={styles.emptySubtitle}>
          Add your first client to get started
        </Text>
        <Button
          label="Add Client"
          style={styles.emptyButton}
          onPress={() => router.push(ROUTES.newClient)}
        />
      </View>
    );
  };

  const listHeader = (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Clients</Text>
          <Text style={styles.subtitle}>
            {clients.length} {clients.length === 1 ? "contact" : "contacts"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add client"
          onPress={() => router.push(ROUTES.newClient)}
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
        >
          <Ionicons color={COLORS.background} name="add" size={24} />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          color={COLORS.textMuted}
          name="search-outline"
          size={18}
          style={styles.searchIcon}
        />
        <TextInput
          placeholder="Search clients..."
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
        data={filteredClients}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderListEmpty}
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
          <ClientCard client={item} onPress={handleClientPress} />
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
  addButtonPressed: {
    opacity: 0.85,
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
  emptySearchText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    paddingVertical: SPACING.xl,
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
  },
  emptyButton: {
    alignSelf: "center",
    marginTop: SPACING.lg,
    width: 160,
  },
});
