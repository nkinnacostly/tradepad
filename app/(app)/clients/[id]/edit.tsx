import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";

import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import { ScreenWrapper } from "../../../../components/ui/ScreenWrapper";
import {
  COLORS,
  FONTS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  ROUTES,
  SPACING,
} from "../../../../constants";
import {
  deleteClient,
  updateClient,
  useClient,
} from "../../../../hooks/useClients";

const INPUT_BG = "#0D1526";
const INPUT_BORDER = "#1E293B";

const schema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .refine(
      (val) => val === "" || val.replace(/\D/g, "").length >= 10,
      "Enter a valid phone number",
    )
    .optional()
    .or(z.literal("")),
  notes: z.string().max(500, "Notes must be under 500 characters").optional(),
});

type EditClientFormData = z.infer<typeof schema>;

export default function EditClientScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { client, isLoading, error } = useClient(id ?? "");

  const phoneRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isNotesFocused, setIsNotesFocused] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditClientFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      phone: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!client) {
      return;
    }

    reset({
      full_name: client.full_name,
      phone: client.phone ?? "",
      notes: client.notes ?? "",
    });
  }, [client, reset]);

  const onSubmit = async (data: EditClientFormData): Promise<void> => {
    if (!id || isSubmitting) {
      return;
    }

    setSubmitError(null);

    try {
      await updateClient(id, {
        full_name: data.full_name,
        phone: data.phone ?? "",
        notes: data.notes,
      });
      router.back();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setSubmitError(message);
    }
  };

  const handleDeletePress = (): void => {
    if (!id) {
      return;
    }

    Alert.alert(
      "Delete Client",
      "This will permanently delete this client and all their data. This cannot be undone.",
      [
        { style: "cancel", text: "Cancel" },
        {
          style: "destructive",
          text: "Delete",
          onPress: () => {
            void (async (): Promise<void> => {
              setIsDeleting(true);
              setSubmitError(null);

              try {
                await deleteClient(id);
                router.replace(ROUTES.clients);
              } catch (err) {
                const message =
                  err instanceof Error
                    ? err.message
                    : "Could not delete client. Please try again.";
                setSubmitError(message);
              } finally {
                setIsDeleting(false);
              }
            })();
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (error || !client) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? "Client not found."}</Text>
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
        <Text style={styles.title}>Edit Client</Text>
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
              onBlur={() => {
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
        disabled={isDeleting}
        isLoading={isSubmitting}
        label="Save Changes"
        onPress={handleSubmit(onSubmit)}
      />

      <Pressable
        accessibilityRole="button"
        disabled={isSubmitting || isDeleting}
        onPress={handleDeletePress}
        style={({ pressed }) => [
          styles.deleteButton,
          (isSubmitting || isDeleting) && styles.deleteButtonDisabled,
          pressed && !isSubmitting && !isDeleting && styles.deleteButtonPressed,
        ]}
      >
        {isDeleting ? (
          <ActivityIndicator color={COLORS.error} size="small" />
        ) : (
          <Text style={styles.deleteButtonText}>Delete Client</Text>
        )}
      </Pressable>
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
  deleteButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: COLORS.error,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    height: 56,
    justifyContent: "center",
    marginTop: SPACING.lg,
    width: "100%",
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonPressed: {
    opacity: 0.85,
  },
  deleteButtonText: {
    color: COLORS.error,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
});
