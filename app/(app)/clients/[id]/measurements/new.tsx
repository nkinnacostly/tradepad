import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button } from "../../../../../components/ui/Button";
import { Input } from "../../../../../components/ui/Input";
import { ScreenWrapper } from "../../../../../components/ui/ScreenWrapper";
import {
  COLORS,
  FONTS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
} from "../../../../../constants";
import {
  createMeasurement,
  saveCustomFieldTemplate,
  useCustomFieldTemplates,
  useProfileUnitPreference,
} from "../../../../../hooks/useMeasurements";

const INPUT_BG = "#0D1526";
const INPUT_BORDER = "#1E293B";

interface CustomFieldRow {
  id: string;
  fieldName: string;
  value: string;
}

const parseOptionalNumber = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  const value = parseFloat(trimmed);
  if (Number.isNaN(value)) {
    return undefined;
  }
  return value;
};

export default function NewMeasurementScreen(): React.JSX.Element {
  const { id: clientId } = useLocalSearchParams<{ id: string }>();
  const { templates, isLoading: templatesLoading, refetch: refetchTemplates } =
    useCustomFieldTemplates();
  const { unitPreference, isLoading: prefsLoading } = useProfileUnitPreference();

  const [chest, setChest] = useState<string>("");
  const [waist, setWaist] = useState<string>("");
  const [hips, setHips] = useState<string>("");
  const [shoulder, setShoulder] = useState<string>("");
  const [sleeveLength, setSleeveLength] = useState<string>("");
  const [trouserLength, setTrouserLength] = useState<string>("");
  const [neck, setNeck] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [customRows, setCustomRows] = useState<CustomFieldRow[]>([]);
  const [showAddField, setShowAddField] = useState<boolean>(false);
  const [newFieldName, setNewFieldName] = useState<string>("");
  const [addFieldError, setAddFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isNotesFocused, setIsNotesFocused] = useState<boolean>(false);

  const nextExtraId = useRef<number>(0);

  const makeExtraRowId = (): string => {
    nextExtraId.current += 1;
    return `e:${nextExtraId.current}`;
  };

  useEffect(() => {
    if (templatesLoading) {
      return;
    }
    setCustomRows((previous) => {
      const byName = new Map(
        previous.map((row) => [row.fieldName, row] as const),
      );
      for (const name of templates) {
        if (!byName.has(name)) {
          byName.set(name, {
            id: `t:${name}`,
            fieldName: name,
            value: "",
          });
        }
      }
      return Array.from(byName.values());
    });
  }, [templates, templatesLoading]);

  const unitShort = prefsLoading
    ? "…"
    : unitPreference === "inches"
      ? "in"
      : "cm";

  const unitSubtitle = prefsLoading
    ? "Loading units…"
    : unitPreference === "inches"
      ? "Recording in inches"
      : "Recording in centimetres";

  const removeCustomRow = useCallback((rowId: string): void => {
    setCustomRows((rows) => rows.filter((row) => row.id !== rowId));
  }, []);

  const updateCustomValue = useCallback(
    (rowId: string, value: string): void => {
      setCustomRows((rows) =>
        rows.map((row) => (row.id === rowId ? { ...row, value } : row)),
      );
    },
    [],
  );

  const handleConfirmAddField = async (): Promise<void> => {
    setAddFieldError(null);
    const trimmed = newFieldName.trim();
    if (!trimmed) {
      setAddFieldError("Enter a field name.");
      return;
    }

    const duplicate = customRows.some(
      (row) => row.fieldName.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      setAddFieldError("That field is already added.");
      return;
    }

    try {
      await saveCustomFieldTemplate(trimmed);
      setCustomRows((rows) => [
        ...rows,
        { id: makeExtraRowId(), fieldName: trimmed, value: "" },
      ]);
      setNewFieldName("");
      setShowAddField(false);
      await refetchTemplates();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not save field. Please try again.";
      setAddFieldError(message);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!clientId) {
      setSubmitError("Missing client.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const customFieldsPayload: Record<string, string | number> = {};
      for (const row of customRows) {
        const trimmed = row.value.trim();
        if (!trimmed) {
          continue;
        }
        const parsed = parseOptionalNumber(trimmed);
        if (parsed !== undefined) {
          customFieldsPayload[row.fieldName] = parsed;
        }
      }

      await createMeasurement({
        client_id: clientId,
        chest: parseOptionalNumber(chest),
        waist: parseOptionalNumber(waist),
        hips: parseOptionalNumber(hips),
        shoulder: parseOptionalNumber(shoulder),
        sleeve_length: parseOptionalNumber(sleeveLength),
        trouser_length: parseOptionalNumber(trouserLength),
        neck: parseOptionalNumber(neck),
        notes: notes.trim() ? notes.trim() : undefined,
        custom_fields:
          Object.keys(customFieldsPayload).length > 0
            ? customFieldsPayload
            : undefined,
      });

      router.back();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>New Measurement</Text>
          <Text style={styles.subtitle}>{unitSubtitle}</Text>
        </View>
      </View>

      <Text style={styles.sectionHeading}>Standard Measurements</Text>

      <Input
        keyboardType="decimal-pad"
        label={`Chest (${unitShort})`}
        value={chest}
        onChangeText={setChest}
      />
      <Input
        keyboardType="decimal-pad"
        label={`Waist (${unitShort})`}
        value={waist}
        onChangeText={setWaist}
      />
      <Input
        keyboardType="decimal-pad"
        label={`Hips (${unitShort})`}
        value={hips}
        onChangeText={setHips}
      />
      <Input
        keyboardType="decimal-pad"
        label={`Shoulder (${unitShort})`}
        value={shoulder}
        onChangeText={setShoulder}
      />
      <Input
        keyboardType="decimal-pad"
        label={`Sleeve Length (${unitShort})`}
        value={sleeveLength}
        onChangeText={setSleeveLength}
      />
      <Input
        keyboardType="decimal-pad"
        label={`Trouser Length (${unitShort})`}
        value={trouserLength}
        onChangeText={setTrouserLength}
      />
      <Input
        keyboardType="decimal-pad"
        label={`Neck (${unitShort})`}
        value={neck}
        onChangeText={setNeck}
      />

      <Text style={[styles.sectionHeading, styles.customHeading]}>
        Custom Fields
      </Text>

      {customRows.map((row) => (
        <View key={row.id} style={styles.customRow}>
          <Text style={styles.customFieldName}>{row.fieldName}</Text>
          <TextInput
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={COLORS.textMuted}
            style={styles.customValueInput}
            value={row.value}
            onChangeText={(text) => {
              updateCustomValue(row.id, text);
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${row.fieldName}`}
            hitSlop={8}
            style={styles.deleteRowButton}
            onPress={() => {
              removeCustomRow(row.id);
            }}
          >
            <Ionicons
              color={COLORS.textMuted}
              name="close-circle"
              size={20}
            />
          </Pressable>
        </View>
      ))}

      <Button
        label="+ Add Custom Field"
        variant="outline"
        onPress={() => {
          setShowAddField(true);
          setAddFieldError(null);
        }}
      />

      {showAddField ? (
        <View style={styles.inlineAdd}>
          <TextInput
            placeholder="Field name e.g. Ankle"
            placeholderTextColor={COLORS.textMuted}
            style={styles.inlineAddInput}
            value={newFieldName}
            onChangeText={setNewFieldName}
          />
          <Pressable
            accessibilityRole="button"
            style={styles.inlineAddConfirm}
            onPress={() => {
              void handleConfirmAddField();
            }}
          >
            <Text style={styles.inlineAddConfirmText}>Add</Text>
          </Pressable>
        </View>
      ) : null}

      {addFieldError ? (
        <Text style={styles.inlineAddError}>{addFieldError}</Text>
      ) : null}

      <View style={styles.notesWrapper}>
        <Text style={styles.notesLabel}>NOTES</Text>
        <TextInput
          multiline
          placeholder="Add notes for this measurement set…"
          placeholderTextColor={COLORS.textMuted}
          returnKeyType="done"
          style={[
            styles.notesInput,
            isNotesFocused && styles.notesInputFocused,
          ]}
          textAlignVertical="top"
          value={notes}
          onBlur={() => {
            setIsNotesFocused(false);
          }}
          onChangeText={setNotes}
          onFocus={() => {
            setIsNotesFocused(true);
          }}
        />
      </View>

      {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

      <Button
        isLoading={isSubmitting}
        label="Save Measurements"
        onPress={() => {
          void handleSubmit();
        }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "flex-start",
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
  headerTextBlock: {
    flex: 1,
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.xl,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  sectionHeading: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.sm,
  },
  customHeading: {
    marginTop: SPACING.lg,
  },
  customRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: SPACING.md,
  },
  customFieldName: {
    color: COLORS.textSecondary,
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZE.sm,
    marginRight: SPACING.sm,
  },
  customValueInput: {
    backgroundColor: INPUT_BG,
    borderColor: INPUT_BORDER,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    height: 48,
    marginRight: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  deleteRowButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  inlineAdd: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  inlineAddInput: {
    backgroundColor: INPUT_BG,
    borderColor: INPUT_BORDER,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    height: 48,
    paddingHorizontal: SPACING.md,
  },
  inlineAddConfirm: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: SPACING.md,
  },
  inlineAddConfirmText: {
    color: COLORS.background,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.sm,
  },
  inlineAddError: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  notesWrapper: {
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  notesLabel: {
    color: COLORS.textMuted,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  notesInput: {
    backgroundColor: INPUT_BG,
    borderColor: INPUT_BORDER,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
    height: 100,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingVertical: SPACING.sm + 4,
  },
  notesInputFocused: {
    borderColor: INPUT_BORDER,
    borderLeftColor: COLORS.primary,
    borderLeftWidth: 3,
  },
  submitError: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
  },
});
