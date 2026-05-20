import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";

import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import {
  COLORS,
  FONTS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
} from "../../../constants";
import {
  resolveAccountName,
  setupBankAccount,
} from "../../../hooks/usePaymentLink";

const INPUT_BG = "#0D1526";
const INPUT_BORDER = "#1E293B";

const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044" },
  { name: "First Bank", code: "011" },
  { name: "GTBank", code: "058" },
  { name: "UBA", code: "033" },
  { name: "Zenith Bank", code: "057" },
  { name: "Fidelity Bank", code: "070" },
  { name: "Union Bank", code: "032" },
  { name: "Sterling Bank", code: "232" },
  { name: "Stanbic IBTC", code: "221" },
  { name: "FCMB", code: "214" },
  { name: "Wema Bank", code: "035" },
  { name: "Polaris Bank", code: "076" },
  { name: "Keystone Bank", code: "082" },
  { name: "Ecobank", code: "050" },
  { name: "Heritage Bank", code: "030" },
  { name: "Jaiz Bank", code: "301" },
  { name: "Opay", code: "999992" },
  { name: "Palmpay", code: "999991" },
  { name: "Kuda Bank", code: "090267" },
  { name: "Moniepoint", code: "090405" },
] as const;

const schema = z.object({
  bank_name: z.string().min(1, "Select a bank"),
  bank_code: z.string().min(1, "Select a bank"),
  bank_account_number: z
    .string()
    .min(10, "Enter a valid account number")
    .max(10, "Account number must be 10 digits"),
  business_mobile: z.string().min(10, "Enter a valid phone number"),
});

type BankAccountFormData = z.infer<typeof schema>;

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const SUCCESS_BG = hexToRgba(COLORS.success, 0.1);
const SUCCESS_BORDER = hexToRgba(COLORS.success, 0.3);

export default function BankAccountScreen(): React.JSX.Element {
  const [bankModalVisible, setBankModalVisible] = useState<boolean>(false);
  const [bankSearch, setBankSearch] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resolvedAccountName, setResolvedAccountName] = useState<string | null>(
    null,
  );
  const [isResolvingAccount, setIsResolvingAccount] = useState<boolean>(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BankAccountFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bank_name: "",
      bank_code: "",
      bank_account_number: "",
      business_mobile: "",
    },
  });

  const selectedBankName = watch("bank_name");
  const selectedBankCode = watch("bank_code");
  const accountNumberValue = watch("bank_account_number");
  const bankCodeValue = watch("bank_code");

  const filteredBanks = useMemo(() => {
    const query = bankSearch.trim().toLowerCase();
    if (!query) {
      return [...NIGERIAN_BANKS];
    }
    return NIGERIAN_BANKS.filter((bank) =>
      bank.name.toLowerCase().includes(query),
    );
  }, [bankSearch]);

  const canVerify =
    accountNumberValue.length === 10 && bankCodeValue.length > 0;
  const showVerifyButton = canVerify && resolvedAccountName === null;

  useEffect(() => {
    setResolvedAccountName(null);
    setResolveError(null);
  }, [bankCodeValue, accountNumberValue]);

  const openBankModal = (): void => {
    setBankSearch("");
    setBankModalVisible(true);
  };

  const closeBankModal = (): void => {
    setBankModalVisible(false);
  };

  const selectBank = (name: string, code: string): void => {
    setValue("bank_name", name, { shouldValidate: true });
    setValue("bank_code", code, { shouldValidate: true });
    closeBankModal();
  };

  const handleVerifyAccount = async (): Promise<void> => {
    setResolveError(null);
    setResolvedAccountName(null);
    setIsResolvingAccount(true);

    try {
      const name = await resolveAccountName({
        account_number: accountNumberValue,
        account_bank: bankCodeValue,
      });
      setResolvedAccountName(name);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not verify account";
      setResolveError(message);
    } finally {
      setIsResolvingAccount(false);
    }
  };

  const onSubmit = async (data: BankAccountFormData): Promise<void> => {
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      await setupBankAccount({
        bank_account_number: data.bank_account_number,
        bank_name: data.bank_name,
        bank_code: data.bank_code,
        business_mobile: data.business_mobile,
      });
      setSuccessMessage("Bank account connected successfully.");
      setTimeout(() => {
        router.back();
      }, 1200);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      setSubmitError(message);
    }
  };

  const bankFieldError = errors.bank_name?.message ?? errors.bank_code?.message;

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
        <Text style={styles.title}>Bank Account</Text>
      </View>

      <View style={styles.introCard}>
        <Ionicons
          color={COLORS.success}
          name="shield-checkmark-outline"
          size={32}
          style={styles.introIcon}
        />
        <Text style={styles.introTitle}>Secure Payments</Text>
        <Text style={styles.introBody}>
          Your clients pay directly into your bank account. Tradepad takes 1.5%
          per transaction.
        </Text>
      </View>

      <View style={styles.bankFieldWrapper}>
        <Text style={styles.bankFieldLabel}>BANK</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select your bank"
          onPress={openBankModal}
          style={({ pressed }) => [
            styles.bankFieldRow,
            bankFieldError ? styles.bankFieldRowError : null,
            pressed && styles.bankFieldPressed,
          ]}
        >
          <Text
            style={[
              styles.bankFieldText,
              !selectedBankName ? styles.bankFieldPlaceholder : null,
            ]}
          >
            {selectedBankName || "Select your bank"}
          </Text>
          <Ionicons color={COLORS.textMuted} name="chevron-down" size={18} />
        </Pressable>
        {bankFieldError ? (
          <Text style={styles.bankFieldErrorText}>{bankFieldError}</Text>
        ) : null}
      </View>

      <Controller
        control={control}
        name="bank_account_number"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            error={errors.bank_account_number?.message}
            keyboardType="number-pad"
            label="Account Number"
            maxLength={10}
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
          />
        )}
      />

      <Controller
        control={control}
        name="business_mobile"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            error={errors.business_mobile?.message}
            keyboardType="phone-pad"
            label="Phone Number (linked to bank)"
            placeholder="08012345678"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
          />
        )}
      />

      {showVerifyButton ? (
        <Button
          isLoading={isResolvingAccount}
          label="Verify Account"
          style={styles.verifyButton}
          variant="outline"
          onPress={() => {
            void handleVerifyAccount();
          }}
        />
      ) : null}

      {resolvedAccountName ? (
        <View
          style={[
            styles.verifiedCard,
            {
              backgroundColor: SUCCESS_BG,
              borderColor: SUCCESS_BORDER,
            },
          ]}
        >
          <View style={styles.verifiedHeaderRow}>
            <Ionicons
              color={COLORS.success}
              name="checkmark-circle"
              size={20}
            />
            <Text style={styles.verifiedLabel}>Account Verified</Text>
          </View>
          <Text style={styles.verifiedName}>{resolvedAccountName}</Text>
          <Text style={styles.verifiedBank}>{selectedBankName}</Text>
        </View>
      ) : null}

      {resolveError ? (
        <Text style={styles.resolveError}>{resolveError}</Text>
      ) : null}

      {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
      {successMessage ? (
        <Text style={styles.successMessage}>{successMessage}</Text>
      ) : null}

      <Button
        disabled={resolvedAccountName === null || isSubmitting}
        isLoading={isSubmitting}
        label="Connect Bank Account"
        onPress={handleSubmit(onSubmit)}
      />

      <Modal
        animationType="slide"
        transparent
        visible={bankModalVisible}
        onRequestClose={closeBankModal}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            style={styles.backdrop}
            onPress={closeBankModal}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable
                accessibilityRole="button"
                hitSlop={12}
                onPress={closeBankModal}
                style={styles.headerButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>Select Bank</Text>
              <View style={styles.headerButton} />
            </View>

            <TextInput
              placeholder="Search banks..."
              placeholderTextColor={COLORS.textMuted}
              style={styles.searchInput}
              value={bankSearch}
              onChangeText={setBankSearch}
            />

            <FlatList
              data={filteredBanks}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item.code === selectedBankCode;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      selectBank(item.name, item.code);
                    }}
                    style={({ pressed }) => [
                      styles.bankListRow,
                      selected && styles.bankListRowSelected,
                      pressed && styles.bankListRowPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bankListName,
                        selected && styles.bankListNameSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                );
              }}
              showsVerticalScrollIndicator={false}
              style={styles.bankList}
            />
          </View>
        </View>
      </Modal>
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
  introCard: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
  },
  introIcon: {
    marginBottom: SPACING.sm,
  },
  introTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.lg,
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  introBody: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    textAlign: "center",
  },
  bankFieldWrapper: {
    marginBottom: SPACING.md,
  },
  bankFieldLabel: {
    color: COLORS.textMuted,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  bankFieldRow: {
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderColor: INPUT_BORDER,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
  },
  bankFieldRowError: {
    borderColor: COLORS.error,
  },
  bankFieldPressed: {
    opacity: 0.9,
  },
  bankFieldText: {
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
  },
  bankFieldPlaceholder: {
    color: COLORS.textMuted,
  },
  bankFieldErrorText: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  verifyButton: {
    marginBottom: SPACING.md,
  },
  verifiedCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  verifiedHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  verifiedLabel: {
    color: COLORS.success,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.sm,
  },
  verifiedName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.lg,
    marginBottom: SPACING.xs,
  },
  verifiedBank: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
  },
  resolveError: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
  },
  submitError: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
  },
  successMessage: {
    color: COLORS.success,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  headerButton: {
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
  },
  cancelText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
  },
  sheetTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.lg,
  },
  searchInput: {
    backgroundColor: INPUT_BG,
    borderColor: INPUT_BORDER,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    height: 48,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  bankList: {
    maxHeight: 320,
  },
  bankListRow: {
    borderColor: "transparent",
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    marginBottom: SPACING.xs,
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  bankListRowSelected: {
    borderColor: COLORS.primary,
  },
  bankListRowPressed: {
    opacity: 0.9,
  },
  bankListName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
  },
  bankListNameSelected: {
    color: COLORS.primary,
    fontFamily: FONTS.semibold,
  },
});
