import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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
import { createClient } from "../../../hooks/useClients";

const INPUT_BG = "#0D1526";
const INPUT_BORDER = "#1E293B";

const schema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .refine(
      (val) => val === "" || val.replace(/\D/g, "").length >= 10,
      "Enter a valid phone number",
    ),
  notes: z.string().max(500, "Notes must be under 500 characters").optional(),
});

type NewClientFormData = z.infer<typeof schema>;

export default function NewClientScreen(): React.JSX.Element {
  const phoneRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isNotesFocused, setIsNotesFocused] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewClientFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      phone: "",
      notes: "",
    },
  });

  const onSubmit = async (data: NewClientFormData): Promise<void> => {
    if (isSubmitting) return;
    setSubmitError(null);

    try {
      await createClient({
        full_name: data.full_name,
        phone: data.phone,
        notes: data.notes,
      });
      // router.back();
      router.replace("/(app)/clients");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      setSubmitError(message);
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
        <Text style={styles.title}>New Client</Text>
      </View>

      <Controller
        control={control}
        name="full_name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            autoCapitalize="words"
            autoComplete="name"
            error={errors.full_name?.message}
            label="Full name"
            returnKeyType="next"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            onSubmitEditing={() => phoneRef.current?.focus()}
          />
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            ref={phoneRef}
            autoComplete="tel"
            error={errors.phone?.message}
            keyboardType="phone-pad"
            label="Phone number"
            placeholder="08012345678"
            returnKeyType="next"
            textContentType="telephoneNumber"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            onSubmitEditing={() => notesRef.current?.focus()}
          />
        )}
      />

      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.notesWrapper}>
            <Text style={styles.notesLabel}>NOTES</Text>
            <TextInput
              ref={notesRef}
              multiline
              placeholder="Add notes about this client..."
              placeholderTextColor={COLORS.textMuted}
              returnKeyType="done"
              style={[
                styles.notesInput,
                isNotesFocused && styles.notesInputFocused,
                errors.notes ? styles.notesInputError : null,
              ]}
              textAlignVertical="top"
              value={value}
              onBlur={(event) => {
                setIsNotesFocused(false);
                onBlur();
              }}
              onChangeText={onChange}
              onFocus={() => setIsNotesFocused(true)}
              // onSubmitEditing={handleSubmit(onSubmit)}
            />
            {errors.notes?.message ? (
              <Text style={styles.notesError}>{errors.notes.message}</Text>
            ) : null}
          </View>
        )}
      />

      {submitError ? (
        <Text style={styles.submitError}>{submitError}</Text>
      ) : null}

      <Button
        isLoading={isSubmitting}
        label="Save Client"
        onPress={handleSubmit(onSubmit)}
      />
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
  notesInputError: {
    borderColor: COLORS.error,
    borderLeftColor: COLORS.error,
  },
  notesError: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  submitError: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
  },
});
