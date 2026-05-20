import { useCallback, useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import type { JobStatus, Profile } from "../types";

export interface RecentJob {
  id: string;
  title: string;
  status: JobStatus;
  due_date: string | null;
  total_amount: number;
  amount_paid: number;
  created_at: string;
  clients: {
    id: string;
    full_name: string;
  } | null;
}

export interface UseDashboardResult {
  profile: Profile | null;
  activeJobs: number;
  dueToday: number;
  outstandingAmount: number;
  recentJobs: RecentJob[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface DashboardState {
  profile: Profile | null;
  activeJobs: number;
  dueToday: number;
  outstandingAmount: number;
  recentJobs: RecentJob[];
  isLoading: boolean;
  error: string | null;
}

interface JobStatsRow {
  id: string;
  status: JobStatus;
  due_date: string | null;
  total_amount: number;
  amount_paid: number;
}

const initialState: DashboardState = {
  profile: null,
  activeJobs: 0,
  dueToday: 0,
  outstandingAmount: 0,
  recentJobs: [],
  isLoading: true,
  error: null,
};

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const computeStats = (
  jobs: JobStatsRow[],
): Pick<DashboardState, "activeJobs" | "dueToday" | "outstandingAmount"> => {
  const today = getTodayDateString();

  let activeJobs = 0;
  let dueToday = 0;
  let outstandingAmount = 0;

  for (const job of jobs) {
    const isDelivered = job.status === "delivered";

    if (job.status === "received" || job.status === "in_progress") {
      activeJobs += 1;
    }

    if (!isDelivered && job.due_date === today) {
      dueToday += 1;
    }

    if (!isDelivered) {
      outstandingAmount += job.total_amount - job.amount_paid;
    }
  }

  return { activeJobs, dueToday, outstandingAmount };
};

const mapRecentJob = (job: RecentJob & { clients: RecentJob["clients"] | RecentJob["clients"][] }): RecentJob => {
  const client = Array.isArray(job.clients) ? job.clients[0] ?? null : job.clients;

  return {
    id: job.id,
    title: job.title,
    status: job.status,
    due_date: job.due_date,
    total_amount: job.total_amount,
    amount_paid: job.amount_paid,
    created_at: job.created_at,
    clients: client,
  };
};

export const useDashboard = (): UseDashboardResult => {
  const [state, setState] = useState<DashboardState>(initialState);

  const fetchAll = useCallback(async (): Promise<void> => {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userId = userData.user?.id;
      if (!userId) {
        throw new Error("Not authenticated");
      }

      const [profileResult, statsResult, recentResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, business_name, business_type, phone, created_at")
          .eq("id", userId)
          .single(),
        supabase
          .from("jobs")
          .select("id, status, due_date, total_amount, amount_paid")
          .eq("owner_id", userId),
        supabase
          .from("jobs")
          .select(
            `
            id,
            title,
            status,
            due_date,
            total_amount,
            amount_paid,
            created_at,
            clients (
              id,
              full_name
            )
          `,
          )
          .eq("owner_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (statsResult.error) throw statsResult.error;
      if (recentResult.error) throw recentResult.error;

      const stats = computeStats((statsResult.data ?? []) as JobStatsRow[]);
      const recentJobs = (recentResult.data ?? []).map((job) =>
        mapRecentJob(job as RecentJob & { clients: RecentJob["clients"] | RecentJob["clients"][] }),
      );

      setState({
        profile: profileResult.data as Profile,
        activeJobs: stats.activeJobs,
        dueToday: stats.dueToday,
        outstandingAmount: stats.outstandingAmount,
        recentJobs,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("useDashboard fetchAll error:", error);
      setState((current) => ({
        ...current,
        isLoading: false,
        error: "Could not load dashboard. Pull to refresh.",
      }));
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return {
    profile: state.profile,
    activeJobs: state.activeJobs,
    dueToday: state.dueToday,
    outstandingAmount: state.outstandingAmount,
    recentJobs: state.recentJobs,
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchAll,
  };
};
