import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { supabase } from "../lib/supabase";

export interface Notification {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  type: string;
  job_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const getCurrentUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
};

export const useNotifications = (): UseNotificationsResult => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const userId = await getCurrentUserId();
      const { data, error: queryError } = await supabase
        .from("notifications")
        .select("id, owner_id, title, body, type, job_id, is_read, created_at")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });
      if (queryError) throw queryError;
      setNotifications((data ?? []) as Notification[]);
    } catch (err) {
      console.error("useNotifications fetch error:", err);
      setError("Could not load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchNotifications();
    }, [fetchNotifications]),
  );

  const markAsRead = useCallback(async (id: string): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("owner_id", userId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    } catch (err) {
      console.error("markAsRead error:", err);
    }
  }, []);

  const markAllAsRead = useCallback(async (): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("owner_id", userId)
        .eq("is_read", false);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("markAllAsRead error:", err);
    }
  }, []);

  const deleteNotification = useCallback(async (id: string): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("owner_id", userId);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("deleteNotification error:", err);
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};
