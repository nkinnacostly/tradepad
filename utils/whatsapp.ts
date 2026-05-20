import { Linking } from "react-native";

import type { JobWithClient } from "../hooks/useJobs";
import type { JobItem, JobStatus } from "../types";

const STATUS_LABELS: Record<JobStatus, string> = {
  received: "📋 Received",
  in_progress: "🔨 In Progress",
  ready: "✅ Ready",
  delivered: "📦 Delivered",
};

const fmt = (n: number): string => n.toLocaleString("en-NG");

const formatDueDate = (dueDate: string): string => {
  return new Date(dueDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatPhoneForWhatsApp = (phone: string): string => {
  let digits = phone.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = `234${digits.slice(1)}`;
  }

  return `+${digits}`;
};

const buildInvoiceMessage = (params: WhatsAppInvoiceParams): string => {
  const { job, jobItems, businessName } = params;
  const clientName = job.clients?.full_name ?? "Client";
  const outstanding = job.total_amount - job.amount_paid;
  const lines: string[] = [];

  lines.push(`*${businessName}*`);
  lines.push("─────────────────");
  lines.push(`Client: ${clientName}`);
  lines.push(`Job: ${job.title}`);
  lines.push(`Status: ${STATUS_LABELS[job.status]}`);
  lines.push("");

  if (jobItems.length > 0) {
    lines.push("Items:");
    for (const item of jobItems) {
      const lineTotal = item.quantity * item.unit_price;
      lines.push(
        `${item.name} x${item.quantity} — ₦${fmt(lineTotal)}`,
      );
    }
    lines.push("");
  }

  lines.push(`*Total: ₦${fmt(job.total_amount)}*`);
  lines.push(`Paid: ₦${fmt(job.amount_paid)}`);
  lines.push(`Outstanding: ₦${fmt(outstanding)}`);

  if (job.due_date) {
    lines.push("");
    lines.push(`Due: ${formatDueDate(job.due_date)}`);
  }

  if (job.description?.trim()) {
    lines.push("");
    lines.push(`Details: ${job.description.trim()}`);
  }

  lines.push("");
  lines.push("_Thank you for your business!_");
  lines.push("_Powered by Tradepad_");

  return lines.join("\n");
};

export type WhatsAppInvoiceParams = {
  job: JobWithClient;
  jobItems: JobItem[];
  businessName: string;
  phone: string;
};

export const sendWhatsAppInvoice = async (
  params: WhatsAppInvoiceParams,
): Promise<void> => {
  const message = buildInvoiceMessage(params);
  const formattedPhone = formatPhoneForWhatsApp(params.phone);
  const url = `whatsapp://send?phone=${encodeURIComponent(formattedPhone)}&text=${encodeURIComponent(message)}`;

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw new Error("WhatsApp is not installed on this device");
  }

  await Linking.openURL(url);
};
