import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import type { Measurement, MeasurementUnitPreference } from "../types";

const MEASUREMENT_COLUMNS =
  "id, client_id, owner_id, chest, waist, hips, shoulder, sleeve_length, trouser_length, neck, notes, custom_fields, created_at" as const;

export interface MeasurementWithDate extends Measurement {
  unit_preference: MeasurementUnitPreference;
}

export interface UseMeasurementsResult {
  measurements: Measurement[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseLatestMeasurementResult {
  measurement: Measurement | null;
  unitPreference: MeasurementUnitPreference;
  isLoading: boolean;
  error: string | null;
}

export interface UseCustomFieldTemplatesResult {
  templates: string[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export interface UseProfileUnitPreferenceResult {
  unitPreference: MeasurementUnitPreference;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface CreateMeasurementParams {
  client_id: string;
  chest?: number;
  waist?: number;
  hips?: number;
  shoulder?: number;
  sleeve_length?: number;
  trouser_length?: number;
  neck?: number;
  notes?: string;
  custom_fields?: Record<string, string | number>;
}

const mapMeasurementError = (_message: string): string => {
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

const parseCustomFields = (
  raw: unknown,
): Record<string, string | number> | null => {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" || typeof value === "number") {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
};

const parseUnitPreference = (
  raw: unknown,
): MeasurementUnitPreference => {
  if (raw === "cm" || raw === "inches") {
    return raw;
  }
  return "inches";
};

interface MeasurementRow {
  id: string;
  client_id: string;
  owner_id: string;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  shoulder: number | null;
  sleeve_length: number | null;
  trouser_length: number | null;
  neck: number | null;
  notes: string | null;
  custom_fields: unknown;
  created_at: string;
}

const parseMeasurementRow = (row: MeasurementRow): Measurement => {
  return {
    id: row.id,
    client_id: row.client_id,
    owner_id: row.owner_id,
    chest: row.chest,
    waist: row.waist,
    hips: row.hips,
    shoulder: row.shoulder,
    sleeve_length: row.sleeve_length,
    trouser_length: row.trouser_length,
    neck: row.neck,
    notes: row.notes,
    custom_fields: parseCustomFields(row.custom_fields),
    created_at: row.created_at,
  };
};

export const useMeasurements = (clientId: string): UseMeasurementsResult => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeasurements = useCallback(async (): Promise<void> => {
    if (!clientId) {
      setMeasurements([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userId = await getCurrentUserId();

      const { data, error: queryError } = await supabase
        .from("measurements")
        .select(MEASUREMENT_COLUMNS)
        .eq("client_id", clientId)
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;

      const rows = (data ?? []) as MeasurementRow[];
      setMeasurements(rows.map((row) => parseMeasurementRow(row)));
      setIsLoading(false);
    } catch (err) {
      console.error("useMeasurements fetch error:", err);
      setMeasurements([]);
      setIsLoading(false);
      setError("Could not load measurements. Pull to refresh.");
    }
  }, [clientId]);

  useEffect(() => {
    void fetchMeasurements();
  }, [fetchMeasurements]);

  return {
    measurements,
    isLoading,
    error,
    refetch: fetchMeasurements,
  };
};

export const useLatestMeasurement = (
  clientId: string,
): UseLatestMeasurementResult => {
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [unitPreference, setUnitPreference] =
    useState<MeasurementUnitPreference>("inches");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(async (): Promise<void> => {
    if (!clientId) {
      setMeasurement(null);
      setUnitPreference("inches");
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userId = await getCurrentUserId();

      const [measurementResult, profileResult] = await Promise.all([
        supabase
          .from("measurements")
          .select(MEASUREMENT_COLUMNS)
          .eq("client_id", clientId)
          .eq("owner_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("unit_preference")
          .eq("id", userId)
          .maybeSingle(),
      ]);

      if (measurementResult.error) throw measurementResult.error;
      if (profileResult.error) throw profileResult.error;

      setUnitPreference(parseUnitPreference(profileResult.data?.unit_preference));

      if (measurementResult.data) {
        const row = measurementResult.data as MeasurementRow;
        setMeasurement(parseMeasurementRow(row));
      } else {
        setMeasurement(null);
      }

      setIsLoading(false);
    } catch (err) {
      console.error("useLatestMeasurement fetch error:", err);
      setMeasurement(null);
      setUnitPreference("inches");
      setIsLoading(false);
      setError("Could not load measurements.");
    }
  }, [clientId]);

  useFocusEffect(
    useCallback(() => {
      void fetchLatest();
    }, [fetchLatest]),
  );

  return {
    measurement,
    unitPreference,
    isLoading,
    error,
  };
};

export const useProfileUnitPreference = (): UseProfileUnitPreferenceResult => {
  const [unitPreference, setUnitPreference] =
    useState<MeasurementUnitPreference>("inches");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreference = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const userId = await getCurrentUserId();

      const { data, error: queryError } = await supabase
        .from("profiles")
        .select("unit_preference")
        .eq("id", userId)
        .maybeSingle();

      if (queryError) throw queryError;

      setUnitPreference(parseUnitPreference(data?.unit_preference));
      setIsLoading(false);
    } catch (err) {
      console.error("useProfileUnitPreference fetch error:", err);
      setUnitPreference("inches");
      setIsLoading(false);
      setError("Could not load unit preference.");
    }
  }, []);

  useEffect(() => {
    void fetchPreference();
  }, [fetchPreference]);

  return {
    unitPreference,
    isLoading,
    error,
    refetch: fetchPreference,
  };
};

export const useCustomFieldTemplates =
  (): UseCustomFieldTemplatesResult => {
    const [templates, setTemplates] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchTemplates = useCallback(async (): Promise<void> => {
      setIsLoading(true);

      try {
        const userId = await getCurrentUserId();

        const { data, error: queryError } = await supabase
          .from("custom_field_templates")
          .select("id, field_name")
          .eq("owner_id", userId)
          .eq("context", "measurement")
          .order("created_at", { ascending: true });

        if (queryError) throw queryError;

        const names = (data ?? []).map((row) => String(row.field_name));
        setTemplates(names);
        setIsLoading(false);
      } catch (err) {
        console.error("useCustomFieldTemplates fetch error:", err);
        setTemplates([]);
        setIsLoading(false);
      }
    }, []);

    useEffect(() => {
      void fetchTemplates();
    }, [fetchTemplates]);

    return {
      templates,
      isLoading,
      refetch: fetchTemplates,
    };
  };

export const createMeasurement = async (
  params: CreateMeasurementParams,
): Promise<Measurement> => {
  try {
    const userId = await getCurrentUserId();

    const insertPayload: Record<string, unknown> = {
      owner_id: userId,
      client_id: params.client_id,
      chest: params.chest ?? null,
      waist: params.waist ?? null,
      hips: params.hips ?? null,
      shoulder: params.shoulder ?? null,
      sleeve_length: params.sleeve_length ?? null,
      trouser_length: params.trouser_length ?? null,
      neck: params.neck ?? null,
      notes: params.notes?.trim() ? params.notes.trim() : null,
      custom_fields: params.custom_fields ?? null,
    };

    const { data, error } = await supabase
      .from("measurements")
      .insert(insertPayload)
      .select(MEASUREMENT_COLUMNS)
      .single();

    if (error) throw error;
    if (!data) {
      throw new Error("Could not create measurement");
    }

    return parseMeasurementRow(data as MeasurementRow);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create measurement";
    console.error("createMeasurement error:", error);
    throw new Error(mapMeasurementError(message));
  }
};

export const saveCustomFieldTemplate = async (
  fieldName: string,
): Promise<void> => {
  const trimmed = fieldName.trim();
  if (!trimmed) {
    throw new Error(mapMeasurementError("empty"));
  }

  try {
    const userId = await getCurrentUserId();

    const { data: existing, error: selectError } = await supabase
      .from("custom_field_templates")
      .select("id")
      .eq("owner_id", userId)
      .eq("context", "measurement")
      .eq("field_name", trimmed)
      .maybeSingle();

    if (selectError) throw selectError;
    if (existing) {
      return;
    }

    const { error: insertError } = await supabase
      .from("custom_field_templates")
      .insert({
        owner_id: userId,
        context: "measurement",
        field_name: trimmed,
      });

    if (insertError) throw insertError;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save template";
    console.error("saveCustomFieldTemplate error:", error);
    throw new Error(mapMeasurementError(message));
  }
};

export const updateUnitPreference = async (
  unit: MeasurementUnitPreference,
): Promise<void> => {
  try {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("profiles")
      .update({ unit_preference: unit })
      .eq("id", userId);

    if (error) throw error;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update preference";
    console.error("updateUnitPreference error:", error);
    throw new Error(mapMeasurementError(message));
  }
};
