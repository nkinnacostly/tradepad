import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  BUSINESS_TYPE_LABELS,
  COLORS,
  FONTS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  ROUTES,
  SPACING,
} from "../../../constants";
import { signOut, useAuth } from "../../../hooks/useAuth";
import { updateUnitPreference } from "../../../hooks/useMeasurements";
import { useProfileBankStatus } from "../../../hooks/usePaymentLink";
import { supabase } from "../../../lib/supabase";
import type { BusinessType, MeasurementUnitPreference } from "../../../types";

interface SettingsProfile {
  id: string;
  business_name: string;
  business_type: BusinessType;
  phone: string;
  unit_preference: MeasurementUnitPreference | null;
}

const parseUnitPreference = (
  raw: unknown,
): MeasurementUnitPreference | null => {
  if (raw === "cm" || raw === "inches") {
    return raw;
  }
  return null;
};

const mapProfileError = (): string => {
  return "Could not load your profile. Please try again.";
};

export default function SettingsScreen(): React.JSX.Element {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<SettingsProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [activeUnit, setActiveUnit] =
    useState<MeasurementUnitPreference>("inches");
  const [isUpdatingUnit, setIsUpdatingUnit] = useState<boolean>(false);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const { hasBankAccount } = useProfileBankStatus();

  const loadProfile = useCallback(async (): Promise<void> => {
    setProfileError(null);
    setIsProfileLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const authUser = authData.user;
      if (!authUser) {
        setProfile(null);
        setProfileError("You must be signed in to view settings.");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, business_name, business_type, phone, unit_preference")
        .eq("id", authUser.id)
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error("No profile");
      }

      const unit = parseUnitPreference(data.unit_preference);
      const nextProfile: SettingsProfile = {
        id: data.id,
        business_name: data.business_name,
        business_type: data.business_type as BusinessType,
        phone: data.phone,
        unit_preference: unit,
      };

      setProfile(nextProfile);
      setActiveUnit(unit ?? "inches");
    } catch (error) {
      console.error("Settings loadProfile error:", error);
      setProfile(null);
      setProfileError(mapProfileError());
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      setProfile(null);
      setProfileError("You must be signed in to view settings.");
      setIsProfileLoading(false);
      return;
    }
    void loadProfile();
  }, [authLoading, user, loadProfile]);

  const handleRetry = (): void => {
    void loadProfile();
  };

  const handleUnitChange = async (
    next: MeasurementUnitPreference,
  ): Promise<void> => {
    if (next === activeUnit) {
      return;
    }

    setIsUpdatingUnit(true);
    try {
      await updateUnitPreference(next);
      setActiveUnit(next);
      setProfile((current) =>
        current ? { ...current, unit_preference: next } : current,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not update units. Please try again.";
      Alert.alert("Update failed", message);
    } finally {
      setIsUpdatingUnit(false);
    }
  };

  const handleSignOutPress = (): void => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { style: "cancel", text: "Cancel" },
      {
        style: "destructive",
        text: "Sign out",
        onPress: () => {
          void (async (): Promise<void> => {
            setIsSigningOut(true);
            try {
              await signOut();
              router.replace(ROUTES.login);
            } catch (error) {
              console.error("Settings signOut error:", error);
              Alert.alert(
                "Sign out failed",
                "Something went wrong. Please try again.",
              );
            } finally {
              setIsSigningOut(false);
            }
          })();
        },
      },
    ]);
  };

  const showFullScreenLoader = authLoading || isProfileLoading;
  const businessTypeLabel =
    profile !== null
      ? BUSINESS_TYPE_LABELS[profile.business_type]
      : "";

  if (showFullScreenLoader) {
    return (
      <View style={styles.fullScreenCenter}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (profileError !== null || profile === null) {
    return (
      <View style={styles.fullScreenCenter}>
        <Text style={styles.errorText}>
          {profileError ?? "Could not load settings."}
        </Text>
        <Pressable
          accessibilityRole="button"
          style={styles.retryButton}
          onPress={handleRetry}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Settings</Text>

        <Text style={styles.sectionHeading}>BUSINESS PROFILE</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Ionicons
              color={COLORS.textMuted}
              name="business-outline"
              size={20}
              style={styles.rowIcon}
            />
            <View style={styles.rowMiddle}>
              <Text style={styles.rowLabel}>Business name</Text>
              <Text style={styles.rowValue}>{profile.business_name}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.profileRow}>
            <Ionicons
              color={COLORS.textMuted}
              name="storefront-outline"
              size={20}
              style={styles.rowIcon}
            />
            <View style={styles.rowMiddle}>
              <Text style={styles.rowLabel}>Business type</Text>
              <Text style={styles.rowValue}>{businessTypeLabel}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.profileRow}>
            <Ionicons
              color={COLORS.textMuted}
              name="call-outline"
              size={20}
              style={styles.rowIcon}
            />
            <View style={styles.rowMiddle}>
              <Text style={styles.rowLabel}>Phone</Text>
              <Text style={styles.rowValue}>{profile.phone}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeading}>PREFERENCES</Text>
        <View style={styles.card}>
          <View style={styles.preferenceRow}>
            <Ionicons
              color={COLORS.textMuted}
              name="resize-outline"
              size={20}
              style={styles.rowIcon}
            />
            <View style={styles.preferenceMiddle}>
              <Text style={styles.rowLabel}>Measurement units</Text>
            </View>
            <View style={styles.chipGroup}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: activeUnit === "inches" }}
                disabled={isUpdatingUnit}
                style={({ pressed }) => [
                  styles.unitChip,
                  activeUnit === "inches"
                    ? styles.unitChipSelected
                    : styles.unitChipIdle,
                  pressed && !isUpdatingUnit && styles.unitChipPressed,
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
                disabled={isUpdatingUnit}
                style={({ pressed }) => [
                  styles.unitChip,
                  activeUnit === "cm"
                    ? styles.unitChipSelected
                    : styles.unitChipIdle,
                  pressed && !isUpdatingUnit && styles.unitChipPressed,
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
              {isUpdatingUnit ? (
                <ActivityIndicator
                  color={COLORS.primary}
                  size="small"
                  style={styles.unitSpinner}
                />
              ) : null}
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeading}>PAYMENTS</Text>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.paymentsRow,
              pressed && styles.paymentsRowPressed,
            ]}
            onPress={() => {
              router.push("/(app)/settings/bank-account");
            }}
          >
            <Ionicons
              color={COLORS.textMuted}
              name="card-outline"
              size={20}
              style={styles.rowIcon}
            />
            <View style={styles.rowMiddle}>
              <Text style={styles.rowLabel}>Bank account</Text>
              <Text
                style={[
                  styles.bankStatusValue,
                  hasBankAccount
                    ? styles.bankStatusConnected
                    : styles.bankStatusPending,
                ]}
              >
                {hasBankAccount ? "Connected ✓" : "Not set up"}
              </Text>
            </View>
            <Ionicons
              color={COLORS.textMuted}
              name="chevron-forward"
              size={18}
            />
          </Pressable>
        </View>

        <Text style={styles.sectionHeading}>ACCOUNT</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Ionicons
              color={COLORS.textMuted}
              name="information-circle-outline"
              size={20}
              style={styles.rowIcon}
            />
            <View style={styles.rowMiddle}>
              <Text style={styles.rowLabel}>Version</Text>
              <Text style={styles.rowValue}>1.0.0</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Pressable
            accessibilityRole="button"
            disabled={isSigningOut}
            style={({ pressed }) => [
              styles.signOutRow,
              pressed && !isSigningOut && styles.signOutRowPressed,
            ]}
            onPress={handleSignOutPress}
          >
            <Ionicons
              color={COLORS.error}
              name="log-out-outline"
              size={20}
              style={styles.rowIcon}
            />
            {isSigningOut ? (
              <ActivityIndicator
                color={COLORS.error}
                size="small"
                style={styles.signOutSpinner}
              />
            ) : (
              <Text style={styles.signOutText}>Sign out</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 120,
  },
  fullScreenCenter: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center",
    padding: SPACING.md,
  },
  screenTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.xxl,
    marginBottom: SPACING.md,
  },
  sectionHeading: {
    color: COLORS.textMuted,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  profileRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  preferenceRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  rowIcon: {
    marginRight: SPACING.md,
  },
  rowMiddle: {
    flex: 1,
  },
  preferenceMiddle: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  rowLabel: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
  },
  rowValue: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.xs,
  },
  paymentsRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  paymentsRowPressed: {
    opacity: 0.85,
  },
  bankStatusValue: {
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.xs,
  },
  bankStatusConnected: {
    color: COLORS.success,
  },
  bankStatusPending: {
    color: COLORS.warning,
  },
  divider: {
    backgroundColor: COLORS.border,
    height: 1,
    marginHorizontal: SPACING.md,
  },
  chipGroup: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: SPACING.sm,
  },
  unitChip: {
    alignItems: "center",
    borderRadius: RADIUS.md,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: SPACING.md,
  },
  unitChipIdle: {
    backgroundColor: COLORS.surfaceAlt,
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
  unitSpinner: {
    marginLeft: SPACING.xs,
  },
  signOutRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  signOutRowPressed: {
    opacity: 0.85,
  },
  signOutText: {
    color: COLORS.error,
    flex: 1,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
  signOutSpinner: {
    marginLeft: SPACING.xs,
  },
  errorText: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    textAlign: "center",
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    justifyContent: "center",
    marginTop: SPACING.lg,
    minHeight: 44,
    minWidth: 120,
    paddingHorizontal: SPACING.lg,
  },
  retryButtonText: {
    color: COLORS.background,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
});
