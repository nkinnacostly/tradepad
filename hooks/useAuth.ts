import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import type { BusinessType, ProfileInsert } from "../types";
import { mapSignInError, mapSignUpError } from "../utils/auth";

export interface SignUpParams {
  email: string;
  password: string;
  business_name: string;
  business_type: BusinessType;
  phone: string;
}

export interface UseAuthResult {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

const PROFILE_SETUP_FAILED_MESSAGE =
  "Account created but profile setup failed. Please contact support.";

export const getSession = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session !== null;
  } catch (error) {
    console.error("getSession error:", error);
    throw error;
  }
};

export const signInWithPassword = async (
  email: string,
  password: string,
): Promise<void> => {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Sign in failed";
    console.error("signInWithPassword error:", error);
    throw new Error(mapSignInError(message));
  }
};

export const signUpWithProfile = async (params: SignUpParams): Promise<void> => {
  let createdUser = false;

  try {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
    });

    if (error) throw error;
    if (!data.user) {
      throw new Error("Could not create account. Please try again.");
    }

    createdUser = true;

    const profile: ProfileInsert = {
      id: data.user.id,
      business_name: params.business_name,
      business_type: params.business_type,
      phone: params.phone,
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .insert(profile);

    if (profileError) throw profileError;
  } catch (error) {
    if (createdUser) {
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error("signUpWithProfile signOut error:", signOutError);
      }
      throw new Error(PROFILE_SETUP_FAILED_MESSAGE);
    }

    const message =
      error instanceof Error ? error.message : "Registration failed";
    console.error("signUpWithProfile error:", error);
    throw new Error(mapSignUpError(message));
  }
};

export const signOut = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("signOut error:", error);
    throw error;
  }
};

export const useAuth = (): UseAuthResult => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return (): void => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, isLoading };
};
