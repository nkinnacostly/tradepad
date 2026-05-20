import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { z } from "zod";

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
import { signInWithPassword } from "../../hooks/useAuth";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen(): React.JSX.Element {
  const passwordRef = useRef<TextInput>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    setSubmitError(null);

    try {
      await signInWithPassword(data.email, data.password);
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

      <Text style={styles.heading}>Welcome back</Text>
      <Text style={styles.subheading}>Sign in to your business</Text>

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
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
              autoComplete="password"
              error={errors.password?.message}
              isPassword
              label="Password"
              returnKeyType="done"
              textContentType="password"
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
          label="Sign in"
          style={styles.button}
          onPress={handleSubmit(onSubmit)}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don&apos;t have an account? </Text>
        <Link href={ROUTES.register} style={styles.footerLink}>
          Get started
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
