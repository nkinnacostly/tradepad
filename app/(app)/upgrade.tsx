import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { ScreenWrapper } from "../../components/ui/ScreenWrapper";
import {
  COLORS,
  FONTS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
} from "../../constants";
import { useSubscription } from "../../contexts/SubscriptionContext";
import {
  generateSubscriptionLink,
  verifySubscription,
} from "../../hooks/usePaymentLink";
import type { BillingCycle } from "../../types";

interface Plan {
  cycle: BillingCycle;
  label: string;
  price: string;
  period: string;
  badge?: string;
}

const PLANS: Plan[] = [
  {
    cycle: "monthly",
    label: "Monthly",
    price: "₦1,500",
    period: "per month",
  },
  {
    cycle: "annual",
    label: "Annual",
    price: "₦12,000",
    period: "per year",
    badge: "Save ₦6,000",
  },
];

const FEATURES: string[] = [
  "Unlimited clients",
  "Unlimited jobs",
  "Payment links",
  "WhatsApp invoices",
  "Due-date reminders",
  "Business analytics",
];

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function UpgradeScreen(): React.JSX.Element {
  const { profile, isPro, refresh } = useSubscription();

  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>("annual");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [attempted, setAttempted] = useState<boolean>(false);
  const [txRef, setTxRef] = useState<string | null>(null);
  const [linkOpened, setLinkOpened] = useState<boolean>(false);

  // Mirror the values the focus handler needs into refs so useFocusEffect can
  // stay subscribed once (deps: [refresh]) yet read the latest state without
  // re-firing every time txRef/isPro change.
  const txRefRef = useRef<string | null>(null);
  txRefRef.current = txRef;
  const isProRef = useRef<boolean>(false);
  isProRef.current = isPro;
  const isVerifyingRef = useRef<boolean>(false);
  isVerifyingRef.current = isVerifying;
  // The tx_ref we've already auto-verified, so a return only auto-fires once.
  const autoVerifiedRef = useRef<string | null>(null);

  const runVerify = useCallback(
    async (ref: string, silent: boolean): Promise<void> => {
      if (isVerifyingRef.current) return;

      setError(null);
      if (!silent) setNotice(null);
      setIsVerifying(true);

      try {
        const result = await verifySubscription({ tx_ref: ref });

        if (result.isPro) {
          setAttempted(true);
          setNotice(null);
          await refresh();
        } else {
          setNotice(
            result.message ||
              "Payment not confirmed yet. Please try again in a moment.",
          );
        }
      } catch (err) {
        // Stay quiet on the silent auto-attempt; the manual button surfaces it.
        if (!silent) {
          const message =
            err instanceof Error
              ? err.message
              : "Could not verify payment. Please try again.";
          setError(message);
        }
      } finally {
        setIsVerifying(false);
      }
    },
    [refresh],
  );

  // On returning to the screen, re-read the profile and auto-verify the stored
  // tx_ref once. The manual button below remains the reliable trigger.
  useFocusEffect(
    useCallback(() => {
      void refresh();

      const ref = txRefRef.current;
      if (ref && !isProRef.current && autoVerifiedRef.current !== ref) {
        autoVerifiedRef.current = ref;
        void runVerify(ref, true);
      }
    }, [refresh, runVerify]),
  );

  const justUpgraded = attempted && isPro;

  const handleUpgrade = async (): Promise<void> => {
    if (isGenerating) return;
    setError(null);
    setNotice(null);
    setIsGenerating(true);

    try {
      const { payment_link, tx_ref } = await generateSubscriptionLink({
        billing_cycle: selectedCycle,
      });

      // Store the tx_ref before opening the browser so both the auto-verify
      // below and the manual button have it.
      setTxRef(tx_ref);
      setLinkOpened(true);
      setAttempted(true);
      // Auto-verify is driven by the browser closing below; claim this ref so
      // the focus-effect auto-verify doesn't fire a duplicate check.
      autoVerifiedRef.current = tx_ref;
      setIsGenerating(false);

      // In-app checkout. Resolves when the browser redirects to the function's
      // redirect_url or the user dismisses it — the return URL must match.
      await WebBrowser.openAuthSessionAsync(
        payment_link,
        "https://tradepad.app/payment-complete",
      );

      // The browser closing means the user is back, NOT that they paid. Only
      // verify-subscription confirms payment with Flutterwave. Silent: a hard
      // error stays quiet (the manual button surfaces it), while a "not yet
      // confirmed" result still shows the retry notice.
      await runVerify(tx_ref, true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not start the upgrade. Please try again.";
      setError(message);
      setIsGenerating(false);
    }
  };

  const handleVerifyTap = (): void => {
    if (!txRef) return;
    void runVerify(txRef, false);
  };

  const expiryDate = profile?.subscription_expires_at
    ? formatDate(profile.subscription_expires_at)
    : null;

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
        <Text style={styles.title}>Tradepad Pro</Text>
      </View>

      {justUpgraded ? (
        <View style={styles.successCard}>
          <Ionicons
            color={COLORS.success}
            name="checkmark-circle"
            size={22}
          />
          <Text style={styles.successText}>
            You&apos;re on Pro — thank you for upgrading!
          </Text>
        </View>
      ) : null}

      {isPro ? (
        <View style={styles.statusCard}>
          <View style={styles.statusBadge}>
            <Ionicons color={COLORS.primary} name="sparkles" size={16} />
            <Text style={styles.statusBadgeText}>Pro</Text>
          </View>
          <Text style={styles.statusTitle}>You&apos;re on Tradepad Pro</Text>
          {expiryDate ? (
            <Text style={styles.statusSubtitle}>
              Renews / expires {expiryDate}
            </Text>
          ) : null}
          <Text style={styles.statusHint}>
            Renew any time — extra time stacks on top of what you have left.
          </Text>
        </View>
      ) : (
        <Text style={styles.valueLine}>
          Unlock unlimited clients and jobs, payment links, WhatsApp invoices,
          reminders, and analytics.
        </Text>
      )}

      <View style={styles.featureList}>
        {FEATURES.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <Ionicons
              color={COLORS.primary}
              name="checkmark-circle"
              size={18}
            />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <View style={styles.planGroup}>
        {PLANS.map((plan) => {
          const selected = selectedCycle === plan.cycle;

          return (
            <Pressable
              key={plan.cycle}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setSelectedCycle(plan.cycle)}
              style={({ pressed }) => [
                styles.planCard,
                selected && styles.planCardSelected,
                pressed && styles.planCardPressed,
              ]}
            >
              <View style={styles.planLeft}>
                <View
                  style={[styles.radio, selected && styles.radioSelected]}
                >
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <View>
                  <Text style={styles.planLabel}>{plan.label}</Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </View>
              </View>

              <View style={styles.planRight}>
                <Text style={styles.planPrice}>{plan.price}</Text>
                {plan.badge ? (
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>{plan.badge}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Button
        isLoading={isGenerating}
        label={isPro ? "Renew Now" : "Upgrade Now"}
        onPress={handleUpgrade}
      />

      {linkOpened && !isPro ? (
        <Button
          isLoading={isVerifying}
          label="I've completed payment"
          style={styles.verifyButton}
          variant="outline"
          onPress={handleVerifyTap}
        />
      ) : null}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: SPACING.lg,
  },
  backButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    marginRight: SPACING.sm,
    width: 44,
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.xl,
  },
  successCard: {
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: COLORS.success,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  successText: {
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.sm,
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
  },
  statusBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full,
    flexDirection: "row",
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  statusBadgeText: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 1,
  },
  statusTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.lg,
  },
  statusSubtitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.xs,
  },
  statusHint: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.sm,
  },
  valueLine: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  featureList: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  featureRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  featureText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
  },
  planGroup: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  planCard: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: SPACING.md,
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  planCardPressed: {
    opacity: 0.85,
  },
  planLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  radio: {
    alignItems: "center",
    borderColor: COLORS.textMuted,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    height: 10,
    width: 10,
  },
  planLabel: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
  planPeriod: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },
  planRight: {
    alignItems: "flex-end",
    gap: SPACING.xs,
  },
  planPrice: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.lg,
  },
  saveBadge: {
    backgroundColor: "rgba(245, 166, 35, 0.15)",
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  saveBadgeText: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  errorText: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
  },
  noticeText: {
    color: COLORS.warning,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
  },
  verifyButton: {
    marginTop: SPACING.sm,
  },
});
