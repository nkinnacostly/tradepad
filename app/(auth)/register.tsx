import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { z } from "zod";

import { BusinessTypeSelector } from "../../components/auth/BusinessTypeSelector";
import { TradepadWordmark } from "../../components/auth/TradepadWordmark";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ScreenWrapper } from "../../components/ui/ScreenWrapper";
import {
  COLORS,
  FONTS,
  FONT_SIZE,
  FONT_WEIGHT,
  ROUTES,
  SPACING,
} from "../../constants";
import { signUpWithProfile } from "../../hooks/useAuth";
import type { BusinessType } from "../../types";

const registerSchema = z.object({
  business_name: z
    .string()
    .min(2, "Business name must be at least 2 characters"),
  business_type: z.enum(["tailor", "laundry"], {
    message: "Select your business type",
  }),
  phone: z
    .string()
    .min(10, "Enter a valid phone number")
    .refine((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 10;
    }, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen(): React.JSX.Element {
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      business_name: "",
      business_type: undefined,
      phone: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    setSubmitError(null);

    try {
      await signUpWithProfile({
        email: data.email,
        password: data.password,
        business_name: data.business_name,
        business_type: data.business_type,
        phone: data.phone,
      });
      router.replace(ROUTES.dashboard);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      setSubmitError(message);
    }
  };

  return (
    <ScreenWrapper>
      <TradepadWordmark />

      <Text style={styles.heading}>Set up your business</Text>
      <Text style={styles.subheading}>Takes less than a minute</Text>

      <View style={styles.form}>
        <Controller
          control={control}
          name="business_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              autoCapitalize="words"
              autoComplete="organization"
              error={errors.business_name?.message}
              label="Business name"
              placeholder="Amaka's Fashion"
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
          name="business_type"
          render={({ field: { onChange, value } }) => (
            <BusinessTypeSelector
              error={errors.business_type?.message}
              value={value as BusinessType | undefined}
              onChange={onChange}
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
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              ref={emailRef}
              autoComplete="email"
              error={errors.email?.message}
              keyboardType="email-address"
              label="Email"
              returnKeyType="next"
              textContentType="emailAddress"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              ref={passwordRef}
              autoComplete="new-password"
              error={errors.password?.message}
              isPassword
              label="Password"
              returnKeyType="done"
              textContentType="newPassword"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          )}
        />

        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

        <Button
          isLoading={isSubmitting}
          label="Create account"
          style={styles.button}
          onPress={handleSubmit(onSubmit)}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Link href={ROUTES.login} style={styles.footerLink}>
          Sign in
        </Link>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.sm,
  },
  subheading: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.lg,
    marginBottom: SPACING.xl,
  },
  form: {
    flex: 1,
  },
  submitError: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
  },
  button: {
    marginTop: SPACING.sm,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
  },
  footerLink: {
    color: COLORS.primary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
