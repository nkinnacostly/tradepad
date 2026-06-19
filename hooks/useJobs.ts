import { useCallback, useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import type { BusinessType, Job, JobItem, JobStatus, PaymentMethod } from "../types";

const JOB_SELECT = `
  id,
  title,
  description,
  status,
  due_date,
  total_amount,
  amount_paid,
  fabric_cost,
  other_costs,
  notes,
  created_at,
  client_id,
  owner_id,
  clients ( id, full_name )
`;

export interface JobWithClient extends Job {
  clients: {
    id: string;
    full_name: string;
  } | null;
}

export interface UseJobsResult {
  jobs: JobWithClient[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseJobResult {
  job: JobWithClient | null;
  jobItems: JobItem[];
  businessType: BusinessType | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseActiveJobCountResult {
  count: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface CreateJobParams {
  client_id: string;
  title: string;
  description?: string;
  due_date?: string;
  total_amount: number;
  fabric_cost?: number;
  other_costs?: number;
  notes?: string;
}

export interface CreateJobItemRow {
  job_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export interface RecordPaymentParams {
  job_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference?: string;
  notes?: string;
}

interface JobsState {
  jobs: JobWithClient[];
  isLoading: boolean;
  error: string | null;
}

interface JobDetailState {
  job: JobWithClient | null;
  jobItems: JobItem[];
  businessType: BusinessType | null;
  isLoading: boolean;
  error: string | null;
}

const jobsInitialState: JobsState = {
  jobs: [],
  isLoading: true,
  error: null,
};

const jobDetailInitialState: JobDetailState = {
  job: null,
  jobItems: [],
  businessType: null,
  isLoading: true,
  error: null,
};

const mapJobError = (_message: string): string => {
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

const normalizeClient = (
  raw: unknown,
): JobWithClient["clients"] => {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (!first || typeof first !== "object") return null;
    return first as { id: string; full_name: string };
  }
  return raw as { id: string; full_name: string };
};

const mapRowToJobWithClient = (row: Record<string, unknown>): JobWithClient => {
  return {
    id: row.id as string,
    owner_id: row.owner_id as string,
    client_id: row.client_id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    status: row.status as JobStatus,
    due_date: (row.due_date as string | null) ?? null,
    total_amount: Number(row.total_amount ?? 0),
    amount_paid: Number(row.amount_paid ?? 0),
    fabric_cost: Number(row.fabric_cost ?? 0),
    other_costs: Number(row.other_costs ?? 0),
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    clients: normalizeClient(row.clients),
  };
};

export const createJob = async (params: CreateJobParams): Promise<Job> => {
  try {
    const userId = await getCurrentUserId();

    // Verify client belongs to this user
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", params.client_id)
      .eq("owner_id", userId)
      .maybeSingle();

    if (clientError || !client) {
      throw new Error("Client not found");
    }

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        owner_id: userId,
        client_id: params.client_id,
        title: params.title,
        description: params.description?.trim() ? params.description.trim() : null,
        due_date: params.due_date?.trim() ? params.due_date.trim() : null,
        total_amount: params.total_amount,
        amount_paid: 0,
        fabric_cost: params.fabric_cost ?? 0,
        other_costs: params.other_costs ?? 0,
        notes: params.notes?.trim() ? params.notes.trim() : null,
        status: "received",
      })
      .select(
        "id, owner_id, client_id, title, description, status, due_date, total_amount, amount_paid, fabric_cost, other_costs, notes, created_at",
      )
      .single();

    if (error) throw error;
    if (!data) {
      throw new Error("Could not create job");
    }

    return {
      id: data.id,
      owner_id: data.owner_id,
      client_id: data.client_id,
      title: data.title,
      description: data.description,
      status: data.status as JobStatus,
      due_date: data.due_date,
      total_amount: Number(data.total_amount),
      amount_paid: Number(data.amount_paid),
      fabric_cost: Number(data.fabric_cost ?? 0),
      other_costs: Number(data.other_costs ?? 0),
      notes: data.notes,
      created_at: data.created_at,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create job";
    console.error("createJob error:", error);
    if (message === "Client not found") {
      throw new Error(message);
    }
    throw new Error(mapJobError(message));
  }
};

export const createJobItems = async (
  items: CreateJobItemRow[],
): Promise<void> => {
  if (items.length === 0) return;

  try {
    const userId = await getCurrentUserId();

    const rows = items.map((item) => ({
      owner_id: userId,
      job_id: item.job_id,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    const { error } = await supabase.from("job_items").insert(rows);

    if (error) throw error;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save job items";
    console.error("createJobItems error:", error);
    throw new Error(mapJobError(message));
  }
};

export const updateJobStatus = async (
  id: string,
  status: JobStatus,
): Promise<void> => {
  try {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("jobs")
      .update({ status })
      .eq("id", id)
      .eq("owner_id", userId);

    if (error) throw error;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update status";
    console.error("updateJobStatus error:", error);
    throw new Error(mapJobError(message));
  }
};

export const recordPayment = async (
  params: RecordPaymentParams,
): Promise<void> => {
  try {
    const userId = await getCurrentUserId();

    const { error: insertError } = await supabase.from("payments").insert({
      owner_id: userId,
      job_id: params.job_id,
      amount: params.amount,
      payment_method: params.payment_method,
      reference: params.reference?.trim() ? params.reference.trim() : null,
      notes: params.notes?.trim() ? params.notes.trim() : null,
    });

    if (insertError) throw insertError;

    const { data: jobRow, error: fetchError } = await supabase
      .from("jobs")
      .select("amount_paid")
      .eq("id", params.job_id)
      .eq("owner_id", userId)
      .single();

    if (fetchError) throw fetchError;

    const currentPaid = Number(jobRow?.amount_paid ?? 0);
    const nextPaid = currentPaid + params.amount;

    const { error: updateError } = await supabase
      .from("jobs")
      .update({ amount_paid: nextPaid })
      .eq("id", params.job_id)
      .eq("owner_id", userId);

    if (updateError) throw updateError;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not record payment";
    console.error("recordPayment error:", error);
    throw new Error(mapJobError(message));
  }
};

export const useJobs = (): UseJobsResult => {
  const [state, setState] = useState<JobsState>(jobsInitialState);

  const fetchAll = useCallback(async (): Promise<void> => {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from("jobs")
        .select(JOB_SELECT)
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const jobs = (data ?? []).map((row) =>
        mapRowToJobWithClient(row as Record<string, unknown>),
      );

      setState({
        jobs,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("useJobs fetchAll error:", error);
      setState((current) => ({
        ...current,
        isLoading: false,
        error: "Could not load jobs. Pull to refresh.",
      }));
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return {
    jobs: state.jobs,
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchAll,
  };
};

export const useActiveJobCount = (): UseActiveJobCountResult => {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const userId = await getCurrentUserId();

      const { count: total, error: countError } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", userId)
        .neq("status", "delivered");

      if (countError) throw countError;

      setCount(total ?? 0);
    } catch (err) {
      console.error("useActiveJobCount fetchCount error:", err);
      setError("Could not load active job count.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCount();
  }, [fetchCount]);

  return { count, isLoading, error, refetch: fetchCount };
};

export const useJob = (id: string): UseJobResult => {
  const [state, setState] = useState<JobDetailState>(jobDetailInitialState);

  const fetchAll = useCallback(async (): Promise<void> => {
    if (!id) {
      setState({
        job: null,
        jobItems: [],
        businessType: null,
        isLoading: false,
        error: "Job not found.",
      });
      return;
    }

    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const userId = await getCurrentUserId();

      const [jobResult, itemsResult, profileResult] = await Promise.all([
        supabase
          .from("jobs")
          .select(JOB_SELECT)
          .eq("id", id)
          .eq("owner_id", userId)
          .single(),
        supabase
          .from("job_items")
          .select("id, job_id, owner_id, name, quantity, unit_price, created_at")
          .eq("job_id", id)
          .eq("owner_id", userId)
          .order("created_at", { ascending: true }),
        supabase
          .from("profiles")
          .select("business_type")
          .eq("id", userId)
          .single(),
      ]);

      if (jobResult.error) throw jobResult.error;
      if (itemsResult.error) throw itemsResult.error;
      if (profileResult.error) throw profileResult.error;

      setState({
        job: mapRowToJobWithClient(jobResult.data as Record<string, unknown>),
        jobItems: (itemsResult.data ?? []) as JobItem[],
        businessType: profileResult.data.business_type as BusinessType,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("useJob fetchAll error:", error);
      setState({
        job: null,
        jobItems: [],
        businessType: null,
        isLoading: false,
        error: "Could not load job details.",
      });
    }
  }, [id]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return {
    job: state.job,
    jobItems: state.jobItems,
    businessType: state.businessType,
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchAll,
  };
};

export interface UseProfileBusinessTypeResult {
  businessType: BusinessType | null;
  isLoading: boolean;
}

export const useProfileBusinessType = (): UseProfileBusinessTypeResult => {
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchType = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from("profiles")
        .select("business_type")
        .eq("id", userId)
        .single();

      if (error) throw error;

      setBusinessType(data.business_type as BusinessType);
    } catch (error) {
      console.error("useProfileBusinessType error:", error);
      setBusinessType(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchType();
  }, [fetchType]);

  return { businessType, isLoading };
};
