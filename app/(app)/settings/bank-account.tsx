import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
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
  fetchBankList,
  removeBankAccount,
  resolveAccountName,
  setupBankAccount,
  useBankAccountDetails,
  type BankAccountDetails,
  type FlutterwaveBank,
} from "../../../hooks/usePaymentLink";

const INPUT_BG = "#0D1526";
const INPUT_BORDER = "#1E293B";

const schema = z.object({
  bank_name: z.string().min(1, "Select a bank"),
  bank_code: z.string().min(1, "Select a bank"),
  bank_account_number: z
    .string()
    .min(10, "Enter a valid account number")
    .max(10, "Account number must be 10 digits"),
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

const maskAccountNumber = (account: string): string => {
  const digits = account.replace(/\D/g, "");
  if (digits.length < 5) {
    return account;
  }
  const first = digits.slice(0, 3);
  const last = digits.slice(-2);
  return `${first}*******${last}`;
};

interface BankAccountSetupFormProps {
  onConnected: () => Promise<void>;
}

const BankAccountSetupForm = ({
  onConnected,
}: BankAccountSetupFormProps): React.JSX.Element => {
  const [bankModalVisible, setBankModalVisible] = useState<boolean>(false);
  const [bankSearch, setBankSearch] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resolvedAccountName, setResolvedAccountName] = useState<string | null>(
    null,
  );
  const [isResolvingAccount, setIsResolvingAccount] = useState<boolean>(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [banks, setBanks] = useState<FlutterwaveBank[]>([]);
  const [isFetchingBanks, setIsFetchingBanks] = useState<boolean>(true);
  const [fetchBanksError, setFetchBanksError] = useState<string | null>(null);

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
    },
  });

  const selectedBankName = watch("bank_name");
  const selectedBankCode = watch("bank_code");
  const accountNumberValue = watch("bank_account_number");
  const bankCodeValue = watch("bank_code");

  useEffect(() => {
    const loadBanks = async (): Promise<void> => {
      setIsFetchingBanks(true);
      setFetchBanksError(null);

      try {
        const list = await fetchBankList();
        setBanks(list);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not load banks";
        setFetchBanksError(message);
      } finally {
        setIsFetchingBanks(false);
      }
    };

    void loadBanks();
  }, []);

  const filteredBanks = useMemo(() => {
    const query = bankSearch.trim().toLowerCase();
    if (!query) {
      return banks;
    }
    return banks.filter((bank) =>
      bank.name.toLowerCase().includes(query),
    );
  }, [bankSearch, banks]);

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

    if (!resolvedAccountName) {
      setSubmitError("Verify your account before connecting.");
      return;
    }

    try {
      await setupBankAccount({
        bank_account_number: data.bank_account_number,
        bank_name: data.bank_name,
        bank_code: data.bank_code,
        bank_account_name: resolvedAccountName,
      });
      setSuccessMessage("Bank account connected successfully.");
      await onConnected();
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
    <>
      <View style={styles.introCard}>
        <Ionicons
          color={COLORS.success}
          name="shield-checkmark-outline"
          size={32}
          style={styles.introIcon}
        />
        <Text style={styles.introTitle}>Get Paid Instantly</Text>
        <Text style={styles.introBody}>
          Your bank details are added to every invoice so clients transfer
          straight to you. The money never passes through Tradepad — you get it
          instantly, with nothing deducted.
        </Text>
      </View>

      <View style={styles.bankFieldWrapper}>
        <Text style={styles.bankFieldLabel}>BANK</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select your bank"
          disabled={isFetchingBanks}
          onPress={openBankModal}
          style={({ pressed }) => [
            styles.bankFieldRow,
            bankFieldError ? styles.bankFieldRowError : null,
            isFetchingBanks && styles.bankFieldDisabled,
            pressed && !isFetchingBanks && styles.bankFieldPressed,
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

            {isFetchingBanks ? (
              <View style={styles.bankListState}>
                <ActivityIndicator color={COLORS.primary} size="large" />
              </View>
            ) : null}

            {fetchBanksError ? (
              <Text style={styles.bankListError}>{fetchBanksError}</Text>
            ) : null}

            {!isFetchingBanks && !fetchBanksError ? (
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
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
};

interface ConnectedBankAccountProps {
  details: BankAccountDetails;
  onRemoved: () => Promise<void>;
}

const ConnectedBankAccount = ({
  details,
  onRemoved,
}: ConnectedBankAccountProps): React.JSX.Element => {
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const accountNumber = details.bank_account_number ?? "";
  const maskedAccount = maskAccountNumber(accountNumber);
  const bankName = details.bank_name ?? "Bank";
  const accountName = details.bank_account_name ?? "";

  const handleRemovePress = (): void => {
    if (!accountNumber) {
      return;
    }

    Alert.alert(
      "Remove Bank Account",
      "This will remove your bank details from new invoices. Clients won't see where to pay until you reconnect an account.",
      [
        { style: "cancel", text: "Cancel" },
        {
          style: "destructive",
          text: "Remove",
          onPress: () => {
            void (async (): Promise<void> => {
              setIsRemoving(true);
              setRemoveError(null);

              try {
                await removeBankAccount();
                await onRemoved();
              } catch (err) {
                const message =
                  err instanceof Error
                    ? err.message
                    : "Could not remove bank account.";
                setRemoveError(message);
              } finally {
                setIsRemoving(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <>
      <View
        style={[
          styles.connectedCard,
          {
            backgroundColor: SUCCESS_BG,
            borderColor: SUCCESS_BORDER,
          },
        ]}
      >
        <View style={styles.connectedCardHeader}>
          <Ionicons color={COLORS.success} name="card-outline" size={24} />
          <View style={styles.connectedBadge}>
            <Text style={styles.connectedBadgeText}>Connected ✓</Text>
          </View>
        </View>
        {accountName ? (
          <Text style={styles.connectedAccountName}>{accountName}</Text>
        ) : null}
        <Text style={styles.connectedBankName}>{bankName}</Text>
        <Text style={styles.connectedAccountNumber}>{maskedAccount}</Text>
      </View>

      {removeError ? (
        <Text style={styles.removeError}>{removeError}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={isRemoving}
        onPress={handleRemovePress}
        style={({ pressed }) => [
          styles.removeButton,
          isRemoving && styles.removeButtonDisabled,
          pressed && !isRemoving && styles.removeButtonPressed,
        ]}
      >
        {isRemoving ? (
          <ActivityIndicator color={COLORS.error} size="small" />
        ) : (
          <Text style={styles.removeButtonText}>Remove Bank Account</Text>
        )}
      </Pressable>

      <Text style={styles.reconnectNote}>
        To connect a different account, remove this one first.
      </Text>
    </>
  );
};

export default function BankAccountScreen(): React.JSX.Element {
  const { details, isLoading, error, refetch } = useBankAccountDetails();

  const isConnected = Boolean(details?.bank_account_number);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

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

      {error ? (
        <View style={styles.errorBlock}>
          <Text style={styles.errorBlockText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backLink}
          >
            <Text style={styles.backLinkText}>Go back</Text>
          </Pressable>
        </View>
      ) : null}

      {!error && isConnected && details ? (
        <ConnectedBankAccount details={details} onRemoved={refetch} />
      ) : null}

      {!error && !isConnected ? (
        <BankAccountSetupForm onConnected={refetch} />
      ) : null}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center",
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
    marginRight: SPACING.sm,
    width: 44,
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.xl,
  },
  errorBlock: {
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  errorBlockText: {
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
  connectedCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  connectedCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  connectedBadge: {
    backgroundColor: hexToRgba(COLORS.success, 0.15),
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  connectedBadgeText: {
    color: COLORS.success,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.sm,
  },
  connectedAccountName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.lg,
    marginBottom: SPACING.xs,
  },
  connectedBankName: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.xs,
  },
  connectedAccountNumber: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
  },
  removeError: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
  },
  removeButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: COLORS.error,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    height: 56,
    justifyContent: "center",
    width: "100%",
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  removeButtonPressed: {
    opacity: 0.85,
  },
  removeButtonText: {
    color: COLORS.error,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  reconnectNote: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.md,
    textAlign: "center",
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
  bankFieldDisabled: {
    opacity: 0.5,
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
  bankListState: {
    alignItems: "center",
    justifyContent: "center",
    maxHeight: 320,
    minHeight: 120,
    paddingVertical: SPACING.xl,
  },
  bankListError: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
    textAlign: "center",
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
