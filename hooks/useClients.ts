import { useCallback, useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import type { BusinessType, Client } from "../types";

export interface UseClientsResult {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseClientResult {
  client: Client | null;
  businessType: BusinessType | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseClientCountResult {
  count: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface CreateClientParams {
  full_name: string;
  phone: string;
  notes?: string;
}

export interface UpdateClientParams {
  full_name?: string;
  phone?: string;
  notes?: string;
}

interface ClientsState {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
}

interface ClientState {
  client: Client | null;
  businessType: BusinessType | null;
  isLoading: boolean;
  error: string | null;
}

const clientsInitialState: ClientsState = {
  clients: [],
  isLoading: true,
  error: null,
};

const clientInitialState: ClientState = {
  client: null,
  businessType: null,
  isLoading: true,
  error: null,
};

const mapClientError = (_message: string): string => {
  return "Something went wrong. Please try again.";
};

const getCurrentUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) {
    throw new Error("Not authenticated");
  }
  return data.user.id;
};

export const createClient = async (
  params: CreateClientParams,
): Promise<Client> => {
  try {
    const userId = await getCurrentUserId();

    if (params.phone.trim().length > 0) {
      const { data: existing } = await supabase
        .from("clients")
        .select("id")
        .eq("owner_id", userId)
        .eq("phone", params.phone.trim())
        .maybeSingle();

      if (existing) {
        throw new Error("A client with this phone number already exists.");
      }
    }

    const { data, error } = await supabase
      .from("clients")
      .insert({
        owner_id: userId,
        full_name: params.full_name,
        phone: params.phone,
        notes: params.notes?.trim() ? params.notes.trim() : null,
      })
      .select("id, owner_id, full_name, phone, notes, created_at")
      .single();

    if (error) throw error;
    if (!data) {
      throw new Error("Could not create client");
    }

    return data as Client;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create client";
    console.error("createClient error:", error);
    if (message === "A client with this phone number already exists.") {
      throw new Error(message);
    }
    throw new Error(mapClientError(message));
  }
};

export const updateClient = async (
  id: string,
  params: UpdateClientParams,
): Promise<void> => {
  try {
    const userId = await getCurrentUserId();

    if (params.phone !== undefined && params.phone.trim().length > 0) {
      const { data: existing } = await supabase
        .from("clients")
        .select("id")
        .eq("owner_id", userId)
        .eq("phone", params.phone.trim())
        .neq("id", id)
        .maybeSingle();

      if (existing) {
        throw new Error("A client with this phone number already exists.");
      }
    }

    const { error } = await supabase
      .from("clients")
      .update({
        ...(params.full_name !== undefined ? { full_name: params.full_name } : {}),
        ...(params.phone !== undefined ? { phone: params.phone } : {}),
        ...(params.notes !== undefined
          ? { notes: params.notes.trim() ? params.notes.trim() : null }
          : {}),
      })
      .eq("id", id)
      .eq("owner_id", userId);

    if (error) throw error;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update client";
    console.error("updateClient error:", error);
    if (message === "A client with this phone number already exists.") {
      throw new Error(message);
    }
    throw new Error(mapClientError(message));
  }
};

export const deleteClient = async (id: string): Promise<void> => {
  try {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("owner_id", userId);

    if (error) throw error;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete client";
    console.error("deleteClient error:", error);
    throw new Error(mapClientError(message));
  }
};

export const useClients = (): UseClientsResult => {
  const [state, setState] = useState<ClientsState>(clientsInitialState);

  const fetchAll = useCallback(async (): Promise<void> => {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, phone, notes, created_at")
        .eq("owner_id", userId)
        .order("full_name", { ascending: true });

      if (error) throw error;

      const clients = (data ?? []).map(
        (row): Client => ({
          id: row.id,
          owner_id: userId,
          full_name: row.full_name,
          phone: row.phone ?? "",
          notes: row.notes,
          created_at: row.created_at,
        }),
      );

      setState({
        clients,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("useClients fetchAll error:", error);
      setState((current) => ({
        ...current,
        isLoading: false,
        error: "Could not load clients. Pull to refresh.",
      }));
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return {
    clients: state.clients,
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchAll,
  };
};

export const useClientCount = (): UseClientCountResult => {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const userId = await getCurrentUserId();

      const { count: total, error: countError } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", userId);

      if (countError) throw countError;

      setCount(total ?? 0);
    } catch (err) {
      console.error("useClientCount fetchCount error:", err);
      setError("Could not load client count.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCount();
  }, [fetchCount]);

  return { count, isLoading, error, refetch: fetchCount };
};

export const useClient = (id: string): UseClientResult => {
  const [state, setState] = useState<ClientState>(clientInitialState);

  const fetchClient = useCallback(async (): Promise<void> => {
    if (!id) {
      setState({
        client: null,
        businessType: null,
        isLoading: false,
        error: "Client not found.",
      });
      return;
    }

    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const userId = await getCurrentUserId();

      const [clientResult, profileResult] = await Promise.all([
        supabase
          .from("clients")
          .select("id, full_name, phone, notes, created_at")
          .eq("id", id)
          .eq("owner_id", userId)
          .single(),
        supabase
          .from("profiles")
          .select("business_type")
          .eq("id", userId)
          .single(),
      ]);

      if (clientResult.error) throw clientResult.error;
      if (profileResult.error) throw profileResult.error;

      setState({
        client: {
          id: clientResult.data.id,
          owner_id: userId,
          full_name: clientResult.data.full_name,
          phone: clientResult.data.phone ?? "",
          notes: clientResult.data.notes,
          created_at: clientResult.data.created_at,
        },
        businessType: profileResult.data.business_type as BusinessType,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("useClient fetchClient error:", error);
      setState({
        client: null,
        businessType: null,
        isLoading: false,
        error: "Could not load client details.",
      });
    }
  }, [id]);

  useEffect(() => {
    void fetchClient();
  }, [fetchClient]);

  return {
    client: state.client,
    businessType: state.businessType,
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchClient,
  };
};
