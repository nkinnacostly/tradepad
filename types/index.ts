export type BusinessType = "tailor" | "laundry";

export type JobStatus = "received" | "in_progress" | "ready" | "delivered";

export type PaymentMethod = "cash" | "transfer" | "online";

export type MeasurementUnitPreference = "inches" | "cm";

export interface Profile {
  id: string;
  business_name: string;
  business_type: BusinessType;
  phone: string;
  unit_preference?: MeasurementUnitPreference;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  business_name: string;
  business_type: BusinessType;
  phone: string;
}

export interface Client {
  id: string;
  owner_id: string;
  full_name: string;
  phone: string;
  notes: string | null;
  created_at: string;
}

export interface Measurement {
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
  custom_fields: Record<string, string | number> | null;
  created_at: string;
}

export interface Job {
  id: string;
  owner_id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: JobStatus;
  due_date: string | null;
  total_amount: number;
  amount_paid: number;
  fabric_cost: number;
  other_costs: number;
  notes: string | null;
  created_at: string;
}

export interface JobItem {
  id: string;
  job_id: string;
  owner_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}
