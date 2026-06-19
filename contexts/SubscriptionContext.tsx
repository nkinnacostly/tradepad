import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import type { Profile } from "../types";
import { useAuth } from "../hooks/useAuth";

export const FREE_CLIENT_LIMIT = 3;
export const FREE_ACTIVE_JOB_LIMIT = 3;

export interface SubscriptionContextValue {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  // Tier / status flags derived from the profile.
  isPro: boolean;
  isExpired: boolean;
  isFree: boolean;
  isReadOnly: boolean;
  // Premium feature gates.
  canUsePaymentLinks: boolean;
  canUseWhatsAppInvoice: boolean;
  canUseReminders: boolean;
  canUseAnalytics: boolean;
  // Count-aware creation gates.
  canCreateClient: (currentClientCount: number) => boolean;
  canCreateActiveJob: (currentActiveJobCount: number) => boolean;
  // Re-reads the profile from the database (e.g. after a renewal).
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(
  null,
);

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export const SubscriptionProvider = ({
  children,
}: SubscriptionProviderProps): React.JSX.Element => {
  const { user, isLoading: isAuthLoading } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (): Promise<void> => {
    if (!user) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (fetchError) throw fetchError;

      setProfile(data as Profile);
    } catch (err) {
      console.error("SubscriptionProvider fetchProfile error:", err);
      setProfile(null);
      setError("Could not load your subscription details.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthLoading) return;
    void fetchProfile();
  }, [isAuthLoading, fetchProfile]);

  const tier = profile?.subscription_tier ?? "free";
  const status = profile?.subscription_status ?? "inactive";

  const isPro = tier === "pro" && status === "active";
  const isExpired = tier === "pro" && status === "expired";
  const isFree = tier === "free";
  const isReadOnly = isExpired;

  const value = useMemo<SubscriptionContextValue>(() => {
    const canCreateClient = (currentClientCount: number): boolean => {
      if (isReadOnly) return false;
      if (isPro) return true;
      return currentClientCount < FREE_CLIENT_LIMIT;
    };

    const canCreateActiveJob = (currentActiveJobCount: number): boolean => {
      if (isReadOnly) return false;
      if (isPro) return true;
      return currentActiveJobCount < FREE_ACTIVE_JOB_LIMIT;
    };

    return {
      profile,
      isLoading,
      error,
      isPro,
      isExpired,
      isFree,
      isReadOnly,
      canUsePaymentLinks: isPro,
      canUseWhatsAppInvoice: isPro,
      canUseReminders: isPro,
      canUseAnalytics: isPro,
      canCreateClient,
      canCreateActiveJob,
      refresh: fetchProfile,
    };
  }, [
    profile,
    isLoading,
    error,
    isPro,
    isExpired,
    isFree,
    isReadOnly,
    fetchProfile,
  ]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextValue => {
  const context = useContext(SubscriptionContext);

  if (context === null) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider",
    );
  }

  return context;
};
