export const COLORS = {
  background: "#080D1A",
  surface: "#111827",
  surfaceAlt: "#1C2333",
  primary: "#F5A623",
  primaryDark: "#C47F0A",
  textPrimary: "#FFFFFF",
  textSecondary: "#9CA3AF",
  textMuted: "#4B5563",
  success: "#10B981",
  warning: "#FBBF24",
  error: "#EF4444",
  info: "#3B82F6",
  border: "#1F2937",
  borderFocus: "#F5A623",
  statusReceived: "#3B82F6",
  statusInProgress: "#FBBF24",
  statusReady: "#10B981",
  statusDelivered: "#6B7280",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
} as const;

export const FONT_WEIGHT = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
};

export const FONTS = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const SCREEN_PADDING = SPACING.md;

export const BUSINESS_TYPE_LABELS = {
  tailor: "Tailor",
  laundry: "Laundry",
} as const;

export const JOB_STATUS_LABELS = {
  received: "Received",
  in_progress: "In Progress",
  ready: "Ready",
  delivered: "Delivered",
} as const;

export const JOB_STATUS_COLORS = {
  received: COLORS.statusReceived,
  in_progress: COLORS.statusInProgress,
  ready: COLORS.statusReady,
  delivered: COLORS.statusDelivered,
} as const;

// export const ROUTES = {
//   login: "/(auth)/login" as const,
//   register: "/(auth)/register" as const,
//   dashboard: "/(app)/dashboard" as const,
//   clients: "/(app)/clients" as const,
//   newClient: "/(app)/clients/new" as const,
//   jobs: "/(app)/jobs" as const,
//   newJob: "/(app)/jobs/new" as const,
//   settings: "/(app)/settings" as const,
//   job: (id: string): string => `/(app)/jobs/${id}`,
// };
export const ROUTES = {
  login: "/(auth)/login" as const,
  register: "/(auth)/register" as const,
  dashboard: "/(app)" as const,
  clients: "/(app)/clients" as const,
  newClient: "/(app)/clients/new" as const,
  jobs: "/(app)/jobs" as const,
  newJob: "/(app)/jobs/new" as const,
  settings: "/(app)/settings" as const,
  upgrade: "/(app)/upgrade" as const,
};
