import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { supabase } from "../lib/supabase";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export interface SetupBankAccountParams {
  bank_account_number: string;
  bank_name: string;
  bank_code: string;
  business_mobile: string;
}

export interface GeneratePaymentLinkParams {
  job_id: string;
  amount: number;
  customer_name: string;
  customer_phone: string;
}

export interface UseProfileBankStatusResult {
  hasBankAccount: boolean;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

interface EdgeErrorBody {
  error?: string;
  success?: boolean;
  payment_link?: string;
  account_name?: string;
  banks?: Array<{ name: string; code: string }>;
}

export interface FlutterwaveBank {
  name: string;
  code: string;
}

const mapPaymentError = (message: string): string => {
  if (message.trim().length > 0) {
    return message;
  }
  return "Something went wrong. Please try again.";
};

const getSessionAccessToken = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Not authenticated");
  }
  return token;
};

const invokeEdgeFunction = async (
  functionName: string,
  body: Record<string, unknown>,
): Promise<EdgeErrorBody> => {
  const accessToken = await getSessionAccessToken();

  const response = await fetch(
    `${supabaseUrl}/functions/v1/${functionName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(body),
    },
  );

  let payload: EdgeErrorBody = {};
  try {
    payload = (await response.json()) as EdgeErrorBody;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(
      mapPaymentError(payload.error ?? "Something went wrong. Please try again."),
    );
  }

  if (payload.success !== true) {
    throw new Error(
      mapPaymentError(payload.error ?? "Something went wrong. Please try again."),
    );
  }

  return payload;
};

export const setupBankAccount = async (
  params: SetupBankAccountParams,
): Promise<void> => {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const user = authData.user;
    if (!user) {
      throw new Error("Not authenticated");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_name")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile?.business_name) {
      throw new Error("Business profile not found");
    }

    await invokeEdgeFunction("create-subaccount", {
      bank_account_number: params.bank_account_number,
      bank_name: params.bank_name,
      bank_code: params.bank_code,
      business_mobile: params.business_mobile,
      business_name: profile.business_name,
      business_email: user.email ?? `${user.id}@tradepad.app`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not set up bank account";
    console.error("setupBankAccount error:", error);
    throw new Error(mapPaymentError(message));
  }
};

export const fetchBankList = async (): Promise<FlutterwaveBank[]> => {
  try {
    const payload = await invokeEdgeFunction("get-banks", {});
    return payload.banks ?? [];
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not fetch banks";
    console.error("fetchBankList error:", error);
    throw new Error(mapPaymentError(message));
  }
};

export const resolveAccountName = async (params: {
  account_number: string;
  account_bank: string;
}): Promise<string> => {
  try {
    const payload = await invokeEdgeFunction("resolve-account", {
      account_number: params.account_number,
      account_bank: params.account_bank,
    });

    if (!payload.account_name) {
      throw new Error("Could not retrieve account name");
    }

    return payload.account_name;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not verify account";
    console.error("resolveAccountName error:", error);
    throw new Error(mapPaymentError(message));
  }
};

export const generatePaymentLink = async (
  params: GeneratePaymentLinkParams,
): Promise<string> => {
  try {
    const payload = await invokeEdgeFunction("create-payment-link", {
      job_id: params.job_id,
      amount: params.amount,
      customer_name: params.customer_name,
      customer_phone: params.customer_phone,
    });

    if (!payload.payment_link) {
      throw new Error("Payment link was not returned");
    }

    return payload.payment_link;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not generate payment link";
    console.error("generatePaymentLink error:", error);
    throw new Error(mapPaymentError(message));
  }
};

export const useProfileBankStatus = (): UseProfileBankStatusResult => {
  const [hasBankAccount, setHasBankAccount] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchStatus = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) {
        setHasBankAccount(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("flutterwave_subaccount_id, bank_account_number, bank_name")
        .eq("id", userId)
        .single();

      if (error) throw error;

      setHasBankAccount(data?.flutterwave_subaccount_id != null);
    } catch (err) {
      console.error("useProfileBankStatus fetch error:", err);
      setHasBankAccount(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchStatus();
    }, [fetchStatus]),
  );

  return {
    hasBankAccount,
    isLoading,
    refetch: fetchStatus,
  };
};
