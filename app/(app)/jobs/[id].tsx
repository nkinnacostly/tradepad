import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";

import { StatusBadge } from "../../../components/jobs/StatusBadge";
import { Button } from "../../../components/ui/Button";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import {
  COLORS,
  FONTS,
  FONT_SIZE,
  JOB_STATUS_COLORS,
  RADIUS,
  SPACING,
} from "../../../constants";
import { useClient } from "../../../hooks/useClients";
import { useBankAccountDetails } from "../../../hooks/usePaymentLink";
import { recordPayment, updateJobStatus, useJob } from "../../../hooks/useJobs";
import { supabase } from "../../../lib/supabase";
import type { JobStatus, PaymentMethod } from "../../../types";
import { sendWhatsAppInvoice } from "../../../utils/whatsapp";

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

const nextStatus = (current: JobStatus): JobStatus | null => {
  if (current === "received") return "in_progress";
  if (current === "in_progress") return "ready";
  if (current === "ready") return "delivered";
  return null;
};

const nextStatusLabel = (current: JobStatus): string | null => {
  if (current === "received") return "Mark In Progress";
  if (current === "in_progress") return "Mark Ready";
  if (current === "ready") return "Mark Delivered";
  return null;
};

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Transfer" },
  { value: "online", label: "Online" },
];

export default function JobDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { job, jobItems, businessType, isLoading, error, refetch } = useJob(
    id ?? "",
  );
  const { client } = useClient(job?.client_id ?? "");
  const { details: bankDetails, isLoading: bankStatusLoading } =
    useBankAccountDetails();
  const hasBankAccount = Boolean(bankDetails?.bank_account_number);

  const [businessName, setBusinessName] = useState<string>("");
  const [isSendingInvoice, setIsSendingInvoice] = useState<boolean>(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const clearPaymentMessage = useCallback((): void => {
    setPaymentMessage(null);
  }, []);

  useEffect(() => {
    if (!paymentMessage) return;
    const t = setTimeout(() => {
      clearPaymentMessage();
    }, 2500);
    return (): void => clearTimeout(t);
  }, [paymentMessage, clearPaymentMessage]);

  useEffect(() => {
    const fetchBusinessName = async (): Promise<void> => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id ?? "";
        if (!userId) {
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("business_name")
          .eq("id", userId)
          .single();

        if (data?.business_name) {
          setBusinessName(data.business_name);
        }
      } catch {
        // Profile name is optional for invoice; button stays disabled without it
      }
    };

    void fetchBusinessName();
  }, []);

  const handleSendInvoice = async (): Promise<void> => {
    if (!job || !client || !businessName.trim()) {
      return;
    }

    setIsSendingInvoice(true);

    try {
      await sendWhatsAppInvoice({
        job,
        jobItems,
        businessName: businessName.trim(),
        phone: client.phone,
        bankDetails:
          bankDetails?.bank_account_number && bankDetails.bank_name
            ? {
                accountName: bankDetails.bank_account_name ?? "",
                bankName: bankDetails.bank_name,
                accountNumber: bankDetails.bank_account_number,
              }
            : undefined,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not open WhatsApp";
      Alert.alert("WhatsApp Error", message);
    } finally {
      setIsSendingInvoice(false);
    }
  };

  const handleStatusAdvance = async (): Promise<void> => {
    if (!job) return;
    const next = nextStatus(job.status);
    if (!next) return;

    setStatusUpdating(true);
    setSubmitError(null);

    try {
      await updateJobStatus(job.id, next);
      await refetch();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not update status. Try again.";
      setSubmitError(message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleRecordPayment = async (): Promise<void> => {
    if (!job || !paymentMethod) return;

    const amount = parseFloat(paymentAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      setSubmitError("Enter a valid payment amount.");
      return;
    }

    setPaymentLoading(true);
    setSubmitError(null);

    try {
      await recordPayment({
        job_id: job.id,
        amount,
        payment_method: paymentMethod,
      });
      setPaymentAmount("");
      setPaymentMethod(null);
      setPaymentMessage("Payment recorded ✓");
      await refetch();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not record payment. Try again.";
      setSubmitError(message);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? "Job not found."}</Text>
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

  const outstanding = job.total_amount - job.amount_paid;
  const isTailor = businessType === "tailor";
  const fabric = job.fabric_cost ?? 0;
  const other = job.other_costs ?? 0;
  const estProfit = job.total_amount - fabric - other;

  const initial = job.clients?.full_name?.trim().charAt(0).toUpperCase() ?? "?";
  const hasClientPhone = Boolean(client?.phone?.trim());
  const showInvoiceButton =
    Boolean(job.clients?.full_name?.trim()) && hasClientPhone;
  const next = nextStatus(job.status);
  const nextLabel = nextStatusLabel(job.status);
  const statusBorderColor =
    next != null ? JOB_STATUS_COLORS[next] : COLORS.primary;
  const showChipRow = showInvoiceButton;
  const showBankSetupHint =
    outstanding > 0 && !bankStatusLoading && !hasBankAccount;

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
        <Text numberOfLines={1} style={styles.headerTitle}>
          {job.title}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/(app)/clients/${job.client_id}`)}
        style={({ pressed }) => [styles.clientCard, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.clientAvatar,
            { backgroundColor: hexToRgba(COLORS.primary, 0.15) },
          ]}
        >
          <Text style={styles.clientAvatarText}>{initial}</Text>
        </View>
        <View style={styles.clientCardMiddle}>
          <Text style={styles.clientCardName}>
            {job.clients?.full_name ?? "Unknown client"}
          </Text>
        </View>
        <Ionicons color={COLORS.textMuted} name="chevron-forward" size={20} />
      </Pressable>

      {showChipRow ? (
        <ScrollView
          horizontal
          contentContainerStyle={styles.chipRowContent}
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
        >
          {showInvoiceButton ? (
            <Pressable
              accessibilityRole="button"
              disabled={isSendingInvoice || !businessName.trim()}
              onPress={() => {
                void handleSendInvoice();
              }}
              style={({ pressed }) => [
                styles.actionChip,
                (isSendingInvoice || !businessName.trim()) &&
                  styles.actionChipDisabled,
                pressed &&
                  !isSendingInvoice &&
                  businessName.trim() &&
                  styles.actionChipPressed,
              ]}
            >
              {isSendingInvoice ? (
                <ActivityIndicator color={COLORS.textMuted} size="small" />
              ) : (
                <Text style={styles.actionChipText}>📲 Invoice</Text>
              )}
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}

      <Text style={styles.sectionLabel}>Status</Text>
      <View style={styles.statusBlock}>
        <StatusBadge size="lg" status={job.status} />
      </View>

      <View style={styles.financeCard}>
        <View style={styles.financeRow}>
          <Text style={styles.financeLabel}>Total Amount</Text>
          <Text style={styles.financeValue}>
            {formatAmount(job.total_amount)}
          </Text>
        </View>
        <View style={styles.financeRow}>
          <Text style={styles.financeLabel}>Amount Paid</Text>
          <Text style={[styles.financeValue, styles.paidValue]}>
            {formatAmount(job.amount_paid)}
          </Text>
        </View>
        <View style={styles.financeRow}>
          <Text style={styles.financeLabel}>Outstanding</Text>
          <Text
            style={[
              styles.financeValue,
              outstanding > 0 ? styles.warningValue : styles.paidValue,
            ]}
          >
            {formatAmount(outstanding)}
          </Text>
        </View>
        <View style={styles.divider} />
        {isTailor ? (
          <>
            <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>Fabric Cost</Text>
              <Text style={styles.financeValue}>{formatAmount(fabric)}</Text>
            </View>
            <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>Other Costs</Text>
              <Text style={styles.financeValue}>{formatAmount(other)}</Text>
            </View>
            <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>Est. Profit</Text>
              <Text
                style={[
                  styles.financeValue,
                  estProfit >= 0 ? styles.paidValue : styles.errorValue,
                ]}
              >
                {formatAmount(estProfit)}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {showBankSetupHint ? (
        <Text style={styles.bankSetupHint}>
          Connect your bank account in Settings so it appears on invoices and
          clients can pay you directly.
        </Text>
      ) : null}

      {submitError ? (
        <Text style={styles.submitError}>{submitError}</Text>
      ) : null}

      {outstanding > 0 ? (
        <View style={styles.paymentSection}>
          <Text style={styles.sectionLabel}>Record Payment</Text>
          <TextInput
            keyboardType="decimal-pad"
            placeholder="Amount"
            placeholderTextColor={COLORS.textMuted}
            style={styles.paymentInput}
            value={paymentAmount}
            onChangeText={setPaymentAmount}
          />
          <View style={styles.methodRow}>
            {METHOD_OPTIONS.map((opt) => {
              const selected = paymentMethod === opt.value;

              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setPaymentMethod(opt.value)}
                  style={({ pressed }) => [
                    styles.methodChip,
                    selected
                      ? styles.methodChipSelected
                      : styles.methodChipIdle,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.methodChipText,
                      selected
                        ? styles.methodChipTextSelected
                        : styles.methodChipTextIdle,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Button
            disabled={!paymentMethod}
            isLoading={paymentLoading}
            label="Record Payment"
            onPress={handleRecordPayment}
          />
          {paymentMessage ? (
            <Text style={styles.successMessage}>{paymentMessage}</Text>
          ) : null}
        </View>
      ) : null}

      {jobItems.length > 0 ? (
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Items</Text>
          {jobItems.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <View style={styles.itemDivider} /> : null}
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} × {formatAmount(item.unit_price)}
                </Text>
                <Text style={styles.itemTotal}>
                  {formatAmount(item.quantity * item.unit_price)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {job.notes ? (
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesBody}>{job.notes}</Text>
        </View>
      ) : null}

      {next && nextLabel ? (
        <Button
          disabled={statusUpdating}
          isLoading={statusUpdating}
          label={nextLabel}
          style={
            StyleSheet.flatten([
              styles.statusCtaButton,
              { borderColor: statusBorderColor },
            ]) as ViewStyle
          }
          variant="outline"
          onPress={handleStatusAdvance}
        />
      ) : (
        <Text style={styles.jobCompletedText}>✓ Job Completed</Text>
      )}
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
  clientCard: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: SPACING.lg,
    padding: SPACING.md,
  },
  pressed: {
    opacity: 0.8,
  },
  clientAvatar: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  clientAvatarText: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.lg,
  },
  clientCardMiddle: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  clientCardName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
  chipRow: {
    marginBottom: SPACING.lg,
  },
  chipRowContent: {
    alignItems: "center",
    flexDirection: "row",
    paddingRight: SPACING.md,
  },
  actionChip: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: SPACING.xs,
    height: 36,
    justifyContent: "center",
    marginRight: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  actionChipDisabled: {
    opacity: 0.5,
  },
  actionChipPressed: {
    opacity: 0.8,
  },
  actionChipText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.sm,
  },
  bankSetupHint: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.sm,
  },
  statusBlock: {
    marginBottom: SPACING.lg,
  },
  statusCtaButton: {
    borderWidth: 1.5,
    height: 56,
    marginTop: SPACING.lg,
  },
  jobCompletedText: {
    color: COLORS.success,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.lg,
    textAlign: "center",
  },
  submitError: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
  },
  financeCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
  },
  financeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  financeLabel: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
  },
  financeValue: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
  paidValue: {
    color: COLORS.success,
  },
  warningValue: {
    color: COLORS.warning,
  },
  errorValue: {
    color: COLORS.error,
  },
  divider: {
    backgroundColor: COLORS.border,
    height: 1,
    marginVertical: SPACING.sm,
  },
  paymentSection: {
    marginBottom: SPACING.lg,
  },
  paymentInput: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.md,
    minHeight: 48,
    paddingHorizontal: SPACING.md,
  },
  methodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  methodChip: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  methodChipSelected: {
    backgroundColor: COLORS.primary,
  },
  methodChipIdle: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  chipPressed: {
    opacity: 0.85,
  },
  methodChipText: {
    fontSize: FONT_SIZE.sm,
  },
  methodChipTextSelected: {
    color: COLORS.background,
    fontFamily: FONTS.semibold,
  },
  methodChipTextIdle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  successMessage: {
    color: COLORS.success,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.sm,
  },
  itemsSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.sm,
  },
  itemDivider: {
    backgroundColor: COLORS.border,
    height: 1,
    marginVertical: SPACING.sm,
  },
  itemRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  itemName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.md,
    width: "100%",
  },
  itemMeta: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
  },
  itemTotal: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.sm,
  },
  notesSection: {
    marginBottom: SPACING.lg,
  },
  notesBody: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
  },
});
