import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Button } from "../../../components/ui/Button";
import { DatePicker } from "../../../components/ui/DatePicker";
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
import { useClients } from "../../../hooks/useClients";
import {
  createJob,
  createJobItems,
  useProfileBusinessType,
} from "../../../hooks/useJobs";
import type { Client } from "../../../types";

const INPUT_BG = "#0D1526";
const INPUT_BORDER = "#1E293B";

const schema = z.object({
  title: z.string().min(2, "Job title must be at least 2 characters"),
  description: z.string().optional(),
  due_date: z.string().optional(),
  total_amount: z
    .string()
    .min(1, "Enter the total amount")
    .refine(
      (val) => !Number.isNaN(Number(val)) && Number(val) > 0,
      "Enter a valid amount",
    ),
  fabric_cost: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val || val === "" || (!Number.isNaN(Number(val)) && Number(val) >= 0),
      "Enter a valid amount",
    ),
  other_costs: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val || val === "" || (!Number.isNaN(Number(val)) && Number(val) >= 0),
      "Enter a valid amount",
    ),
  notes: z.string().max(500, "Notes must be under 500 characters").optional(),
});

type NewJobFormData = z.infer<typeof schema>;

interface LaundryItemRow {
  localId: string;
  name: string;
  quantity: string;
  unit_price: string;
}

const newLocalId = (): string => `${Date.now()}-${Math.random()}`;

const formatNumberInput = (raw: string): string => {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-NG");
};

const parseFormattedNumber = (formatted: string): number => {
  const digits = formatted.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
};

export default function NewJobScreen(): React.JSX.Element {
  const { clientId } = useLocalSearchParams<{ clientId?: string }>();
  const { clients, isLoading: clientsLoading } = useClients();
  const { businessType, isLoading: profileLoading } = useProfileBusinessType();

  const [step, setStep] = useState<1 | 2>(clientId ? 2 : 1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [laundryItems, setLaundryItems] = useState<LaundryItemRow[]>([]);
  const [isNotesFocused, setIsNotesFocused] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NewJobFormData>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: {
      title: "",
      description: "",
      due_date: "",
      total_amount: "",
      fabric_cost: "",
      other_costs: "",
      notes: "",
    },
  });

  const totalAmountWatch = useWatch({ control, name: "total_amount" });
  const fabricWatch = useWatch({ control, name: "fabric_cost" });
  const otherWatch = useWatch({ control, name: "other_costs" });

  const isTailor = businessType === "tailor";
  const isLaundry = businessType === "laundry";

  useEffect(() => {
    if (!clientId || clientsLoading) return;
    const match = clients.find((c) => c.id === clientId);
    if (match) {
      setSelectedClient(match);
      setStep(2);
    } else {
      setStep(1);
    }
  }, [clientId, clients, clientsLoading]);

  const filteredClients = useMemo((): Client[] => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    );
  }, [clients, clientSearch]);

  useEffect(() => {
    if (!isLaundry) return;

    const sum = laundryItems.reduce((acc, row) => {
      const q = parseFloat(row.quantity) || 0;
      const p = parseFormattedNumber(row.unit_price);
      return acc + q * p;
    }, 0);

    setValue("total_amount", sum > 0 ? String(sum) : "", {
      shouldValidate: true,
    });
  }, [isLaundry, laundryItems, setValue]);

  const profit = useMemo((): number => {
    const total = parseFloat(totalAmountWatch || "0") || 0;
    const fabric = parseFloat(fabricWatch || "0") || 0;
    const other = parseFloat(otherWatch || "0") || 0;
    return total - fabric - other;
  }, [totalAmountWatch, fabricWatch, otherWatch]);

  const profitColor = (): string => {
    if (profit > 0) return COLORS.success;
    if (profit < 0) return COLORS.error;
    return COLORS.textMuted;
  };

  const addLaundryItem = (): void => {
    setLaundryItems((current) => [
      ...current,
      { localId: newLocalId(), name: "", quantity: "1", unit_price: "" },
    ]);
  };

  const removeLaundryItem = (localId: string): void => {
    setLaundryItems((current) => current.filter((r) => r.localId !== localId));
  };

  const updateLaundryItem = (
    localId: string,
    field: keyof Pick<LaundryItemRow, "name" | "quantity" | "unit_price">,
    value: string,
  ): void => {
    setLaundryItems((current) =>
      current.map((row) =>
        row.localId === localId ? { ...row, [field]: value } : row,
      ),
    );
  };

  const onSubmit = async (data: NewJobFormData): Promise<void> => {
    if (!selectedClient) {
      setSubmitError("Select a client first.");
      return;
    }

    setSubmitError(null);

    try {
      const total = parseFloat(data.total_amount);
      const fabric = isTailor ? parseFloat(data.fabric_cost || "0") || 0 : 0;
      const other = parseFloat(data.other_costs || "0") || 0;

      const job = await createJob({
        client_id: selectedClient.id,
        title: data.title,
        description: data.description,
        due_date: data.due_date,
        total_amount: total,
        fabric_cost: fabric,
        other_costs: other,
        notes: data.notes,
      });

      if (isLaundry && laundryItems.length > 0) {
        const validItems = laundryItems.filter(
          (row) => row.name.trim().length > 0,
        );
        if (validItems.length > 0) {
          await createJobItems(
            validItems.map((row) => ({
              job_id: job.id,
              name: row.name.trim(),
              quantity: parseFloat(row.quantity) || 0,
              unit_price: parseFormattedNumber(row.unit_price),
            })),
          );
        }
      }

      router.back();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      setSubmitError(message);
    }
  };

  if (
    step === 2 &&
    (profileLoading || (Boolean(clientId) && clientsLoading && !selectedClient))
  ) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (step === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.stepHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons color={COLORS.textPrimary} name="arrow-back" size={24} />
          </Pressable>
          <Text style={styles.stepTitle}>Choose client</Text>
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
            value={clientSearch}
            onChangeText={setClientSearch}
          />
        </View>

        <FlatList
          contentContainerStyle={styles.clientListContent}
          data={filteredClients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const selected = selectedClient?.id === item.id;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSelectedClient(item)}
                style={({ pressed }) => [
                  styles.clientRow,
                  selected && styles.clientRowSelected,
                  pressed && styles.clientRowPressed,
                ]}
              >
                <View style={styles.clientRowText}>
                  <Text style={styles.clientRowName}>{item.full_name}</Text>
                  <Text style={styles.clientRowPhone}>
                    {item.phone.trim() ? item.phone : "No phone"}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />

        <View style={styles.stepFooter}>
          <Button
            disabled={!selectedClient}
            label="Next"
            onPress={() => setStep(2)}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScreenWrapper decorative={false}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => {
            if (clientId) {
              router.back();
            } else {
              setStep(1);
            }
          }}
          style={styles.backButton}
        >
          <Ionicons color={COLORS.textPrimary} name="arrow-back" size={24} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.title}>New Job</Text>
          {selectedClient ? (
            <Text style={styles.clientSubtitle}>
              {selectedClient.full_name}
            </Text>
          ) : null}
        </View>
      </View>

      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            autoCapitalize="sentences"
            error={errors.title?.message}
            label="Job title"
            returnKeyType="next"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
          />
        )}
      />

      <View style={styles.notesWrapper}>
        <Text style={styles.notesLabel}>DESCRIPTION</Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              multiline
              placeholder="Optional details…"
              placeholderTextColor={COLORS.textMuted}
              style={styles.multiline}
              textAlignVertical="top"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
            />
          )}
        />
      </View>

      <Controller
        control={control}
        name="due_date"
        render={({ field: { onChange, value } }) => (
          <DatePicker
            error={errors.due_date?.message}
            label="Due date"
            placeholder="Select a due date"
            value={value ?? ""}
            onChange={onChange}
          />
        )}
      />

      {isTailor ? (
        <>
          <Controller
            control={control}
            name="fabric_cost"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                error={errors.fabric_cost?.message}
                keyboardType="decimal-pad"
                label="Fabric cost"
                placeholder="0"
                returnKeyType="next"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="other_costs"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                error={errors.other_costs?.message}
                keyboardType="decimal-pad"
                label="Other costs"
                placeholder="0"
                returnKeyType="next"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
              />
            )}
          />

          <View style={styles.profitCard}>
            <Text style={styles.profitTitle}>Estimated Profit</Text>
            <Text style={[styles.profitValue, { color: profitColor() }]}>
              ₦{profit.toLocaleString("en-NG")}
            </Text>
          </View>
        </>
      ) : null}

      {isLaundry ? (
        <View style={styles.itemsSection}>
          <Text style={styles.itemsTitle}>Items</Text>
          {laundryItems.map((row) => (
            <View key={row.localId} style={styles.itemRow}>
              <TextInput
                placeholder="Item name"
                placeholderTextColor={COLORS.textMuted}
                style={styles.itemName}
                value={row.name}
                onChangeText={(v) => updateLaundryItem(row.localId, "name", v)}
              />
              <TextInput
                keyboardType="number-pad"
                style={styles.itemQty}
                value={row.quantity}
                onChangeText={(v) =>
                  updateLaundryItem(row.localId, "quantity", v)
                }
              />
              <TextInput
                keyboardType="number-pad"
                placeholder="Price"
                placeholderTextColor={COLORS.textMuted}
                style={styles.itemPrice}
                value={formatNumberInput(row.unit_price)}
                onChangeText={(v) => {
                  const digits = v.replace(/[^0-9]/g, "");
                  updateLaundryItem(row.localId, "unit_price", digits);
                }}
              />
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => removeLaundryItem(row.localId)}
                style={styles.trashButton}
              >
                <Ionicons color={COLORS.error} name="trash-outline" size={22} />
              </Pressable>
            </View>
          ))}
          <Button
            label="+ Add Item"
            style={styles.addItemButton}
            variant="outline"
            onPress={addLaundryItem}
          />
        </View>
      ) : null}

      <Text style={styles.amountLabel}>TOTAL AMOUNT</Text>
      <View style={styles.amountRow}>
        <Text style={styles.currencyPrefix}>₦</Text>
        <Controller
          control={control}
          name="total_amount"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              editable={!isLaundry}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              style={[
                styles.amountInput,
                isLaundry && styles.amountInputDisabled,
              ]}
              value={isLaundry ? formatNumberInput(value) : value}
              onBlur={onBlur}
              onChangeText={onChange}
            />
          )}
        />
      </View>
      {!isLaundry && errors.total_amount?.message ? (
        <Text style={styles.fieldError}>{errors.total_amount.message}</Text>
      ) : null}

      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.notesWrapper}>
            <Text style={styles.notesLabel}>NOTES</Text>
            <TextInput
              multiline
              placeholder="Optional notes…"
              placeholderTextColor={COLORS.textMuted}
              style={[
                styles.multiline,
                isNotesFocused && styles.multilineFocused,
                errors.notes ? styles.multilineError : null,
              ]}
              textAlignVertical="top"
              value={value}
              onBlur={(e) => {
                setIsNotesFocused(false);
                onBlur();
              }}
              onChangeText={onChange}
              onFocus={() => setIsNotesFocused(true)}
            />
            {errors.notes?.message ? (
              <Text style={styles.fieldError}>{errors.notes.message}</Text>
            ) : null}
          </View>
        )}
      />

      {submitError ? (
        <Text style={styles.submitError}>{submitError}</Text>
      ) : null}

      <Button
        isLoading={isSubmitting}
        label="Save Job"
        onPress={handleSubmit(onSubmit)}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center",
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
  },
  safe: {
    backgroundColor: COLORS.background,
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  stepHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: SPACING.md,
  },
  stepTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.xl,
    marginLeft: SPACING.xs,
  },
  searchContainer: {
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderColor: INPUT_BORDER,
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
  clientListContent: {
    paddingBottom: 120,
  },
  clientRow: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  clientRowSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  clientRowPressed: {
    opacity: 0.85,
  },
  clientRowText: {
    flex: 1,
  },
  clientRowName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
  clientRowPhone: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },
  stepFooter: {
    bottom: 100,
    left: SPACING.md,
    position: "absolute",
    right: SPACING.md,
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
  headerTitles: {
    flex: 1,
    marginLeft: SPACING.xs,
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.xl,
  },
  clientSubtitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  notesWrapper: {
    marginBottom: SPACING.md,
  },
  notesLabel: {
    color: COLORS.textMuted,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  multiline: {
    backgroundColor: INPUT_BG,
    borderColor: INPUT_BORDER,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    minHeight: 80,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingVertical: SPACING.sm + 4,
  },
  multilineFocused: {
    borderLeftColor: COLORS.primary,
    borderLeftWidth: 3,
  },
  multilineError: {
    borderColor: COLORS.error,
  },
  amountLabel: {
    color: COLORS.textMuted,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  amountRow: {
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderColor: INPUT_BORDER,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: SPACING.xs,
    minHeight: 56,
    paddingHorizontal: SPACING.md,
  },
  currencyPrefix: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.lg,
    marginRight: SPACING.xs,
  },
  amountInput: {
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    minHeight: 48,
    paddingVertical: SPACING.sm,
  },
  amountInputDisabled: {
    color: COLORS.textMuted,
  },
  fieldError: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
  },
  profitCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  profitTitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.sm,
  },
  profitValue: {
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.xl,
    marginTop: SPACING.xs,
  },
  itemsSection: {
    marginBottom: SPACING.md,
  },
  itemsTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.sm,
  },
  itemRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  itemName: {
    backgroundColor: INPUT_BG,
    borderColor: INPUT_BORDER,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    minHeight: 44,
    paddingHorizontal: SPACING.sm,
  },
  itemQty: {
    backgroundColor: INPUT_BG,
    borderColor: INPUT_BORDER,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    minHeight: 44,
    textAlign: "center",
    width: 60,
  },
  itemPrice: {
    backgroundColor: INPUT_BG,
    borderColor: INPUT_BORDER,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    minHeight: 44,
    paddingHorizontal: SPACING.sm,
    width: 88,
  },
  trashButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  addItemButton: {
    marginTop: SPACING.xs,
  },
  submitError: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
  },
});
